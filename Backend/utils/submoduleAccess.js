import Staff from "../models/staff.js";
import Teacher from "../models/teacher.js";
import { findSubmoduleForApi } from "../constants/submodules.js";

const PRIVILEGED_ROLES = ["super_admin", "school_admin"];

const asArray = (value) => (Array.isArray(value) ? value : []);

/** Read the freshest role/person permissions for the authenticated user. */
export const resolveFreshPermissions = async (req) => {
  const role = req.user?.role;

  if (role === "teacher_admin" && req.user?.teacher_id) {
    const teacher = await Teacher.findById(req.user.teacher_id)
      .select("permissions submodulePermissions status")
      .lean();
    if (!teacher) return null;
    return {
      permissions: asArray(teacher.permissions),
      submodulePermissions: asArray(teacher.submodulePermissions),
      hasExplicitSubmodules: Array.isArray(teacher.submodulePermissions),
      inactive: teacher.status === "Inactive",
    };
  }

  if (role === "staff_admin" && req.user?.staff_id) {
    const staff = await Staff.findById(req.user.staff_id)
      .select("permissions submodulePermissions status")
      .lean();
    if (!staff) return null;
    return {
      permissions: asArray(staff.permissions),
      submodulePermissions: asArray(staff.submodulePermissions),
      hasExplicitSubmodules: Array.isArray(staff.submodulePermissions),
      inactive: staff.status === "Inactive",
    };
  }

  return null;
};

/**
 * Block direct API access to a sub-module the user was not granted.
 * Legacy records with no explicit sub-module list inherit full access to all
 * sub-modules under their module permissions.
 */
export const enforceSubmoduleAccess = async (req, res, next) => {
  try {
    if (!req.user || PRIVILEGED_ROLES.includes(req.user.role)) return next();

    const path = String(req.originalUrl || req.url || "")
      .split("?")[0]
      .replace(/^\/api/, "");

    const submodule = findSubmoduleForApi(path);
    if (!submodule) return next();

    const fresh = await resolveFreshPermissions(req);
    if (!fresh) return next();
    if (fresh.inactive) {
      return res.status(403).json({
        success: false,
        message: "Account inactive or not found.",
      });
    }

    if (submodule.module && fresh.permissions.length > 0 && !fresh.permissions.includes(submodule.module)) {
      return res.status(403).json({
        success: false,
        message: `You do not have access to ${submodule.label}.`,
      });
    }

    // General utilities (menu, help, notifications) have no parent module.
    if (!submodule.module) return next();

    if (!fresh.hasExplicitSubmodules || fresh.submodulePermissions.length === 0) {
      return next();
    }

    const granted =
      fresh.submodulePermissions.includes("*") ||
      fresh.submodulePermissions.includes("all") ||
      fresh.submodulePermissions.includes(submodule.id) ||
      (submodule.module && fresh.submodulePermissions.includes(submodule.module));

    if (!granted) {
      return res.status(403).json({
        success: false,
        message: `You do not have access to ${submodule.label}.`,
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
};
