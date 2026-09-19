import Teacher from "../models/teacher.js";
import Staff from "../models/staff.js";
import checkModuleAccess from "./checkModuleAccess.js";
import { authMiddleware } from "../auth/auth.js";

/**
 * Phase 1 approval model:
 *  - super_admin / school_admin  → full marketing access
 *  - teacher_admin / staff_admin → need a marketing permission
 * The accepted permission keys are "marketing" or "marketing_approve".
 */

export const MARKETING_PERMISSIONS = ["marketing", "marketing_approve"];

const assertMarketingPermission = async (req, res, next) => {
  try {
    const role = req.user?.role;

    if (role === "super_admin" || role === "school_admin") {
      return next();
    }

    let permissions = [];
    if (role === "teacher_admin") {
      const teacher = await Teacher.findById(req.user.teacher_id).select(
        "permissions status",
      );
      if (!teacher || teacher.status === "Inactive") {
        return res
          .status(403)
          .json({ success: false, message: "Account not found or inactive." });
      }
      permissions = teacher.permissions || [];
    } else if (role === "staff_admin") {
      const staff = await Staff.findById(req.user.staff_id).select(
        "permissions status",
      );
      if (!staff || staff.status === "Inactive") {
        return res
          .status(403)
          .json({ success: false, message: "Account not found or inactive." });
      }
      permissions = staff.permissions || [];
    } else {
      return res
        .status(403)
        .json({ success: false, message: "Access denied." });
    }

    if (!permissions.some((p) => MARKETING_PERMISSIONS.includes(p))) {
      return res.status(403).json({
        success: false,
        message:
          "You need the 'marketing_approve' permission to use Marketing AI.",
      });
    }
    req.marketingPermission = "marketing_approve";
    return next();
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Marketing permission check failed." });
  }
};

/** Composed guard: JWT → module subscription → role permission. */
export const marketingAccess = [
  authMiddleware,
  checkModuleAccess("marketing"),
  assertMarketingPermission,
];

/**
 * Super admins don't have school_id in their JWT.
 * Marketing AI for the super admin manages Eduaitor's own social media under a
 * dedicated tenant id (not a school). A fixed synthetic but valid ObjectId is
 * used so ObjectId-typed `schoolId` queries in the marketing models work.
 */
const SUPER_ADMIN_TENANT_ID = "1b7ead000000000000000001"; // pseudo-ObjectId for Eduaitor super admin

export const resolveSchoolIdForSuperAdmin = (req, res, next) => {
  if (req.user?.role === "super_admin" && !req.user.school_id) {
    req.user.school_id =
      process.env.SUPER_ADMIN_TENANT_ID || SUPER_ADMIN_TENANT_ID;
  }
  next();
};