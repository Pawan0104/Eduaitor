import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    questionType: {
      type: String,
      enum: ["MCQ", "OneLiner", "ShortAnswer", "Descriptive", "LongAnswer", "CaseStudy", "TrueFalse", "FillBlanks"],
      required: true,
    },
    questionText: { type: String, required: true, trim: true },
    options: [{ type: String, trim: true }],
    answer: { type: String, default: "" },
    marks: { type: Number, default: 1 },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], default: "Medium" },
    chapterId: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter", default: null },
    chapterName: { type: String, default: "" },
  },
  { _id: true }
);

const questionTypeSlotSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["MCQ", "OneLiner", "ShortAnswer", "Descriptive", "LongAnswer", "CaseStudy", "TrueFalse", "FillBlanks"],
      required: true,
    },
    count: { type: Number, default: 0 },
    marksEach: { type: Number, default: 1 },
  },
  { _id: false }
);

const syllabusChapterRef = new mongoose.Schema(
  {
    chapterId: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter" },
    chapterName: { type: String, default: "" },
  },
  { _id: false }
);

const versionSnapshot = new mongoose.Schema(
  {
    version: Number,
    questions: [questionSchema],
    status: String,
    adminRemarks: String,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const examPaperSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    examScheduleId: { type: mongoose.Schema.Types.ObjectId, ref: "ExamSchedule", default: null },
    examName: { type: String, required: true, trim: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    className: { type: String, default: "" },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    subjectName: { type: String, default: "" },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
    teacherName: { type: String, default: "" },
    examDate: { type: Date, default: null },
    submissionDeadline: { type: Date, default: null },
    totalMarks: { type: Number, default: 80 },
    duration: { type: String, default: "3 Hours" },
    durationMinutes: { type: Number, default: 180 },
    syllabusChapters: [syllabusChapterRef],
    questionTypes: [questionTypeSlotSchema],
    questions: [questionSchema],
    status: {
      type: String,
      enum: ["draft", "pending", "approved", "rejected", "revision"],
      default: "draft",
      index: true,
    },
    adminRemarks: { type: String, default: "" },
    submittedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    version: { type: Number, default: 1 },
    versions: [versionSnapshot],
  },
  { timestamps: true }
);

examPaperSchema.index({ schoolId: 1, classId: 1, subjectId: 1 });
examPaperSchema.index({ schoolId: 1, teacherId: 1, status: 1 });
examPaperSchema.index({ schoolId: 1, examScheduleId: 1 });

export default mongoose.model("ExamPaper", examPaperSchema);
