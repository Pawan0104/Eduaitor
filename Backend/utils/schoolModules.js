import School from "../models/school.js";
import { MODULE_KEYS } from "../constants/module.js";

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

export const isDefaultSchoolRecord = (school, { userEmail, role } = {}) => {
  const adminEmail = normalizeEmail(school?.admin_email);
  const schoolName = String(school?.school_name || "").trim().toLowerCase();
  const jwtEmail = normalizeEmail(userEmail);

  return (
    adminEmail === "school@admin.com" ||
    schoolName === "default school" ||
    (role === "school_admin" && jwtEmail === "school@admin.com")
  );
};

/**
 * Resolve which modules a school can use.
 * Default school gets all modules when subscription is empty/incomplete
 * so local/demo schools match the sidebar experience.
 */
export function resolveSubscribedModules(school, { userEmail, role } = {}) {
  const stored = Array.isArray(school?.subscribed_modules)
    ? school.subscribed_modules.filter((k) => MODULE_KEYS.includes(k))
    : [];

  if (isDefaultSchoolRecord(school, { userEmail, role })) {
    // Default school should always have the full catalog available
    if (stored.length === 0 || !stored.includes("staff")) {
      return [...MODULE_KEYS];
    }
  }

  return stored;
}

export async function getSchoolWithModules(schoolId) {
  if (!schoolId) return null;
  return School.findById(schoolId)
    .select("subscribed_modules status admin_email school_name")
    .lean();
}

/** Persist full module list for default school when missing/incomplete. */
export async function ensureDefaultSchoolModules(school, ctx = {}) {
  if (!school?._id) return school;

  const resolved = resolveSubscribedModules(school, ctx);
  const stored = Array.isArray(school.subscribed_modules)
    ? school.subscribed_modules
    : [];

  const needsHeal =
    isDefaultSchoolRecord(school, ctx) &&
    (stored.length === 0 ||
      !stored.includes("staff") ||
      stored.length < MODULE_KEYS.length);

  if (!needsHeal) {
    return { ...school, subscribed_modules: resolved.length ? resolved : stored };
  }

  await School.updateOne(
    { _id: school._id },
    { $set: { subscribed_modules: MODULE_KEYS } },
  );
  return { ...school, subscribed_modules: [...MODULE_KEYS] };
}
