import mongoose from "mongoose";

const dailyLearningSubmissionSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyLearningAssignment",
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "submitted", "graded"],
      default: "pending",
    },
    mcqAnswers: [
      {
        questionIndex: Number,
        selectedOptionIndex: Number,
      },
    ],
    handwritten: {
      url: { type: String, default: "" },
      public_id: { type: String, default: "" },
      name: { type: String, default: "" },
    },
    score: { type: Number, default: null },
    maxScore: { type: Number, default: null },
    feedback: { type: String, default: "" },
    strengths: { type: String, default: "" },
    improvements: { type: String, default: "" },
    perQuestionFeedback: [
      {
        questionIndex: Number,
        correct: Boolean,
        comment: String,
      },
    ],
    gradedAt: Date,
    submittedAt: Date,
    visibleToTeacher: { type: Boolean, default: true },
  },
  { timestamps: true },
);

dailyLearningSubmissionSchema.index(
  { assignmentId: 1, studentId: 1 },
  { unique: true },
);

export default mongoose.model(
  "DailyLearningSubmission",
  dailyLearningSubmissionSchema,
);
