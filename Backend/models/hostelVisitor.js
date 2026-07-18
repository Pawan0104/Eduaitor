import mongoose from "mongoose";

const hostelVisitorSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    hostelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
      index: true,
    },
    visitorName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    idProofType: {
      type: String,
      enum: ["Aadhaar", "PAN", "Driving License", "Voter ID", "Passport", "Other"],
      default: "Other",
    },
    idProofNumber: {
      type: String,
      trim: true,
      default: "",
    },
    purpose: {
      type: String,
      trim: true,
      default: "",
    },
    /** Free-text relation / who they came to meet */
    whomVisiting: {
      type: String,
      trim: true,
      default: "",
    },
    residentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HostelResident",
      default: null,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
      index: true,
    },
    checkInAt: {
      type: Date,
      default: Date.now,
    },
    checkOutAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["CheckedIn", "CheckedOut"],
      default: "CheckedIn",
      index: true,
    },
    approvedByName: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true },
);

hostelVisitorSchema.index({ schoolId: 1, checkInAt: -1 });
hostelVisitorSchema.index({ schoolId: 1, status: 1, hostelId: 1 });

export default mongoose.model("HostelVisitor", hostelVisitorSchema);
