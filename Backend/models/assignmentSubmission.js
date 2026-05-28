import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    answers: [
      {
        questionIndex: { type: Number, required: true },
        questionText: String,
        questionType: { type: String, enum: ["short", "long", "mcq"] },
        selectedOptionIndex: Number, // for mcq
        textAnswer: String, // for short/long
        isCorrect: Boolean, // auto-graded for mcq
        marksAwarded: { type: Number, default: 0 },
        maxMarks: Number,
      },
    ],
    totalMarksAwarded: { type: Number, default: 0 },
    totalMarks: Number,
    percentage: Number,
    attemptNumber: { type: Number, default: 1 },
    submittedAt: { type: Date, default: Date.now },
    timeTakenSeconds: Number,
    status: {
      type: String,
      enum: ["submitted", "graded"],
      default: "submitted",
    },
  },
  { timestamps: true },
);

submissionSchema.index({ assignmentId: 1, studentId: 1 });

export default mongoose.model("AssignmentSubmission", submissionSchema);
