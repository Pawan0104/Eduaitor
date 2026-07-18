import mongoose from "mongoose";

/**
 * One PDF syllabus file per school + class + subject + term.
 * Complements chapter/topic structure with an uploadable PDF.
 */
const syllabusPdfSchema = new mongoose.Schema(
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
    pdf: {
      url: { type: String, required: true },
      public_id: { type: String, required: true },
      name: { type: String, default: "" },
      type: { type: String, default: "application/pdf" },
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    uploadedByRole: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

syllabusPdfSchema.index(
  { schoolId: 1, classId: 1, subjectId: 1, termId: 1 },
  { unique: true },
);

export default mongoose.model("SyllabusPdf", syllabusPdfSchema);
