import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import {FaArrowLeft} from "react-icons/fa";
import { useNavigate } from "react-router-dom";


const API = import.meta.env.VITE_API_URL;

const STATUS_COLOR = {
  submitted: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  overdue: "bg-red-100 text-red-700",
};

export default function ParentAssignment() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // list | attempt | report
  const [selected, setSelected] = useState(null);
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (user?.student_id) fetchAssignments();
  }, [user]);

    const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;


  const fetchAssignments = async () => {
    try {
      const res = await axios.get(`${API}/assignment/student/list`, {
        withCredentials: true,
      });
      setAssignments(res.data.data || []);
    } catch {
      toast.error("Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  const openAttempt = async (a) => {
    try {
      const res = await axios.get(`${API}/assignment/student/${a._id}`, {
        withCredentials: true,
      });
      setSelected(res.data.data);
      setView("attempt");
    } catch {
      toast.error("Failed to load assignment");
    }
  };

  const openReport = async (a) => {
    try {
      const res = await axios.get(`${API}/assignment/student/${a._id}/report`, {
        withCredentials: true,
      });
      setReport(res.data.data);
      setView("report");
    } catch {
      toast.error("Failed to load report");
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen text-[rgb(var(--text))]">
        Loading...
      </div>
    );

  if (view === "attempt" && selected)
    return (
      <AttemptView
        assignment={selected}
        onBack={() => {
          setView("list");
          setSelected(null);
        }}
        onSubmitted={() => {
          fetchAssignments();
          setView("list");
          setSelected(null);
        }}
      />
    );

  if (view === "report" && report)
    return (
      <ReportView
        report={report}
        onBack={() => {
          setView("list");
          setReport(null);
        }}
      />
    );

  return (
    <div className="p-4 sm:p-6 lg:p-8   text-[rgb(var(--text))] min-h-screen">
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold ">My Assignments</h1>
        <p className="text-sm  mt-1">
          {assignments.length} assignment{assignments.length !== 1 ? "s" : ""}{" "}
          available
        </p>
      </div>

      {assignments.length === 0 ? (
        <div className="text-center py-20 text-[rgb(var(--text))]">
          <p className="text-5xl mb-3">📋</p>
          <p className="font-medium">No assignments yet</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {assignments.map((a) => {
            const submitted = !!a.mySubmission;
            const overdue = !submitted && new Date(a.dueDate) < new Date();
            const tag = submitted
              ? "submitted"
              : overdue
                ? "overdue"
                : "pending";

            return (
              <div
                key={a._id}
              className="bg-[rgb(var(--bg))]  text-[rgb(var(--text))] rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between h-full"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-semibold text-[rgb(var(--text))] leading-snug">
                      {a.title}
                    </h3>
                    <p className="text-xs text-[rgb(var(--text))] mt-0.5">
                      {a.subjectId?.name}
                      {a.chapterId?.name ? ` · ${a.chapterId.name}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${STATUS_COLOR[tag]}`}
                  >
                    {tag}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-[rgb(var(--text))] mb-4">
                  <span>🏆 {a.totalMarks} marks</span>
                  <span>❓ {a.questions?.length} questions</span>
                  <span>
                    📅 {new Date(a.dueDate).toLocaleDateString("en-IN")}
                  </span>
                </div>

                {submitted ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-green-50 rounded-xl px-3 py-2">
                      <span className="text-xs text-green-700 font-medium">
                        Score: {a.mySubmission.totalMarksAwarded}/
                        {a.mySubmission.totalMarks}
                      </span>
                      <span className="text-sm font-bold text-green-700">
                        {a.mySubmission.percentage}%
                      </span>
                    </div>
                    <button
                      onClick={() => openReport(a)}
                      className="w-full py-2 rounded-xl border border-indigo-200  text-sm font-semibold  
                        cursor-pointer
                      transition"
                    >
                      View Report
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => openAttempt(a)}
                    disabled={overdue}
                    className={`w-full py-2 rounded-xl text-sm font-semibold transition
                      ${
                        overdue
                          ? "bg-[rgb(var(--primary-light))] text-[rgb(var(--text))] cursor-not-allowed"
                          : "bg-indigo-600 hover:bg-indigo-700 text-[rgb(var(--text))] cursor-pointer"
                      }`}
                  >
                    {overdue ? "Overdue" : "Start Assignment"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── ATTEMPT VIEW ─── */
function AttemptView({ assignment, onBack, onSubmitted }) {
  const [answers, setAnswers] = useState(
    assignment.questions.map((_, i) => ({ questionIndex: i })),
  );
  const [submitting, setSubmitting] = useState(false);
  const [startTime] = useState(Date.now());

  const setAnswer = (idx, patch) => {
    setAnswers((prev) =>
      prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)),
    );
  };

  const handleSubmit = async () => {
    const unanswered = answers.filter((a, i) =>
      assignment.questions[i].type === "mcq"
        ? a.selectedOptionIndex == null
        : !a.textAnswer?.trim(),
    );
    if (unanswered.length) {
      return toast.warn(`${unanswered.length} question(s) unanswered`);
    }

    setSubmitting(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/assignment/student/${assignment._id}/submit`,
        {
          answers,
          timeTakenSeconds: Math.round((Date.now() - startTime) / 1000),
        },
        { withCredentials: true },
      );
      toast.success("Submitted successfully!");
      onSubmitted();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <button
            onClick={onBack}
            className="text-sm text-gray-600 hover:text-[rgb(var(--text))] mb-4 flex items-center gap-1"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold text-[rgb(var(--text))]">
            {assignment.title}
          </h1>
          {assignment.description && (
            <p className="text-sm text-[rgb(var(--text))] mt-1">
              {assignment.description}
            </p>
          )}
          <div className="flex gap-4 text-xs text-[rgb(var(--text))] mt-3">
            <span>🏆 {assignment.totalMarks} marks</span>
            <span>❓ {assignment.questions.length} questions</span>
            {assignment.duration && <span>⏱ {assignment.duration} min</span>}
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4 mb-6">
          {assignment.questions.map((q, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
            >
              <div className="flex items-start gap-3 mb-4">
                <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{q.text}</p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs bg-gray-100 text-[rgb(var(--text))] px-2 py-0.5 rounded-full uppercase font-medium">
                      {q.type}
                    </span>
                    <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                      {q.marks} mark{q.marks !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>

              {q.type === "mcq" ? (
                <div className="space-y-2 ml-10">
                  {q.options.map((opt, oi) => (
                    <label
                      key={oi}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition
                        ${
                          answers[idx].selectedOptionIndex === oi
                            ? "border-indigo-400 bg-indigo-50"
                            : "border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/40"
                        }`}
                    >
                      <input
                        type="radio"
                        name={`q-${idx}`}
                        className="accent-indigo-600"
                        checked={answers[idx].selectedOptionIndex === oi}
                        onChange={() =>
                          setAnswer(idx, { selectedOptionIndex: oi })
                        }
                      />
                      <span className="text-sm text-gray-700">{opt.text}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  className="w-full ml-10 border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  style={{ width: "calc(100% - 2.5rem)" }}
                  rows={q.type === "long" ? 5 : 2}
                  placeholder={`Write your ${q.type === "long" ? "detailed " : ""}answer here...`}
                  value={answers[idx].textAnswer || ""}
                  onChange={(e) =>
                    setAnswer(idx, { textAnswer: e.target.value })
                  }
                />
              )}
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit Assignment"}
        </button>
      </div>
    </div>
  );
}

/* ─── REPORT VIEW ─── */
function ReportView({ report, onBack }) {
  const a = report;
  const pct = a.percentage || 0;

  const GRADE = (p) =>
    p >= 90
      ? "A+"
      : p >= 80
        ? "A"
        : p >= 70
          ? "B"
          : p >= 60
            ? "C"
            : p >= 40
              ? "D"
              : "F";
  const BAR_COLOR = (p) =>
    p >= 70 ? "bg-green-500" : p >= 40 ? "bg-amber-400" : "bg-red-400";
  const GRADE_BG = (p) =>
    p >= 70
      ? "bg-green-50 text-green-700"
      : p >= 40
        ? "bg-amber-50 text-amber-700"
        : "bg-red-50 text-red-600";

  const mcqAnswers = a.answers.filter((ans) => ans.questionType === "mcq");
  const mcqCorrect = mcqAnswers.filter((ans) => ans.isCorrect).length;
  const subjAnswers = a.answers.filter((ans) => ans.questionType !== "mcq");

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto w-full">
        <button
          onClick={onBack}
          className="text-sm text-gray-600 hover:text-[rgb(var(--text))] mb-4 flex items-center gap-1"
        >
          ← Back to assignments
        </button>

        {/* Score card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
          <div className="text-center mb-5">
            <p className="text-sm text-[rgb(var(--text))] mb-4">Your score</p>
            <div
              className={`inline-flex items-center justify-center w-24 h-24 rounded-full text-4xl font-bold mb-3 ${GRADE_BG(pct)}`}
            >
              {GRADE(pct)}
            </div>
            <div className="text-2xl font-bold text-gray-800">
              {a.totalMarksAwarded} / {a.totalMarks}
              <span className="text-base font-normal text-[rgb(var(--text))] ml-1">
                marks
              </span>
            </div>
            <div className="text-sm text-[rgb(var(--text))] mt-1">
              {pct}% · Attempt #{a.attemptNumber}
            </div>
            <div className="mt-4 bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-700 ${BAR_COLOR(pct)}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "MCQ Correct",
                value: `${mcqCorrect}/${mcqAnswers.length}`,
                bg: "bg-green-50",
                text: "text-green-700",
              },
              {
                label: "MCQ Wrong",
                value: `${mcqAnswers.length - mcqCorrect}/${mcqAnswers.length}`,
                bg: "bg-red-50",
                text: "text-red-600",
              },
              {
                label: "Subjective",
                value: subjAnswers.length,
                bg: "bg-blue-50",
                text: "text-blue-700",
              },
              {
                label: "Time Taken",
                value: a.timeTakenSeconds
                  ? `${Math.round(a.timeTakenSeconds / 60)} min`
                  : "—",
                bg: "bg-purple-50",
                text: "text-purple-700",
              },
            ].map((s, i) => (
              <div
                key={i}
                className={`${s.bg} rounded-xl py-3 px-4 text-center`}
              >
                <p className="text-xs text-[rgb(var(--text))]">{s.label}</p>
                <p className={`text-lg font-bold mt-0.5 ${s.text}`}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Question breakdown */}
        <h3 className="font-bold text-gray-800 text-base mb-3">
          Question Breakdown
          <span className="ml-2 text-sm font-normal text-[rgb(var(--text))]">
            {a.answers.length} questions
          </span>
        </h3>

        <div className="space-y-4">
          {a.answers.map((ans, idx) => {
            const isMCQ = ans.questionType === "mcq";
            const isCorrect = ans.isCorrect;
            const isPending = !isMCQ;

            return (
              <div
                key={idx}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden
                  ${
                    isPending
                      ? "border-gray-200"
                      : isCorrect
                        ? "border-green-200"
                        : "border-red-200"
                  }`}
              >
                {/* Question header bar */}
                <div
                  className={`flex items-center justify-between px-5 py-3 border-b
                    ${
                      isPending
                        ? "bg-gray-50 border-gray-100"
                        : isCorrect
                          ? "bg-green-50 border-green-100"
                          : "bg-red-50 border-red-100"
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0
                        ${
                          isPending
                            ? "bg-gray-200 text-gray-600"
                            : isCorrect
                              ? "bg-green-200 text-green-800"
                              : "bg-red-200 text-red-700"
                        }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text))]">
                      {ans.questionType}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isMCQ ? (
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full
                          ${
                            isCorrect
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-600"
                          }`}
                      >
                        {isCorrect ? "✓ Correct" : "✗ Incorrect"}
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                        Pending review
                      </span>
                    )}
                    <span className="text-xs font-semibold text-[rgb(var(--text))]">
                      {isMCQ ? (
                        <span
                          className={
                            isCorrect ? "text-green-600" : "text-red-500"
                          }
                        >
                          {ans.marksAwarded}
                        </span>
                      ) : (
                        <span className="text-[rgb(var(--text))]">?</span>
                      )}
                      <span className="text-[rgb(var(--text))]">
                        {" "}
                        / {ans.maxMarks} marks
                      </span>
                    </span>
                  </div>
                </div>

                {/* Question body */}
                <div className="px-5 py-4">
                  <p className="text-sm font-medium text-gray-800 mb-4 leading-relaxed">
                    {ans.questionText}
                  </p>

                  {/* MCQ Options */}
                  {isMCQ && (
                    <div className="space-y-2">
                      {ans.options?.map((opt, oi) => {
                        const isSelected = oi === ans.selectedOptionIndex;
                        const isCorrectOpt = opt.isCorrect;

                        let style = "bg-gray-50 border-gray-200 text-gray-600";
                        let icon = (
                          <span className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />
                        );

                        if (isCorrectOpt && isSelected) {
                          style = "bg-green-50 border-green-300 text-green-800";
                          icon = (
                            <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                              <span className="text-white text-xs font-bold">
                                ✓
                              </span>
                            </span>
                          );
                        } else if (isCorrectOpt && !isSelected) {
                          style = "bg-green-50 border-green-200 text-green-700";
                          icon = (
                            <span className="w-5 h-5 rounded-full border-2 border-green-400 flex items-center justify-center shrink-0">
                              <span className="text-green-500 text-xs font-bold">
                                ✓
                              </span>
                            </span>
                          );
                        } else if (isSelected && !isCorrectOpt) {
                          style = "bg-red-50 border-red-300 text-red-700";
                          icon = (
                            <span className="w-5 h-5 rounded-full bg-red-400 flex items-center justify-center shrink-0">
                              <span className="text-white text-xs font-bold">
                                ✗
                              </span>
                            </span>
                          );
                        }

                        return (
                          <div
                            key={oi}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${style}`}
                          >
                            {icon}
                            <span className="flex-1">{opt.text}</span>
                            <div className="flex gap-1 shrink-0">
                              {isSelected && (
                                <span
                                  className={`text-xs font-semibold px-2 py-0.5 rounded-full
                                    ${
                                      isCorrectOpt
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-600"
                                    }`}
                                >
                                  Your answer
                                </span>
                              )}
                              {isCorrectOpt && !isSelected && (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                  Correct answer
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Short / Long answer */}
                  {!isMCQ && (
                    <div>
                      <p className="text-xs text-[rgb(var(--text))] font-semibold uppercase tracking-wide mb-2">
                        Your answer
                      </p>
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 leading-relaxed min-h-12">
                        {ans.textAnswer || (
                          <span className="text-gray-300 italic">
                            No answer provided
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        <span>⏳</span>
                        Your teacher will review and award marks for this answer
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer summary table */}
        {/* <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h4 className="text-sm font-bold text-gray-700 mb-3">Summary</h4>
          <div className="space-y-2">
            {a.answers.map((ans, idx) => {
              const isMCQ = ans.questionType === "mcq";
              return (
                <div key={idx} className="flex items-center gap-3 text-sm">
                  <span className="w-6 h-6 rounded-full bg-gray-100 text-[rgb(var(--text))] text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="flex-1 text-gray-600 truncate">
                    {ans.questionText}
                  </span>
                  <span
                    className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full
                      ${
                        !isMCQ
                          ? "bg-amber-100 text-amber-600"
                          : ans.isCorrect
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-600"
                      }`}
                  >
                    {!isMCQ
                      ? "Pending"
                      : ans.isCorrect
                        ? `+${ans.marksAwarded}`
                        : "0"}{" "}
                    / {ans.maxMarks}
                  </span>
                </div>
              );
            })}
          </div>
        </div> */}
      </div>
    </div>
  );
}
