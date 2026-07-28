import mongoose from "mongoose";
const paymentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    receiptNo: { type: String, required: true },
    amountPaid: { type: Number, required: true },
    paymentMode: {
      type: String,
      enum: ["Cash", "UPI", "Cheque", "Online"],
      required: true,
    },
    paidDate: { type: Date, default: Date.now },
    remarks: { type: String },
    /** Fee periods covered by this payment, e.g. ["Q1","Q2"] or ["M4"] */
    periodKeys: { type: [String], default: [] },
    /** UPI reference number (UTR) — required when paymentMode is UPI */
    utr: { type: String, trim: true, default: "" },
    /** Manual / gateway transaction reference for Online payments */
    transactionId: { type: String, trim: true, default: "" },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
  },
  {
    autoIndex: true,
  },
);

paymentSchema.index({ receiptNo: 1, schoolId: 1 }, { unique: true });

export default mongoose.model("Payment", paymentSchema);
