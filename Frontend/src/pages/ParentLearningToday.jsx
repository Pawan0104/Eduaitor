import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate, Link } from "react-router-dom";
import { FaArrowLeft, FaMagic, FaClipboardList } from "react-icons/fa";

const API = import.meta.env.VITE_API_URL;

export default function ParentLearningToday() {
  const navigate = useNavigate();
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [type, setType] = useState("mcq");
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/learning-progress`, {
        withCredentials: true,
        params: { days: 7 },
      });
      setRows(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load learning");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const todayKey = new Date().toDateString();
  const todayRows = useMemo(
    () => rows.filter((r) => new Date(r.date).toDateString() === todayKey),
    [rows, todayKey],
  );
  const earlier = useMemo(
    () => rows.filter((r) => new Date(r.date).toDateString() !== todayKey),
    [rows, todayKey],
  );

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const createAssignment = async () => {
    if (!selected.size) {
      return toast.error("Select at least one page entry your child studied");
    }
    setCreating(true);
    try {
      const res = await axios.post(
        `${API}/daily-learning/assignments`,
        {
          progressIds: Array.from(selected),
          type,
          questionCount: type === "mcq" ? 5 : 3,
        },
        { withCredentials: true },
      );
      toast.success(res.data.message || "Assignment generating…");
      setSelected(new Set());
      navigate("/parent/daily-learning");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create assignment");
    } finally {
      setCreating(false);
    }
  };

  const fmt = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        })
      : "—";

  const renderList = (list, empty) =>
    list.length === 0 ? (
      <p className="text-sm text-slate-500 text-center py-6">{empty}</p>
    ) : (
      <div className="space-y-2">
        {list.map((r) => {
          const on = selected.has(r._id);
          return (
            <label
              key={r._id}
              className={`flex items-start gap-3 rounded-xl border px-3 py-3 cursor-pointer ${
                on
                  ? "border-emerald-400 bg-emerald-50"
                  : "border-slate-200 bg-[rgb(var(--surface))]"
              }`}
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={on}
                onChange={() => toggle(r._id)}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{r.chapterName}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {fmt(r.date)} · {r.subjectId?.name || "Subject"} · pages{" "}
                  {r.pageFrom}–{r.pageTo}
                  {r.teacherId?.fullName || r.teacherId?.name
                    ? ` · ${r.teacherId.fullName || r.teacherId.name}`
                    : ""}
                </p>
                {r.notes ? (
                  <p className="text-xs text-slate-600 mt-1">{r.notes}</p>
                ) : null}
              </div>
            </label>
          );
        })}
      </div>
    );

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
          <h1 className="text-xl font-semibold">What my child learned</h1>
          <p className="text-xs text-slate-500 mt-1">
            Pages teachers marked as completed. Create a practice assignment from
            them.
          </p>
        </div>
        <Link
          to="/parent/daily-learning"
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200"
        >
          <FaClipboardList size={12} /> Assignments & results
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500 text-center py-16">Loading…</p>
      ) : (
        <div className="space-y-6 max-w-2xl">
          <section className="bg-[rgb(var(--surface))] border border-slate-200 rounded-2xl p-4">
            <p className="text-xs font-semibold uppercase text-amber-700 mb-3">
              Today
            </p>
            {renderList(todayRows, "No pages marked for today yet")}
          </section>

          <section className="bg-[rgb(var(--surface))] border border-slate-200 rounded-2xl p-4">
            <p className="text-xs font-semibold uppercase text-slate-500 mb-3">
              Last 7 days
            </p>
            {renderList(earlier, "No earlier entries")}
          </section>

          <section className="sticky bottom-4 bg-[rgb(var(--surface))] border border-emerald-200 shadow-lg rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold flex items-center gap-2">
              <FaMagic className="text-emerald-700" /> Create assignment
            </p>
            <p className="text-[11px] text-slate-500">
              Selected: {selected.size}. System will read those textbook pages
              and generate practice.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setType("mcq")}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border ${
                  type === "mcq"
                    ? "bg-emerald-700 text-white border-emerald-700"
                    : "border-slate-200"
                }`}
              >
                MCQ (in app)
              </button>
              <button
                type="button"
                onClick={() => setType("descriptive")}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border ${
                  type === "descriptive"
                    ? "bg-emerald-700 text-white border-emerald-700"
                    : "border-slate-200"
                }`}
              >
                Descriptive (handwritten upload)
              </button>
            </div>
            <button
              type="button"
              disabled={creating || !selected.size}
              onClick={createAssignment}
              className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[rgb(var(--primary))] disabled:opacity-50"
            >
              {creating ? "Creating…" : "Generate assignment for my child"}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
