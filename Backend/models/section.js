import mongoose from "mongoose";

const subSectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true },
);

const sectionSchema = new mongoose.Schema(
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

    subsections: [subSectionSchema],
  },
  { timestamps: true },
);

/* ✅ Unique per school */
sectionSchema.index({ schoolId: 1, name: 1 }, { unique: true });

export default mongoose.model("Section", sectionSchema);
