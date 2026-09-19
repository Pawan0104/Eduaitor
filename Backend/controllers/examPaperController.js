import ExamPaper from "../models/examPaper.js";
import ExamSchedule from "../models/examSchedule.js";
import Class from "../models/class.js";
import Subject from "../models/subject.js";
import Teacher from "../models/teacher.js";
import Chapter from "../models/chapter.js";
import { createNotificationHelper } from "./notificationController.js";

const BADGE = {
  draft: { bg: "bg-gray-100", text: "text-gray-700", label: "Draft" },
  pending: { bg: "bg-amber-100", text: "text-amber-700", label: "Pending Review" },
  approved: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Approved" },
  rejected: { bg: "bg-red-100", text: "text-red-700", label: "Rejected" },
  revision: { bg: "bg-orange-100", text: "text-orange-700", label: "Revision Required" },
};

const QUESTION_TYPE_LABELS = {
  MCQ: "Multiple Choice",
  OneLiner: "One Liner",
  ShortAnswer: "Short Answer",
  Descriptive: "Descriptive",
  LongAnswer: "Long Answer",
  CaseStudy: "Case Study",
  TrueFalse: "True / False",
  FillBlanks: "Fill in the Blanks",
};

function baseDoc(req) {
  return req.user?.school_id || req.user?.schoolId;
}

function snapshotCurrent(paper) {
  return {
    version: paper.version,
    questions: JSON.parse(JSON.stringify(paper.questions)),
    status: paper.status,
    adminRemarks: paper.adminRemarks,
    createdAt: new Date(),
  };
}

function calcTotals(paper) {
  let total = 0;
  let byType = {};
  for (const q of paper.questions || []) {
    total += q.marks || 0;
    byType[q.questionType] = (byType[q.questionType] || 0) + (q.marks || 0);
  }
  return { total, byType };
}

function difficultyBreakdown(questions) {
  const counts = { Easy: 0, Medium: 0, Hard: 0 };
  for (const q of questions || []) {
    counts[q.difficulty] = (counts[q.difficulty] || 0) + 1;
  }
  const total = questions?.length || 1;
  return {
    counts,
    pct: {
      Easy: Math.round((counts.Easy / total) * 100),
      Medium: Math.round((counts.Medium / total) * 100),
      Hard: Math.round((counts.Hard / total) * 100),
    },
  };
}

function chapterCoverage(questions, chapters) {
  const map = {};
  for (const ch of chapters || []) {
    map[ch.chapterId?.toString() || ch.chapterName] = { name: ch.chapterName, count: 0 };
  }
  for (const q of questions || []) {
    const key = q.chapterId?.toString() || q.chapterName;
    if (map[key]) map[key].count += 1;
  }
  const total = questions?.length || 1;
  return Object.values(map).map((c) => ({ ...c, pct: Math.round((c.count / total) * 100) }));
}

const TYPE_MAP = {
  MCQ: "mcq",
  OneLiner: "oneLiner",
  ShortAnswer: "shortAnswer",
  Descriptive: "descriptive",
  LongAnswer: "longAnswer",
  CaseStudy: "caseStudy",
  TrueFalse: "trueFalse",
  FillBlanks: "fillBlanks",
};

const AI_MAP = {
  mcq: "MCQ",
  oneLiner: "OneLiner",
  shortAnswer: "ShortAnswer",
  descriptive: "Descriptive",
  longAnswer: "LongAnswer",
  caseStudy: "CaseStudy",
  trueFalse: "TrueFalse",
  fillBlanks: "FillBlanks",
};

const computeDurationFromRow = (row) => {
  if (!row?.startTime || !row?.endTime) return { duration: "3 Hours", durationMinutes: 180 };
  const [sh, sm] = String(row.startTime).split(":").map(Number);
  const [eh, em] = String(row.endTime).split(":").map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) return { duration: "3 Hours", durationMinutes: 180 };
  return {
    duration: `${Math.floor(diff / 60)} Hour${diff >= 120 ? "s" : ""}${diff % 60 ? ` ${diff % 60} min` : ""}`,
    durationMinutes: diff,
  };
};

export const createPaper = async (req, res) => {
  try {
    const schoolId = baseDoc(req);
    if (!schoolId) return res.status(400).json({ success: false, message: "School ID required" });
    const {
      examScheduleId, classId, subjectId, teacherId,
      totalMarks, duration, durationMinutes,
      syllabusChapters, questionTypes, questions, status,
    } = req.body;

    if (!examScheduleId) {
      return res.status(400).json({ success: false, message: "Select an exam from the scheduled exams" });
    }
    if (!classId || !subjectId) {
      return res.status(400).json({ success: false, message: "Class and subject are required" });
    }

    const schedule = await ExamSchedule.findOne({ _id: examScheduleId, schoolId }).lean();
    if (!schedule) return res.status(404).json({ success: false, message: "Scheduled exam not found" });
    if (!schedule.publishedAt && schedule.status !== "published") {
      return res.status(400).json({ success: false, message: "Only published schedules can be used to create papers" });
    }

    const row = (schedule.schedule || []).find(
      (r) => String(r.classId) === String(classId) && String(r.subjectId) === String(subjectId)
    );
    const subjectMeta = (schedule.subjects || []).find(
      (s) => String(s.classId) === String(classId) && String(s.subjectId) === String(subjectId)
    );

    const extraTeacherId = req.user?.teacher_id || req.user?._id || req.user?.id;
    const assignedTeacherId = row?.teacherId || subjectMeta?.teacherId || teacherId;
    const resolvedTeacherId = req.user?.role === "teacher_admin" ? extraTeacherId : (teacherId || assignedTeacherId);

    if (req.user?.role === "teacher_admin" && String(resolvedTeacherId) !== String(assignedTeacherId)) {
      return res.status(403).json({ success: false, message: "That subject is not assigned to you in this exam" });
    }
    if (!resolvedTeacherId) {
      return res.status(400).json({ success: false, message: "Teacher must be assigned to this class-subject in the schedule" });
    }

    const cls = await Class.findById(classId).lean();
    const sub = await Subject.findById(subjectId).lean();
    const teach = await Teacher.findById(resolvedTeacherId).lean();
    const d = computeDurationFromRow(row);
    const examDate = row?.date || null;

    const paper = await ExamPaper.create({
      schoolId,
      examScheduleId,
      examName: schedule.examName || "",
      classId,
      className: cls?.name || cls?.className || row?.className || "",
      subjectId,
      subjectName: sub?.name || sub?.subjectName || row?.subjectName || "",
      teacherId: resolvedTeacherId,
      teacherName: teach ? `${teach.firstName || ""} ${teach.lastName || ""}`.trim() : row?.teacherName || "",
      examDate,
      submissionDeadline: schedule.paperSubmissionDeadline || null,
      totalMarks: totalMarks || schedule.paperTotalMarks || 80,
      duration: duration || d.duration,
      durationMinutes: durationMinutes || d.durationMinutes,
      syllabusChapters: syllabusChapters || [],
      questionTypes: questionTypes || [],
      questions: questions || [],
      status: status === "pending" ? "pending" : "draft",
      createdBy: req.user?.id ||
        req.user?._id ||
        null,
    });
    if (paper.status === "pending") {
      paper.submittedAt = new Date();
      await paper.save();
    }
    return res.status(201).json({ success: true, data: paper });
  } catch (err) {
    console.error("createPaper error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getScheduleOptions = async (req, res) => {
  try {
    const schoolId = baseDoc(req);
    const isTeacher = req.user?.role === "teacher_admin";
    const myTeacherId = req.user?.teacher_id || req.user?._id || req.user?.id;

    const schedules = await ExamSchedule.find({ schoolId })
      .sort({ createdAt: -1 })
      .lean();

    const options = [];
    for (const s of schedules) {
      if (!(s.publishedAt || s.status === "published")) continue;
      const existingPapers = await ExamPaper.find({ schoolId, examScheduleId: s._id }).lean();
      const countByKey = new Map();
      for (const p of existingPapers) {
        const key = `${p.classId}-${p.subjectId}`;
        countByKey.set(key, (countByKey.get(key) || 0) + 1);
      }
      const assignments = (s.subjects || []).map((sub) => {
        const row = (s.schedule || []).find(
          (r) => String(r.classId) === String(sub.classId) && String(r.subjectId) === String(sub.subjectId)
        );
        const teacherId = row?.teacherId || sub.teacherId;
        if (isTeacher && myTeacherId && String(teacherId) !== String(myTeacherId)) return null;
        return {
          classId: sub.classId || row?.classId,
          className: sub.className || row?.className || "",
          subjectId: sub.subjectId || row?.subjectId,
          subjectName: sub.subjectName || row?.subjectName || "",
          teacherId,
          examDate: row?.date || null,
          startTime: row?.startTime || s.startTime,
          endTime: row?.endTime || s.endTime,
          durationMinutes: sub.durationMinutes ||
            (row && (() => { const d = computeDurationFromRow(row); return d.durationMinutes; })()) ||
            s.endTime && s.startTime ? (() => { const d = computeDurationFromRow({ startTime: s.startTime, endTime: s.endTime }); return d.durationMinutes; })() : 180,
          paperCount: countByKey.get(`${sub.classId}-${sub.subjectId}`) || 0,
        };
      }).filter(Boolean);

      if (!assignments.length && isTeacher) continue;
      options.push({
        _id: s._id,
        examName: s.examName,
        startDate: s.startDate,
        endDate: s.endDate,
        paperSubmissionDeadline: s.paperSubmissionDeadline || null,
        paperTotalMarks: s.paperTotalMarks || 80,
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status,
        assignments,
      });
    }
    return res.json({ success: true, data: options });
  } catch (err) {
    console.error("getScheduleOptions error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const listPapers = async (req, res) => {
  try {
    const schoolId = baseDoc(req);
    const { classId, subjectId, teacherId, status: statusFilter, examScheduleId, page = 1, limit = 50 } = req.query;
    const q = { schoolId };
    if (classId) q.classId = classId;
    if (subjectId) q.subjectId = subjectId;
    if (teacherId) q.teacherId = teacherId;
    if (examScheduleId) q.examScheduleId = examScheduleId;
    if (statusFilter) q.status = statusFilter;
    if (req.user?.role === "teacher_admin") q.teacherId = req.user.teacher_id || req.user.id;
    const skip = (Number(page) - 1) * Number(limit);
    const [papers, total] = await Promise.all([
      ExamPaper.find(q).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      ExamPaper.countDocuments(q),
    ]);
    return res.json({ success: true, data: papers, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error("listPapers error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getPaper = async (req, res) => {
  try {
    const schoolId = baseDoc(req);
    const paper = await ExamPaper.findOne({ _id: req.params.id, schoolId }).lean();
    if (!paper) return res.status(404).json({ success: false, message: "Paper not found" });
    const totals = calcTotals(paper);
    const difficulty = difficultyBreakdown(paper.questions);
    const coverage = chapterCoverage(paper.questions, paper.syllabusChapters);
    return res.json({ success: true, data: { ...paper, totals, difficulty, coverage } });
  } catch (err) {
    console.error("getPaper error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updatePaper = async (req, res) => {
  try {
    const schoolId = baseDoc(req);
    const paper = await ExamPaper.findOne({ _id: req.params.id, schoolId });
    if (!paper) return res.status(404).json({ success: false, message: "Paper not found" });
    if (paper.status === "approved") {
      return res.status(400).json({ success: false, message: "Cannot edit an approved paper" });
    }
    if (paper.status === "pending" && req.user?.role === "teacher_admin") {
      return res.status(400).json({ success: false, message: "Cannot edit while pending review" });
    }
    const allowed = [
      "totalMarks", "duration", "durationMinutes",
      "syllabusChapters", "questionTypes", "questions", "status",
    ];
    for (const key of allowed) {
      if (req.body[key] !== undefined) paper[key] = req.body[key];
    }
    await paper.save();
    return res.json({ success: true, data: paper });
  } catch (err) {
    console.error("updatePaper error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const submitPaper = async (req, res) => {
  try {
    const schoolId = baseDoc(req);
    const paper = await ExamPaper.findOne({ _id: req.params.id, schoolId });
    if (!paper) return res.status(404).json({ success: false, message: "Paper not found" });
    if (paper.status !== "draft" && paper.status !== "revision" && paper.status !== "rejected") {
      return res.status(400).json({ success: false, message: `Cannot submit paper with status "${paper.status}"` });
    }
    if (req.user?.role === "teacher_admin" && paper.submissionDeadline && new Date(paper.submissionDeadline) < new Date()) {
      return res.status(400).json({ success: false, message: "Submission deadline has passed. Contact the administrator to reopen the deadline." });
    }
    if (!paper.questions.length) {
      return res.status(400).json({ success: false, message: "Add at least one question before submitting" });
    }
    paper.status = "pending";
    paper.submittedAt = new Date();
    paper.adminRemarks = "";
    await paper.save();
    return res.json({ success: true, data: paper });
  } catch (err) {
    console.error("submitPaper error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const approvePaper = async (req, res) => {
  try {
    const schoolId = baseDoc(req);
    const paper = await ExamPaper.findOne({ _id: req.params.id, schoolId });
    if (!paper) return res.status(404).json({ success: false, message: "Paper not found" });
    if (paper.status !== "pending") {
      return res.status(400).json({ success: false, message: "Only pending papers can be approved" });
    }
    if (paper.questions.length) paper.versions.push(snapshotCurrent(paper));
    paper.status = "approved";
    paper.approvedAt = new Date();
    paper.approvedBy = req.user?.id || null;
    paper.adminRemarks = req.body.remarks || "";
    paper.version += 1;
    await paper.save();
    try {
      await createNotificationHelper({
        title: "Exam Paper Approved",
        message: `Your ${paper.subjectName} paper for ${paper.className} (${paper.examName}) has been approved.`,
        notificationType: "exam",
        createdBy: req.user?.id,
        schoolId,
        targets: [{ type: "teacher", teacherId: paper.teacherId }],
      });
    } catch (_) { /* non-critical */ }
    return res.json({ success: true, data: paper });
  } catch (err) {
    console.error("approvePaper error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const rejectPaper = async (req, res) => {
  try {
    const schoolId = baseDoc(req);
    const paper = await ExamPaper.findOne({ _id: req.params.id, schoolId });
    if (!paper) return res.status(404).json({ success: false, message: "Paper not found" });
    if (paper.status !== "pending") {
      return res.status(400).json({ success: false, message: "Only pending papers can be rejected" });
    }
    paper.status = "rejected";
    paper.rejectedAt = new Date();
    paper.adminRemarks = req.body.remarks || "Rejected by admin";
    await paper.save();
    try {
      await createNotificationHelper({
        title: "Exam Paper Rejected",
        message: `Your ${paper.subjectName} paper for ${paper.className} (${paper.examName}) has been rejected. Reason: ${paper.adminRemarks}`,
        notificationType: "exam",
        createdBy: req.user?.id,
        schoolId,
        targets: [{ type: "teacher", teacherId: paper.teacherId }],
      });
    } catch (_) { /* non-critical */ }
    return res.json({ success: true, data: paper });
  } catch (err) {
    console.error("rejectPaper error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const requestRevision = async (req, res) => {
  try {
    const schoolId = baseDoc(req);
    const paper = await ExamPaper.findOne({ _id: req.params.id, schoolId });
    if (!paper) return res.status(404).json({ success: false, message: "Paper not found" });
    if (paper.status !== "pending") {
      return res.status(400).json({ success: false, message: "Only pending papers can be sent for revision" });
    }
    paper.status = "revision";
    paper.adminRemarks = req.body.remarks || "Please revise and resubmit";
    await paper.save();
    try {
      await createNotificationHelper({
        title: "Exam Paper — Revision Required",
        message: `Your ${paper.subjectName} paper for ${paper.className} (${paper.examName}) needs revision. Remarks: ${paper.adminRemarks}`,
        notificationType: "exam",
        createdBy: req.user?.id,
        schoolId,
        targets: [{ type: "teacher", teacherId: paper.teacherId }],
      });
    } catch (_) { /* non-critical */ }
    return res.json({ success: true, data: paper });
  } catch (err) {
    console.error("requestRevision error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deletePaper = async (req, res) => {
  try {
    const schoolId = baseDoc(req);
    const paper = await ExamPaper.findOne({ _id: req.params.id, schoolId });
    if (!paper) return res.status(404).json({ success: false, message: "Paper not found" });
    if (paper.status === "approved") {
      return res.status(400).json({ success: false, message: "Cannot delete an approved paper" });
    }
    await ExamPaper.findByIdAndDelete(paper._id);
    return res.json({ success: true, message: "Paper deleted" });
  } catch (err) {
    console.error("deletePaper error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const fetchChapters = async (req, res) => {
  try {
    const schoolId = baseDoc(req);
    const { classId, subjectId } = req.query;
    if (!classId || !subjectId) {
      return res.status(400).json({ success: false, message: "classId and subjectId required" });
    }
    const chapters = await Chapter.find({ schoolId, classId, subjectId, status: "active" })
      .sort({ order: 1 })
      .lean();
    return res.json({ success: true, data: chapters });
  } catch (err) {
    console.error("fetchChapters error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const MAX_AI_QUESTIONS_PER_CALL = 8;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const buildPaperAIPrompt = ({ className, subjectName, chapterLine, typesLine, difficulty }) => `
You are an experienced school exam paper setter for ${className} grade.

Generate exam questions for:
Subject: ${subjectName}
Chapters: ${chapterLine}
Question breakdown: ${typesLine}
Difficulty: ${difficulty || "Mixed"}

For each question, include:
- questionType: MCQ | OneLiner | ShortAnswer | Descriptive | LongAnswer | CaseStudy | TrueFalse | FillBlanks
- questionText: the question
- options: array of strings for MCQ (4 options), empty array for others
- answer: model answer
- marks: marks for this question
- difficulty: Easy | Medium | Hard

Return ONLY valid JSON (no markdown):
{
  "questions": [
    {
      "questionType": "MCQ",
      "questionText": "What is the capital of India?",
      "options": ["Mumbai", "Delhi", "Kolkata", "Chennai"],
      "answer": "Delhi",
      "marks": 1,
      "difficulty": "Easy"
    }
  ]
}`;

const parsePaperAIQuestions = (aiResponse) => {
  let cleaned = String(aiResponse || "").replace(/```json|```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    const validTypes = ["MCQ", "OneLiner", "ShortAnswer", "Descriptive", "LongAnswer", "CaseStudy", "TrueFalse", "FillBlanks"];
    const questions = (parsed.questions || []).map((q) => ({
      questionType: validTypes.includes(q.questionType) ? q.questionType : "ShortAnswer",
      questionText: q.questionText || "",
      options: Array.isArray(q.options) ? q.options : [],
      answer: q.answer || "",
      marks: Number(q.marks) || 1,
      difficulty: ["Easy", "Medium", "Hard"].includes(q.difficulty) ? q.difficulty : "Medium",
      chapterName: q.chapterName || "",
      chapterId: null,
    }));
    return questions.length ? questions : null;
  } catch (_) {
    return null;
  }
};

export const generateAIQuestions = async (req, res) => {
  try {
    const { className, subjectName, chapters, questionTypes, difficulty, count } = req.body;
    if (!className || !subjectName) {
      return res.status(400).json({ success: false, message: "className and subjectName required" });
    }
    const { callAI } = await import("../services/aiService.js");
    const chapterLine = chapters?.length ? chapters.join(", ") : "all chapters";

    // Flatten user requests into per-question specs, then chunk so free models
    // are never asked for a huge JSON in one call (output truncation risk).
    const specs = [];
    if (questionTypes?.length) {
      for (const t of questionTypes) {
        const n = Math.max(0, Number(t.count) || 0);
        for (let i = 0; i < n; i++) specs.push({ type: t.type, marksEach: Number(t.marksEach) || 1 });
      }
    } else {
      const n = Math.max(0, Number(count) || 5);
      for (let i = 0; i < n; i++) specs.push({ type: "MCQ", marksEach: 1 });
    }

    if (!specs.length) {
      return res.status(400).json({ success: false, message: "questionTypes with count > 0 required" });
    }

    const chunks = [];
    for (let i = 0; i < specs.length; i += MAX_AI_QUESTIONS_PER_CALL) {
      const part = specs.slice(i, i + MAX_AI_QUESTIONS_PER_CALL);
      const counts = {};
      for (const s of part) {
        if (!counts[s.type]) counts[s.type] = { count: 0, marksEach: s.marksEach };
        counts[s.type].count += 1;
      }
      chunks.push(Object.entries(counts).map(([type, c]) => `${c.count} ${type} (${c.marksEach} marks each)`).join(", "));
    }

    let allQuestions = [];
    for (let ci = 0; ci < chunks.length; ci++) {
      const chunkLine = chunks[ci];
      let chunkQs = null;
      for (let attempt = 1; attempt <= 3 && !chunkQs; attempt++) {
        const prompt = buildPaperAIPrompt({ className, subjectName, chapterLine, typesLine: chunkLine, difficulty });
        const aiResponse = await callAI(prompt);
        chunkQs = parsePaperAIQuestions(aiResponse);
        if (!chunkQs && attempt < 3) {
          console.log(`AI chunk ${ci + 1}/${chunks.length} parse failed, retrying (${attempt}/3)`);
          await sleep(600);
        }
      }
      if (!chunkQs) {
        return res.status(500).json({
          success: false,
          message: `AI returned invalid JSON for part ${ci + 1} of ${chunks.length}. Please try fewer questions.`,
        });
      }
      allQuestions = allQuestions.concat(chunkQs);
    }

    if (!allQuestions.length) return res.status(500).json({ success: false, message: "AI returned no questions" });
    return res.json({ success: true, data: allQuestions });
  } catch (err) {
    console.error("generateAIQuestions error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getAnalytics = async (req, res) => {
  try {
    const schoolId = baseDoc(req);
    const { examScheduleId } = req.query;
    const q = { schoolId };
    if (examScheduleId) q.examScheduleId = examScheduleId;
    const all = await ExamPaper.find(q).lean();
    const total = all.length;
    const byStatus = { draft: 0, pending: 0, approved: 0, rejected: 0, revision: 0 };
    const byClass = {};
    const bySubject = {};
    const byTeacher = {};
    for (const p of all) {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
      byClass[p.className || "Unknown"] = (byClass[p.className || "Unknown"] || 0) + 1;
      bySubject[p.subjectName || "Unknown"] = (bySubject[p.subjectName || "Unknown"] || 0) + 1;
      byTeacher[p.teacherName || "Unknown"] = (byTeacher[p.teacherName || "Unknown"] || 0) + 1;
    }
    return res.json({
      success: true,
      data: { total, byStatus, byClass, bySubject, byTeacher, approvalRate: total ? Math.round((byStatus.approved / total) * 100) : 0 },
    });
  } catch (err) {
    console.error("getAnalytics error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createPapersFromSchedule = async (req, res) => {
  try {
    const schoolId = baseDoc(req);
    const schedule = await ExamSchedule.findOne({ _id: req.params.id, schoolId });
    if (!schedule) return res.status(404).json({ success: false, message: "Schedule not found" });
    if (schedule.status !== "published") {
      return res.status(400).json({ success: false, message: "Only published schedules can create papers" });
    }
    const existing = await ExamPaper.countDocuments({ examScheduleId: schedule._id, schoolId });
    if (existing > 0) {
      return res.status(400).json({ success: false, message: `${existing} paper(s) already exist for this schedule. Delete them first to recreate.` });
    }
    const seen = new Set();
    const papers = [];
    for (const row of schedule.schedule || []) {
      const key = `${row.classId}-${row.subjectId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const cls = await Class.findById(row.classId).lean().catch(() => null);
      const sub = await Subject.findById(row.subjectId).lean().catch(() => null);
      const teach = await Teacher.findById(row.teacherId).lean().catch(() => null);
      const paper = await ExamPaper.create({
        schoolId,
        examScheduleId: schedule._id,
        examName: schedule.name || schedule.examName || "",
        classId: row.classId,
        className: cls?.name || cls?.className || row.className || "",
        subjectId: row.subjectId,
        subjectName: sub?.name || sub?.subjectName || row.subjectName || "",
        teacherId: row.teacherId,
        teacherName: teach ? `${teach.firstName || ""} ${teach.lastName || ""}`.trim() : row.teacherName || "",
        examDate: row.date,
        submissionDeadline: schedule.paperSubmissionDeadline || null,
        totalMarks: schedule.paperTotalMarks || 80,
        duration: row.endTime && row.startTime ? (() => { const [sh, sm] = row.startTime.split(":").map(Number); const [eh, em] = row.endTime.split(":").map(Number); const diff = (eh * 60 + em) - (sh * 60 + sm); return diff > 0 ? `${Math.floor(diff / 60)} Hour${diff > 60 ? "s" : ""}${diff % 60 ? ` ${diff % 60} min` : ""}` : "3 Hours"; })() : "3 Hours",
        durationMinutes: row.endTime && row.startTime ? (() => { const [sh, sm] = row.startTime.split(":").map(Number); const [eh, em] = row.endTime.split(":").map(Number); return Math.max(30, (eh * 60 + em) - (sh * 60 + sm)); })() : 180,
        status: "draft",
      });
      papers.push(paper);
    }
    if (papers.length) {
      try {
        const teacherIds = [...new Set(papers.map((p) => p.teacherId.toString()))];
        for (const tid of teacherIds) {
          const teacherPapers = papers.filter((p) => p.teacherId.toString() === tid);
          await createNotificationHelper({
            title: "New Paper Creation Task Assigned",
            message: `You have been assigned ${teacherPapers.length} exam paper(s) for "${schedule.name || schedule.examName}". Please prepare and submit.`,
            notificationType: "exam",
            createdBy: req.user?.id,
            schoolId,
            targets: [{ type: "teacher", teacherId: tid }],
          });
        }
      } catch (_) { /* non-critical */ }
    }
    return res.json({ success: true, data: papers, message: `${papers.length} paper(s) created from schedule` });
  } catch (err) {
    console.error("createPapersFromSchedule error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
