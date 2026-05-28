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
  },
  { timestamps: true },
);

// unique index scoped to school
teacherSchema.index({ schoolId: 1, teacherId: 1 }, { unique: true });

const Teacher =
  mongoose.models.Teacher || mongoose.model("Teacher", teacherSchema);

export default Teacher;
