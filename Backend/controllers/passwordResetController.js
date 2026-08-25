import bcrypt from "bcryptjs";
import School from "../models/school.js";
import Teacher from "../models/teacher.js";
import Staff from "../models/staff.js";
import PasswordResetToken, {
  createRawResetToken,
  hashResetToken,
} from "../models/passwordResetToken.js";
import {
  adminLoginUrl,
  clientOrigin,
  sendMail,
} from "../services/mail/mailer.js";
import {
  buildPasswordChangedEmail,
  buildPasswordResetEmail,
} from "../services/mail/emailTemplates.js";

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const GENERIC_OK =
  "If an account exists for that email, a reset link has been sent.";

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

async function findAccountByEmail(email) {
  const school = await School.findOne({
    admin_email: { $regex: new RegExp(`^${escapeRegex(email)}$`, "i") },
  }).select("_id school_name admin_email admin_name");
  if (school?.admin_email) {
    return {
      accountType: "school",
      accountId: school._id,
      email: String(school.admin_email).trim(),
      name: school.admin_name || school.school_name || "School Admin",
      label: "School Admin",
    };
  }

  const teacher = await Teacher.findOne({
    email: { $regex: new RegExp(`^${escapeRegex(email)}$`, "i") },
  }).select("_id email fullName");
  if (teacher?.email) {
    return {
      accountType: "teacher",
      accountId: teacher._id,
      email: String(teacher.email).trim(),
      name: teacher.fullName || "Teacher",
      label: "Teacher",
    };
  }

  const staff = await Staff.findOne({
    email: { $regex: new RegExp(`^${escapeRegex(email)}$`, "i") },
  }).select("_id email fullName");
  if (staff?.email) {
    return {
      accountType: "staff",
      accountId: staff._id,
      email: String(staff.email).trim(),
      name: staff.fullName || "Staff",
      label: "Staff",
    };
  }

  return null;
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function applyNewPassword(accountType, accountId, plainPassword) {
  const hashed = await bcrypt.hash(String(plainPassword), 10);

  if (accountType === "school") {
    await School.findByIdAndUpdate(accountId, {
      admin_password: hashed,
      temp_password: String(plainPassword),
    });
    return;
  }
  if (accountType === "teacher") {
    await Teacher.findByIdAndUpdate(accountId, {
      password: hashed,
      temp_password: String(plainPassword),
    });
    return;
  }
  if (accountType === "staff") {
    await Staff.findByIdAndUpdate(accountId, {
      password: hashed,
      temp_password: String(plainPassword),
    });
  }
}

/**
 * POST /auth/forgot-password { email }
 * Always returns the same message (no account enumeration).
 */
export const forgotPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email || !email.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    const account = await findAccountByEmail(email);
    if (!account) {
      return res.json({ success: true, message: GENERIC_OK });
    }

    await PasswordResetToken.deleteMany({
      accountType: account.accountType,
      accountId: account.accountId,
      usedAt: null,
    });

    const rawToken = createRawResetToken();
    const tokenHash = hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TTL_MS);

    await PasswordResetToken.create({
      tokenHash,
      email: normalizeEmail(account.email),
      accountType: account.accountType,
      accountId: account.accountId,
      expiresAt,
    });

    const origin = clientOrigin();
    const resetUrl = origin
      ? `${origin}/admin/reset-password?token=${encodeURIComponent(rawToken)}`
      : null;

    if (!resetUrl) {
      console.error("[forgotPassword] CLIENT_URL is not set");
      return res.json({ success: true, message: GENERIC_OK });
    }

    const loginUrl = adminLoginUrl();
    const { subject, text, html } = buildPasswordResetEmail({
      name: account.name,
      roleLabel: account.label,
      resetUrl,
      loginUrl,
    });

    const mailResult = await sendMail({
      to: account.email,
      subject,
      text,
      html,
    });

    if (!mailResult.sent && !mailResult.skipped) {
      console.error("[forgotPassword] mail error:", mailResult.error);
    }
    if (mailResult.skipped) {
      console.warn("[forgotPassword] SMTP skipped:", mailResult.reason);
    }

    return res.json({ success: true, message: GENERIC_OK });
  } catch (err) {
    console.error("[forgotPassword]", err?.message || err);
    return res.status(500).json({
      success: false,
      message: "Unable to process password reset right now",
    });
  }
};

/**
 * POST /auth/reset-password { token, password }
 */
export const resetPassword = async (req, res) => {
  try {
    const rawToken = String(req.body?.token || "").trim();
    const password = String(req.body?.password || "");

    if (!rawToken) {
      return res.status(400).json({ success: false, message: "Reset token is required" });
    }
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const tokenHash = hashResetToken(rawToken);
    const record = await PasswordResetToken.findOne({ tokenHash, usedAt: null });

    if (!record || record.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "This reset link is invalid or has expired",
      });
    }

    await applyNewPassword(record.accountType, record.accountId, password);
    record.usedAt = new Date();
    await record.save();
    await PasswordResetToken.deleteMany({
      accountType: record.accountType,
      accountId: record.accountId,
      usedAt: null,
    });

    const loginUrl = adminLoginUrl();
    const changed = buildPasswordChangedEmail({ loginUrl });
    await sendMail({
      to: record.email,
      subject: changed.subject,
      text: changed.text,
      html: changed.html,
    });

    return res.json({
      success: true,
      message: "Password updated. You can sign in with your new password.",
    });
  } catch (err) {
    console.error("[resetPassword]", err?.message || err);
    return res.status(500).json({
      success: false,
      message: "Unable to reset password right now",
    });
  }
};
