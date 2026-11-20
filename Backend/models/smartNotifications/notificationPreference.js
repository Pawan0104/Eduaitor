import mongoose from "mongoose";

const notificationPreferenceSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    quietHoursStart: { type: String, default: "21:00" },
    quietHoursEnd: { type: String, default: "07:00" },
    timezone: { type: String, default: "Asia/Kolkata" },
    channels: {
      in_app: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      whatsapp: { type: Boolean, default: false },
    },
    updatedBy: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

notificationPreferenceSchema.index({ schoolId: 1 }, { unique: true });

export default mongoose.models.SmartNotificationPreference ||
  mongoose.model("SmartNotificationPreference", notificationPreferenceSchema);
