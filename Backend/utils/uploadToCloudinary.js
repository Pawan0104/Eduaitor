import cloudinary from "../middlewares/cloudinary.js";
import path from "path";

export const uploadToCloudinary = async (file, folder) => {
  // extract filename without extension
  const originalName = path.parse(file.originalname).name;

  const timestamp = Date.now();

  const publicId = `${originalName}-${timestamp}`;

  const result = await cloudinary.uploader.upload(
    `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
    {
      folder: `eduaitor/${folder}`,
      public_id: publicId,
      resource_type: "auto",
    },
  );

  return {
    url: result.secure_url,
    public_id: result.public_id,
    type: file.mimetype,
  };
};
