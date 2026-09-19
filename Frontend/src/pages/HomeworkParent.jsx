import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaClock,
  FaHourglassHalf,
  FaPaperclip,
  FaImage,
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
  const [noteDrafts, setNoteDrafts] = useState({});
  const [photoDrafts, setPhotoDrafts] = useState({});

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
      const fd = new FormData();
      const note = (noteDrafts[id] || "").trim();
      if (note) fd.append("note", note);
      (photoDrafts[id] || []).forEach((f) => fd.append("photos", f));

      await axios.post(`${API}/homework/${id}/mark-done`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });
      toast.success("Marked as done — teacher notified");
      setNoteDrafts((d) => ({ ...d, [id]: "" }));
      setPhotoDrafts((d) => ({ ...d, [id]: [] }));
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
        Mark homework done when finished. You can add a note or photo as proof.
        It is completed only after the teacher approves.
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
            const photos = hw.myStatus?.photos || [];

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

                {canMark && (
                  <div className="mt-3 space-y-2 rounded-xl bg-slate-50 border border-slate-200 p-3">
                    <textarea
                      rows={2}
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
                      placeholder="Add a note (optional) — e.g. finished exercises 1–5"
                      value={noteDrafts[hw._id] || ""}
                      onChange={(e) =>
                        setNoteDrafts((d) => ({
                          ...d,
                          [hw._id]: e.target.value,
                        }))
                      }
                    />
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 border border-slate-200 bg-white rounded-lg px-3 py-2 cursor-pointer">
                        <FaPaperclip size={11} />
                        {photoDrafts[hw._id]?.length
                          ? `${photoDrafts[hw._id].length} photo(s)`
                          : "Attach photos"}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) =>
                            setPhotoDrafts((d) => ({
                              ...d,
                              [hw._id]: Array.from(e.target.files || []).slice(
                                0,
                                3,
                              ),
                            }))
                          }
                        />
                      </label>
                      {photoDrafts[hw._id]?.length > 0 && (
                        <div className="flex gap-1.5">
                          {photoDrafts[hw._id].map((f, i) => (
                            <img
                              key={i}
                              src={URL.createObjectURL(f)}
                              className="h-10 w-10 object-cover rounded-lg border border-slate-200"
                              alt=""
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={markingId === hw._id}
                      onClick={() => markDone(hw._id)}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-medium bg-[rgb(var(--primary))] disabled:opacity-60"
                    >
                      {markingId === hw._id ? "Submitting…" : "Mark as done"}
                    </button>
                  </div>
                )}

                {hw.myStatus?.note ? (
                  <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
                    <p className="text-[11px] font-semibold text-slate-600 mb-0.5">
                      My note
                    </p>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap">
                      {hw.myStatus.note}
                    </p>
                  </div>
                ) : null}

                {photos.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                      <FaImage size={10} /> My photos
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {photos.map((p, i) => (
                        <a
                          key={i}
                          href={p.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            src={p.url}
                            className="h-16 w-16 object-cover rounded-lg border border-slate-200"
                            alt={p.name || "homework photo"}
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

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