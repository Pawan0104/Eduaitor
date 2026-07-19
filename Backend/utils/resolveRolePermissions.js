import SchoolStaffRole from "../models/schoolStaffRole.js";
import { MODULE_KEYS } from "../constants/module.js";
import {
  getSchoolWithModules,
  resolveSubscribedModules,
  ensureDefaultSchoolModules,
} from "./schoolModules.js";

/**
 * Resolve module permissions from a school custom role (or raw list).
 * Used by both Staff and Teacher create/update.
 */
export async function resolveRolePermissions({
  schoolId,
  customRoleId,
  permissionsRaw,
  requireRole = false,
  reqUser = {},
  entityLabel = "staff",
}) {
  let school = await getSchoolWithModules(schoolId);
  const ctx = { userEmail: reqUser.email, role: reqUser.role };
  school = await ensureDefaultSchoolModules(school, ctx);
  const schoolModules = resolveSubscribedModules(school, ctx);

  if (customRoleId) {
    const role = await SchoolStaffRole.findOne({
      _id: customRoleId,
      schoolId,
    });
    if (!role) {
      return { error: "Access role not found" };
    }
    if (!role.isActive) {
      return { error: "Selected access role is inactive" };
    }
    const permissions = (role.permissions || []).filter((p) =>
      schoolModules.includes(p),
    );
    if (permissions.length === 0) {
      return {
        error:
          "Selected role has no modules available for your school. Update the role first.",
      };
    }
    return { permissions, customRoleId: role._id, role };
  }

  if (requireRole) {
    return {
      error: `Access role is required for new ${entityLabel}`,
    };
  }

  let parsedPermissions = [];
  if (permissionsRaw) {
    try {
      parsedPermissions =
        typeof permissionsRaw === "string"
          ? JSON.parse(permissionsRaw)
          : permissionsRaw;
    } catch {
      return { error: "Invalid permissions format" };
    }
  }

  const invalidPerms = parsedPermissions.filter((p) => !MODULE_KEYS.includes(p));
  if (invalidPerms.length > 0) {
    return { error: `Invalid permission(s): ${invalidPerms.join(", ")}` };
  }

  const invalidForSchool = parsedPermissions.filter(
    (p) => !schoolModules.includes(p),
  );
  if (invalidForSchool.length > 0) {
    return {
      error: `School has not subscribed to: ${invalidForSchool.join(", ")}`,
    };
  }

  return { permissions: parsedPermissions, customRoleId: null, role: null };
}
