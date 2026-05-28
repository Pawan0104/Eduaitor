import mongoose from "mongoose";

const periodEntrySchema = new mongoose.Schema({
  periodId: { type: String, required: true },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    default: null,
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Teacher",
    default: null,
  },
  substituteTeacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Teacher",
    default: null,
  },
  customName: { type: String, default: "" },
  type: {
    type: String,
    enum: ["lecture", "activity", "lunch", "free"],
    default: "lecture",
  },
  status: {
    type: String,
    enum: ["normal", "no-teacher", "teacher-absent"],
    default: "normal",
  },
});

const dayScheduleSchema = new mongoose.Schema({
  day: String,
  periods: [periodEntrySchema],
});

const periodConfigSchema = new mongoose.Schema({
  id: String,
  name: String,
  start: String,
  end: String,
});

const timetableSchema = new mongoose.Schema(
  {
    schoolId: {
      // ← NEW
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    detailId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    periodConfigs: [periodConfigSchema],
    schedule: [dayScheduleSchema],
  },
  { timestamps: true },
);

// ← schoolId added to unique index
timetableSchema.index(
  { schoolId: 1, classId: 1, detailId: 1 },
  { unique: true },
);

export default mongoose.model("Timetable", timetableSchema);
