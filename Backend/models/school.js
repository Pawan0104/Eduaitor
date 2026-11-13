import mongoose from "mongoose";
import { MODULE_KEYS } from "../constants/module.js";
const schoolSchema = new mongoose.Schema(
  {
    school_name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    subscription_plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
    },

    start_date: {
      type: Date,
    },

    end_date: {
      type: Date,
    },

    address: {
      type: String,
    },

    // School campus GPS — used for bus arrive/depart geofence alerts
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
    geofenceRadiusM: {
      type: Number,
      default: 250,
    },

    contact_email: {
      type: String,
    },

    contact_phone: {
      type: String,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    admin_name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    admin_email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    admin_password: {
      type: String,
      required: true,
    },
    
    temp_password: {
      type: String,
    },

    firstTimeLogin: {
      type: Boolean,
      default: true,
    },

    school_logo: {
      type: String,
      default: null,
    },

    subscribed_modules: {
      type: [String],
      enum: MODULE_KEYS,  
      default: [],
    },

    razorpayKeyId: {
      type: String,
      default: "",
    },

    razorpayKeySecret: {
      type: String,
      default: "",
    },

    /**
     * Set by the super admin. When false, this school does not use entrance
     * exams: registrations skip exam linking, admissions are not gated on
     * exam results, and the Registration page stays in follow-up mode.
     */
    entranceExamEnabled: {
      type: Boolean,
      default: true,
    },

    /**
     * Public admission registration form. `token` is the unguessable slug used
     * by the shareable link (/register/<token>); it is created lazily when an
     * admin opens the Registration page.
     */
    registrationForm: {
      publicEnabled: { type: Boolean, default: false },
      token: { type: String, default: "" },
      instructions: { type: String, default: "" },
      /** Empty = every active class is open for registration. */
      openClassIds: [
        { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
      ],
    },
  },
  { timestamps: true },
);

schoolSchema.index(
  { "registrationForm.token": 1 },
  { unique: true, sparse: true },
);

export default mongoose.model("School", schoolSchema);
