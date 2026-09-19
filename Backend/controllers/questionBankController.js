import QuestionBank from "../models/questionBank.js";
import ExamPaper from "../models/examPaper.js";
import Chapter from "../models/chapter.js";
import Class from "../models/class.js";
import Subject from "../models/subject.js";
import Teacher from "../models/teacher.js";

function baseDoc(req) {
  return req.user?.school_id || req.user?.schoolId;
}

export const createQuestions = async (req, res) => {
  try {
    const schoolId = baseDoc(req);
    if (!schoolId) return res.status(400).json({ success: false, message: "School ID required" });
    const items = Array.isArray(req.body) ? req.body : [req.body];
    const teacherId = req.user?.teacher_id || req.user?._id || req.user?.id;
    const created = [];
    for (const it of items) {
      if (!it.questionText || !it.questionType || !it.classId || !it.subjectId) {
        return res.status(400).json({ success: false, message: "questionText, questionType, classId, subjectId are required" });
      }
      const q = await QuestionBank.create({
        schoolId,
        teacherId,
        classId: it.classId,
        className: it.className || "",
        subjectId: it.subjectId,
        subjectName: it.subjectName || "",
        chapterId: it.chapterId || null,
        chapterName: it.chapterName || "",
        questionType: it.questionType,
        questionText: it.questionText,
        options: it.options || [],
        answer: it.answer || "",
        marks: it.marks || 1,
        difficulty: it.difficulty || "Medium",
        tags: it.tags || [],
        source: it.source || "manual",
        paperId: it.paperId || null,
      });
      created.push(q);
    }
    return res.status(201).json({ success: true, data: created, message: `${created.length} question(s) saved to bank` });
  } catch (err) {
    console.error("createQuestions error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const listQuestions = async (req, res) => {
  try {
    const schoolId = baseDoc(req);
    const {
      classId, subjectId, chapterId, questionType, difficulty, teacherId,
      search, page = 1, limit = 50,
    } = req.query;
    const q = { schoolId };
    if (classId) q.classId = classId;
    if (subjectId) q.subjectId = subjectId;
    if (chapterId) q.chapterId = chapterId;
    if (questionType) q.questionType = questionType;
    if (difficulty) q.difficulty = difficulty;
    if (teacherId) q.teacherId = teacherId;
    if (req.user?.role === "teacher_admin") q.teacherId = req.user.teacher_id || req.user.id;
    if (search) q.questionText = { $regex: String(search).trim(), $options: "i" };
    const skip = (Number(page) - 1) * Number(limit);
    const [rows, total] = await Promise.all([
      QuestionBank.find(q).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      QuestionBank.countDocuments(q),
    ]);
    const byType = {};
    for (const r of rows) byType[r.questionType] = (byType[r.questionType] || 0) + 1;
    return res.json({ success: true, data: rows, total, page: Number(page), pages: Math.ceil(total / Number(limit)), byType });
  } catch (err) {
    console.error("listQuestions error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getQuestion = async (req, res) => {
  try {
    const schoolId = baseDoc(req);
    const q = await QuestionBank.findOne({ _id: req.params.id, schoolId }).lean();
    if (!q) return res.status(404).json({ success: false, message: "Question not found" });
    return res.json({ success: true, data: q });
  } catch (err) {
    console.error("getQuestion error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateQuestion = async (req, res) => {
  try {
    const schoolId = baseDoc(req);
    const q = await QuestionBank.findOne({ _id: req.params.id, schoolId });
    if (!q) return res.status(404).json({ success: false, message: "Question not found" });
    const allowed = [
      "questionType", "questionText", "options", "answer", "marks", "difficulty",
      "chapterId", "chapterName", "classId", "className", "subjectId", "subjectName", "tags",
    ];
    for (const key of allowed) if (req.body[key] !== undefined) q[key] = req.body[key];
    await q.save();
    return res.json({ success: true, data: q });
  } catch (err) {
    console.error("updateQuestion error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    const schoolId = baseDoc(req);
    const q = await QuestionBank.findOne({ _id: req.params.id, schoolId });
    if (!q) return res.status(404).json({ success: false, message: "Question not found" });
    if (req.user?.role === "teacher_admin" && String(q.teacherId) !== String(req.user.teacher_id || req.user.id)) {
      return res.status(403).json({ success: false, message: "You can only delete your own questions" });
    }
    await QuestionBank.findByIdAndDelete(q._id);
    return res.json({ success: true, message: "Question deleted" });
  } catch (err) {
    console.error("deleteQuestion error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const importFromPaper = async (req, res) => {
  try {
    const schoolId = baseDoc(req);
    const paper = await ExamPaper.findOne({ _id: req.params.paperId, schoolId }).lean();
    if (!paper) return res.status(404).json({ success: false, message: "Paper not found" });
    const teacherId = req.user?.teacher_id || req.user?._id || req.user?.id;
    let created = 0;
    for (const q of paper.questions || []) {
      const existing = await QuestionBank.findOne({
        schoolId,
        questionText: q.questionText,
        questionType: q.questionType,
        classId: paper.classId,
        subjectId: paper.subjectId,
      }).lean();
      if (existing) continue;
      await QuestionBank.create({
        schoolId,
        teacherId,
        classId: paper.classId,
        className: paper.className,
        subjectId: paper.subjectId,
        subjectName: paper.subjectName,
        chapterId: q.chapterId || null,
        chapterName: q.chapterName || "",
        questionType: q.questionType,
        questionText: q.questionText,
        options: q.options || [],
        answer: q.answer || "",
        marks: q.marks || 1,
        difficulty: q.difficulty || "Medium",
        source: "imported",
        paperId: paper._id,
      });
      created += 1;
    }
    return res.json({ success: true, data: { created }, message: `${created} question(s) imported to bank` });
  } catch (err) {
    console.error("importFromPaper error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const incrementUsage = async (req, res) => {
  try {
    const schoolId = baseDoc(req);
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ success: false, message: "ids required" });
    await QuestionBank.updateMany({ _id: { $in: ids }, schoolId }, { $inc: { usageCount: 1 } });
    return res.json({ success: true, message: `${ids.length} question(s) marked as used` });
  } catch (err) {
    console.error("incrementUsage error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const fetchBankChapters = async (req, res) => {
  try {
    const schoolId = baseDoc(req);
    const { classId, subjectId } = req.query;
    if (!classId || !subjectId) return res.status(400).json({ success: false, message: "classId and subjectId required" });
    const chapters = await Chapter.find({ schoolId, classId, subjectId, status: "active" }).sort({ order: 1 }).lean();
    return res.json({ success: true, data: chapters });
  } catch (err) {
    console.error("fetchBankChapters error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};