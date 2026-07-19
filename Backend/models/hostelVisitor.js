import mongoose from "mongoose";

const fileSchema = {
  url: { type: String, default: "" },
  public_id: { type: String, default: "" },
  type: { type: String, default: "" },
};

const actorSchema = {
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
  name: { type: String, default: "" },
  role: { type: String, default: "" },
};

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
    /** Live photo captured by security guard at gate */
    photo: fileSchema,
    /**
     * Pending  — submitted by guard, awaiting warden
     * CheckedIn — approved; entry granted
     * Rejected — warden denied entry
     * CheckedOut — visitor left
     */
    status: {
      type: String,
      enum: ["Pending", "CheckedIn", "Rejected", "CheckedOut"],
      default: "Pending",
      index: true,
    },
    submittedBy: actorSchema,
    reviewedBy: actorSchema,
    reviewedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },
    /** Set when warden approves (entry granted) */
    checkInAt: {
      type: Date,
      default: null,
    },
    checkOutAt: {
      type: Date,
      default: null,
    },
    /** Legacy display name; kept in sync with reviewedBy.name on approve */
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

hostelVisitorSchema.index({ schoolId: 1, createdAt: -1 });
hostelVisitorSchema.index({ schoolId: 1, status: 1, hostelId: 1 });

export default mongoose.model("HostelVisitor", hostelVisitorSchema);
