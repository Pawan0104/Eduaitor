import {
  SUBMODULE_BY_ID,
  SUBMODULE_IDS,
  getSubmoduleIdsForModule,
} from "../constants/submodules.js";

const asArray = (value) => (Array.isArray(value) ? value : []);

const parseRaw = (raw) => {
  // Missing values inherit all sub-modules under the selected modules.
  // An explicit [] is a deliberate "no sub-modules" grant.
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "string") return null;

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * Validate and normalize sub-module grants for a staff/teacher/role write.
 * When no explicit list is supplied, all sub-modules under the selected
 * modules are granted, preserving the old module-level behavior.
 */
export const resolveSubmodulePermissions = ({
  submodulePermissionsRaw,
  modulePermissions = [],
  schoolModules = [],
}) => {
  const modules = asArray(modulePermissions);
  const derived = [
    ...new Set(
      modules.flatMap((key) => {
        if (schoolModules.length > 0 && !schoolModules.includes(key)) return [];
        return getSubmoduleIdsForModule(key);
      }),
    ),
  ];

  const selected = parseRaw(submodulePermissionsRaw);
  if (selected === undefined) {
    return { submodulePermissions: derived };
  }
  if (selected === null) {
    return { error: "Invalid sub-module permissions format" };
  }

  const invalid = selected.filter((id) => !SUBMODULE_IDS.includes(id));
  if (invalid.length) {
    return { error: `Invalid sub-module permission(s): ${invalid.join(", ")}` };
  }

  const filtered = selected.filter((id) => {
    const submodule = SUBMODULE_BY_ID[id];
    if (!submodule.module) return true;
    if (!modules.includes(submodule.module)) return false;
    if (schoolModules.length > 0 && !schoolModules.includes(submodule.module)) return false;
    return true;
  });

  return { submodulePermissions: [...new Set(filtered)] };
};

/** Resolve sub-module grants when permissions are copied from a custom role. */
export const resolveRoleSubmodulePermissions = ({
  role,
  modulePermissions = [],
  schoolModules = [],
}) => {
  const roleSubmodules = asArray(role?.submodulePermissions);
  return resolveSubmodulePermissions({
    submodulePermissionsRaw: roleSubmodules.length ? roleSubmodules : undefined,
    modulePermissions,
    schoolModules,
  }).submodulePermissions;
};
