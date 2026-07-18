import { useEffect, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUpload } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

function TakeMcq({ assignment, onDone }) {
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const payload = (assignment.questions || []).map((_, i) => ({
      questionIndex: i,
      selectedOptionIndex:
        answers[i] === undefined ? -1 : Number(answers[i]),
    }));
    setSaving(true);
    try {
      const res = await axios.post(
        `${API}/daily-learning/assignments/${assignment._id}/submit-mcq`,
        { answers: payload },
        { withCredentials: true },
      );
      toast.success("Submitted!");
      onDone(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Submit failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {(assignment.questions || []).map((q, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 px-4 py-3 space-y-2"
        >
          <p className="text-sm font-semibold">
            {i + 1}. {q.text}
          </p>
          <div className="space-y-1.5">
            {(q.options || []).map((o, oi) => (
              <label
                key={oi}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <input
                  type="radio"
                  name={`q-${i}`}
                  checked={answers[i] === oi}
                  onChange={() => setAnswers((a) => ({ ...a, [i]: oi }))}
                />
                {o.text}
              </label>
            ))}
          </div>
        </div>
      ))}
      <button
        type="button"
        disabled={saving}
        onClick={submit}
        className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[rgb(var(--primary))] disabled:opacity-60"
      >
        {saving ? "Submitting…" : "Submit answers"}
      </button>
    </div>
  );
}

function TakeDescriptive({ assignment, onDone }) {
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!file) return toast.error("Upload a photo of your handwritten answers");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await axios.post(
        `${API}/daily-learning/assignments/${assignment._id}/submit-handwritten`,
        fd,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      toast.success("Uploaded for assessment");
      onDone(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 px-4 py-3 space-y-2">
        <p className="text-xs font-semibold uppercase text-slate-500">
          Questions to answer on paper
        </p>
        {(assignment.questions || []).map((q, i) => (
          <p key={i} className="text-sm">
            {i + 1}. {q.text}{" "}
            <span className="text-[11px] text-slate-400">
              ({q.marks || 2} marks)
            </span>
          </p>
        ))}
      </div>
      <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-10 cursor-pointer bg-slate-50">
        <FaUpload className="text-slate-400" />
        <span className="text-sm font-medium">
          {file ? file.name : "Upload handwritten answer photo"}
        </span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </label>
      <button
        type="button"
        disabled={saving || !file}
        onClick={submit}
        className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[rgb(var(--primary))] disabled:opacity-60"
      >
        {saving ? "Uploading & grading…" : "Submit for AI assessment"}
      </button>
    </div>
  );
}

function ResultCard({ submission }) {
  if (!submission) return null;
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 space-y-2">
      <p className="text-xs font-bold uppercase text-emerald-800">Assessment</p>
      {submission.score != null ? (
        <p className="text-lg font-semibold">
          Score: {submission.score}/{submission.maxScore}
        </p>
      ) : (
        <p className="text-sm font-medium">Status: {submission.status}</p>
      )}
      {submission.feedback ? (
        <p className="text-sm text-slate-800 whitespace-pre-wrap">
          {submission.feedback}
        </p>
      ) : null}
      {submission.strengths ? (
        <p className="text-xs text-slate-600">
          <span className="font-semibold">Strengths:</span>{" "}
          {submission.strengths}
        </p>
      ) : null}
      {submission.improvements ? (
        <p className="text-xs text-slate-600">
          <span className="font-semibold">Improve:</span>{" "}
          {submission.improvements}
        </p>
      ) : null}
      {submission.handwritten?.url ? (
        <a
          href={submission.handwritten.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-xs font-semibold text-emerald-800 underline"
        >
          View uploaded answer
        </a>
      ) : null}
    </div>
  );
}

export default function DailyLearningHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
  const isParent = user?.loginAs === "parent";
  const isStudent = user?.loginAs === "student";
  const isTeacher = user?.role === "teacher_admin";

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [detail, setDetail] = useState(null);
  const [submission, setSubmission] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/daily-learning/assignments`, {
        withCredentials: true,
      });
      setList(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openOne = async (row) => {
    setActive(row);
    try {
      const res = await axios.get(
        `${API}/daily-learning/assignments/${row._id}`,
        { withCredentials: true },
      );
      setDetail(res.data.data);
      setSubmission(res.data.submission);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to open");
    }
  };

  const title = isTeacher
    ? "Daily learning results"
    : isParent
      ? "Daily learning assignments"
      : "My daily practice";

  return (
    <div className="min-h-screen p-4 sm:p-8 text-[rgb(var(--text))]">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
      {isMobile && (
        <button
          type="button"
          onClick={() => (active ? setActive(null) : navigate(-1))}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white shadow-sm border border-slate-100 text-sm font-bold text-slate-600 mb-3"
        >
          <FaArrowLeft size={16} /> {active ? "Back to list" : "Back"}
        </button>
      )}

      <h1 className="text-xl font-semibold mb-1">{title}</h1>
      <p className="text-xs text-slate-500 mb-5">
        {isStudent
          ? "Complete practice created by your parent from today’s lessons."
          : isParent
            ? "Track generation status and assessment feedback."
            : "See practice parents created from pages you taught."}
      </p>

      {active && detail ? (
        <div className="max-w-2xl space-y-4">
          {!isMobile && (
            <button
              type="button"
              onClick={() => {
                setActive(null);
                setDetail(null);
                setSubmission(null);
              }}
              className="text-sm font-medium text-slate-600"
            >
              ← Back to list
            </button>
          )}
          <div className="rounded-2xl border border-slate-200 bg-[rgb(var(--surface))] px-4 py-3">
            <p className="text-sm font-semibold">{detail.title}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {detail.type?.toUpperCase()} · {detail.status}
              {detail.pdfContext?.chapterName
                ? ` · ${detail.pdfContext.chapterName} p.${detail.pdfContext.pageFrom}–${detail.pdfContext.pageTo}`
                : ""}
            </p>
          </div>

          {detail.status === "generating" ? (
            <p className="text-sm text-amber-700">
              Generating questions from textbook pages… Refresh in a moment.
            </p>
          ) : null}
          {detail.status === "failed" ? (
            <p className="text-sm text-red-600">
              Generation failed: {detail.failReason || "Unknown error"}
            </p>
          ) : null}

          {submission &&
          (submission.status === "graded" || submission.status === "submitted") ? (
            <ResultCard submission={submission} />
          ) : null}

          {isStudent &&
          detail.status === "ready" &&
          (!submission || submission.status === "pending") ? (
            detail.type === "mcq" ? (
              <TakeMcq
                assignment={detail}
                onDone={(sub) => {
                  setSubmission(sub);
                  load();
                }}
              />
            ) : (
              <TakeDescriptive
                assignment={detail}
                onDone={(sub) => {
                  setSubmission(sub);
                  load();
                }}
              />
            )
          ) : null}

          {(isParent || isTeacher) && detail.status === "ready" ? (
            <div className="rounded-xl border border-slate-200 px-4 py-3 space-y-2">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Questions
              </p>
              {(detail.questions || []).map((q, i) => (
                <p key={i} className="text-sm">
                  {i + 1}. {q.text}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : loading ? (
        <p className="text-sm text-slate-500 text-center py-16">Loading…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-16">
          No daily learning assignments yet
        </p>
      ) : (
        <div className="space-y-2 max-w-2xl">
          {list.map((row) => (
            <button
              key={row._id}
              type="button"
              onClick={() => openOne(row)}
              className="w-full text-left rounded-xl border border-slate-200 px-4 py-3 hover:border-emerald-300 bg-[rgb(var(--surface))]"
            >
              <p className="text-sm font-semibold">{row.title}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {row.type?.toUpperCase()} · {row.status}
                {row.submission?.score != null
                  ? ` · Score ${row.submission.score}/${row.submission.maxScore}`
                  : row.submission
                    ? ` · ${row.submission.status}`
                    : ""}
                {row.studentId?.firstName
                  ? ` · ${row.studentId.firstName} ${row.studentId.lastName || ""}`
                  : ""}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
