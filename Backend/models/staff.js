import mongoose from "mongoose";

const staffSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
    },

    dob: {
      type: Date,
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },

    address: {
      type: String,
    },

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

    // ── STAFF SPECIFIC ────────────────────────────
    staffRole: {
      type: String,
      enum: [
        "principal",
        "administrator",
        "librarian",
        "teacher",
        "accountant",
        "receptionist",
        "counselor",
        "other",
      ],
      required: true,
    },

    staffRoleCustom: {
      type: String, // filled only when staffRole === "other"
      default: null,
    },

    staffId: {
      type: String,
      required: true,
    },

    joiningDate: {
      type: Date,
    },

    employmentType: {
      type: String,
      enum: ["Full-Time", "Part-Time", "Contract"],
      default: "Full-Time",
    },

    salary: {
      type: Number,
    },

    // ── PERMISSIONS ───────────────────────────────
    // which modules this staff member can access
    // assigned by school_admin or administrator
    permissions: {
      type: [String],
      default: [],
    },

    isAdminGroup: {
      type: Boolean,
      default: false,
    },

    // ── AUTH ──────────────────────────────────────
    username: {
      type: String,
    },

    password: {
      type: String,
    },

    temp_password: {
      type: String,
    },

    firstTimeLogin: {
      type: Boolean,
      default: true,
    },

    // ── SCHOOL ───────────────────────────────────
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },

    // ── STATUS ───────────────────────────────────
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    /** Set when staff is registered — ID card becomes available for download */
    idCardIssuedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// unique staffId per school — same pattern as teacher
staffSchema.index({ schoolId: 1, staffId: 1 }, { unique: true });

// unique email per school
staffSchema.index({ schoolId: 1, email: 1 }, { unique: true });

const Staff = mongoose.models.Staff || mongoose.model("Staff", staffSchema);

export default Staff;