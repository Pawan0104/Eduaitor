import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true },
);

// Same subject name allowed in different schools; unique within one school
subjectSchema.index({ schoolId: 1, name: 1 }, { unique: true });

export default mongoose.model("Subject", subjectSchema);
