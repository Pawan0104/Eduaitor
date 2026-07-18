import mongoose from "mongoose";

const classPageProgressSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
      index: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
      index: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: true,
      index: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true,
    },
    chapterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chapter",
      required: true,
      index: true,
    },
    bookTitle: { type: String, default: "" },
    chapterName: { type: String, required: true, trim: true },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    pageFrom: { type: Number, required: true, min: 1 },
    pageTo: { type: Number, required: true, min: 1 },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

classPageProgressSchema.index({
  schoolId: 1,
  classId: 1,
  sectionId: 1,
  subjectId: 1,
  date: -1,
});

export default mongoose.model("ClassPageProgress", classPageProgressSchema);
