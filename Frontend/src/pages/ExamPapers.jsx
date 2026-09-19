import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import {
  FaPlus, FaSearch, FaFilter, FaEye, FaEdit, FaTrash, FaCheck, FaTimes,
  FaPaperPlane, FaFilePdf, FaRobot, FaBook, FaClipboardList, FaChartBar,
  FaClock, FaExclamationTriangle, FaChevronRight, FaChevronLeft, FaCheckCircle,
  FaTimesCircle, FaInfoCircle, FaStar, FaDownload, FaPrint,
} from "react-icons/fa";

const API = import.meta.env.VITE_API_URL;

const STATUSES = {
  draft: { bg: "bg-gray-100", text: "text-gray-700", label: "Draft", icon: FaEdit },
  pending: { bg: "bg-amber-100", text: "text-amber-700", label: "Pending Review", icon: FaClock },
  approved: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Approved", icon: FaCheckCircle },
  rejected: { bg: "bg-red-100", text: "text-red-700", label: "Rejected", icon: FaTimesCircle },
  revision: { bg: "bg-orange-100", text: "text-orange-700", label: "Revision Required", icon: FaExclamationTriangle },
};

const QUESTION_TYPES = [
  { key: "MCQ", label: "MCQ", icon: "◉" },
  { key: "OneLiner", label: "One Liner", icon: "—" },
  { key: "ShortAnswer", label: "Short Answer", icon: "¶" },
  { key: "LongAnswer", label: "Long Answer", icon: "❝" },
  { key: "CaseStudy", label: "Case Study", icon: "📋" },
  { key: "TrueFalse", label: "True / False", icon: "⊘" },
  { key: "FillBlanks", label: "Fill in Blanks", icon: "___" },
];

/* "Descriptive" was a duplicate of "Long Answer" — keep a single canonical key */
const TYPE_ALIAS = { Descriptive: "LongAnswer" };
const normalizeType = (k) => TYPE_ALIAS[k] || k;
function typeLabel(k) {
  return QUESTION_TYPES.find((t) => t.key === normalizeType(k))?.label || k;
}

const DIFFICULTIES = ["Easy", "Medium", "Hard"];

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function deadlineInfo(d) {
  if (!d) return null;
  const ms = new Date(d).getTime() - Date.now();
  const days = Math.ceil(ms / 86400000);
  return { days, overdue: ms < 0 };
}

/* ── wizard draft persistence (survives refresh / hard refresh) ── */
const PAPER_DRAFT_PREFIX = "eduaitor:exam-paper-wizard:";
const STEP_MAX = 7; // 8 STEPS, 0-indexed

const paperDraftKey = (userId) => `${PAPER_DRAFT_PREFIX}${userId || "anon"}`;

const loadPaperDraft = (userId) => {
  try {
    const raw = localStorage.getItem(paperDraftKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.paper !== "object") return null;
    return {
      step: Number.isFinite(Number(parsed.step))
        ? Math.min(STEP_MAX, Math.max(0, Number(parsed.step)))
        : 0,
      paper: parsed.paper,
      aiCount: parsed.aiCount && typeof parsed.aiCount === "object" ? parsed.aiCount : null,
      aiDifficulty: typeof parsed.aiDifficulty === "string" ? parsed.aiDifficulty : "Medium",
      assignment: typeof parsed.assignment === "string" ? parsed.assignment : "",
      savedAt: parsed.savedAt || 0,
    };
  } catch {
    return null;
  }
};

const savePaperDraft = (userId, data) => {
  try {
    localStorage.setItem(paperDraftKey(userId), JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch {
    /* ignore quota / private mode */
  }
};

const clearPaperDraft = (userId) => {
  try {
    localStorage.removeItem(paperDraftKey(userId));
  } catch {
    /* ignore */
  }
};

export default function ExamPapers() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher_admin";
  const isAdmin = ["school_admin", "staff_admin", "super_admin"].includes(user?.role);

  const [view, setView] = useState("list");
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [filters, setFilters] = useState({ classId: "", subjectId: "", status: "", search: "" });

  const [wizardStep, setWizardStep] = useState(0);
  const [draftReady, setDraftReady] = useState(false);
  const [paper, setPaper] = useState(emptyPaper());
  const [chapters, setChapters] = useState([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCount, setAiCount] = useState({ MCQ: 10, OneLiner: 5, ShortAnswer: 3, LongAnswer: 2 });
  const [aiDifficulty, setAiDifficulty] = useState("Medium");

  const [detailPaper, setDetailPaper] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [reviewModal, setReviewModal] = useState(null);
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [reviewAction, setReviewAction] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [scheduleOptions, setScheduleOptions] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [assignment, setAssignment] = useState("");
  const [preselectKey, setPreselectKey] = useState("");

  function emptyPaper() {
    return {
      examScheduleId: "", examName: "", classId: "", subjectId: "", teacherId: user?.id || "",
      examDate: "", totalMarks: 80, duration: "3 Hours", durationMinutes: 180, submissionDeadline: null,
      syllabusChapters: [], questionTypes: [],
      questions: [], status: "draft",
    };
  }

  const applyAssignment = useCallback((sch, asg) => {
    if (!asg) return;
    const d = computeDuration(asg.startTime, asg.endTime);
    setPaper((prev) => ({
      ...prev,
      examScheduleId: sch._id,
      examName: sch.examName,
      classId: asg.classId,
      subjectId: asg.subjectId,
      teacherId: asg.teacherId || user?.id,
      examDate: asg.examDate ? String(asg.examDate).slice(0, 10) : "",
      durationMinutes: asg.durationMinutes || d.durationMinutes,
      duration: d.duration,
      totalMarks: prev._id ? prev.totalMarks : (sch.paperTotalMarks || 80),
      submissionDeadline: sch.paperSubmissionDeadline || null,
    }));
    setAssignment(`${sch._id}::${asg.classId}::${asg.subjectId}`);
  }, [user?.id]);

  function computeDuration(s, e) {
    if (!s || !e) return { duration: "3 Hours", durationMinutes: 180 };
    const [sh, sm] = String(s).split(":").map(Number);
    const [eh, em] = String(e).split(":").map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff <= 0) return { duration: "3 Hours", durationMinutes: 180 };
    return {
      duration: `${Math.floor(diff / 60)} Hour${diff >= 120 ? "s" : ""}${diff % 60 ? ` ${diff % 60} min` : ""}`,
      durationMinutes: diff,
    };
  }

  const fetchPapers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.classId) params.set("classId", filters.classId);
      if (filters.subjectId) params.set("subjectId", filters.subjectId);
      if (filters.status) params.set("status", filters.status);
      if (isTeacher) params.set("teacherId", user?.id);
      const { data } = await axios.get(`${API}/exam-papers/list?${params}`, { withCredentials: true });
      let list = data.data || [];
      if (filters.search) {
        const s = filters.search.toLowerCase();
        list = list.filter((p) =>
          (p.examName || "").toLowerCase().includes(s) ||
          (p.className || "").toLowerCase().includes(s) ||
          (p.subjectName || "").toLowerCase().includes(s) ||
          (p.teacherName || "").toLowerCase().includes(s)
        );
      }
      setPapers(list);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load papers");
    } finally {
      setLoading(false);
    }
  }, [filters, isTeacher, user?.id]);

  useEffect(() => { fetchPapers(); }, [fetchPapers]);

  useEffect(() => {
    (async () => {
      try {
        const [clsRes, subRes] = await Promise.all([
          axios.get(`${API}/classes/all`, { withCredentials: true }),
          axios.get(`${API}/subjects/all`, { withCredentials: true }),
        ]);
        setClasses(clsRes.data.classes || []);
        setSubjects(subRes.data.subjects || []);
      } catch (err) { console.error(err); }
    })();
  }, []);

  useEffect(() => {
    if (view === "analytics" && isAdmin) {
      (async () => {
        setAnalyticsLoading(true);
        try {
          const { data } = await axios.get(`${API}/exam-papers/analytics`, { withCredentials: true });
          setAnalytics(data.data);
        } catch (err) { console.error(err); } finally { setAnalyticsLoading(false); }
      })();
    }
  }, [view, isAdmin]);

  useEffect(() => {
    if (view === "fromSchedule") {
      (async () => {
        try {
          const { data } = await axios.get(`${API}/exam-schedule/list`, { withCredentials: true });
          setSchedules(data.data || []);
        } catch (err) { console.error(err); }
      })();
    }
  }, [view]);

  /* RESTORE WIZARD DRAFT after auth resolves */
  useEffect(() => {
    if (!user || !user.id) {
      setDraftReady(true);
      return;
    }
    const draft = loadPaperDraft(user.id);
    if (draft) {
      setWizardStep(draft.step);
      setPaper((prev) => ({
        ...prev,
        ...draft.paper,
        syllabusChapters: Array.isArray(draft.paper.syllabusChapters) ? draft.paper.syllabusChapters : [],
        questionTypes: Array.isArray(draft.paper.questionTypes) ? draft.paper.questionTypes : [],
        questions: Array.isArray(draft.paper.questions) ? draft.paper.questions : [],
      }));
      if (draft.aiCount) setAiCount(draft.aiCount);
      setAiDifficulty(draft.aiDifficulty);
      setAssignment(draft.assignment);
      if (draft.step > 0) {
        setView("create");
        toast.info("Restored your in-progress paper");
      }
    }
    setDraftReady(true);
  }, [user]);

  /* PERSIST WIZARD DRAFT while working on create screen */
  useEffect(() => {
    if (!draftReady || !user || !user.id) return;
    if (view !== "create") return;
    savePaperDraft(user.id, { step: wizardStep, paper, aiCount, aiDifficulty, assignment });
  }, [draftReady, user, view, wizardStep, paper, aiCount, aiDifficulty, assignment]);

  useEffect(() => {
    if (view === "create") {
      (async () => {
        try {
          const { data } = await axios.get(`${API}/exam-papers/schedule-options`, { withCredentials: true });
          setScheduleOptions(data.data || []);
        } catch (err) { console.error(err); }
      })();
    }
  }, [view]);

  useEffect(() => {
    if (!scheduleOptions.length || !preselectKey) return;
    const [schId, clsId, subId] = preselectKey.split("::");
    const sch = scheduleOptions.find((s) => s._id === schId);
    if (!sch) return;
    const asg = sch.assignments.find((a) => String(a.classId) === clsId && String(a.subjectId) === subId);
    if (asg) {
      setSelectedSchedule(sch);
      applyAssignment(sch, asg);
    }
    setPreselectKey("");
  }, [scheduleOptions, preselectKey, applyAssignment]);

  useEffect(() => {
    if (paper.classId && paper.subjectId) {
      (async () => {
        setChaptersLoading(true);
        try {
          const { data } = await axios.get(`${API}/exam-papers/chapters?classId=${paper.classId}&subjectId=${paper.subjectId}`, { withCredentials: true });
          setChapters(data.data || []);
        } catch (err) { console.error(err); setChapters([]); } finally { setChaptersLoading(false); }
      })();
    }
  }, [paper.classId, paper.subjectId]);

  const markTotals = useMemo(() => {
    let total = 0;
    const byType = {};
    for (const q of paper.questions || []) {
      total += q.marks || 0;
      byType[q.questionType] = (byType[q.questionType] || 0) + (q.marks || 0);
    }
    return { total, byType };
  }, [paper.questions]);

  function toggleType(type) {
    setPaper((prev) => {
      const exists = prev.questionTypes.find((t) => t.type === type);
      const questionTypes = exists
        ? prev.questionTypes.filter((t) => t.type !== type)
        : [...prev.questionTypes, { type, count: 5, marksEach: 1 }];
      return { ...prev, questionTypes };
    });
  }

  function updateTypeField(type, field, val) {
    setPaper((prev) => ({
      ...prev,
      questionTypes: prev.questionTypes.map((t) => t.type === type ? { ...t, [field]: Number(val) || 0 } : t),
    }));
  }

  function addBlankQuestions(type, count) {
    const existing = paper.questions.filter((q) => q.questionType === type);
    const needed = Math.max(0, count - existing.length);
    const blanks = Array.from({ length: needed }, () => ({
      questionType: type, questionText: "", options: type === "MCQ" ? ["", "", "", ""] : [],
      answer: "", marks: paper.questionTypes.find((t) => t.type === type)?.marksEach || 1,
      difficulty: "Medium", chapterName: "", chapterId: null,
    }));
    setPaper((prev) => ({
      ...prev,
      questions: [...prev.questions.filter((q) => q.questionType !== type), ...existing, ...blanks],
    }));
  }

  function updateQuestion(idx, field, val) {
    setPaper((prev) => {
      const questions = [...prev.questions];
      questions[idx] = { ...questions[idx], [field]: val };
      return { ...prev, questions };
    });
  }

  function updateOption(qIdx, oIdx, val) {
    setPaper((prev) => {
      const questions = [...prev.questions];
      const options = [...questions[qIdx].options];
      options[oIdx] = val;
      questions[qIdx] = { ...questions[qIdx], options };
      return { ...prev, questions };
    });
  }

  function removeQuestion(idx) {
    setPaper((prev) => ({ ...prev, questions: prev.questions.filter((_, i) => i !== idx) }));
  }

  function toggleChapter(ch) {
    setPaper((prev) => {
      const exists = prev.syllabusChapters.find((c) => c.chapterId === ch._id);
      const syllabusChapters = exists
        ? prev.syllabusChapters.filter((c) => c.chapterId !== ch._id)
        : [...prev.syllabusChapters, { chapterId: ch._id, chapterName: ch.name }];
      return { ...prev, syllabusChapters };
    });
  }

  async function handleSave(publishPending) {
    if (!paper.examScheduleId) return toast.error("Select an exam from the scheduled exams");
    if (!paper.classId || !paper.subjectId) return toast.error("Select class and subject for the exam");
    if (publishPending && !paper.questions.length) return toast.error("Add at least one question");
    try {
      const payload = { ...paper, status: publishPending ? "pending" : "draft" };
      if (paper._id) {
        await axios.put(`${API}/exam-papers/${paper._id}`, payload, { withCredentials: true });
      } else {
        await axios.post(`${API}/exam-papers/create`, payload, { withCredentials: true });
      }
      toast.success(publishPending ? "Submitted for approval" : "Saved as draft");
      clearPaperDraft(user?.id);
      setView("list");
      setPaper(emptyPaper());
      fetchPapers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    }
  }

  async function handleAI() {
    if (!paper.classId || !paper.subjectId) return toast.error("Select class and subject first");
    const types = Object.entries(aiCount).filter(([, c]) => c > 0).map(([type, count]) => ({ type, count, marksEach: paper.questionTypes.find((t) => t.type === type)?.marksEach || 1 }));
    if (!types.length) return toast.error("Select question types with counts > 0");
    setAiLoading(true);
    try {
      const cls = classes.find((c) => (c._id || c.id) === paper.classId);
      const sub = subjects.find((s) => (s._id || s.id) === paper.subjectId);
      const { data } = await axios.post(`${API}/exam-papers/generate-ai`, {
        className: cls?.name || cls?.className || "",
        subjectName: sub?.name || sub?.subjectName || "",
        chapters: paper.syllabusChapters.map((c) => c.chapterName),
        questionTypes: types,
        difficulty: aiDifficulty,
      }, { withCredentials: true, timeout: 180000 });
      const aiQs = (data.data || []).map((q) => ({
        ...q,
        options: q.options || [],
      }));
      setPaper((prev) => ({ ...prev, questions: [...prev.questions, ...aiQs] }));
      toast.success(`${aiQs.length} questions generated`);
    } catch (err) {
      const msg = err.message?.includes("timeout") || err.code === "ECONNABORTED"
        ? "AI is taking too long — please try fewer questions or try again"
        : (err.response?.data?.message || "AI generation failed");
      toast.error(msg);
    } finally { setAiLoading(false); }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this paper?")) return;
    try {
      await axios.delete(`${API}/exam-papers/${id}`, { withCredentials: true });
      toast.success("Deleted");
      fetchPapers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  }

  async function loadDetail(id) {
    setDetailLoading(true);
    setView("detail");
    try {
      const { data } = await axios.get(`${API}/exam-papers/${id}`, { withCredentials: true });
      setDetailPaper(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load paper");
      setView("list");
    } finally { setDetailLoading(false); }
  }

  async function handleReviewAction() {
    if (!reviewRemarks.trim()) return toast.error("Enter remarks");
    setActionLoading(true);
    try {
      await axios.post(`${API}/exam-papers/${reviewModal._id}/${reviewAction}`, { remarks: reviewRemarks }, { withCredentials: true });
      toast.success(`Paper ${reviewAction === "approve" ? "approved" : reviewAction === "reject" ? "rejected" : "sent for revision"}`);
      setReviewModal(null);
      setReviewRemarks("");
      setReviewAction("");
      fetchPapers();
      if (view === "detail") loadDetail(reviewModal._id);
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    } finally { setActionLoading(false); }
  }

  async function createFromSchedule(scheduleId) {
    try {
      const { data } = await axios.post(`${API}/exam-papers/from-schedule/${scheduleId}`, {}, { withCredentials: true });
      toast.success(data.message || "Papers created");
      setView("list");
      fetchPapers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create papers");
    }
  }

  function openPrintPreview(p, mode) {
    const sections = {};
    for (const q of p.questions || []) {
      const sectionName = typeLabel(q.questionType);
      if (!sections[sectionName]) sections[sectionName] = [];
      sections[sectionName].push(q);
    }
    let qNum = 1;
    const sectionsHtml = Object.entries(sections).map(([name, qs]) => {
      const rows = qs.map((q) => {
        let html = `<div class="question"><strong>Q${qNum}.</strong> ${q.questionText}`;
        if (q.questionType === "MCQ" && q.options?.length) {
          html += `<div class="options">${q.options.map((o, i) => `<div>${String.fromCharCode(65 + i)}. ${o}</div>`).join("")}</div>`;
        }
        html += `<span class="marks">[${q.marks} Mark${q.marks !== 1 ? "s" : ""}]</span></div>`;
        qNum++;
        return html;
      }).join("");
      return `<div class="section"><h3>${name}</h3>${rows}</div>`;
    }).join("");

    let answerHtml = "";
    if (mode === "answerKey") {
      qNum = 1;
      answerHtml = `<div class="section"><h2>ANSWER KEY</h2>` +
        (p.questions || []).map((q) => {
          const ans = `<div class="answer-row"><strong>Q${qNum}.</strong> ${q.answer || "—"} <span class="marks">[${q.marks}]</span></div>`;
          qNum++;
          return ans;
        }).join("") + `</div>`;
    }

    const html = `<!DOCTYPE html><html><head><title>${p.examName} - ${p.subjectName}</title>
    <style>
      body{font-family:Georgia,serif;max-width:800px;margin:0 auto;padding:40px;color:#111;line-height:1.6}
      .header{text-align:center;border-bottom:3px double #111;padding-bottom:20px;margin-bottom:30px}
      .header h1{font-size:20px;text-transform:uppercase;margin:0}
      .header h2{font-size:16px;margin:8px 0 4px}
      .header p{font-size:13px;margin:2px 0;color:#555}
      .meta{display:flex;justify-content:space-between;border-bottom:1px solid #ccc;padding:8px 0;margin-bottom:20px;font-size:13px}
      .section{margin-bottom:24px}
      .section h3{font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-bottom:12px;background:#f5f5f5;padding:6px 8px}
      .question{margin-bottom:14px;page-break-inside:avoid}
      .options{margin:6px 0 0 24px}
      .options div{margin:2px 0}
      .marks{float:right;color:#666;font-size:12px}
      .answer-row{margin-bottom:6px;padding:4px 0;border-bottom:1px dotted #ddd}
      .footer{text-align:center;border-top:2px solid #111;padding-top:16px;margin-top:40px;font-size:11px;color:#888}
      @media print{body{padding:20px}}
    </style></head><body>
    <div class="header">
      ${mode !== "answerKey" ? `<h2>— STUDENT COPY —</h2>` : `<h2>— ANSWER KEY —</h2>`}
      <h1>${p.examName}</h1>
      <h2>${p.subjectName}</h2>
      <p>Class: ${p.className}</p>
    </div>
    <div class="meta">
      <span>Time: ${p.duration}</span>
      <span>Max Marks: ${p.totalMarks}</span>
    </div>
    ${sectionsHtml}
    ${answerHtml}
    <div class="footer">
      <p>Generated by EduAitor ERP</p>
      <p>Confidential — For authorized use only</p>
    </div>
    <script>window.onload=function(){window.print()}</script>
    </body></html>`;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
  }

  function startCreate() {
    clearPaperDraft(user?.id);
    setPaper(emptyPaper());
    setSelectedSchedule(null);
    setAssignment("");
    setPreselectKey("");
    setWizardStep(0);
    setView("create");
  }

  function startEdit(p) {
    setPaper({
      ...p,
      syllabusChapters: p.syllabusChapters || [],
      questionTypes: (p.questionTypes || []).map((t) => ({ ...t, type: normalizeType(t.type) })),
      questions: (p.questions || []).map((q) => ({ ...q, questionType: normalizeType(q.questionType) })),
    });
    setSelectedSchedule(null);
    setAssignment("");
    setPreselectKey(`${p.examScheduleId || ""}::${p.classId}::${p.subjectId}`);
    setWizardStep(0);
    setView("create");
  }

  const STEPS = ["Info", "Syllabus", "Types", "Counts", "Marks", "Questions", "Preview", "Submit"];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {view === "list" && (
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Exam Papers</h1>
              <p className="text-sm text-gray-500 mt-1">
                {isTeacher ? "Manage your question papers" : "Review and approve question papers"}
              </p>
            </div>
            <div className="flex gap-2">
              {isAdmin && (
                <button onClick={() => setView("analytics")} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">
                  <FaChartBar /> Analytics
                </button>
              )}
              {isAdmin && (
                <button onClick={() => setView("fromSchedule")} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                  <FaClipboardList /> From Schedule
                </button>
              )}
              <button onClick={startCreate} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm">
                <FaPlus /> Create Paper
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  type="text"
                  placeholder="Search papers..."
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <select value={filters.classId} onChange={(e) => setFilters((f) => ({ ...f, classId: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
                <option value="">All Classes</option>
                {classes.map((c) => <option key={c._id || c.id} value={c._id || c.id}>{c.name || c.className}</option>)}
              </select>
              <select value={filters.subjectId} onChange={(e) => setFilters((f) => ({ ...f, subjectId: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
                <option value="">All Subjects</option>
                {subjects.map((s) => <option key={s._id || s.id} value={s._id || s.id}>{s.name || s.subjectName}</option>)}
              </select>
              <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
                <option value="">All Status</option>
                {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>

          {loading ? <LoadingSpinner /> : papers.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <FaClipboardList className="text-4xl text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No exam papers found</p>
              <button onClick={startCreate} className="mt-3 text-emerald-600 hover:underline text-sm">Create your first paper</button>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Exam</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Class</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Subject</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Due</th>
                      {!isTeacher && <th className="text-left px-4 py-3 font-medium text-gray-600">Teacher</th>}
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Questions</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {papers.map((p) => {
                      const st = STATUSES[p.status] || STATUSES.draft;
                      const StIcon = st.icon;
                      return (
                        <tr key={p._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{p.examName || "—"}</td>
                          <td className="px-4 py-3">{p.className}</td>
                          <td className="px-4 py-3">{p.subjectName}</td>
                          <td className="px-4 py-3">
                            {p.submissionDeadline ? (
                              (() => {
                                const di = deadlineInfo(p.submissionDeadline);
                                const tone = di.overdue ? "bg-red-100 text-red-700" : di.days <= 3 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";
                                return (
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${tone}`}>
                                    <FaClock /> {fmtDate(p.submissionDeadline)}
                                  </span>
                                );
                              })()
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          {!isTeacher && <td className="px-4 py-3 text-gray-500">{p.teacherName || "—"}</td>}
                          <td className="px-4 py-3">{p.questions?.length || 0}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${st.bg} ${st.text}`}>
                              <StIcon className="text-[10px]" /> {st.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => loadDetail(p._id)} className="p-1.5 hover:bg-gray-100 rounded-lg text-blue-600" title="View"><FaEye /></button>
                              {(p.status === "draft" || p.status === "revision" || p.status === "rejected") && isTeacher && (
                                <button onClick={() => startEdit(p)} className="p-1.5 hover:bg-gray-100 rounded-lg text-amber-600" title="Edit"><FaEdit /></button>
                              )}
                              {isAdmin && (p.status === "pending") && (
                                <button onClick={() => { setReviewModal(p); setReviewAction("approve"); setReviewRemarks(""); }} className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600" title="Approve"><FaCheck /></button>
                              )}
                              {isAdmin && (p.status === "pending") && (
                                <button onClick={() => { setReviewModal(p); setReviewAction("reject"); setReviewRemarks(""); }} className="p-1.5 hover:bg-red-50 rounded-lg text-red-600" title="Reject"><FaTimes /></button>
                              )}
                              {(p.status !== "approved") && (isTeacher || isAdmin) && (
                                <button onClick={() => handleDelete(p._id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Delete"><FaTrash /></button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {view === "fromSchedule" && (
        <FromScheduleView
          schedules={schedules}
          onBack={() => setView("list")}
          onCreate={createFromSchedule}
        />
      )}

      {view === "analytics" && (
        <AnalyticsView
          data={analytics}
          loading={analyticsLoading}
          onBack={() => setView("list")}
        />
      )}

      {view === "create" && (
        <CreateWizard
          step={wizardStep}
          setStep={setWizardStep}
          steps={STEPS}
          paper={paper}
          setPaper={setPaper}
          chapters={chapters}
          chaptersLoading={chaptersLoading}
          classes={classes}
          subjects={subjects}
          scheduleOptions={scheduleOptions}
          selectedSchedule={selectedSchedule}
          setSelectedSchedule={setSelectedSchedule}
          assignment={assignment}
          setAssignment={setAssignment}
          applyAssignment={applyAssignment}
          deadlineInfo={deadlineInfo}
          markTotals={markTotals}
          aiLoading={aiLoading}
          aiCount={aiCount}
          setAiCount={setAiCount}
          aiDifficulty={aiDifficulty}
          setAiDifficulty={setAiDifficulty}
          isAdmin={isAdmin}
          onBack={() => setView("list")}
          onSave={handleSave}
          onAI={handleAI}
          toggleType={toggleType}
          updateTypeField={updateTypeField}
          addBlankQuestions={addBlankQuestions}
          updateQuestion={updateQuestion}
          updateOption={updateOption}
          removeQuestion={removeQuestion}
          toggleChapter={toggleChapter}
          openPrintPreview={openPrintPreview}
        />
      )}

      {view === "detail" && (
        detailLoading ? <LoadingSpinner /> : detailPaper && (
          <DetailView
            paper={detailPaper}
            isTeacher={isTeacher}
            isAdmin={isAdmin}
            onBack={() => { setView("list"); setDetailPaper(null); }}
            onEdit={() => startEdit(detailPaper)}
            onReview={(action) => { setReviewModal(detailPaper); setReviewAction(action); setReviewRemarks(""); }}
            onPrint={(mode) => openPrintPreview(detailPaper, mode)}
          />
        )
      )}

      {reviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold mb-2">
              {reviewAction === "approve" ? "✅ Approve Paper" : reviewAction === "reject" ? "❌ Reject Paper" : "📝 Send for Revision"}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {reviewModal.subjectName} — {reviewModal.className} ({reviewModal.examName})
            </p>
            <textarea
              value={reviewRemarks}
              onChange={(e) => setReviewRemarks(e.target.value)}
              placeholder={reviewAction === "approve" ? "Optional remarks..." : "Enter reason..."}
              className="w-full border rounded-lg p-3 text-sm min-h-[100px] mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setReviewModal(null); setReviewRemarks(""); }} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleReviewAction}
                disabled={actionLoading}
                className={`px-4 py-2 text-white rounded-lg text-sm font-medium ${
                  reviewAction === "approve" ? "bg-emerald-600 hover:bg-emerald-700" :
                  reviewAction === "reject" ? "bg-red-600 hover:bg-red-700" :
                  "bg-orange-600 hover:bg-orange-700"
                }`}
              >
                {actionLoading ? "Processing..." : reviewAction === "approve" ? "Approve" : reviewAction === "reject" ? "Reject" : "Send for Revision"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FromScheduleView({ schedules, onBack, onCreate }) {
  const published = schedules.filter((s) => s.status === "published");
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg"><FaChevronLeft /></button>
        <div>
          <h1 className="text-2xl font-bold">Create Papers from Schedule</h1>
          <p className="text-sm text-gray-500">Auto-generate paper tasks from published exam schedules</p>
        </div>
      </div>
      {published.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <FaClipboardList className="text-4xl text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No published schedules found</p>
          <p className="text-xs text-gray-400 mt-1">Publish an exam schedule first to create paper tasks</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {published.map((s) => (
            <div key={s._id} className="bg-white rounded-xl border p-5 hover:shadow-md transition">
              <h3 className="font-bold text-gray-900">{s.name || s.examName}</h3>
              <div className="text-sm text-gray-500 mt-2 space-y-1">
                <p>📅 {fmtDate(s.startDate)} — {fmtDate(s.endDate)}</p>
                <p>📋 {s.schedule?.length || 0} exam slots</p>
                <p>⏱ {s.startTime} — {s.endTime}</p>
              </div>
              <button onClick={() => onCreate(s._id)} className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                <FaClipboardList className="inline mr-1" /> Create Paper Tasks
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnalyticsView({ data, loading, onBack }) {
  if (loading) return <LoadingSpinner />;
  if (!data) return null;
  const statusColors = { draft: "#9CA3AF", pending: "#F59E0B", approved: "#10B981", rejected: "#EF4444", revision: "#F97316" };
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg"><FaChevronLeft /></button>
        <div>
          <h1 className="text-2xl font-bold">Paper Analytics</h1>
          <p className="text-sm text-gray-500">Overview of exam paper creation and approval</p>
        </div>
      </div>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5 mb-6">
        {Object.entries(data.byStatus || {}).map(([k, v]) => {
          const st = STATUSES[k];
          return (
            <div key={k} className="bg-white rounded-xl border p-4 text-center">
              <div className="text-3xl font-bold" style={{ color: statusColors[k] }}>{v}</div>
              <div className="text-xs text-gray-500 mt-1">{st?.label || k}</div>
            </div>
          );
        })}
      </div>
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-bold text-gray-900 mb-3">📊 Approval Rate</h3>
          <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${data.approvalRate || 0}%` }} />
          </div>
          <p className="text-sm text-gray-500 mt-2">{data.approvalRate || 0}% of papers approved</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-bold text-gray-900 mb-3">📚 By Class</h3>
          {Object.entries(data.byClass || {}).map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm py-1 border-b last:border-0">
              <span>{k}</span>
              <span className="font-medium">{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-bold text-gray-900 mb-3">📖 By Subject</h3>
          {Object.entries(data.bySubject || {}).map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm py-1 border-b last:border-0">
              <span>{k}</span>
              <span className="font-medium">{v}</span>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-bold text-gray-900 mb-3">👩‍🏫 By Teacher</h3>
          {Object.entries(data.byTeacher || {}).map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm py-1 border-b last:border-0">
              <span>{k}</span>
              <span className="font-medium">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DetailView({ paper: p, isTeacher, isAdmin, onBack, onEdit, onReview, onPrint }) {
  const st = STATUSES[p.status] || STATUSES.draft;
  const StIcon = st.icon;
  const canEdit = isTeacher && (p.status === "draft" || p.status === "revision" || p.status === "rejected");
  const canReview = isAdmin && p.status === "pending";
  let qNum = 0;
  const grouped = {};
  for (const q of p.questions || []) {
    const label = typeLabel(q.questionType);
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push({ ...q, _num: ++qNum });
  }
  return (
    <div>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg"><FaChevronLeft /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{p.examName}</h1>
          <p className="text-sm text-gray-500">{p.className} — {p.subjectName}</p>
        </div>
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${st.bg} ${st.text}`}>
          <StIcon /> {st.label}
        </span>
        {canEdit && <button onClick={onEdit} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600"><FaEdit className="inline mr-1" /> Edit</button>}
        {canReview && (
          <>
            <button onClick={() => onReview("approve")} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"><FaCheck className="inline mr-1" /> Approve</button>
            <button onClick={() => onReview("revision")} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600"><FaExclamationTriangle className="inline mr-1" /> Revision</button>
            <button onClick={() => onReview("reject")} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"><FaTimes className="inline mr-1" /> Reject</button>
          </>
        )}
        {p.status === "approved" && (
          <>
            <button onClick={() => onPrint("student")} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"><FaPrint className="inline mr-1" /> Student Copy</button>
            <button onClick={() => onPrint("answerKey")} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"><FaFilePdf className="inline mr-1" /> Answer Key</button>
          </>
        )}
      </div>

      {p.adminRemarks && (
        <div className={`rounded-xl border p-4 mb-4 ${p.status === "rejected" ? "bg-red-50 border-red-200" : p.status === "revision" ? "bg-orange-50 border-orange-200" : "bg-gray-50 border-gray-200"}`}>
          <p className="text-sm font-medium text-gray-700">Admin Remarks:</p>
          <p className="text-sm text-gray-600 mt-1">{p.adminRemarks}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-400 uppercase">Total Marks</p>
          <p className="text-2xl font-bold text-gray-900">{p.totalMarks}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-400 uppercase">Duration</p>
          <p className="text-2xl font-bold text-gray-900">{p.duration}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-400 uppercase">Questions</p>
          <p className="text-2xl font-bold text-gray-900">{p.questions?.length || 0}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-400 uppercase">Exam Date</p>
          <p className="text-lg font-bold text-gray-900">{fmtDate(p.examDate)}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-400 uppercase">Submit Due</p>
          <p className="text-lg font-bold text-gray-900">{fmtDate(p.submissionDeadline)}</p>
        </div>
      </div>

      {isTeacher && p.submissionDeadline && (() => {
        const di = deadlineInfo(p.submissionDeadline);
        const tone = di.overdue ? "bg-red-50 border-red-200 text-red-700" : di.days <= 3 ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-emerald-50 border-emerald-200 text-emerald-700";
        return (
          <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 mb-4 text-sm font-medium ${tone}`}>
            <FaClock />
            {di.overdue
              ? `Submission deadline (${fmtDate(p.submissionDeadline)}) has passed. You cannot submit for review — contact the administrator to reopen it.`
              : di.days === 0
              ? `Submission deadline is today (${fmtDate(p.submissionDeadline)}). Submit before the end of the day.`
              : `${di.days} day${di.days > 1 ? "s" : ""} left to submit for review (due ${fmtDate(p.submissionDeadline)}).`}
          </div>
        );
      })()}

      {(p.difficulty || p.questions?.length) > 0 && (
        <div className="bg-white rounded-xl border p-5 mb-4">
          <h3 className="font-bold text-gray-900 mb-3">Difficulty Analysis</h3>
          <div className="flex gap-4">
            {["Easy", "Medium", "Hard"].map((d) => {
              const total = p.questions?.length || 1;
              const count = (p.questions || []).filter((q) => q.difficulty === d).length;
              const pct = Math.round((count / total) * 100);
              const color = d === "Easy" ? "bg-emerald-500" : d === "Medium" ? "bg-amber-500" : "bg-red-500";
              return (
                <div key={d} className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span>{d}</span><span>{count} ({pct}%)</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-bold text-gray-900 mb-4">Questions ({p.questions?.length || 0})</h3>
        {Object.entries(grouped).map(([section, qs]) => (
          <div key={section} className="mb-6">
            <h4 className="text-sm font-semibold uppercase text-gray-500 border-b pb-2 mb-3">{section}</h4>
            {qs.map((q) => (
              <div key={q._id} className="mb-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between">
                  <p className="text-sm"><strong>Q{q._num}.</strong> {q.questionText}</p>
                  <span className="text-xs text-gray-400 whitespace-nowrap ml-2">[{q.marks}M] [{q.difficulty}]</span>
                </div>
                {q.questionType === "MCQ" && q.options?.length > 0 && (
                  <div className="grid grid-cols-2 gap-1 mt-2 ml-6">
                    {q.options.map((o, i) => (
                      <div key={i} className="text-xs text-gray-600">{String.fromCharCode(65 + i)}. {o}</div>
                    ))}
                  </div>
                )}
                {q.answer && <p className="text-xs text-emerald-700 mt-2 ml-6">Answer: {q.answer}</p>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateWizard({
  step, setStep, steps, paper, setPaper, chapters, chaptersLoading, classes, subjects,
  scheduleOptions, selectedSchedule, setSelectedSchedule, assignment, setAssignment, applyAssignment, deadlineInfo,
  markTotals, aiLoading, aiCount, setAiCount, aiDifficulty, setAiDifficulty,
  onBack, onSave, onAI, toggleType, updateTypeField, addBlankQuestions,
  updateQuestion, updateOption, removeQuestion, toggleChapter, openPrintPreview,
}) {
  const typeMarkTotals = paper.questionTypes.reduce((s, t) => s + (Number(t.count) || 0) * (Number(t.marksEach) || 0), 0);
  const typePct = paper.totalMarks ? Math.min(100, Math.round((typeMarkTotals / paper.totalMarks) * 100)) : 0;
  const typeMarksOk = typeMarkTotals === paper.totalMarks;
  const [bankOpen, setBankOpen] = useState(false);
  const [bankQs, setBankQs] = useState([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSel, setBankSel] = useState({});
  const [bankError, setBankError] = useState("");
  const canNext = step === 0
    ? !!(paper.examScheduleId && paper.classId && paper.subjectId)
    : step === 1
    ? true
    : step === 2
    ? paper.questionTypes.length > 0
    : step === 3
    ? paper.questionTypes.every((t) => t.count > 0)
    : step === 4
    ? typeMarksOk
    : step === 5
    ? paper.questions.length > 0
    : true;

  const cls = classes.find((c) => (c._id || c.id) === paper.classId);
  const sub = subjects.find((s) => (s._id || s.id) === paper.subjectId);

  function populateSlots() {
    for (const t of paper.questionTypes) {
      addBlankQuestions(t.type, t.count);
    }
  }

  async function loadBank() {
    if (!paper.classId || !paper.subjectId) return toast.warning("Select class and subject first");
    setBankOpen(true);
    setBankLoading(true);
    setBankError("");
    try {
      const { data } = await axios.get(`${API}/question-bank/list?classId=${paper.classId}&subjectId=${paper.subjectId}&limit=200`, { withCredentials: true });
      setBankQs(data.data || []);
      setBankSel({});
    } catch (err) {
      setBankError(err.response?.data?.message || "Failed to load question bank");
    } finally {
      setBankLoading(false);
    }
  }

  async function addFromBank() {
    const selected = bankQs.filter((q) => bankSel[q._id]);
    if (!selected.length) return toast.warning("Select questions to add");
    setPaper((prev) => ({
      ...prev,
      questions: [...prev.questions].concat(
        selected.map((q) => ({
          questionType: q.questionType,
          questionText: q.questionText,
          options: q.options || [],
          answer: q.answer || "",
          marks: q.marks || 1,
          difficulty: q.difficulty || "Medium",
          chapterId: q.chapterId || null,
          chapterName: q.chapterName || "",
          source: "bank",
        })),
      ),
    }));
    try {
      await axios.post(`${API}/question-bank/increment-usage`, { ids: selected.map((q) => q._id) }, { withCredentials: true });
    } catch (err) { console.error(err); }
    toast.success(`${selected.length} question(s) added from bank`);
    setBankOpen(false);
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg"><FaChevronLeft /></button>
        <h1 className="text-xl font-bold">Create Exam Paper</h1>
      </div>

      <div className="bg-white rounded-xl border p-3 mb-6 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center">
              <button
                onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  i === step ? "bg-blue-600 text-white" : i < step ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"
                }`}
              >
                {i < step ? <FaCheckCircle /> : <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">{i + 1}</span>}
                {s}
              </button>
              {i < steps.length - 1 && <FaChevronRight className="text-gray-300 mx-1 text-xs" />}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6 min-h-[400px]">
        {step === 0 && (
          <div className="space-y-4 max-w-2xl">
            <h2 className="text-lg font-bold text-gray-900">Paper Information</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Exam (required) *</label>
              <select
                value={paper.examScheduleId || ""}
                onChange={(e) => {
                  const sch = scheduleOptions.find((s) => s._id === e.target.value);
                  setSelectedSchedule(sch || null);
                  setAssignment("");
                  setPaper((p) => ({
                    ...p, examScheduleId: e.target.value, examName: sch?.examName || "",
                    classId: "", subjectId: "", teacherId: "", examDate: "",
                    submissionDeadline: sch?.paperSubmissionDeadline || null,
                    totalMarks: sch?.paperTotalMarks || 80,
                  }));
                }}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">— Select a scheduled exam —</option>
                {scheduleOptions.map((s) => (
                  <option key={s._id} value={s._id}>{s.examName} ({fmtDate(s.startDate)} – {fmtDate(s.endDate)})</option>
                ))}
              </select>
              {scheduleOptions.length === 0 && (
                <p className="text-xs text-orange-600 mt-1">No published exams are available. The administrator must publish an exam schedule first.</p>
              )}
            </div>

            {selectedSchedule && (
              <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-500">Exam</p>
                    <p className="font-semibold text-gray-900">{selectedSchedule.examName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Exam Window</p>
                    <p className="text-sm font-medium">{fmtDate(selectedSchedule.startDate)} – {fmtDate(selectedSchedule.endDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Submission Deadline</p>
                    {selectedSchedule.paperSubmissionDeadline ? (
                      (() => {
                        const di = deadlineInfo(selectedSchedule.paperSubmissionDeadline);
                        const tone = di.overdue ? "bg-red-100 text-red-700" : di.days <= 3 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${tone}`}>
                            <FaClock />
                            {fmtDate(selectedSchedule.paperSubmissionDeadline)}
                            {di.overdue ? " — Overdue" : di.days === 0 ? " — Due today" : ` — ${di.days} day${di.days > 1 ? "s" : ""} left`}
                          </span>
                        );
                      })()
                    ) : (
                      <p className="text-xs text-amber-600">Not set by administrator</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class & Subject (required) *</label>
                  <select
                    value={assignment}
                    onChange={(e) => {
                      const key = e.target.value;
                      setAssignment(key);
                      const [, clsId, subId] = key.split("::");
                      const asg = selectedSchedule.assignments.find(
                        (a) => String(a.classId) === clsId && String(a.subjectId) === subId
                      );
                      applyAssignment(selectedSchedule, asg);
                    }}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">— Select class & subject —</option>
                    {selectedSchedule.assignments.map((a, i) => (
                      <option key={i} value={`${selectedSchedule._id}::${a.classId}::${a.subjectId}`}>
                        {a.className} — {a.subjectName}
                        {a.paperCount > 0 ? ` (${a.paperCount} paper${a.paperCount > 1 ? "s" : ""} already)` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {paper.examName && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exam Name</label>
                  <input value={paper.examName} readOnly disabled className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600" />
                  <p className="text-xs text-gray-400 mt-1">Exam name is taken from the scheduled exam and cannot be changed.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exam Date</label>
                  <input type="date" value={paper.examDate ? String(paper.examDate).slice(0, 10) : ""} readOnly disabled className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label>
                  <input type="number" min="1" value={paper.totalMarks} onChange={(e) => setPaper((p) => ({ ...p, totalMarks: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                  <input value={`${paper.duration} (${paper.durationMinutes} min)`} readOnly disabled className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600" />
                </div>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Syllabus Selection</h2>
            {!paper.classId || !paper.subjectId ? (
              <p className="text-sm text-gray-500">Go back and select class + subject first</p>
            ) : chaptersLoading ? (
              <LoadingSpinner />
            ) : chapters.length === 0 ? (
              <p className="text-sm text-gray-500">No chapters found. You can skip this step.</p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-500">{chapters.length} chapters</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPaper((p) => ({ ...p, syllabusChapters: chapters.map((ch) => ({ chapterId: ch._id, chapterName: ch.name })) }))}
                      className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100"
                    >
                      <FaCheck /> Select All
                    </button>
                    <button
                      onClick={() => setPaper((p) => ({ ...p, syllabusChapters: [] }))}
                      className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium bg-gray-50 text-gray-600 hover:bg-gray-100"
                    >
                      <FaTimes /> Clear All
                    </button>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {chapters.map((ch) => {
                    const selected = paper.syllabusChapters.some((c) => c.chapterId === ch._id);
                    return (
                      <button
                        key={ch._id}
                        onClick={() => toggleChapter(ch)}
                        className={`flex items-center gap-3 p-3 rounded-lg border text-left text-sm transition ${
                          selected ? "bg-blue-50 border-blue-300" : "bg-white border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selected ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}>
                          {selected && <FaCheck className="text-white text-[10px]" />}
                        </div>
                        <span>{ch.name}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            <p className="text-xs text-gray-400 mt-3">{paper.syllabusChapters.length} chapter(s) selected</p>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Question Types</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {QUESTION_TYPES.map((qt) => {
                const selected = paper.questionTypes.some((t) => t.type === qt.key);
                return (
                  <button
                    key={qt.key}
                    onClick={() => toggleType(qt.key)}
                    className={`flex items-center gap-3 p-4 rounded-lg border text-left transition ${
                      selected ? "bg-blue-50 border-blue-300" : "bg-white border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selected ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}>
                      {selected && <FaCheck className="text-white text-[10px]" />}
                    </div>
                    <span className="text-lg mr-2">{qt.icon}</span>
                    <span className="font-medium">{qt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Question Count</h2>
            <div className="space-y-3 max-w-lg">
              {paper.questionTypes.map((qt) => (
                <div key={qt.type} className="flex items-center gap-4">
                  <span className="w-40 text-sm font-medium">{typeLabel(qt.type)}</span>
                  <input
                    type="number"
                    min="0"
                    value={qt.count}
                    onChange={(e) => updateTypeField(qt.type, "count", e.target.value)}
                    className="w-24 border rounded-lg px-3 py-2 text-sm text-center"
                  />
                  <span className="text-xs text-gray-400">questions</span>
                </div>
              ))}
              <p className="text-sm text-gray-500 pt-2 border-t">
                Total: {paper.questionTypes.reduce((s, t) => s + t.count, 0)} questions
              </p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Marks Distribution</h2>
            <div className="space-y-3 max-w-lg mb-4">
              {paper.questionTypes.map((qt) => (
                <div key={qt.type} className="flex items-center gap-4">
                  <span className="w-40 text-sm font-medium">{typeLabel(qt.type)}</span>
                  <span className="text-xs text-gray-400">×{qt.count}</span>
                  <span className="text-xs text-gray-400">×</span>
                  <input
                    type="number"
                    min="1"
                    value={qt.marksEach}
                    onChange={(e) => updateTypeField(qt.type, "marksEach", e.target.value)}
                    className="w-20 border rounded-lg px-3 py-2 text-sm text-center"
                  />
                  <span className="text-xs text-gray-400">marks each</span>
                  <span className="text-sm font-medium ml-auto">= {qt.count * qt.marksEach}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-4 max-w-lg">
              <div className="flex justify-between text-sm mb-2">
                <span>Calculated Total:</span>
                <span className={`font-bold ${typeMarksOk ? "text-emerald-600" : "text-red-600"}`}>
                  {typeMarkTotals} / {paper.totalMarks} marks
                </span>
              </div>
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${typeMarksOk ? "bg-emerald-500" : typePct > 100 ? "bg-red-500" : "bg-blue-500"}`}
                  style={{ width: `${typePct}%` }}
                />
              </div>
              {typeMarksOk ? (
                <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                  <FaCheckCircle /> Marks total matches — <b>Next</b> is enabled.
                </p>
              ) : (
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <FaInfoCircle />
                  {typeMarkTotals < paper.totalMarks
                    ? `${paper.totalMarks - typeMarkTotals} marks short — increase the question count or marks each`
                    : `${typeMarkTotals - paper.totalMarks} marks over — reduce the count, lower marks each, or raise total marks above`}
                  . Next will enable once the total equals {paper.totalMarks}.
                </p>
              )}
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Create Questions</h2>
              <div className="flex gap-2">
                <button
                  onClick={populateSlots}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  <FaPlus /> Add Blank Slots
                </button>
                <button
                  onClick={onAI}
                  disabled={aiLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
                >
                  <FaRobot /> {aiLoading ? "Generating..." : "AI Generate"}
                </button>
                <button
                  onClick={loadBank}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700"
                >
                  <FaBook /> From Question Bank
                </button>
              </div>
            </div>

            {aiLoading && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-sm text-purple-700">AI is generating questions...</p>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-3 mb-4 flex flex-wrap gap-3 items-center">
              <span className="text-xs font-medium text-gray-500">AI Quick Setup:</span>
              {paper.questionTypes.map((qt) => (
                <div key={qt.type} className="flex items-center gap-1">
                  <label className="text-xs text-gray-600">{typeLabel(qt.type)}:</label>
                  <input
                    type="number"
                    min="0"
                    value={aiCount[normalizeType(qt.type)] || 0}
                    onChange={(e) => setAiCount((c) => ({ ...c, [normalizeType(qt.type)]: Number(e.target.value) }))}
                    className="w-16 border rounded px-2 py-1 text-xs text-center"
                  />
                </div>
              ))}
              <select value={aiDifficulty} onChange={(e) => setAiDifficulty(e.target.value)} className="border rounded px-2 py-1 text-xs">
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="space-y-4">
              {paper.questionTypes.map((qt) => {
                const qs = paper.questions.filter((q) => q.questionType === qt.type);
                return (
                  <div key={qt.type} className="border rounded-lg">
                    <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
                      <span className="font-medium text-sm">{typeLabel(qt.type)} ({qs.length})</span>
                      <span className="text-xs text-gray-400">{qt.marksEach} marks each</span>
                    </div>
                    <div className="p-3 space-y-2">
                      {qs.map((q) => {
                        const idx = paper.questions.indexOf(q);
                        return (
                          <div key={idx} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex gap-2">
                              <textarea
                                value={q.questionText}
                                onChange={(e) => updateQuestion(idx, "questionText", e.target.value)}
                                placeholder="Enter question..."
                                className="flex-1 border rounded-lg px-3 py-2 text-sm min-h-[60px]"
                                rows={2}
                              />
                              <div className="flex flex-col gap-1 w-24">
                                <select value={q.difficulty} onChange={(e) => updateQuestion(idx, "difficulty", e.target.value)} className="border rounded px-2 py-1 text-xs">
                                  {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <button onClick={() => removeQuestion(idx)} className="text-red-500 hover:text-red-700 text-xs p-1"><FaTrash /></button>
                              </div>
                            </div>
                            {q.questionType === "MCQ" && (
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                {q.options.map((o, oi) => (
                                  <input key={oi} value={o} onChange={(e) => updateOption(idx, oi, e.target.value)} placeholder={`${String.fromCharCode(65 + oi)}. Option`} className="border rounded px-2 py-1 text-xs" />
                                ))}
                              </div>
                            )}
                            <div className="mt-2">
                              <input value={q.answer} onChange={(e) => updateQuestion(idx, "answer", e.target.value)} placeholder="Answer..." className="w-full border rounded px-2 py-1 text-xs" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 6 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Paper Preview</h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-white">
              <div className="text-center border-b-2 border-double border-gray-800 pb-4 mb-6">
                <h3 className="text-lg font-bold uppercase">{paper.examName || "Exam Name"}</h3>
                <p className="font-semibold">{cls?.name || cls?.className || paper.className || "Class"}</p>
                <p className="font-semibold">{sub?.name || sub?.subjectName || paper.subjectName || "Subject"}</p>
              </div>
              <div className="flex justify-between text-sm border-b pb-3 mb-4">
                <span>Time: {paper.duration}</span>
                <span>Max Marks: {paper.totalMarks}</span>
              </div>
              {(() => {
                let qN = 0;
                const grouped = {};
                for (const q of paper.questions || []) {
                  const label = typeLabel(q.questionType);
                  if (!grouped[label]) grouped[label] = [];
                  grouped[label].push(q);
                }
                return Object.entries(grouped).map(([sec, qs]) => (
                  <div key={sec} className="mb-4">
                    <h4 className="text-sm font-bold uppercase border-b mb-2 pb-1">{sec}</h4>
                    {qs.map((q) => {
                      qN++;
                      return (
                        <div key={qN} className="mb-2 text-sm">
                          <p><strong>Q{qN}.</strong> {q.questionText || <span className="text-gray-300 italic">[No question text]</span>}</p>
                          {q.questionType === "MCQ" && q.options?.some((o) => o) && (
                            <div className="ml-6 grid grid-cols-2 gap-1 text-xs text-gray-500">
                              {q.options.map((o, i) => o && <div key={i}>{String.fromCharCode(65 + i)}. {o}</div>)}
                            </div>
                          )}
                          <span className="text-xs text-gray-400">[{q.marks}M]</span>
                        </div>
                      );
                    })}
                  </div>
                ));
              })()}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => openPrintPreview({ ...paper, className: cls?.name || paper.className, subjectName: sub?.name || paper.subjectName }, "student")} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                <FaPrint className="inline mr-1" /> Print Student Copy
              </button>
              <button onClick={() => openPrintPreview({ ...paper, className: cls?.name || paper.className, subjectName: sub?.name || paper.subjectName }, "answerKey")} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
                <FaFilePdf className="inline mr-1" /> Print Answer Key
              </button>
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="max-w-lg">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Submit for Approval</h2>
            <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm space-y-2">
              <div className="flex justify-between"><span className="text-gray-500">Exam:</span><span className="font-medium">{paper.examName || "—"}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Class:</span><span className="font-medium">{cls?.name || cls?.className || "—"}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Subject:</span><span className="font-medium">{sub?.name || sub?.subjectName || "—"}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Questions:</span><span className="font-medium">{paper.questions.length}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Marks:</span><span className="font-medium">{markTotals.total} / {paper.totalMarks}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Chapters:</span><span className="font-medium">{paper.syllabusChapters.length}</span></div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 mb-4">
              <FaInfoCircle className="inline mr-1" />
              Once submitted, you won't be able to edit until the admin reviews.
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-4">
        <div>
          {step > 0 && (
            <button onClick={() => setStep((s) => s - 1)} className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
              <FaChevronLeft /> Back
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => onSave(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
            Save Draft
          </button>
          {step < steps.length - 1 ? (
            <button
              onClick={() => { if (step === 4) { /* marks must match */ } setStep((s) => s + 1); }}
              disabled={!canNext}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Next <FaChevronRight />
            </button>
          ) : (
            <button
              onClick={() => onSave(true)}
              disabled={!paper.questions.length}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              <FaPaperPlane /> Submit for Approval
            </button>
)}
        </div>
      </div>

      {bankOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">Question Bank — {paper.className ? `Class ${paper.className}` : ""}{paper.subjectName ? ` / ${paper.subjectName}` : ""}</h3>
              <button onClick={() => setBankOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><FaTimes /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {bankLoading ? (
                <LoadingSpinner />
              ) : bankError ? (
                <p className="text-sm text-red-600">{bankError}</p>
              ) : bankQs.length === 0 ? (
                <p className="text-sm text-gray-500">No questions saved in the bank for this class & subject yet.</p>
              ) : (
                <div className="space-y-2">
                  {bankQs.map((q) => (
                    <label key={q._id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!bankSel[q._id]}
                        onChange={(e) => setBankSel((s) => ({ ...s, [q._id]: e.target.checked }))}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800">{q.questionText}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {typeLabel(q.questionType)} · {q.marks} mark{q.marks !== 1 ? "s" : ""} · {q.difficulty}
                          {q.chapterName ? ` · ${q.chapterName}` : ""} · used {q.usageCount || 0}x
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t flex items-center justify-between">
              <p className="text-xs text-gray-500">{Object.values(bankSel).filter(Boolean).length} selected</p>
              <div className="flex gap-2">
                <button onClick={() => setBankOpen(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button onClick={addFromBank} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700">Add Selected</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
