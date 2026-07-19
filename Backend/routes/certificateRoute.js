import express from "express";
import { authMiddleware } from "../auth/auth.js";
import upload from "../middlewares/upload.js";
import {
  getCertificateMeta,
  listTemplates,
  getTemplate,
  updateTemplate,
  resetTemplate,
  applyPreset,
  uploadTemplateLogo,
  clearTemplateLogo,
  generateCertificate,
} from "../controllers/certificateController.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/meta", getCertificateMeta);
router.get("/templates", listTemplates);
router.get("/templates/:type", getTemplate);
router.put("/templates/:type", updateTemplate);
router.post("/templates/:type/reset", resetTemplate);
router.post("/templates/:type/apply-preset", applyPreset);
router.post(
  "/templates/:type/logo",
  upload.single("logo"),
  uploadTemplateLogo,
);
router.delete("/templates/:type/logo", clearTemplateLogo);
router.get("/generate/:type/:studentId", generateCertificate);

export default router;
