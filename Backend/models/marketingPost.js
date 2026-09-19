import mongoose from "mongoose";

export const POST_STATUSES = [
  "DRAFT",
  "PENDING",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHING",
  "PUBLISHED",
  "REJECTED",
  "FAILED",
  "RETRY_EXHAUSTED",
];

const POST_CHANNELS = ["facebook", "instagram", "linkedin", "whatsapp", "blog"];

const versionSchema = new mongoose.Schema(
  {
    text: { type: String, default: "" },
    hashtags: [{ type: String }],
    cta: { type: String, default: "" },
    media: [
      {
        url: { type: String, default: "" },
        cloudinaryId: { type: String, default: "" },
        alt: { type: String, default: "" },
      },
    ],
    editedBy: { type: String },
    editedAt: { type: Date },
    editReason: { type: String },
  },
  { _id: true },
);

/**
 * Not-yet-published? One document per piece of content; the document becomes
 * the published record too (metrics snapshot lands on it). No post can reach
 * PUBLISHED without workflow.approvedBy + approvedAt (enforced in services).
 */
const marketingPostSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    channel: { type: String, enum: POST_CHANNELS, required: true },
    title: { type: String, default: "" },
    status: { type: String, enum: POST_STATUSES, default: "DRAFT" },
    source: {
      trigger: { type: String, default: "manual" },
      entityType: { type: String, default: "" },
      entityId: { type: String, default: "" },
      entitySummary: { type: String, default: "" },
    },
    versions: { type: [versionSchema], default: [] },
    currentVersion: { type: Number, default: 0 },
    workflow: {
      submittedBy: { type: String },
      submittedAt: { type: Date },
      approvedBy: { type: String },
      approvedAt: { type: Date },
      rejectedBy: { type: String },
      rejectedAt: { type: Date },
      rejectedReason: { type: String },
      publishedBy: { type: String },
      publishedAt: { type: Date },
      scheduledBy: { type: String },
    },
    schedule: {
      scheduledAt: { type: Date },
      /** IANA timezone of the school, e.g. Asia/Kolkata. */
      timezone: { type: String, default: "Asia/Kolkata" },
      publishedNow: { type: Boolean, default: false },
    },
    publish: {
      providerMessageIds: { type: mongoose.Schema.Types.Mixed, default: {} },
      permalink: { type: String, default: "" },
      attempts: { type: Number, default: 0 },
      lastError: { type: String },
      nextRetryAt: { type: Date },
    },
    metricsSnapshot: {
      reach: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      capturedAt: { type: Date },
    },
    dedupeKey: { type: String, sparse: true, unique: true },
  },
  { timestamps: true },
);

marketingPostSchema.index({ schoolId: 1, status: 1 });
marketingPostSchema.index({ schoolId: 1, channel: 1, status: 1, createdAt: -1 });

export default mongoose.model("MarketingPost", marketingPostSchema);