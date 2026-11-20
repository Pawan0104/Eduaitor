import mongoose from "mongoose";

const notificationRuleSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    eventType: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    recipientRoles: {
      type: [String],
      default: ["parent"],
    },
    channels: {
      type: [String],
      default: ["in_app", "push"],
    },
    channelPriority: {
      type: [String],
      default: ["in_app", "push", "email", "sms", "whatsapp"],
    },
    timing: {
      mode: {
        type: String,
        enum: ["immediate", "scheduled", "offset"],
        default: "immediate",
      },
      offsetMinutes: { type: Number, default: 0 },
      scheduledTime: { type: String, default: "" },
    },
    respectQuietHours: { type: Boolean, default: true },
    urgent: { type: Boolean, default: false },
    version: { type: Number, default: 1 },
    updatedBy: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

notificationRuleSchema.index({ schoolId: 1, eventType: 1 }, { unique: true });

export default mongoose.models.SmartNotificationRule ||
  mongoose.model("SmartNotificationRule", notificationRuleSchema);
