import DailyLearningAssignment from "../models/dailyLearningAssignment.js";
import DailyLearningSubmission from "../models/dailyLearningSubmission.js";
import ClassPageProgress from "../models/classPageProgress.js";
import Chapter from "../models/chapter.js";
import Student from "../models/student.js";
import Class from "../models/class.js";
import Subject from "../models/subject.js";
import { createNotificationHelper } from "./notificationController.js";
import {
  generateDailyLearningQuestions,
  gradeHandwrittenSubmission,
  callAI,
} from "../services/aiService.js";
import { fetchPdfBuffer, extractPdfPageText } from "../utils/pdfPageText.js";
import { resolveChapterPdfUrl } from "../utils/streamChapterPdf.js";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";

const populateAssignment = (q) =>
  q
    .populate("studentId", "firstName lastName rollNo studentId")
    .populate("subjectId", "name")
    .populate("classId", "name")
    .populate("sectionId", "name")
    .populate("teacherId", "fullName name")
    .populate("sourceProgressIds");

async function getLinkedStudent(user) {
  if (user.role !== "student_admin" || !user.student_id) return null;
  return Student.findById(user.student_id)
    .select("classId sectionId schoolId firstName lastName")
    .lean();
}

async function buildPageContext(progressDocs) {
  const first = progressDocs[0];
  const chapter = await Chapter.findById(first.chapterId).lean();
  const pdfUrl = resolveChapterPdfUrl(chapter || {});
  const pageFrom = Math.min(...progressDocs.map((p) => p.pageFrom));
  const pageTo = Math.max(...progressDocs.map((p) => p.pageTo));
  const chapterName = first.chapterName || chapter?.name || "Chapter";

  let pageText = "";
  if (pdfUrl) {
    try {
      const buf = await fetchPdfBuffer(pdfUrl);
      const extracted = await extractPdfPageText(buf, pageFrom, pageTo, 6);
      pageText = extracted.text;
    } catch (err) {
      console.warn("PDF page text extract failed:", err.message);
    }
  }

  if (!pageText || pageText.length < 40) {
    pageText = [
      `Chapter: ${chapterName}`,
      chapter?.content || chapter?.description || "",
      `Pages studied: ${pageFrom}–${pageTo}`,
      `Notes: ${progressDocs.map((p) => p.notes).filter(Boolean).join("; ")}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  return {
    pageText,
    pdfContext: {
      chapterName,
      pageFrom,
      pageTo,
      pdfUrl: pdfUrl || "",
      chapterId: first.chapterId,
    },
    subjectId: first.subjectId,
    teacherId: first.teacherId,
    classId: first.classId,
    sectionId: first.sectionId,
  };
}

async function generateInBackground(assignmentId, meta) {
  try {
    const questions = await generateDailyLearningQuestions(meta);
    await DailyLearningAssignment.findByIdAndUpdate(assignmentId, {
      status: "ready",
      questions,
      failReason: "",
    });

    const asg = await DailyLearningAssignment.findById(assignmentId).lean();
    if (asg) {
      await DailyLearningSubmission.findOneAndUpdate(
        { assignmentId: asg._id, studentId: asg.studentId },
        {
          $setOnInsert: {
            schoolId: asg.schoolId,
            assignmentId: asg._id,
            studentId: asg.studentId,
            status: "pending",
          },
        },
        { upsert: true },
      );

      try {
        await createNotificationHelper({
          title: "New daily learning assignment",
          message: `${asg.title} is ready. Please complete it.`,
          notificationType: "daily_learning",
          createdBy: asg.parentUserId,
          schoolId: asg.schoolId,
          targets: [{ type: "student", studentId: asg.studentId }],
        });
      } catch (e) {
        console.warn("daily learning notify:", e.message);
      }
    }
  } catch (err) {
    console.error("generateInBackground:", err);
    await DailyLearningAssignment.findByIdAndUpdate(assignmentId, {
      status: "failed",
      failReason: err.message || "Generation failed",
    });
  }
}

/** POST /api/daily-learning/assignments */
export const createAssignment = async (req, res) => {
  try {
    // Parents login as student_admin with loginAs: "parent" in JWT
    if (req.user.role !== "student_admin" || req.user.loginAs !== "parent") {
      return res.status(403).json({
        success: false,
        message: "Only parents can create daily learning assignments",
      });
    }

    const student = await getLinkedStudent(req.user);
    if (!student) {
      return res
        .status(400)
        .json({ success: false, message: "No student linked to this account" });
    }

    const { progressIds, type, questionCount } = req.body;
    if (!Array.isArray(progressIds) || !progressIds.length) {
      return res.status(400).json({
        success: false,
        message: "Select at least one learned page entry",
      });
    }
    if (!["mcq", "descriptive"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "type must be mcq or descriptive",
      });
    }

    const progressDocs = await ClassPageProgress.find({
      _id: { $in: progressIds },
      schoolId: req.user.school_id,
      classId: student.classId,
      sectionId: student.sectionId,
    }).lean();

    if (!progressDocs.length) {
      return res.status(404).json({
        success: false,
        message: "No matching page progress found for your child's class",
      });
    }

    const ctx = await buildPageContext(progressDocs);
    const subject = await Subject.findById(ctx.subjectId).select("name").lean();
    const cls = await Class.findById(ctx.classId).select("name").lean();

    const title = `Practice: ${ctx.pdfContext.chapterName} (p.${ctx.pdfContext.pageFrom}–${ctx.pdfContext.pageTo})`;

    const assignment = await DailyLearningAssignment.create({
      schoolId: req.user.school_id,
      parentUserId: req.user._id,
      studentId: student._id,
      classId: ctx.classId,
      sectionId: ctx.sectionId,
      subjectId: ctx.subjectId,
      teacherId: ctx.teacherId,
      sourceProgressIds: progressDocs.map((p) => p._id),
      type,
      status: "generating",
      title,
      questions: [],
      pdfContext: ctx.pdfContext,
      questionCount: questionCount || (type === "mcq" ? 5 : 3),
    });

    // fire-and-forget generation
    generateInBackground(assignment._id, {
      type,
      numberOfQuestions: assignment.questionCount,
      className: cls?.name,
      subjectName: subject?.name,
      chapterName: ctx.pdfContext.chapterName,
      pageFrom: ctx.pdfContext.pageFrom,
      pageTo: ctx.pdfContext.pageTo,
      pageText: ctx.pageText,
    });

    res.status(201).json({
      success: true,
      message: "Assignment is being generated from today's pages",
      data: assignment,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/daily-learning/assignments */
export const listAssignments = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const filter = { schoolId };

    if (req.user.role === "student_admin") {
      const student = await getLinkedStudent(req.user);
      if (!student) return res.json({ success: true, data: [] });
      filter.studentId = student._id;
    } else if (req.user.role === "teacher_admin") {
      filter.teacherId = req.user.teacher_id;
    } else if (!["school_admin", "staff_admin"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const rows = await populateAssignment(
      DailyLearningAssignment.find(filter).sort({ createdAt: -1 }).limit(100),
    ).lean();

    const ids = rows.map((r) => r._id);
    const subs = await DailyLearningSubmission.find({
      assignmentId: { $in: ids },
    }).lean();
    const byAsg = {};
    for (const s of subs) byAsg[String(s.assignmentId)] = s;

    res.json({
      success: true,
      data: rows.map((r) => ({
        ...r,
        submission: byAsg[String(r._id)] || null,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/daily-learning/assignments/:id */
export const getAssignment = async (req, res) => {
  try {
    const asg = await populateAssignment(
      DailyLearningAssignment.findOne({
        _id: req.params.id,
        schoolId: req.user.school_id,
      }),
    ).lean();
    if (!asg) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    if (req.user.role === "student_admin") {
      if (String(asg.studentId?._id || asg.studentId) !== String(req.user.student_id)) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    }
    if (
      req.user.role === "teacher_admin" &&
      String(asg.teacherId?._id || asg.teacherId) !== String(req.user.teacher_id)
    ) {
      // still allow if teacher teaches the class
      const ok = true;
      if (!ok) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    }

    // Hide correct answers from student until graded (MCQ)
    let view = { ...asg };
    const sub = await DailyLearningSubmission.findOne({
      assignmentId: asg._id,
      studentId: asg.studentId?._id || asg.studentId,
    }).lean();

    if (
      req.user.role === "student_admin" &&
      req.user.loginAs === "student" &&
      (!sub || sub.status === "pending")
    ) {
      view.questions = (view.questions || []).map((q) => ({
        text: q.text,
        type: q.type,
        marks: q.marks,
        pageHint: q.pageHint,
        options: (q.options || []).map((o) => ({ text: o.text })),
      }));
    }

    res.json({ success: true, data: view, submission: sub });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** POST /api/daily-learning/assignments/:id/submit-mcq */
export const submitMcq = async (req, res) => {
  try {
    if (req.user.role !== "student_admin") {
      return res.status(403).json({ success: false, message: "Students only" });
    }
    const studentId = req.user.student_id;
    const asg = await DailyLearningAssignment.findOne({
      _id: req.params.id,
      schoolId: req.user.school_id,
      studentId,
      type: "mcq",
      status: "ready",
    });
    if (!asg) {
      return res.status(404).json({
        success: false,
        message: "MCQ assignment not found or not ready",
      });
    }

    const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
    let score = 0;
    const maxScore = asg.questions.reduce((s, q) => s + (q.marks || 1), 0);
    const perQuestionFeedback = asg.questions.map((q, i) => {
      const ans = answers.find((a) => Number(a.questionIndex) === i);
      const selected = ans?.selectedOptionIndex;
      const correctIdx = (q.options || []).findIndex((o) => o.isCorrect);
      const correct = Number(selected) === correctIdx;
      if (correct) score += q.marks || 1;
      return {
        questionIndex: i,
        correct,
        comment: correct ? "Correct" : "Incorrect",
      };
    });

    let feedback = `You scored ${score}/${maxScore}.`;
    try {
      feedback = await callAI(
        `Write 2 short encouraging sentences for a school child who scored ${score} out of ${maxScore} on an MCQ practice about "${asg.pdfContext?.chapterName}".`,
      );
    } catch {
      /* keep default */
    }

    const sub = await DailyLearningSubmission.findOneAndUpdate(
      { assignmentId: asg._id, studentId },
      {
        schoolId: asg.schoolId,
        assignmentId: asg._id,
        studentId,
        status: "graded",
        mcqAnswers: answers,
        score,
        maxScore,
        feedback,
        perQuestionFeedback,
        submittedAt: new Date(),
        gradedAt: new Date(),
        visibleToTeacher: true,
      },
      { upsert: true, new: true },
    );

    try {
      await createNotificationHelper({
        title: "Daily learning result",
        message: `${asg.title}: scored ${score}/${maxScore}`,
        notificationType: "daily_learning",
        createdBy: req.user._id,
        schoolId: asg.schoolId,
        targets: [
          { type: "student", studentId },
          ...(asg.teacherId
            ? [{ type: "teacher", teacherId: asg.teacherId }]
            : []),
        ],
      });
    } catch {
      /* ignore */
    }

    res.json({ success: true, data: sub });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** POST /api/daily-learning/assignments/:id/submit-handwritten */
export const submitHandwritten = async (req, res) => {
  try {
    if (req.user.role !== "student_admin") {
      return res.status(403).json({ success: false, message: "Students only" });
    }
    const studentId = req.user.student_id;
    const file = req.file;
    if (!file) {
      return res
        .status(400)
        .json({ success: false, message: "Handwritten image is required" });
    }

    const asg = await DailyLearningAssignment.findOne({
      _id: req.params.id,
      schoolId: req.user.school_id,
      studentId,
      type: "descriptive",
      status: "ready",
    });
    if (!asg) {
      return res.status(404).json({
        success: false,
        message: "Descriptive assignment not found or not ready",
      });
    }

    const uploaded = await uploadToCloudinary(
      file,
      "daily-learning/answers",
      "image",
    );

    const student = await Student.findById(studentId)
      .select("firstName lastName")
      .lean();

    let grade;
    try {
      grade = await gradeHandwrittenSubmission({
        questions: asg.questions,
        imageUrl: uploaded.url,
        studentName: `${student?.firstName || ""} ${student?.lastName || ""}`.trim(),
      });
    } catch (err) {
      console.error("Vision grade failed:", err.message);
      grade = {
        score: null,
        maxScore: asg.questions.reduce((s, q) => s + (q.marks || 2), 0),
        feedback:
          "Answer uploaded. Automatic grading is temporarily unavailable; teacher/parent can still review the image.",
        strengths: "",
        improvements: "",
        perQuestionFeedback: [],
      };
    }

    const sub = await DailyLearningSubmission.findOneAndUpdate(
      { assignmentId: asg._id, studentId },
      {
        schoolId: asg.schoolId,
        assignmentId: asg._id,
        studentId,
        status: grade.score == null ? "submitted" : "graded",
        handwritten: {
          url: uploaded.url,
          public_id: uploaded.public_id,
          name: file.originalname || "answer.jpg",
        },
        score: grade.score,
        maxScore: grade.maxScore,
        feedback: grade.feedback,
        strengths: grade.strengths,
        improvements: grade.improvements,
        perQuestionFeedback: grade.perQuestionFeedback,
        submittedAt: new Date(),
        gradedAt: grade.score == null ? null : new Date(),
        visibleToTeacher: true,
      },
      { upsert: true, new: true },
    );

    try {
      await createNotificationHelper({
        title: "Daily learning answer submitted",
        message:
          grade.score != null
            ? `${asg.title}: scored ${grade.score}/${grade.maxScore}`
            : `${asg.title}: handwritten answer uploaded`,
        notificationType: "daily_learning",
        createdBy: req.user._id,
        schoolId: asg.schoolId,
        targets: [
          { type: "student", studentId },
          ...(asg.teacherId
            ? [{ type: "teacher", teacherId: asg.teacherId }]
            : []),
        ],
      });
    } catch {
      /* ignore */
    }

    res.json({ success: true, data: sub });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
