import mongoose from "mongoose";

const questionBankSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true, index: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true, index: true },
    className: { type: String, default: "" },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true, index: true },
    subjectName: { type: String, default: "" },
    chapterId: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter", default: null },
    chapterName: { type: String, default: "" },
    questionType: {
      type: String,
      enum: ["MCQ", "OneLiner", "ShortAnswer", "Descriptive", "LongAnswer", "CaseStudy", "TrueFalse", "FillBlanks"],
      required: true,
      index: true,
    },
    questionText: { type: String, required: true, trim: true },
    options: [{ type: String, trim: true }],
    answer: { type: String, default: "" },
    marks: { type: Number, default: 1 },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], default: "Medium", index: true },
    usageCount: { type: Number, default: 0 },
    tags: [{ type: String, trim: true }],
    source: { type: String, enum: ["manual", "ai", "imported"], default: "manual" },
    paperId: { type: mongoose.Schema.Types.ObjectId, ref: "ExamPaper", default: null },
  },
  { timestamps: true }
);

questionBankSchema.index({ schoolId: 1, classId: 1, subjectId: 1 });
questionBankSchema.index({ schoolId: 1, questionType: 1, difficulty: 1 });
questionBankSchema.index({ schoolId: 1, chapterId: 1 });

export default mongoose.model("QuestionBank", questionBankSchema);
