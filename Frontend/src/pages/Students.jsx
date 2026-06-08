import { useEffect, useState } from "react";
import axios from "axios";
import { FaPlus, FaArrowLeft, FaEye, FaEdit, FaUsers } from "react-icons/fa";
import { MdPersonOutline } from "react-icons/md";
import { PiChartPieSliceBold } from "react-icons/pi";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiTrash2 } from "react-icons/fi";

const API = import.meta.env.VITE_API_URL;

const Students = () => {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [classes, setClasses] = useState([]);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState("");
  const isMobile = window.innerWidth <= 768;
  const fetchClasses = async () => {
    try {
      const res = await axios.get(`${API}/classes/all`, {
        withCredentials: true,
      });

      setClasses(res.data.classes || []);
    } catch {
      toast.error("Failed to load classes");
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${API}/students`, { withCredentials: true });

      setStudents(res.data.data);
    } catch {
      toast.error("Failed to load students");
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, []);

  /* ================= STATS ================= */

  const totalStudents = students.length;

  const maleCount = students.filter((s) => s.gender === "Male").length;
  const femaleCount = students.filter((s) => s.gender === "Female").length;

  const present = totalStudents;

  const classCount = new Set(
    students.map((s) => s.classId?._id).filter(Boolean),
  ).size;

  const filteredStudents = selectedClass
    ? students.filter((s) => s.classId?._id === selectedClass)
    : students;

  const handleDelete = (id) => {
    setConfirmMessage("Are you sure you want to delete this student?");
    setConfirmAction(() => () => deleteStudent(id));
    setConfirmOpen(true);
  };

  const deleteStudent = async (id) => {
    try {
      await axios.delete(`${API}/students/${id}`, { withCredentials: true });

      toast.success("Student deleted successfully");

      // remove from UI instantly
      setStudents((prev) => prev.filter((s) => s._id !== id));
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete student");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[rgb(var(--bg))] text-[rgb(var(--text))] min-h-screen">
      {/* 🔙 BACK BUTTON */}
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
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>

           <h1 className="text-2xl sm:text-3xl font-bold">
            Students
          </h1> 

          {/* <p className="text-sm sm:text-base">
            Good Morning, Dr. Rajesh Kumar! Welcome to the Students panel.
          </p> */}
        </div>

        <button
          onClick={() => navigate("/school/student-manage")}
          className="flex items-center gap-2 bg-[rgb(var(--primary))] text-[rgb(var(--text))] px-5 py-2 rounded-lg shadow hover:opacity-90"
        >
          <FaPlus />
          New Admission
        </button>
      </div>

      {/* STATS */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 bg-(rgb(var(--surface))) p-4 rounded-xl shadow">
        <StatCard
          title="TOTAL STUDENTS"
          value={totalStudents}
          icon={<FaUsers size={20} />}
          color="blue"
        />

        <StatCard
          title="PRESENT"
          value={present}
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

      <div className="bg-[rgb(var(--surface))] rounded-xl shadow p-4 sm:p-6 mb-6">
        <p className="text-sm font-medium mb-2 text-[rgb(var(--text))]">Select Class</p>

        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="border rounded-lg px-4 py-2 w-full sm:w-72 text-[rgb(var(--text))]"
        >
          <option value=""  
          className="text-[rgb(var(--text))]  bg-[rgb(var(--surface))] "
          >-- Select a Class --</option>

          {classes.map((cls) => (
            <option key={cls._id} value={cls._id} className="bg-[rgb(var(--surface))]  text-[rgb(var(--text))]">
              {cls.name}
            </option>
          ))}
        </select>
      </div>

      {/* DIRECTORY */}

      <div className="bg-[rgb(var(--surface))] rounded-xl shadow p-4 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-[rgb(var(--text))]">
            Student Directory
          </h2>
        </div>

        {students.length === 0 && <EmptyState text="No students available" />}

        {students.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-175 text-sm">
              <thead className="bg-[rgb(var(--surface))] ">
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
                  <tr key={student._id} className="border-t hover:bg-[rgb(var(--bg-hover))]">
                    <td className="p-3 font-medium">
                      {student.firstName} {student.lastName}
                    </td>

                    <td className="p-3">{student.classId?.name || "-"}</td>

                    <td className="p-3">{student.fatherName}</td>

                    <td className="p-3">{student.fatherMobile}</td>

                    <td className="p-3">
                      <div className="flex justify-center gap-3">
                        <button
                          onClick={() =>
                            navigate(`/school/student-view/${student._id}`)
                          }
                          className="bg-blue-100 text-blue-600 p-2 rounded-md hover:bg-blue-200"
                        >
                          <FaEye />
                        </button>

                        <button
                          onClick={() =>
                            navigate(`/school/student-manage/${student._id}`)
                          }
                          className="bg-green-100 text-green-600 p-2 rounded-md hover:bg-green-200"
                        >
                          <FaEdit />
                        </button>

                        <button
                          onClick={() => handleDelete(student._id)}
                          className="bg-red-100 text-red-600 p-2 rounded-md hover:bg-red-200"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-6 text-[rgb(var(--text))]">
                      No students found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {confirmOpen && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50 border-bg-[rgb(var(--border-strong))]">
          <div className="bg-[rgb(var(--surface))] rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">Confirmation</h3>

            <p className="text-[rgb(var(--text))] mb-6">{confirmMessage}</p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 bg-[rgb(var(--primary))] text-[rgb(var(--text))] rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  confirmAction?.();
                  setConfirmOpen(false);
                }}
                className="px-4 py-2 bg-[rgb(var(--primary))] text-[rgb(var(--text))]  rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;

/* ================= COMPONENTS ================= */

const StatCard = ({ title, value, icon, color }) => {
  const colors = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
  };

  return (
    <div className="bg-[rgb(var(--surface))] rounded-xl shadow p-5 flex items-center gap-4">
      <div className={`${colors[color]} p-3 rounded-lg`}>{icon}</div>

      <div>
        <p className="text-xs sm:text-sm text-[rgb(var(--text-muted))]">{title}</p>

        <p className="text-xl sm:text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
};

const EmptyState = ({ text }) => (
  <div className="flex flex-col items-center justify-center py-16 text-[rgb(var(--text))]">
    <img
      src="https://cdn-icons-png.flaticon.com/512/3135/3135755.png"
      className="w-14 mb-3 opacity-50"
    />

    <p className="text-sm sm:text-base">{text}</p>
  </div>
);
