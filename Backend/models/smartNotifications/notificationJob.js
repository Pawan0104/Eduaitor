import mongoose from "mongoose";

const notificationJobSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SmartNotificationEvent",
      required: true,
      index: true,
    },
    eventType: { type: String, required: true, index: true },
    recipient: {
      userId: { type: mongoose.Schema.Types.Mixed, default: null },
      role: { type: String, default: "" },
      name: { type: String, default: "" },
      email: { type: String, default: "" },
      mobile: { type: String, default: "" },
      studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        default: null,
      },
      teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Teacher",
        default: null,
      },
      staffId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Staff",
        default: null,
      },
      inboxTarget: { type: mongoose.Schema.Types.Mixed, default: null },
      legacyTargets: { type: [mongoose.Schema.Types.Mixed], default: undefined },
    },
    channel: {
      type: String,
      enum: ["in_app", "push", "email", "sms", "whatsapp"],
      required: true,
    },
    subject: { type: String, default: "" },
    body: { type: String, required: true },
    templateVersion: { type: Number, default: 1 },
    status: {
      type: String,
      enum: [
        "queued",
        "processing",
        "sent",
        "delivered",
        "failed",
        "retry",
        "suppressed",
      ],
      default: "queued",
      index: true,
    },
    statusReason: { type: String, default: "" },
    attemptCount: { type: Number, default: 0 },
    scheduledAt: { type: Date, default: Date.now, index: true },
    sentAt: { type: Date, default: null },
    inboxNotificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notification",
      default: null,
    },
    providerMessageId: { type: String, default: "" },
  },
  { timestamps: true },
);

notificationJobSchema.index({ status: 1, scheduledAt: 1 });
notificationJobSchema.index({ schoolId: 1, createdAt: -1 });
notificationJobSchema.index(
  { eventId: 1, channel: 1, "recipient.userId": 1, "recipient.mobile": 1 },
  { name: "job_dedupe_hint" },
);

export default mongoose.models.SmartNotificationJob ||
  mongoose.model("SmartNotificationJob", notificationJobSchema);
