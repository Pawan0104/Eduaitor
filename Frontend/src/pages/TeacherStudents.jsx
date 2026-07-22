import { useEffect, useState } from "react";
import axios from "axios";
import { FaArrowLeft, FaEye, FaUsers } from "react-icons/fa";
import { MdPersonOutline } from "react-icons/md";
import { PiChartPieSliceBold } from "react-icons/pi";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import MessageButton from "../components/MessageButton";
import UserAvatar from "../components/UserAvatar";

const API = import.meta.env.VITE_API_URL;

const TeacherStudents = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [loading, setLoading] = useState(true);
  const isMobile = window.innerWidth <= 768;

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${API}/students/teacher/my-students`, {
        withCredentials: true,
      });
      setStudents(res.data.data || []);
      setAssignedClasses(res.data.assignedClasses || []);
    } catch {
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const totalStudents = students.length;
  const maleCount = students.filter((s) => s.gender === "Male").length;
  const femaleCount = students.filter((s) => s.gender === "Female").length;

  const filteredStudents = selectedClass
    ? students.filter((s) => s.classId?._id === selectedClass)
    : students;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[rgb(var(--bg))]">
        <div className="w-6 h-6 border-2 border-[rgb(var(--primary))] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[rgb(var(--bg))] min-h-screen">
      {isMobile && (
        <div className="pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl
              bg-[rgb(var(--surface))] shadow-sm border border-[rgb(var(--border))]
              text-sm font-bold text-[rgb(var(--text))] active:scale-95 transition-transform mb-2.5"
          >
            <FaArrowLeft size={16} />
            Back
          </button>
        </div>
      )}

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-[rgb(var(--text))]">
          My Students
        </h1>
        <p className="text-sm sm:text-base text-[rgb(var(--text-muted))]">
          Students from your assigned classes
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="TOTAL STUDENTS"
          value={totalStudents}
          icon={<FaUsers size={20} />}
          color="blue"
        />
        <StatCard
          title="MALE"
          value={maleCount}
          icon={<MdPersonOutline size={20} />}
          color="green"
        />
        <StatCard
          title="MALE / FEMALE"
          value={`${maleCount} / ${femaleCount}`}
          icon={<PiChartPieSliceBold size={20} />}
          color="purple"
        />
      </div>

      {/* CLASS FILTER */}
      {assignedClasses.length > 0 && (
        <div className="bg-[rgb(var(--surface))] rounded-xl border border-[rgb(var(--border))] shadow-sm p-4 sm:p-6 mb-6">
          <p className="text-sm font-medium mb-2 text-[rgb(var(--text))]">
            Filter by Class
          </p>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="border border-[rgb(var(--border))] bg-[rgb(var(--bg))] text-[rgb(var(--text))]
              rounded-lg px-4 py-2 w-full sm:w-72 outline-none
              focus:ring-2 focus:ring-[rgb(var(--primary))] focus:border-[rgb(var(--border-strong))]"
          >
            <option value="">-- All Classes --</option>
            {assignedClasses.map((cls) => (
              <option key={cls._id} value={cls._id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* DIRECTORY */}
      <div className="bg-[rgb(var(--surface))] rounded-xl border border-[rgb(var(--border))] shadow-sm p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-[rgb(var(--text))] mb-4">
          Student Directory
        </h2>

        {students.length === 0 ? (
          <EmptyState text="No students found in your assigned classes" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-150 text-sm">
              <thead>
                <tr className="bg-[rgb(var(--bg))] border-b border-[rgb(var(--border))]">
                  <th className="p-3 text-left text-[rgb(var(--text-muted))] font-semibold text-xs uppercase tracking-wide">Name</th>
                  <th className="p-3 text-left text-[rgb(var(--text-muted))] font-semibold text-xs uppercase tracking-wide">Class</th>
                  <th className="p-3 text-left text-[rgb(var(--text-muted))] font-semibold text-xs uppercase tracking-wide">Father</th>
                  <th className="p-3 text-left text-[rgb(var(--text-muted))] font-semibold text-xs uppercase tracking-wide">Mobile</th>
                  <th className="p-3 text-center text-[rgb(var(--text-muted))] font-semibold text-xs uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr
                    key={student._id}
                    className="border-t border-[rgb(var(--border))] hover:bg-[rgb(var(--bg))] transition-colors"
                  >
                    <td className="p-3 font-medium text-[rgb(var(--text))]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <UserAvatar
                          name={`${student.firstName || ""} ${student.lastName || ""}`}
                          photoUrl={student.documents?.studentPhoto?.url}
                          size="sm"
                        />
                        <span className="truncate">
                          {student.firstName} {student.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-[rgb(var(--text-muted))]">{student.classId?.name || "-"}</td>
                    <td className="p-3 text-[rgb(var(--text-muted))]">{student.fatherName}</td>
                    <td className="p-3 text-[rgb(var(--text-muted))]">{student.fatherMobile}</td>
                    <td className="p-3">
                      <div className="flex justify-center gap-1">
                        <MessageButton
                          targetId={student._id}
                          targetModel="Student"
                          iconOnly={true}
                          className="!bg-[rgb(var(--primary))]/10 !text-[rgb(var(--primary))] hover:!bg-[rgb(var(--primary))]/20 !rounded-md !p-2"
                        />
                        <button
                          onClick={() => navigate(`/teacher/student-view/${student._id}`)}
                          className="bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))] p-2 rounded-md
                            hover:bg-[rgb(var(--primary))]/20 transition-colors"
                          title="View Student"
                        >
                          <FaEye />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && selectedClass && (
                  <tr>
                    <td colSpan="5" className="text-center py-6 text-[rgb(var(--text-muted))]">
                      No students enrolled in{" "}
                      <span className="font-medium text-[rgb(var(--text))]">
                        Class {assignedClasses.find((c) => c._id === selectedClass)?.name}
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherStudents;

const StatCard = ({ title, value, icon, color }) => {
  const colors = {
    blue:   "bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))]",
    green:  "bg-[rgb(var(--primary))]/15 text-[rgb(var(--primary-light))]",
    purple: "bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))]",
  };
  return (
    <div className="bg-[rgb(var(--surface))] rounded-xl border border-[rgb(var(--border))] shadow-sm p-5 flex items-center gap-4">
      <div className={`${colors[color]} p-3 rounded-lg`}>{icon}</div>
      <div>
        <p className="text-xs sm:text-sm text-[rgb(var(--text-muted))]">{title}</p>
        <p className="text-xl sm:text-2xl font-bold text-[rgb(var(--text))]">{value}</p>
      </div>
    </div>
  );
};

const EmptyState = ({ text }) => (
  <div className="flex flex-col items-center justify-center py-16 text-[rgb(var(--text-muted))]">
    <img
      src="https://cdn-icons-png.flaticon.com/512/3135/3135755.png"
      className="w-14 mb-3 opacity-30"
      alt="empty"
    />
    <p className="text-sm sm:text-base">{text}</p>
  </div>
);