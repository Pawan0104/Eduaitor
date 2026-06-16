import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MessageThread",
      required: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    senderModel: {
      type: String,
      required: true,
      enum: ["Teacher", "Student", "Staff", "School"],
    },
    senderSubType: {
  type: String,
  enum: ["default", "student", "parent"],
  default: "default",
},

    text: {
      type: String,
      trim: true,
      default: "", // not required — user can send image only
    },

    seen: {
      type: Boolean,
      default: false,
    },

    // image or file sent in chat
    attachment: {
      url: { type: String, default: null },       // cloudinary URL
      public_id: { type: String, default: null }, // for deletion later
      type: { type: String, default: null },      // 'image' | 'pdf' | 'doc'
      name: { type: String, default: null },      // original file name
    },
  },
  { timestamps: true }
);

messageSchema.index({ threadId: 1, createdAt: 1 });
messageSchema.index({ threadId: 1, seen: 1, senderId: 1 });

const DirectMessage  =
  mongoose.models.DirectMessage  || mongoose.model("DirectMessage ", messageSchema);

export default DirectMessage ;