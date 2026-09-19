import mongoose from "mongoose";

const classTestResultSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    attendanceStatus: {
      type: String,
      enum: ["Present", "Absent", "Leave"],
      default: "Present",
    },
    marksObtained: { type: Number, default: null },
    percentage: { type: Number, default: null },
    grade: { type: String, default: null },
  },
  { _id: false },
);

const classTestSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    className: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      default: null,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    title: { type: String, default: "" },
    testDate: { type: Date, required: true },
    dayOfWeek: { type: String },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    totalMarks: { type: Number, required: true },
    passingMarks: { type: Number, required: true },
    status: {
      type: String,
      enum: ["scheduled", "completed"],
      default: "scheduled",
    },
    results: [classTestResultSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

classTestSchema.index({ schoolId: 1, className: 1, testDate: 1 });
classTestSchema.index({ teacherId: 1, testDate: 1 });

export default mongoose.model("ClassTest", classTestSchema);