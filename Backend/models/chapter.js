import mongoose from "mongoose";
 
const chapterSchema = new mongoose.Schema(
  {
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
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true,
    },
    termId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Term",
  required: true,
  index: true,
},
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    /** Full chapter main content (imported from global catalog or written by school) */
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
  { timestamps: true }
);
 
// Compound index for faster queries
chapterSchema.index({ schoolId: 1, classId: 1, subjectId: 1 });
 
export default mongoose.model("Chapter", chapterSchema);