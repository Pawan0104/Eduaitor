import mongoose from "mongoose";
import sessionScopedPlugin from "../utils/sessionPlugin.js";

const feeHeadSchema = new mongoose.Schema(
  {
    feeId: { type: mongoose.Schema.Types.ObjectId },
    name: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

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
      enum: ["Cash", "UPI", "Cheque", "Online", "Refund", "Voucher"],
      required: true,
    },
    paidDate: { type: Date, default: Date.now },
    remarks: { type: String },
    /** Fee periods covered by this payment, e.g. ["Q1","Q2"] or ["M4"] */
    periodKeys: { type: [String], default: [] },
    /** Bifurcated fee heads included in this entry */
    feeHeads: { type: [feeHeadSchema], default: [] },
    /**
     * payment — money received
     * refund  — money returned (reduces totalPaid)
     * voucher — demand / challan (does not change balances until collected)
     */
    entryType: {
      type: String,
      enum: ["payment", "refund", "voucher"],
      default: "payment",
      index: true,
    },
    /** For vouchers: open until collected; for refunds/payments usually settled */
    status: {
      type: String,
      enum: ["settled", "open", "cancelled", "collected"],
      default: "settled",
    },
    /** Original payment this refund reverses */
    refundOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
    /** Voucher this payment settles (optional link) */
    voucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
    /** UPI reference number (UTR) — required when paymentMode is UPI */
    utr: { type: String, trim: true, default: "" },
    /** Manual / gateway transaction reference for Online payments */
    transactionId: { type: String, trim: true, default: "" },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    /** Academic session this payment belongs to (e.g. "2026-27"). */
    academicYear: { type: String, default: "", index: true },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
  },
  {
    autoIndex: true,
  },
);

paymentSchema.index({ receiptNo: 1, schoolId: 1 }, { unique: true });

paymentSchema.plugin(sessionScopedPlugin);

export default mongoose.model("Payment", paymentSchema);
