import mongoose from "mongoose";

const calendarSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    // academicYearId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "AcademicYear",
    //   required: true,
    // },
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
      maxlength: [120, "Title must be under 120 characters"],
    },
    type: {
      type: String,
      enum: ["Holiday", "Event", "Exam", "Meeting"],
      default: "Event",
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      validate: {
        validator(v) {
          return !v || v >= this.startDate;
        },
        message: "End date cannot be before start date",
      },
    },
    isAllDay: {
      type: Boolean,
      default: true,
    },
    // color removed — type already implies a semantic color on the frontend
    description: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

// Index for fast school + date range queries
calendarSchema.index({ schoolId: 1, startDate: 1, endDate: 1 });
// calendarSchema.index({ academicYearId: 1, startDate: 1 });

export default mongoose.model("Calendar", calendarSchema);
