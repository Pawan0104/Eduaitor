import { v2 as cloudinary } from "cloudinary";

function stripWrappingQuotes(value) {
  const s = String(value ?? "").trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1).trim();
  }
  return s;
}

/**
 * Read + normalize Cloudinary env (Render pastes often include quotes/spaces).
 * Re-apply config on each use so we never rely on import-time dotenv order.
 */
export function getCloudinaryConfig() {
  const cloud_name = stripWrappingQuotes(process.env.CLOUDINARY_CLOUD_NAME);
  const api_key = stripWrappingQuotes(process.env.CLOUDINARY_API_KEY);
  const api_secret = stripWrappingQuotes(process.env.CLOUDINARY_API_SECRET);
  return { cloud_name, api_key, api_secret };
}

export function applyCloudinaryConfig() {
  const cfg = getCloudinaryConfig();
  cloudinary.config({
    cloud_name: cfg.cloud_name || undefined,
    api_key: cfg.api_key || undefined,
    api_secret: cfg.api_secret || undefined,
    secure: true,
  });
  return cfg;
}

export default cloudinary;
