import express from "express";
import { authMiddleware, requireRoles } from "../auth/auth.js";
import {
  getStreams,
  createStream,
  updateStream,
  deleteStream,
} from "../controllers/streamController.js";

const router = express.Router();

const readGuard = [authMiddleware];
const writeGuard = [
  authMiddleware,
  requireRoles("school_admin", "super_admin"),
];

router.get("/all", ...readGuard, getStreams);
router.post("/create", ...writeGuard, createStream);
router.put("/update/:id", ...writeGuard, updateStream);
router.delete("/delete/:id", ...writeGuard, deleteStream);

export default router;
