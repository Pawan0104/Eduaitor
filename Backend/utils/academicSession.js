/**
 * Academic-session helpers.
 *
 * A "session" is an academic year label such as "2026-27". The school year is
 * assumed to run April -> March (Indian convention), matching the attendance
 * module which already derives `academicYear` from a date the same way.
 */

export const SESSION_NAME_RE = /^\d{4}-\d{2}$/;

/** Label for the session that contains `date` (April -> March). */
export const sessionNameFromDate = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12
  const start = month >= 4 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
};

/** Label for the session in progress right now. */
export const currentSessionName = () => sessionNameFromDate(new Date());

/** First 4-digit year inside a label, or null. */
export const sessionStartYear = (name = "") => {
  const match = /(\d{4})/.exec(String(name));
  if (!match) return null;
  const year = Number(match[1]);
  return Number.isFinite(year) ? year : null;
};

/** Default [startDate, endDate] for a label (1 April -> 31 March). */
export const sessionDates = (name = "") => {
  const startYear = sessionStartYear(name);
  if (!startYear) return { startDate: null, endDate: null };
  return {
    startDate: new Date(Date.UTC(startYear, 3, 1)),
    endDate: new Date(Date.UTC(startYear + 1, 2, 31, 23, 59, 59, 999)),
  };
};

/** "2026-27" -> "2027-28" (used to suggest the next session). */
export const nextSessionName = (name = currentSessionName()) => {
  const startYear = sessionStartYear(name);
  if (!startYear) {
    const now = new Date();
    const start = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
    return `${start + 1}-${String((start + 2) % 100).padStart(2, "0")}`;
  }
  const next = startYear + 1;
  return `${next}-${String((next + 1) % 100).padStart(2, "0")}`;
};

/** Trim/normalise a user-entered label (keeps it human-readable). */
export const normalizeSessionName = (value = "") =>
  String(value)
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
