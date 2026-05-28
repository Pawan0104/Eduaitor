import { useEffect, useState } from "react";
import axios from "axios";
import { FaArrowLeft, FaPlus, FaTrash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const API = import.meta.env.VITE_API_URL;

const Teachers = () => {
  const navigate = useNavigate();

  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState("");
  const [classes, setClasses] = useState([]);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const isMobile = window.innerWidth <= 768;

  /* FETCH TEACHERS */

  const fetchTeachers = async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${API}/teachers`, { withCredentials: true });

      setTeachers(res.data.data || []);
    } catch (error) {
      console.error("Failed to load teachers:", error);
      toast.error("Failed to load teachers");
    } finally {
      setLoading(false);
    }
  };

  /* FETCH CLASSES FOR FILTER */

  const fetchClasses = async () => {
    try {
      const res = await axios.get(`${API}/classes/all`, {
        withCredentials: true,
      });

      setClasses(res.data.classes || []);
    } catch (error) {
      console.error("Failed to load classes:", error);
    }
  };

  useEffect(() => {
    fetchTeachers();
    fetchClasses();
  }, []);

  /* DELETE TEACHER */

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      await axios.delete(`${API}/teachers/${deleteId}`, {
        withCredentials: true,
      });

      toast.success("Teacher deleted successfully");

      setDeleteModal(false);
      setDeleteId(null);

      // Refresh list
      fetchTeachers();
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to delete teacher";
      toast.error(message);
    }
  };

  /* FILTER TEACHERS */

  const filteredTeachers = filterClass
    ? teachers.filter((t) =>
        t.assignedClasses?.some((c) => c._id === filterClass),
      )
    : teachers;

  /* STATS */

  const totalTeachers = teachers.length;

  const present = teachers.filter((t) => t.status === "Present").length;

  const avgExperience =
    teachers.reduce((a, b) => a + Number(b.experience || 0), 0) /
    (teachers.length || 1);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-[rgb(var(--text))]">Loading teachers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[rgb(var(--bg))] min-h-screen">
      {/* HEADER */}
      {/* 🔙 BACK BUTTON */}
      {isMobile && (
          <div className="pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl
                 bg-[rgb(var(--primary))] shadow-sm border border-slate-100
                 text-sm font-bold text-[rgb(var(--text))] active:scale-95 transition-transform mb-2.5"
          >
            <FaArrowLeft size={16} />
            Back
          </button>
        </div>
      )}
      <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Teachers</h1>

          <p className="text-[rgb(var(--text-muted))] text-sm sm:text-base">
            Manage your school's teaching staff
          </p>
        </div>

        <button
          onClick={() => navigate("/school/teacher-manage")}
          className="bg-[rgb(var(--primary))] text-[rgb(var(--text))] px-4 py-2 rounded-lg flex items-center gap-2 shadow transition"
        >
          <FaPlus />
          Add Teacher
        </button>
      </div>

      {/* STATS */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 bg-[rgb(var(--surface))] text-[rgb(var(--text))]">
        <Stat title="TOTAL TEACHERS" value={totalTeachers} color="blue" />
        <Stat title="PRESENT TODAY" value={present} color="green" />
        <Stat
          title="AVG EXPERIENCE"
          value={`${avgExperience.toFixed(1)} yrs`}
          color="purple"
        />
      </div>

      {/* DIRECTORY HEADER */}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h2 className="text-lg sm:text-xl font-semibold">Faculty Directory</h2>

        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="border rounded-lg px-3 py-2 w-full sm:w-64 focus:ring-2 focus:ring-indigo-500 outline-none text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
        >
          <option value="">All Classes</option>
          {classes.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name || c.className}
            </option>
          ))}
        </select>
      </div>

      {/* TABLE */}

      <div className="bg-[rgb(var(--surface))] rounded-xl shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[rgb(var(--surface))]">
              <tr>
                <th className="p-4 text-left">Teacher</th>
                <th className="p-4 text-left">Department</th>
                <th className="p-4 text-left">Subject</th>
                <th className="p-4 text-left">Classes</th>
                <th className="p-4 text-left">Experience</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredTeachers.map((teacher) => (
                <tr key={teacher._id} className="border-t">
                  {/* TEACHER */}

                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {teacher.photo?.url ? (
                        <img
                          src={teacher.photo.url}
                          alt={teacher.fullName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-full flex items-center justify-center font-semibold">
                          {teacher.fullName?.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div>
                        <p className="font-medium">{teacher.fullName}</p>

                        <p className="text-[rgb(var(--text-muted))] text-xs">
                          {teacher.teacherId}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="p-4">
                    <span className="text-[rgb(var(--text))]">
                      {teacher.department || "-"}
                    </span>
                  </td>

                  <td className="p-4">
                    {teacher.subjects?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {teacher.subjects.slice(0, 2).map((s) => (
                          <span
                            key={s._id}
                            className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full font-medium"
                          >
                            {s.name}
                          </span>
                        ))}
                        {teacher.subjects.length > 2 && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-[rgb(var(--text))] rounded-full font-medium">
                            +{teacher.subjects.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[rgb(var(--text-muted))]">-</span>
                    )}
                  </td>

                  <td className="p-4">
                    {teacher.assignedClasses?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {teacher.assignedClasses.slice(0, 2).map((c) => (
                          <span
                            key={c._id}
                            className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded"
                          >
                            {c.name || c.className}
                          </span>
                        ))}
                        {teacher.assignedClasses.length > 2 && (
                          <span className="px-2 py-1 text-xs bg-[rgb(var(--primary))] text-[rgb(var(--text))] rounded">
                            +{teacher.assignedClasses.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[rgb(var(--text-muted))]">-</span>
                    )}
                  </td>

                  <td className="p-4">
                    <span className="text-[rgb(var(--text))]">
                      {teacher.experience ? `${teacher.experience} yrs` : "-"}
                    </span>
                  </td>

                  <td className="p-4">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        teacher.status === "Present"
                          ? "bg-green-100 text-green-600"
                          : teacher.status === "Absent"
                            ? "bg-red-100 text-red-600"
                            : "bg-yellow-100 text-yellow-600"
                      }`}
                    >
                      {teacher.status || "Present"}
                    </span>
                  </td>

                  {/* ACTIONS */}

                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() =>
                          navigate(`/school/teacher-view/${teacher._id}`)
                        }
                        className="px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition text-xs font-medium"
                        title="View Details"
                      >
                        View
                      </button>

                      <button
                        onClick={() =>
                          navigate(`/school/teacher-manage/${teacher._id}`)
                        }
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-xs font-medium"
                        title="Edit Teacher"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDeleteClick(teacher._id)}
                        className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition text-xs font-medium flex items-center gap-1"
                        title="Delete Teacher"
                      >
                        <FaTrash className="text-xs" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredTeachers.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-[rgb(var(--text-muted))]">
                    {filterClass
                      ? "No teachers found for selected class"
                      : "No teachers found. Click 'Add Teacher' to get started."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}

      {deleteModal && (
        <DeleteModal
          onCancel={() => {
            setDeleteModal(false);
            setDeleteId(null);
          }}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
};

export default Teachers;

/* STAT CARD */

const Stat = ({ title, value, color = "blue" }) => {
  const colors = {
    blue: "border-l-blue-500",
    green: "border-l-green-500",
    purple: "border-l-purple-500",
    yellow: "border-l-yellow-500",
  };

  return (
    <div
      className={`bg-[rgb(var(--surface))] rounded-xl shadow p-5 border-l-4 ${colors[color]}`}
    >
      <p className="text-xs sm:text-sm text-gray-500 font-medium">{title}</p>

      <p className="text-xl sm:text-2xl font-bold mt-1">{value}</p>
    </div>
  );
};

/* DELETE MODAL */

const DeleteModal = ({ onCancel, onConfirm }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-[rgb(var(--surface))] rounded-xl p-6 w-96 max-w-full mx-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          <FaTrash className="text-red-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Delete Teacher</h3>
          <p className="text-sm text-gray-500">This action cannot be undone</p>
        </div>
      </div>

      <p className="text-gray-600 mb-6">
        Are you sure you want to delete this teacher? All associated data will
        be permanently removed from the system.
      </p>

      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-[rgb(var(--primary))] text-[rgb(var(--text))] transition"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Delete Teacher
        </button>
      </div>
    </div>
  </div>
);
