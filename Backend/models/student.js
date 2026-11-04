import mongoose from "mongoose";
import sessionScopedPlugin from "../utils/sessionPlugin.js";

const fileSchema = new mongoose.Schema({
  url: String,
  public_id: String,
  type: String,
});

const extraDocumentSchema = new mongoose.Schema(
  {
    fieldName: String,
    label: String,
    url: String,
    public_id: String,
    type: String,
  },
  { _id: false },
);

const studentSchema = new mongoose.Schema(
  {
    // Optional when confirmationStatus is Non-Confirmed (draft admission).
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    dob: Date,
    gender: String,
    bloodGroup: String,
    nationality: { type: String, default: "" },
    placeOfBirth: { type: String, default: "" },
    caste: { type: String, default: "" },

    // Reservation category + (for Minority) the specific community.
    category: {
      type: String,
      enum: ["General", "OBC", "SC", "ST", "Minority"],
      default: "General",
    },
    community: {
      type: String,
      default: "",
    },

    aadhaarNumber: { type: String, default: "" },
    penNumber: { type: String, default: "" },
    admissionSource: { type: String, default: "" },
    /** Admission confirmation — editable on the form; defaults to Non-Confirmed. */
    confirmationStatus: {
      type: String,
      enum: ["Confirmed", "Non-Confirmed"],
      default: "Non-Confirmed",
    },
    /** Directory visibility — All Students defaults to Active only. */
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isSpecialChild: { type: Boolean, default: false },
    isEws: { type: Boolean, default: false },
    isPhysicallyDisabled: { type: Boolean, default: false },
    medicalConditionRemarks: { type: String, default: "" },

    admissionDate: Date,

    studentId: {
      type: String,
      // Unique per school via compound index below — NOT globally unique
    },

    fatherName: String,
    fatherMobile: String,
    fatherEmail: String,

    motherName: String,
    motherMobile: String,
    motherEmail: String,

    guardianName: String,
    guardianMobile: String,
    guardianRelation: String,

    address: String,

    previousSchoolName: String,
    previousSchoolClass: String,
    previousSchoolResult: String,
    previousSchoolTcNumber: { type: String, default: "" },

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
    },
    streamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stream",
      default: null,
    },
    stream: {
      type: String,
      default: "",
    },
    /** Elective / optional subjects chosen at admission (stream compulsory are implied). */
    optionalSubjectIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Subject",
        },
      ],
      default: [],
    },
    rollNo: String,
    studentType: String,

    /**
     * Fee structure batch — New vs continuing (Old) students can have
     * different fee components configured by school admin.
     */
    feeBatch: {
      type: String,
      enum: ["New", "Old"],
      default: "New",
    },

    transport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TransportRoute",
      default: null,
    },

    houseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "House",
      default: null,
    },

    /** Set when student is admitted — ID card becomes available for download */
    idCardIssuedAt: {
      type: Date,
      default: null,
    },
    selectedOptionalFees: {
      type: [String],
      default: [],
    },
    busFeeFrequency: {
      type: String,
      default: "annually",
    },
    busFeeQuarter: {
      type: String,
      default: "",
    },

    totalFee: Number,
    discountType: String,
    discountValue: Number,
    finalFee: Number,
    totalPaid: Number,
    totalDue: Number,
    feeFrequency: String,

    documents: {
      studentPhoto: fileSchema,
      fatherPhoto: fileSchema,
      motherPhoto: fileSchema,
      guardianPhoto: fileSchema,

      birthCertificate: fileSchema,
      transferCertificate: fileSchema,

      studentAadhar: fileSchema,
      fatherAadhar: fileSchema,
      motherAadhar: fileSchema,
    },
    extraDocuments: {
      type: [extraDocumentSchema],
      default: [],
    },
    /**
     * Values for fields the school admin added through the admission form
     * builder. `key` matches the field key in the AdmissionForm config.
     */
    customFields: {
      type: [
        new mongoose.Schema(
          {
            key: { type: String, required: true },
            label: { type: String, default: "" },
            type: { type: String, default: "text" },
            value: { type: String, default: "" },
            file: fileSchema,
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School", // or whatever your school model is named
    },

    /** Academic session this admission belongs to (e.g. "2026-27"). */
    academicYear: { type: String, default: "", index: true },

    /** Set when the student was admitted from a Registration record. */
    convertedFromRegistrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Registration",
      default: null,
    },

    /** Lead this student was admitted from (Lead Management → admission) */
    convertedFromLeadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
    },

    studentCredentials: {
      username: { type: String }, // STU0001
      password: { type: String },
      temp_password: { type: String },
      firstTimeLogin: { type: Boolean, default: true },
    },
    parentCredentials: {
      
      username: { type: String }, // fatherMobile
      password: { type: String },
      temp_password: { type: String },
      firstTimeLogin: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

// Unique index set for schools
studentSchema.index({ schoolId: 1, studentId: 1 }, { unique: true });
studentSchema.index({ schoolId: 1, houseId: 1 });
studentSchema.index(
  { schoolId: 1, "studentCredentials.username": 1 },
  { unique: true, sparse: true },
);
// Non-unique: siblings may share the same father mobile / parent login
studentSchema.index(
  { schoolId: 1, "parentCredentials.username": 1 },
  { sparse: true },
);
studentSchema.index(
  { schoolId: 1, convertedFromLeadId: 1 },
  { unique: true, sparse: true },
);
studentSchema.index(
  { schoolId: 1, convertedFromRegistrationId: 1 },
  { unique: true, sparse: true },
);
studentSchema.plugin(sessionScopedPlugin);

export default mongoose.model("Student", studentSchema);