// utils/cloudinaryFile.js
import cloudinary from "../middlewares/cloudinary.js";
import path from "path";

export const uploadToCloudinary = async (
  file,
  folder,
  resourceTypeOverride = "auto",
) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    const err = new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET on the server.",
    );
    err.code = "CLOUDINARY_CONFIG";
    throw err;
  }

  const originalName = path.parse(file.originalname).name;
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
    if (/invalid api_key/i.test(msg)) {
      const friendly = new Error(
        "Invalid Cloudinary API key. Update CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET on the server to match your Cloudinary dashboard.",
      );
      friendly.code = "CLOUDINARY_API_KEY";
      friendly.cause = err;
      throw friendly;
    }
    throw err;
  }
};
