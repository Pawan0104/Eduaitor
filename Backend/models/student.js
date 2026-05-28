import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
  url: String,
  public_id: String,
  type: String,
});

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

    firstTimeLogin: {
      type: Boolean,
      default: true
    },

    address: String,

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
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School", // or whatever your school model is named
    },

    username: String,
    password: String,
    temp_password: {
      type: String,
    },

  },
  { timestamps: true },
);

// Unique index set for schools
studentSchema.index({ schoolId: 1, studentId: 1 }, { unique: true });
export default mongoose.model("Student", studentSchema);