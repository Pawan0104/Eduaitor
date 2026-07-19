import mongoose from "mongoose";

/** Certificate types that support body generation */
export const CERTIFICATE_TYPES = ["transfer", "character"];

/** All printable document designs schools can customize */
export const DOCUMENT_DESIGN_TYPES = [
  "transfer",
  "character",
  "id_card",
  "report_card",
];

const certificateTemplateSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: DOCUMENT_DESIGN_TYPES,
      required: true,
    },
    title: { type: String, default: "" },
    subtitle: { type: String, default: "" },
    bodyTemplate: { type: String, default: "" },
    footerText: { type: String, default: "" },
    signatoryName: { type: String, default: "Principal" },
    signatoryDesignation: { type: String, default: "Principal" },
    showLogo: { type: Boolean, default: true },
    showBorder: { type: Boolean, default: true },
    borderStyle: {
      type: String,
      enum: ["classic", "modern", "minimal"],
      default: "classic",
    },
    primaryColor: { type: String, default: "#1e3a5f" },
    accentColor: { type: String, default: "#c9a227" },
    backgroundColor: { type: String, default: "#ffffff" },
    borderColor: { type: String, default: "" },
    textColor: { type: String, default: "#0f172a" },
    /** Custom logo override; empty → use school.school_logo */
    logoUrl: { type: String, default: "" },
  },
  { timestamps: true },
);

certificateTemplateSchema.index({ schoolId: 1, type: 1 }, { unique: true });

/** @deprecated use DOCUMENT_DESIGN_TYPES — kept for existing imports */
export const CERTIFICATE_TYPE_LIST = DOCUMENT_DESIGN_TYPES;

export default mongoose.model("CertificateTemplate", certificateTemplateSchema);
