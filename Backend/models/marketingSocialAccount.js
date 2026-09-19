import mongoose from "mongoose";

const CHANNELS = ["facebook", "instagram", "linkedin", "whatsapp"];

const marketingSocialAccountSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    channel: { type: String, enum: CHANNELS, required: true },
    name: { type: String, trim: true },
    /** "oauth" = connected via the OAuth flow, "dev" = paste an access token. */
    mode: { type: String, enum: ["oauth", "dev"], default: "dev" },
    status: {
      type: String,
      enum: ["active", "expired", "revoked"],
      default: "active",
    },
    accountMeta: { type: mongoose.Schema.Types.Mixed, default: {} },
    /** Encrypted provider token (AES-256-GCM box from utils/cryptoVault). */
    tokenBox: { type: mongoose.Schema.Types.Mixed, default: null },
    refreshTokenBox: { type: mongoose.Schema.Types.Mixed, default: null },
    expiresAt: { type: Date },
    connectedBy: { type: String },
    connectedAt: { type: Date, default: Date.now },
    lastTestedAt: { type: Date },
    lastError: { type: String },
  },
  { timestamps: true },
);

marketingSocialAccountSchema.index({ schoolId: 1, channel: 1 });

export default mongoose.model(
  "MarketingSocialAccount",
  marketingSocialAccountSchema,
);