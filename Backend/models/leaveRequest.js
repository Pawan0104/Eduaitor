import mongoose from "mongoose";

const leaveRequestSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    requestedByName: {
      type: String,
      default: "",
    },
    requestedByRole: {
      type: String,
      default: "parent",
    },
    leaveType: {
      type: String,
      enum: ["sick", "vacation", "family_function", "personal", "other"],
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    fromDate: {
      type: Date,
      required: true,
    },
    toDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },
    actionBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    actionByName: {
      type: String,
      default: null,
    },
    actionByRole: {
      type: String,
      default: null,
    },
    actionNote: {
      type: String,
      default: null,
    },
    actionAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

leaveRequestSchema.index({ schoolId: 1, createdAt: -1 });
leaveRequestSchema.index({ studentId: 1, createdAt: -1 });
leaveRequestSchema.index({ schoolId: 1, status: 1 });

export default mongoose.model("LeaveRequest", leaveRequestSchema);