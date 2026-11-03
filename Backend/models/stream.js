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

export default mongoose.models.Stream || mongoose.model("Stream", streamSchema);
