import mongoose from "mongoose";

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
  },
  { timestamps: true },
);

export default mongoose.model("School", schoolSchema);
