import dotenv from "dotenv";
import mongoose from "mongoose";
import Teacher from "../models/teacher.js";
import Staff from "../models/staff.js";
import Student from "../models/student.js";

dotenv.config({ path: "./.env" });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      tlsAllowInvalidHostnames: true,
    });

    const teacher = await Teacher.findOne({
      $or: [{ email: /^school@admin\.com$/i }, { username: "school@admin.com" }],
    });
    const staff = await Staff.findOne({
      $or: [{ email: /^school@admin\.com$/i }, { username: "school@admin.com" }],
    });
    const studentStudent = await Student.findOne({
      "studentCredentials.username": "school@admin.com",
    });
    const studentParent = await Student.findOne({
      "parentCredentials.username": "school@admin.com",
    });

    console.log({
      teacher: !!teacher,
      staff: !!staff,
      studentStudent: !!studentStudent,
      studentParent: !!studentParent,
    });

    if (teacher) console.log("teacher password exists", !!teacher.password);
    if (staff) console.log("staff password exists", !!staff.password);
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
};

run();
