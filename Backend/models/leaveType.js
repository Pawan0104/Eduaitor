import mongoose from "mongoose";

/**
 * Leave types — Super Admin creates global types (schoolId null).
 * School Admin creates school-specific types (schoolId set).
 */
const leaveTypeSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      default: null,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    description: { type: String, default: "", trim: true },
    isPaid: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Unique code per school; global types use schoolId null
leaveTypeSchema.index(
  { schoolId: 1, code: 1 },
  { unique: true },
);

export default mongoose.models.LeaveType ||
  mongoose.model("LeaveType", leaveTypeSchema);
