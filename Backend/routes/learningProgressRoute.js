import express from "express";
import { authMiddleware } from "../auth/auth.js";
import {
  createProgress,
  listProgress,
  deleteProgress,
} from "../controllers/learningProgressController.js";

const router = express.Router();
router.use(authMiddleware);

router.get("/", listProgress);
router.post("/", createProgress);
router.delete("/:id", deleteProgress);

export default router;
