import mongoose from "mongoose";

const gatepassSchema = new mongoose.Schema(
  {
    // ── SCHOOL + STUDENT ─────────────────────────
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    // who made the request — parent's _id from JWT
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    // ── PICKUP PERSON ────────────────────────────
    pickupPerson: {
      name:           { type: String, required: true },
      relation:       {
        type: String,
        enum: ["Father", "Mother", "Guardian", "Other"],
        required: true,
      },
      customRelation: { type: String, default: null }, // if relation = Other
      mobile:         { type: String, required: true },
    },

    // ── GATEPASS DETAILS ─────────────────────────
    exitDate:       { type: Date,   required: true },
    exitTime:       { type: String, required: true }, // "14:30"
    expectedReturn: { type: String, default: null  }, // "17:00" optional

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    // ── PHOTO — optional ─────────────────────────
    photo: {
      type: new mongoose.Schema(
        {
          url:       { type: String },
          public_id: { type: String },
          type:      { type: String },
        },
        { _id: false },
      ),
      default: null,
    },

    // ── STATUS ───────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },

    // ── ACTION — teacher or admin ─────────────────
    actionBy:     { type: mongoose.Schema.Types.ObjectId, default: null }, // Teacher or Staff _id
    actionByName: { type: String, default: null  }, // stored directly — no populate needed
    actionByRole: { type: String, default: null  }, // "teacher_admin" | "staff_admin" | "school_admin"
    actionNote:   { type: String, default: null  }, // rejection reason
    actionAt:     { type: Date,   default: null  },

    // ── CANCEL ────────────────────────────────────
    cancelledAt:  { type: Date,   default: null  },
  },
  { timestamps: true },
);

// fetch all gatepasses for a school sorted by latest
gatepassSchema.index({ schoolId: 1, createdAt: -1 });

// fetch parent's own gatepasses
gatepassSchema.index({ studentId: 1, createdAt: -1 });

export default mongoose.model("GatePass", gatepassSchema);