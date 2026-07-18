import mongoose from "mongoose";

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
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dob: Date,
    gender: String,
    bloodGroup: String,
    admissionDate: Date,

    studentId: {
      type: String,
      unique: true,
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

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
    },
    rollNo: String,
    studentType: String,

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
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School", // or whatever your school model is named
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
studentSchema.index(
  { schoolId: 1, "parentCredentials.username": 1 },
  { unique: true, sparse: true },
);
export default mongoose.model("Student", studentSchema);