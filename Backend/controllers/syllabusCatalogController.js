import SyllabusBoard from "../models/syllabusBoard.js";
import SyllabusBook from "../models/syllabusBook.js";
import SyllabusTemplateChapter from "../models/syllabusTemplateChapter.js";
import SyllabusTemplateTopic from "../models/syllabusTemplateTopic.js";
import Chapter from "../models/chapter.js";
import Topic from "../models/topic.js";
import Subject from "../models/subject.js";
import Class from "../models/class.js";
import Term from "../models/Term.js";
import Student from "../models/student.js";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";
import cloudinary from "../middlewares/cloudinary.js";
import {
  resolveChapterPdfUrl,
  streamPdfFromUrl,
} from "../utils/streamChapterPdf.js";

const deleteChapterPdfFromCloud = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch (err) {
    console.error("Chapter PDF cloud delete:", err.message);
  }
};

const parsePage = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.floor(n);
};

const requireSuperAdmin = (req, res) => {
  if (req.user?.role !== "super_admin") {
    res.status(403).json({ success: false, message: "Super Admin only" });
    return false;
  }
  return true;
};

const requireSchoolUser = (req, res) => {
  const role = req.user?.role;
  if (!["school_admin", "teacher_admin", "staff_admin"].includes(role)) {
    res.status(403).json({ success: false, message: "School access only" });
    return false;
  }
  if (!req.user?.school_id) {
    res.status(403).json({ success: false, message: "School not identified" });
    return false;
  }
  return true;
};

/** School staff + student/parent can browse the global book catalog */
const requireCatalogReader = (req, res) => {
  const role = req.user?.role;
  if (
    !["school_admin", "teacher_admin", "staff_admin", "student_admin"].includes(
      role,
    )
  ) {
    res.status(403).json({ success: false, message: "Access denied" });
    return false;
  }
  if (!req.user?.school_id) {
    res.status(403).json({ success: false, message: "School not identified" });
    return false;
  }
  return true;
};

/** Resolve catalog class label ("6") from linked student record */
const resolveStudentClassName = async (user) => {
  if (user?.role !== "student_admin" || !user?.student_id) return null;
  const student = await Student.findById(user.student_id)
    .populate("classId", "name")
    .select("classId")
    .lean();
  const raw = student?.classId?.name || "";
  const match = String(raw).match(/(\d{1,2})/);
  return match ? match[1] : raw ? String(raw).trim() : null;
};

/* ═══════════════════════════════════════════════════
   BOARDS
═══════════════════════════════════════════════════ */
export const createBoard = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const { name, code, description, order, status } = req.body;
    if (!name?.trim() || !code?.trim()) {
      return res.status(400).json({
        success: false,
        message: "name and code are required",
      });
    }
    const board = await SyllabusBoard.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description || "",
      order: order ?? 0,
      status: status || "active",
    });
    res.status(201).json({ success: true, data: board });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Board name or code already exists",
      });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

export const listBoards = async (req, res) => {
  try {
    const filter = {};
    // Schools only see active boards
    if (req.user?.role !== "super_admin") {
      filter.status = "active";
    } else if (req.query.status) {
      filter.status = req.query.status;
    }
    const boards = await SyllabusBoard.find(filter).sort({ order: 1, name: 1 });
    res.json({ success: true, data: boards });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateBoard = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const allowed = ["name", "code", "description", "order", "status"];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] =
          key === "code" ? String(req.body[key]).trim().toUpperCase() : req.body[key];
      }
    }
    const board = await SyllabusBoard.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!board) {
      return res.status(404).json({ success: false, message: "Board not found" });
    }
    res.json({ success: true, data: board });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Board name or code already exists",
      });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteBoard = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const board = await SyllabusBoard.findById(req.params.id);
    if (!board) {
      return res.status(404).json({ success: false, message: "Board not found" });
    }
    const books = await SyllabusBook.find({ boardId: board._id }).select("_id");
    const bookIds = books.map((b) => b._id);
    const chapters = await SyllabusTemplateChapter.find({
      bookId: { $in: bookIds },
    }).select("_id");
    const chapterIds = chapters.map((c) => c._id);

    await SyllabusTemplateTopic.deleteMany({
      templateChapterId: { $in: chapterIds },
    });
    await SyllabusTemplateChapter.deleteMany({ bookId: { $in: bookIds } });
    await SyllabusBook.deleteMany({ boardId: board._id });
    await SyllabusBoard.findByIdAndDelete(board._id);

    res.json({ success: true, message: "Board and all books deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════
   BOOKS
═══════════════════════════════════════════════════ */
export const createBook = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const {
      boardId,
      className,
      subjectName,
      title,
      description,
      medium,
      ncertBookCode,
      ncertPortalUrl,
      ncertChapterCount,
      order,
      status,
    } = req.body;

    if (!boardId || !className?.trim() || !subjectName?.trim() || !title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "boardId, className, subjectName and title are required",
      });
    }

    const board = await SyllabusBoard.findById(boardId);
    if (!board) {
      return res.status(404).json({ success: false, message: "Board not found" });
    }

    const book = await SyllabusBook.create({
      boardId,
      className: String(className).trim(),
      subjectName: subjectName.trim(),
      title: title.trim(),
      description: description || "",
      medium: medium || "English",
      ncertBookCode: ncertBookCode || "",
      ncertPortalUrl: ncertPortalUrl || "",
      ncertChapterCount: ncertChapterCount || 0,
      order: order ?? 0,
      status: status || "active",
    });

    res.status(201).json({ success: true, data: book });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "This book already exists for the board/class/subject",
      });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

export const listBooks = async (req, res) => {
  try {
    const { boardId, className, subjectName } = req.query;
    const filter = {};
    if (boardId) filter.boardId = boardId;
    if (className) filter.className = String(className).trim();
    if (subjectName) filter.subjectName = new RegExp(`^${subjectName}$`, "i");
    if (req.user?.role !== "super_admin") {
      filter.status = "active";
    }

    const books = await SyllabusBook.find(filter)
      .populate("boardId", "name code")
      .sort({ className: 1, subjectName: 1, order: 1, title: 1 });

    res.json({ success: true, data: books });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getBookDetail = async (req, res) => {
  try {
    const book = await SyllabusBook.findById(req.params.id).populate(
      "boardId",
      "name code description",
    );
    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    // Students/parents may only open books for their own class
    if (req.user?.role === "student_admin") {
      const studentClassName = await resolveStudentClassName(req.user);
      if (!studentClassName) {
        return res.status(403).json({
          success: false,
          message: "No class linked to your account",
        });
      }
      if (String(book.className) !== String(studentClassName)) {
        return res.status(403).json({
          success: false,
          message: "This book is not for your class",
        });
      }
    }

    const chapters = await SyllabusTemplateChapter.find({ bookId: book._id })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    const chapterIds = chapters.map((c) => c._id);
    const topics = await SyllabusTemplateTopic.find({
      templateChapterId: { $in: chapterIds },
    })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    const topicsByChapter = {};
    for (const t of topics) {
      const key = String(t.templateChapterId);
      if (!topicsByChapter[key]) topicsByChapter[key] = [];
      topicsByChapter[key].push(t);
    }

    res.json({
      success: true,
      data: {
        book,
        chapters: chapters.map((c) => ({
          ...c,
          topics: topicsByChapter[String(c._id)] || [],
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateBook = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const allowed = [
      "className",
      "subjectName",
      "title",
      "description",
      "medium",
      "ncertBookCode",
      "ncertPortalUrl",
      "ncertChapterCount",
      "order",
      "status",
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const book = await SyllabusBook.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }
    res.json({ success: true, data: book });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate book for this board/class/subject",
      });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteBook = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const book = await SyllabusBook.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }
    const chapters = await SyllabusTemplateChapter.find({
      bookId: book._id,
    }).select("_id");
    const chapterIds = chapters.map((c) => c._id);
    await SyllabusTemplateTopic.deleteMany({
      templateChapterId: { $in: chapterIds },
    });
    await SyllabusTemplateChapter.deleteMany({ bookId: book._id });
    await SyllabusBook.findByIdAndDelete(book._id);
    res.json({ success: true, message: "Book deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════
   TEMPLATE CHAPTERS / TOPICS
═══════════════════════════════════════════════════ */
export const createTemplateChapter = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const {
      bookId,
      name,
      description,
      content,
      ncertPortalUrl,
      ncertPdfUrl,
      learningOutcomes,
      termHint,
      order,
    } = req.body;
    if (!bookId || !name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "bookId and name are required",
      });
    }
    const book = await SyllabusBook.findById(bookId);
    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }
    const chapter = await SyllabusTemplateChapter.create({
      bookId,
      name: name.trim(),
      description: description || "",
      content: content || description || "",
      ncertPortalUrl: ncertPortalUrl || "",
      ncertPdfUrl: ncertPdfUrl || "",
      learningOutcomes: learningOutcomes || [],
      ...(termHint ? { termHint } : {}),
      order: order ?? 0,
    });
    res.status(201).json({ success: true, data: chapter });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateTemplateChapter = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const allowed = [
      "name",
      "description",
      "content",
      "ncertPortalUrl",
      "ncertPdfUrl",
      "learningOutcomes",
      "termHint",
      "order",
      "status",
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    // Keep content in sync when older clients send only description as main body
    if (updates.content === undefined && updates.description !== undefined) {
      updates.content = updates.description;
    }
    const chapter = await SyllabusTemplateChapter.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true },
    );
    if (!chapter) {
      return res
        .status(404)
        .json({ success: false, message: "Chapter not found" });
    }
    res.json({ success: true, data: chapter });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteTemplateChapter = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const chapter = await SyllabusTemplateChapter.findById(req.params.id);
    if (!chapter) {
      return res
        .status(404)
        .json({ success: false, message: "Chapter not found" });
    }
    await deleteChapterPdfFromCloud(chapter.pdf?.public_id);
    await SyllabusTemplateTopic.deleteMany({ templateChapterId: chapter._id });
    await SyllabusTemplateChapter.findByIdAndDelete(chapter._id);
    res.json({ success: true, message: "Chapter deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** POST /syllabus-catalog/chapters/:id/pdf  multipart: pdf */
export const uploadTemplateChapterPdf = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const chapter = await SyllabusTemplateChapter.findById(req.params.id);
    if (!chapter) {
      return res
        .status(404)
        .json({ success: false, message: "Chapter not found" });
    }
    const file = req.file;
    if (!file) {
      return res
        .status(400)
        .json({ success: false, message: "PDF file is required" });
    }
    if (file.mimetype !== "application/pdf") {
      return res
        .status(400)
        .json({ success: false, message: "Only PDF files are allowed" });
    }

    const uploaded = await uploadToCloudinary(
      file,
      "syllabus/chapter-pdfs",
      "image",
    );

    if (chapter.pdf?.public_id) {
      await deleteChapterPdfFromCloud(chapter.pdf.public_id);
    }

    chapter.pdf = {
      url: uploaded.url,
      public_id: uploaded.public_id,
      name: file.originalname || "chapter.pdf",
      type: file.mimetype,
    };
    await chapter.save();

    res.status(201).json({
      success: true,
      message: "Chapter PDF uploaded",
      data: chapter,
    });
  } catch (err) {
    console.error("uploadTemplateChapterPdf:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to upload chapter PDF",
    });
  }
};

/** DELETE /syllabus-catalog/chapters/:id/pdf */
export const deleteTemplateChapterPdf = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const chapter = await SyllabusTemplateChapter.findById(req.params.id);
    if (!chapter) {
      return res
        .status(404)
        .json({ success: false, message: "Chapter not found" });
    }
    if (!chapter.pdf?.url) {
      return res
        .status(404)
        .json({ success: false, message: "No uploaded PDF on this chapter" });
    }
    await deleteChapterPdfFromCloud(chapter.pdf.public_id);
    chapter.pdf = { url: "", public_id: "", name: "", type: "application/pdf" };
    await chapter.save();
    res.json({ success: true, message: "Chapter PDF removed", data: chapter });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /syllabus-catalog/chapters/:id/pdf-view
 * Streams chapter PDF (uploaded or NCERT) for in-app viewing.
 * Auth: any catalog reader (super admin, school, student/parent).
 */
export const streamTemplateChapterPdf = async (req, res) => {
  try {
    const role = req.user?.role;
    const allowed = [
      "super_admin",
      "school_admin",
      "teacher_admin",
      "staff_admin",
      "student_admin",
    ];
    if (!allowed.includes(role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const chapter = await SyllabusTemplateChapter.findById(req.params.id).lean();
    if (!chapter) {
      return res
        .status(404)
        .json({ success: false, message: "Chapter not found" });
    }

    // Students/parents: only their class books
    if (role === "student_admin") {
      const book = await SyllabusBook.findById(chapter.bookId)
        .select("className")
        .lean();
      const studentClassName = await resolveStudentClassName(req.user);
      if (
        !studentClassName ||
        !book ||
        String(book.className) !== String(studentClassName)
      ) {
        return res.status(403).json({
          success: false,
          message: "This chapter is not for your class",
        });
      }
    }

    const pdfUrl = resolveChapterPdfUrl(chapter);
    if (!pdfUrl) {
      return res
        .status(404)
        .json({ success: false, message: "No PDF linked to this chapter" });
    }

    await streamPdfFromUrl(res, pdfUrl);
  } catch (err) {
    console.error("streamTemplateChapterPdf:", err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: err.message || "Failed to load PDF",
      });
    }
  }
};

export const createTemplateTopic = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const {
      templateChapterId,
      name,
      content,
      order,
      difficultyLevel,
      keywords,
      pageFrom,
      pageTo,
    } = req.body;
    if (!templateChapterId || !name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "templateChapterId and name are required",
      });
    }
    const chapter = await SyllabusTemplateChapter.findById(templateChapterId);
    if (!chapter) {
      return res
        .status(404)
        .json({ success: false, message: "Chapter not found" });
    }
    const topic = await SyllabusTemplateTopic.create({
      templateChapterId,
      bookId: chapter.bookId,
      name: name.trim(),
      content: content || "",
      pageFrom: parsePage(pageFrom),
      pageTo: parsePage(pageTo),
      order: order ?? 0,
      difficultyLevel: difficultyLevel || "medium",
      keywords: keywords || [],
    });
    res.status(201).json({ success: true, data: topic });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateTemplateTopic = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const allowed = [
      "name",
      "content",
      "order",
      "difficultyLevel",
      "keywords",
      "status",
      "pageFrom",
      "pageTo",
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] =
          key === "pageFrom" || key === "pageTo"
            ? parsePage(req.body[key])
            : req.body[key];
      }
    }
    const topic = await SyllabusTemplateTopic.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true },
    );
    if (!topic) {
      return res.status(404).json({ success: false, message: "Topic not found" });
    }
    res.json({ success: true, data: topic });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteTemplateTopic = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const topic = await SyllabusTemplateTopic.findByIdAndDelete(req.params.id);
    if (!topic) {
      return res.status(404).json({ success: false, message: "Topic not found" });
    }
    res.json({ success: true, message: "Topic deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════
   SCHOOL: browse catalog + import
═══════════════════════════════════════════════════ */
export const getCatalogForSchool = async (req, res) => {
  try {
    if (!requireCatalogReader(req, res)) return;

    const { className } = req.query;
    const isStudentOrParent = req.user.role === "student_admin";
    const studentClassName = isStudentOrParent
      ? await resolveStudentClassName(req.user)
      : null;

    // Students/parents always see only their class books
    let effectiveClass = className ? String(className).trim() : "";
    if (isStudentOrParent) {
      if (!studentClassName) {
        return res.json({
          success: true,
          studentClassName: null,
          data: [],
          message: "No class linked to your account",
        });
      }
      effectiveClass = studentClassName;
    }

    const boards = await SyllabusBoard.find({ status: "active" })
      .sort({ order: 1, name: 1 })
      .lean();

    const bookFilter = { status: "active" };
    if (effectiveClass) bookFilter.className = effectiveClass;

    const books = await SyllabusBook.find(bookFilter)
      .populate("boardId", "name code")
      .sort({ className: 1, subjectName: 1, order: 1 })
      .lean();

    const booksByBoard = {};
    for (const book of books) {
      const bid = String(book.boardId?._id || book.boardId);
      if (!booksByBoard[bid]) booksByBoard[bid] = [];
      booksByBoard[bid].push(book);
    }

    res.json({
      success: true,
      studentClassName,
      data: boards.map((b) => ({
        ...b,
        books: booksByBoard[String(b._id)] || [],
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Import one or more catalog books into the school's syllabus.
 * Body: {
 *   bookIds: [],
 *   classId,
 *   termId,
 *   subjectId? (optional — otherwise create/find by book.subjectName),
 *   mode: "merge" | "replace"
 * }
 */
export const importBooksToSchool = async (req, res) => {
  try {
    if (!requireSchoolUser(req, res)) return;

    const schoolId = req.user.school_id;
    const {
      bookIds,
      classId,
      termId,
      subjectId: forcedSubjectId,
      mode = "merge",
    } = req.body;

    if (!Array.isArray(bookIds) || !bookIds.length) {
      return res.status(400).json({
        success: false,
        message: "Select at least one book to import",
      });
    }
    if (!classId || !termId) {
      return res.status(400).json({
        success: false,
        message: "classId and termId are required",
      });
    }

    const schoolClass = await Class.findOne({ _id: classId, schoolId });
    if (!schoolClass) {
      return res.status(404).json({
        success: false,
        message: "Class not found in your school",
      });
    }

    const term = await Term.findOne({ _id: termId, schoolId });
    if (!term) {
      return res.status(404).json({
        success: false,
        message: "Term not found in your school",
      });
    }

    const books = await SyllabusBook.find({
      _id: { $in: bookIds },
      status: "active",
    });
    if (!books.length) {
      return res.status(404).json({
        success: false,
        message: "No active books found for import",
      });
    }

    const ensureSubject = async (subjectName) => {
      if (forcedSubjectId && bookIds.length === 1) {
        const existing = await Subject.findOne({
          _id: forcedSubjectId,
          schoolId,
        });
        if (existing) return existing;
      }
      let subject = await Subject.findOne({
        schoolId,
        name: new RegExp(`^${escapeRegex(subjectName)}$`, "i"),
      });
      if (subject) return subject;
      try {
        subject = await Subject.create({
          schoolId,
          name: subjectName.trim(),
          status: "Active",
        });
      } catch (e) {
        // Global unique name collision — find any with same name for this school again
        subject = await Subject.findOne({
          schoolId,
          name: subjectName.trim(),
        });
        if (!subject) throw e;
      }
      return subject;
    };

    /** Ensure subject appears in class syllabus dropdown (subjectTeachers) */
    const ensureSubjectOnClass = async (subject) => {
      let changed = false;
      const cls = await Class.findById(classId);
      if (!cls?.details?.length) return;

      for (const detail of cls.details) {
        const has = (detail.subjectTeachers || []).some(
          (st) => String(st.subjectId) === String(subject._id),
        );
        if (!has) {
          detail.subjectTeachers = detail.subjectTeachers || [];
          detail.subjectTeachers.push({
            subjectId: subject._id,
            teacherId: detail.teacherId || null,
          });
          changed = true;
        }
      }
      if (changed) await cls.save();
    };

    let chaptersCreated = 0;
    let topicsCreated = 0;
    let chaptersSkipped = 0;
    const imported = [];

    for (const book of books) {
      const subject = await ensureSubject(book.subjectName);
      await ensureSubjectOnClass(subject);

      if (mode === "replace") {
        const existingChapters = await Chapter.find({
          schoolId,
          classId,
          subjectId: subject._id,
          termId,
        }).select("_id");
        const existingIds = existingChapters.map((c) => c._id);
        if (existingIds.length) {
          await Topic.deleteMany({ chapterId: { $in: existingIds } });
          await Chapter.deleteMany({ _id: { $in: existingIds } });
        }
      }

      const templateChapters = await SyllabusTemplateChapter.find({
        bookId: book._id,
        status: "active",
      }).sort({ order: 1, createdAt: 1 });

      for (const tc of templateChapters) {
        if (mode === "merge") {
          const exists = await Chapter.findOne({
            schoolId,
            classId,
            subjectId: subject._id,
            termId,
            name: tc.name,
          });
          if (exists) {
            chaptersSkipped += 1;
            continue;
          }
        }

        const chapter = await Chapter.create({
          schoolId,
          classId,
          subjectId: subject._id,
          termId,
          name: tc.name,
          description: tc.description || "",
          content: tc.content || tc.description || "",
          ncertPortalUrl: tc.ncertPortalUrl || "",
          ncertPdfUrl: tc.ncertPdfUrl || "",
          pdf: tc.pdf?.url
            ? {
                url: tc.pdf.url,
                public_id: tc.pdf.public_id || "",
                name: tc.pdf.name || "",
                type: tc.pdf.type || "application/pdf",
              }
            : undefined,
          learningOutcomes: tc.learningOutcomes || [],
          order: tc.order ?? 0,
          status: "active",
        });
        chaptersCreated += 1;

        const templateTopics = await SyllabusTemplateTopic.find({
          templateChapterId: tc._id,
          status: "active",
        }).sort({ order: 1, createdAt: 1 });

        for (const tt of templateTopics) {
          await Topic.create({
            schoolId,
            chapterId: chapter._id,
            subjectId: subject._id,
            classId,
            name: tt.name,
            content: tt.content || "",
            pageFrom: tt.pageFrom ?? null,
            pageTo: tt.pageTo ?? null,
            order: tt.order ?? 0,
            difficultyLevel: tt.difficultyLevel || "medium",
            keywords: tt.keywords || [],
            status: "active",
          });
          topicsCreated += 1;
        }
      }

      imported.push({
        bookId: book._id,
        title: book.title,
        subjectName: book.subjectName,
        subjectId: subject._id,
      });
    }

    res.json({
      success: true,
      message: `Imported ${chaptersCreated} chapters and ${topicsCreated} topics`,
      data: {
        chaptersCreated,
        topicsCreated,
        chaptersSkipped,
        imported,
      },
    });
  } catch (err) {
    console.error("Syllabus import error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
