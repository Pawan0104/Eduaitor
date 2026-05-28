import express from "express";

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

// SUPER ADMIN ROUTES
router.get("/books/admin", authMiddleware, getAdminBooks);
router.get("/issues/admin", authMiddleware, getAdminBookIssues);

// LIBRARY ROUTES
router.get("/books", authMiddleware, getBooks);
router.post("/books", authMiddleware, addBook);
router.put("/books/:id", authMiddleware, updateBook);
router.delete("/books/:id", authMiddleware, deleteBook);

router.get("/issues/my", authMiddleware, getStudentIssuesBooks);
router.get("/issues", authMiddleware, getIssueBooks);
router.post("/issues", authMiddleware, issueBook);
router.post("/issues/:issueId/return", authMiddleware, returnBook);

export default router;
