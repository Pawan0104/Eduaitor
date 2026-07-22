import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

function ExamCreate() {
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClassFilter, setSelectedClassFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [filteredSubjects, setFilteredSubjects] = useState([]);
  const [filteredTeachers, setFilteredTeachers] = useState([]);
  const [terms, setTerms] = useState([]);

  const fetchTerms = async () => {
    try {
      const res = await axios.get(`${API}/terms`, { withCredentials: true });
      setTerms(res.data.terms);
    } catch (err) {
      toast.error("Failed to fetch terms");
    }
  };

  useEffect(() => {
    fetchTerms();
  }, []);

  const [formData, setFormData] = useState({
    className: "",
    subject: "",
    examDate: "",
    termId: "",
    teacherId: "",
    sectionId: "",
    dayOfWeek: "",
    startTime: "",
    endTime: "",
    totalMarks: "",
    passingMarks: "",
  });

  const API = import.meta.env.VITE_API_URL;

  const getDayName = (dateString) => {
    if (!dateString) return "";
    return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
      new Date(dateString),
    );
  };

  const formatTimeTo12h = (time24) => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(":");
    const h = parseInt(hours);
    return `${h % 12 || 12}:${minutes} ${h >= 12 ? "PM" : "AM"}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cRes, sRes] = await Promise.all([
          axios.get(`${API}/classes/all`, { withCredentials: true }),
          axios.get(`${API}/subjects/all`, { withCredentials: true }),
        ]);
        setClasses(cRes.data.classes || []);
        setSubjects(sRes.data.subjects || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    fetchExams();
  }, [selectedClassFilter]);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const url = `${API}/exam/list${
        selectedClassFilter ? `?classId=${selectedClassFilter}` : ""
      }`;
      const res = await axios.get(url, { withCredentials: true });
      console.log("Fetched Exams:", res.data);
      setExams(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Class Change
  const handleClassChange = (classId) => {
    setFormData((prev) => ({
      ...prev,
      className: classId,
      sectionId: "",
      subject: "",
      teacherId: "",
    }));

    setFilteredSubjects([]);
    setFilteredTeachers([]);
  };
  // handle section change
  const handleSectionChange = (sectionId) => {
    const selectedClass = classes.find((c) => c._id === formData.className);

    const selectedSection = selectedClass?.details.find(
      (d) => d.sectionId._id === sectionId,
    );

    if (selectedSection) {
      const subjects = [];
      const teachers = [];

      selectedSection.subjectTeachers.forEach((st) => {
        if (st.subjectId) {
          subjects.push({
            _id: st.subjectId._id,
            name: st.subjectId.name,
          });
        }

        if (st.teacherId) {
          teachers.push({
            _id: st.teacherId._id,
            name: st.teacherId.fullName,
          });
        }
      });

      setFilteredSubjects(subjects);
      setFilteredTeachers(teachers);
    }

    setFormData((prev) => ({
      ...prev,
      sectionId,
      subject: "",
      teacherId: "",
    }));
  };
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: "", // 'delete' or 'update'
    data: null,
  });
  // 1. CLICK ACTIONS: Just prepare the data or open the form
  const handleEditClick = (exam) => {
    setEditingId(exam._id);
    handleClassChange(exam.className?._id);
    console.log("Editing Exam:", exam?.sectionId);
    setFormData({
      className: exam.className?._id || "",
      subject: exam.subject?._id || "",
      teacherId: exam.teacherId?._id || "",
      termId: exam.termId?._id || "",
      examDate: exam.examDate.split("T")[0],
      dayOfWeek: exam.dayOfWeek,
      startTime: exam.startTime,
      endTime: exam.endTime,
      totalMarks: exam.totalMarks,
      passingMarks: exam.passingMarks,
      sectionId: exam.sectionId || "",
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id) => {
    setConfirmModal({ isOpen: true, type: "delete", data: id });
  };

  // 2. FORM HANDLER: Logic for New vs Update
  const handleFormSubmit = (e) => {
    e.preventDefault();
    // Basic validation before even showing the popup
    if (parseInt(formData.passingMarks) >= parseInt(formData.totalMarks)) {
      return toast.error("Passing marks must be less than total marks");
    }

    if (editingId) {
      // If updating, show confirmation popup
      setConfirmModal({ isOpen: true, type: "update", data: formData });
    } else {
      // If new exam, just call the API directly (or show popup if you prefer)
      executeFinalAction("create");
    }
  };

  // 3. DATABASE EXECUTION: The only function that talks to your Server
  const executeFinalAction = async (overrideType) => {
    const { type, data } = confirmModal;
    const actionType = overrideType || type; // Supports 'create', 'update', or 'delete'

    const loadingToast = toast.loading("Processing...");

    try {
      if (actionType === "delete") {
        await axios.delete(`${API}/exam/delete/${data}`, {
          withCredentials: true,
        });
        toast.success("Exam deleted successfully", { id: loadingToast });
      } else if (actionType === "update") {
        await axios.put(
          `${API}/exam/edit/${editingId}`,
          {
            ...formData,
          },
          { withCredentials: true },
        );
        toast.success("Changes saved successfully", { id: loadingToast });
      } else if (actionType === "create") {
        await axios.post(
          `${API}/exam/create`,
          { ...formData },
          { withCredentials: true },
        );
        toast.success("New exam scheduled", { id: loadingToast });
      }

      // Cleanup
      setIsModalOpen(false);
      setConfirmModal({ isOpen: false, type: "", data: null });
      resetForm();
      fetchExams();
    } catch (err) {
      const msg = err.response?.data?.message || "Operation failed";
      toast.error(msg, { id: loadingToast });
    } finally {
      // 4. THE ULTIMATE SAFETY: If the toast is still stuck for any reason,
      // this ensures it disappears after a short delay.
      setTimeout(() => toast.dismiss(loadingToast), 500);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      className: "",
      subject: "",
      examDate: "",
      dayOfWeek: "",
      startTime: "",
      endTime: "",
      totalMarks: "",
      passingMarks: "",
    });
  };

  return (
    <div className="p-4 md:p-8 min-h-screen font-sans text-[rgb(var(--text))]">
      {/* 🔙 BACK BUTTON */}
      {isMobile && (
        <div className="px-4 pt-4">
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
      {/* Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-[rgb(var(--primary))] ">
            Exams
          </h1>
          <p className="text-sm">
            Schedule and manage school tests
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="w-full md:w-auto bg-[rgb(var(--primary))] text-[rgb(var(--text))] px-6 py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-all"
        >
          + New Exam
        </button>
      </div>

      {/* Filter Bar */}
      <div className="max-w-7xl mx-auto mb-6 flex items-center gap-3 overflow-x-auto pb-2">
        <span className="text-xs font-bold  uppercase whitespace-nowrap">
          Filter:
        </span>
        <select
          className="text-[rgb(var(--text))] bg-[rgb(var(--surface))] border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          value={selectedClassFilter}
          onChange={(e) => setSelectedClassFilter(e.target.value)}
        >
          <option value="">All Classes</option>
          {classes.map((c) => (
            <option key={c._id} value={c._id}>
              Class {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Main List */}
      <div className="max-w-7xl mx-auto">
        {/* Desktop Table - Hidden on Mobile */}
        <div className="hidden md:block text-[rgb(var(--text))] bg-[rgb(var(--surface))]  rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="table-x-scroll">
          <table className="w-full text-left">
            <thead className=" border-b border-slate-200">
              <tr className=" text-[10px] font-black uppercase tracking-widest">
                <th className="p-4">Subject & Class</th>
                <th className="p-4">Date & Day</th>
                <th className="p-4">Time</th>
                <th className="p-4">Marks</th>
                <th className="p-4">Term / Teacher</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {exams.map((exam) => (
                <tr
                  key={exam._id}
                  className="transition-colors"
                >
                  <td className="p-4">
                    <div className="font-bold">
                      {exam.subject.name || exam.subject}
                    </div>
                    <div className="text-xs ">
                      Class {exam.className?.name}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-sm">
                      {new Date(exam.examDate).toLocaleDateString("en-GB")}
                    </div>
                    <div className="text-[10px] font-bold text-[rgb(var(--primary))] uppercase">
                      {exam.dayOfWeek}
                    </div>
                  </td>
                  <td className="p-4 text-sm ">
                    {formatTimeTo12h(exam.startTime)} -{" "}
                    {formatTimeTo12h(exam.endTime)}
                  </td>
                  <td className="p-4">
                    <span className="text-green-600 font-bold">
                      {exam.passingMarks}
                    </span>
                    <span className="text-slate-300 mx-1">/</span>
                    <span className="font-bold">{exam.totalMarks}</span>
                  </td>
                  <td className="p-4">
                    <div className="text-xs text-[rgb(var(--primary))]">
                      {exam.termId?.name}
                    </div>

                    <div className="text-xs">
                      {exam.teacherId?.fullName}
                    </div>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => handleEditClick(exam)}
                      className={`font-bold text-xs px-2 py-1 rounded 
    ${
      exam.examDate && new Date(exam.examDate) < new Date()
        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
        : "text-[rgb(var(--surface))] bg-[rgb(var(--primary))] hover:underline cursor-pointer"
    }
  `}
                      disabled={exam.examDate < new Date()}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(exam._id)}
                      className={`font-bold text-xs px-2 py-1 rounded 
    ${
      exam.examDate && new Date(exam.examDate) < new Date()
        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
        : "bg-[rgb(var(--primary))] text-[rgb(var(--surface))] hover:underline cursor-pointer"
    }
  `}
                      disabled={exam.examDate < new Date()}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        {/* Mobile Cards - Shown only on Mobile */}
        <div className="md:hidden space-y-4">
          {exams.map((exam) => (
            <div
              key={exam._id}
              className="bg-[rgb(var(--surface))] p-5 rounded-2xl shadow-sm border border-slate-200"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-black text-lg text-[rgb(var(--text))]">
                    {exam.subject.name || exam.subject}
                  </h3>
                  <span className="text-xs bg-[rgb(var(--surface))] px-2 py-0.5 rounded-md font-bold uppercase">
                    Class {exam.className?.name}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">
                    {new Date(exam.examDate).toLocaleDateString("en-GB")}
                  </div>
                  <div className="text-[10px] font-bold uppercase">
                    {exam.dayOfWeek}
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm py-3 border-y border-slate-50 my-3">
                <span className="">
                  {formatTimeTo12h(exam.startTime)} -{" "}
                  {formatTimeTo12h(exam.endTime)}
                </span>
                <span className="font-bold">
                  {exam.passingMarks} / {exam.totalMarks} Marks
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleEditClick(exam)}
                  className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg font-bold text-xs cursor-pointer"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteClick(exam._id)}
                  className="flex-1 bg-red-50 text-red-500 py-2 rounded-lg font-bold text-xs cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Responsive Modal / Slide-over */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          ></div>
          <div className="relative text-[rgb(var(--text))] bg-[rgb(var(--surface))] w-full max-w-xl md:rounded-4xl rounded-t-4xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="text-[rgb(var(--text))] bg-[rgb(var(--primary))] p-6  shrink-0">
              <h2 className="text-xl font-bold">
                {editingId ? "Edit Exam" : "Schedule Exam"}
              </h2>
              <p className=" text-xs opacity-80">
                Enter exam details below
              </p>
            </div>

            <form
              onSubmit={handleFormSubmit}
              className="p-6 space-y-4 overflow-y-auto"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold uppercase">
                    Exam Term
                  </label>
                  <select
                    required
                    className="w-full mt-1 p-3 border rounded-xl outline-none text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
                    value={formData.termId}
                    onChange={(e) =>
                      setFormData({ ...formData, termId: e.target.value })
                    }
                  >
                    <option value="">
                      Select Term (e.g. Final, Half Yearly)
                    </option>
                    {terms.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name} ({t.academicYear})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Class Selection */}
                  <div className="col-span-1">
                    <label className="text-[10px] font-bold  uppercase">
                      Class
                    </label>
                    <select
                      required
                      className="w-full mt-1 p-3 border rounded-xl outline-none text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
                      value={formData.className}
                      onChange={(e) => handleClassChange(e.target.value)}
                    >
                      <option value="">Pick Class</option>
                      {classes.map((c) => (
                        <option key={c._id} value={c._id}>
                          Class {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold  uppercase">
                      Section
                    </label>

                    <select
                      value={formData.sectionId}
                      onChange={(e) => handleSectionChange(e.target.value)}
                      className="w-full mt-1 p-3 border rounded-xl text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
                      disabled={!formData.className}
                    >
                      <option value="">Select Section</option>

                      {classes
                        .find((c) => c._id === formData.className)
                        ?.details.map((d) => (
                          <option key={d.sectionId._id} value={d.sectionId._id}>
                            {d.sectionId.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Subject Selection - Now Filtered */}
                  <div className="col-span-1">
                    <label className="text-[10px] font-bold  uppercase">
                      Subject
                    </label>
                    <select
                      required
                      className=" mt-1 p-3 border rounded-xl outline-none text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
                      value={formData.subject}
                      onChange={(e) =>
                        setFormData({ ...formData, subject: e.target.value })
                      }
                      disabled={!formData.className}
                    >
                      <option value="" className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]">Pick Subject</option>
                      {filteredSubjects.map((s) => (
                        <option key={s._id} value={s._id} className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Teacher Selection - New */}
                <div className="col-span-2">
                  <label className="text-[10px] font-bold  uppercase">
                    Assign Teacher (Invigilator/Examiner)
                  </label>
                  <select
                    required
                    className="w-full mt-1 p-3 text-[rgb(var(--text))] bg-[rgb(var(--surface))] border rounded-xl"
                    value={formData.teacherId}
                    onChange={(e) =>
                      setFormData({ ...formData, teacherId: e.target.value })
                    }
                    disabled={!formData.className}
                  >
                    <option value="" className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]">Select Teacher</option>
                    {filteredTeachers.map((t) => (
                      <option key={t._id} value={t._id} className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className="text-[10px] font-bold  uppercase">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full mt-1 p-3 border rounded-xl outline-none text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
                    value={formData.examDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        examDate: e.target.value,
                        dayOfWeek: getDayName(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-[10px] font-bold  uppercase">
                    Day
                  </label>
                  <div className="mt-1 p-3 text-[rgb(var(--primary))] rounded-xl font-bold text-sm text-center border border-indigo-100 uppercase">
                    {formData.dayOfWeek || "---"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold  uppercase">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    className="w-full mt-1 p-3 border rounded-xl outline-none text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData({ ...formData, startTime: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold  uppercase">
                    End Time
                  </label>
                  <input
                    type="time"
                    required
                    className="w-full mt-1 p-3 border rounded-xl outline-none text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
                    value={formData.endTime}
                    onChange={(e) =>
                      setFormData({ ...formData, endTime: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold  uppercase">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    required
                    className="w-full mt-1 p-3 border rounded-xl"
                    value={formData.totalMarks}
                    onChange={(e) =>
                      setFormData({ ...formData, totalMarks: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold  uppercase">
                    Passing Marks
                  </label>
                  <input
                    type="number"
                    required
                    className="w-full mt-1 p-3  border rounded-xl"
                    value={formData.passingMarks}
                    onChange={(e) =>
                      setFormData({ ...formData, passingMarks: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 pb-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 font-bold text-[rgb(var(--primary))] border rounded-2xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-2 py-4 text-[rgb(var(--text))] bg-[rgb(var(--primary))] font-bold rounded-2xl"
                >
                  {editingId ? "Update Exam" : "Save Exam"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-100 flex items-end md:items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0  backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
          ></div>

          {/* Popup Card */}
          <div className="relative text-[rgb(var(--text))] bg-[rgb(var(--surface))] w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300">
            <div
              className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-12 ${
                confirmModal.type === "delete"
                  ? "bg-red-50 text-red-500"
                  : "bg-indigo-50 text-indigo-600"
              }`}
            >
              {confirmModal.type === "delete" ? (
                <span className="text-3xl">🗑️</span>
              ) : (
                <span className="text-3xl">💾</span>
              )}
            </div>

            <h3 className="text-2xl font-black  leading-tight">
              {confirmModal.type === "delete"
                ? "Delete Exam?"
                : "Save Changes?"}
            </h3>
            <p className=" text-sm mt-3 px-4">
              {confirmModal.type === "delete"
                ? "This will remove the exam and all associated results permanently."
                : "Are you sure you want to update the exam schedule with these new details?"}
            </p>

            <div className="flex flex-col gap-3 mt-8">
              <button
                onClick={() => executeFinalAction()}
                className={`w-full py-4 text-white font-bold rounded-2xl shadow-xl transition-all active:scale-95 ${
                  confirmModal.type === "delete"
                    ? "bg-red-500"
                    : "text-[rgb(var(--text))] bg-[rgb(var(--primary))]"
                }`}
              >
                {confirmModal.type === "delete"
                  ? "Yes, Delete Permanentally"
                  : "Yes, Confirm Changes"}
              </button>

              <button
                onClick={() =>
                  setConfirmModal({ isOpen: false, type: "", data: null })
                }
                className="w-full py-4 text-[rgb(var(--text))] bg-[rgb(var(--primary))] font-bold rounded-2xl"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExamCreate;
