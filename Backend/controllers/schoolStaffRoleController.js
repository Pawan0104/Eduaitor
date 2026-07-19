import mongoose from "mongoose";
import SchoolStaffRole from "../models/schoolStaffRole.js";
import Staff from "../models/staff.js";
import Teacher from "../models/teacher.js";
import { MODULES, MODULE_KEYS } from "../constants/module.js";
import {
  getSchoolWithModules,
  resolveSubscribedModules,
  ensureDefaultSchoolModules,
} from "../utils/schoolModules.js";

const getSchoolModules = async (schoolId, reqUser = {}) => {
  let school = await getSchoolWithModules(schoolId);
  if (!school) return [];
  const ctx = { userEmail: reqUser.email, role: reqUser.role };
  school = await ensureDefaultSchoolModules(school, ctx);
  return resolveSubscribedModules(school, ctx);
};

const validatePermissions = (permissions, schoolModules) => {
  if (!Array.isArray(permissions) || permissions.length === 0) {
    return "Select at least one module permission";
  }
  const invalid = permissions.filter((p) => !MODULE_KEYS.includes(p));
  if (invalid.length) {
    return `Invalid permission(s): ${invalid.join(", ")}`;
  }
  const notAllowed = permissions.filter((p) => !schoolModules.includes(p));
  if (notAllowed.length) {
    return `School does not have access to: ${notAllowed.join(", ")}`;
  }
  return null;
};

const STARTER_ROLES = [
  {
    name: "Office Admin",
    description: "Day-to-day school office access",
    preferred: ["students", "teachers", "classes", "attendance", "notices", "message", "staff"],
  },
  {
    name: "Accountant",
    description: "Fees and financial modules",
    preferred: ["fees", "students", "notices", "message"],
  },
  {
    name: "Reception",
    description: "Front desk and visitor-facing modules",
    preferred: ["students", "gatepass", "hostel", "notices", "message", "attendance"],
  },
  {
    name: "Security Guard",
    description: "Gate visitor requests and hostel entry submissions",
    preferred: ["hostel", "gatepass", "students", "notices", "message"],
  },
  {
    name: "Hostel Warden",
    description: "Hostel operations and visitor entry approvals",
    preferred: ["hostel", "students", "notices", "message", "attendance"],
  },
  {
    name: "Teacher",
    description: "Teaching modules — exams, classes, diary, homework",
    preferred: [
      "students",
      "classes",
      "attendance",
      "exams",
      "syllabus",
      "timetable",
      "diary",
      "homework",
      "assignments",
      "daily_learning",
      "notices",
      "events",
      "groups",
      "message",
      "gatepass",
    ],
  },
];

const seedStarterRoles = async (schoolId, schoolModules) => {
  const created = [];
  for (const starter of STARTER_ROLES) {
    const permissions = starter.preferred.filter((p) => schoolModules.includes(p));
    if (permissions.length === 0) continue;
    try {
      const doc = await SchoolStaffRole.create({
        schoolId,
        name: starter.name,
        nameKey: starter.name.trim().toLowerCase(),
        description: starter.description,
        permissions,
        isActive: true,
        isSystem: true,
      });
      created.push(doc);
    } catch (err) {
      // skip duplicate / validation races so listing never hard-fails
      if (err?.code !== 11000) {
        console.error("seedStarterRoles:", err.message);
      }
    }
  }
  return created;
};

/** Ensure Teacher starter role exists even if other roles were seeded earlier. */
const ensureTeacherStarterRole = async (schoolId, schoolModules) => {
  const existing = await SchoolStaffRole.findOne({
    schoolId,
    nameKey: "teacher",
  });
  if (existing) return existing;

  const starter = STARTER_ROLES.find((r) => r.name === "Teacher");
  const permissions = starter.preferred.filter((p) => schoolModules.includes(p));
  if (permissions.length === 0) return null;

  try {
    return await SchoolStaffRole.create({
      schoolId,
      name: starter.name,
      nameKey: "teacher",
      description: starter.description,
      permissions,
      isActive: true,
      isSystem: true,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return SchoolStaffRole.findOne({ schoolId, nameKey: "teacher" });
    }
    console.error("ensureTeacherStarterRole:", err.message);
    return null;
  }
};

const roleToJson = (doc, staffCount = 0) => ({
  _id: doc._id,
  name: doc.name,
  description: doc.description || "",
  permissions: doc.permissions || [],
  isActive: doc.isActive !== false,
  isSystem: !!doc.isSystem,
  staffCount,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

/** GET /school-staff-roles/modules */
export const getAvailableModules = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const schoolModules = await getSchoolModules(schoolId, req.user);
    const modules = MODULES.filter((m) => schoolModules.includes(m.key));
    return res.json({ success: true, data: modules, keys: schoolModules });
  } catch (error) {
    next(error);
  }
};

/** GET /school-staff-roles — seeds starters if none exist */
export const listRoles = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    let roles = await SchoolStaffRole.find({ schoolId }).sort({ name: 1 }).lean();

    const schoolModules = await getSchoolModules(schoolId, req.user);
    if (roles.length === 0 && schoolModules.length > 0) {
      await seedStarterRoles(schoolId, schoolModules);
      roles = await SchoolStaffRole.find({ schoolId }).sort({ name: 1 }).lean();
    } else if (schoolModules.length > 0) {
      await ensureTeacherStarterRole(schoolId, schoolModules);
      roles = await SchoolStaffRole.find({ schoolId }).sort({ name: 1 }).lean();
    }

    let countMap = {};
    if (mongoose.Types.ObjectId.isValid(schoolId)) {
      try {
        const schoolOid = new mongoose.Types.ObjectId(schoolId);
        const [staffCounts, teacherCounts] = await Promise.all([
          Staff.aggregate([
            {
              $match: {
                schoolId: schoolOid,
                customRoleId: { $ne: null },
              },
            },
            { $group: { _id: "$customRoleId", count: { $sum: 1 } } },
          ]),
          Teacher.aggregate([
            {
              $match: {
                schoolId: schoolOid,
                customRoleId: { $ne: null },
              },
            },
            { $group: { _id: "$customRoleId", count: { $sum: 1 } } },
          ]),
        ]);
        for (const c of staffCounts) {
          countMap[String(c._id)] = (countMap[String(c._id)] || 0) + c.count;
        }
        for (const c of teacherCounts) {
          countMap[String(c._id)] = (countMap[String(c._id)] || 0) + c.count;
        }
      } catch (aggErr) {
        console.error("listRoles assignee counts:", aggErr.message);
      }
    }

    return res.json({
      success: true,
      data: roles.map((r) => roleToJson(r, countMap[String(r._id)] || 0)),
    });
  } catch (error) {
    console.error("listRoles:", error);
    next(error);
  }
};

/** POST /school-staff-roles */
export const createRole = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { name, description, permissions, isActive } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Role name is required" });
    }

    const schoolModules = await getSchoolModules(schoolId, req.user);
    const permError = validatePermissions(permissions, schoolModules);
    if (permError) {
      return res.status(400).json({ success: false, message: permError });
    }

    const existing = await SchoolStaffRole.findOne({
      schoolId,
      nameKey: name.trim().toLowerCase(),
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "A role with this name already exists",
      });
    }

    const role = await SchoolStaffRole.create({
      schoolId,
      name: name.trim(),
      description: description?.trim() || "",
      permissions,
      isActive: isActive !== false,
      isSystem: false,
    });

    return res.status(201).json({
      success: true,
      message: "Role created",
      data: roleToJson(role, 0),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A role with this name already exists",
      });
    }
    next(error);
  }
};

/** PUT /school-staff-roles/:id */
export const updateRole = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const role = await SchoolStaffRole.findOne({ _id: req.params.id, schoolId });
    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    const { name, description, permissions, isActive } = req.body;

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ success: false, message: "Role name is required" });
      }
      const clash = await SchoolStaffRole.findOne({
        schoolId,
        nameKey: String(name).trim().toLowerCase(),
        _id: { $ne: role._id },
      });
      if (clash) {
        return res.status(400).json({
          success: false,
          message: "A role with this name already exists",
        });
      }
      role.name = String(name).trim();
    }

    if (description !== undefined) {
      role.description = String(description).trim();
    }

    if (isActive !== undefined) {
      role.isActive = Boolean(isActive);
    }

    if (permissions !== undefined) {
      const schoolModules = await getSchoolModules(schoolId, req.user);
      const permError = validatePermissions(permissions, schoolModules);
      if (permError) {
        return res.status(400).json({ success: false, message: permError });
      }
      role.permissions = permissions;
    }

    await role.save();

    // Live-sync: update all staff AND teachers assigned this role
    if (permissions !== undefined) {
      await Promise.all([
        Staff.updateMany(
          { schoolId, customRoleId: role._id },
          { $set: { permissions: role.permissions } },
        ),
        Teacher.updateMany(
          { schoolId, customRoleId: role._id },
          { $set: { permissions: role.permissions } },
        ),
      ]);
    }

    const [staffCount, teacherCount] = await Promise.all([
      Staff.countDocuments({ schoolId, customRoleId: role._id }),
      Teacher.countDocuments({ schoolId, customRoleId: role._id }),
    ]);

    return res.json({
      success: true,
      message: "Role updated",
      data: roleToJson(role, staffCount + teacherCount),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A role with this name already exists",
      });
    }
    next(error);
  }
};

/** DELETE /school-staff-roles/:id — blocked if staff assigned */
export const deleteRole = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const role = await SchoolStaffRole.findOne({ _id: req.params.id, schoolId });
    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    const [staffCount, teacherCount] = await Promise.all([
      Staff.countDocuments({ schoolId, customRoleId: role._id }),
      Teacher.countDocuments({ schoolId, customRoleId: role._id }),
    ]);
    const assigneeCount = staffCount + teacherCount;
    if (assigneeCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${assigneeCount} staff/teacher(s) use this role. Deactivate it or reassign them first.`,
      });
    }

    await role.deleteOne();
    return res.json({ success: true, message: "Role deleted" });
  } catch (error) {
    next(error);
  }
};
