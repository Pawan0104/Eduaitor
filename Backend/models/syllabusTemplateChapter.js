import mongoose from "mongoose";

const syllabusTemplateChapterSchema = new mongoose.Schema(
  {
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
    /** Short summary shown in lists */
    description: {
      type: String,
      default: "",
    },
    /** Full main content of the chapter (what Super Admin / school reads) */
    content: {
      type: String,
      default: "",
    },
    /** Official NCERT chapter page on ncert.nic.in */
    ncertPortalUrl: {
      type: String,
      default: "",
      trim: true,
    },
    /** Direct NCERT chapter PDF URL when available */
    ncertPdfUrl: {
      type: String,
      default: "",
      trim: true,
    },
    /** Optional uploaded chapter PDF (overrides NCERT URL in-app) */
    pdf: {
      url: { type: String, default: "" },
      public_id: { type: String, default: "" },
      name: { type: String, default: "" },
      type: { type: String, default: "application/pdf" },
    },
    learningOutcomes: [
      {
        type: String,
        trim: true,
      },
    ],
    /** Optional hint when schools import into a term */
    termHint: {
      type: String,
      enum: ["term1", "term2", "full_year"],
      default: undefined,
    },
    order: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true },
);

syllabusTemplateChapterSchema.index({ bookId: 1, order: 1 });

export default mongoose.model(
  "SyllabusTemplateChapter",
  syllabusTemplateChapterSchema,
);
