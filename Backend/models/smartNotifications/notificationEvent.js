import mongoose from "mongoose";

const notificationEventSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    eventType: { type: String, required: true, index: true },
    entityType: { type: String, default: "" },
    entityId: { type: mongoose.Schema.Types.Mixed, default: null },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    source: { type: String, default: "system" },
    occurredAt: { type: Date, default: Date.now },
    idempotencyKey: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "processed", "suppressed", "failed"],
      default: "pending",
      index: true,
    },
    statusReason: { type: String, default: "" },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

notificationEventSchema.index(
  { schoolId: 1, idempotencyKey: 1 },
  { unique: true },
);
notificationEventSchema.index({ schoolId: 1, createdAt: -1 });

export default mongoose.models.SmartNotificationEvent ||
  mongoose.model("SmartNotificationEvent", notificationEventSchema);
