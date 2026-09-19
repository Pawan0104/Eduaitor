import { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  FaPlus,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaSchool,
  FaBook,
  FaEdit,
  FaTrash,
  FaEye,
  FaTimes,
  FaArrowLeft,
} from "react-icons/fa";
import { FiX, FiCheckCircle, FiAlertTriangle } from "react-icons/fi";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import MessageButton from "../components/MessageButton";
import UserAvatar from "../components/UserAvatar";
import ClassTimetablePreview from "../components/ClassTimetablePreview";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";

const API = import.meta.env.VITE_API_URL;

const EMPTY_DETAIL = {
  sectionId: "",
  roomNumber: "",
  teacherId: "",
  capacity: 40,
  subjectTeachers: [],
};
const EMPTY_FORM = {
  name: "",
  details: [{ ...EMPTY_DETAIL }],
  status: "Active",
};

export default function ClassPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher_admin";

  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [initialForm, setInitialForm] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const [view, setView] = useState(isTeacher ? "classes" : "classes");
  const [ttModal, setTtModal] = useState(null);
  const [weekModal, setWeekModal] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const directoryRef = useRef(null);

  const fetchTeacherStudents = async () => {
    setStudentsLoading(true);
    try {
      const res = await axios.get(`${API}/students/teacher/my-students`, {
        withCredentials: true,
      });
      setStudents(res.data.data || []);
      setAssignedClasses(res.data.assignedClasses || []);
      if (selectedClass) {
        const stillExists = (res.data.assignedClasses || []).some(
          (c) => c._id === selectedClass,
        );
        if (!stillExists) setSelectedClass("");
      }
    } catch {
      toast.error("Failed to load students");
    } finally {
      setStudentsLoading(false);
    }
  };

  const filteredStudents = selectedClass
    ? students.filter((st) => st.classId?._id === selectedClass)
    : students;

  const openStudents = () => {
    if (students.length === 0) fetchTeacherStudents();
    setView("students");
    directoryRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const openDirectory = () => {
    setView("classes");
    directoryRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const openTtDay = (row) => setTtModal(row);

  const isMobile = window.innerWidth <= 768;

  /* ── fetch ── */
  const fetchAll = async () => {
    try {
      setLoading(true);

      if (isTeacher) {
        // Teacher: only fetch their classes + subjects (no sections/teachers needed)
        const [cls, sub] = await Promise.all([
          axios.get(`${API}/classes/teacher/my-classes`, {
            withCredentials: true,
          }),
          axios.get(`${API}/subjects/all`, { withCredentials: true }),
        ]);
        setClasses(cls.data.classes || []);
        setSubjects(sub.data.subjects || []);
      } else {
        // Admin: fetch everything
        const [cls, sec, sub, tch] = await Promise.all([
          axios.get(`${API}/classes/all`, { withCredentials: true }),
          axios.get(`${API}/sections/all`, { withCredentials: true }),
          axios.get(`${API}/subjects/all`, { withCredentials: true }),
          axios.get(`${API}/teachers`, { withCredentials: true }),
        ]);
        setClasses(cls.data.classes || []);
        setSections(sec.data.sections || []);
        setSubjects(sub.data.subjects || []);
        setTeachers(tch.data.data || []);
      }
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const teachersForSubject = (subjectId) => {
    const matched = teachers.filter((t) =>
      (t.subjects || []).some((s) => String(s._id || s) === String(subjectId)),
    );
    // If nobody is tagged for this subject yet, still allow picking any teacher
    return matched.length > 0 ? matched : teachers;
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    status: form.status || "Active",
    details: form.details.map((d) => ({
      ...(d._id ? { _id: d._id } : {}),
      sectionId: d.sectionId || null,
      roomNumber: String(d.roomNumber || "").trim(),
      teacherId: d.teacherId || null,
      capacity: Number(d.capacity) > 0 ? Number(d.capacity) : 40,
      subjectTeachers: (d.subjectTeachers || [])
        .filter((st) => st.subjectId)
        .map((st) => ({
          subjectId: st.subjectId,
          teacherId: st.teacherId || null,
        })),
    })),
  });

  /* ── detail helpers (admin only) ── */
  const updateDetail = (index, field, value) => {
    setForm((p) => {
      const details = [...p.details];
      details[index] = { ...details[index], [field]: value };
      return { ...p, details };
    });
  };

  const toggleSubject = (index, subjectId) => {
    setForm((p) => {
      const details = [...p.details];
      const subjectTeachers = [...(details[index].subjectTeachers || [])];
      const exists = subjectTeachers.find((s) => s.subjectId === subjectId);
      details[index] = {
        ...details[index],
        subjectTeachers: exists
          ? subjectTeachers.filter((s) => s.subjectId !== subjectId)
          : [...subjectTeachers, { subjectId, teacherId: "" }],
      };
      return { ...p, details };
    });
  };

  const addDetail = () =>
    setForm((p) => ({ ...p, details: [...p.details, { ...EMPTY_DETAIL }] }));

  const removeDetail = (index) => {
    if (form.details.length === 1) {
      toast.error("At least one entry is required");
      return;
    }
    setForm((p) => ({
      ...p,
      details: p.details.filter((_, i) => i !== index),
    }));
  };

  const isFormDirty = () =>
    JSON.stringify(form) !== JSON.stringify(initialForm);

  const openCreate = () => {
    setEditingClass(null);
    setForm(EMPTY_FORM);
    setInitialForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (cls) => {
    const f = {
      name: cls.name,
      status: cls.status,
      details: cls.details.map((d) => ({
        _id: d._id,
        sectionId: d.sectionId?._id || "",
        roomNumber: d.roomNumber,
        teacherId: d.teacherId?._id || "",
        capacity: d.capacity || 40,
        subjectTeachers:
          d.subjectTeachers?.map((st) => ({
            subjectId: st.subjectId?._id || "",
            teacherId: st.teacherId?._id || "",
          })) || [],
      })),
    };
    setEditingClass(cls);
    setForm(f);
    setInitialForm(JSON.parse(JSON.stringify(f)));
    setShowModal(true);
  };

  const tryClose = () => {
    if (isFormDirty()) setConfirmDiscard(true);
    else closeModal();
  };
  const closeModal = () => {
    setShowModal(false);
    setEditingClass(null);
    setForm(EMPTY_FORM);
    setConfirmDiscard(false);
    setConfirmSave(false);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error("Class name is required");
      return;
    }
    const seenRooms = new Map();
    for (const d of form.details) {
      const room = String(d.roomNumber || "").trim();
      if (!room) {
        toast.error("Room number is required for every entry");
        return;
      }
      const key = room.toLowerCase();
      if (seenRooms.has(key)) {
        toast.error(
          `Room "${seenRooms.get(key)}" cannot be used more than once`,
        );
        return;
      }
      seenRooms.set(key, room);
    }
    setConfirmSave(true);
  };

  const confirmAndSave = async () => {
    setConfirmSave(false);
    const payload = buildPayload();
    try {
      setSubmitting(true);
      if (editingClass) {
        await axios.put(
          `${API}/classes/update/${editingClass._id}`,
          payload,
          { withCredentials: true },
        );
        toast.success("Class updated successfully!");
      } else {
        await axios.post(`${API}/classes/create`, payload, {
          withCredentials: true,
        });
        toast.success("Class created successfully!");
      }
      closeModal();
      fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/classes/delete/${deleteId}`, {
        withCredentials: true,
      });
      toast.success("Class deleted successfully!");
      setDeleteId(null);
      fetchAll();
    } catch {
      toast.error("Failed to delete.");
      setDeleteId(null);
    }
  };

  /* ── stats ── */
  const totalStudents = classes.reduce(
    (sum, c) => sum + c.details.reduce((s, d) => s + (d.studentCount || 0), 0),
    0,
  );
  const totalSections = classes.reduce(
    (sum, c) => sum + c.details.filter((d) => d.sectionId).length,
    0,
  );
  const withTeachers = classes.reduce(
    (sum, c) => sum + c.details.filter((d) => d.teacherId).length,
    0,
  );

  const getSubjectName = (id) =>
    subjects.find((s) => s._id === id)?.name || "Unknown";

  /* ════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6 p-8">
      {isMobile && (
        <div className="pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[rgb(var(--primary))] shadow-sm border border-slate-100 text-sm font-bold text-[rgb(var(--text))] active:scale-95 transition-transform mb-2.5"
          >
            <FaArrowLeft size={16} /> Back
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[rgb(var(--text))]">
            {isTeacher ? "My Classes" : "Classes"}
          </h1>
          <p className="text-sm text-[rgb(var(--text))] mt-0.5">
            {isTeacher
              ? "Classes you are assigned to teach"
              : "Manage school classes and sections"}
          </p>
        </div>
        {/* Only admin sees Add Class button */}
        {!isTeacher && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-[rgb(var(--text))] text-sm font-semibold px-5 py-2.5 rounded-xl transition"
          >
            <FaPlus size={12} /> Add Class
          </button>
        )}
      </div>

      {/* Stat Cards */}
      <div className={`grid grid-cols-2 ${isTeacher ? "" : "lg:grid-cols-4"} gap-4`}>
        {[
          {
            icon: <FaSchool />,
            label: "TOTAL CLASSES",
            value: classes.length,
            bg: "bg-blue-50 text-blue-500",
            onClick: isTeacher ? openDirectory : undefined,
          },
          ...(isTeacher
            ? [
                {
                  icon: <FaUserGraduate />,
                  label: "TOTAL STUDENTS",
                  value: totalStudents,
                  bg: "bg-orange-50 text-orange-500",
                  onClick: openStudents,
                },
              ]
            : [
                {
                  icon: <FaBook />,
                  label: "TOTAL SECTIONS",
                  value: totalSections,
                  bg: "bg-purple-50 text-purple-500",
                },
                {
                  icon: <FaChalkboardTeacher />,
                  label: "WITH TEACHERS",
                  value: withTeachers,
                  bg: "bg-green-50 text-green-500",
                },
                {
                  icon: <FaUserGraduate />,
                  label: "TOTAL STUDENTS",
                  value: totalStudents,
                  bg: "bg-orange-50 text-orange-500",
                },
              ]),
        ].map((s, i) => (
          <div
            key={i}
            onClick={s.onClick}
            className={`bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4 ${
              s.onClick
                ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition"
                : ""
            }`}
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 ${s.bg}`}
            >
              {s.icon}
            </div>
            <div>
              <p className="text-xs text-[rgb(var(--text))] font-medium tracking-wide">
                {s.label}
              </p>
              <p className="text-2xl font-bold text-[rgb(var(--text))] leading-tight">
                {s.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {isTeacher && view === "students" ? (
        <>
          {/* Students view — same layout as My Students */}
          <div className="mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-[rgb(var(--text))] flex items-center gap-3">
              <button
                onClick={openDirectory}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl
                  bg-[rgb(var(--surface))] shadow-sm border border-[rgb(var(--border))]
                  text-sm font-bold text-[rgb(var(--text))] active:scale-95 transition-transform"
              >
                <FaArrowLeft size={14} /> Classes
              </button>
              All Students
            </h2>
            <p className="text-sm text-[rgb(var(--text-muted))]">
              Students from your assigned classes
            </p>
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

          {/* STUDENT DIRECTORY */}
          <div className="bg-[rgb(var(--surface))] rounded-xl border border-[rgb(var(--border))] shadow-sm p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-semibold text-[rgb(var(--text))] mb-4">
              Student Directory
            </h3>

            {studentsLoading ? (
              <div className="flex justify-center py-10">
                <LoadingSpinner label="Loading students…" />
              </div>
            ) : students.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[rgb(var(--text-muted))]">
                <img
                  src="https://cdn-icons-png.flaticon.com/512/3135/3135755.png"
                  className="w-14 mb-3 opacity-30"
                  alt="empty"
                />
                <p className="text-sm sm:text-base">No students found in your assigned classes</p>
              </div>
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
        </>
      ) : (
        <>
          <h2
            ref={directoryRef}
            className="text-lg font-semibold text-[rgb(var(--text))] scroll-mt-6"
          >
            Class Directory
          </h2>

          {/* Class Cards */}
      {loading ? (
        <LoadingSpinner label="Loading classes…" />
      ) : classes.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">
          {isTeacher
            ? "You are not assigned to any classes yet."
            : "No classes found. Add your first class!"}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {classes.map((cls) => {
            if (isTeacher) {
              /* ── TEACHER: ONE CARD PER CLASS (sections aggregated) ── */
              const details = cls.details || [];
              const totalStudents = details.reduce(
                (s, d) => s + (d.studentCount || 0),
                0,
              );
              const totalCapacity = details.reduce(
                (s, d) => s + (d.capacity || 0),
                0,
              );
              const pct = totalCapacity
                ? Math.min((totalStudents / totalCapacity) * 100, 100)
                : 0;
              const rooms = [
                ...new Set(
                  details.map((d) => d.roomNumber).filter(Boolean),
                ),
              ].join(", ");
              const isClassTeacher = details.some(
                (d) => d.teacherId?._id === user?.teacher_id,
              );
              const allSubjectTeachers = details.flatMap(
                (d) => d.subjectTeachers || [],
              );
              const subjectIds = [
                ...new Set(
                  allSubjectTeachers.map(
                    (st) => st.subjectId?._id || st.subjectId,
                  ),
                ),
              ];
              const shortLabel =
                cls.name.replace(/\D/g, "") ||
                cls.name.slice(0, 2).toUpperCase();

              return (
                <div
                  key={cls._id}
                  onClick={() => navigate(`/teacher/class-view/${cls._id}`)}
                  className={`cursor-pointer bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-2xl border shadow-sm p-5 space-y-4 hover:shadow-md hover:-translate-y-0.5 transition
                    ${isClassTeacher ? "border-indigo-300 ring-1 ring-indigo-200" : "border-gray-100"}`}
                >
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl text-white flex items-center justify-center font-bold text-sm shrink-0 bg-[rgb(var(--primary))]">
                      {shortLabel}
                    </div>
                    <div>
                      <h3 className="font-bold text-[rgb(var(--text))] text-sm leading-tight">
                        {cls.name}
                      </h3>
                      <p className="text-xs text-[rgb(var(--text))]">
                        {details.length} section
                        {details.length === 1 ? "" : "s"}
                        {rooms ? ` · Room ${rooms}` : ""}
                      </p>
                    </div>
                    {isClassTeacher && (
                      <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgb(var(--primary))] text-[rgb(var(--text))]">
                        Class Teacher
                      </span>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm text-[rgb(var(--text))]">
                      <FaUserGraduate
                        size={13}
                        className="shrink-0 text-gray-400"
                      />
                      <span>{totalStudents} students</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[rgb(var(--text))]">
                      <FaBook size={13} className="shrink-0 text-gray-400" />
                      <span>{subjectIds.length} subjects</span>
                    </div>
                  </div>

                  {/* Capacity Bar */}
                  <div>
                    <div className="flex justify-between text-xs text-[rgb(var(--text))] mb-1.5">
                      <span className="font-medium">Capacity</span>
                      <span>
                        {totalStudents}/{totalCapacity || "—"}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all ${pct >= 90 ? "bg-red-400" : pct >= 70 ? "bg-amber-400" : "bg-linear-to-r from-pink-400 to-indigo-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Sections */}
                  {details.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {details.map((d, i) => (
                        <span
                          key={i}
                          className="text-[11px] font-medium px-2.5 py-0.5 rounded-full border bg-[rgb(var(--primary))] text-[rgb(var(--text))] border-indigo-100"
                        >
                          {d.sectionId?.name || "No Section"} ·{" "}
                          {d.studentCount || 0} students
                          {d.roomNumber ? ` · Room ${d.roomNumber}` : ""}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Subjects */}
                  {allSubjectTeachers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {allSubjectTeachers.slice(0, 4).map((st, i) => {
                        const isMySubject =
                          st.teacherId?._id === user?.teacher_id;
                        return (
                          <span
                            key={i}
                            className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                              isMySubject
                                ? "bg-green-50 text-green-700 border-green-200"
                                : " bg-[rgb(var(--primary))] text-[rgb(var(--text))] border-indigo-100"
                            }`}
                          >
                            {getSubjectName(st.subjectId?._id || st.subjectId)}
                            {isMySubject && " ✓"}
                          </span>
                        );
                      })}
                      {allSubjectTeachers.length > 4 && (
                        <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[rgb(var(--primary))] text-[rgb(var(--text))]">
                          +{allSubjectTeachers.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Timetable launcher — Today + Full Week */}
                  <ClassTimetablePreview
                    classId={cls._id}
                    className={cls.name}
                    details={details}
                    myTeacherId={user?.teacher_id}
                    onToday={openTtDay}
                    onWeek={setWeekModal}
                  />
                </div>
              );
            }

            return cls.details.map((detail, dIndex) => {
              const pct = detail.capacity
                ? Math.min((detail.studentCount / detail.capacity) * 100, 100)
                : 0;
              const hasSection = !!detail.sectionId;
              const sectionName = detail.sectionId?.name || "";
              const label = hasSection
                ? `${cls.name}-${sectionName}`
                : cls.name;
              const shortLabel = hasSection
                ? `${cls.name.replace(/\D/g, "")}-${sectionName}`
                : cls.name.replace(/\D/g, "") ||
                  cls.name.slice(0, 2).toUpperCase();

              // Highlight if this teacher is the class teacher or a subject teacher
              const isMyClass =
                isTeacher &&
                (detail.teacherId?._id === user?.teacher_id ||
                  detail.subjectTeachers?.some(
                    (st) => st.teacherId?._id === user?.teacher_id,
                  ));

              const visibleSubjects = detail.subjectTeachers?.slice(0, 3) || [];
              const extraSubjects = (detail.subjectTeachers?.length || 0) - 3;

              return (
                <div
                  key={`${cls._id}_${dIndex}`}
                  className={`bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-2xl border shadow-sm p-5 space-y-4 hover:shadow-md transition
                    ${isMyClass ? "border-indigo-300 ring-1 ring-indigo-200" : "border-gray-100"}`}
                >
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl text-white flex items-center justify-center font-bold text-sm shrink-0
                      ${isMyClass ? "bg-[rgb(var(--primary))]" : "bg-[rgb(var(--primary))]"}`}
                    >
                      {shortLabel}
                    </div>
                    <div>
                      <h3 className="font-bold text-[rgb(var(--text))] text-sm leading-tight">
                        {label}
                      </h3>
                      <p className="text-xs text-[rgb(var(--text))]">
                        Room {detail.roomNumber || "—"}
                      </p>
                    </div>
                    {/* Badge: class teacher */}
                    {isTeacher &&
                      detail.teacherId?._id === user?.teacher_id && (
                        <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgb(var(--primary))] text-[rgb(var(--text))]">
                          Class Teacher
                        </span>
                      )}
                  </div>

                  {/* Meta */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm text-[rgb(var(--text))]">
                      <FaChalkboardTeacher
                        size={13}
                        className="shrink-0 text-gray-400"
                      />
                      <span>{detail.teacherId?.fullName || "No Teacher"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[rgb(var(--text))]">
                      <FaUserGraduate
                        size={13}
                        className="shrink-0 text-gray-400"
                      />
                      <span>{detail.studentCount || 0} students</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[rgb(var(--text))]">
                      <FaBook size={13} className="shrink-0 text-gray-400" />
                      <span>
                        {detail.subjectTeachers?.length || 0} subjects
                      </span>
                    </div>
                  </div>

                  {/* Capacity Bar */}
                  <div>
                    <div className="flex justify-between text-xs text-[rgb(var(--text))] mb-1.5">
                      <span className="font-medium">Capacity</span>
                      <span>
                        {detail.studentCount || 0}/{detail.capacity || "—"}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all ${pct >= 90 ? "bg-red-400" : pct >= 70 ? "bg-amber-400" : "bg-linear-to-r from-pink-400 to-indigo-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Subject Pills */}
                  {visibleSubjects.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {visibleSubjects.map((sub, i) => {
                        const isMySubject =
                          isTeacher && sub.teacherId?._id === user?.teacher_id;
                        return (
                          <span
                            key={i}
                            className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border
                              ${
                                isMySubject
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : " bg-[rgb(var(--primary))] text-[rgb(var(--text))] border-indigo-100"
                              }`}
                          >
                            {getSubjectName(
                              sub.subjectId?._id || sub.subjectId,
                            )}
                            {isMySubject && " ✓"}
                          </span>
                        );
                      })}
                      {extraSubjects > 0 && (
                        <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[rgb(var(--primary))] text-[rgb(var(--text))]">
                          +{extraSubjects}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                    <button
                      onClick={() =>
                        navigate(
                          isTeacher
                            ? `/teacher/class-view/${cls._id}`
                            : `/school/class-view/${cls._id}`,
                        )
                      }
                      className="text-indigo-500 hover:bg-indigo-50 p-1.5 rounded-lg transition"
                    >
                      <FaEye size={14} />
                    </button>
                    {/* Admin-only actions */}
                    {!isTeacher && (
                      <>
                        <button
                          onClick={() => openEdit(cls)}
                          className="text-amber-500 hover:bg-amber-50 p-1.5 rounded-lg transition"
                        >
                          <FaEdit size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteId(cls._id)}
                          className="text-red-400 hover:bg-red-50 p-1.5 rounded-lg transition"
                        >
                          <FaTrash size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            });
          })}
        </div>
      )}
        </>
      )}

      {/* Modals — only render for admin */}
      {!isTeacher && (
        <>
          {/* ════════ Add / Edit Modal ════════ */}
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]  rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0  z-10">
                  <h2 className="text-lg font-bold text-[rgb(var(--text))]">
                    {editingClass ? "Edit Class" : "Add New Class"}
                  </h2>
                  <button
                    onClick={tryClose}
                    className="text-[rgb(var(--text))] hover:text-[rgb(var(--text-muted))]">
                    <FiX size={20} />
                  </button>
                </div>

                <div className="px-6 py-5 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[rgb(var(--text))] mb-1">
                        Class Name <span className="text-pink-500">*</span>
                      </label>
                      <input
                        value={form.name}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, name: e.target.value }))
                        }
                        placeholder="e.g. 1"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[rgb(var(--text))] mb-1">
                        Status
                      </label>
                      <select
                        value={form.status}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, status: e.target.value }))
                        }
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none
                         focus:border-indigo-400 bg-[rgb(var(--surface))]"
                      >
                        <option>Active</option>
                        <option>Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-[rgb(var(--text))]">
                        {form.details.length > 1 ? "Sections" : "Class Details"}
                      </label>
                      <button
                        onClick={addDetail}
                        className="flex items-center gap-1.5 text-xs font-semibold text-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-light))] px-3 py-1.5 rounded-lg transition"
                      >
                        <FaPlus size={10} /> Add Section
                      </button>
                    </div>

                    {form.details.map((detail, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-xl p-4 space-y-4 relative"
                      >
                        {form.details.length > 1 && (
                          <button
                            onClick={() => removeDetail(index)}
                            className="absolute top-3 right-3 text-[rgb(var(--text))] hover:text-red-400 transition"
                          >
                            <FaTimes size={13} />
                          </button>
                        )}
                        <p className="text-xs font-semibold text-[rgb(var(--primary))] uppercase tracking-wide">
                          {form.details.length > 1
                            ? `Section ${index + 1}`
                            : "Details"}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-[rgb(var(--text))]  mb-1">
                              Section{" "}
                              <span className="text-[rgb(var(--text-muted))] font-normal ml-1">
                                (optional)
                              </span>
                            </label>
                            <select
                              value={detail.sectionId}
                              onChange={(e) =>
                                updateDetail(index, "sectionId", e.target.value)
                              }
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none
                               focus:border-indigo-400 bg-[rgb(var(--surface))]"
                            >
                              <option value="">No Section</option>
                              {sections
                                .filter((s) => s.status === "Active")
                                .map((s) => (
                                  <option key={s._id} value={s._id}>
                                    {s.name}
                                  </option>
                                ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[rgb(var(--text))] mb-1">
                              Room Number{" "}
                              <span className="text-pink-500">*</span>
                            </label>
                            <input
                              value={detail.roomNumber}
                              onChange={(e) =>
                                updateDetail(
                                  index,
                                  "roomNumber",
                                  e.target.value,
                                )
                              }
                              placeholder="e.g. 204"
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-[rgb(var(--text))] mb-1">
                              Class Teacher{" "}
                              <span className="text-[rgb(var(--text-muted))] font-normal ml-1">
                                (optional)
                              </span>
                            </label>
                            <select
                              value={detail.teacherId}
                              onChange={(e) =>
                                updateDetail(index, "teacherId", e.target.value)
                              }
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                            >
                              <option value="">Select Teacher</option>
                              {teachers.map((t) => (
                                <option key={t._id} value={t._id}>
                                  {t.fullName}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[rgb(var(--text))] mb-1">
                              Capacity
                            </label>
                            <input
                              type="number"
                              value={detail.capacity}
                              onChange={(e) =>
                                updateDetail(index, "capacity", e.target.value)
                              }
                              placeholder="e.g. 40"
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[rgb(var(--text))] mb-2">
                            Assign Subjects
                          </label>
                          <div className="border border-gray-100 bg-[rgb(var(--surface))] rounded-xl p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto">
                            {subjects.map((sub) => (
                              <label
                                key={sub._id}
                                className="flex items-center gap-2 text-xs text-[rgb(var(--text))] cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={detail.subjectTeachers?.some(
                                    (s) => s.subjectId === sub._id,
                                  )}
                                  onChange={() => toggleSubject(index, sub._id)}
                                  className="bg-[rgb(var(--primary))]"
                                />
                                {sub.name}
                              </label>
                            ))}
                          </div>
                        </div>
                        {detail.subjectTeachers?.length > 0 && (
                          <div className="space-y-2 mt-3">
                            <label className="text-xs font-medium text-[rgb(var(--text))] ">
                              Assign Teacher per Subject
                            </label>
                            {detail.subjectTeachers.map((st, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className="text-xs w-28">
                                  {getSubjectName(st.subjectId)}
                                </span>
                                <select
                                  value={st.teacherId}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setForm((p) => {
                                      const details = [...p.details];
                                      const subjectTeachers = [
                                        ...details[index].subjectTeachers,
                                      ];
                                      subjectTeachers[i] = {
                                        ...subjectTeachers[i],
                                        teacherId: value,
                                      };
                                      details[index] = {
                                        ...details[index],
                                        subjectTeachers,
                                      };
                                      return { ...p, details };
                                    });
                                  }}
                                  className="text-xs border rounded px-2 py-1 flex-1 text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
                                >
                                  <option value="">Assign Teacher</option>
                                  {teachersForSubject(st.subjectId).map((t) => (
                                    <option key={t._id} value={t._id} className="bg-[rgb(var(--surface))]">
                                      {t.fullName}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-[rgb(var(--primary))]">
                  <button
                    onClick={tryClose}
                    className="px-5 py-2 text-sm font-medium text-[rgb(var(--text))] bg-[rgb(var(--surface))]  rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-5 py-2 text-sm font-semibold bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-lg transition disabled:opacity-60"
                  >
                    {editingClass ? "Update Class" : "Save Class"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {confirmSave && (
            <ConfirmPopup
              icon={<FiCheckCircle size={22} className="text-[rgb(var(--primary))]" />}
              iconBg="bg-indigo-100"
              strip="bg-indigo-500"
              title={editingClass ? "Update this class?" : "Create this class?"}
              message={`"${form.name}" with ${form.details.length} ${form.details.length > 1 ? "sections" : "entry"}`}
              confirmLabel={submitting ? "Saving…" : "Yes, Save"}
              confirmCls="bg-indigo-500 hover:bg-indigo-600"
              onConfirm={confirmAndSave}
              onCancel={() => setConfirmSave(false)}
              disabled={submitting}
            />
          )}

          {confirmDiscard && (
            <ConfirmPopup
              icon={<FiAlertTriangle size={22} className="text-amber-500" />}
              iconBg="bg-amber-100"
              strip="bg-amber-400"
              title="Discard changes?"
              message="You have unsaved changes. If you close now all changes will be lost."
              confirmLabel="Yes, Discard"
              confirmCls="bg-amber-500 hover:bg-amber-600"
              cancelLabel="Keep Editing"
              onConfirm={closeModal}
              onCancel={() => setConfirmDiscard(false)}
            />
          )}

          {deleteId && (
            <ConfirmPopup
              icon={<FaTrash size={18} className="text-red-500" />}
              iconBg="bg-red-100"
              strip="bg-red-500"
              title="Delete this class?"
              message="This action cannot be undone. The class and all its sections will be permanently removed."
              confirmLabel="Delete"
              confirmCls="bg-red-500 hover:bg-red-600"
              onConfirm={handleDelete}
              onCancel={() => setDeleteId(null)}
            />
          )}
        </>
      )}

      {/* Teacher: day schedule popup */}
      {ttModal && (
        <div
          className="fixed inset-0 z-60 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setTtModal(null)}
        >
          <div
            className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold">
                  {ttModal.className} — {ttModal.weekday}
                </h2>
                <p className="text-sm text-[rgb(var(--text))]">
                  {ttModal.dateLabel}
                </p>
              </div>
              <button
                onClick={() => setTtModal(null)}
                className="text-[rgb(var(--text))] hover:text-[rgb(var(--text-muted))]"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="overflow-y-auto">
              {ttModal.periods.length === 0 ? (
                <div className="p-10 text-center text-gray-400 text-sm">
                  No classes scheduled for this day.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-[rgb(var(--surface))] sticky top-0">
                    <tr className="text-left text-xs font-semibold text-[rgb(var(--text))]">
                      <th className="px-6 py-3">Time</th>
                      <th className="px-6 py-3">Section</th>
                      <th className="px-6 py-3">Subject</th>
                      <th className="px-6 py-3">Teacher</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ttModal.periods.map((p, idx) => (
                      <tr
                        key={idx}
                        className={`border-t ${
                          p.isMine ? "bg-green-50/50" : ""
                        }`}
                      >
                        <td className="px-6 py-3 font-mono text-xs">
                          {p.timeRange || "—"}
                        </td>
                        <td className="px-6 py-3">
                          {p.sectionName || "—"}
                        </td>
                        <td className="px-6 py-3 font-medium">
                          {p.type === "lunch" ? (
                            <span className="text-orange-500">Lunch</span>
                          ) : p.type === "activity" ? (
                            <span className="text-emerald-600">
                              {p.subject}
                            </span>
                          ) : p.type === "test" ? (
                            <span>
                              <span className="text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-200 rounded-full px-1.5 py-0.5 mr-1.5">
                                Test
                              </span>
                              {p.subject}
                            </span>
                          ) : (
                            p.subject
                          )}
                        </td>
                        <td className="px-6 py-3">
                          {p.teacherName || (
                            <span className="italic text-[rgb(var(--text))]">
                              —
                            </span>
                          )}
                          {p.isMine && (
                            <span className="ml-1.5 text-[10px] font-semibold text-green-600">
                              You
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="px-6 py-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setTtModal(null)}
                className="px-4 py-2 bg-[rgb(var(--primary))] text-[rgb(var(--text))] rounded-lg text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher: full week timetable popup */}
      {weekModal && weekModal.length > 0 && (
        <div
          className="fixed inset-0 z-60 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setWeekModal(null)}
        >
          <div
            className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold">
                  Weekly Timetable — {weekModal[0]?.className}
                </h2>
                <p className="text-sm text-[rgb(var(--text))]">
                  {weekModal.length} teaching days · {weekModal[0]?.periods?.length || 0}–{Math.max(...weekModal.map((r) => r.periods.length))} periods per day
                </p>
              </div>
              <button
                onClick={() => setWeekModal(null)}
                className="text-[rgb(var(--text))] hover:text-[rgb(var(--text-muted))]"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="overflow-auto">
              {(() => {
                const cols = [];
                const seen = {};
                weekModal.forEach((row) =>
                  row.periods.forEach((p) => {
                    if (!seen[p.start]) {
                      seen[p.start] = p;
                      cols.push(p);
                    }
                  }),
                );
                cols.sort((a, b) => a.start.localeCompare(b.start));

                const cellCls = (p) =>
                  p.type === "lunch"
                    ? "bg-orange-50 text-orange-600 border-orange-200"
                    : p.type === "test"
                      ? p.isMine
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : "bg-violet-50 text-violet-700 border-violet-300"
                      : p.isMine
                        ? "bg-green-50 text-green-700 border-green-300"
                        : "bg-[rgb(var(--surface))] text-[rgb(var(--text))] border-[rgb(var(--border))]";

                return (
                  <table className="w-full text-sm min-w-[680px]">
                    <thead className="bg-[rgb(var(--surface))] sticky top-0">
                      <tr className="text-left text-xs font-semibold text-[rgb(var(--text))]">
                        <th className="px-4 py-3 w-24">Day</th>
                        {cols.map((c) => (
                          <th key={c.start} className="px-2 py-3 text-center">
                            {c.timeRange}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {weekModal.map((row) => (
                        <tr
                          key={row.weekday}
                          className={`border-t ${row.isToday ? "bg-green-50/40" : ""}`}
                        >
                          <td className="px-4 py-2.5 align-top">
                            <p className="font-bold text-[rgb(var(--text))]">
                              {row.weekday}
                            </p>
                            <p className="text-[10px] text-[rgb(var(--text))]">
                              {row.dateLabel}
                            </p>
                          </td>
                          {cols.map((c) => {
                            const items = row.periods.filter(
                              (p) => p.start === c.start,
                            );
                            return (
                              <td key={c.start} className="px-2 py-2.5 align-top">
                                {items.length === 0 ? (
                                  <span className="text-[11px] italic opacity-50">
                                    —
                                  </span>
                                ) : (
                                  <div className="space-y-1">
                                    {items.map((p, i) => (
                                      <div
                                        key={i}
                                        className={`rounded-lg border px-2 py-1 text-[11px] leading-tight ${cellCls(p)}`}
                                      >
                                        <p className="font-semibold">
                                          {p.type === "test" && (
                                            <span className="text-[9px] font-bold uppercase tracking-wide mr-1">
                                              Test
                                            </span>
                                          )}
                                          {p.subject}
                                        </p>
                                        {p.teacherName && (
                                          <p className="opacity-75 truncate">
                                            {p.teacherName}
                                            {p.isMine && (
                                              <span className="ml-0.5 font-bold text-green-600">
                                                · You
                                              </span>
                                            )}
                                          </p>
                                        )}
                                        {p.sectionName && (
                                          <p className="opacity-60 text-[10px]">
                                            {p.sectionName}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            <div className="px-6 py-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setWeekModal(null)}
                className="px-4 py-2 bg-[rgb(var(--primary))] text-[rgb(var(--text))] rounded-lg text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Reusable Confirm Popup ── */
function ConfirmPopup({
  icon,
  iconBg,
  strip,
  title,
  message,
  confirmLabel = "Confirm",
  confirmCls = "bg-indigo-500 hover:bg-indigo-600",
  cancelLabel = "Go Back",
  onConfirm,
  onCancel,
  disabled = false,
}) {
  return (
    <div className="fixed inset-0 z-60 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-[rgb(var(--surface))]  text-[rgb(var(--text))] rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
        <div className={`h-1.5 w-full ${strip}`} />
        <div className="p-6 text-center">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${iconBg}`}
          >
            {icon}
          </div>
          <h3 className="text-base font-bold text-[rgb(var(--text))] mb-1">{title}</h3>
          <p className="text-sm text-[rgb(var(--text))] mb-6">{message}</p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 text-sm font-medium text-[rgb(var(--text))] bg-[rgb(var(--surface))] hover:bg-[rgb(var(--surface))] rounded-xl transition"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={disabled}
              className={`flex-1 py-2.5 text-sm font-semibold text-white rounded-xl transition disabled:opacity-60 ${confirmCls}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
