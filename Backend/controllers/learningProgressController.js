import ClassPageProgress from "../models/classPageProgress.js";
import Chapter from "../models/chapter.js";
import Class from "../models/class.js";
import Student from "../models/student.js";
import Teacher from "../models/teacher.js";

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const populateProgress = (q) =>
  q
    .populate("teacherId", "fullName name email")
    .populate("subjectId", "name")
    .populate("classId", "name")
    .populate("sectionId", "name")
    .populate("chapterId", "name order ncertPdfUrl pdf ncertPortalUrl content");

async function resolveStudentContext(user) {
  if (user.role !== "student_admin" || !user.student_id) return null;
  const student = await Student.findById(user.student_id)
    .select("classId sectionId schoolId firstName lastName")
    .lean();
  return student;
}

async function teacherTeachesSubject(teacherId, classId, subjectId) {
  const cls = await Class.findById(classId).select("details").lean();
  if (!cls) return false;
  return (cls.details || []).some((d) =>
    (d.subjectTeachers || []).some(
      (st) =>
        String(st.teacherId) === String(teacherId) &&
        String(st.subjectId) === String(subjectId),
    ),
  );
}

/** POST /api/learning-progress — teacher marks pages */
export const createProgress = async (req, res) => {
  try {
    if (req.user.role !== "teacher_admin") {
      return res.status(403).json({ success: false, message: "Teachers only" });
    }
    const schoolId = req.user.school_id;
    const teacherId = req.user.teacher_id;
    const {
      classId,
      sectionId,
      subjectId,
      chapterId,
      pageFrom,
      pageTo,
      date,
      notes,
      bookTitle,
    } = req.body;

    if (!classId || !sectionId || !subjectId || !chapterId || !pageFrom || !pageTo) {
      return res.status(400).json({
        success: false,
        message:
          "classId, sectionId, subjectId, chapterId, pageFrom and pageTo are required",
      });
    }

    const from = Number(pageFrom);
    const to = Number(pageTo);
    if (!Number.isFinite(from) || !Number.isFinite(to) || from < 1 || to < from) {
      return res.status(400).json({
        success: false,
        message: "Invalid page range",
      });
    }

    const teaches = await teacherTeachesSubject(teacherId, classId, subjectId);
    if (!teaches) {
      const teacher = await Teacher.findById(teacherId).select("assignedClasses");
      const assigned = (teacher?.assignedClasses || []).some(
        (c) => String(c) === String(classId),
      );
      if (!assigned) {
        return res.status(403).json({
          success: false,
          message: "You are not assigned to this class/subject",
        });
      }
    }

    const chapter = await Chapter.findOne({ _id: chapterId, schoolId });
    if (!chapter) {
      return res
        .status(404)
        .json({ success: false, message: "Chapter not found" });
    }

    const day = date ? startOfDay(date) : startOfDay(new Date());

    const doc = await ClassPageProgress.create({
      schoolId,
      teacherId,
      classId,
      sectionId,
      subjectId,
      chapterId,
      bookTitle: bookTitle || "",
      chapterName: chapter.name,
      date: day,
      pageFrom: from,
      pageTo: to,
      notes: notes || "",
    });

    const populated = await populateProgress(
      ClassPageProgress.findById(doc._id),
    );

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/learning-progress — role-scoped list */
export const listProgress = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { date, from, to, classId, sectionId, subjectId, days } = req.query;
    const filter = { schoolId };

    if (req.user.role === "teacher_admin") {
      filter.teacherId = req.user.teacher_id;
      if (classId) filter.classId = classId;
      if (sectionId) filter.sectionId = sectionId;
      if (subjectId) filter.subjectId = subjectId;
    } else if (req.user.role === "student_admin") {
      const student = await resolveStudentContext(req.user);
      if (!student?.classId || !student?.sectionId) {
        return res.json({ success: true, data: [], student: null });
      }
      filter.classId = student.classId;
      filter.sectionId = student.sectionId;
      if (subjectId) filter.subjectId = subjectId;
    } else if (
      ["school_admin", "staff_admin"].includes(req.user.role)
    ) {
      if (classId) filter.classId = classId;
      if (sectionId) filter.sectionId = sectionId;
      if (subjectId) filter.subjectId = subjectId;
    } else {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    if (date) {
      filter.date = { $gte: startOfDay(date), $lte: endOfDay(date) };
    } else if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = startOfDay(from);
      if (to) filter.date.$lte = endOfDay(to);
    } else {
      const n = Math.min(30, Math.max(1, Number(days) || 7));
      const start = startOfDay(new Date());
      start.setDate(start.getDate() - (n - 1));
      filter.date = { $gte: start };
    }

    const rows = await populateProgress(
      ClassPageProgress.find(filter).sort({ date: -1, createdAt: -1 }),
    ).lean();

    let student = null;
    if (req.user.role === "student_admin") {
      student = await resolveStudentContext(req.user);
    }

    res.json({ success: true, data: rows, student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** DELETE /api/learning-progress/:id */
export const deleteProgress = async (req, res) => {
  try {
    if (req.user.role !== "teacher_admin") {
      return res.status(403).json({ success: false, message: "Teachers only" });
    }
    const doc = await ClassPageProgress.findOne({
      _id: req.params.id,
      schoolId: req.user.school_id,
      teacherId: req.user.teacher_id,
    });
    if (!doc) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    await doc.deleteOne();
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
