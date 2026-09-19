import mongoose from "mongoose";
import { fileDocSchema } from "./urlSchemas.js";

/* ───────────────── ATTENDANT (Module 5) ───────────────── */

const attendantSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },

    attendantId: String,

    name: { type: String, required: true, trim: true },
    phone: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, "Invalid phone number"],
    },
    gender: { type: String, enum: ["Male", "Female", "Other"], default: "Male" },
    bloodGroup: { type: String, default: "" },
    photo: { type: fileDocSchema, default: () => ({}) },
    aadharDoc: { type: fileDocSchema, default: () => ({}) },

    /* training */
    trainingRecords: [
      {
        trainingName: { type: String, default: "" },
        completedOn: { type: Date, default: null },
        expiryDate: { type: Date, default: null },
        certificate: { type: fileDocSchema, default: () => ({}) },
        status: { type: String, enum: ["Valid", "Expired", "Due"], default: "Valid" },
      },
    ],

    /* verification */
    verification: {
      policeVerified: { type: Boolean, default: false },
      policeVerifiedOn: { type: Date, default: null },
      aadharVerified: { type: Boolean, default: false },
    },

    /* assignment */
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Bus", default: null },
    route: { type: mongoose.Schema.Types.ObjectId, ref: "TransportRoute", default: null },

    /* daily attendance */
    attendances: [
      {
        date: { type: String, default: "" }, // YYYY-MM-DD
        status: { type: String, enum: ["Present", "Absent", "On Leave"], default: "Present" },
        note: { type: String, default: "" },
      },
    ],

    status: {
      type: String,
      enum: ["Active", "On Leave", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true },
);

attendantSchema.index({ schoolId: 1 });
attendantSchema.index({ schoolId: 1, phone: 1 }, { unique: true, sparse: true });

/* AUTO ATTENDANT ID (NO COUNTER) */
attendantSchema.pre("save", function () {
  if (!this.attendantId) {
    const shortId = this._id.toString().slice(-4).toUpperCase();
    this.attendantId = `ATT-${shortId}`;
  }
});

export const Attendant =
  mongoose.models.Attendant || mongoose.model("Attendant", attendantSchema);