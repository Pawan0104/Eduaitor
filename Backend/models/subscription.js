import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    price: {
      type: Number,
      default: 0
    },

    currency: {
      type: String,
      enum: ["INR", "USD"],
      default: "INR"
    },

    billing_cycle: {
      type: String,
      enum: ["monthly", "quarterly", "yearly"],
      required: true
    },

    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role"
      }
    ],

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active"
    }

  },
  { timestamps: true }
);

export default mongoose.model("Subscription", subscriptionSchema);