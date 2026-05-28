import mongoose from "mongoose";

const noticeSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: ["Examination", "Meeting", "Holiday", "Fee", "Event", "General"],
    },
    priority: {
      type: String,
      default: "Normal",
      enum: ["Normal", "High", "Low"],
    },
    audience: {
      type: String,
      required: true,
      enum: ["All", "Parents", "Staff", "Class"],
    },
    assignedClass: { type: String, default: "" },
    publishDate: { type: Date, required: true },
    expiryDate: { type: Date },
    isActive: { type: Boolean, default: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
);

export default mongoose.model("Notice", noticeSchema);
