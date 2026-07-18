import mongoose from "mongoose";

export const COMMERCE_CATEGORIES = [
  "uniform",
  "book",
  "stationery",
  "accessory",
];

const commerceProductSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: COMMERCE_CATEGORIES,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    unit: {
      type: String,
      trim: true,
      default: "piece",
    },
    size: {
      type: String,
      trim: true,
      default: "",
    },
    gender: {
      type: String,
      enum: ["Boys", "Girls", "Unisex", ""],
      default: "",
    },
    classLabel: {
      type: String,
      trim: true,
      default: "",
    },
    subject: {
      type: String,
      trim: true,
      default: "",
    },
    author: {
      type: String,
      trim: true,
      default: "",
    },
    isbn: {
      type: String,
      trim: true,
      default: "",
    },
    brand: {
      type: String,
      trim: true,
      default: "",
    },
    color: {
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

commerceProductSchema.index(
  { schoolId: 1, sku: 1 },
  {
    unique: true,
    partialFilterExpression: {
      sku: { $exists: true, $type: "string", $gt: "" },
    },
  }
);

commerceProductSchema.index({ schoolId: 1, category: 1, name: 1 });

export default mongoose.model("CommerceProduct", commerceProductSchema);
