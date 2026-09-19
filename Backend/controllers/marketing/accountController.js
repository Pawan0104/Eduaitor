import {
  createAccount,
  listAccounts,
  updateAccountToken,
  testAccount,
  disconnectAccount,
  buildConnectUrl,
} from "../../services/marketing/accountsService.js";

export const getAccounts = async (req, res) => {
  try {
    res.json({ success: true, accounts: await listAccounts(req.user.school_id) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const connectAccount = async (req, res) => {
  try {
    const { channel, name, mode, token, accountMeta } = req.body || {};
    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "token is required (paste an access token)." });
    }
    const account = await createAccount({
      schoolId: req.user.school_id,
      channel,
      name,
      mode: mode || "dev",
      token,
      accountMeta: accountMeta || {},
      actor: req.user.email || req.user.name,
    });
    const sanitized = (await listAccounts(req.user.school_id)).find(
      (a) => String(a._id) === String(account._id),
    );
    res.status(201).json({ success: true, account: sanitized });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateToken = async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ success: false, message: "token required." });
    const account = await updateAccountToken({
      accountId: req.params.id,
      schoolId: req.user.school_id,
      token,
    });
    res.json({ success: true, accountId: String(account._id) });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const testAccountEndpoint = async (req, res) => {
  try {
    const result = await testAccount({
      accountId: req.params.id,
      schoolId: req.user.school_id,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const disconnectAccountEndpoint = async (req, res) => {
  try {
    await disconnectAccount({
      accountId: req.params.id,
      schoolId: req.user.school_id,
    });
    res.json({ success: true, message: "Account disconnected." });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const oauthConnectUrl = async (req, res) => {
  try {
    const { channel, redirectUri } = req.query;
    const result = buildConnectUrl({
      channel,
      redirectUri,
      schoolId: req.user.school_id,
    });
    if (result.needsConfig) {
      return res.json({
        success: false,
        needsConfig: true,
        message:
          "OAuth is scaffolded but needs MARKETING_META_APP_ID/secret env keys. For now, connect using the dev-mode 'paste token' flow.",
      });
    }
    res.json({ success: true, url: result.url });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};