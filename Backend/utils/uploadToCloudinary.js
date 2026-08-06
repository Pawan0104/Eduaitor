// utils/cloudinaryFile.js
import cloudinary, {
  applyCloudinaryConfig,
  getCloudinaryConfig,
} from "../middlewares/cloudinary.js";
import path from "path";

export const uploadToCloudinary = async (
  file,
  folder,
  resourceTypeOverride = "auto",
) => {
  const cfg = applyCloudinaryConfig();
  const { cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret } = cfg;

  if (!cloudName || !apiKey || !apiSecret) {
    const err = new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET on the server.",
    );
    err.code = "CLOUDINARY_CONFIG";
    throw err;
  }

  if (!/^\d+$/.test(apiKey)) {
    const err = new Error(
      "CLOUDINARY_API_KEY looks invalid (should be digits only from the Cloudinary dashboard API Keys page). Check you did not paste the API Secret into the API Key field.",
    );
    err.code = "CLOUDINARY_API_KEY";
    throw err;
  }

  const originalName = path.parse(file.originalname || "file").name
    .replace(/[^\w.-]+/g, "_")
    .slice(0, 80);
  const timestamp = Date.now();
  const publicId = `${originalName}-${timestamp}`;

  try {
    const result = await cloudinary.uploader.upload(
      `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
      {
        folder: `eduaitor/${folder}`,
        public_id: publicId,
        resource_type: resourceTypeOverride,
      },
    );

    return {
      url: result.secure_url,
      public_id: result.public_id,
      type: file.mimetype,
    };
  } catch (err) {
    const msg = err?.message || String(err);
    const diag = getCloudinaryConfig();
    console.error("[cloudinary] upload failed:", {
      message: msg,
      http_code: err?.http_code || err?.error?.http_code || null,
      cloud_name_len: diag.cloud_name.length,
      api_key_len: diag.api_key.length,
      api_secret_len: diag.api_secret.length,
      api_key_digits_only: /^\d+$/.test(diag.api_key),
      folder: `eduaitor/${folder}`,
    });

    if (/invalid api_key/i.test(msg)) {
      const friendly = new Error(
        "Invalid Cloudinary API key. On Render, set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET from the same Cloudinary dashboard account (no quotes). Save and manually Redeploy the API service.",
      );
      friendly.code = "CLOUDINARY_API_KEY";
      friendly.cause = err;
      throw friendly;
    }
    throw err;
  }
};
