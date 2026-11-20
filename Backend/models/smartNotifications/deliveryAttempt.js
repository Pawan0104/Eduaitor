import mongoose from "mongoose";

const deliveryAttemptSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SmartNotificationJob",
      required: true,
      index: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    channel: { type: String, required: true },
    provider: { type: String, default: "" },
    providerMessageId: { type: String, default: "" },
    attemptedAt: { type: Date, default: Date.now },
    result: {
      type: String,
      enum: ["sent", "delivered", "failed", "skipped"],
      required: true,
    },
    errorCode: { type: String, default: "" },
    responseSummary: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.models.SmartDeliveryAttempt ||
  mongoose.model("SmartDeliveryAttempt", deliveryAttemptSchema);
