import express from "express";
import {
  marketingAccess,
  resolveSchoolIdForSuperAdmin,
} from "../middlewares/marketingPermission.js";
import {
  getOverrides,
  saveOverride,
  getCatalog,
} from "../controllers/marketing/templateController.js";

const router = express.Router();

router.use(marketingAccess);
router.use(resolveSchoolIdForSuperAdmin);

router.get("/catalog", getCatalog);
router.get("/templates", getOverrides);
router.post("/templates/override", saveOverride);

export default router;