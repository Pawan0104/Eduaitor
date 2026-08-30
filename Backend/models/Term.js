import mongoose from "mongoose";

const termSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    academicYear: {
      type: String,
      required: true,
    },
    name: {
      type: String, // "Half Yearly", "Yearly"
      required: true,
    },
    /** Report-card type: half_yearly | yearly | other */
    termType: {
      type: String,
      enum: ["half_yearly", "yearly", "other"],
      default: "other",
    },
    order: Number,
    startDate: Date,
    endDate: Date,
  },
  { timestamps: true },
);

// Unique term name within a school + academic year
termSchema.index({ schoolId: 1, academicYear: 1, name: 1 }, { unique: true });

export default mongoose.model("Term", termSchema);
