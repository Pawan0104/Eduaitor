import express from "express";
import {
  createTerm,
  getTerms,
  updateTerm,
  deleteTerm
} from "../controllers/termController.js";
import { authMiddleware } from "../auth/auth.js";

const router = express.Router();

router.post("/", authMiddleware, createTerm);
router.get("/", authMiddleware, getTerms);
router.put("/:termId", authMiddleware, updateTerm);
router.delete("/:termId", deleteTerm);

export default router;