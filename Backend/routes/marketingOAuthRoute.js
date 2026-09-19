import express from "express";
import { authMiddleware } from "../auth/auth.js";
import { createAccount } from "../services/marketing/accountsService.js";

/**
 * OAuth callback scaffold (Phase 2 wiring).
 * Today this exchanges a Meta code when MARKETING_META_APP_ID/SECRET are set;
 * otherwise it returns a clear "needs configuration" response so the UI can
 * fall back to dev-mode token paste.
 */
const router = express.Router();

const exchangeFacebookCode = async ({ code, redirectUri }) => {
  const appId = process.env.MARKETING_META_APP_ID;
  const secret = process.env.MARKETING_META_APP_SECRET;
  if (!appId || !secret) {
    throw new Error("MARKETING_META_APP_ID/SECRET not configured.");
  }
  let qs = new URLSearchParams({
    client_id: appId,
    client_secret: secret,
    code,
    redirect_uri: redirectUri,
  });
  const res = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?${qs.toString()}`,
  );
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data?.error?.message || "Facebook token exchange failed.");
  }

  // Upgrade the short-lived code token to a ~60-day user/page token.
  qs = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: secret,
    fb_exchange_token: data.access_token,
  });
  try {
    const long = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?${qs.toString()}`,
    );
    const longData = await long.json();
    if (longData?.access_token) return longData.access_token;
  } catch {
    // best-effort; fall back to the short-lived token
  }
  return data.access_token;
};

router.get("/facebook/callback", authMiddleware, async (req, res) => {
  try {
    const { code, state, redirect_uri } = req.query;
    if (!code || !state) {
      return res.status(400).json({ success: false, message: "code and state required." });
    }
    let stateData = {};
    try {
      stateData = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    } catch {
      res.status(400).json({ success: false, message: "Invalid OAuth state." });
      return;
    }
    const token = await exchangeFacebookCode({ code, redirectUri: redirect_uri });
    const account = await createAccount({
      schoolId: stateData.schoolId,
      channel: stateData.channel || "facebook",
      name: `facebook-${Date.now()}`,
      mode: "oauth",
      token,
      actor: req.user.email,
    });
    res.json({
      success: true,
      message: "Account connected via OAuth.",
      accountId: String(account._id),
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get("/instagram/callback", authMiddleware, async (req, res) => {
  res.redirect(
    `/api/marketing/oauth/facebook/callback?${new URLSearchParams(req.query).toString()}`,
  );
});

export default router;