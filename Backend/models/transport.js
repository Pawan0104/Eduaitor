import mongoose from "mongoose";

/* ───────────────── DRIVER ───────────────── */

const driverSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },

    driverId: String,

    name: { type: String, required: true, trim: true },

    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^[0-9]{10}$/, "Invalid phone number"],
    },

    license: { type: String, default: "" },
    licenseExpiry: { type: Date, default: null },

    bus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      default: null,
    },

    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TransportRoute",
      default: null,
    },

    experience: { type: String, default: "" },

    status: {
      type: String,
      enum: ["Active", "On Leave", "Inactive"],
      default: "Active",
    },

    photo: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
      type: { type: String, default: "" },
    },
  },
  { timestamps: true },
);

driverSchema.index({ schoolId: 1 });
driverSchema.index({ schoolId: 1, phone: 1 }, { unique: true });

/* 🔥 AUTO DRIVER ID (NO COUNTER) */
driverSchema.pre("save", function (next) {
  if (!this.driverId) {
    const shortId = this._id.toString().slice(-4).toUpperCase();
    this.driverId = `DRV-${shortId}`;
  }
});

/* ───────────────── BUS ───────────────── */

const busSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },

    busId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    regNo: { type: String, required: true, trim: true },

    model: { type: String, trim: true },
    capacity: Number,

    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },

    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TransportRoute",
      default: null,
    },

    status: {
      type: String,
      enum: ["Active", "Maintenance", "Inactive"],
      default: "Active",
    },

    nextService: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

busSchema.index({ driver: 1 }, { unique: true, sparse: true });
busSchema.index({ route: 1 }, { unique: true, sparse: true });

busSchema.index({ schoolId: 1, busId: 1 }, { unique: true });

/* ───────────────── ROUTE ───────────────── */

const routeSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },

    routeId: String,

    name: { type: String, required: true, trim: true },

    bus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      default: null,
    },

    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },

    stops: Number,
    students: Number,

    startTime: String,
    endTime: String,

    stopsList: [String],

    status: {
      type: String,
      enum: ["Active", "Suspended"],
      default: "Active",
    },
  },
  { timestamps: true },
);

routeSchema.index({ schoolId: 1 });

/* 🔥 AUTO ROUTE ID (NO COUNTER) */
routeSchema.pre("save", function (next) {
  if (!this.routeId) {
    const shortId = this._id.toString().slice(-3).toUpperCase();
    this.routeId = `RT-${shortId}`;
  }
});

/* ───────────────── ACTIVITY ───────────────── */

const activitySchema = new mongoose.Schema(
  {
    schoolId: mongoose.Schema.Types.ObjectId,

    bus: { type: mongoose.Schema.Types.ObjectId, ref: "Bus" },
    route: { type: mongoose.Schema.Types.ObjectId, ref: "TransportRoute" },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" },

    status: String,
    time: String,
    date: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

activitySchema.index({ schoolId: 1, date: -1 });

/* ───────────────── SAFE EXPORTS (NO OVERWRITE ERROR) ───────────────── */

export const Driver =
  mongoose.models.Driver || mongoose.model("Driver", driverSchema);

export const Bus = mongoose.models.Bus || mongoose.model("Bus", busSchema);

export const TransportRoute =
  mongoose.models.TransportRoute ||
  mongoose.model("TransportRoute", routeSchema);

export const Activity =
  mongoose.models.Activity || mongoose.model("Activity", activitySchema);
