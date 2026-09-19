import mongoose from "mongoose";

/**
 * Content template for a (trigger × channel). schoolId === null means the
 * system default; a school can override with its own row for the same key.
 */
const marketingTemplateSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      default: null,
      index: true,
    },
    key: { type: String, required: true },
    trigger: { type: String, required: true },
    channel: { type: String, required: true },
    name: { type: String, default: "" },
    active: { type: Boolean, default: true },
    sampleText: { type: String, default: "" },
    cta: { type: String, default: "" },
    hashtags: [{ type: String }],
    language: { type: String, default: "en" },
  },
  { timestamps: true },
);

marketingTemplateSchema.index({ schoolId: 1, key: 1 });

export default mongoose.model("MarketingTemplate", marketingTemplateSchema);