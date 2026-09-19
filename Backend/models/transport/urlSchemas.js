import mongoose from "mongoose";

/** Reusable sub-schema for Cloudinary / uploaded file docs */
export const fileDocSchema = new mongoose.Schema(
  {
    url: { type: String, default: "" },
    public_id: { type: String, default: "" },
    publicId: { type: String, default: "" },
    type: { type: String, default: "" },
  },
  { _id: false },
);

export const urlOf = (obj = {}) =>
  mongoose.Types.Subdocument === obj?.constructor
    ? { url: obj.url || "", public_id: obj.public_id || "", type: obj.type || "" }
    : {
        url: obj?.url || obj?.public_url || "",
        public_id: obj?.public_id || "",
        type: obj?.type || "",
      };