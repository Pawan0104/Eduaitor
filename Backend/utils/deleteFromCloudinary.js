import cloudinary, { applyCloudinaryConfig } from "../middlewares/cloudinary.js";

export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;

  try {
    applyCloudinaryConfig();
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary delete error:", error.message);
  }
};
