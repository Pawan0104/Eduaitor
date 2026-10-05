import mongoose from "mongoose";

delete mongoose.models.Teacher;

const teacherSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    dob: Date,
    gender: String,
    phone: String,
    email: String,
    address: String,
    governmentId: String,

    photo: {
      type: new mongoose.Schema(
        {
          url: String,
          public_id: String,
          type: String,
        },
        { _id: false },
      ),
      default: null,
    },

    qualification: String,
    experience: Number,
    subjects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
      },
    ],
    department: String,

    teacherId: {
      type: String,
      required: true,
    },

    designation: String,
    joiningDate: Date,
    employmentType: String,
    salary: Number,

    assignedClasses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class",
      },
    ],

    isAdminGroup: {
      type: Boolean,
      default: false,
    },

    /** School-level access role — same system as Staff */
    customRoleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SchoolStaffRole",
      default: null,
    },

    permissions: {
      type: [String],
      default: [],
    },

    /**
     * Set when this teacher also acts as a hostel warden.
     * Warden duties are authorised through the "hostel" module permission,
     * so this flag only records the extra responsibility.
     */
    isHostelWarden: {
      type: Boolean,
      default: false,
    },

    role: {
      type: String,
      default: "teacher_admin",
    },
    username: String,
    password: String,

    rating: {
      type: Number,
      default: 4,
    },

    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },

    status: {
      type: String,
      default: "Present",
    },

    temp_password: {
      type: String,
    },

    firstTimeLogin: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// unique index scoped to school
teacherSchema.index({ schoolId: 1, teacherId: 1 }, { unique: true });

const Teacher =
  mongoose.models.Teacher || mongoose.model("Teacher", teacherSchema);

export default Teacher;
