import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate, Link } from "react-router-dom";
import { FaArrowLeft, FaTrash, FaBookOpen } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL;
const fieldCls =
  "w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-slate-400";

export default function TeacherPageProgress() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
  const teacherId = user?.teacher_id;

  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [chapters, setChapters] = useState([]);
  const [chapterId, setChapterId] = useState("");
  const [pageFrom, setPageFrom] = useState("");
  const [pageTo, setPageTo] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [terms, setTerms] = useState([]);
  const [termId, setTermId] = useState("");

  const selectedClass = useMemo(
    () => classes.find((c) => c._id === classId),
    [classes, classId],
  );
  const sections = selectedClass?.details || [];
  const selectedSection = sections.find(
    (d) => String(d.sectionId?._id || d.sectionId) === String(sectionId),
  );
  const subjects = useMemo(() => {
    const list = selectedSection?.subjectTeachers || [];
    const mine = list.filter(
      (st) => String(st.teacherId?._id || st.teacherId) === String(teacherId),
    );
    const mapped = (mine.length ? mine : list)
      .map((st) => st.subjectId)
      .filter(Boolean);
    // unique by id
    const seen = new Set();
    return mapped.filter((s) => {
      const id = String(s._id || s);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [selectedSection, teacherId]);

  const loadClasses = async () => {
    try {
      const res = await axios.get(`${API}/classes/all`, {
        withCredentials: true,
      });
      setClasses(res.data.classes || res.data.data || []);
    } catch {
      toast.error("Failed to load classes");
    }
  };

  const loadProgress = async () => {
    try {
      const res = await axios.get(`${API}/learning-progress`, {
        withCredentials: true,
        params: { days: 14 },
      });
      setRows(res.data.data || []);
    } catch {
      toast.error("Failed to load page progress");
    }
  };

  const loadTerms = async () => {
    try {
      const res = await axios.get(`${API}/terms`, { withCredentials: true });
      const list = res.data.terms || res.data.data || [];
      setTerms(list);
      if (list[0]?._id) setTermId(list[0]._id);
    } catch {
      setTerms([]);
    }
  };

  const loadChapters = async () => {
    if (!classId || !subjectId || !termId) {
      setChapters([]);
      return;
    }
    try {
      const res = await axios.get(`${API}/syllabus/chapters`, {
        withCredentials: true,
        params: { classId, subjectId, termId },
      });
      setChapters(res.data.chapters || res.data.data || []);
    } catch {
      setChapters([]);
    }
  };

  useEffect(() => {
    loadClasses();
    loadProgress();
  }, []);

  useEffect(() => {
    setSectionId("");
    setSubjectId("");
    setChapterId("");
    loadTerms();
  }, [classId]);

  useEffect(() => {
    setChapterId("");
    loadChapters();
  }, [classId, subjectId, termId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!classId || !sectionId || !subjectId || !chapterId) {
      return toast.error("Select class, section, subject and chapter");
    }
    if (!pageFrom || !pageTo) return toast.error("Enter page range");
    setSaving(true);
    try {
      const ch = chapters.find((c) => c._id === chapterId);
      await axios.post(
        `${API}/learning-progress`,
        {
          classId,
          sectionId,
          subjectId,
          chapterId,
          pageFrom: Number(pageFrom),
          pageTo: Number(pageTo),
          date,
          notes,
          bookTitle: "",
        },
        { withCredentials: true },
      );
      toast.success(`Marked pages ${pageFrom}–${pageTo} for ${ch?.name || "chapter"}`);
      setPageFrom("");
      setPageTo("");
      setNotes("");
      loadProgress();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this page progress entry?")) return;
    try {
      await axios.delete(`${API}/learning-progress/${id}`, {
        withCredentials: true,
      });
      toast.success("Deleted");
      loadProgress();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const fmt = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  return (
    <div className="min-h-screen p-4 sm:p-8 text-[rgb(var(--text))]">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
      {isMobile && (
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white shadow-sm border border-slate-100 text-sm font-bold text-slate-600 mb-3"
        >
          <FaArrowLeft size={16} /> Back
        </button>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-semibold">Pages completed</h1>
          <p className="text-xs text-slate-500 mt-1">
            Mark textbook pages you finished teaching today. Parents can create
            practice from these pages.
          </p>
        </div>
        <Link
          to="/teacher/daily-learning"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50"
        >
          <FaBookOpen size={12} /> Student results
        </Link>
      </div>

      <form
        onSubmit={submit}
        className="bg-[rgb(var(--surface))] border border-slate-200 rounded-2xl p-4 space-y-3 max-w-2xl mb-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium">Class</label>
            <select
              className={fieldCls}
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">Section</label>
            <select
              className={fieldCls}
              value={sectionId}
              onChange={(e) => {
                setSectionId(e.target.value);
                setSubjectId("");
              }}
            >
              <option value="">Select section</option>
              {sections.map((d) => (
                <option
                  key={d._id}
                  value={d.sectionId?._id || d.sectionId || ""}
                >
                  {d.sectionId?.name || d.sectionName || "Section"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">Subject</label>
            <select
              className={fieldCls}
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              <option value="">Select subject</option>
              {subjects.map((s) => (
                <option key={s._id || s} value={s._id || s}>
                  {s.name || "Subject"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">Term</label>
            <select
              className={fieldCls}
              value={termId}
              onChange={(e) => setTermId(e.target.value)}
            >
              <option value="">Select term</option>
              {terms.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium">Chapter</label>
            <select
              className={fieldCls}
              value={chapterId}
              onChange={(e) => setChapterId(e.target.value)}
            >
              <option value="">Select chapter</option>
              {chapters.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.order != null ? `${c.order}. ` : ""}
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">Page from</label>
            <input
              type="number"
              min={1}
              className={fieldCls}
              value={pageFrom}
              onChange={(e) => setPageFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium">Page to</label>
            <input
              type="number"
              min={1}
              className={fieldCls}
              value={pageTo}
              onChange={(e) => setPageTo(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium">Date</label>
            <input
              type="date"
              className={fieldCls}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium">Notes (optional)</label>
            <input
              className={fieldCls}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What was covered"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold bg-[rgb(var(--primary))] disabled:opacity-60"
        >
          {saving ? "Saving…" : "Mark pages completed"}
        </button>
      </form>

      <div className="bg-[rgb(var(--surface))] border border-slate-200 rounded-2xl p-4 max-w-3xl">
        <p className="text-xs font-semibold uppercase text-slate-500 mb-3">
          Recent marks ({rows.length})
        </p>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">
            No page progress yet
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div
                key={r._id}
                className="rounded-xl border border-slate-200 px-3 py-3 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{r.chapterName}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {fmt(r.date)} · {r.subjectId?.name || "Subject"} · pages{" "}
                    {r.pageFrom}–{r.pageTo}
                    {r.classId?.name ? ` · ${r.classId.name}` : ""}
                  </p>
                  {r.notes ? (
                    <p className="text-xs text-slate-600 mt-1">{r.notes}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => remove(r._id)}
                  className="p-2 text-red-500"
                >
                  <FaTrash size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
