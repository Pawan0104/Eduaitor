import mongoose from "mongoose";

const messageTemplateSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    eventType: { type: String, required: true },
    language: { type: String, default: "en" },
    channel: { type: String, default: "default" },
    subject: { type: String, default: "" },
    body: { type: String, required: true },
    deepLink: { type: String, default: "" },
    version: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ["active", "draft", "archived"],
      default: "active",
    },
    isDefaultOverride: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

messageTemplateSchema.index(
  { schoolId: 1, eventType: 1, language: 1, channel: 1 },
  { unique: true },
);

export default mongoose.models.SmartMessageTemplate ||
  mongoose.model("SmartMessageTemplate", messageTemplateSchema);
