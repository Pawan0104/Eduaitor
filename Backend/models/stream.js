import mongoose from "mongoose";

const streamSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    /** Classes this stream applies to. Empty = available for all classes (legacy). */
    classIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Class",
        },
      ],
      default: [],
    },
    /** Compulsory subjects for this stream (from school subject master). */
    compulsorySubjectIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Subject",
        },
      ],
      default: [],
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true },
);

streamSchema.index({ schoolId: 1, name: 1 }, { unique: true });
streamSchema.index(
  { schoolId: 1, code: 1 },
  {
    unique: true,
    partialFilterExpression: { code: { $type: "string", $ne: "" } },
  },
);
streamSchema.index({ schoolId: 1, classIds: 1 });
streamSchema.index({ schoolId: 1, compulsorySubjectIds: 1 });

export default mongoose.models.Stream || mongoose.model("Stream", streamSchema);
