import mongoose from "mongoose";

/* ───────────────── STOP (Module 2) ───────────────── */

const stopSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },

    stopId: String,
    stopCode: { type: String, default: "", trim: true, uppercase: true },

    stopName: { type: String, required: true, trim: true },

    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    address: { type: String, default: "" },

    geoFenceRadius: { type: Number, default: 100 }, // metres
    pickupTime: { type: String, default: "" },
    dropTime: { type: String, default: "" },

    maxStudents: { type: Number, default: 0 },
    currentStudents: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true },
);

/* 2dsphere index for geo-fence / radius queries */
stopSchema.index({ schoolId: 1, point: "2dsphere" }, { sparse: true });
stopSchema.index({ schoolId: 1 });
stopSchema.index({ schoolId: 1, stopCode: 1 }, { unique: true, sparse: true });

/* AUTO STOP ID (NO COUNTER) */
stopSchema.pre("save", function () {
  if (!this.stopId) {
    const shortId = this._id.toString().slice(-4).toUpperCase();
    this.stopId = `STP-${shortId}`;
  }
  if (!this.stopCode) this.stopCode = this.stopId || "";
});

export const TransportStop =
  mongoose.models.TransportStop || mongoose.model("TransportStop", stopSchema);