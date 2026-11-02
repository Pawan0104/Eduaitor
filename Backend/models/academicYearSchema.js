import mongoose from "mongoose";

const academicYearSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    name: {
      type: String, // "2025-26"
      required: true,
      trim: true,
      match: [/^\d{4}-\d{2}$/, "Use the format YYYY-YY, e.g. 2026-27."],
    },
    startDate: Date,
    endDate: Date,
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Same year label allowed across schools; unique within one school
academicYearSchema.index({ schoolId: 1, name: 1 }, { unique: true });

export default mongoose.models.AcademicYear ||
  mongoose.model("AcademicYear", academicYearSchema);
