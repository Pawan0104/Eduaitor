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
    /**
     * App punch mode:
     * InCampus  — must be within school campus radius (100–150 m)
     * OutCampus — allowed anywhere; lat/long still captured
     * Manual   — office/admin entry without GPS
     */
    locationMode: {
      type: String,
      enum: ["InCampus", "OutCampus", "Manual"],
      default: "Manual",
    },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    accuracyM: { type: Number, default: null },
    distanceFromSchoolM: { type: Number, default: null },
    markedAt: { type: Date, default: null },
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
