// import mongoose from "mongoose";

// // Allowed participant model names — add more roles here later
// const PARTICIPANT_MODELS = ["Teacher", "Student", "Staff", "School"];

// const participantSchema = new mongoose.Schema(
//   {
//     participantId: {
//       type: mongoose.Schema.Types.ObjectId,
//       required: true,
//       refPath: "participants.participantModel", // dynamic populate
//     },
//     participantModel: {
//       type: String,
//       required: true,
//       enum: PARTICIPANT_MODELS,
//     },
//     schoolId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "School",
//       required: true,
//     },
//   },
//   { _id: false }
// );

// const messageThreadSchema = new mongoose.Schema(
//   {
//     participants: {
//       type: [participantSchema],
//       validate: {
//         validator: (arr) => arr.length === 2,
//         message: "A thread must have exactly 2 participants",
//       },
//     },

//     schoolId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "School",
//       required: true,
//     },

//     lastMessage: {
//       type: String,
//       default: "",
//     },

//     lastMessageAt: {
//       type: Date,
//       default: null,
//     },

//     // which participantId sent the last message — for unread logic
//     lastMessageSenderId: {
//       type: mongoose.Schema.Types.ObjectId,
//       default: null,
//     },
//   },
//   { timestamps: true }
// );

// // Prevent duplicate threads between same 2 users
// // We sort participant IDs before saving (enforced in controller)
// messageThreadSchema.index({ schoolId: 1, "participants.participantId": 1 });

// const MessageThread =
//   mongoose.models.MessageThread ||
//   mongoose.model("MessageThread", messageThreadSchema);

// export default MessageThread;

import mongoose from "mongoose";

// Allowed participant model names
const PARTICIPANT_MODELS = [
  "Teacher",
  "Student",
  "Staff",
  "School",
  "SuperAdmin",
];

// subType — differentiates student vs parent (both share same Student _id)
// For Teacher, Staff, School → subType is always "default"
// For Student → subType is "student" or "parent"
const PARTICIPANT_SUBTYPES = ["default", "student", "parent"];

const participantSchema = new mongoose.Schema(
  {
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "participants.participantModel",
    },

    participantModel: {
      type: String,
      required: true,
      enum: PARTICIPANT_MODELS,
    },

    // ── subType — KEY FIELD ──────────────────────────────────
    // Allows student and parent to have completely separate threads
    // even though they share the same Student document _id
    // Teacher / Staff / School always use "default"
    subType: {
      type: String,
      enum: PARTICIPANT_SUBTYPES,
      default: "default",
    },

    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      // Optional for SuperAdmin (cross-school help threads)
      required: false,
    },
  },
  { _id: false }
);

const messageThreadSchema = new mongoose.Schema(
  {
    participants: {
      type: [participantSchema],
      validate: {
        validator: (arr) => arr.length === 2,
        message: "A thread must have exactly 2 participants",
      },
    },

    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },

    lastMessage: {
      type: String,
      default: "",
    },

    lastMessageAt: {
      type: Date,
      default: null,
    },

    // Who sent the last message — used for unread indicator
    lastMessageSenderId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    // subType of last sender — needed to correctly identify
    // if last sender was student or parent (same _id)
    lastMessageSenderSubType: {
      type: String,
      enum: PARTICIPANT_SUBTYPES,
      default: "default",
    },

    // Help / support thread with platform Super Admin
    isHelpThread: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────

// Fast inbox fetch per user per school
messageThreadSchema.index({
  schoolId: 1,
  "participants.participantId": 1,
  "participants.subType": 1,
});

// Prevent duplicate threads between same 2 participants
// including subType so student + parent get separate threads
messageThreadSchema.index({
  schoolId: 1,
  "participants.participantId": 1,
  "participants.participantModel": 1,
  "participants.subType": 1,
});

const MessageThread =
  mongoose.models.MessageThread ||
  mongoose.model("MessageThread", messageThreadSchema);

export default MessageThread;