import mongoose from "mongoose";

/**
 * Event-bus record for ERP → Marketing AI triggers. dedupeKey
 * (schoolId|trigger|entityId) keeps replay-safe trigger processing.
 */
const marketingEventSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    trigger: { type: String, required: true },
    entityType: { type: String, default: "" },
    entityId: { type: String, default: "" },
    entitySummary: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "processed", "failed"],
      default: "pending",
    },
    generatedPostIds: [{ type: mongoose.Schema.Types.ObjectId }],
    attempts: { type: Number, default: 0 },
    lastError: { type: String },
    dedupeKey: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true },
);

export default mongoose.model("MarketingEvent", marketingEventSchema);