import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    type: {
      type: String,
      enum: [
        "class",
        "section",
        "subject",
        "teacher",
        "event",
        "announcement",
        "custom",
      ],
      required: true,
    },

    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      default: null,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      default: null,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      default: null,
    },

    createdBy: {
      userId: { type: mongoose.Schema.Types.ObjectId },
      userType: { type: String, enum: ["teacher", "admin", "staff"] },
    },

    members: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, required: true },
        userType: {
          type: String,
          enum: ["teacher", "student", "admin", "staff"],
          required: true,
        },
        joinedAt: { type: Date, default: Date.now },
        role: {
          type: String,
          enum: ["member", "moderator", "admin"],
          default: "member",
        },
      },
    ],

    permissions: {
      canPost: {
        type: [String],
        enum: ["teacher", "student", "admin", "staff"],
        default: ["teacher", "admin"],
      },
      canComment: {
        type: [String],
        enum: ["teacher", "student", "admin", "staff"],
        default: ["teacher", "student", "admin"],
      },
    },

    avatar: {
      url: String,
      public_id: String,
      type: String,
    },

    isAutoCreated: {
      type: Boolean,
      default: false,
    },

    isManuallyRemoved: {
      type: Boolean,
      default: false,
    },

    lastMessage: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["Active", "Archived"],
      default: "Active",
    },
  },
  { timestamps: true },
);

groupSchema.index({ schoolId: 1, type: 1, classId: 1, sectionId: 1 });
groupSchema.index({ "members.userId": 1 });

export default mongoose.model("Group", groupSchema);
