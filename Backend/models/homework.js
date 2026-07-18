import mongoose from "mongoose";

const studentStatusSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    status: {
      type: String,
      enum: ["assigned", "marked_done", "completed"],
      default: "assigned",
    },
    markedDoneBy: {
      type: String,
      enum: ["student", "parent", null],
      default: null,
    },
    markedDoneAt: Date,
    teacherRemark: { type: String, default: "" },
    completedAt: Date,
    completedBy: { type: mongoose.Schema.Types.ObjectId },
  },
  { _id: false },
);

const homeworkSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
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
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    students: [studentStatusSchema],
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

homeworkSchema.index({ schoolId: 1, classId: 1, sectionId: 1 });
homeworkSchema.index({ teacherId: 1, createdAt: -1 });
homeworkSchema.index({ "students.studentId": 1 });

export default mongoose.model("Homework", homeworkSchema);
