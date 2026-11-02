import mongoose from "mongoose";
import sessionScopedPlugin from "../utils/sessionPlugin.js";

const diarySchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    /** Academic session this diary entry belongs to (e.g. "2026-27"). */
    academicYear: { type: String, default: "", index: true },

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
      required: true,
      ref: "Section",
    },

    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
    },

    type: {
      type: String,
      enum: ["homework", "classwork", "remark"],
      required: true,
    },

    content: {
      type: String,
      required: true,
    },

    dueDate: Date,

    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

diarySchema.plugin(sessionScopedPlugin);

export default mongoose.model("Diary", diarySchema);
