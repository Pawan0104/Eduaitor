/** Normalize email for storage and comparison. */
export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

/** Case-insensitive exact email match for Mongo queries. */
export function emailMatchQuery(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}$`, "i");
}

export function isDuplicateKeyError(error) {
  return Number(error?.code) === 11000;
}

/** Friendly message when a unique index rejects the write. */
export function duplicateKeyMessage(
  error,
  fallback = "A record with this value already exists",
) {
  const keys = error?.keyPattern
    ? Object.keys(error.keyPattern).join(" ")
    : "";
  const msg = String(error?.message || "");
  const blob = `${keys} ${msg}`;

  if (/email/i.test(blob)) {
    return "This email already exists in your school";
  }
  if (/phone/i.test(blob)) {
    return "This phone number already exists in your school";
  }
  if (/teacherId|staffId/i.test(blob)) {
    return "An ID conflict occurred. Please try again.";
  }
  return fallback;
}
