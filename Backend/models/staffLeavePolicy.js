import mongoose from "mongoose";

/**
 * Per-school leave credit policy — managed by School Admin.
 * daysPerPeriod is credited every creditFrequency cycle.
 */
const allotmentSchema = new mongoose.Schema(
  {
    leaveTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveType",
      required: true,
    },
    daysPerPeriod: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false },
);

const staffLeavePolicySchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      unique: true,
    },
    creditFrequency: {
      type: String,
      enum: ["monthly", "quarterly", "half-yearly", "yearly"],
      default: "yearly",
    },
    allotments: { type: [allotmentSchema], default: [] },
    /** Carry unused balance into next period */
    allowCarryForward: { type: Boolean, default: false },
    maxCarryForwardDays: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

export default mongoose.models.StaffLeavePolicy ||
  mongoose.model("StaffLeavePolicy", staffLeavePolicySchema);
