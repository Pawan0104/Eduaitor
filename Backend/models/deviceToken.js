import mongoose from "mongoose";

/**
 * FCM device registrations for push notifications.
 *
 * There is no central `User` collection — each school, teacher, staff and student
 * document owns its own login (`req.user._id` is that document's id and
 * `req.user.role` tells us which collection). We therefore key every device
 * token to that account document id + role, which is exactly the identity used
 * for in-app notification targeting (`buildTargetQuery`).
 *
 * ⚠️ Parents log in as their child (loginAs: "parent"), so a parent's device
 * registration carries the *student's* account id. That is intentional — it is
 * the same identity the in-app bell uses, so parents receive the same pushes a
 * student of that account would.
 */
const deviceTokenSchema = new mongoose.Schema(
  {
    // Account document _id (School / Teacher / Staff / Student doc).
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["school_admin", "teacher_admin", "staff_admin", "student_admin"],
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    // FCM registration token (Android/iOS/web)
    token: {
      type: String,
      required: true,
      trim: true,
    },
    platform: {
      type: String,
      enum: ["android", "ios", "web"],
      default: "android",
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// One login (account+role) can own many devices; a token is unique app-wide.
deviceTokenSchema.index({ accountId: 1, role: 1 });
deviceTokenSchema.index({ schoolId: 1 });
deviceTokenSchema.index({ token: 1 }, { unique: true });
deviceTokenSchema.index(
  { accountId: 1, role: 1, schoolId: 1, platform: 1 },
  { unique: true },
);

export default mongoose.model("DeviceToken", deviceTokenSchema);
