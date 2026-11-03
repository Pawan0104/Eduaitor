import mongoose from "mongoose";

/**
 * Leave balance for a teacher or staff member for a leave type
 * within a credit period (e.g. 2025-Q1, 2025-M04, 2025).
 */
const staffLeaveBalanceSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    personType: {
      type: String,
      enum: ["teacher", "staff"],
      required: true,
    },
    personId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    leaveTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveType",
      required: true,
    },
    periodKey: { type: String, required: true },
    credited: { type: Number, default: 0, min: 0 },
    used: { type: Number, default: 0, min: 0 },
    /** credited - used (kept denormalized for quick reads) */
    balance: { type: Number, default: 0 },
  },
  { timestamps: true },
);

staffLeaveBalanceSchema.index(
  { schoolId: 1, personType: 1, personId: 1, leaveTypeId: 1, periodKey: 1 },
  { unique: true },
);
staffLeaveBalanceSchema.index({ schoolId: 1, personId: 1 });

export default mongoose.models.StaffLeaveBalance ||
  mongoose.model("StaffLeaveBalance", staffLeaveBalanceSchema);
