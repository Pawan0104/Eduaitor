import Staff from "../models/staff.js"; // ADDED
import {
  getSchoolWithModules,
  resolveSubscribedModules,
  ensureDefaultSchoolModules,
} from "../utils/schoolModules.js";

const checkModuleAccess = (moduleKey) => {
  return async (req, res, next) => {
    try {
      // ── 1. SUPER ADMIN — always bypass ───────────────
      if (req.user.role === "super_admin") {
        return next();
      }

      // ── 2. GET SCHOOL ID FROM JWT ─────────────────────
      const schoolId = req.user.school_id;

      if (!schoolId) {
        return res.status(403).json({
          success: false,
          message: "School not identified. Access denied.",
        });
      }

      // ── 3. FETCH SCHOOL MODULES FROM DB ──────────────
      let school = await getSchoolWithModules(schoolId);

      // ── 4. SCHOOL EXISTS? ─────────────────────────────
      if (!school) {
        return res.status(403).json({
          success: false,
          message: "School not found. Access denied.",
        });
      }

      // ── 5. SCHOOL ACTIVE? ─────────────────────────────
      if (school.status === "Inactive") {
        return res.status(403).json({
          success: false,
          message: "Your school account is inactive. Contact administrator.",
        });
      }

      // Heal default school empty/incomplete subscription (matches /auth/me UI)
      const moduleCtx = {
        userEmail: req.user.email,
        role: req.user.role,
      };
      school = await ensureDefaultSchoolModules(school, moduleCtx);

      const subscribed = resolveSubscribedModules(school, moduleCtx);

      // ── 6. SCHOOL MODULE SUBSCRIBED? ─────────────────
      // applies to ALL roles — school, teacher, student, staff
      if (!subscribed.includes(moduleKey)) {
        return res.status(403).json({
          success: false,
          message: `Your school has not subscribed to the '${moduleKey}' module. Please upgrade your plan.`,
        });
      }

      // ── 7. STAFF — extra personal permission check ───
      // ADDED: only staff_admin needs this second level check
      // school_admin, teacher_admin, student_admin pass after step 6
      if (req.user.role === "staff_admin") {

        const staffMember = await Staff
          .findById(req.user.staff_id)
          .select("permissions status");

        if (!staffMember) {
          return res.status(403).json({
            success: false,
            message: "Staff account not found. Access denied.",
          });
        }

        if (staffMember.status === "Inactive") {
          return res.status(403).json({
            success: false,
            message: "Your account is inactive. Contact your administrator.",
          });
        }

        // staff_admin should always be able to manage staff records
        if (moduleKey === "staff") {
          return next();
        }

        if (!staffMember.permissions.includes(moduleKey)) {
          return res.status(403).json({
            success: false,
            message: `You do not have permission to access the '${moduleKey}' module.`,
          });
        }
      }

      // ── 8. ALL CHECKS PASSED ──────────────────────────
      next();

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Module access check failed.",
      });
    }
  };
};

export default checkModuleAccess;