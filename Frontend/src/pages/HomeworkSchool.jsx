import { useEffect, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

const API = import.meta.env.VITE_API_URL;

export default function HomeworkSchool() {
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API}/homework/school`, { withCredentials: true })
      .then((res) => setList(res.data || []))
      .catch((err) =>
        toast.error(err.response?.data?.message || "Failed to load homework"),
      )
      .finally(() => setLoading(false));
  }, []);

  const fmtDate = (d) =>
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
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white shadow-sm border border-slate-100 text-sm font-bold text-slate-600 mb-3"
        >
          <FaArrowLeft size={16} /> Back
        </button>
      )}

      <h1 className="text-lg font-semibold mb-4">Homework overview</h1>

      {loading ? (
        <p className="text-sm text-slate-500 text-center py-16">Loading…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-16">
          No homework assigned yet
        </p>
      ) : (
        <div className="space-y-3">
          {list.map((hw) => {
            const students = hw.students || [];
            const completed = students.filter(
              (s) => s.status === "completed",
            ).length;
            const awaiting = students.filter(
              (s) => s.status === "marked_done",
            ).length;
            return (
              <div
                key={hw._id}
                className="bg-[rgb(var(--surface))] border border-slate-200 rounded-xl p-4"
              >
                <h3 className="text-sm font-semibold">{hw.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {hw.subjectId?.name || "Subject"} ·{" "}
                  {hw.teacherId?.fullName || hw.teacherId?.name || "Teacher"} ·
                  Class {hw.classId?.name} · Due {fmtDate(hw.dueDate)}
                </p>
                <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                  {hw.description}
                </p>
                <p className="text-[11px] text-slate-500 mt-2">
                  {completed}/{students.length} completed · {awaiting} awaiting
                  approval
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
