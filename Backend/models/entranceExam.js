import mongoose from "mongoose";

/**
 * Entrance exam scheduled for one class of the admission funnel.
 *
 * When a new exam is created, every pending registration for that class is
 * linked to it automatically so the school never has to assign candidates by
 * hand. Marks entered against an exam decide pass/fail and unlock admission.
 */
const entranceExamSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    academicYear: { type: String, default: "" },

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    className: { type: String, default: "" },

    examDate: { type: Date, required: true },
    startTime: { type: String, default: "09:00" },
    endTime: { type: String, default: "11:00" },
    venue: { type: String, default: "" },

    totalMarks: { type: Number, default: 100, min: 1 },
    passingMarks: { type: Number, default: 33, min: 0 },
    instructions: { type: String, default: "" },

    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled",
      index: true,
    },
    resultDate: { type: Date, default: null },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  { timestamps: true },
);

entranceExamSchema.index({ schoolId: 1, classId: 1, examDate: 1 });
entranceExamSchema.index({ schoolId: 1, examDate: -1 });

export default mongoose.models.EntranceExam ||
  mongoose.model("EntranceExam", entranceExamSchema);
