import mongoose from "mongoose";

const syllabusBookSchema = new mongoose.Schema(
  {
    boardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SyllabusBoard",
      required: true,
      index: true,
    },
    /** Board class label, e.g. "1", "2", … "12" */
    className: {
      type: String,
      required: true,
      trim: true,
    },
    subjectName: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    medium: {
      type: String,
      default: "English",
      trim: true,
    },
    /** Official NCERT textbook code, e.g. "hemh1", "jesc1" */
    ncertBookCode: {
      type: String,
      default: "",
      trim: true,
    },
    /** Official NCERT book portal URL (textbook.php?code=0-N) */
    ncertPortalUrl: {
      type: String,
      default: "",
      trim: true,
    },
    /** Last chapter index used in NCERT portal URLs */
    ncertChapterCount: {
      type: Number,
      default: 0,
    },
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
  { timestamps: true },
);

syllabusBookSchema.index(
  { boardId: 1, className: 1, subjectName: 1, title: 1 },
  { unique: true },
);
syllabusBookSchema.index({ boardId: 1, className: 1 });

export default mongoose.model("SyllabusBook", syllabusBookSchema);
