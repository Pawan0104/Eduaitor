import mongoose from "mongoose";
import { MODULE_KEYS } from "../constants/module.js";

const schoolStaffRoleSchema = new mongoose.Schema(
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
    /** Lowercased name for unique index per school */
    nameKey: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    permissions: {
      type: [{ type: String, enum: MODULE_KEYS }],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

schoolStaffRoleSchema.index({ schoolId: 1, nameKey: 1 }, { unique: true });

schoolStaffRoleSchema.pre("validate", function () {
  if (this.name) {
    this.nameKey = String(this.name).trim().toLowerCase();
  }
});

export default mongoose.models.SchoolStaffRole ||
  mongoose.model("SchoolStaffRole", schoolStaffRoleSchema);
