import { sendCredentialEmail } from "./channels/emailChannel.js";
import { sendCredentialSms } from "./channels/smsChannel.js";

const ROLE_LABELS = {
  school_admin: "School Admin",
  teacher: "Teacher",
  teacher_admin: "Teacher",
  staff: "Staff",
  staff_admin: "Staff",
  student: "Student",
  parent: "Parent",
};

/**
 * Deliver username/password via email (now) and SMS (stub for later).
 * Safe to fire-and-forget — never throws to callers.
 *
 * @param {object} opts
 * @param {string} opts.role
 * @param {string} [opts.name]
 * @param {string} opts.username
 * @param {string} opts.password
 * @param {string} [opts.email]
 * @param {string} [opts.mobile]
 * @param {string} [opts.schoolName]
 * @param {string[]} [opts.extraLines] - e.g. student login lines in parent email
 * @param {object} [opts.meta]
 */
export async function notifyCredentials(opts = {}) {
  try {
    const {
      role,
      name,
      username,
      password,
      email,
      mobile,
      schoolName,
      extraLines = [],
      meta = {},
    } = opts;

    if (!username || !password) {
      return {
        email: { sent: false, skipped: true, reason: "Missing credentials" },
        sms: { sent: false, skipped: true, reason: "Missing credentials" },
      };
    }

    const roleLabel = ROLE_LABELS[role] || role || "account";

    const [emailResult, smsResult] = await Promise.all([
      sendCredentialEmail({
        to: email,
        name,
        username,
        password,
        schoolName,
        roleLabel,
        extraLines,
        meta,
      }),
      sendCredentialSms({
        mobile,
        name,
        username,
        password,
        schoolName,
        roleLabel,
        meta,
      }),
    ]);

    return { email: emailResult, sms: smsResult };
  } catch (err) {
    console.error("[notifyCredentials] unexpected error:", err?.message || err);
    return {
      email: { sent: false, error: err?.message || "notify failed" },
      sms: { sent: false, error: err?.message || "notify failed" },
    };
  }
}

/** Fire-and-forget wrapper for create controllers. */
export function notifyCredentialsAsync(opts) {
  setImmediate(() => {
    notifyCredentials(opts).catch((err) => {
      console.error("[notifyCredentialsAsync]", err?.message || err);
    });
  });
}
