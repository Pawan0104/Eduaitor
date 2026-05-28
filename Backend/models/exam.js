// models/Exam.js
import mongoose from "mongoose";

const ExamSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  termId: { type: mongoose.Schema.Types.ObjectId, ref: 'Term', required: true }, // Added Term
  className: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true }, // Added Teacher
  examDate: { type: Date, required: true },
  dayOfWeek: { type: String },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  totalMarks: { type: Number, required: true },
  passingMarks: { type: Number, required: true },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' }, // Added Section
}, { timestamps: true });

export default mongoose.model('Exam', ExamSchema);