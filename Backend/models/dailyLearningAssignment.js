import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    type: {
      type: String,
      enum: ["mcq", "short", "long", "descriptive"],
      required: true,
    },
    options: [
      {
        text: { type: String, required: true },
        isCorrect: { type: Boolean, default: false },
      },
    ],
    marks: { type: Number, default: 1 },
    pageHint: { type: String, default: "" },
  },
  { _id: false },
);

const dailyLearningAssignmentSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    parentUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
    },
    sourceProgressIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ClassPageProgress",
      },
    ],
    type: {
      type: String,
      enum: ["mcq", "descriptive"],
      required: true,
    },
    status: {
      type: String,
      enum: ["generating", "ready", "failed"],
      default: "generating",
    },
    failReason: { type: String, default: "" },
    title: { type: String, default: "Daily learning assignment" },
    questions: [questionSchema],
    pdfContext: {
      chapterName: String,
      pageFrom: Number,
      pageTo: Number,
      pdfUrl: String,
      chapterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chapter",
      },
    },
    questionCount: { type: Number, default: 5 },
  },
  { timestamps: true },
);

dailyLearningAssignmentSchema.index({ schoolId: 1, studentId: 1, createdAt: -1 });
dailyLearningAssignmentSchema.index({ schoolId: 1, classId: 1, sectionId: 1 });

export default mongoose.model(
  "DailyLearningAssignment",
  dailyLearningAssignmentSchema,
);
