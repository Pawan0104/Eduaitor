import express from "express";
import {
  createHomework,
  getTeacherHomework,
  getSchoolHomework,
  getHomeworkById,
  getMyHomework,
  markHomeworkDone,
  reviewHomework,
  updateHomework,
  deleteHomework,
} from "../controllers/homeworkController.js";
import { authMiddleware } from "../auth/auth.js";
import checkModuleAccess from "../middlewares/checkModuleAccess.js";

const router = express.Router();
const guard = [authMiddleware, checkModuleAccess("homework")];

router.post("/", ...guard, createHomework);
router.get("/teacher", ...guard, getTeacherHomework);
router.get("/school", ...guard, getSchoolHomework);
router.get("/my", ...guard, getMyHomework);
router.get("/:id", ...guard, getHomeworkById);
router.post("/:id/mark-done", ...guard, markHomeworkDone);
router.post("/:id/review", ...guard, reviewHomework);
router.put("/:id", ...guard, updateHomework);
router.delete("/:id", ...guard, deleteHomework);

export default router;
