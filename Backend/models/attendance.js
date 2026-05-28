import mongoose from "mongoose";
const attendanceSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true }, 
    sectionId: { type: mongoose.Schema.Types.ObjectId, ref: "Section", required: true }, 
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
    
    date: { type: Date, required: true }, // Full Date: 2026-04-01
    
    // Explicit fields for fast reporting
    month: { type: Number, required: true }, // 1 to 12
    year: { type: Number, required: true },  // 2026
    academicYear: { type: String, required: true }, // e.g., "2025-26"

    status: {
        type: String,
        enum: ["Present", "Absent", "Late"],
        default: "Present",
    },
}, { timestamps: true });

// IMPORTANT: Compound Index for fast lookup
// This makes searching for a specific class's attendance for a specific month instant.
attendanceSchema.index({ schoolId: 1, classId: 1, sectionId: 1, month: 1, year: 1 });

export default mongoose.model("Attendance", attendanceSchema);