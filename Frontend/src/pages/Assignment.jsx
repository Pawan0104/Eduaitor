import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  FiEye,
  FiEdit2,
  FiTrash2,
  FiCheckCircle,
  FiXCircle,
  FiAlertTriangle,
  FiClock,
  FiAward,
  FiChevronRight,
  FiArrowLeft,
  FiX,
  FiSave,
  FiZap,
  FiCheck,
  FiSliders,
  FiThumbsUp,
  FiThumbsDown,
  FiRefreshCw,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

import { HiOutlineClipboardList, HiSparkles } from "react-icons/hi";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

const STEPS = ["Class", "Subject", "Chapter", "Topic", "Details", "Questions"];
const STEP_CLASS = 0,
  STEP_SUBJECT = 1,
  STEP_CHAPTER = 2;
const STEP_TOPIC = 3,
  STEP_DETAILS = 4,
  STEP_QUESTIONS = 5;

const DIFFICULTY = ["easy", "medium", "hard"];
const Q_TYPES = ["short", "long", "mcq"];

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function Assignment() {
  const { user, loading } = useAuth();
  const teacherId = user?.teacher_id;
  const schoolId = user?.school_id;
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  const [editingAssignmentId, setEditingAssignmentId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [step, setStep] = useState(STEP_CLASS);
  const [loadingg, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  // Multi-topic: array of selected topic objects
  const [selectedTopics, setSelectedTopics] = useState([]);

  const [details, setDetails] = useState({
    title: "",
    description: "",
    type: "homework",
    dueDate: "",
    duration: "",
    maxAttempts: 1,
  });

  // Approved questions (final list to submit)
  const [approvedQuestions, setApprovedQuestions] = useState([]);

  // AI generation state
  const [aiConfig, setAiConfig] = useState({
    numberOfQuestions: 5,
    difficulty: "medium",
    questionTypes: ["mcq", "short"],
  });
  const [generatingAI, setGeneratingAI] = useState(false);
  // Pending AI questions awaiting approval
  const [pendingQuestions, setPendingQuestions] = useState([]);
  const [editingPending, setEditingPending] = useState(null); // index

  // confirm modals
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const [viewingAssignment, setViewingAssignment] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  /* ── LOAD ── */
  useEffect(() => {
    fetchClasses();
    fetchAssignments();
  }, []);

  const fetchClasses = async () => {
    if (!teacherId) {
      setError("teacher_id not found in localStorage userData.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API}/teacher-academic/classes`, {
        withCredentials: true,
      });
      const data = res.data.data || [];
      setClasses(data);
      if (!data.length) setError("No classes found.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load classes");
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const res = await axios.get(`${API}/assignment/teacher`, {
        withCredentials: true,
      });
      setAssignments(res.data.data || []);
    } catch {
      /* silent */
    }
  };

  /* ── LOAD FOR EDIT ── */
  const loadAssignmentForEdit = async (a) => {
    setLoading(true);
    try {
      const [subRes, chRes, topRes] = await Promise.all([
        axios.get(`${API}/teacher-academic/subjects`, {
          params: { classId: a.classId._id },
          withCredentials: true,
        }),
        axios.get(`${API}/teacher-academic/chapters`, {
          params: {
            classId: a.classId._id,
            subjectId: a.subjectId._id,
          },
          withCredentials: true,
        }),
        axios.get(`${API}/teacher-academic/topics`, {
          params: { chapterId: a.chapterId._id },
          withCredentials: true,
        }),
      ]);
      setSubjects(subRes.data.data || []);
      setChapters(chRes.data.data || []);
      setTopics(topRes.data.data || []);
    } catch {
      /* non-critical */
    } finally {
      setLoading(false);
    }

    setSelectedClass(a.classId);
    setSelectedSubject(a.subjectId);
    setSelectedChapter(a.chapterId);
    setSelectedTopics(a.topicId ? [a.topicId] : []);
    setDetails({
      title: a.title || "",
      description: a.description || "",
      type: a.type || "homework",
      dueDate: a.dueDate ? a.dueDate.slice(0, 10) : "",
      duration: a.duration || "",
      maxAttempts: a.maxAttempts || 1,
    });
    setApprovedQuestions(JSON.parse(JSON.stringify(a.questions || [])));
    setPendingQuestions([]);
    setIsDirty(false);
    setEditingAssignmentId(a._id);
    setIsEditMode(true);
    setStep(STEP_DETAILS);
  };

  const handleEditClick = (a) => {
    if (a.isPublished) {
      toast.info("Unpublish this assignment first to edit.", { icon: "🔒" });
      return;
    }
    loadAssignmentForEdit(a);
  };

  /* ── STEP HANDLERS ── */
  const pickClass = async (cls) => {
    setSelectedClass(cls);
    setSelectedSubject(null);
    setSelectedChapter(null);
    setSelectedTopics([]);
    setSubjects([]);
    setChapters([]);
    setTopics([]);
    setError("");
    setLoading(true);
    try {
      const res = await axios.get(`${API}/teacher-academic/subjects`, {
        params: { classId: cls._id },
        withCredentials: true,
      });
      const data = res.data.data || [];
      setSubjects(data);
      if (!data.length) setError("No subjects found for this class.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load subjects");
    } finally {
      setLoading(false);
    }
    setStep(STEP_SUBJECT);
  };

  const pickSubject = async (sub) => {
    setSelectedSubject(sub);
    setSelectedChapter(null);
    setSelectedTopics([]);
    setChapters([]);
    setTopics([]);
    setError("");
    setLoading(true);
    try {
      const res = await axios.get(`${API}/teacher-academic/chapters`, {
        params: { classId: selectedClass._id, subjectId: sub._id },
        withCredentials: true,
      });
      const data = res.data.data || [];
      setChapters(data);
      if (!data.length) setError("No chapters found.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load chapters");
    } finally {
      setLoading(false);
    }
    setStep(STEP_CHAPTER);
  };

  const pickChapter = async (ch) => {
    setSelectedChapter(ch);
    setSelectedTopics([]);
    setTopics([]);
    setError("");
    setLoading(true);
    try {
      const res = await axios.get(`${API}/teacher-academic/topics`, {
        params: { chapterId: ch._id },
        withCredentials: true,
      });
      setTopics(res.data.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load topics");
    } finally {
      setLoading(false);
    }
    setStep(STEP_TOPIC);
  };

  const toggleTopic = (t) => {
    setSelectedTopics((prev) =>
      prev.some((x) => x._id === t._id)
        ? prev.filter((x) => x._id !== t._id)
        : [...prev, t],
    );
  };

  /* ── AI GENERATE ── */
  const handleGenerateAI = async () => {
    if (!selectedChapter) return toast.warn("Chapter not selected");
    setGeneratingAI(true);
    setPendingQuestions([]);
    try {
      const payload = {
        className: selectedClass?.name,
        subjectName: selectedSubject?.name,
        chapterName: selectedChapter?.name,
        topicNames:
          selectedTopics.length > 0 ? selectedTopics.map((t) => t.name) : null,
        questionTypes: aiConfig.questionTypes,
        numberOfQuestions: aiConfig.numberOfQuestions,
        difficulty: aiConfig.difficulty,
      };
      const res = await axios.post(
        `${API}/assignment/generate-questions`,
        payload,
        { withCredentials: true },
      );
      const qs = res.data.data || [];
      if (!qs.length)
        return toast.error("AI returned no questions. Try again.");
      // Mark all as "pending" (not yet approved)
      setPendingQuestions(qs.map((q) => ({ ...q, _status: "pending" })));
      toast.success(
        `${qs.length} questions generated! Review and approve below.`,
      );
    } catch (err) {
      toast.error(err?.response?.data?.message || "AI generation failed");
    } finally {
      setGeneratingAI(false);
    }
  };

  /* ── APPROVE / REJECT pending ── */
  const approvePending = (idx) => {
    const q = { ...pendingQuestions[idx] };
    delete q._status;
    setApprovedQuestions((prev) => [...prev, q]);
    setPendingQuestions((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, _status: "approved" } : p)),
    );
    if (isEditMode) setIsDirty(true);
  };

  const rejectPending = (idx) => {
    setPendingQuestions((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, _status: "rejected" } : p)),
    );
  };

  const approveAll = () => {
    const toAdd = pendingQuestions
      .filter((p) => p._status === "pending")
      .map((p) => {
        const q = { ...p };
        delete q._status;
        return q;
      });
    setApprovedQuestions((prev) => [...prev, ...toAdd]);
    setPendingQuestions((prev) =>
      prev.map((p) =>
        p._status === "pending" ? { ...p, _status: "approved" } : p,
      ),
    );
    if (isEditMode) setIsDirty(true);
  };

  const savePendingEdit = (idx, updated) => {
    setPendingQuestions((prev) =>
      prev.map((p, i) => (i === idx ? { ...updated, _status: "pending" } : p)),
    );
    setEditingPending(null);
  };

  const removeApproved = (idx) => {
    setApprovedQuestions((prev) => prev.filter((_, i) => i !== idx));
    if (isEditMode) setIsDirty(true);
  };

  const totalMarks = approvedQuestions.reduce(
    (s, q) => s + (Number(q.marks) || 0),
    0,
  );
  const pendingCount = pendingQuestions.filter(
    (p) => p._status === "pending",
  ).length;

  /* ── SUBMIT ── */
  const handleSaveClick = () => {
    if (!details.title.trim()) return toast.warn("Title is required");
    if (!details.dueDate) return toast.warn("Due date is required");
    if (!approvedQuestions.length)
      return toast.warn("Approve at least 1 question");
    setConfirmSave(true);
  };

  const doSave = async () => {
    setSubmitting(true);
    setConfirmSave(false);
    try {
      if (isEditMode) {
        await axios.put(
          `${API}/assignment/${editingAssignmentId}`,
          {
            ...details,
            questions: approvedQuestions,
            totalMarks,
          },
          {
            withCredentials: true,
          },
        );
        toast.success("Assignment updated!");
      } else {
        await axios.post(
          `${API}/assignment/create`,
          {
            classId: selectedClass._id,
            subjectId: selectedSubject._id,
            chapterId: selectedChapter._id,
            topicId:
              selectedTopics.length === 1 ? selectedTopics[0]._id : undefined,
            questions: approvedQuestions,
            ...details,
          },
          { withCredentials: true },
        );
        toast.success("Assignment created! 🎉");
      }
      await fetchAssignments();
      resetAll();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const resetAll = () => {
    setStep(STEP_CLASS);
    setIsEditMode(false);
    setEditingAssignmentId(null);
    setIsDirty(false);
    setSelectedClass(null);
    setSelectedSubject(null);
    setSelectedChapter(null);
    setSelectedTopics([]);
    setSubjects([]);
    setChapters([]);
    setTopics([]);
    setDetails({
      title: "",
      description: "",
      type: "homework",
      dueDate: "",
      duration: "",
      maxAttempts: 1,
    });
    setApprovedQuestions([]);
    setPendingQuestions([]);
    setEditingPending(null);
    fetchClasses();
  };

  const doDiscard = () => {
    resetAll();
    setConfirmDiscard(false);
  };
  const doDelete = async (id) => {
    try {
      await axios.delete(`${API}/assignment/${id}`, { withCredentials: true });
      toast.success("Deleted");
      setConfirmDelete(null);
      fetchAssignments();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Delete failed");
    }
  };
  const togglePublish = async (a) => {
    try {
      await axios.patch(
        `${API}/assignment/publish/${a._id}`,
        {},
        {
          withCredentials: true,
        },
      );
      toast.success(a.isPublished ? "Unpublished" : "Published ✓");
      fetchAssignments();
    } catch {
      toast.error("Failed to update publish status");
    }
  };

  const crumbs = [
    selectedClass?.name,
    selectedSubject?.name,
    selectedChapter?.name,
    selectedTopics.length ? selectedTopics.map((t) => t.name).join(", ") : null,
  ].filter(Boolean);

  /* ── TOPIC STEP ── */
  const renderTopicStep = () => (
    <div className="space-y-4">
      <StepHeader
        label="Select Topics (optional — multi-select)"
        onBack={() => setStep(STEP_CHAPTER)}
      />
      {topics.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-3xl mb-2">📌</p>
          <p className="text-sm text-[rgb(var(--text))]">
            No topics found for this chapter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
          {topics.map((t) => {
            const sel = selectedTopics.some((x) => x._id === t._id);
            return (
              <button
                key={t._id}
                onClick={() => toggleTopic(t)}
                className={`text-left border rounded-xl p-3.5 transition-all group
                  ${sel ? "border-indigo-400 bg-[rgb(var(--surface))] shadow-sm" : "border-gray-100"}`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`w-4 h-4 rounded flex items-center justify-center border-2 shrink-0 transition-colors
                    ${sel ? "border-indigo-500 bg-indigo-500" : "border-gray-300"}`}
                  >
                    {sel && <FiCheck className=" text-xs" />}
                  </span>
                  <span
                    className={`text-sm font-bold leading-snug ${sel ? "text-[rgb(var(--primary))]" : "text-[rgb(var(--text))]"}`}
                  >
                    {t.name}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      <div className="flex gap-3 pt-2">
        {selectedTopics.length > 0 && (
          <button
            onClick={() => setSelectedTopics([])}
            className="text-xs text-[rgb(var(--primary))] font-medium"
          >
            Clear selection
          </button>
        )}
        <button
          onClick={() => setStep(STEP_DETAILS)}
          className="bg-[rgb(var(--primary))] text-[rgb(var(--text))] p-3 rounded-xl flex items-center gap-2 ml-auto"
        >
          {selectedTopics.length > 0
            ? `Continue with ${selectedTopics.length} topic${selectedTopics.length > 1 ? "s" : ""}`
            : "Skip — use entire chapter"}{" "}
          <FiChevronRight />
        </button>
      </div>
    </div>
  );

  /* ── QUESTIONS STEP ── */
  const renderQuestionsStep = () => (
    <div className="space-y-5">
      <StepHeader
        label={`Questions • ${approvedQuestions.length} approved • ${totalMarks} marks`}
        onBack={() => setStep(STEP_DETAILS)}
      />

      {/* AI Config Panel */}
      <div className="border border-violet-200 bg-linear-to-br from-violet-50 to-indigo-50 rounded-2xl p-4 space-y-4">
        <div className="flex items-center gap-2">
          <HiSparkles className="text-violet-600 text-lg" />
          <h4 className="font-bold text-violet-800 text-sm">
            AI Question Generator
          </h4>
          <span className="ml-auto text-xs bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full font-semibold">
            {selectedTopics.length > 0
              ? `${selectedTopics.length} topic${selectedTopics.length > 1 ? "s" : ""} selected`
              : "Entire chapter"}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[rgb(var(--text))]">Questions</label>
            <input
              type="number"
              className=" "
              min={1}
              max={20}
              value={aiConfig.numberOfQuestions}
              onChange={(e) =>
                setAiConfig((c) => ({
                  ...c,
                  numberOfQuestions: Number(e.target.value),
                }))
              }
            />
          </div>
          <div>
            <label className="text-[rgb(var(--text))]">Difficulty</label>
            <select
              className=" "
              value={aiConfig.difficulty}
              onChange={(e) =>
                setAiConfig((c) => ({ ...c, difficulty: e.target.value }))
              }
            >
              {DIFFICULTY.map((d) => (
                <option key={d} value={d}>
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[rgb(var(--text))]">Types</label>
            <div className="flex gap-1 flex-wrap mt-1">
              {Q_TYPES.map((t) => {
                const active = aiConfig.questionTypes.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      setAiConfig((c) => ({
                        ...c,
                        questionTypes: active
                          ? c.questionTypes.filter((x) => x !== t)
                          : [...c.questionTypes, t],
                      }))
                    }
                    className={`text-xs px-2 py-1 rounded-lg border font-semibold transition-colors
                      ${active ? "border-violet-400 bg-violet-500 text-white" : "border-gray-200 text-[rgb(var(--text))] hover:border-violet-300"}`}
                  >
                    {t.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <button
          onClick={handleGenerateAI}
          disabled={generatingAI || !aiConfig.questionTypes.length}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm
            bg-violet-600 hover:bg-violet-700 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed
            active:scale-[0.98] shadow-sm"
        >
          {generatingAI ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
              Generating...
            </>
          ) : (
            <>
              <FiZap /> Generate Questions with AI
            </>
          )}
        </button>
      </div>

      {/* Pending AI Questions — Approval Queue */}
      {pendingQuestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-[rgb(var(--text))] flex items-center gap-2">
              <FiSliders className="text-violet-500" />
              Review Generated Questions
              {pendingCount > 0 && (
                <span className="bg-violet-100 text-violet-700 text-xs px-2 py-0.5 rounded-full font-bold">
                  {pendingCount} pending
                </span>
              )}
            </h4>
            {pendingCount > 0 && (
              <button
                onClick={approveAll}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors"
              >
                <FiCheckCircle /> Approve All Pending
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-95 overflow-y-auto pr-1">
            {pendingQuestions.map((q, i) => (
              <PendingQuestionCard
                key={i}
                index={i}
                question={q}
                isEditing={editingPending === i}
                onApprove={() => approvePending(i)}
                onReject={() => rejectPending(i)}
                onEditStart={() => setEditingPending(i)}
                onEditSave={(updated) => savePendingEdit(i, updated)}
                onEditCancel={() =>
                  setEditingPending(
                    i === editingPending ? null : editingPending,
                  )
                }
              />
            ))}
          </div>

          <button
            onClick={() => setPendingQuestions([])}
            className="text-xs text-[rgb(var(--text))] hover:text-[rgb(var(--text))] font-medium flex items-center gap-1"
          >
            <FiRefreshCw className="text-xs" /> Clear all & regenerate
          </button>
        </div>
      )}

      {/* Approved Questions List */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-[rgb(var(--text))] flex items-center gap-2">
          <FiCheckCircle className="text-emerald-500" />
          Approved Questions
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold
            ${approvedQuestions.length ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-[rgb(var(--text))]"}`}
          >
            {approvedQuestions.length}
          </span>
        </h4>

        {approvedQuestions.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
            <HiSparkles className="text-3xl text-[rgb(var(--text))] mx-auto mb-2" />
            <p className="text-sm text-[rgb(var(--text))]">
              Generate and approve questions above.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {approvedQuestions.map((q, i) => (
              <div
                key={i}
                className="flex items-start gap-3 border border-emerald-100 bg-emerald-50/30 rounded-xl px-4 py-3"
              >
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[rgb(var(--text))] truncate">
                    {q.text}
                  </p>
                  <p className="text-xs text-[rgb(var(--text))] mt-0.5">
                    {q.type.toUpperCase()} • {q.marks} mark
                    {q.marks !== 1 ? "s" : ""}
                    {q.type === "mcq" && ` • ${q.options.length} options`}
                  </p>
                </div>
                <button
                  onClick={() => removeApproved(i)}
                  className="text-xs text-red-400 hover:text-red-600 font-medium shrink-0"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={() => setConfirmDiscard(true)}
          className="btn-outline flex items-center gap-2"
        >
          <FiX /> {isEditMode ? "Cancel Edit" : "Discard"}
        </button>
        <button
          onClick={handleSaveClick}
          disabled={submitting}
          className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {isEditMode ? "Updating..." : "Creating..."}
            </>
          ) : (
            <>
              <FiSave />{" "}
              {isEditMode
                ? "Update Assignment"
                : `Create Assignment (${approvedQuestions.length} Q • ${totalMarks} marks)`}
            </>
          )}
        </button>
      </div>
    </div>
  );

  /* ── STEP CONTENT ── */
  const renderStep = () => {
    if (loadingg)
      return (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[rgb(var(--text))]">Loading...</p>
        </div>
      );
    if (step === STEP_CLASS)
      return (
        <CardGrid
          label="Select a Class"
          items={classes}
          onPick={pickClass}
          icon="🏫"
          emptyText="No classes assigned."
        />
      );
    if (step === STEP_SUBJECT)
      return (
        <CardGrid
          label="Select a Subject"
          items={subjects}
          onPick={pickSubject}
          icon="📚"
          emptyText="No subjects."
          onBack={() => setStep(STEP_CLASS)}
          renderExtra={(item) => item.teacherName}
        />
      );
    if (step === STEP_CHAPTER)
      return (
        <CardGrid
          label="Select a Chapter"
          items={chapters}
          onPick={pickChapter}
          icon="📖"
          emptyText="No chapters."
          onBack={() => setStep(STEP_SUBJECT)}
        />
      );
    if (step === STEP_TOPIC) return renderTopicStep();
    if (step === STEP_DETAILS)
      return (
        <div className="space-y-4">
          <StepHeader
            label="Assignment Details"
            onBack={isEditMode ? null : () => setStep(STEP_TOPIC)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-[rgb(var(--text))] mb-2">Title *</label>
              <input
                className="border w-full p-2 rounded-xl bg-[rgb(var(--surface))] text-[rgb(var(--text))]"
                placeholder="e.g. Chapter 3 Homework"
                value={details.title}
                onChange={(e) => {
                  setDetails({ ...details, title: e.target.value });
                  if (isEditMode) setIsDirty(true);
                }}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[rgb(var(--text))] mb-1">Description</label>
              <textarea
                className="w-full m-1 border rounded-xl bg-[rgb(var(--surface))] text-[rgb(var(--text))] resize-none"
                rows={3}
                placeholder="Optional instructions..."
                value={details.description}
                onChange={(e) => {
                  setDetails({ ...details, description: e.target.value });
                  if (isEditMode) setIsDirty(true);
                }}
              />
            </div>
            <div>
              <label className="text-[rgb(var(--text))] mr-2">Type</label>
              <select
                className="  bg-[rgb(var(--surface))] text-[rgb(var(--text))] border p-1"
                value={details.type}
                onChange={(e) => {
                  setDetails({ ...details, type: e.target.value });
                  if (isEditMode) setIsDirty(true);
                }}
              >
                <option value="homework">Homework</option>
                <option value="quiz">Quiz</option>
                <option value="exam">Exam</option>
              </select>
            </div>
            <div>
              <label className="text-[rgb(var(--text))]">Due Date *</label>
              <input
                type="date"
                className="w-full border rounded-xl bg-[rgb(var(--surface))] text-[rgb(var(--text))]"
                value={details.dueDate}
                onChange={(e) => {
                  setDetails({ ...details, dueDate: e.target.value });
                  if (isEditMode) setIsDirty(true);
                }}
              />
            </div>
            <div>
              <label className="text-[rgb(var(--text))]">Duration (minutes)</label>
              <input
                type="number"
                className="bg-[rgb(var(--surface))] w-full mb-2 border p-2 rounded-xl text-[rgb(var(--text))]"
                placeholder="e.g. 60"
                min={1}
                value={details.duration}
                onChange={(e) => {
                  setDetails({ ...details, duration: e.target.value });
                  if (isEditMode) setIsDirty(true);
                }}
              />
            </div>
            <div>
              <label className="text-[rgb(var(--text))]">Max Attempts</label>
              <input
                type="number"
                className="w-full bg-[rgb(var(--surface))] border p-2 rounded-xl text-[rgb(var(--text))]"
                min={1}
                value={details.maxAttempts}
                onChange={(e) => {
                  setDetails({
                    ...details,
                    maxAttempts: Number(e.target.value),
                  });
                  if (isEditMode) setIsDirty(true);
                }}
              />
            </div>
          </div>
          <button
            onClick={() => {
              if (!details.title.trim()) return toast.warn("Title is required");
              if (!details.dueDate) return toast.warn("Due date is required");
              setStep(STEP_QUESTIONS);
            }}
            className="bg-[rgb(var(--primary))] p-2 rounded-xl text-[rgb(var(--text))] w-full flex items-center justify-center gap-2 mt-2"
          >
            Continue to Questions <FiChevronRight />
          </button>
        </div>
      );
    if (step === STEP_QUESTIONS) return renderQuestionsStep();
  };

  /* ── MAIN RENDER ── */
  return (
    <>
      <style>{styles}</style>
      {/* 🔙 BACK BUTTON */}
      {isMobile && (
        <div className="pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl
                 bg-white shadow-sm border border-slate-100
                 text-sm font-bold text-slate-600 active:scale-95 transition-transform mb-2.5"
          >
            <FaArrowLeft size={16} />
            Back
          </button>
        </div>
      )}
      <div className=" p-4 sm:p-6">
        <div className="mx-auto">
          {/* Page header */}
          <div className="mb-6 flex items-center gap-3">
            <span className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
              <HiOutlineClipboardList className="text-white text-xl" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-[rgb(var(--text))]">
                {isEditMode ? "Edit Assignment" : "Assignments"}
              </h1>
              <p className="text-sm text-[rgb(var(--text))]">
                {isEditMode
                  ? "Editing draft — changes won't save until you confirm"
                  : "Create AI-powered assignments for your classes"}
              </p>
            </div>
            {isEditMode && (
              <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full font-semibold flex items-center gap-1.5">
                <FiEdit2 /> Edit Mode {isDirty && "• Unsaved changes"}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* LEFT: Wizard */}
            <div className="lg:col-span-3 bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-2xl shadow-sm border border-gray-100 p-6">
              {(!teacherId || !schoolId) && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-mono text-red-700">
                  <strong>⚠ Config:</strong> teacherId={String(teacherId)}{" "}
                  schoolId={String(schoolId)}
                  <br />
                  keys: [{Object.keys(user).join(", ")}]
                </div>
              )}
              {error && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-start gap-2">
                  <FiAlertTriangle className="text-amber-500 mt-0.5 shrink-0" />
                  <span className="flex-1">{error}</span>
                  <button
                    onClick={() => setError("")}
                    className="text-amber-400 hover:text-amber-600 shrink-0"
                  >
                    <FiX />
                  </button>
                </div>
              )}
              {/* Progress */}
              <div className="mb-6">
                <div className="flex items-center gap-0.5 mb-2">
                  {STEPS.map((s, i) => (
                    <div key={i} className="flex items-center flex-1">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300
                        ${i < step ? "bg-[rgb(var(--primary))]  text-[rgb(var(--text))]" : i === step ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-400" : " border text-[rgb(var(--text))]"}`}
                      >
                        {i < step ? "✓" : i + 1}
                      </div>
                      {i < STEPS.length - 1 && (
                        <div
                          className={`h-0.5 flex-1 mx-0.5 rounded transition-all duration-500 ${i < step ? "bg-indigo-400" : "bg-gray-200"}`}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[rgb(var(--text))] font-semibold tracking-widest uppercase">
                  {isEditMode
                    ? "Edit Mode"
                    : `Step ${step + 1}/${STEPS.length}`}{" "}
                  — {STEPS[step]}
                </p>
              </div>
              {/* Breadcrumb */}
              {crumbs.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 mb-5 text-xs">
                  {crumbs.map((c, i) => (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && <FiChevronRight className="text-[rgb(var(--text))]" />}
                      <span className="bg-[rgb(var(--primary))] text-[rgb(var(--text))] px-2 py-0.5 rounded-md font-semibold">
                        {c}
                      </span>
                    </span>
                  ))}
                </div>
              )}
              {renderStep()}
            </div>

            {/* RIGHT: List */}
            <div className="lg:col-span-2 bg-[rgb(var(--surface))] text-[rgb(var(--text))]  rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-[rgb(var(--text))]">My Assignments</h2>
                <span className="text-xs bg-indigo-100 text-indigo-600 px-2.5 py-1 rounded-full font-bold">
                  {assignments.length}
                </span>
              </div>
              {assignments.length === 0 ? (
                <div className="text-center py-16 text-[rgb(var(--text))]">
                  <HiOutlineClipboardList className="text-5xl mx-auto mb-3 text-[rgb(var(--text))]" />
                  <p className="text-sm font-semibold">No assignments yet</p>
                  <p className="text-xs mt-1 text-[rgb(var(--text))]">
                    Create one using the wizard
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[72vh] overflow-y-auto pr-0.5">
                  {assignments.map((a) => (
                    <div
                      key={a._id}
                      className={`border rounded-xl p-3.5 hover:shadow-sm transition-all duration-200
                        ${editingAssignmentId === a._id ? "border-amber-300 bg-amber-50/40" : "border-gray-100 hover:border-indigo-200"}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-sm text-[rgb(var(--text))] leading-snug line-clamp-2">
                          {a.title}
                        </h3>
                        <span
                          className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-bold
                          ${a.isPublished ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                        >
                          {a.isPublished ? "● Live" : "○ Draft"}
                        </span>
                      </div>
                      <p className="text-xs text-[rgb(var(--text))] mb-2">
                        {a.classId?.name} • {a.subjectId?.name}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-[rgb(var(--text))] mb-3">
                        <span className="flex items-center gap-1">
                          <FiAward className="text-indigo-400" />
                          {a.totalMarks} marks
                        </span>
                        <span className="flex items-center gap-1">
                          <HiOutlineClipboardList className="text-indigo-400" />
                          {a.questions?.length || 0} Q
                        </span>
                        {a.dueDate && (
                          <span className="flex items-center gap-1">
                            <FiClock className="text-indigo-400" />
                            {new Date(a.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setViewingAssignment(a)}
                          className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg border border-gray-200 text-[rgb(var(--text))] cursor-pointer transition-colors font-semibold"
                        >
                          <FiEye className="text-xs" /> View
                        </button>
                        <button
                          onClick={() => handleEditClick(a)}
                          className={`flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg border font-semibold transition-colors
                            ${
                              a.isPublished
                                ? "border-gray-100 text-[rgb(var(--text))] cursor-not-allowed "
                                : editingAssignmentId === a._id
                                  ? "border-amber-400 text-amber-700 bg-amber-50"
                                  : "border-gray-200 text-[rgb(var(--text))] hover:border-amber-300 hover:text-[rgb(var(--text))] hover:bg-[rgb(var(--primary))]"
                            }`}
                        >
                          <FiEdit2 className="text-xs" />
                          {editingAssignmentId === a._id
                            ? "Editing..."
                            : "Edit"}
                        </button>
                        <button
                          onClick={() => togglePublish(a)}
                          className={`flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg border font-semibold transition-colors
                            ${
                              a.isPublished
                                ? "border-gray-200 text-[rgb(var(--text))]  hover:bg-[rgb(var(--primary))]"
                                : "border-gray-200 text-[rgb(var(--text))] hover:bg-[rgb(var(--bg))]"
                            }`}
                        >
                          {a.isPublished ? (
                            <>
                              <FiXCircle className="text-xs" /> Unpublish
                            </>
                          ) : (
                            <>
                              <FiCheckCircle className="text-xs" /> Publish
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(a._id)}
                          className="p-1.5 rounded-lg border border-gray-200 text-[rgb(var(--text))] hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <FiTrash2 className="text-xs" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ViewModal
        assignment={viewingAssignment}
        onClose={() => setViewingAssignment(null)}
      />
      <ConfirmModal
        open={!!confirmDelete}
        title="Delete Assignment?"
        message="This action cannot be undone."
        confirmLabel="Yes, Delete"
        confirmColor="red"
        onConfirm={() => doDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
      <ConfirmModal
        open={confirmSave}
        title={isEditMode ? "Save Changes?" : "Create Assignment?"}
        message={
          isEditMode
            ? "Update this assignment?"
            : `Create with ${approvedQuestions.length} question${approvedQuestions.length !== 1 ? "s" : ""} worth ${totalMarks} marks?`
        }
        confirmLabel={isEditMode ? "Yes, Update" : "Yes, Create"}
        confirmColor="indigo"
        onConfirm={doSave}
        onCancel={() => setConfirmSave(false)}
      />
      <ConfirmModal
        open={confirmDiscard}
        title={isEditMode ? "Cancel Edit?" : "Discard Assignment?"}
        message={
          isEditMode
            ? "Your changes will be lost."
            : "All progress will be lost."
        }
        confirmLabel="Yes, Discard"
        confirmColor="red"
        onConfirm={doDiscard}
        onCancel={() => setConfirmDiscard(false)}
      />
    </>
  );
}

/* ─────────────────────────────────────────────
   PENDING QUESTION CARD
───────────────────────────────────────────── */
function PendingQuestionCard({
  question: q,
  index,
  isEditing,
  onApprove,
  onReject,
  onEditStart,
  onEditSave,
  onEditCancel,
}) {
  const [draft, setDraft] = useState({ ...q });

  useEffect(() => {
    setDraft({ ...q });
  }, [q]);

  const statusStyle =
    {
      pending: "border-violet-200 bg-white",
      approved: "border-emerald-200 bg-emerald-50/40 opacity-70",
      rejected: "border-red-200 bg-red-50/30 opacity-50",
    }[q._status] || "border-gray-200 bg-white";

  if (isEditing)
    return (
      <div className="border border-violet-300 rounded-xl p-4 space-y-3 bg-violet-50/30">
        <textarea
          className="  resize-none"
          rows={2}
          value={draft.text}
          onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[rgb(var(--text))]">Type</label>
            <select
              className=" "
              value={draft.type}
              onChange={(e) =>
                setDraft((d) => ({ ...d, type: e.target.value, options: [] }))
              }
            >
              <option value="short">Short</option>
              <option value="long">Long</option>
              <option value="mcq">MCQ</option>
            </select>
          </div>
          <div>
            <label className="text-[rgb(var(--text))]">Marks</label>
            <input
              type="number"
              className=" "
              min={0}
              value={draft.marks}
              onChange={(e) =>
                setDraft((d) => ({ ...d, marks: Number(e.target.value) }))
              }
            />
          </div>
        </div>
        {draft.type === "mcq" && (
          <div className="space-y-2">
            {(draft.options || []).map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={opt.isCorrect}
                  onChange={(e) => {
                    const opts = [...draft.options];
                    opts[i] = { ...opts[i], isCorrect: e.target.checked };
                    setDraft((d) => ({ ...d, options: opts }));
                  }}
                  className="w-4 h-4 accent-emerald-500"
                />
                <input
                  className="  flex-1"
                  value={opt.text}
                  onChange={(e) => {
                    const opts = [...draft.options];
                    opts[i] = { ...opts[i], text: e.target.value };
                    setDraft((d) => ({ ...d, options: opts }));
                  }}
                />
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => onEditSave(draft)}
            className="btn-primary flex-1 flex items-center justify-center gap-1 text-xs py-2"
          >
            <FiSave /> Save Changes
          </button>
          <button
            onClick={onEditCancel}
            className="btn-outline text-xs px-4 py-2"
          >
            Cancel
          </button>
        </div>
      </div>
    );

  return (
    <div className={`border rounded-xl p-3.5 transition-all ${statusStyle}`}>
      <div className="flex items-start gap-3">
        <span
          className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5
          ${
            q._status === "approved"
              ? "bg-emerald-100 text-emerald-700"
              : q._status === "rejected"
                ? "bg-red-100 text-red-400"
                : "bg-violet-100 text-violet-700"
          }`}
        >
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[rgb(var(--text))]">{q.text}</p>
          <div className="flex gap-2 mt-1 flex-wrap">
            <span className="text-xs bg-gray-100 text-[rgb(var(--text))] px-2 py-0.5 rounded-full font-medium uppercase">
              {q.type}
            </span>
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
              {q.marks} mark{q.marks !== 1 ? "s" : ""}
            </span>
            {q._status !== "pending" && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold
                ${q._status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-500"}`}
              >
                {q._status === "approved" ? "✓ Approved" : "✕ Rejected"}
              </span>
            )}
          </div>
          {q.type === "mcq" && q.options?.length > 0 && (
            <div className="mt-2 space-y-1">
              {q.options.map((o, j) => (
                <div
                  key={j}
                  className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg
                  ${o.isCorrect ? "bg-emerald-50 text-emerald-700 font-medium" : "bg-gray-50 text-[rgb(var(--text))]"}`}
                >
                  {o.isCorrect ? (
                    <FiCheckCircle className="shrink-0" />
                  ) : (
                    <FiXCircle className="shrink-0 text-[rgb(var(--text))]" />
                  )}
                  {o.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {q._status === "pending" && (
        <div className="flex gap-2 mt-3 ml-9">
          <button
            onClick={onApprove}
            className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors"
          >
            <FiThumbsUp /> Approve
          </button>
          <button
            onClick={onEditStart}
            className="flex items-center justify-center gap-1 text-xs py-1.5 px-3 rounded-lg border border-violet-300 text-violet-600 hover:bg-violet-50 font-semibold transition-colors"
          >
            <FiEdit2 /> Edit
          </button>
          <button
            onClick={onReject}
            className="flex items-center justify-center gap-1 text-xs py-1.5 px-3 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 font-semibold transition-colors"
          >
            <FiThumbsDown />
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SUB-COMPONENTS (unchanged)
───────────────────────────────────────────── */
function CardGrid({
  label,
  items,
  onPick,
  icon,
  emptyText,
  onBack,
  renderExtra,
}) {
  return (
    <div>
      <StepHeader label={label} onBack={onBack} />

      {items.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl mt-4">
          <p className="text-3xl mb-2">{icon}</p>
          <p className="text-sm text-[rgb(var(--text))]">{emptyText}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
          {items.map((item) => (
            <button
              key={item._id}
              onClick={() => onPick(item)}
              className="text-left border border-gray-100 rounded-xl p-3.5 hover:border-[rgb(var(--primary))]  transition-all group"
            >
              <span className="block text-xl mb-2">{icon}</span>

              <span className="text-sm font-bold text-[rgb(var(--text))] group-hover:text-[rgb(var(--primary))] block">
                {item.name}
              </span>

              {renderExtra && (
                <span className="text-xs text-[rgb(var(--text))] block mt-1">
                  {renderExtra(item)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StepHeader({ label, onBack }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {onBack && (
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-[rgb(var(--text))] hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
        >
          <FiArrowLeft />
        </button>
      )}
      <h3 className="font-bold text-[rgb(var(--text))]">{label}</h3>
    </div>
  );
}

function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  confirmColor = "indigo",
  onConfirm,
  onCancel,
}) {
  if (!open) return null;
  const colors = {
    indigo: "bg-indigo-600 hover:bg-indigo-700",
    red: "bg-red-500 hover:bg-red-600",
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-[rgb(var(--surface))]  rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-modal">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto ${confirmColor === "red" ? "bg-red-100" : "bg-indigo-100"}`}
        >
          <FiAlertTriangle
            className={`text-xl ${confirmColor === "red" ? "text-red-500" : "text-indigo-500"}`}
          />
        </div>
        <h3 className="text-center font-bold text-[rgb(var(--text))] text-lg mb-2">
          {title}
        </h3>
        <p className="text-center text-[rgb(var(--text))] text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-[rgb(var(--text))] hover:bg-[rgb(var(--primary))] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold bg-[rgb(var(--primary))] text-[rgb(var(--text))] transition-colors `}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ViewModal({ assignment, onClose }) {
  if (!assignment) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-modal">
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${assignment.isPublished ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
              >
                {assignment.isPublished ? "● Live" : "○ Draft"}
              </span>
              <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-medium capitalize">
                {assignment.type}
              </span>
            </div>
            <h2 className="text-xl font-bold text-[rgb(var(--text))]">
              {assignment.title}
            </h2>
            <p className="text-sm text-[rgb(var(--text))] mt-0.5">
              {assignment.classId?.name} › {assignment.subjectId?.name} ›{" "}
              {assignment.chapterId?.name}
              {assignment.topicId?.name && ` › ${assignment.topicId.name}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[rgb(var(--text))] hover:text-[rgb(var(--text))] p-1"
          >
            <FiX className="text-xl" />
          </button>
        </div>
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
          {[
            {
              icon: <FiAward />,
              label: "Total Marks",
              value: assignment.totalMarks ?? 0,
            },
            {
              icon: <HiOutlineClipboardList />,
              label: "Questions",
              value: assignment.questions?.length ?? 0,
            },
            {
              icon: <FiClock />,
              label: "Due Date",
              value: assignment.dueDate
                ? new Date(assignment.dueDate).toLocaleDateString()
                : "—",
            },
          ].map((s, i) => (
            <div key={i} className="flex flex-col items-center py-4 gap-1">
              <span className="text-indigo-400 text-lg">{s.icon}</span>
              <span className="text-lg font-bold text-[rgb(var(--text))]">{s.value}</span>
              <span className="text-xs text-[rgb(var(--text))]">{s.label}</span>
            </div>
          ))}
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {assignment.description && (
            <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] border rounded-xl p-4">
              <p className="text-xs font-semibold text-[rgb(var(--text))] uppercase tracking-wide mb-1">
                Description
              </p>
              <p className="text-sm text-[rgb(var(--text))]">{assignment.description}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-[rgb(var(--text))] uppercase tracking-wide mb-3">
              Questions
            </p>
            <div className="space-y-3">
              {(assignment.questions || []).map((q, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[rgb(var(--text))]">
                        {q.text}
                      </p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs bg-[rgb(var(--primary))] text-[rgb(var(--text))] px-2 py-0.5 rounded-full font-medium uppercase">
                          {q.type}
                        </span>
                        <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                          {q.marks} mark{q.marks !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {q.type === "mcq" && q.options?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {q.options.map((o, j) => (
                            <div
                              key={j}
                              className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${o.isCorrect ? "bg-[rgb(var(--primary))] text-[rgb(var(--text))] font-medium" : "bg-gray-50 text-[rgb(var(--text))]"}`}
                            >
                              {o.isCorrect ? (
                                <FiCheckCircle className="shrink-0" />
                              ) : (
                                <FiXCircle className="shrink-0 text-[rgb(var(--text))]" />
                              )}
                              {o.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  body { font-family: 'Plus Jakarta Sans', sans-serif; }
  .text-[rgb(var(--text))] { display: block; font-size: 0.7rem; font-weight: 700; color: #9ca3af; margin-bottom: 5px; letter-spacing: 0.05em; text-transform: uppercase; }
  .  { display: block; width: 100%; border: 1.5px solid #e5e7eb; border-radius: 10px; padding: 9px 12px; font-size: 0.875rem; color: #1f2937; background: white; outline: none; transition: border-color 0.15s, box-shadow 0.15s; font-family: 'Plus Jakarta Sans', sans-serif; }
  . :focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
  .btn-primary { background: #4f46e5; color: white; border-radius: 10px; padding: 10px 20px; font-size: 0.875rem; font-weight: 700; border: none; cursor: pointer; transition: background 0.15s, transform 0.1s, box-shadow 0.15s; font-family: 'Plus Jakarta Sans', sans-serif; }
  .btn-primary:hover:not(:disabled) { background: #4338ca; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(79,70,229,0.25); }
  .btn-primary:active:not(:disabled) { transform: translateY(0); }
  .btn-outline { border: 1.5px solid #e5e7eb; color: #6b7280; border-radius: 10px; padding: 10px 16px; font-size: 0.875rem; font-weight: 600; background: white; cursor: pointer; transition: border-color 0.15s, color 0.15s, background 0.15s; font-family: 'Plus Jakarta Sans', sans-serif; }
  .btn-outline:hover { border-color: #6366f1; color: #4f46e5; background: #eef2ff; }
  @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
  .animate-modal { animation: modalIn 0.2s ease-out; }
  .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
`;
