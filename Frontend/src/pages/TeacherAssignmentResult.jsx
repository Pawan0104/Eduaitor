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

export default function TeacherAssignmentResult() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // { assignment, submissions, stats }
  const [detail, setDetail] = useState(null); // single student detail
  const [view, setView] = useState("list"); // list | submissions | detail

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const res = await axios.get(`${API}/assignment/teacher/results`, {
        withCredentials: true,
      });
      setAssignments(res.data.data || []);
    } catch {
      toast.error("Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  const openSubmissions = async (a) => {
    try {
      const res = await axios.get(
        `${API}/assignment/teacher/${a._id}/submissions`,
        {
          withCredentials: true,
        },
      );
      setSelected(res.data.data);
      setView("submissions");
    } catch {
      toast.error("Failed to load submissions");
    }
  };

  const openStudentDetail = async (studentId) => {
    try {
      const res = await axios.get(
        `${API}/assignment/teacher/${selected.assignment._id}/student/${studentId}`,
        { withCredentials: true },
      );
      setDetail(res.data.data);
      setView("detail");
    } catch {
      toast.error("Failed to load student detail");
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen text-[rgb(var(--text))]">
        Loading...
      </div>
    );

  /* ── DETAIL VIEW ── */
  if (view === "detail" && detail)
    return (
      <StudentDetailView
        detail={detail}
        onBack={() => setView("submissions")}
      />
    );

  /* ── SUBMISSIONS VIEW ── */
  if (view === "submissions" && selected)
    return (
      <SubmissionsView
        selected={selected}
        onBack={() => setView("list")}
        onSelectStudent={openStudentDetail}
      />
    );

  /* ── LIST VIEW ── */
  return (
    <div className="p-4 sm:p-6 lg:p-8  min-h-screen text-[rgb(var(--text))]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Assignment Results</h1>
        <p className="text-sm mt-1">
          Click an assignment to see student submissions
        </p>
      </div>

      {assignments.length === 0 ? (
        <div className="text-center py-20 text-[rgb(var(--text))]">
          <p className="text-5xl mb-3">📋</p>
          <p className="font-medium">No assignments yet</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {assignments.map((a) => (
            <div
              key={a._id}
              onClick={() => openSubmissions(a)}
              className="bg-[rgb(var(--surface))] rounded-2xl border border-gray-100 shadow-sm p-5 cursor-pointer hover:border-indigo-200 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h3 className="font-semibold text-[rgb(var(--text))] leading-snug">
                    {a.title}
                  </h3>
                  <p className="text-xs text-[rgb(var(--text))] mt-0.5">
                    {a.classId?.name} · {a.subjectId?.name}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold capitalize
                    ${a.isPublished ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                >
                  {a.isPublished ? "Live" : "Draft"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <StatPill label="Submitted" value={a.submissionCount} />
                <StatPill
                  label="Avg Score"
                  value={a.avgScore != null ? `${a.avgScore}%` : "—"}
                />
                <StatPill label="Total Marks" value={a.totalMarks} />
              </div>

              {a.submissionCount > 0 && a.avgScore != null && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-[rgb(var(--text))] mb-1">
                    <span>Class average</span>
                    <span>{a.avgScore}%</span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${BAR_COLOR(a.avgScore)}`}
                      style={{ width: `${a.avgScore}%` }}
                    />
                  </div>
                </div>
              )}

              <p className="text-xs text-[rgb(var(--text))] mt-3">
                Due: {new Date(a.dueDate).toLocaleDateString("en-IN")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── SUBMISSIONS LIST ── */
function SubmissionsView({ selected, onBack, onSelectStudent }) {
  const { assignment, submissions, stats } = selected;
  const pct = stats.avgScore;

  return (
    <div className="p-4 sm:p-6 lg:p-8  min-h-screen">
      <button
        onClick={onBack}
        className="text-sm text-[rgb(var(--text))] mb-4 flex items-center gap-1"
      >
        ← Back to assignments
      </button>

      {/* Assignment header */}
      <div className="bg-[rgb(var(--surface))] rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
        <h2 className="text-xl font-bold text-[rgb(var(--text))]">{assignment.title}</h2>
        <p className="text-sm text-[rgb(var(--text))] mt-0.5">
          {assignment.classId?.name} · {assignment.subjectId?.name}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {[
            { label: "Submissions", value: stats.totalStudents },
            { label: "Avg Score", value: pct != null ? `${pct}%` : "—" },
            { label: "Highest", value: `${stats.highest}%` },
            { label: "Lowest", value: `${stats.lowest}%` },
          ].map((s, i) => (
            <div
              key={i}
              className="border rounded-xl py-3 px-4 text-center"
            >
              <p className="text-xs text-[rgb(var(--text))]">{s.label}</p>
              <p className="text-lg font-bold text-[rgb(var(--text))] mt-0.5">
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {pct != null && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-[rgb(var(--text))] mb-1">
              <span>Class average</span>
              <span>{pct}%</span>
            </div>
            <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all ${BAR_COLOR(pct)}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Student list */}
      {submissions.length === 0 ? (
        <div className="text-center py-20 text-[rgb(var(--text))]">
          <p className="text-4xl mb-3">👥</p>
          <p className="font-medium">No submissions yet</p>
        </div>
      ) : (
        <div className="bg-[rgb(var(--surface))] rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-12 text-xs text-[rgb(var(--text))] font-semibold uppercase tracking-wide px-5 py-3 border-b border-gray-100 bg-[rgb(var(--surface))]">
            <div className="col-span-4">Student</div>
            <div className="col-span-2 text-center">Score</div>
            <div className="col-span-3 text-center">Progress</div>
            <div className="col-span-2 text-center">Grade</div>
            <div className="col-span-1 text-center">Action</div>
          </div>

          <div className="divide-y divide-gray-50">
            {submissions
              .sort((a, b) => b.percentage - a.percentage)
              .map((sub, idx) => {
                const s = sub.studentId;
                const p = sub.percentage;
                return (
                  <div
                    key={sub._id}
                    className="grid grid-cols-12 items-center px-5 py-3.5  transition"
                  >
                    <div className="col-span-4 flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-[rgb(var(--text))]">
                          {s?.firstName} {s?.lastName}
                        </p>
                        <p className="text-xs text-[rgb(var(--text))]">
                          Roll {s?.rollNo || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="col-span-2 text-center text-sm font-semibold text-[rgb(var(--text))]">
                      {sub.totalMarksAwarded}/{sub.totalMarks}
                    </div>
                    <div className="col-span-3 px-2">
                      <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full ${BAR_COLOR(p)}`}
                          style={{ width: `${p}%` }}
                        />
                      </div>
                      <p className="text-xs text-[rgb(var(--text))] text-center mt-0.5">
                        {p}%
                      </p>
                    </div>
                    <div className="col-span-2 text-center">
                      <span
                        className={`text-sm font-bold px-2.5 py-1 rounded-lg ${GRADE_COLOR(p)}`}
                      >
                        {GRADE(p)}
                      </span>
                    </div>
                    <div className="col-span-1 text-center">
                      <button
                        onClick={() => onSelectStudent(s?._id)}
                        className="text-xs text-[rgb(var(--primary))] hover:text-[rgb(var(--primary-dark))] font-semibold hover:underline cursor-pointer"
                      >
                        View
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── STUDENT DETAIL ── */
function StudentDetailView({ detail, onBack }) {
  const { assignment, submission } = detail;
  const s = submission.studentId;
  const p = submission.percentage;

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-[rgb(var(--surface))]">
      <button
        onClick={onBack}
        className="text-sm text-[rgb(var(--text))] mb-4 flex items-center gap-1"
      >
        ← Back to submissions
      </button>

      {/* Student header */}
      <div className="bg-[rgb(var(--surface))] rounded-2xl border border-gray-100 shadow-sm p-5 mb-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="w-12 h-12 rounded-full  flex items-center justify-center text-[rgb(var(--primary))] bg-[rgb(var(--bg))] font-bold text-lg shrink-0">
          {s?.firstName?.[0]}
          {s?.lastName?.[0]}
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-[rgb(var(--text))]">
            {s?.firstName} {s?.lastName}
          </h2>
          <p className="text-sm text-[rgb(var(--text))]">
            Roll {s?.rollNo || "—"} · {assignment.title}
          </p>
        </div>
        <div className="text-center">
          <div className={`text-3xl font-bold ${GRADE_COLOR(p).split(" ")[0]}`}>
            {GRADE(p)}
          </div>
          <div className="text-sm text-[rgb(var(--text))]">{p}%</div>
        </div>
      </div>

      {/* Score summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          {
            label: "Marks Scored",
            value: `${submission.totalMarksAwarded}/${submission.totalMarks}`,
          },
          { label: "Percentage", value: `${p}%` },
          { label: "Attempt", value: `#${submission.attemptNumber}` },
          {
            label: "Time Taken",
            value: submission.timeTakenSeconds
              ? `${Math.round(submission.timeTakenSeconds / 60)} min`
              : "—",
          },
        ].map((s, i) => (
          <div
            key={i}
            className=" rounded-xl border border-gray-100 shadow-sm py-3 px-4 text-center"
          >
            <p className="text-xs text-[rgb(var(--text))]">{s.label}</p>
            <p className="text-base font-bold text-[rgb(var(--text))] mt-0.5">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="bg-[rgb(var(--surface))] rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="flex justify-between text-sm text-[rgb(var(--text))] mb-2">
          <span>Overall performance</span>
          <span className="font-semibold">{p}%</span>
        </div>
        <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all ${BAR_COLOR(p)}`}
            style={{ width: `${p}%` }}
          />
        </div>
      </div>

      {/* Question breakdown */}
      <h3 className="font-bold text-[rgb(var(--text))] mb-3">Question Breakdown</h3>
      <div className="space-y-3">
        {submission.answers.map((ans, idx) => {
          const isMCQ = ans.questionType === "mcq";
          const correct = ans.isCorrect;
          return (
            <div
              key={idx}
              className={`bg-[rgb(var(--surface))] rounded-2xl border shadow-sm p-5
                ${
                  isMCQ
                    ? correct
                      ? "border-green-100"
                      : "border-red-100"
                    : "border-gray-100"
                }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0
                    ${!isMCQ ? "text-[rgb(var(--text))]" : correct ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}
                >
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[rgb(var(--text))] mb-2">
                    {ans.questionText}
                  </p>
                  {isMCQ ? (
                    <div className="space-y-1.5">
                      {ans.options?.map((opt, oi) => {
                        const isSelected = oi === ans.selectedOptionIndex;
                        const isCorrectOpt = opt.isCorrect;
                        return (
                          <div
                            key={oi}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm
                              ${
                                isCorrectOpt
                                  ? "bg-green-50 text-green-800 font-medium"
                                  : isSelected && !isCorrectOpt
                                    ? "bg-red-50 text-red-700"
                                    : " text-[rgb(var(--text))]"
                              }`}
                          >
                            <span>
                              {isCorrectOpt ? "✓" : isSelected ? "✗" : "○"}
                            </span>
                            {opt.text}
                            {isSelected && !isCorrectOpt && (
                              <span className="ml-auto text-xs text-red-500">
                                Student's answer
                              </span>
                            )}
                            {isCorrectOpt && (
                              <span className="ml-auto text-xs text-green-600">
                                Correct answer
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-xl p-3 text-sm text-[rgb(var(--text))]">
                      {ans.textAnswer || (
                        <span className="text-gray-300">
                          No answer provided
                        </span>
                      )}
                    </div>
                  )}
                  <div className="mt-2">
                    {isMCQ ? (
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${correct ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}
                      >
                        {correct ? `+${ans.marksAwarded}` : "0"} /{" "}
                        {ans.maxMarks} marks
                      </span>
                    ) : (
                      <span className="text-xs text-[rgb(var(--text))] bg-gray-100 px-2 py-0.5 rounded-full">
                        Pending review · {ans.maxMarks} marks
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── HELPERS ── */
const StatPill = ({ label, value }) => (
  <div className="border rounded-xl py-2 px-3 text-center">
    <p className="text-xs text-[rgb(var(--text))]">{label}</p>
    <p className="text-sm font-bold text-[rgb(var(--text))] mt-0.5">{value}</p>
  </div>
);
