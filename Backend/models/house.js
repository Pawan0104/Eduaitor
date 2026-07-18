import mongoose from "mongoose";

export const DEFAULT_HOUSES = [
  { name: "Red House", code: "RED", color: "#EF4444" },
  { name: "Blue House", code: "BLUE", color: "#3B82F6" },
  { name: "Green House", code: "GREEN", color: "#22C55E" },
  { name: "Yellow House", code: "YELLOW", color: "#EAB308" },
];

const houseSchema = new mongoose.Schema(
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
    color: {
      type: String,
      trim: true,
      default: "#6366F1",
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
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

houseSchema.index({ schoolId: 1, name: 1 }, { unique: true });
houseSchema.index(
  { schoolId: 1, code: 1 },
  { unique: true, partialFilterExpression: { code: { $type: "string", $ne: "" } } },
);

export default mongoose.model("House", houseSchema);
