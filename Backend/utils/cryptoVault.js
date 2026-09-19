import crypto from "crypto";

/**
 * OAuth token vault for Marketing AI.
 * Encrypts provider tokens at rest with AES-256-GCM. The master key is derived
 * from MARKETING_TOKEN_MASTER_KEY (falls back to JWT_SECRET) so no raw provider
 * token is ever stored or returned to the client.
 */

const deriveKey = () => {
  const secret =
    process.env.MARKETING_TOKEN_MASTER_KEY ||
    process.env.JWT_SECRET ||
    "eduaitor-dev-marketing-key";
  return crypto.createHash("sha256").update(secret).digest();
};

export const encryptSecret = (plain) => {
  if (plain === undefined || plain === null || plain === "") return null;
  const key = deriveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([
    cipher.update(String(plain), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    algo: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: data.toString("base64"),
    keyRef: "env:sha256",
  };
};

export const decryptSecret = (box) => {
  if (!box || !box.data) return null;
  try {
    const key = deriveKey();
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(box.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(box.tag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(box.data, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch (err) {
    return null;
  }
};

export const isEncryptedBox = (box) =>
  Boolean(box && box.algo === "aes-256-gcm" && box.data);