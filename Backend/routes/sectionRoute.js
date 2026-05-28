import express from "express";

import {
  createSection,
  getSections,
  updateSection,
  deleteSection,
  addSubSection,
  updateSubSection,
  deleteSubSection,
  getAllSections,
} from "../controllers/sectionController.js";
import { authMiddleware } from "../auth/auth.js";

const router = express.Router();

// SUPER ADMIN ROUTES
router.get ("/all/admin", authMiddleware, getAllSections);

// SECTION ROUTES
router.post("/create", authMiddleware, createSection);

router.get("/all", authMiddleware, getSections);

router.put("/update/:id", authMiddleware, updateSection);

router.delete("/delete/:id", authMiddleware, deleteSection);


// SUBSECTION ROUTES
router.post("/sub/create/:sectionId", authMiddleware, addSubSection);

router.put("/sub/update/:sectionId/:subId", authMiddleware, updateSubSection);

router.delete("/sub/delete/:sectionId/:subId", authMiddleware, deleteSubSection);


export default router;