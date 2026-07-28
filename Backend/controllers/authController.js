import School from "../models/school.js";
import Teacher from "../models/teacher.js";
import Student from "../models/student.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Staff from "../models/staff.js";
import mongoose from "mongoose";
import {
  resolveSubscribedModules,
  ensureDefaultSchoolModules,
} from "../utils/schoolModules.js";
import SchoolStaffRole from "../models/schoolStaffRole.js";
import {
  findChildrenByParentUsername,
  normalizeParentUsername,
  toChildSummary,
} from "../utils/parentChildren.js";

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

function buildParentSession(activeStudent, children, school, subscribed_modules) {
  const parentUsername = normalizeParentUsername(
    activeStudent.parentCredentials?.username,
  );
  const childSummaries = children.map(toChildSummary).filter(Boolean);
  const name = `${activeStudent.firstName || ""} ${activeStudent.lastName || ""}`.trim();

  const tokenPayload = {
    role: "student_admin",
    loginAs: "parent",
    username: parentUsername,
    parent_username: parentUsername,
    school_id: activeStudent.schoolId,
    student_id: activeStudent._id,
    name,
    _id: activeStudent._id,
  };

  return {
    token: generateToken(tokenPayload),
    data: {
      role: "student_admin",
      loginAs: "parent",
      _id: activeStudent._id,
      student_id: activeStudent._id,
      name,
      username: parentUsername,
      parent_username: parentUsername,
      school_id: activeStudent.schoolId,
      school_name: school?.school_name || null,
      school_logo: school?.school_logo || null,
      firstTimeLogin: activeStudent.parentCredentials?.firstTimeLogin ?? false,
      subscribed_modules,
      photo_url: activeStudent.documents?.studentPhoto?.url || null,
      children: childSummaries,
      activeChildId: activeStudent._id,
    },
  };
}

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const loginEmail = email?.trim().toLowerCase();
    const loginUsername = email?.trim();

    const normalizeQuery = (value) => {
      if (!value) return null;
      const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`^${escaped}$`, "i");
    };

    const emailQuery = normalizeQuery(loginEmail);

    /* ---------- SUPER ADMIN ---------- */
    if (
      loginEmail === process.env.SUPER_ADMIN_EMAIL?.toLowerCase() &&
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
      $or: [
        emailQuery ? { email: emailQuery } : null,
        { username: loginUsername },
      ].filter(Boolean),
    });

    if (teacher && (await bcrypt.compare(password, teacher.password))) {
      const school = await School.findById(teacher.schoolId).select(
        "subscribed_modules admin_email school_name school_logo",
      );

      const moduleCtx = {
        userEmail: teacher.email,
        role: "teacher_admin",
      };
      const healed = await ensureDefaultSchoolModules(
        school?.toObject?.() || school,
        moduleCtx,
      );
      const subscribed_modules = resolveSubscribedModules(healed, moduleCtx);

      let customRoleName = null;
      if (teacher.customRoleId) {
        const roleDoc = await SchoolStaffRole.findById(teacher.customRoleId)
          .select("name")
          .lean();
        customRoleName = roleDoc?.name || null;
      }

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
          school_name: school?.school_name || null,
          school_logo: school?.school_logo || null,
          customRoleId: teacher.customRoleId || null,
          customRoleName,
          permissions: teacher.permissions || [],
          subscribed_modules,
          photo_url: teacher.photo?.url || null,
        },
      });
    }

    /* ---------- STUDENT / PARENT ADMIN ---------- */
    const studentByStudentCreds = await Student.findOne({
      "studentCredentials.username": loginUsername,
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
        ).select("subscribed_modules school_name school_logo");
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
            school_name: school?.school_name || null,
            school_logo: school?.school_logo || null,
            firstTimeLogin:
              studentByStudentCreds.studentCredentials.firstTimeLogin,
            subscribed_modules,
            photo_url:
              studentByStudentCreds.documents?.studentPhoto?.url || null,
          },
        });
      }
    }

    // ── PARENT LOGIN (supports multiple children sharing father mobile) ──
    const parentUsername = normalizeParentUsername(loginUsername);
    const parentCandidates = parentUsername
      ? await Student.find({
          "parentCredentials.username": parentUsername,
        })
          .populate("classId", "name className")
          .populate("sectionId", "name sectionName")
          .select(
            "firstName lastName rollNo studentId classId sectionId schoolId documents.studentPhoto parentCredentials",
          )
      : [];

    let matchedParentStudent = null;
    for (const candidate of parentCandidates) {
      const hash = candidate.parentCredentials?.password;
      if (!hash) continue;
      if (await bcrypt.compare(password, hash)) {
        matchedParentStudent = candidate;
        break;
      }
    }

    if (matchedParentStudent) {
      const children = await findChildrenByParentUsername(
        parentUsername,
        matchedParentStudent.schoolId,
      );
      // Prefer matched student as active; fall back to first sibling
      const active =
        children.find(
          (c) => String(c._id) === String(matchedParentStudent._id),
        ) || children[0] || matchedParentStudent;

      const school = await School.findById(active.schoolId).select(
        "subscribed_modules school_name school_logo",
      );
      const subscribed_modules = school?.subscribed_modules || [];
      const session = buildParentSession(
        active,
        children.length ? children : [active],
        school,
        subscribed_modules,
      );

      res.cookie("token", session.token, cookieOptions);
      return res.json({
        success: true,
        token: session.token,
        message: "Parent login successful",
        data: session.data,
      });
    }

    /* ------------------------ staff admin login ------------------- */
    const staff = await Staff.findOne({
      $or: [
        emailQuery ? { email: emailQuery } : null,
        { username: loginUsername },
      ].filter(Boolean),
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
        "subscribed_modules school_name school_logo",
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
          school_name: staffSchool?.school_name || null,
          school_logo: staffSchool?.school_logo || null,
          staffRole: staff.staffRole,
          staffRoleCustom: staff.staffRoleCustom,
          customRoleId: staff.customRoleId || null,
          firstTimeLogin: staff.firstTimeLogin,
          permissions: staff.permissions, // ← staff personal module access
          subscribed_modules, // ← school level modules for sidebar
          photo_url: staff.photo?.url || null,
        },
      });
    }

    /* ---------- SCHOOL ADMIN ---------- */
    const school = await School.findOne({
      admin_email: emailQuery,
    });

    if (!school || !(await bcrypt.compare(password, school.admin_password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const moduleCtx = {
      userEmail: school.admin_email,
      role: "school_admin",
    };
    const healedSchool = await ensureDefaultSchoolModules(
      school.toObject?.() || school,
      moduleCtx,
    );
    const subscribed_modules = resolveSubscribedModules(healedSchool, moduleCtx);

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
        school_logo: school.school_logo || null,
        email: school.admin_email,
        name: school.school_name,
        subscribed_modules,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const changePassWord = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 4) {
      return res.status(400).json({ message: "Password too short" });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    const loginAs = req.user.loginAs;
    const studentId = req.user.student_id || req.user._id;

    if (loginAs === "student") {
      await Student.findByIdAndUpdate(studentId, {
        "studentCredentials.password": hashed,
        "studentCredentials.temp_password": newPassword,
        "studentCredentials.firstTimeLogin": false,
      });
    } else if (loginAs === "parent") {
      const parentUsername = normalizeParentUsername(
        req.user.parent_username || req.user.username,
      );
      const schoolId = req.user.school_id;
      if (parentUsername && schoolId) {
        await Student.updateMany(
          {
            schoolId,
            "parentCredentials.username": parentUsername,
          },
          {
            $set: {
              "parentCredentials.password": hashed,
              "parentCredentials.temp_password": newPassword,
              "parentCredentials.firstTimeLogin": false,
            },
          },
        );
      } else {
        await Student.findByIdAndUpdate(studentId, {
          "parentCredentials.password": hashed,
          "parentCredentials.temp_password": newPassword,
          "parentCredentials.firstTimeLogin": false,
        });
      }
    } else {
      await Student.findByIdAndUpdate(studentId, {
        password: hashed,
        firstTimeLogin: false,
      });
    }

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("changePassWord error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/** GET /auth/parent/children — list siblings for logged-in parent */
export const getParentChildren = async (req, res) => {
  try {
    if (req.user?.role !== "student_admin" || req.user?.loginAs !== "parent") {
      return res.status(403).json({ success: false, message: "Parents only" });
    }
    const parentUsername = normalizeParentUsername(
      req.user.parent_username || req.user.username,
    );
    const children = await findChildrenByParentUsername(
      parentUsername,
      req.user.school_id,
    );
    return res.json({
      success: true,
      activeChildId: req.user.student_id,
      children: children.map(toChildSummary),
    });
  } catch (err) {
    console.error("getParentChildren error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/** POST /auth/parent/switch-child { studentId } */
export const switchParentChild = async (req, res) => {
  try {
    if (req.user?.role !== "student_admin" || req.user?.loginAs !== "parent") {
      return res.status(403).json({ success: false, message: "Parents only" });
    }

    const studentId = req.body?.studentId;
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: "Invalid studentId" });
    }

    const parentUsername = normalizeParentUsername(
      req.user.parent_username || req.user.username,
    );
    const children = await findChildrenByParentUsername(
      parentUsername,
      req.user.school_id,
    );
    const active = children.find((c) => String(c._id) === String(studentId));
    if (!active) {
      return res.status(403).json({
        success: false,
        message: "That student is not linked to this parent account",
      });
    }

    const school = await School.findById(active.schoolId).select(
      "subscribed_modules school_name school_logo",
    );
    const subscribed_modules = school?.subscribed_modules || [];
    const session = buildParentSession(active, children, school, subscribed_modules);

    res.cookie("token", session.token, cookieOptions);
    return res.json({
      success: true,
      token: session.token,
      message: "Active child updated",
      data: session.data,
    });
  } catch (err) {
    console.error("switchParentChild error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};