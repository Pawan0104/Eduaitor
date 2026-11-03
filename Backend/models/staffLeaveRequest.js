import mongoose from "mongoose";

const staffLeaveRequestSchema = new mongoose.Schema(
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
    personName: { type: String, default: "" },
    leaveTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveType",
      required: true,
    },
    leaveTypeName: { type: String, default: "" },
    leaveTypeCode: { type: String, default: "" },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    days: { type: Number, required: true, min: 0.5 },
    reason: { type: String, required: true, trim: true },
    /** Balance is cut on apply */
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },
    periodKey: { type: String, default: "" },
    deducted: { type: Boolean, default: true },
    actionBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    actionByName: { type: String, default: null },
    actionByRole: { type: String, default: null },
    actionNote: { type: String, default: null },
    actionAt: { type: Date, default: null },
  },
  { timestamps: true },
);

staffLeaveRequestSchema.index({ schoolId: 1, createdAt: -1 });
staffLeaveRequestSchema.index({ schoolId: 1, status: 1 });
staffLeaveRequestSchema.index({ personId: 1, createdAt: -1 });

export default mongoose.models.StaffLeaveRequest ||
  mongoose.model("StaffLeaveRequest", staffLeaveRequestSchema);
