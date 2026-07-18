import mongoose from "mongoose";

const hostelSchema = new mongoose.Schema(
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
    },
    type: {
      type: String,
      enum: ["Boys", "Girls", "Co-ed"],
      default: "Boys",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    totalFloors: {
      type: Number,
      min: 0,
      default: 1,
    },
    capacity: {
      type: Number,
      min: 0,
      default: 0,
    },
    wardenName: {
      type: String,
      trim: true,
      default: "",
    },
    wardenPhone: {
      type: String,
      trim: true,
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
  { timestamps: true }
);

hostelSchema.index({ schoolId: 1, name: 1 }, { unique: true });
hostelSchema.index(
  { schoolId: 1, code: 1 },
  {
    unique: true,
    partialFilterExpression: {
      code: { $exists: true, $type: "string", $gt: "" },
    },
  }
);

export default mongoose.model("Hostel", hostelSchema);
