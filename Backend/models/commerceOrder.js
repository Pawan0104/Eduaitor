import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CommerceProduct",
      required: true,
    },
    name: { type: String, required: true },
    category: { type: String, required: true },
    sku: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const commerceOrderSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },
    customerName: {
      type: String,
      trim: true,
      default: "",
    },
    items: {
      type: [orderItemSchema],
      validate: [(v) => Array.isArray(v) && v.length > 0, "Order needs items"],
    },
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refunded"],
      default: "Pending",
    },
    paymentMode: {
      type: String,
      enum: ["Cash", "Online", "UPI", ""],
      default: "",
    },
    orderStatus: {
      type: String,
      enum: ["Placed", "Processing", "Ready", "Delivered", "Cancelled"],
      default: "Placed",
    },
    razorpayOrderId: { type: String, default: "" },
    razorpayPaymentId: { type: String, default: "" },
    razorpaySignature: { type: String, default: "" },
    paidAt: { type: Date, default: null },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

commerceOrderSchema.index({ schoolId: 1, orderNumber: 1 }, { unique: true });
commerceOrderSchema.index({ schoolId: 1, paymentStatus: 1, createdAt: -1 });

export default mongoose.model("CommerceOrder", commerceOrderSchema);
