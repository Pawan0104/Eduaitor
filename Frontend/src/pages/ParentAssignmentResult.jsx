import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const API = import.meta.env.VITE_API_URL;

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

const GRADE_COLOR = (p) =>
  p >= 70
    ? "text-green-600 bg-green-50"
    : p >= 40
      ? "text-amber-600 bg-amber-50"
      : "text-red-600 bg-red-50";

const BAR_COLOR = (p) =>
  p >= 70 ? "bg-green-500" : p >= 40 ? "bg-amber-400" : "bg-red-400";

export default function ParentAssignmentResult() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API}/assignment/student/history`, {
        withCredentials: true,
      });
      setHistory(res.data.data || []);
    } catch {
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen text-[rgb(var(--text))]">
        Loading...
      </div>
    );

  if (selected)
    return (
      <ParentDetailView
        submission={selected}
        onBack={() => setSelected(null)}
      />
    );

  const avgScore = history.length
    ? Math.round(history.reduce((s, r) => s + r.percentage, 0) / history.length)
    : null;

  const best = history.length
    ? Math.max(...history.map((r) => r.percentage))
    : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8  min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[rgb(var(--text))]">My Results</h1>
        <p className="text-sm text-[rgb(var(--text))] mt-1">
          Your assignment submission history
        </p>
      </div>

      {/* Summary strip */}
      {history.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Submitted", value: history.length },
            {
              label: "Average Score",
              value: avgScore != null ? `${avgScore}%` : "—",
            },
            { label: "Best Score", value: best != null ? `${best}%` : "—" },
          ].map((s, i) => (
            <div
              key={i}
              className="bg-[rgb(var(--surface))] rounded-2xl border border-gray-100 shadow-sm py-4 px-4 text-center"
            >
              <p className="text-xs text-[rgb(var(--text))]">{s.label}</p>
              <p className="text-xl font-bold text-[rgb(var(--text))] mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {history.length === 0 ? (
        <div className="text-center py-20 text-[rgb(var(--text))]">
          <p className="text-5xl mb-3">📭</p>
          <p className="font-medium">No submissions yet</p>
          <p className="text-sm mt-1">
            Complete an assignment to see results here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((sub) => {
            const a = sub.assignmentId;
            const p = sub.percentage;
            return (
              <div
                key={sub._id}
                className="bg-[rgb(var(--syrface))] rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row gap-4 sm:items-center"
              >
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-[rgb(var(--text))]">{a?.title}</h3>
                    <span
                      className={`shrink-0 text-sm font-bold px-2.5 py-1 rounded-lg ${GRADE_COLOR(p)}`}
                    >
                      {GRADE(p)}
                    </span>
                  </div>
                  <p className="text-xs text-[rgb(var(--text))] mb-3">
                    {a?.subjectId?.name}
                    {a?.chapterId?.name ? ` · ${a.chapterId.name}` : ""}
                    {" · "}
                    {new Date(sub.submittedAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>

                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1  rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${BAR_COLOR(p)}`}
                        style={{ width: `${p}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-[rgb(var(--text))] shrink-0">
                      {sub.totalMarksAwarded}/{sub.totalMarks} ({p}%)
                    </span>
                  </div>

                  <div className="flex gap-2 flex-wrap text-xs text-[rgb(var(--text))]">
                    <span className=" px-2 py-0.5 rounded-full">
                      Attempt #{sub.attemptNumber}
                    </span>
                    {sub.timeTakenSeconds && (
                      <span className="bg-[rgb(var(--surface))] px-2 py-0.5 rounded-full">
                        ⏱ {Math.round(sub.timeTakenSeconds / 60)} min
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full font-medium capitalize
                      ${sub.status === "graded" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}
                    >
                      {sub.status}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSelected(sub)}
                  className="shrink-0 px-4 py-2 bg-[rgb(var(--primary))]  text-[rgb(var(--text))] text-sm font-semibold rounded-xl transition"
                >
                  View Report
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── PARENT DETAIL VIEW ── */
function ParentDetailView({ submission: sub, onBack }) {
  const a = sub.assignmentId;
  const p = sub.percentage;

  const mcqAnswers = sub.answers.filter((ans) => ans.questionType === "mcq");
  const mcqCorrect = mcqAnswers.filter((ans) => ans.isCorrect).length;
  const subjAnswers = sub.answers.filter((ans) => ans.questionType !== "mcq");

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

  return (
    <div className="p-4 sm:p-6 lg:p-8  min-h-screen">
      <button
        onClick={onBack}
        className="text-sm text-[rgb(var(--text))] hover:text-[rgb(var(--text))] mb-4 flex items-center gap-1"
      >
        ← Back to results
      </button>

      {/* Score card */}
      <div className="bg-[rgb(var(--surface))] rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
        <div className="text-center mb-5">
          <p className="text-sm text-[rgb(var(--text))] mb-0.5">{a?.title}</p>
          <p className="text-xs text-[rgb(var(--text))] mb-4">
            {a?.subjectId?.name}
            {a?.chapterId?.name ? ` · ${a.chapterId.name}` : ""}
          </p>

          <div
            className={`inline-flex items-center justify-center w-24 h-24 rounded-full text-4xl font-bold mb-3 ${GRADE_BG(p)}`}
          >
            {GRADE(p)}
          </div>

          <div className="text-2xl font-bold text-[rgb(var(--text))]">
            {sub.totalMarksAwarded} / {sub.totalMarks}
            <span className="text-base font-normal text-[rgb(var(--text))] ml-1">
              marks
            </span>
          </div>
          <div className="text-sm text-[rgb(var(--text))] mt-1">
            {p}% · Attempt #{sub.attemptNumber}
          </div>

          <div className="mt-4 bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-700 ${BAR_COLOR(p)}`}
              style={{ width: `${p}%` }}
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
              value: sub.timeTakenSeconds
                ? `${Math.round(sub.timeTakenSeconds / 60)} min`
                : "—",
              bg: "bg-purple-50",
              text: "text-purple-700",
            },
          ].map((s, i) => (
            <div key={i} className={` border-1 rounded-xl py-3 px-4 text-center bg-[rgb(var(--surface))]`}>
              <p className="text-xs text-[rgb(var(--text))]">{s.label}</p>
              <p className={`text-lg font-bold mt-0.5 ${s.text}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Question breakdown */}
      <h3 className="font-bold text-[rgb(var(--text))] text-base mb-3">
        Question Breakdown
        <span className="ml-2 text-sm font-normal text-[rgb(var(--text))]">
          {sub.answers.length} questions
        </span>
      </h3>

      <div className="space-y-4 bg-[rgb(var(--surface))]">
        {sub.answers.map((ans, idx) => {
          const isMCQ = ans.questionType === "mcq";
          const isCorrect = ans.isCorrect;
          const isPending = !isMCQ;

          return (
            <div
              key={idx}
              className={`bg-[rgb(var(--surface))] rounded-2xl border shadow-sm overflow-hidden
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
                      ? " border-gray-100"
                      : isCorrect
                        ? " border-green-100"
                        : "bg-[rgb(var(--surface))] border-red-100"
                  }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0
                      ${
                        isPending
                          ? " text-[rgb(var(--text))]"
                          : isCorrect
                            ? "text-[rgb(var(--text))]"
                            : "text-red-700 bg-red-100"
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
                      className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1
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

              {/* Question text */}
              <div className="px-5 py-4">
                <p className="text-sm font-medium text-[rgb(var(--text))] mb-4 leading-relaxed">
                  {ans.questionText}
                </p>

                {/* MCQ Options */}
                {isMCQ && (
                  <div className="space-y-2">
                    {ans.options?.map((opt, oi) => {
                      const isSelected = oi === ans.selectedOptionIndex;
                      const isCorrectOpt = opt.isCorrect;

                      // Determine styles for each state
                      let containerStyle =
                        "border-gray-200 text-[rgb(var(--text))]";
                      let radioStyle = "border-2 border-gray-300 bg-white";
                      let radioInner = null;
                      let badge = null;

                      if (isCorrectOpt && isSelected) {
                        // Correct + selected by student
                        containerStyle =
                          "bg-green-50 border-green-300 text-green-800";
                        radioStyle =
                          "bg-green-500 border-green-500 flex items-center justify-center";
                        radioInner = (
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        );
                        badge = (
                          <span className="text-xs font-semibold text-green-600">
                            Your answer
                          </span>
                        );
                      } else if (isCorrectOpt && !isSelected) {
                        // Correct but student didn't pick it
                        containerStyle =
                          " border-green-300 bg-[rgb(var(--surface))] ";
                        radioStyle =
                          "border-2 border-green-500  flex items-center justify-center";
                        radioInner = (
                          <svg
                            className="w-3 h-3 text-green-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        );
                        badge = (
                          <span className="text-xs font-semibold text-green-600">
                            Correct answer
                          </span>
                        );
                      } else if (isSelected && !isCorrectOpt) {
                        // Wrong — student picked this
                        containerStyle =
                          " border-red-300 text-red-700";
                        radioStyle =
                          "bg-red-500 border-red-500 flex items-center justify-center";
                        radioInner = (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        );
                        badge = (
                          <span className="text-xs font-semibold text-red-500">
                            Your answer
                          </span>
                        );
                      }

                      return (
                        <div
                          key={oi}
                          className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border text-sm ${containerStyle}`}
                        >
                          {/* Radio circle */}
                          <span
                            className={`w-6 h-6 rounded-full shrink-0 ${radioStyle}`}
                          >
                            {radioInner}
                          </span>

                          {/* Option text */}
                          <span className="flex-1 font-medium">{opt.text}</span>

                          {/* Badge */}
                          {badge}
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
                    <div className="bg-[rgb(var(--surface))] border border-gray-200 rounded-xl p-4 text-sm text-[rgb(var(--text))] leading-relaxed min-h-12">
                      {ans.textAnswer || (
                        <span className="text-[rgb(var(--text))]italic">
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

      {/* Footer summary */}
      <div className="mt-6 bg-[rgb(var(--surface))] rounded-2xl border border-gray-100 shadow-sm p-5">
        <h4 className="text-sm font-bold text-[rgb(var(--text))] mb-3">Summary</h4>
        <div className="space-y-2">
          {sub.answers.map((ans, idx) => {
            const isMCQ = ans.questionType === "mcq";
            return (
              <div key={idx} className="flex items-center gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-[rgb(var(--primary))] text-[rgb(var(--text))] text-xs font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="flex-1 text-[rgb(var(--text))] truncate">
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
      </div>
    </div>
  );
}
