import express from "express";
import multer from "multer";
import { authMiddleware } from "../auth/auth.js";
import {
  createBoard,
  listBoards,
  updateBoard,
  deleteBoard,
  createBook,
  listBooks,
  getBookDetail,
  updateBook,
  deleteBook,
  createTemplateChapter,
  updateTemplateChapter,
  deleteTemplateChapter,
  uploadTemplateChapterPdf,
  deleteTemplateChapterPdf,
  streamTemplateChapterPdf,
  createTemplateTopic,
  updateTemplateTopic,
  deleteTemplateTopic,
  getCatalogForSchool,
  importBooksToSchool,
} from "../controllers/syllabusCatalogController.js";

const router = express.Router();

const chapterPdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are allowed"), false);
  },
});

router.use(authMiddleware);

/* Boards */
router.get("/boards", listBoards);
router.post("/boards", createBoard);
router.put("/boards/:id", updateBoard);
router.delete("/boards/:id", deleteBoard);

/* Books */
router.get("/books", listBooks);
router.get("/books/:id", getBookDetail);
router.post("/books", createBook);
router.put("/books/:id", updateBook);
router.delete("/books/:id", deleteBook);

/* Template chapters / topics */
router.post("/chapters", createTemplateChapter);
router.put("/chapters/:id", updateTemplateChapter);
router.delete("/chapters/:id", deleteTemplateChapter);
router.post(
  "/chapters/:id/pdf",
  chapterPdfUpload.single("pdf"),
  uploadTemplateChapterPdf,
);
router.delete("/chapters/:id/pdf", deleteTemplateChapterPdf);
router.get("/chapters/:id/pdf-view", streamTemplateChapterPdf);
router.post("/topics", createTemplateTopic);
router.put("/topics/:id", updateTemplateTopic);
router.delete("/topics/:id", deleteTemplateTopic);

/* School catalog browse + import */
router.get("/school-catalog", getCatalogForSchool);
router.post("/import", importBooksToSchool);

export default router;
