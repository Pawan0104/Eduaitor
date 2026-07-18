import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { resolveSrv, resolveTxt } from "dns/promises";
import { URL } from "url";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import School from "../models/school.js";
import Class from "../models/class.js";
import Section from "../models/section.js";
import Student from "../models/student.js";
import Teacher from "../models/teacher.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const hashPassword = (password) => bcrypt.hash(password, 10);

const expandSrvUri = async (uri) => {
  const parsed = new URL(uri);
  const srvRecords = await resolveSrv(`_mongodb._tcp.${parsed.hostname}`);
  const txtRecords = await resolveTxt(parsed.hostname);
  const hosts = srvRecords.map((r) => `${r.name}:${r.port}`).join(",");
  const params = new URLSearchParams(parsed.search);

  for (const txtEntry of txtRecords.flat()) {
    for (const pair of txtEntry.split("&")) {
      const i = pair.indexOf("=");
      if (i > 0 && !params.has(pair.slice(0, i))) {
        params.set(pair.slice(0, i), pair.slice(i + 1));
      }
    }
  }

  const auth = `${encodeURIComponent(parsed.username)}:${encodeURIComponent(parsed.password)}@`;
  const db = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : "";
  const query = params.toString();
  return `mongodb://${auth}${hosts}${db}${query ? `?${query}` : ""}`;
};

const connectMongo = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI missing");

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 20000,
      tlsAllowInvalidHostnames: true,
    });
  } catch (err) {
    const expanded = await expandSrvUri(uri);
    await mongoose.connect(expanded, {
      serverSelectionTimeoutMS: 20000,
      tlsAllowInvalidHostnames: true,
    });
    console.warn("Connected via expanded SRV URI after:", err.message);
  }

  console.log("MongoDB connected");
};

const STUDENTS = [
  {
    firstName: "Aarav",
    lastName: "Sharma",
    gender: "Male",
    bloodGroup: "B+",
    dob: "2015-04-12",
    admissionDate: "2024-04-01",
    fatherName: "Rohit Sharma",
    fatherMobile: "9876543210",
    fatherEmail: "rohit.sharma@example.com",
    motherName: "Neha Sharma",
    motherMobile: "9876543211",
    motherEmail: "neha.sharma@example.com",
    address: "12 MG Road, Indore",
    rollNo: "1",
    studentType: "Day Scholar",
    password: "#aarav@12345",
  },
  {
    firstName: "Ananya",
    lastName: "Verma",
    gender: "Female",
    bloodGroup: "A+",
    dob: "2015-08-21",
    admissionDate: "2024-04-01",
    fatherName: "Vikram Verma",
    fatherMobile: "9876543212",
    fatherEmail: "vikram.verma@example.com",
    motherName: "Pooja Verma",
    motherMobile: "9876543213",
    motherEmail: "pooja.verma@example.com",
    address: "45 Palasia Square, Indore",
    rollNo: "2",
    studentType: "Day Scholar",
    password: "#ananya@12345",
  },
  {
    firstName: "Kabir",
    lastName: "Mehta",
    gender: "Male",
    bloodGroup: "O+",
    dob: "2014-11-03",
    admissionDate: "2024-04-01",
    fatherName: "Amit Mehta",
    fatherMobile: "9876543214",
    fatherEmail: "amit.mehta@example.com",
    motherName: "Ritu Mehta",
    motherMobile: "9876543215",
    motherEmail: "ritu.mehta@example.com",
    address: "78 Vijay Nagar, Indore",
    rollNo: "1",
    studentType: "Day Boarder",
    password: "#kabir@12345",
  },
  {
    firstName: "Myra",
    lastName: "Singh",
    gender: "Female",
    bloodGroup: "AB+",
    dob: "2014-02-17",
    admissionDate: "2024-04-01",
    fatherName: "Suresh Singh",
    fatherMobile: "9876543216",
    fatherEmail: "suresh.singh@example.com",
    motherName: "Kavita Singh",
    motherMobile: "9876543217",
    motherEmail: "kavita.singh@example.com",
    address: "9 Saket, Indore",
    rollNo: "2",
    studentType: "Day Scholar",
    password: "#myra@12345",
  },
  {
    firstName: "Disha",
    lastName: "Patni",
    gender: "Female",
    bloodGroup: "O+",
    dob: "2015-01-15",
    admissionDate: "2024-04-01",
    fatherName: "Rajesh Patni",
    fatherMobile: "9876543200",
    fatherEmail: "rajesh.patni@example.com",
    motherName: "Sunita Patni",
    motherMobile: "9876543201",
    motherEmail: "sunita.patni@example.com",
    address: "3 New Palasia, Indore",
    rollNo: "3",
    studentType: "Day Scholar",
    password: "#disha@patni123",
    keepUsername: "student@admin.com",
  },
];

const ensureClassSetup = async (schoolId) => {
  const teacher = await Teacher.findOne({ schoolId });

  const sectionA = await Section.findOneAndUpdate(
    { schoolId, name: "A" },
    { $set: { status: "Active" } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const sectionB = await Section.findOneAndUpdate(
    { schoolId, name: "B" },
    { $set: { status: "Active" } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const class1 = await Class.findOneAndUpdate(
    { schoolId, name: "Grade 1" },
    {
      $set: {
        status: "Active",
        details: [
          {
            sectionId: sectionA._id,
            roomNumber: "101",
            teacherId: teacher?._id || null,
            capacity: 40,
            studentCount: 0,
            subjectTeachers: [],
          },
        ],
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const class2 = await Class.findOneAndUpdate(
    { schoolId, name: "Grade 5" },
    {
      $set: {
        status: "Active",
        details: [
          {
            sectionId: sectionB._id,
            roomNumber: "201",
            teacherId: teacher?._id || null,
            capacity: 40,
            studentCount: 0,
            subjectTeachers: [],
          },
        ],
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return [
    { classDoc: class1, sectionId: sectionA._id },
    { classDoc: class1, sectionId: sectionA._id },
    { classDoc: class2, sectionId: sectionB._id },
    { classDoc: class2, sectionId: sectionB._id },
    { classDoc: class1, sectionId: sectionA._id },
  ];
};

const nextStudentId = async (schoolId) => {
  const count = await Student.countDocuments({ schoolId });
  return `STU${String(count + 1).padStart(4, "0")}`;
};

const upsertStudent = async (schoolId, data, classInfo) => {
  const hashed = await hashPassword(data.password);
  const classId = classInfo.classDoc._id;
  const sectionId = classInfo.sectionId;

  const existing =
    (data.keepUsername &&
      (await Student.findOne({
        schoolId,
        "studentCredentials.username": data.keepUsername,
      }))) ||
    (await Student.findOne({
      schoolId,
      firstName: data.firstName,
      lastName: data.lastName,
      fatherMobile: data.fatherMobile,
    }));

  const payload = {
    firstName: data.firstName,
    lastName: data.lastName,
    gender: data.gender,
    bloodGroup: data.bloodGroup,
    dob: new Date(data.dob),
    admissionDate: new Date(data.admissionDate),
    fatherName: data.fatherName,
    fatherMobile: data.fatherMobile,
    fatherEmail: data.fatherEmail,
    motherName: data.motherName,
    motherMobile: data.motherMobile,
    motherEmail: data.motherEmail,
    address: data.address,
    classId,
    sectionId,
    rollNo: data.rollNo,
    studentType: data.studentType,
    selectedOptionalFees: [],
    busFeeFrequency: "annually",
    busFeeQuarter: "",
    totalFee: 25000,
    discountType: "",
    discountValue: 0,
    finalFee: 25000,
    totalPaid: 0,
    totalDue: 25000,
    feeFrequency: "annually",
    schoolId,
    parentCredentials: {
      username: data.fatherMobile,
      password: hashed,
      temp_password: data.password,
      firstTimeLogin: true,
    },
  };

  if (existing) {
    existing.set(payload);
    existing.studentCredentials = {
      username: data.keepUsername || existing.studentCredentials?.username || existing.studentId,
      password: hashed,
      temp_password: data.password,
      firstTimeLogin: existing.studentCredentials?.firstTimeLogin ?? true,
    };
    if (!existing.studentId) {
      existing.studentId = await nextStudentId(schoolId);
    }
    await existing.save();
    return { student: existing, created: false };
  }

  const studentId = await nextStudentId(schoolId);
  const student = await Student.create({
    ...payload,
    studentId,
    studentCredentials: {
      username: data.keepUsername || studentId,
      password: hashed,
      temp_password: data.password,
      firstTimeLogin: true,
    },
  });

  return { student, created: true };
};

const run = async () => {
  try {
    await connectMongo();

    const school = await School.findOne({ admin_email: "school@admin.com" });
    if (!school) {
      throw new Error("Default school not found (school@admin.com)");
    }

    const classAssignments = await ensureClassSetup(school._id);
    const results = [];

    for (let i = 0; i < STUDENTS.length; i++) {
      const result = await upsertStudent(
        school._id,
        STUDENTS[i],
        classAssignments[i],
      );
      results.push(result);
    }

    const total = await Student.countDocuments({ schoolId: school._id });

    console.log("Default school students ready:");
    for (const { student, created } of results) {
      console.log(
        `- ${created ? "CREATED" : "UPDATED"} ${student.firstName} ${student.lastName} (${student.studentId}) class=${student.classId}`,
      );
    }
    console.log(`Total students in Default School: ${total}`);
    process.exit(0);
  } catch (error) {
    console.error("Failed to seed students:", error);
    process.exit(1);
  }
};

run();
