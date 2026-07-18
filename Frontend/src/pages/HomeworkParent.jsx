import { useEffect, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaClock,
  FaHourglassHalf,
} from "react-icons/fa";

const API = import.meta.env.VITE_API_URL;

const STATUS = {
  assigned: {
    label: "Assigned",
    color: "bg-slate-100 text-slate-600",
    accent: "border-l-slate-400",
    icon: <FaClock size={11} />,
  },
  marked_done: {
    label: "Waiting for teacher",
    color: "bg-amber-100 text-amber-700",
    accent: "border-l-amber-400",
    icon: <FaHourglassHalf size={11} />,
  },
  completed: {
    label: "Completed",
    color: "bg-green-100 text-green-700",
    accent: "border-l-green-500",
    icon: <FaCheckCircle size={11} />,
  },
};

export default function HomeworkParent() {
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState(null);
  const [filter, setFilter] = useState("all");

  const fetchList = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/homework/my`, {
        withCredentials: true,
      });
      setItems(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load homework");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const markDone = async (id) => {
    setMarkingId(id);
    try {
      await axios.post(
        `${API}/homework/${id}/mark-done`,
        {},
        { withCredentials: true },
      );
      toast.success("Marked as done — teacher notified");
      fetchList();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not mark as done");
    } finally {
      setMarkingId(null);
    }
  };

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  const filtered = items.filter((hw) => {
    if (filter === "all") return true;
    return hw.myStatus?.status === filter;
  });

  return (
    <div className="min-h-screen p-4 sm:p-8 text-[rgb(var(--text))]">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />

      {isMobile && (
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white shadow-sm border border-slate-100 text-sm font-bold text-slate-600 mb-3"
        >
          <FaArrowLeft size={16} /> Back
        </button>
      )}

      <h1 className="text-lg font-semibold mb-1">Homework</h1>
      <p className="text-xs text-slate-500 mb-4">
        Mark homework done when finished. It is completed only after the teacher
        approves.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { key: "all", label: "All" },
          { key: "assigned", label: "To do" },
          { key: "marked_done", label: "Awaiting teacher" },
          { key: "completed", label: "Completed" },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs border transition ${
              filter === f.key
                ? "bg-[rgb(var(--primary))] border-transparent font-medium"
                : "border-slate-200 text-slate-600"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500 text-center py-16">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-16">
          No homework in this filter
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((hw) => {
            const status = hw.myStatus?.status || "assigned";
            const st = STATUS[status] || STATUS.assigned;
            const canMark = status === "assigned";

            return (
              <div
                key={hw._id}
                className={`bg-[rgb(var(--surface))] border border-slate-200 border-l-4 rounded-xl p-4 ${st.accent}`}
              >
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">{hw.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {hw.subjectId?.name || "Subject"} ·{" "}
                      {hw.teacherId?.fullName ||
                        hw.teacherId?.name ||
                        "Teacher"}{" "}
                      · Due {fmtDate(hw.dueDate)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full shrink-0 ${st.color}`}
                  >
                    {st.icon}
                    {st.label}
                  </span>
                </div>

                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {hw.description}
                </p>

                {hw.myStatus?.teacherRemark ? (
                  <div className="mt-3 rounded-xl bg-violet-50 border border-violet-100 px-3 py-2">
                    <p className="text-[11px] font-semibold text-violet-700 mb-0.5">
                      Teacher remark
                    </p>
                    <p className="text-xs text-violet-900 whitespace-pre-wrap">
                      {hw.myStatus.teacherRemark}
                    </p>
                  </div>
                ) : null}

                {canMark && (
                  <button
                    type="button"
                    disabled={markingId === hw._id}
                    onClick={() => markDone(hw._id)}
                    className="mt-3 w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-medium bg-[rgb(var(--primary))] disabled:opacity-60"
                  >
                    {markingId === hw._id ? "Updating…" : "Mark as done"}
                  </button>
                )}

                {status === "marked_done" && (
                  <p className="mt-3 text-[11px] text-amber-700">
                    Waiting for teacher approval
                    {hw.myStatus?.markedDoneBy
                      ? ` (marked by ${hw.myStatus.markedDoneBy})`
                      : ""}
                    .
                  </p>
                )}

                {status === "completed" && hw.myStatus?.completedAt && (
                  <p className="mt-3 text-[11px] text-green-700">
                    Approved on {fmtDate(hw.myStatus.completedAt)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
