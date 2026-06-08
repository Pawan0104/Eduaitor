import mongoose from "mongoose";

/**
 * ClassAttendance Model
 * ---------------------
 * Stores ONE-TIME daily attendance marked by the class teacher.
 * No subjectId — this is a single mark per student per day.
 * Kept separate from the subject-wise `Attendance` model intentionally.
 */
const classAttendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "studentId is required"],
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "classId is required"],
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: [true, "sectionId is required"],
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "schoolId is required"],
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: [true, "markedBy (teacherId) is required"],
    },

    date: { type: Date, required: [true, "date is required"] },
    month: { type: Number, required: true, min: 1, max: 12 },
    year:  { type: Number, required: true },
    academicYear: { type: String, required: true }, // e.g. "2025-26"

    status: {
      type: String,
      enum: {
        values: ["Present", "Absent", "Late"],
        message: "status must be Present, Absent, or Late",
      },
      default: "Present",
    },
  },
  { timestamps: true }
);

/* ── Indexes ─────────────────────────────────────────────────────────────── */

// Fast lookup: did this class+section already get marked on this date?
classAttendanceSchema.index(
  { schoolId: 1, classId: 1, sectionId: 1, date: 1 },
  { name: "idx_school_class_section_date" }
);

// Fast monthly report aggregation
classAttendanceSchema.index(
  { schoolId: 1, classId: 1, sectionId: 1, month: 1, year: 1 },
  { name: "idx_school_class_section_month_year" }
);

// Fast per-student history
classAttendanceSchema.index(
  { studentId: 1, month: 1, year: 1 },
  { name: "idx_student_month_year" }
);

// Unique: one record per student per day (prevents duplicate saves)
classAttendanceSchema.index(
  { studentId: 1, classId: 1, sectionId: 1, date: 1 },
  { unique: true, name: "idx_unique_student_class_date" }
);

export default mongoose.model("ClassAttendance", classAttendanceSchema);