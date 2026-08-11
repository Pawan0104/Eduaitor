import express from "express";
import Staff from "../models/staff.js";

const router = express.Router();

import {
  issueBook,
  addBook,
  getBooks,
  returnBook,
  getIssueBooks,
  updateBook,
  deleteBook,
  getAdminBooks,
  getAdminBookIssues,
  getStudentIssuesBooks,
} from "../controllers/libraryController.js";
import { authMiddleware } from "../auth/auth.js";

const librarianOnly = async (req, res, next) => {
  try {
    if (req.user.role === "super_admin" || req.user.role === "school_admin") {
      return next();
    }
    if (req.user.role === "staff_admin") {
      const staffMember = await Staff.findById(req.user.staff_id).select(
        "permissions status",
      );
      if (!staffMember || staffMember.status === "Inactive") {
        return res.status(403).json({
          success: false,
          message: "Access denied.",
        });
      }
      if (!staffMember.permissions.includes("library")) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to manage the library.",
        });
      }
      return next();
    }
    return res.status(403).json({
      success: false,
      message: "Access denied.",
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Access check failed.",
    });
  }
};

// SUPER ADMIN ROUTES
router.get("/books/admin", authMiddleware, getAdminBooks);
router.get("/issues/admin", authMiddleware, getAdminBookIssues);


// LIBRARY ROUTES
router.get("/books", authMiddleware, getBooks);
router.post("/books", authMiddleware, librarianOnly, addBook);
router.put("/books/:id", authMiddleware, librarianOnly, updateBook);
router.delete("/books/:id", authMiddleware, librarianOnly, deleteBook);

router.get("/issues/my", authMiddleware, getStudentIssuesBooks);
router.get("/issues", authMiddleware, getIssueBooks);
router.post("/issues", authMiddleware, librarianOnly, issueBook);
router.post("/issues/:issueId/return", authMiddleware, librarianOnly, returnBook);

export default router;
