import mongoose from "mongoose";

const sectionDetailSchema = new mongoose.Schema(
  {
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      default: null,
    },

    roomNumber: {
      type: String,
      required: true,
      trim: true,
    },

    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      default: null,
    },

    capacity: {
      type: Number,
      default: 40,
    },

    studentCount: {
      type: Number,
      default: 0,
    },

    subjectTeachers: [
      {
        subjectId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Subject",
          // required: true,
        },
        teacherId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Teacher",
          default: null,
        },
      },
    ],
  },
  { _id: true },
);

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },

    details: [sectionDetailSchema],

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true },
);

/* ✅ Unique per school */
classSchema.index({ schoolId: 1, name: 1 }, { unique: true });

export default mongoose.model("Class", classSchema);
