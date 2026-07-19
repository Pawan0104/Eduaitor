import express from "express";
import { authMiddleware } from "../auth/auth.js";
import checkModuleAccess from "../middlewares/checkModuleAccess.js";
import {
  getAvailableModules,
  listRoles,
  createRole,
  updateRole,
  deleteRole,
} from "../controllers/schoolStaffRoleController.js";

const router = express.Router();

/** School admin always manages roles; staff need staff module access. */
const allowSchoolAdminOrStaffModule = (req, res, next) => {
  if (req.user?.role === "school_admin" && req.user?.school_id) {
    return next();
  }
  return checkModuleAccess("staff")(req, res, next);
};

router.use(authMiddleware);
router.use(allowSchoolAdminOrStaffModule);

router.get("/modules", getAvailableModules);
router.get("/", listRoles);
router.post("/", createRole);
router.put("/:id", updateRole);
router.delete("/:id", deleteRole);

export default router;
