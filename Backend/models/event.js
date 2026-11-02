import mongoose from "mongoose";
import sessionScopedPlugin from "../utils/sessionPlugin.js";

const eventSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    /** Academic session this event belongs to (e.g. "2026-27"). */
    academicYear: { type: String, default: "", index: true },
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: ["Competition", "Cultural", "Sports", "Administrative"],
    },
    priority: {
      type: String,
      default: "Normal",
      enum: ["Normal", "High", "Low"],
    },
    organizer: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    time: { type: String, required: true },
    location: { type: String, required: true, trim: true },
    assignClass: { type: String, default: "All Classes" },
    registrationRequired: { type: Boolean, default: false },
    capacity: { type: Number },
    banner: { type: String },
    description: { type: String, required: true },
    attendees: { type: Number, default: 0 },
  },
  { timestamps: true },
);

eventSchema.plugin(sessionScopedPlugin);

export default mongoose.model("Event", eventSchema);
