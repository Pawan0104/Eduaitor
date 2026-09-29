import DeviceToken from "../models/deviceToken.js";

// ── POST /api/push/register-token ─────────────────────────────────────────────
// Called by the mobile + web app after receiving an FCM token (post-login).
// Upserts one unique token per device; a single account may register many
// devices (phone + tablet + web).
export const registerToken = async (req, res, next) => {
  try {
    const { role, schoolId } = req.user; // NOTE: JWT does NOT carry role here
    const accountId = req.user?._id;
    const { token, platform } = req.body;

    if (!accountId) {
      return res
        .status(400)
        .json({ success: false, message: "Account id missing from token" });
    }
    if (!token || typeof token !== "string" || !token.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "FCM token is required" });
    }

    const clean = token.trim();
    const resolvedRole = req.user?.role || req.body?.role || "student_admin";

    const existing = await DeviceToken.findOne({ token: clean });
    if (existing && String(existing.accountId) !== String(accountId)) {
      // Re-assigned token — move it to this account (safer than a duplicate error)
      existing.accountId = accountId;
      existing.role = resolvedRole;
      existing.platform = platform || existing.platform || "android";
      existing.lastUsedAt = new Date();
      await existing.save();
      return res
        .status(200)
        .json({ success: true, message: "Device token updated" });
    }

    await DeviceToken.findOneAndUpdate(
      { token: clean },
      {
        $set: {
          accountId,
          role: resolvedRole,
          schoolId: schoolId || req.user?.school_id || null,
          platform: platform || "android",
          lastUsedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, setDefaultsOnInsert: true, new: true },
    );

    res.status(200).json({ success: true, message: "Push token registered" });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/push/unregister-token ─────────────────────────────────────────
export const unregisterToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "FCM token is required" });
    }
    await DeviceToken.deleteMany({ token: token.trim() });
    res.status(200).json({ success: true, message: "Push token unregistered" });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/push/tokens (diagnostics: how many devices this account holds) ──
export const getMyTokens = async (req, res, next) => {
  try {
    const accountId = req.user?._id;
    const count = await DeviceToken.countDocuments({
      accountId,
      ...(req.user?.school_id ? { schoolId: req.user.school_id } : {}),
    });
    res.status(200).json({ success: true, count });
  } catch (err) {
    next(err);
  }
};
