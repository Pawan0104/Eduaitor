import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaArrowLeft,
  FaEdit,
  FaSchool,
  FaChalkboardTeacher,
  FaUserGraduate,
  FaBook,
  FaDoorOpen,
  FaLayerGroup,
} from "react-icons/fa";
import { FiUsers } from "react-icons/fi";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

export default function ClassView() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  const fetchClass = async () => {
    try {
      const { data } = await axios.get(`${API}/classes/${id}`, {
        withCredentials: true,
      });
      setClassData(data.class);
    } catch {
      toast.error("Failed to load class");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClass();
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (!classData)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-[rgb(var(--text))] gap-3">
        <FaSchool size={36} />
        <p className="text-sm">Class not found.</p>
        <button
          onClick={() => {
            if (!user?.role) return;

            navigate(
              user.role === "teacher_admin"
                ? "/teacher/class"
                : "/school/class",
            );
          }}
          className="text-[rgb(var(--text))] text-sm hover:underline"
        >
          Go back
        </button>
      </div>
    );

  const details = classData.details || [];
  const hasSections = details.some((d) => d.sectionId);
  const totalStudents = details.reduce((s, d) => s + (d.studentCount || 0), 0);
  const totalCap = details.reduce((s, d) => s + (d.capacity || 0), 0);
  const totalSubjects = new Set(
    details.flatMap((d) =>
      (d.subjectTeachers || []).map((st) => st.subjectId?._id || st.subjectId),
    ),
  ).size;
  const activeDetail = details[activeTab] || details[0];

  return (
    <div className="w-full pb-12 space-y-6 p-8">
      {/* ── Back ── */}
      <button
        onClick={() => {
          if (!user?.role) return;

          navigate(
            user.role === "teacher_admin"
              ? "/teacher/class"
              : "/school/class",
          );
        }}
        className="flex items-center gap-2 text-sm  text-[rgb(var(--text))] transition"
      >
        <FaArrowLeft size={13} /> Back to Classes
      </button>

      {/* ── Hero Card ── */}
      <div className=" rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-[rgb(var(--text))]">
        <div className="h-1.5 w-full bg-linear-to-r from-indigo-400 to-pink-400" />
        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* left — class identity */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl text-[rgb(var(--text))] bg-[rgb(var(--primary))] flex items-center justify-center font-bold text-lg shrink-0">
                {classData.name.replace(/\D/g, "") ||
                  classData.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold  text-[rgb(var(--text))]">
                  {classData.name}
                </h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      classData.status === "Active"
                        ? "bg-green-100 text-green-600"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {classData.status}
                  </span>
                  {hasSections && (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                      {details.length} Section{details.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* right — summary bubbles */}
            <div className="flex items-center gap-3 flex-wrap">
              {[
                {
                  icon: <FiUsers size={16} />,
                  label: "Students",
                  value: totalStudents,
                  bg: "bg-indigo-50 text-indigo-600",
                },
                {
                  icon: <FaLayerGroup size={14} />,
                  label: "Capacity",
                  value: totalCap,
                  bg: "bg-purple-50 text-purple-600",
                },
                {
                  icon: <FaBook size={13} />,
                  label: "Subjects",
                  value: totalSubjects,
                  bg: "bg-pink-50 text-pink-600",
                },
              ].map((b, i) => (
                <div
                  key={i}
                  className={`flex flex-col items-center justify-center rounded-xl px-4 py-3 min-w-17.5 ${b.bg}`}
                >
                  <span className="mb-0.5">{b.icon}</span>
                  <p className="text-lg font-bold leading-none">{b.value}</p>
                  <p className="text-[10px] font-medium opacity-70 mt-0.5">
                    {b.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── If no sections — single detail view ── */}
      {!hasSections && activeDetail && (
        <SingleDetailView detail={activeDetail} />
      )}

      {/* ── If has sections — tab per section ── */}
      {hasSections && (
        <div className="bg-[rgb(var(--surface))]  rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* section tabs */}
          <div className="flex items-center gap-1 px-5 pt-4 border-b border-gray-100 overflow-x-auto">
            {details.map((d, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition whitespace-nowrap border-b-2 ${
                  activeTab === i
                    ? "border-indigo-500 text-[rgb(var(--text))] bg-[rgb(var(--primary))]"
                    : "border-transparent text-[rgb(var(--text))]"
                }`}
              >
                {d.sectionId ? `Section ${d.sectionId.name}` : "General"}
              </button>
            ))}
          </div>

          {/* active section detail */}
          <div className="p-6">
            <SingleDetailView detail={activeDetail} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Single detail view — reused for both cases ── */
function SingleDetailView({ detail }) {
  const pct = detail.capacity
    ? Math.min((detail.studentCount / detail.capacity) * 100, 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* info grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <InfoCard
          icon={<FaDoorOpen />}
          label="Room Number"
          value={detail.roomNumber || "—"}
          color="text-indigo-500"
        />
        <InfoCard
          icon={<FaChalkboardTeacher />}
          label="Class Teacher"
          value={detail.teacherId?.fullName || "Not Assigned"}
          color="text-amber-500"
        />
        <InfoCard
          icon={<FaUserGraduate />}
          label="Students"
          value={`${detail.studentCount || 0} enrolled`}
          color="text-green-500"
        />
        <InfoCard
          icon={<FaLayerGroup />}
          label="Capacity"
          value={`${detail.studentCount || 0} / ${detail.capacity || "—"}`}
          color="text-purple-500"
        />
      </div>

      {/* capacity bar */}
      <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold ">Class Capacity</p>
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              pct >= 90
                ? "bg-red-100 text-red-600"
                : pct >= 70
                  ? "bg-amber-100 text-amber-600"
                  : "bg-green-100 text-green-600"
            }`}
          >
            {Math.round(pct)}% filled
          </span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all ${
              pct >= 90
                ? "bg-red-400"
                : pct >= 70
                  ? "bg-amber-400"
                  : "bg-linear-to-r from-pink-400 to-indigo-400"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs  mt-2">
          <span>0</span>
          <span>{detail.studentCount || 0} students</span>
          <span>{detail.capacity || 0} max</span>
        </div>
      </div>

      {/* subjects */}
      <div className="bg-[rgb(var(--surface))] rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <FaBook className="text-[rgb(var(--text))]" size={14} />
          <h3 className="text-sm font-semibold ">
            Subjects
            <span className="ml-2 text-xs font-normal ">
              ({detail.subjectTeachers?.length || 0} assigned)
            </span>
          </h3>
        </div>
        {!detail.subjectTeachers || detail.subjectTeachers.length === 0 ? (
          <p className="text-sm text-gray-400">No subjects assigned yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {detail.subjectTeachers.map((st, i) => (
              <div
                key={i}
                className="text-xs font-medium px-3 py-1 rounded-full  border border-indigo-100 flex items-center gap-2"
              >
                <span>{st.subjectId?.name}</span>

                {st.teacherId && (
                  <span className="text-[10px] ">
                    ({st.teacherId.fullName})
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Info Card ── */
function InfoCard({ icon, label, value, color }) {
  return (
    <div className="bg-[rgb(var(--surface))]  text-[rgb(var(--text))] rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
      <span className={`mt-0.5 shrink-0 text-base ${color}`}>{icon}</span>
      <div>
        <p className="text-xs  font-medium mb-0.5">{label}</p>
        <p className="text-sm font-semibold ">{value}</p>
      </div>
    </div>
  );
}
