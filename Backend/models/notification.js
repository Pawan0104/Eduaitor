import mongoose from 'mongoose';

const classTargetSchema = new mongoose.Schema({
  classId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  detailId:    { type: mongoose.Schema.Types.ObjectId },   // matches Class.details._id
  sectionId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Section', default: null },
  className:   { type: String },
  sectionName: { type: String },
}, { _id: false });

const targetSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['all', 'role', 'class', 'exam', 'student', 'teacher', 'diary', 'assignment', 'attendance', 'gatepass', 'homework', 'daily_learning'],
    default: 'all',
  },
  roles:     [{ type: String, enum: ['teacher_admin', 'student_admin', 'school_admin', 'staff_admin'] }],
  classId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Class'   }, // kept for older notifications saved before multi-class support
  classes:   [classTargetSchema],                                      // ← new: multi class+section targeting
  examId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Exam'    },
  schoolId:  { type: mongoose.Schema.Types.ObjectId, ref: 'School'  },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  staffId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Staff'   }, // also missing — buildTargetQuery's staff_admin branch checks this but it was never declared, so staff-targeted notifications have the same silent-strip problem
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
  
}, { _id: false });
const attachmentSchema = new mongoose.Schema({
  url:       { type: String, required: true },
  public_id: { type: String, required: true },
  name:      { type: String },             // original filename
  type:      { type: String },             // mimetype e.g. application/pdf
}, { _id: false });

const notificationSchema = new mongoose.Schema({
  title:            { type: String, required: true },
  message:          { type: String, required: true },
  createdBy:        { type: mongoose.Schema.Types.ObjectId},
  targets:          [targetSchema],
  notificationType: {
    type: String,
    enum: ['general', 'exam', 'result', 'attendance', 'fee', 'diary', 'assignment', 'gatepass', 'transport', 'homework', 'daily_learning'],
    default: 'general',
  },
  attachments:  [attachmentSchema],        // ← multiple PDFs
  readBy:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  dismissedBy:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  startingDate: Date,
  edningDate:   Date,
  // scheduling
  status:       { type: String, enum: ['sent', 'scheduled'], default: 'sent' },
  scheduledAt:  Date,                      // when to auto-publish
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);