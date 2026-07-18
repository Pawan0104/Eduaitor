import mongoose from "mongoose";

const syllabusTemplateTopicSchema = new mongoose.Schema(
  {
    templateChapterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SyllabusTemplateChapter",
      required: true,
      index: true,
    },
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SyllabusBook",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      default: "",
    },
    /** Module page range within the chapter PDF (1-based) */
    pageFrom: {
      type: Number,
      default: null,
      min: 1,
    },
    pageTo: {
      type: Number,
      default: null,
      min: 1,
    },
    order: {
      type: Number,
      default: 0,
    },
    difficultyLevel: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    keywords: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true },
);

syllabusTemplateTopicSchema.index({ templateChapterId: 1, order: 1 });

export default mongoose.model(
  "SyllabusTemplateTopic",
  syllabusTemplateTopicSchema,
);
