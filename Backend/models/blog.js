import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    public_id: { type: String, required: true },
  },
  { _id: false },
);

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    content: {
      type: String,
      required: [true, "Content is required"],
    },
    category: {
      type: String,
      default: "General",
      trim: true,
    },
    images: [imageSchema],
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    likes: {
      type: Number,
      default: 0,
    },
    // tracks which users already liked — prevents duplicate likes
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "creatorModel",
    },
    creatorModel: {
      type: String,
      enum: ["Teacher", "School"], // extend if needed
    },
    creatorRole: {
      type: String,
      enum: ["school_admin", "teacher_admin"],
    },
    studentAuthor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },
    status: {
      type: String,
      enum: ["published", "pending", "rejected"],
      default: "published", // existing blogs default to published
    },
    rejectionReason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

export default mongoose.model("Blog", blogSchema);