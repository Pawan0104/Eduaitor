import MarketingSocialAccount from "../../models/marketingSocialAccount.js";
import { encryptSecret, decryptSecret } from "../../utils/cryptoVault.js";

const GRAPH_BASE = "https://graph.facebook.com";
const GRAPH_VERSION = "v21.0";

/** Validate a provider token against the platform (dev-mode connect / test). */
export const testProviderToken = async ({ channel, token }) => {
  const t = String(token || "").trim();
  if (!t) return { ok: false, error: "Token is empty." };

  try {
    if (channel === "facebook" || channel === "instagram") {
      const res = await fetch(
        `${GRAPH_BASE}/${GRAPH_VERSION}/me?fields=id,name&access_token=${encodeURIComponent(t)}`,
      );
      const data = await res.json();
      if (!res.ok || data?.error) {
        return {
          ok: false,
          error: data?.error?.message || `Token rejected (${res.status}).`,
        };
      }
      return { ok: true, meta: { userId: data.id, name: data.name || "" } };
    }

    if (channel === "linkedin") {
      const res = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      if (!res.ok || data?.error) {
        return {
          ok: false,
          error:
            data?.error_description || data?.message || `Token rejected (${res.status}).`,
        };
      }
      return { ok: true, meta: { userId: data.sub, name: data.name || "" } };
    }

    // WhatsApp Business Cloud tokens can't be verified without a phone id.
    return { ok: true, meta: {}, note: "WA token stored unverified (needs phone_number_id)." };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

/**
 * After a successful Facebook Login, auto-resolve the user's default Page id
 * (facebook) and linked Instagram business account id (instagram) so the user
 * never has to look them up — posting works immediately.
 */
export const resolveMetaAccountIds = async ({ channel, token }) => {
  const out = {};
  try {
    if (channel === "facebook") {
      const res = await fetch(
        `${GRAPH_BASE}/${GRAPH_VERSION}/me/accounts?access_token=${encodeURIComponent(token)}`,
      );
      const data = await res.json();
      const page = data?.data?.[0];
      if (page?.id) out.pageId = page.id;
      if (page?.name) out.name = page.name;
    } else if (channel === "instagram") {
      const res = await fetch(
        `${GRAPH_BASE}/${GRAPH_VERSION}/me/accounts?fields=instagram_business_account%7Bid,username%7D&access_token=${encodeURIComponent(token)}`,
      );
      const data = await res.json();
      const page = data?.data?.[0];
      const ig = page?.instagram_business_account;
      if (ig?.id) {
        out.igUserId = ig.id;
        if (ig.username) out.name = ig.username;
      }
      if (page?.id && !out.pageId) out.pageId = page.id;
    }
  } catch (err) {
    console.error("[marketing] resolve meta ids skipped:", err.message);
  }
  return out;
};

/** Connect account via dev-mode token paste (Phase 1) or OAuth caller tokens. */
export const createAccount = async ({ schoolId, channel, name, mode = "dev", token, accountMeta = {}, actor }) => {
  if (!schoolId) throw new Error("schoolId required.");
  if (!["facebook", "instagram", "linkedin", "whatsapp"].includes(channel)) {
    throw new Error("Invalid channel.");
  }

  if (mode === "dev" || token) {
    const test = await testProviderToken({ channel, token });
    if (!test.ok) {
      throw new Error(`Token validation failed: ${test.error}`);
    }
    accountMeta = { ...accountMeta, ...test.meta };
  }

  // OAuth "just works": auto-detect the default Page / Instagram account.
  if (mode === "oauth" && ["facebook", "instagram"].includes(channel)) {
    const resolved = await resolveMetaAccountIds({ channel, token });
    accountMeta = { ...resolved, ...accountMeta };
  }

  const existing = await MarketingSocialAccount.findOne({
    schoolId,
    channel,
    status: "active",
  });
  if (existing) {
    throw new Error(`A ${channel} account is already connected for this school.`);
  }

  return MarketingSocialAccount.create({
    schoolId,
    channel,
    name: name || `${channel}`,
    mode,
    status: "active",
    accountMeta,
    tokenBox: encryptSecret(token) || null,
    expiresAt: accountMeta.expiresAt || undefined,
    connectedBy: actor,
  });
};

/** Sanitized list — never expose token boxes. */
export const listAccounts = async (schoolId) => {
  const accounts = await MarketingSocialAccount.find({ schoolId }).lean();
  return accounts.map((a) => ({
    _id: a._id,
    channel: a.channel,
    name: a.name,
    mode: a.mode,
    status: a.status,
    accountMeta: {
      pageId: a.accountMeta?.pageId || "",
      igUserId: a.accountMeta?.igUserId || "",
      phoneNumberId: a.accountMeta?.phoneNumberId || "",
      userId: a.accountMeta?.userId || "",
      name: a.accountMeta?.name || "",
    },
    connectedBy: a.connectedBy,
    connectedAt: a.connectedAt,
    lastTestedAt: a.lastTestedAt,
    lastError: a.lastError,
    expiresAt: a.expiresAt,
  }));
};

export const updateAccountToken = async ({ accountId, schoolId, token }) => {
  const account = await MarketingSocialAccount.findOne({ _id: accountId, schoolId });
  if (!account) throw new Error("Account not found.");
  const test = await testProviderToken({ channel: account.channel, token });
  if (!test.ok) throw new Error(`Token validation failed: ${test.error}`);
  account.tokenBox = encryptSecret(token);
  account.lastTestedAt = new Date();
  account.lastError = null;
  account.status = "active";
  account.accountMeta = { ...(account.accountMeta || {}), ...test.meta };
  await account.save();
  return account;
};

export const testAccount = async ({ accountId, schoolId }) => {
  const account = await MarketingSocialAccount.findOne({ _id: accountId, schoolId });
  if (!account) throw new Error("Account not found.");
  const token = decryptSecret(account.tokenBox);
  if (!token) throw new Error("No token stored for this account.");
  const test = await testProviderToken({ channel: account.channel, token });
  if (test.ok) {
    account.lastTestedAt = new Date();
    account.lastError = null;
    account.status = "active";
    await account.save();
  }
  return { ok: test.ok, error: test.error, meta: test.meta };
};

export const disconnectAccount = async ({ accountId, schoolId, revoke = true }) => {
  const account = await MarketingSocialAccount.findOne({ _id: accountId, schoolId });
  if (!account) throw new Error("Account not found.");
  if (revoke && account.mode === "oauth" && (process.env.MARKETING_META_APP_ID || account.channel === "linkedin")) {
    const token = decryptSecret(account.tokenBox);
    if (token && account.channel === "facebook") {
      try {
        await fetch(
          `${GRAPH_BASE}/${GRAPH_VERSION}/me/permissions?access_token=${encodeURIComponent(token)}`,
          { method: "DELETE" },
        );
      } catch { /* non-fatal */ }
    }
  }
  account.status = "revoked";
  account.tokenBox = null;
  account.refreshTokenBox = null;
  await account.save();
  return account;
};

/** Meta OAuth authorize-URL builder (Phase 2 full OAuth; returned today as scaffold). */
export const buildConnectUrl = ({ channel, redirectUri, schoolId }) => {
  const appId = process.env.MARKETING_META_APP_ID;
  if (!appId) return { needsConfig: true, url: null };
  const base = "https://www.facebook.com/v21.0/dialog/oauth";
  const scopes = {
    facebook: "pages_show_list,pages_read_engagement,pages_manage_posts,publish_pages",
    instagram: "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish",
  }[channel];
  if (!scopes) return { needsConfig: true, url: null };
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: scopes,
    state: Buffer.from(JSON.stringify({ schoolId: String(schoolId), channel })).toString("base64url"),
  });
  return { needsConfig: false, url: `${base}?${params.toString()}` };
};