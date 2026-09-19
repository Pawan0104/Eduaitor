import mongoose from "mongoose";

/* ───────────────── ROUTE (Module 1) ───────────────── */

const stopSequenceSchema = new mongoose.Schema(
  {
    stop: { type: mongoose.Schema.Types.ObjectId, ref: "TransportStop" },
    sequence: { type: Number, default: 0 },
    pickupTime: { type: String, default: "" },
    dropTime: { type: String, default: "" },
  },
  { _id: false },
);

const routeSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },

    /* identity */
    routeId: String,
    routeCode: { type: String, default: "", trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    routeName: { type: String, default: "", trim: true },

    routeType: {
      type: String,
      enum: ["Pickup", "Drop", "PickupDrop"],
      default: "PickupDrop",
    },
    campus: { type: String, default: "" },
    direction: {
      type: String,
      enum: ["Outbound", "Inbound", "Bidirectional"],
      default: "Bidirectional",
    },

    /* geography */
    startLocation: { type: String, default: "" },
    endLocation: { type: String, default: "" },
    totalDistanceKm: { type: Number, default: 0 },
    estimatedDurationMins: { type: Number, default: 0 },
    operatingDays: {
      type: [String],
      enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      default: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    },

    /* assignment (backward-compatible aliases) */
    bus: { type: mongoose.Schema.Types.ObjectId, ref: "Bus", default: null },
    primaryVehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Bus", default: null },
    backupVehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Bus", default: null },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", default: null },
    primaryDriver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", default: null },
    backupDriver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", default: null },
    attendant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attendant",
      default: null,
    },

    /* capacity */
    routeCapacity: { type: Number, default: 0 },
    occupancy: { type: Number, default: 0 },
    feeCategory: { type: String, default: "" },

    /* legacy counters */
    stops: Number,
    students: Number,
    startTime: String,
    endTime: String,
    stopsList: [String],

    /* structured stop mapping (Module 2) */
    stopSequences: { type: [stopSequenceSchema], default: [] },

    status: {
      type: String,
      enum: ["Active", "Suspended"],
      default: "Active",
    },
    routeStatus: {
      type: String,
      enum: ["Active", "Suspended", "Archived"],
      default: "Active",
    },
  },
  { timestamps: true },
);

routeSchema.index({ schoolId: 1 });
routeSchema.index({ schoolId: 1, campus: 1 });

/* AUTO ROUTE ID (NO COUNTER) */
routeSchema.pre("save", function () {
  if (!this.routeId) {
    const shortId = this._id.toString().slice(-3).toUpperCase();
    this.routeId = `RT-${shortId}`;
  }
  if (!this.routeName) this.routeName = this.name || "";
  if (!this.routeCode) this.routeCode = this.routeId || "";
  if (!this.primaryVehicle) this.primaryVehicle = this.bus || null;
  if (!this.primaryDriver) this.primaryDriver = this.driver || null;
  if (!this.routeStatus) this.routeStatus = this.status || "Active";
});

export const TransportRoute =
  mongoose.models.TransportRoute || mongoose.model("TransportRoute", routeSchema);