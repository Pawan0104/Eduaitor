import mongoose from "mongoose";

const followUpSchema = new mongoose.Schema(
  {
    comment: {
      type: String,
      required: true,
      trim: true,
    },
    addedBy: {
      userId: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
      },
      name: {
        type: String,
        default: "",
      },
      role: {
        type: String,
        default: "",
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const leadSchema = new mongoose.Schema(
  {
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    parentName: {
      type: String,
      required: true,
      trim: true,
    },
    parentMobile: {
      type: String,
      required: true,
      trim: true,
    },
    parentEmail: {
      type: String,
      trim: true,
      default: "",
    },
    previousSchoolName: {
      type: String,
      trim: true,
      default: "",
    },
    assignedTo: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
      userType: {
        type: String,
        enum: ["school_admin", "teacher", "staff"],
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      roleLabel: {
        type: String,
        required: true,
      },
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    /** Human-readable lead id per school, e.g. LEAD0001 */
    leadNumber: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "processing", "admitted", "cancelled"],
      default: "active",
    },
    /** Set when lead is converted via admission form */
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },
    followUps: {
      type: [followUpSchema],
      default: [],
    },
  },
  { timestamps: true },
);

leadSchema.index({ schoolId: 1, leadNumber: 1 }, { unique: true, sparse: true });

export default mongoose.models.Lead || mongoose.model("Lead", leadSchema);