import mongoose from "mongoose";

/* ───────────────── ACTIVITY (log) ───────────────── */

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

export const Activity =
  mongoose.models.Activity || mongoose.model("Activity", activitySchema);