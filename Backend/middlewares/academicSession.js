import jwt from "jsonwebtoken";
import AcademicYear from "../models/academicYearSchema.js";
import { runWithSession } from "../utils/sessionContext.js";
import {
  currentSessionName,
  sessionDates,
} from "../utils/academicSession.js";

/**
 * Resolves the academic session for every API request.
 *
 * The ERP frontend sends `x-academic-year: <label>` (or `all`) from the header
 * selector. When it is missing or unknown we fall back to the school's active
 * session, so old clients and background jobs keep working unchanged.
 *
 * Results are cached briefly per school because this runs on every request.
 */

const CACHE_TTL_MS = 30_000;
const cache = new Map();

export const invalidateSessionCache = (schoolId) => {
  if (schoolId) cache.delete(String(schoolId));
  else cache.clear();
};

const loadSessions = async (schoolId) => {
  const key = String(schoolId);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.sessions;
  }

  const sessions = await AcademicYear.find({ schoolId })
    .select("name isActive startDate endDate")
    .sort({ startDate: -1, name: -1 })
    .lean();

  if (sessions.length === 0) {
    // Give every school a default active session on first use so new records
    // are always tagged, even before an admin opens the sessions screen.
    const name = currentSessionName();
    const { startDate, endDate } = sessionDates(name);
    try {
      await AcademicYear.create({
        schoolId,
        name,
        startDate,
        endDate,
        isActive: true,
      });
    } catch (error) {
      if (error?.code !== 11000) throw error; // another request won the race
    }
    const created = await AcademicYear.find({ schoolId })
      .select("name isActive startDate endDate")
      .sort({ startDate: -1, name: -1 })
      .lean();
    cache.set(key, { at: Date.now(), sessions: created });
    return created;
  }

  cache.set(key, { at: Date.now(), sessions });
  return sessions;
};

const readUser = (req) => {
  if (req.user) return req.user;
  const token =
    req.cookies?.token || req.headers.authorization?.split(" ")[1] || "";
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
};

export const attachAcademicSession = async (req, res, next) => {
  try {
    const user = readUser(req);
    if (!user?.school_id) return next();

    const sessions = await loadSessions(user.school_id);
    const raw = String(
      req.headers["x-academic-year"] ?? req.query?.academicYear ?? ""
    ).trim();

    // Only admins may look at another session or at every session. Teachers,
    // parents and students always see the school's active session.
    const canSelect = ["school_admin", "staff_admin", "super_admin"].includes(
      user.role
    );
    const wantsAll = canSelect && raw.toLowerCase() === "all";
    const requested =
      canSelect && !wantsAll
        ? sessions.find((session) => session.name === raw) || null
        : null;

    const effective =
      requested || sessions.find((session) => session.isActive) || sessions[0] || null;

    req.academicSession = effective
      ? { id: String(effective._id), name: effective.name }
      : null;
    // Always a concrete label: used when creating records.
    req.academicYear = effective?.name || "";
    // True only when the client explicitly asked for every session.
    req.academicYearAll = Boolean(wantsAll && effective);

    return runWithSession(
      { academicYear: req.academicYear, all: req.academicYearAll },
      next
    );
  } catch (error) {
    // Never block a request because session resolution failed.
    req.academicYear = "";
    req.academicYearAll = false;
    return runWithSession({ academicYear: "", all: false }, next);
  }
};

/**
 * Add the current session to a Mongo filter unless the caller asked for
 * "all sessions". Usage: `const filter = applyAcademicYear(req, { schoolId })`.
 */
export const applyAcademicYear = (req, filter = {}) => {
  if (!req?.academicYearAll && req?.academicYear) {
    filter.academicYear = req.academicYear;
  }
  return filter;
};

/** Label to store on a new record. */
export const sessionForWrite = (req) => req?.academicYear || "";

export default attachAcademicSession;
