import mongoose from "mongoose";

const feeComponentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    amount: {
      type: Number,
      required: true,
      min: [0, "Amount cannot be negative"],
    },
    /** Admin can add as many components as needed */
    isOptional: { type: Boolean, default: false },
    /**
     * Helps bifurcation / auto-apply rules:
     * General  — tuition, exam, lab, etc.
     * Hostel   — applied for boarders / hostel residents
     * Transport — applied when transport route assigned
     * Other    — custom heads
     */
    category: {
      type: String,
      enum: ["General", "Hostel", "Transport", "Other"],
      default: "General",
    },
    /**
     * New  — only for newly admitted students
     * Old  — only for continuing / old students
     * All  — both
     */
    appliesTo: {
      type: String,
      enum: ["All", "New", "Old"],
      default: "All",
    },
  },
  { _id: true },
);

const feeStructureSchema = new mongoose.Schema(
  {
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    fees: [feeComponentSchema],
    /** How annual fee is billed to parents: monthly | quarterly | half-yearly | annually */
    frequency: {
      type: String,
      enum: ["monthly", "quarterly", "half-yearly", "annually"],
      default: "annually",
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
  },
  { timestamps: true },
);

feeStructureSchema.index({ schoolId: 1, class: 1 }, { unique: true });

export default mongoose.model("FeeStructure", feeStructureSchema);
