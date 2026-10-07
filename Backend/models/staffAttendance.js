import mongoose from "mongoose";

const staffAttendanceSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      // Polymorphic: points at a Staff, Teacher or Driver document. Use
      // personType below to know which collection the id belongs to, so it is
      // deliberately not a hard "Staff" ref.
      required: true,
    },
    personType: {
      type: String,
      enum: ["staff", "teacher", "driver"],
      default: "staff",
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    month: {
      type: Number,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["Present", "Absent", "Leave", "Half Day"],
      required: true,
    },
    note: {
      type: String,
      default: "",
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  { timestamps: true },
);

staffAttendanceSchema.index(
  { schoolId: 1, staffId: 1, date: 1 },
  { unique: true },
);

const StaffAttendance =
  mongoose.models.StaffAttendance ||
  mongoose.model("StaffAttendance", staffAttendanceSchema);

export default StaffAttendance;
