import express from "express";
import {
  createExamSchedule,
  getAllExamSchedules,
  getExamSchedule,
  updateExamSchedule,
  generateSchedule,
  editRows,
  publishSchedule,
  restoreVersion,
  deleteExamSchedule,
} from "../controllers/examSchedulerController.js";
import { authMiddleware } from "../auth/auth.js";

const router = express.Router();

const schoolAdminOnly = [authMiddleware];

router.post("/create", schoolAdminOnly, createExamSchedule);
router.get("/list", schoolAdminOnly, getAllExamSchedules);
router.get("/:id", schoolAdminOnly, getExamSchedule);
router.put("/edit/:id", schoolAdminOnly, updateExamSchedule);
router.post("/:id/generate", schoolAdminOnly, generateSchedule);
router.post("/:id/edit-rows", schoolAdminOnly, editRows);
router.post("/:id/publish", schoolAdminOnly, publishSchedule);
router.post("/:id/restore/:version", schoolAdminOnly, restoreVersion);
router.delete("/:id", schoolAdminOnly, deleteExamSchedule);

export default router;