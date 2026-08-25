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

function normalizeEmails(email, emails) {
  const list = [];
  if (Array.isArray(emails)) list.push(...emails);
  if (email) list.push(email);
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const v = String(raw || "")
      .trim()
      .toLowerCase();
    if (!v || !v.includes("@") || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

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
 * @param {string[]} [opts.emails] - send the same welcome mail to multiple addresses
 * @param {string} [opts.mobile]
 * @param {string} [opts.schoolName]
 * @param {string[]} [opts.extraLines]
 * @param {Array<{title?:string,username?:string,password?:string}>} [opts.credentialBlocks]
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
      emails,
      mobile,
      schoolName,
      extraLines = [],
      credentialBlocks,
      meta = {},
    } = opts;

    if (!username || !password) {
      return {
        email: { sent: false, skipped: true, reason: "Missing credentials" },
        sms: { sent: false, skipped: true, reason: "Missing credentials" },
      };
    }

    const roleLabel = ROLE_LABELS[role] || role || "account";
    const recipients = normalizeEmails(email, emails);

    const blocks =
      Array.isArray(credentialBlocks) && credentialBlocks.length
        ? credentialBlocks
        : [{ title: `${roleLabel} login`, username, password }];

    const [emailResults, smsResult] = await Promise.all([
      recipients.length
        ? Promise.all(
            recipients.map((to) =>
              sendCredentialEmail({
                to,
                name,
                username,
                password,
                schoolName,
                roleLabel,
                extraLines,
                credentialBlocks: blocks,
                meta,
              }),
            ),
          )
        : Promise.resolve([
            { sent: false, skipped: true, reason: "No email address" },
          ]),
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

    const anySent = emailResults.some((r) => r?.sent);
    const anyError = emailResults.find((r) => r && !r.sent && !r.skipped);
    const emailResult = {
      sent: anySent,
      skipped: !anySent && emailResults.every((r) => r?.skipped),
      results: emailResults,
      recipients,
      ...(anyError ? { error: anyError.error } : {}),
      ...(!anySent && emailResults[0]?.reason
        ? { reason: emailResults[0].reason }
        : {}),
    };

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
