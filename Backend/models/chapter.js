import mongoose from "mongoose";
 
const chapterSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
      index: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true,
    },
    termId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Term",
  required: true,
  index: true,
},
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    learningOutcomes: [
      {
        type: String,
        trim: true,
      },
    ],
    order: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);
 
// Compound index for faster queries
chapterSchema.index({ schoolId: 1, classId: 1, subjectId: 1 });
 
export default mongoose.model("Chapter", chapterSchema);