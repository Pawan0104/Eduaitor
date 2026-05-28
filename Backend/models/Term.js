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
      type: String, // "Half Yearly", "Final"
      required: true,
    },
    order: Number,
    startDate: Date,
    endDate: Date,
  },
  { timestamps: true },
);

export default mongoose.model("Term", termSchema);
