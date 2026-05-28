// models/notification.js
import mongoose from 'mongoose';

// ✅ Separate schema so `type` field isn't misread by Mongoose
const targetSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['all', 'role', 'class', 'exam', 'student', 'teacher','diary'], 
    default: 'all' 
  },
  roles:     [{ type: String, enum: ['teacher_admin', 'student_admin', 'school_admin'] }],
  classId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  examId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Exam' },
  schoolId:  { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
}, { _id: false }); // _id: false — no need for IDs on subdocs

const notificationSchema = new mongoose.Schema({
  title:    { type: String, required: true },
  message:  { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  targets: [targetSchema], // ✅ Now Mongoose correctly reads the `type` field

  notificationType: { 
    type: String, 
    enum: ['general', 'exam', 'result', 'attendance', 'fee','diary'], 
    default: 'general' 
  },
  readBy:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  clearedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  startingDate:Date,
  endingDate:Date,
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);