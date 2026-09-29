import { useEffect, useState } from "react";
import axios from "axios";
import { FaArrowLeft, FaEye } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import MessageButton from "../components/MessageButton";
import UserAvatar from "../components/UserAvatar";
import Pagination from "../components/Pagination";

const API = import.meta.env.VITE_API_URL;

const CATEGORY_OPTIONS = ["General", "OBC", "SC", "ST", "Minority"];

const TeacherStudents = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const isMobile = window.innerWidth <= 768;

  const fetchStudents = async (pageNo = page, pageLimit = limit) => {
    try {
      const params = { page: pageNo, limit: pageLimit };
      if (selectedClass) params.classId = selectedClass;
      if (filterGender) params.gender = filterGender;
      if (filterCategory) params.category = filterCategory;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await axios.get(`${API}/students/teacher/my-students`, {
        params,
        withCredentials: true,
      });
      setStudents(res.data.data || []);
      setAssignedClasses(res.data.assignedClasses || []);
      setPagination(
        res.data.pagination || {
          total: (res.data.data || []).length,
          page: pageNo,
          totalPages: 1,
        },
      );
    } catch {
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  useEffect(() => {
    fetchStudents(page, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, selectedClass, filterGender, filterCategory, searchQuery]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() || selectedClass || filterGender || filterCategory,
  );

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedClass("");
    setFilterGender("");
    setFilterCategory("");
    setPage(1);
  };

  const filteredStudents = students;

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

      {/* FILTERS */}
      <div className="bg-[rgb(var(--surface))] rounded-xl border border-[rgb(var(--border))] shadow-sm p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <p className="text-sm font-semibold text-[rgb(var(--text))]">
            Filter Students
            <span className="ml-2 text-xs font-normal text-[rgb(var(--text-muted))]">
              {filteredStudents.length} of {students.length} shown
            </span>
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="self-start px-3 py-1.5 rounded-lg text-xs font-semibold border border-[rgb(var(--border))] text-[rgb(var(--text))] hover:bg-[rgb(var(--bg))]"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm font-medium mb-2 text-[rgb(var(--text))]">
              Search
            </p>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => handleFilterChange(setSearchQuery)(e.target.value)}
              placeholder="Name, admission no, father, mobile..."
              className="border border-[rgb(var(--border))] bg-[rgb(var(--bg))] text-[rgb(var(--text))]
                rounded-lg px-4 py-2 w-full outline-none
                focus:ring-2 focus:ring-[rgb(var(--primary))] focus:border-[rgb(var(--border-strong))]"
              aria-label="Search students"
            />
            <p className="text-xs text-[rgb(var(--text-muted))] mt-1.5">
              Matches student, father, mother or guardian name and any mobile
              number
            </p>
          </div>

          <div>
            <p className="text-sm font-medium mb-2 text-[rgb(var(--text))]">
              Class
            </p>
            <select
              value={selectedClass}
              onChange={(e) => handleFilterChange(setSelectedClass)(e.target.value)}
              disabled={assignedClasses.length === 0}
              className="border border-[rgb(var(--border))] bg-[rgb(var(--bg))] text-[rgb(var(--text))]
                rounded-lg px-4 py-2 w-full outline-none disabled:opacity-50 disabled:cursor-not-allowed
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

          <div>
            <p className="text-sm font-medium mb-2 text-[rgb(var(--text))]">
              Gender
            </p>
            <select
              value={filterGender}
              onChange={(e) => handleFilterChange(setFilterGender)(e.target.value)}
              className="border border-[rgb(var(--border))] bg-[rgb(var(--bg))] text-[rgb(var(--text))]
                rounded-lg px-4 py-2 w-full outline-none
                focus:ring-2 focus:ring-[rgb(var(--primary))] focus:border-[rgb(var(--border-strong))]"
            >
              <option value="">-- All Genders --</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div>
            <p className="text-sm font-medium mb-2 text-[rgb(var(--text))]">
              Category
            </p>
            <select
              value={filterCategory}
              onChange={(e) => handleFilterChange(setFilterCategory)(e.target.value)}
              className="border border-[rgb(var(--border))] bg-[rgb(var(--bg))] text-[rgb(var(--text))]
                rounded-lg px-4 py-2 w-full outline-none
                focus:ring-2 focus:ring-[rgb(var(--primary))] focus:border-[rgb(var(--border-strong))]"
            >
              <option value="">-- All Categories --</option>
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* DIRECTORY */}
      <div className="bg-[rgb(var(--surface))] rounded-xl border border-[rgb(var(--border))] shadow-sm p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-[rgb(var(--text))] mb-4">
          Student Directory
        </h2>

        {students.length === 0 ? (
          <EmptyState
            text={
              hasActiveFilters
                ? "No students match the selected filters"
                : "No students found in your assigned classes"
            }
          />
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
                {filteredStudents.length === 0 && hasActiveFilters && (
                  <tr>
                    <td colSpan="5" className="text-center py-6 text-[rgb(var(--text-muted))]">
                      No students match the selected filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={pagination.page || page}
          totalPages={pagination.totalPages || 1}
          total={pagination.total || 0}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(size) => {
            setLimit(size);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
};

export default TeacherStudents;

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