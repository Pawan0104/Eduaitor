import {
  SUBMODULE_BY_ID,
  SUBMODULES_BY_MODULE,
  findSubmoduleForRoute,
  getSubmoduleIdsForModule,
} from "../constants/submodules.js";

const PRIVILEGED_ROLES = ["super_admin", "school_admin"];

/** Normalize the permission field so both array and malformed values are safe. */
const asArray = (value) => (Array.isArray(value) ? value : []);

/**
 * Effective sub-module grants.
 *
 * Legacy records have no explicit sub-module list. In that case every
 * sub-module under the user's selected modules is treated as granted, which
 * keeps existing accounts working until an admin edits their permissions.
 */
export const expandSubmoduleIds = (modulePermissions = [], explicit = null) => {
  const modules = asArray(modulePermissions);
  const derived = modules.flatMap((key) => getSubmoduleIdsForModule(key));

  if (explicit === null || explicit === undefined) return derived;

  const selected = asArray(explicit);
  if (selected.length === 0) return derived;

  // Keep only sub-modules whose parent module is still selected. Sub-modules
  // with no parent module (general utilities) are always allowed to remain.
  return selected.filter((id) => {
    const submodule = SUBMODULE_BY_ID[id];
    if (!submodule) return false;
    if (!submodule.module) return true;
    return modules.includes(submodule.module);
  });
};

export const getSubmodulePermissions = (user) =>
  expandSubmoduleIds(user?.permissions, user?.submodulePermissions);

export const canAccessSubmodule = (user, submoduleId) => {
  if (!submoduleId) return true;
  if (PRIVILEGED_ROLES.includes(user?.role)) return true;

  const submodule = SUBMODULE_BY_ID[submoduleId];
  if (!submodule) return true;

  // General utilities (menu, help, notifications) have no parent module and
  // are intentionally not permission-gated.
  if (!submodule.module) return true;

  const modulePermissions = asArray(user?.permissions);
  if (submodule.module && modulePermissions.length > 0 && !modulePermissions.includes(submodule.module)) {
    return false;
  }

  const explicit = user?.submodulePermissions;
  if (!Array.isArray(explicit) || explicit.length === 0) return true;
  if (explicit.includes("*") || explicit.includes("all")) return true;
  return explicit.includes(submoduleId) || explicit.includes(submodule.module);
};

export const canAccessRoute = (user, pathname) => {
  const submodule = findSubmoduleForRoute(pathname);
  return canAccessSubmodule(user, submodule?.id);
};

/**
 * Recursively hide menu items whose target sub-module is not granted.
 * Parent items with children stay visible while at least one child remains.
 */
export const filterMenuBySubmoduleAccess = (items = [], user = null) =>
  items.reduce((result, item) => {
    if (Array.isArray(item?.children)) {
      const children = filterMenuBySubmoduleAccess(item.children, user);
      if (children.length > 0 || (item.path && canAccessRoute(user, item.path))) {
        result.push({ ...item, children });
      }
      return result;
    }

    if (!item?.path || canAccessRoute(user, item.path)) {
      result.push(item);
    }
    return result;
  }, []);

/** Sub-modules grouped by parent module, optionally limited to subscribed modules. */
export const getPermissionTree = (modulePermissions = [], subscribedModules = null) => {
  const modules = asArray(modulePermissions).filter((key) =>
    subscribedModules === null || asArray(subscribedModules).length === 0
      ? true
      : asArray(subscribedModules).includes(key),
  );

  return modules.map((key) => ({
    key,
    submodules: SUBMODULES_BY_MODULE[key] || [],
  }));
};
