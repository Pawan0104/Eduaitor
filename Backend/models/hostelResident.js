import mongoose from "mongoose";

const hostelResidentSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    hostelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
      index: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HostelRoom",
      required: true,
      index: true,
    },
    bedId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    bedNumber: {
      type: String,
      required: true,
      trim: true,
    },
    checkInDate: {
      type: Date,
      default: Date.now,
    },
    checkOutDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["Active", "CheckedOut"],
      default: "Active",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

hostelResidentSchema.index(
  { schoolId: 1, studentId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "Active" },
  }
);

hostelResidentSchema.index(
  { schoolId: 1, roomId: 1, bedId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "Active" },
  }
);

export default mongoose.model("HostelResident", hostelResidentSchema);
