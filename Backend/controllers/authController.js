import School from "../models/school.js";
import Teacher from "../models/teacher.js";
import Student from "../models/student.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Staff from "../models/staff.js";
import mongoose from "mongoose";

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    /* ---------- SUPER ADMIN ---------- */
    if (
      email === process.env.SUPER_ADMIN_EMAIL &&
      password === process.env.SUPER_ADMIN_PASSWORD
    ) {
      const token = generateToken({ role: "super_admin", email });
      res.cookie("token", token, cookieOptions);
      return res.json({
        success: true,
        token,
        message: "Super Admin login successful",
        data: { role: "super_admin", email: process.env.SUPER_ADMIN_EMAIL },
      });
    }

    /* ---------- TEACHER ADMIN ---------- */
    const teacher = await Teacher.findOne({
      $or: [{ email }, { username: email }],
    });

    if (teacher && (await bcrypt.compare(password, teacher.password))) {
      const school = await School.findById(teacher.schoolId).select(
        "subscribed_modules",
      );

      const subscribed_modules = school?.subscribed_modules || [];

      const token = generateToken({
        role: "teacher_admin",
        email: teacher.email,
        school_id: teacher.schoolId,
        teacher_id: teacher._id,
        name: teacher.fullName,
        _id: teacher._id,
      });
      res.cookie("token", token, cookieOptions);
      return res.json({
        success: true,
        token,
        message: "Teacher login successful",
        data: {
          role: "teacher_admin",
          teacher_id: teacher._id,
          name: teacher.fullName,
          email: teacher.email,
          school_id: teacher.schoolId,
          subscribed_modules,
        },
      });
    }

    /* ---------- STUDENT / PARENT ADMIN ---------- */
    const studentByStudentCreds = await Student.findOne({
      "studentCredentials.username": email,
    });

    const studentByParentCreds = await Student.findOne({
      "parentCredentials.username": email,
    });

    // ── STUDENT LOGIN ──
    if (studentByStudentCreds) {
      const passwordMatch = await bcrypt.compare(
        password,
        studentByStudentCreds.studentCredentials.password,
      );

      if (passwordMatch) {
        const school = await School.findById(
          studentByStudentCreds.schoolId,
        ).select("subscribed_modules");
        const subscribed_modules = school?.subscribed_modules || [];

        const token = generateToken({
          role: "student_admin",
          loginAs: "student",
          username: studentByStudentCreds.studentCredentials.username,
          school_id: studentByStudentCreds.schoolId,
          student_id: studentByStudentCreds._id,
          name: `${studentByStudentCreds.firstName} ${studentByStudentCreds.lastName}`,
          _id: studentByStudentCreds._id,
        });

        res.cookie("token", token, cookieOptions);
        return res.json({
          success: true,
          token,
          message: "Student login successful",
          data: {
            role: "student_admin",
            loginAs: "student",
            student_id: studentByStudentCreds._id,
            name: `${studentByStudentCreds.firstName} ${studentByStudentCreds.lastName}`,
            username: studentByStudentCreds.studentCredentials.username,
            school_id: studentByStudentCreds.schoolId,
            firstTimeLogin:
              studentByStudentCreds.studentCredentials.firstTimeLogin,
            subscribed_modules,
          },
        });
      }
    }

    // ── PARENT LOGIN ──
    if (studentByParentCreds) {
      const passwordMatch = await bcrypt.compare(
        password,
        studentByParentCreds.parentCredentials.password,
      );

      if (passwordMatch) {
        const school = await School.findById(
          studentByParentCreds.schoolId,
        ).select("subscribed_modules");
        const subscribed_modules = school?.subscribed_modules || [];

        const token = generateToken({
          role: "student_admin",
          loginAs: "parent",
          username: studentByParentCreds.parentCredentials.username,
          school_id: studentByParentCreds.schoolId,
          student_id: studentByParentCreds._id,
          name: `${studentByParentCreds.firstName} ${studentByParentCreds.lastName}`,
          _id: studentByParentCreds._id,
        });

        res.cookie("token", token, cookieOptions);
        return res.json({
          success: true,
          token,
          message: "Parent login successful",
          data: {
            role: "student_admin",
            loginAs: "parent",
            student_id: studentByParentCreds._id,
            name: `${studentByParentCreds.firstName} ${studentByParentCreds.lastName}`,
            username: studentByParentCreds.parentCredentials.username,
            school_id: studentByParentCreds.schoolId,
            firstTimeLogin:
              studentByParentCreds.parentCredentials.firstTimeLogin,
            subscribed_modules,
          },
        });
      }
    }

    /* ------------------------ staff admin login ------------------- */
    const staff = await Staff.findOne({
      $or: [{ email }, { username: email }],
    });

    if (staff && (await bcrypt.compare(password, staff.password))) {
      // check staff is active
      if (staff.status === "Inactive") {
        return res.status(403).json({
          success: false,
          message:
            "Your account is inactive. Contact your school administrator.",
        });
      }

      // fetch school modules — for sidebar disable logic
      const staffSchool = await School.findById(staff.schoolId).select(
        "subscribed_modules",
      );

      const subscribed_modules = staffSchool?.subscribed_modules || [];

      const token = generateToken({
        role: "staff_admin",
        email: staff.email,
        school_id: staff.schoolId,
        staff_id: staff._id,
        name: staff.fullName,
        _id: staff._id,
      });

      res.cookie("token", token, cookieOptions);
      return res.json({
        success: true,
        token,
        message: "Staff login successful",
        data: {
          role: "staff_admin",
          staff_id: staff._id,
          name: staff.fullName,
          email: staff.email,
          school_id: staff.schoolId,
          staffRole: staff.staffRole,
          staffRoleCustom: staff.staffRoleCustom,
          firstTimeLogin: staff.firstTimeLogin,
          permissions: staff.permissions, // ← staff personal module access
          subscribed_modules, // ← school level modules for sidebar
        },
      });
    }

    /* ---------- SCHOOL ADMIN ---------- */
    const school = await School.findOne({ admin_email: email });

    if (!school || !(await bcrypt.compare(password, school.admin_password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = generateToken({
      role: "school_admin",
      email: school.admin_email,
      school_id: school._id,
      name: school.school_name,
      id: school._id,
    });
    res.cookie("token", token, cookieOptions);
    return res.json({
      success: true,
      token,
      message: "School Admin login successful",
      data: {
        role: "school_admin",
        school_id: school._id,
        school_name: school.school_name,
        email: school.admin_email,
        subscribed_modules: school.subscribed_modules || [],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const changePassWord = async (req, res) => {
  const { newPassword } = req.body;
  const hashed = await bcrypt.hash(newPassword, 10);

  const loginAs = req.user.loginAs; // "student" or "parent" from JWT

  if (loginAs === "student") {
    await Student.findByIdAndUpdate(req.user._id, {
      "studentCredentials.password": hashed,
      "studentCredentials.temp_password": newPassword,
      "studentCredentials.firstTimeLogin": false,
    });
  } else if (loginAs === "parent") {
    await Student.findByIdAndUpdate(req.user._id, {
      "parentCredentials.password": hashed,
      "parentCredentials.temp_password": newPassword,
      "parentCredentials.firstTimeLogin": false,
    });
  } else {
    // staff or other roles — keep existing logic
    await Student.findByIdAndUpdate(req.user._id, {
      password: hashed,
      firstTimeLogin: false,
    });
  }

  res.json({ message: "Password updated successfully" });
};