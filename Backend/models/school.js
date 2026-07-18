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
    },

    admin_email: {
      type: String,
      required: true,
      unique: true,
    },

    admin_password: {
      type: String,
      required: true,
    },
    
    temp_password: {
      type: String,
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
  },
  { timestamps: true },
);

export default mongoose.model("School", schoolSchema);
