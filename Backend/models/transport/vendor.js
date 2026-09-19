import mongoose from "mongoose";
import { fileDocSchema } from "./urlSchemas.js";

/* ───────────────── VENDOR (Module 6) ───────────────── */

const vendorSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },

    vendorId: String,

    vendorName: { type: String, required: true, trim: true },
    vendorType: {
      type: String,
      enum: ["Fuel", "Repair", "Insurance", "Contractor", "Compliance", "Other"],
      default: "Repair",
    },

    contactPerson: { type: String, default: "" },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, default: "", lowercase: true, trim: true },
    address: { type: String, default: "" },

    /* contracts */
    contracts: [
      {
        contractNo: { type: String, default: "" },
        title: { type: String, default: "" },
        startDate: { type: Date, default: null },
        endDate: { type: Date, default: null },
        amount: { type: Number, default: 0 },
        status: {
          type: String,
          enum: ["Draft", "Active", "Expired", "Terminated"],
          default: "Active",
        },
        document: { type: fileDocSchema, default: () => ({}) },
      },
    ],

    /* SLA & compliance */
    sla: {
      responseHrs: { type: Number, default: 0 },
      uptimePct: { type: Number, default: 100 },
      terms: { type: String, default: "" },
    },
    compliance: {
      gstin: { type: String, default: "" },
      pan: { type: String, default: "" },
      verified: { type: Boolean, default: false },
      documents: { type: [fileDocSchema], default: [] },
    },

    /* mapped vehicles */
    vehicles: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Bus" }],
      default: [],
    },

    /* payments */
    payments: [
      {
        amount: { type: Number, default: 0 },
        date: { type: Date, default: null },
        method: {
          type: String,
          enum: ["Cash", "Bank Transfer", "Cheque", "UPI", "Card"],
          default: "Bank Transfer",
        },
        reference: { type: String, default: "" },
        invoice: { type: fileDocSchema, default: () => ({}) },
        status: { type: String, enum: ["Paid", "Pending", "Overdue"], default: "Paid" },
      },
    ],

    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true },
);

vendorSchema.index({ schoolId: 1 });
vendorSchema.index({ schoolId: 1, vendorName: 1 });

/* AUTO VENDOR ID (NO COUNTER) */
vendorSchema.pre("save", function () {
  if (!this.vendorId) {
    const shortId = this._id.toString().slice(-4).toUpperCase();
    this.vendorId = `VND-${shortId}`;
  }
});

export const Vendor = mongoose.models.Vendor || mongoose.model("Vendor", vendorSchema);