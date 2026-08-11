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
    const portal = String(req.body?.portal || req.body?.loginAs || "")
      .trim()
      .toLowerCase();
    // staff/other portal must not accept parent/student credentials
    const staffPortal =
      portal === "staff" ||
      portal === "other" ||
      portal === "admin" ||
      portal === "teacher";
    const parentPortal = portal === "parent";
    const studentPortal = portal === "student";

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
        data: {
          role: "super_admin",
          email: process.env.SUPER_ADMIN_EMAIL,
          name: "Super Admin",
        },
      });
    }

    /* ---------- TEACHER ADMIN ---------- */
    if (!parentPortal && !studentPortal) {
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
            firstTimeLogin: teacher.firstTimeLogin ?? false,
          },
        });
      }
    }

    /* ---------- STUDENT / PARENT ADMIN ---------- */
    // Staff/Admin portal must never accept parent or student credentials
    if (!staffPortal) {
      const studentByStudentCreds =
        !parentPortal
          ? await Student.findOne({
              "studentCredentials.username": loginUsername,
            })
          : null;

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
      if (!studentPortal) {
        const parentUsername = normalizeParentUsername(loginUsername);
        const requestedSchoolId = req.body?.schoolId
          ? String(req.body.schoolId).trim()
          : "";

        const parentQuery = {
          "parentCredentials.username": parentUsername,
        };
        if (
          requestedSchoolId &&
          mongoose.Types.ObjectId.isValid(requestedSchoolId)
        ) {
          parentQuery.schoolId = requestedSchoolId;
        }

        const parentCandidates = parentUsername
          ? await Student.find(parentQuery)
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
            ) ||
            children[0] ||
            matchedParentStudent;

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
      }
    }

    if (parentPortal || studentPortal) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
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
        firstTimeLogin: school.firstTimeLogin ?? false,
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
    const role = req.user.role;
    const loginAs = req.user.loginAs;
    const studentId = req.user.student_id || req.user._id;

    if (role === "student_admin" && loginAs === "student") {
      await Student.findByIdAndUpdate(studentId, {
        "studentCredentials.password": hashed,
        "studentCredentials.temp_password": newPassword,
        "studentCredentials.firstTimeLogin": false,
      });
    } else if (role === "student_admin" && loginAs === "parent") {
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
    } else if (role === "teacher_admin") {
      await Teacher.findByIdAndUpdate(req.user.teacher_id || req.user._id, {
        password: hashed,
        temp_password: newPassword,
        firstTimeLogin: false,
      });
    } else if (role === "staff_admin") {
      await Staff.findByIdAndUpdate(req.user.staff_id || req.user._id, {
        password: hashed,
        temp_password: newPassword,
        firstTimeLogin: false,
      });
    } else if (role === "school_admin") {
      await School.findByIdAndUpdate(req.user.school_id || req.user.id, {
        admin_password: hashed,
        temp_password: newPassword,
        firstTimeLogin: false,
      });
    } else {
      return res.status(403).json({ message: "Password change not supported for this role" });
    }

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("changePassWord error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/** POST /auth/dismiss-password-prompt — skip optional first-login change */
export const dismissPasswordPrompt = async (req, res) => {
  try {
    const role = req.user.role;
    const loginAs = req.user.loginAs;
    const studentId = req.user.student_id || req.user._id;

    if (role === "student_admin" && loginAs === "student") {
      await Student.findByIdAndUpdate(studentId, {
        "studentCredentials.firstTimeLogin": false,
      });
    } else if (role === "student_admin" && loginAs === "parent") {
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
          { $set: { "parentCredentials.firstTimeLogin": false } },
        );
      } else {
        await Student.findByIdAndUpdate(studentId, {
          "parentCredentials.firstTimeLogin": false,
        });
      }
    } else if (role === "teacher_admin") {
      await Teacher.findByIdAndUpdate(req.user.teacher_id || req.user._id, {
        firstTimeLogin: false,
      });
    } else if (role === "staff_admin") {
      await Staff.findByIdAndUpdate(req.user.staff_id || req.user._id, {
        firstTimeLogin: false,
      });
    } else if (role === "school_admin") {
      await School.findByIdAndUpdate(req.user.school_id || req.user.id, {
        firstTimeLogin: false,
      });
    } else {
      return res.status(403).json({
        success: false,
        message: "Not available for this role",
      });
    }

    return res.json({
      success: true,
      message: "Password prompt dismissed",
      firstTimeLogin: false,
    });
  } catch (err) {
    console.error("dismissPasswordPrompt error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /auth/parent/student-password
 * Parent sets/resets the active (or specified) child's student login password.
 */
export const updateStudentPasswordByParent = async (req, res) => {
  try {
    if (req.user?.role !== "student_admin" || req.user?.loginAs !== "parent") {
      return res.status(403).json({ success: false, message: "Parents only" });
    }

    const { newPassword, studentId: bodyStudentId } = req.body || {};
    if (!newPassword || String(newPassword).length < 4) {
      return res.status(400).json({
        success: false,
        message: "Password too short",
      });
    }

    const parentUsername = normalizeParentUsername(
      req.user.parent_username || req.user.username,
    );
    const children = await findChildrenByParentUsername(
      parentUsername,
      req.user.school_id,
    );
    const targetId = bodyStudentId || req.user.student_id;
    const child = children.find((c) => String(c._id) === String(targetId));
    if (!child) {
      return res.status(403).json({
        success: false,
        message: "That student is not linked to this parent account",
      });
    }

    const hashed = await bcrypt.hash(String(newPassword), 10);
    const updated = await Student.findByIdAndUpdate(
      child._id,
      {
        $set: {
          "studentCredentials.password": hashed,
          "studentCredentials.temp_password": String(newPassword),
          "studentCredentials.firstTimeLogin": false,
        },
      },
      { new: true },
    ).select("studentCredentials.username firstName lastName studentId");

    return res.json({
      success: true,
      message: "Student password updated",
      data: {
        studentId: updated?.studentId,
        username: updated?.studentCredentials?.username,
        name: `${updated?.firstName || ""} ${updated?.lastName || ""}`.trim(),
      },
    });
  } catch (err) {
    console.error("updateStudentPasswordByParent error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /auth/parent/lookup { mobile }
 * Public: resolve school branding for a parent mobile before password entry.
 */
export const lookupParentSchools = async (req, res) => {
  try {
    const mobile = normalizeParentUsername(
      req.body?.mobile || req.body?.email || req.body?.username,
    );

    if (!mobile) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required",
      });
    }

    const students = await Student.find({
      "parentCredentials.username": mobile,
    })
      .select("schoolId")
      .lean();

    if (!students.length) {
      return res.status(404).json({
        success: false,
        message: "No parent account found for this mobile",
      });
    }

    const counts = new Map();
    for (const row of students) {
      const id = String(row.schoolId || "");
      if (!id) continue;
      counts.set(id, (counts.get(id) || 0) + 1);
    }

    const schoolIds = [...counts.keys()];
    const schools = await School.find({ _id: { $in: schoolIds } })
      .select("school_name school_logo status")
      .lean();

    const byId = new Map(schools.map((s) => [String(s._id), s]));
    const payload = schoolIds
      .map((id) => {
        const school = byId.get(id);
        if (!school) return null;
        if (school.status && school.status !== "Active") return null;
        return {
          schoolId: id,
          school_name: school.school_name || "School",
          school_logo: school.school_logo || null,
          childCount: counts.get(id) || 0,
        };
      })
      .filter(Boolean)
      .sort((a, b) =>
        String(a.school_name).localeCompare(String(b.school_name)),
      );

    if (!payload.length) {
      return res.status(404).json({
        success: false,
        message: "No parent account found for this mobile",
      });
    }

    return res.json({
      success: true,
      mobile,
      schools: payload,
    });
  } catch (err) {
    console.error("lookupParentSchools error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
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