import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },

    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },

    sender: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
      userType: {
        type: String,
        enum: ["teacher", "admin"], // restricted
        required: true,
      },
    },

    // Message type
    type: {
      type: String,
      enum: ["text", "image", "video", "pdf", "file"],
      default: "text",
    },

    // Text message
    text: {
      type: String,
      trim: true,
    },

    // Single attachment (simplified)
    file: {
      url: String,
      public_id: String,
      type: {
        type: String,
        enum: ["image", "video", "pdf", "document", "audio", "other"],
        default: "other",
      },
      name: String,
      size: Number,
    },

    // Seen tracking (WhatsApp ticks)
    seenBy: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        seenAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Message delivery status
    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent",
    },

    // Reply feature (optional but powerful)
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    // Pinning (admin only)
    isPinned: {
      type: Boolean,
      default: false,
    },

    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// For fast chat loading
messageSchema.index({ groupId: 1, isPinned: 1, createdAt: -1 });

export default mongoose.model("Message", messageSchema);
