import mongoose from "mongoose";

/**
 * Admission funnel step between a Lead and a Student.
 *
 * A registration captures the applicant's details and the class they are
 * applying for. If an entrance exam is scheduled for that class the
 * registration is linked to it and can only be admitted once it passes.
 *
 * Registrations are intentionally NOT session-scoped: they belong to the
 * session they are applying for (`academicYear`), which is not always the
 * session an admin is currently viewing.
 */
const entranceResultSchema = new mongoose.Schema(
  {
    examName: { type: String, default: "" },
    examDate: { type: Date, default: null },
    startTime: { type: String, default: "" },
    endTime: { type: String, default: "" },
    venue: { type: String, default: "" },
    totalMarks: { type: Number, default: 0 },
    passingMarks: { type: Number, default: 0 },
    obtainedMarks: { type: Number, default: null },
    result: {
      type: String,
      enum: ["pending", "pass", "fail", "absent"],
      default: "pending",
    },
    remarks: { type: String, default: "" },
    updatedAt: { type: Date, default: null },
  },
  { _id: false },
);

const registrationSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    registrationNumber: { type: String, trim: true },
    /** Session the applicant is applying for, e.g. "2026-27". */
    academicYear: { type: String, default: "" },

    studentName: { type: String, required: true, trim: true },
    dob: { type: Date, default: null },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other", ""],
      default: "",
    },
    bloodGroup: { type: String, default: "" },

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    className: { type: String, default: "" },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      default: null,
    },
    sectionName: { type: String, default: "" },
    streamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stream",
      default: null,
    },
    stream: { type: String, default: "" },

    parentName: { type: String, required: true, trim: true },
    parentMobile: { type: String, required: true, trim: true },
    parentEmail: { type: String, default: "", trim: true },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    pincode: { type: String, default: "" },
    previousSchoolName: { type: String, default: "" },
    notes: { type: String, default: "" },

    source: {
      type: String,
      enum: ["erp", "public", "lead"],
      default: "erp",
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
    },

    entranceExamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EntranceExam",
      default: null,
    },
    entrance: { type: entranceResultSchema, default: () => ({}) },

    status: {
      type: String,
      enum: [
        "registered",
        "exam_scheduled",
        "passed",
        "failed",
        "admitted",
        "cancelled",
      ],
      default: "registered",
      index: true,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },
    admittedAt: { type: Date, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    /** Display name of who created the registration (or "Website" for public). */
    createdByName: {
      type: String,
      default: "",
      trim: true,
    },
    followUps: {
      type: [
        new mongoose.Schema(
          {
            comment: { type: String, required: true, trim: true },
            addedBy: {
              userId: { type: mongoose.Schema.Types.Mixed, required: true },
              name: { type: String, default: "" },
              role: { type: String, default: "" },
            },
            createdAt: { type: Date, default: Date.now },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    /** Values for fields the school admin added via Registration Form Builder. */
    customFields: {
      type: [
        new mongoose.Schema(
          {
            key: { type: String, required: true },
            label: { type: String, default: "" },
            type: { type: String, default: "text" },
            value: { type: String, default: "" },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  { timestamps: true },
);

registrationSchema.index(
  { schoolId: 1, registrationNumber: 1 },
  { unique: true, sparse: true },
);
registrationSchema.index({ schoolId: 1, classId: 1, status: 1 });
registrationSchema.index({ schoolId: 1, createdAt: -1 });
registrationSchema.index({ schoolId: 1, parentMobile: 1 });
registrationSchema.index({ schoolId: 1, entranceExamId: 1 });

export default mongoose.models.Registration ||
  mongoose.model("Registration", registrationSchema);
