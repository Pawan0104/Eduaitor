import mongoose from "mongoose";
import { fileDocSchema } from "./urlSchemas.js";

/* ───────────────── DRIVER (Module 4) ───────────────── */

const driverSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },

    driverId: String,
    employeeId: { type: String, default: "", trim: true },

    name: { type: String, required: true, trim: true },

    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^[0-9]{10}$/, "Invalid phone number"],
    },
    /* alias kept in sync by controller for API parity */
    mobile: { type: String, default: "", trim: true },

    bloodGroup: { type: String, default: "", trim: true },
    experience: { type: String, default: "" },

    /* licence */
    license: { type: String, default: "" },
    licenceNumber: { type: String, default: "", trim: true },
    licenseExpiry: { type: Date, default: null },
    badgeNumber: { type: String, default: "", trim: true },

    /* assignment */
    bus: { type: mongoose.Schema.Types.ObjectId, ref: "Bus", default: null },
    currentVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      default: null,
    },
    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TransportRoute",
      default: null,
    },
    currentRoute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TransportRoute",
      default: null,
    },

    /* verification & fitness */
    policeVerification: {
      verified: { type: Boolean, default: false },
      verifiedOn: { type: Date, default: null },
      report: { type: fileDocSchema, default: () => ({}) },
    },
    medicalFitness: {
      fitnessDate: { type: Date, default: null },
      expiryDate: { type: Date, default: null },
      document: { type: fileDocSchema, default: () => ({}) },
    },
    trainingRecords: [
      {
        trainingName: { type: String, default: "" },
        completedOn: { type: Date, default: null },
        expiryDate: { type: Date, default: null },
        certificate: { type: fileDocSchema, default: () => ({}) },
        status: {
          type: String,
          enum: ["Valid", "Expired", "Due"],
          default: "Valid",
        },
      },
    ],

    /* analytics */
    safetyScore: { type: Number, default: 0, min: 0, max: 100 },

    status: {
      type: String,
      enum: ["Active", "On Leave", "Inactive"],
      default: "Active",
    },

    photo: { type: fileDocSchema, default: () => ({}) },

    /** Uploaded Aadhaar card (image / PDF) */
    aadharDoc: { type: fileDocSchema, default: () => ({}) },

    /** Uploaded driving license document (image / PDF) */
    licenseDoc: { type: fileDocSchema, default: () => ({}) },
  },
  { timestamps: true },
);

driverSchema.index({ schoolId: 1 });
driverSchema.index({ schoolId: 1, phone: 1 }, { unique: true });
driverSchema.index({ schoolId: 1, licenseExpiry: 1 });

/* AUTO DRIVER ID (NO COUNTER) */
driverSchema.pre("save", function () {
  if (!this.driverId) {
    const shortId = this._id.toString().slice(-4).toUpperCase();
    this.driverId = `DRV-${shortId}`;
  }
  if (!this.stateReady) {
    this.mobile = this.mobile || this.phone || "";
    this.licenceNumber = this.licenceNumber || this.license || "";
    this.currentVehicle = this.currentVehicle || this.bus || null;
    this.currentRoute = this.currentRoute || this.route || null;
  }
});

export const Driver = mongoose.models.Driver || mongoose.model("Driver", driverSchema);