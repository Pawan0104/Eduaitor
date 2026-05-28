import { useEffect, useState } from "react";
import axios from "axios";
import { FaArrowLeft, FaEye, FaUsers } from "react-icons/fa";
import { MdPersonOutline } from "react-icons/md";
import { PiChartPieSliceBold } from "react-icons/pi";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const API = import.meta.env.VITE_API_URL;

const TeacherStudents = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [assignedClasses, setAssignedClasses] = useState([]); // ← add this
  const [selectedClass, setSelectedClass] = useState("");
  const [loading, setLoading] = useState(true);
  const isMobile = window.innerWidth <= 768;

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${API}/students/teacher/my-students`, {
        withCredentials: true,
      });
      setStudents(res.data.data || []);
      setAssignedClasses(res.data.assignedClasses || []); // ← receive from backend
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
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <p className="text-slate-500">Loading students...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-100 min-h-screen">
      {isMobile && (
        <div className="pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl
              bg-white shadow-sm border border-slate-100
              text-sm font-bold text-slate-600 active:scale-95 transition-transform mb-2.5"
          >
            <FaArrowLeft size={16} />
            Back
          </button>
        </div>
      )}

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
          My Students
        </h1>
        <p className="text-sm sm:text-base text-slate-500">
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
        <div className="bg-white rounded-xl shadow p-4 sm:p-6 mb-6">
          <p className="text-sm font-medium mb-2 text-gray-700">
            Filter by Class
          </p>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="border rounded-lg px-4 py-2 w-full sm:w-72"
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
      <div className="bg-white rounded-xl shadow p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-slate-700 mb-4">
          Student Directory
        </h2>

        {students.length === 0 ? (
          <EmptyState text="No students found in your assigned classes" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-150 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Class</th>
                  <th className="p-3 text-left">Father</th>
                  <th className="p-3 text-left">Mobile</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student._id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">
                      {student.firstName} {student.lastName}
                    </td>
                    <td className="p-3">{student.classId?.name || "-"}</td>
                    <td className="p-3">{student.fatherName}</td>
                    <td className="p-3">{student.fatherMobile}</td>
                    <td className="p-3">
                      <div className="flex justify-center">
                        <button
                          onClick={() =>
                            navigate(`/teacher/student-view/${student._id}`)
                          }
                          className="bg-blue-100 text-blue-600 p-2 rounded-md hover:bg-blue-200"
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
                    <td colSpan="5" className="text-center py-6 text-gray-400">
                      No students enrolled in{" "}
                      <span className="font-medium text-gray-500">
                        Class{" "}
                        {
                          assignedClasses.find((c) => c._id === selectedClass)
                            ?.name
                        }
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
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
  };
  return (
    <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
      <div className={`${colors[color]} p-3 rounded-lg`}>{icon}</div>
      <div>
        <p className="text-xs sm:text-sm text-gray-500">{title}</p>
        <p className="text-xl sm:text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
};

const EmptyState = ({ text }) => (
  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
    <img
      src="https://cdn-icons-png.flaticon.com/512/3135/3135755.png"
      className="w-14 mb-3 opacity-50"
      alt="empty"
    />
    <p className="text-sm sm:text-base">{text}</p>
  </div>
);
