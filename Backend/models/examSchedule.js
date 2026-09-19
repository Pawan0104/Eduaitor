import mongoose from "mongoose";

const scheduleRowSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    className: { type: String, default: "" },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    subjectName: { type: String, default: "" },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
    teacherName: { type: String, default: "" },
    startTime: { type: String, default: "09:00" },
    endTime: { type: String, default: "11:00" },
  },
  { _id: true },
);

const versionSchema = new mongoose.Schema(
  {
    version: { type: Number, required: true },
    schedule: [scheduleRowSchema],
    status: {
      type: String,
      enum: ["draft", "published", "restored"],
      default: "draft",
    },
    score: { type: Number, default: 0 },
    publishedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const conflictSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["holiday", "date-range", "class-conflict", "teacher-conflict"],
    },
    message: { type: String },
    date: { type: Date },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
    rowIndex: { type: Number },
  },
  { _id: false },
);

const teacherUnavailableSchema = new mongoose.Schema(
  {
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
    dates: [String],
  },
  { _id: false },
);

const classSubjectSchema = new mongoose.Schema(
  {
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
    className: { type: String, default: "" },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
    subjectName: { type: String, default: "" },
    durationMinutes: { type: Number, default: 120 },
  },
  { _id: false },
);

const examScheduleSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    examName: { type: String, required: true, trim: true },
    paperSubmissionDeadline: { type: Date, default: null },
    paperTotalMarks: { type: Number, default: 80 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    holidays: [String],
    autoSundays: { type: Boolean, default: true },
    classes: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
    ],
    subjects: [classSubjectSchema],
    teachers: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
    ],
    teacherUnavailable: [teacherUnavailableSchema],
    gapRule: { type: Number, enum: [0, 1, 2], default: 1 },
    startTime: { type: String, default: "09:00" },
    endTime: { type: String, default: "11:00" },
    schedule: [scheduleRowSchema],
    conflicts: [conflictSchema],
    suggestions: [String],
    score: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    version: { type: Number, default: 1 },
    versions: [versionSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

examScheduleSchema.index({ schoolId: 1, examName: 1 });
examScheduleSchema.index({ schoolId: 1, createdAt: -1 });

export default mongoose.model("ExamSchedule", examScheduleSchema);