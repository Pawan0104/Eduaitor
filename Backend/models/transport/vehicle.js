import mongoose from "mongoose";
import { fileDocSchema } from "./urlSchemas.js";

/* ───────────────── VEHICLE / BUS (Module 3) ───────────────── */

const vehicleDocSchema = new mongoose.Schema(
  {
    number: { type: String, default: "" },
    expiry: { type: Date, default: null },
    file: { type: fileDocSchema, default: () => ({}) },
    alerted: { type: Boolean, default: false },
  },
  { _id: false },
);

const busSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },

    /* identity */
    busId: { type: String, required: true, trim: true, uppercase: true },
    vehicleId: { type: String, default: "", trim: true, uppercase: true },
    regNo: { type: String, required: true, trim: true },
    registrationNumber: { type: String, default: "", trim: true, uppercase: true },
    vehicleType: {
      type: String,
      enum: ["Bus", "MiniBus", "Van", "Car"],
      default: "Bus",
    },
    make: { type: String, default: "", trim: true },
    model: { type: String, trim: true },
    fuelType: {
      type: String,
      enum: ["Diesel", "Petrol", "CNG", "Electric"],
      default: "Diesel",
    },
    capacity: Number,
    ownershipType: {
      type: String,
      enum: ["Owned", "Contracted", "Vendor"],
      default: "Owned",
    },

    /* assignment */
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", default: null },
    route: { type: mongoose.Schema.Types.ObjectId, ref: "TransportRoute", default: null },

    status: {
      type: String,
      enum: ["Active", "Maintenance", "Inactive"],
      default: "Active",
    },
    nextService: { type: Date, default: null },
    currentOdometer: { type: Number, default: 0 },

    /* devices */
    gpsEnabled: { type: Boolean, default: false },
    gpsDeviceId: { type: String, trim: true, default: "" },
    cctvDeviceId: { type: String, trim: true, default: "" },
    panicButton: { type: Boolean, default: false },
    speedGovernor: {
      installed: { type: Boolean, default: false },
      limitKmh: { type: Number, default: 60 },
    },

    /* legal documents */
    documents: {
      rc: { type: vehicleDocSchema, default: () => ({}) },
      insurance: { type: vehicleDocSchema, default: () => ({}) },
      fitness: { type: vehicleDocSchema, default: () => ({}) },
      permit: { type: vehicleDocSchema, default: () => ({}) },
      puc: { type: vehicleDocSchema, default: () => ({}) },
      roadTax: { type: vehicleDocSchema, default: () => ({}) },
    },

    /* ── GPS TRACKING ── */
    lastLatitude: { type: Number, default: null },
    lastLongitude: { type: Number, default: null },
    lastGpsAt: { type: Date, default: null },
    gpsSpeedKmh: { type: Number, default: null },

    /* ── Daily trip notifications (pickup → school → home) ── */
    tripDate: { type: String, default: "" },
    tripEvents: {
      pickup: { at: { type: Date, default: null }, notified: { type: Boolean, default: false } },
      arriveSchool: { at: { type: Date, default: null }, notified: { type: Boolean, default: false } },
      departSchool: { at: { type: Date, default: null }, notified: { type: Boolean, default: false } },
      arriveHome: { at: { type: Date, default: null }, notified: { type: Boolean, default: false } },
    },
    insideSchoolGeofence: { type: Boolean, default: false },
  },
  { timestamps: true },
);

busSchema.index(
  { schoolId: 1, driver: 1 },
  { unique: true, partialFilterExpression: { driver: { $type: "objectId" } } },
);
busSchema.index(
  { schoolId: 1, route: 1 },
  { unique: true, partialFilterExpression: { route: { $type: "objectId" } } },
);
busSchema.index(
  { schoolId: 1, busId: 1 },
  { unique: true },
);

/* AUTO BUS ID (NO COUNTER) */
busSchema.pre("save", function () {
  if (!this.vehicleId) this.vehicleId = this.busId || "";
  if (!this.registrationNumber) this.registrationNumber = this.regNo || "";
});

export const Bus = mongoose.models.Bus || mongoose.model("Bus", busSchema);
/** alias for the Vehicle entity (same collection) */
export const Vehicle = Bus;