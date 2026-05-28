// models/Result.js
import mongoose from "mongoose";

const ResultSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      default: null,
    },
    termId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Term",
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },

    // Attendance on exam day
    attendanceStatus: {
      type: String,
      enum: ["Present", "Absent", "Leave", "MedicalLeave", "Exempted"],
      default: "Present",
    },

    marksObtained: {
      type: Number,
      default: null, // null if absent/leave/exempted
    },

    totalMarks: {
      type: Number,
      required: true,
    },

    passingMarks: {
      type: Number,
      required: true,
    },

    percentage: {
      type: Number,
      default: null,
    },

    grade: {
      type: String,
      default: null, // A+, A, B+, B, C, D, F
    },

    isPassed: {
      type: Boolean,
      default: null,
    },

    remarks: {
      type: String,
      default: "",
      trim: true,
    },

    // Audit trail
    isLocked: {
      type: Boolean,
      default: false, // locked after edit window
    },

    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
    },

    enteredAt: {
      type: Date,
    },

    lastEditedAt: {
      type: Date,
    },

    editHistory: [
      {
        editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
        editedAt: { type: Date },
        previousMarks: Number,
        previousStatus: String,
      },
    ],
  },
  { timestamps: true }
);

// ✅ One result per student per exam
ResultSchema.index({ examId: 1, studentId: 1 }, { unique: true });

// ✅ Indexes for fast lookups
ResultSchema.index({ schoolId: 1, termId: 1, studentId: 1 });
ResultSchema.index({ schoolId: 1, classId: 1, termId: 1 });
ResultSchema.index({ schoolId: 1, examId: 1 });

export default mongoose.model("Result", ResultSchema);