import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,

    chapterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chapter",
      required: true,
      index: true,
    },
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Topic",
      index: true,
    },

    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
      index: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },

    type: {
      type: String,
      enum: ["homework", "quiz", "exam"],
      default: "homework",
    },

    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true,
    },

    questions: [
      {
        text: { type: String, required: true },
        type: { type: String, enum: ["short", "long", "mcq"], required: true },
        options: {
          type: [
            {
              text: { type: String, required: true },
              isCorrect: { type: Boolean, default: false },
            },
          ],
          validate: {
            validator: function (opts) {
              if (this.get("type") === "mcq") {
                return opts.length >= 2 && opts.some((o) => o.isCorrect);
              }
              return true;
            },
            message: "MCQ must have at least 2 options and 1 correct answer",
          },
        },
        attachments: [String], // URLs to S3/Cloudinary
        marks: { type: Number, default: 1 },
      },
    ],

    totalMarks: Number,

    dueDate: { type: Date, required: true },
    duration: Number,

    maxAttempts: { type: Number, default: 1 },

    isPublished: { type: Boolean, default: false },
    publishAt: Date,

    status: {
      type: String,
      enum: ["active", "archived", "draft"],
      default: "draft",
    },
  },
  { timestamps: true },
);

assignmentSchema.index({
  schoolId: 1,
  classId: 1,
  subjectId: 1,
  chapterId: 1,
});

export default mongoose.model("Assignment", assignmentSchema);