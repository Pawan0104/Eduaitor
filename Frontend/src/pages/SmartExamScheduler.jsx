import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import {
  FaPlus,
  FaTrash,
  FaBolt,
  FaSave,
  FaPaperPlane,
  FaFileExcel,
  FaPrint,
  FaHistory,
  FaCalendarAlt,
  FaSearch,
  FaTimes,
  FaLightbulb,
  FaExclamationTriangle,
  FaCheckCircle,
} from "react-icons/fa";
import LoadingSpinner from "../components/LoadingSpinner";

const API = import.meta.env.VITE_API_URL;

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (n) => String(n).padStart(2, "0");
const nowObj = new Date();

const isoOf = (d) => {
  const x = d ? new Date(d) : new Date();
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};

const toInput = (d) => {
  if (!d) return "";
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return String(d).slice(0, 10);
  return isoOf(x);
};

const addMins = (time, mins) => {
  const [h, m] = String(time || "09:00").split(":").map(Number);
  const total = (h || 0) * 60 + (m || 0) + Number(mins);
  return `${String(Math.floor((total % 1440) / 60)).padStart(2, "0")}:${String(Math.round(total % 60)).padStart(2, "0")}`;
};

const DURATION_OPTIONS = [30, 45, 60, 90, 120, 150, 180];
const durLabel = (m) => {
  const n = Number(m) || 120;
  if (n % 60 === 0) return n === 60 ? "1 hr" : `${n / 60} hrs`;
  if (n < 60) return `${n} min`;
  return `${Math.floor(n / 60)} hr ${n % 60} min`;
};

const diffMins = (t1, t2) => {
  const [h1, m1] = String(t1 || "09:00").split(":").map(Number);
  const [h2, m2] = String(t2 || "10:00").split(":").map(Number);
  return (h2 || 0) * 60 + (m2 || 0) - ((h1 || 0) * 60 + (m1 || 0));
};

const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const dayName = (d) => DAY_NAMES[new Date(d).getDay()];

const CONFLICT_META = {
  "class-conflict": { label: "Same class, same slot", cls: "bg-rose-100 text-rose-700 border-rose-300" },
  "teacher-conflict": { label: "Invigilator double-booked", cls: "bg-violet-100 text-violet-700 border-violet-300" },
  holiday: { label: "Holiday / Sunday", cls: "bg-red-100 text-red-700 border-red-300" },
  "date-range": { label: "Outside exam window", cls: "bg-amber-100 text-amber-700 border-amber-300" },
};

const statusBadge = (s) =>
  s === "published"
    ? "bg-emerald-100 text-emerald-700"
    : "bg-amber-100 text-amber-700";

/* ── tiny section card ── */
function SectionCard({ step, title, desc, children }) {
  return (
    <div className="bg-[rgb(var(--surface))] rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex items-start gap-3 px-5 pt-5 pb-3 border-b border-gray-100">
        <span className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-[rgb(var(--primary))] text-white text-sm font-bold">
          {step}
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-[rgb(var(--text))]">{title}</h3>
          {desc && <p className="text-xs mt-0.5 text-[rgb(var(--text))] opacity-70">{desc}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ── holiday calendar ── */
function HolidayCalendar({ month, setMonth, selected, onToggle, min, max }) {
  const year = month.getFullYear();
  const monthIdx = month.getMonth();
  const firstDay = new Date(year, monthIdx, 1).getDay();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const todayStr = isoOf();

  const cells = [];
  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(isoOf(new Date(year, monthIdx, d)));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth(addDays(new Date(year, monthIdx, 1), -1))}
          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"
          aria-label="Previous month"
        >
          ‹
        </button>
        <div className="text-sm font-bold text-[rgb(var(--text))]">
          {MONTHS[monthIdx]} {year}
        </div>
        <button
          type="button"
          onClick={() => setMonth(addDays(new Date(year, monthIdx + 1, 1), -1))}
          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"
          aria-label="Next month"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {DAY_NAMES.map((d) => (
          <div key={d} className={`text-[10px] font-semibold py-1 ${d === "Sun" ? "text-red-500" : "text-gray-400"}`}>
            {d}
          </div>
        ))}
        {cells.map((c, i) => {
          if (!c) return <div key={`x${i}`} />;
          const inRange = (!min || c >= min) && (!max || c <= max);
          const isSun = new Date(c).getDay() === 0;
          const isH = selected.has(c);
          return (
            <button
              key={c}
              type="button"
              disabled={!inRange}
              onClick={() => onToggle(c)}
              className={`h-9 rounded-lg text-xs font-semibold transition
                ${isH ? "bg-red-500 text-white" : inRange ? (isSun ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-gray-50 text-[rgb(var(--text))] hover:bg-gray-100") : "bg-transparent text-gray-300 cursor-not-allowed"}
                ${c === todayStr && !isH ? "ring-1 ring-[rgb(var(--primary))]" : ""}`}
            >
              {Number(c.slice(8))}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[...selected].sort().map((h) => (
          <span key={h} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md bg-red-50 text-red-700 border border-red-200">
            {h} <FaTimes className="cursor-pointer" onClick={() => onToggle(h)} />
          </span>
        ))}
        {selected.size === 0 && <span className="text-xs text-[rgb(var(--text))] opacity-60">Click dates inside the window to mark holidays.</span>}
      </div>
    </div>
  );
}

export default function SmartExamScheduler() {
  const [exams, setExams] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [generating, setGenerating] = useState(false);

  /* reference data */
  const [classList, setClassList] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [teacherList, setTeacherList] = useState([]);

  /* form */
  const [form, setForm] = useState({
    examName: "",
    paperSubmissionDeadline: "",
    paperTotalMarks: 80,
    startDate: isoOf(),
    endDate: isoOf(addDays(nowObj, 14)),
    startTime: "09:00",
    endTime: "15:00",
    gapRule: 1,
    autoSundays: true,
  });
  const [holidays, setHolidays] = useState([]);
  const [selClasses, setSelClasses] = useState([]);
  const [selSubjects, setSelSubjects] = useState({}); // classId -> [subjectId]
  const [classDurations, setClassDurations] = useState({}); // classId -> minutes
  const [selTeachers, setSelTeachers] = useState([]);
  const [unavail, setUnavail] = useState({}); // teacherId -> [dates]

  /* results */
  const [rows, setRows] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [score, setScore] = useState(0);
  const [version, setVersion] = useState(1);
  const [status, setStatus] = useState("draft");
  const [versions, setVersions] = useState([]);

  const [holidayMonth, setHolidayMonth] = useState(new Date());
  const [classSearch, setClassSearch] = useState("");
  const syncTimer = useRef(null);

  /* derived */
  const holidaySet = new Set(holidays);
  const conflictByRow = new Map();
  conflicts.forEach((c) => {
    if (typeof c.rowIndex === "number") conflictByRow.set(c.rowIndex, c);
  });

  const byClassSubjects = classList.map((c) => ({
    ...c,
    options: (() => {
      const seen = new Map();
      (c.subjects || []).forEach((s) => seen.set(s.id, s.name));
      allSubjects.forEach((s) => {
        if (!seen.has(s._id)) seen.set(s._id, s.name);
      });
      return [...seen.entries()].map(([id, name]) => ({ subjectId: id, subjectName: name }));
    })(),
  }));

  const selectedRows = byClassSubjects.filter((c) => selClasses.includes(c.id));

  const loadRefs = async () => {
    const [clsRes, subjRes, tchRes] = await Promise.all([
      axios.get(`${API}/classes/all`, { withCredentials: true }),
      axios.get(`${API}/subjects/all`, { withCredentials: true }),
      axios.get(`${API}/teachers`, { withCredentials: true }),
    ]);
    const clsRaw = clsRes.data?.classes || [];
    const classes = clsRaw.map((c) => {
      const seen = new Map();
      (c.details || []).forEach((d) =>
        (d.subjectTeachers || []).forEach((st) => {
          const sid = st.subjectId?._id || st.subjectId;
          const sname = st.subjectId?.name || "";
          if (sid) seen.set(String(sid), sname);
        }),
      );
      return {
        id: String(c._id),
        name: c.name,
        subjects: [...seen.entries()].map(([id, name]) => ({ id, name })),
      };
    });
    const subjects = (subjRes.data?.subjects || []).map((s) => ({ _id: String(s._id), name: s.name }));
    const teachers = (tchRes.data?.data || []).map((t) => ({
      _id: String(t._id),
      fullName: t.fullName,
      subjects: (t.subjects || []).map((s) => String(s._id || s)),
    }));
    setClassList(classes);
    setAllSubjects(subjects);
    setTeacherList(teachers);
  };

  const loadExams = async () => {
    try {
      const res = await axios.get(`${API}/exam-schedule/list`, { withCredentials: true });
      setExams(res.data?.data || []);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to load exam schedules");
    }
  };

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([loadExams(), loadRefs()]);
      } catch (e) {
        toast.error(e.response?.data?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hydrateFromDoc = (doc) => {
    const subMap = {};
    const durMap = {};
    (doc.subjects || []).forEach((s) => {
      const key = String(s.classId);
      if (!subMap[key]) subMap[key] = [];
      if (!subMap[key].includes(String(s.subjectId))) subMap[key].push(String(s.subjectId));
      if (s.durationMinutes) durMap[key] = Number(s.durationMinutes) || 120;
    });
    const uv = {};
    (doc.teacherUnavailable || []).forEach((u) => {
      uv[String(u.teacherId)] = (u.dates || []).map((d) => String(d).slice(0, 10));
    });

    setForm({
      examName: doc.examName,
      paperSubmissionDeadline: doc.paperSubmissionDeadline ? toInput(doc.paperSubmissionDeadline) : "",
      paperTotalMarks: doc.paperTotalMarks || 80,
      startDate: toInput(doc.startDate),
      endDate: toInput(doc.endDate),
      startTime: doc.startTime || "09:00",
      endTime: doc.endTime || "15:00",
      gapRule: Number(doc.gapRule ?? 1),
      autoSundays: doc.autoSundays !== false,
    });
    setHolidays((doc.holidays || []).map((h) => String(h).slice(0, 10)));
    setSelClasses((doc.classes || []).map((c) => String(c)));
    setSelSubjects(subMap);
    setClassDurations(durMap);
    setSelTeachers((doc.teachers || []).map((t) => String(t)));
    setUnavail(uv);
    setRows((doc.schedule || []).map((r) => ({
      date: toInput(r.date),
      classId: String(r.classId),
      className: r.className || "",
      subjectId: String(r.subjectId),
      subjectName: r.subjectName || "",
      teacherId: r.teacherId ? String(r.teacherId) : "",
      teacherName: r.teacherName || "",
      startTime: r.startTime || doc.startTime || "09:00",
      endTime: r.endTime || doc.endTime || "11:00",
    })));
    setConflicts(doc.conflicts || []);
    setSuggestions(doc.suggestions || []);
    setScore(doc.score || 0);
    setVersion(doc.version || 1);
    setStatus(doc.status || "draft");
    setVersions(doc.versions || []);
  };

  const selectExam = async (id) => {
    if (!id) {
      setActiveId("");
      return;
    }
    setActiveId(id);
    try {
      const res = await axios.get(`${API}/exam-schedule/${id}`, { withCredentials: true });
      hydrateFromDoc(res.data?.data);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to load schedule");
    }
  };

  const createExam = async () => {
    if (!form.examName.trim()) {
      toast.warn("Give the exam a name first");
      return;
    }
    try {
      const payload = {
        ...form,
        holidays,
        classes: selClasses,
        subjects: [],
        teachers: selTeachers,
        teacherUnavailable: [],
      };
      const res = await axios.post(`${API}/exam-schedule/create`, payload, { withCredentials: true });
      toast.success("Exam schedule created — configure classes & subjects, then Generate Schedule");
      setActiveId(res.data.data._id);
      hydrateFromDoc(res.data.data);
      await loadExams();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to create");
    }
  };

  const saveForm = async () => {
    if (!activeId) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        holidays,
        classes: selClasses,
        subjects: selectedRows.flatMap((c) =>
          (selSubjects[c.id] || []).map((sid) => {
            const s = c.options.find((o) => o.subjectId === sid);
            return {
              classId: c.id,
              className: c.name,
              subjectId: sid,
              subjectName: s?.subjectName || "",
              durationMinutes: classDurations[c.id] || 120,
            };
          }),
        ),
        teachers: selTeachers,
        teacherUnavailable: Object.entries(unavail)
          .filter(([, d]) => d.length)
          .map(([tid, dates]) => ({ teacherId: tid, dates })),
      };
      const res = await axios.put(`${API}/exam-schedule/edit/${activeId}`, payload, { withCredentials: true });
      hydrateFromDoc(res.data.data);
      await loadExams();
      toast.success("Draft saved");
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const buildGeneratePayload = () => ({
    ...form,
    holidays,
    classes: selectedRows
      .filter((c) => (selSubjects[c.id] || []).length)
      .map((c) => ({
        classId: c.id,
        className: c.name,
        durationMinutes: classDurations[c.id] || 120,
        subjects: (selSubjects[c.id] || []).map((sid) => {
          const s = c.options.find((o) => o.subjectId === sid);
          return { subjectId: sid, subjectName: s?.subjectName || "" };
        }),
      })),
    teachers: selTeachers,
    teacherUnavailable: Object.entries(unavail)
      .filter(([, d]) => d.length)
      .map(([tid, dates]) => ({ teacherId: tid, dates })),
  });

  const generate = async () => {
    if (!activeId) return;
    if (!selectedRows.some((c) => (selSubjects[c.id] || []).length)) {
      toast.warn("Select at least one class with subjects before generating");
      return;
    }
    setGenerating(true);
    try {
      const res = await axios.post(`${API}/exam-schedule/${activeId}/generate`, buildGeneratePayload(), { withCredentials: true });
      hydrateFromDoc(res.data.data);
      const warns = res.data.warnings || [];
      if (warns.length) {
        Swal.fire({ icon: "warning", title: "Schedule generated with warnings", text: warns.join("\n\n"), confirmButtonColor: "#f59e0b" });
      } else {
        Swal.fire({
          icon: "success",
          title: "Schedule generated",
          html: `Quality score <b>${res.data.data.score}/100</b>. Review the timetable below, fix any red rows, then publish.`,
          confirmButtonColor: "#10b981",
        });
      }
      await loadExams();
    } catch (e) {
      toast.error(e.response?.data?.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const syncRows = () => {
    if (!activeId) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      setSyncing(true);
      try {
        const res = await axios.post(
          `${API}/exam-schedule/${activeId}/edit-rows`,
          { schedule: rows },
          { withCredentials: true },
        );
        setConflicts(res.data.data.conflicts || []);
        setScore(res.data.data.score || 0);
        setStatus(res.data.data.status || "draft");
      } catch (e) {
        toast.error(e.response?.data?.message || "Conflict check failed");
      } finally {
        setSyncing(false);
      }
    }, 700);
  };

  /* keep server conflict/score fresh whenever rows change */
  useEffect(() => {
    syncRows();
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const updateRow = (i, patch) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const removeRow = (i) => {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  };

  const addRow = () => {
    const firstClass = selectedRows.find((c) => (selSubjects[c.id] || []).length);
    if (!firstClass) {
      toast.warn("Pick a class with subjects first");
      return;
    }
    const sid = (selSubjects[firstClass.id] || [])[0];
    const subOpt = firstClass.options.find((o) => o.subjectId === sid);
    const lastRow = rows[rows.length - 1];
    const dur = classDurations[firstClass.id] || 120;
    setRows((prev) => [
      ...prev,
      {
        date: toInput(lastRow?.date || form.startDate),
        classId: firstClass.id,
        className: firstClass.name,
        subjectId: sid,
        subjectName: subOpt?.subjectName || "",
        teacherId: "",
        teacherName: "",
        startTime: form.startTime,
        endTime: addMins(form.startTime, dur),
      },
    ]);
  };

  const publish = async () => {
    if (!activeId) return;
    const confirm = await Swal.fire({
      icon: "question",
      title: "Publish schedule?",
      text: versions.some((v) => v.status === "published")
        ? `This creates a new published version (v${version + 1}). Students & parents will see the final timetable.`
        : "The published timetable will be visible to teachers, students and parents once shared.",
      showCancelButton: true,
      confirmButtonText: "Publish",
      confirmButtonColor: "#10b981",
      cancelButtonText: "Keep draft",
    });
    if (!confirm.isConfirmed) return;
    try {
      const res = await axios.post(`${API}/exam-schedule/${activeId}/publish`, {}, { withCredentials: true });
      hydrateFromDoc(res.data.data);
      toast.success("Schedule published");
      await loadExams();
    } catch (e) {
      toast.error(e.response?.data?.message || "Publish failed");
    }
  };

  const restore = async (v) => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: `Restore version ${v}?`,
      text: "The current schedule will be archived and version " + v + " becomes active.",
      showCancelButton: true,
      confirmButtonText: "Restore",
      confirmButtonColor: "#6366f1",
      cancelButtonText: "Cancel",
    });
    if (!confirm.isConfirmed) return;
    try {
      const res = await axios.post(`${API}/exam-schedule/${activeId}/restore/${v}`, {}, { withCredentials: true });
      hydrateFromDoc(res.data.data);
      toast.success(`Restored version ${v}`);
      await loadExams();
    } catch (e) {
      toast.error(e.response?.data?.message || "Restore failed");
    }
  };

  const removeExam = async () => {
    if (!activeId) return;
    const confirm = await Swal.fire({
      icon: "error",
      title: "Delete this exam schedule?",
      text: "This cannot be undone.",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#ef4444",
      cancelButtonText: "Cancel",
    });
    if (!confirm.isConfirmed) return;
    try {
      await axios.delete(`${API}/exam-schedule/${activeId}`, { withCredentials: true });
      toast.success("Deleted");
      setActiveId("");
      setRows([]);
      setConflicts([]);
      setScore(0);
      await loadExams();
    } catch (e) {
      toast.error(e.response?.data?.message || "Delete failed");
    }
  };

  const exportExcel = () => {
    if (!rows.length) {
      toast.warn("Nothing to export yet — generate a schedule first");
      return;
    }
    const rowsData = [...rows].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).map((r) => ({
      Date: r.date,
      Day: dayName(r.date),
      Class: r.className,
      Subject: r.subjectName,
      Invigilator: r.teacherName || "— unassigned —",
      Time: `${r.startTime || ""} – ${r.endTime || ""}`,
    }));
    const conflictData = conflicts.map((c) => ({ Type: c.type, Message: c.message }));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(rowsData);
    ws1["!cols"] = [{ wch: 12 }, { wch: 6 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Timetable");
    if (conflictData.length) {
      const ws2 = XLSX.utils.json_to_sheet(conflictData);
      XLSX.utils.book_append_sheet(wb, ws2, "Conflicts");
    }
    const name = form.examName.replace(/[^\w\d\s-]/g, "").trim() || "Exam";
    XLSX.writeFile(wb, `${name}.xlsx`);
    toast.success("Excel exported");
  };

  const exportPdf = () => {
    if (!rows.length) {
      toast.warn("Nothing to export yet — generate a schedule first");
      return;
    }
    const conflictIdx = new Set(conflicts.filter((c) => typeof c.rowIndex === "number").map((c) => c.rowIndex));
    const sorted = [...rows].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).map((r) => ({
      date: r.date,
      day: dayName(r.date),
      className: r.className,
      subjectName: r.subjectName,
      teacherName: r.teacherName || "—",
      time: `${r.startTime || ""} – ${r.endTime || ""}`,
      conflict: conflictIdx.has(rows.indexOf(r)),
    }));
    const w = window.open("", "_blank", "width=1000,height=700");
    if (!w) {
      toast.error("Popup blocked — allow popups and retry");
      return;
    }
    w.document.write(`
      <html><head><title>${form.examName}</title>
      <style>
        * { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
        body { padding: 32px; color: #111827; }
        h1 { font-size: 22px; margin: 0; }
        .sub { color: #6b7280; font-size: 13px; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
        th, td { border: 1px solid #d1d5db; padding: 8px 10px; text-align: left; }
        th { background: #f3f4f6; }
        tr.conflict td { background: #fee2e2; color: #b91c1c; }
        .score { margin-top: 16px; font-size: 13px; }
        .conf-war { margin-top: 14px; font-size: 12px; color: #b91c1c; }
        .conf-war ul { margin: 6px 0 0 18px; }
        .foot { margin-top: 28px; font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 10px; }
      </style></head><body>
        <h1>${form.examName}</h1>
        <div class="sub">${form.startDate} → ${form.endDate} &nbsp;•&nbsp; Gap rule: ${form.gapRule} &nbsp;•&nbsp; Quality score: ${score}/100 &nbsp;•&nbsp; Version ${version}</div>
        ${conflicts.length ? `<div class="conf-war">Conflict Detected — ${conflicts.length} issue(s):<ul>${conflicts.map((c) => `<li>${c.message}</li>`).join("")}</ul></div>` : ""}
        <table>
          <thead><tr><th>Date</th><th>Day</th><th>Class</th><th>Subject</th><th>Invigilator</th><th>Time</th></tr></thead>
          <tbody>
            ${sorted.map((r) => `<tr${r.conflict ? ' class="conflict"' : ""}><td>${r.date}</td><td>${r.day}</td><td>${r.className}</td><td>${r.subjectName}</td><td>${r.teacherName}</td><td>${r.time}</td></tr>`).join("")}
          </tbody>
        </table>
        <div class="foot">Generated with Smart Exam Scheduler • Bright Children Academy</div>
        <script>window.onload = () => { window.focus(); setTimeout(() => window.print(), 300); };</script>
      </body></html>
    `);
    w.document.close();
  };

  const toggleHoliday = (d) => {
    setHolidays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const markAllSundays = () => {
    const out = new Set(holidays);
    let cur = new Date(form.startDate);
    const end = new Date(form.endDate);
    while (cur <= end) {
      if (cur.getDay() === 0) out.add(isoOf(cur));
      cur = addDays(cur, 1);
    }
    setHolidays([...out]);
    toast.success("Sundays marked as holidays within the exam window");
  };

  const toggleClass = (id) => {
    setSelClasses((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      return next;
    });
    setSelSubjects((prev) => {
      const nv = { ...prev };
      if (prev[id]) delete nv[id];
      return nv;
    });
  };

  const toggleSubForClass = (classId, sid) => {
    setSelSubjects((prev) => {
      const cur = prev[classId] || [];
      return { ...prev, [classId]: cur.includes(sid) ? cur.filter((x) => x !== sid) : [...cur, sid] };
    });
  };

  const toggleTeacher = (tid) => {
    setSelTeachers((prev) => {
      const next = prev.includes(tid) ? prev.filter((x) => x !== tid) : [...prev, tid];
      return next;
    });
    setUnavail((prev) => {
      const nv = { ...prev };
      delete nv[tid];
      return nv;
    });
  };

  const addUnavailable = (tid, date) => {
    if (!date) return;
    setUnavail((prev) => {
      const cur = prev[tid] || [];
      if (cur.includes(date)) return prev;
      return { ...prev, [tid]: [...cur, date] };
    });
    toast.success("Teacher marked unavailable for that day");
  };

  const filteredClasses = byClassSubjects.filter((c) =>
    c.name.toLowerCase().includes(classSearch.toLowerCase()),
  );

  const isEditing = Boolean(activeId);
  const teacherName = (tid) => teacherList.find((t) => t._id === tid)?.fullName || tid;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[rgb(var(--text))]">Smart Exam Scheduler</h1>
          <p className="text-sm text-[rgb(var(--text))] mt-0.5 opacity-70">
            Conflict-free examination timetables — generated, editable, versioned.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isEditing && (
            <>
              <button type="button" onClick={removeExam} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition">
                <FaTrash /> Delete
              </button>
              <button type="button" onClick={publish} disabled={status === "published"} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-40 transition">
                <FaPaperPlane /> Publish
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              setActiveId("");
              setForm({ ...form, examName: "" });
            }}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-[rgb(var(--primary))] text-white transition"
          >
            <FaPlus /> New Exam
          </button>
        </div>
      </div>

      {/* exam selector / empty state */}
      {!isEditing ? (
        <div className="bg-[rgb(var(--surface))] rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold mb-1.5 text-[rgb(var(--text))]">Existing schedules</label>
              <select
                value=""
                onChange={(e) => selectExam(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-[rgb(var(--text))] bg-[rgb(var(--surface))] focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
              >
                <option value="" disabled>
                  {exams.length ? "Select a schedule…" : "No schedules yet — create one below"}
                </option>
                {exams.map((x) => (
                  <option key={x._id} value={x._id}>
                    {x.examName} · {toInput(x.startDate)} → {toInput(x.endDate)} · {x.status}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold mb-1.5 text-[rgb(var(--text))]">Create new exam</label>
              <div className="flex gap-2">
                <input
                  value={form.examName}
                  onChange={(e) => setForm((f) => ({ ...f, examName: e.target.value }))}
                  placeholder="e.g. Final Examination 2026"
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition bg-[rgb(var(--surface))] text-[rgb(var(--text))]"
                />
                <button
                  type="button"
                  onClick={createExam}
                  className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl bg-[rgb(var(--primary))] text-white transition"
                >
                  <FaPlus /> Create
                </button>
              </div>
            </div>
          </div>
          {exams.map((x) => (
            <button
              key={x._id}
              type="button"
              onClick={() => selectExam(x._id)}
              className="w-full mt-3 flex items-center justify-between gap-2 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/40 p-3 text-left transition"
            >
              <div className="min-w-0">
                <div className="font-bold text-sm truncate">{x.examName}</div>
                <div className="text-xs text-[rgb(var(--text))] opacity-70">
                  {toInput(x.startDate)} → {toInput(x.endDate)} · v{x.version} · {x.schedule.length} rows
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusBadge(x.status)}`}>{x.status}</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          {/* top summary strip */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-[rgb(var(--surface))] rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide opacity-60">Score</div>
              <div className={`text-xl font-bold mt-1 ${score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-500" : "text-red-500"}`}>
                {score}/100
              </div>
            </div>
            <div className="bg-[rgb(var(--surface))] rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide opacity-60">Rows</div>
              <div className="text-xl font-bold mt-1">{rows.length}</div>
            </div>
            <div className="bg-[rgb(var(--surface))] rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide opacity-60">Conflicts</div>
              <div className={`text-xl font-bold mt-1 ${conflicts.length ? "text-red-500" : "text-emerald-600"}`}>{conflicts.length}</div>
            </div>
            <div className="bg-[rgb(var(--surface))] rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide opacity-60">Version</div>
              <div className="text-xl font-bold mt-1">v{version}</div>
            </div>
            <div className="bg-[rgb(var(--surface))] rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide opacity-60">Status</div>
              <div className={`text-sm font-bold mt-1.5 ${status === "published" ? "text-emerald-600" : "text-amber-500"}`}>{status}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => selectExam("")}
            className="text-xs font-semibold text-[rgb(var(--primary))] hover:underline"
          >
            ‹ Back to all schedules
          </button>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* STEP 1 */}
            <SectionCard step={1} title="Exam Setup" desc="Name, dates and holidays">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-[rgb(var(--text))]">Exam Name</label>
                  <input
                    value={form.examName}
                    onChange={(e) => setForm((f) => ({ ...f, examName: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition bg-[rgb(var(--surface))] text-[rgb(var(--text))]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-[rgb(var(--text))]">Paper Submission Deadline</label>
                    <input
                      type="date"
                      value={form.paperSubmissionDeadline}
                      max={form.startDate}
                      onChange={(e) => setForm((f) => ({ ...f, paperSubmissionDeadline: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition bg-[rgb(var(--surface))] text-[rgb(var(--text))]"
                    />
                    <p className="text-[11px] opacity-60 mt-1">Last date teachers can submit papers for review (before the exam).</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-[rgb(var(--text))]">Paper Total Marks</label>
                    <input
                      type="number"
                      min="10"
                      max="500"
                      value={form.paperTotalMarks}
                      onChange={(e) => setForm((f) => ({ ...f, paperTotalMarks: Number(e.target.value) }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition bg-[rgb(var(--surface))] text-[rgb(var(--text))]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-[rgb(var(--text))]">Start Date</label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition bg-[rgb(var(--surface))] text-[rgb(var(--text))]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-[rgb(var(--text))]">End Date</label>
                    <input
                      type="date"
                      value={form.endDate}
                      min={form.startDate}
                      onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition bg-[rgb(var(--surface))] text-[rgb(var(--text))]"
                    />
                  </div>
                </div>
                {form.endDate && form.startDate && form.endDate <= form.startDate && (
                  <p className="text-xs font-medium text-red-600">End date must be greater than start date.</p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-[rgb(var(--text))]">Start Time</label>
                    <input
                      type="time"
                      value={form.startTime}
                      onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition bg-[rgb(var(--surface))] text-[rgb(var(--text))]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-[rgb(var(--text))]">End Time</label>
                    <input
                      type="time"
                      value={form.endTime}
                      onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition bg-[rgb(var(--surface))] text-[rgb(var(--text))]"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-[rgb(var(--text))] opacity-60">
                  Start/End time define the <b>daily window</b>. Multiple classes sit exams in parallel slots from the
                  Start Time — each with its own invigilator — until the window ends. Exams are packed as early as
                  possible and never run past the End Date.
                </p>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[rgb(var(--text))] flex items-center gap-1.5">
                      <FaCalendarAlt /> Holiday Calendar
                    </label>
                    <button type="button" onClick={markAllSundays} className="text-[11px] font-semibold text-[rgb(var(--primary))] hover:underline">
                      Mark all Sundays
                    </button>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-3">
                    <HolidayCalendar
                      month={holidayMonth}
                      setMonth={setHolidayMonth}
                      selected={holidaySet}
                      onToggle={toggleHoliday}
                      min={form.startDate}
                      max={form.endDate}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, gapRule: g }))}
                      className={`rounded-xl border px-2 py-3 text-center transition ${form.gapRule === g ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary))]/5 text-[rgb(var(--text))]" : "border-gray-200 text-[rgb(var(--text))] hover:border-indigo-200"}`}
                    >
                      <div className="text-xs font-bold">{g === 0 ? "No Gap" : `${g} Day Gap`}</div>
                      <div className="text-[10px] opacity-60 mt-0.5">{g === 0 ? "Consecutive days" : g === 1 ? "Alternate days" : "Two days apart"}</div>
                    </button>
                  ))}
                </div>
              </div>
            </SectionCard>

            {/* STEP 2 + 3 */}
            <div className="space-y-6">
              <SectionCard step={2} title="Classes" desc="Multi-select which classes sit this exam">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="relative flex-1">
                      <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                      <input
                        value={classSearch}
                        onChange={(e) => setClassSearch(e.target.value)}
                        placeholder="Search classes…"
                        className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition bg-[rgb(var(--surface))] text-[rgb(var(--text))]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (selClasses.length === byClassSubjects.length) {
                          setSelClasses([]);
                          setSelSubjects({});
                        } else {
                          setSelClasses(byClassSubjects.map((c) => c.id));
                          setSelSubjects((prev) => {
                            const nv = { ...prev };
                            byClassSubjects.forEach((c) => {
                              if (!nv[c.id]) nv[c.id] = (c.subjects || []).map((s) => s.id);
                            });
                            return nv;
                          });
                        }
                      }}
                      className="text-[11px] font-semibold px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-[rgb(var(--text))] transition"
                    >
                      {selClasses.length === byClassSubjects.length ? "Clear all" : "Select all"}
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                    {filteredClasses.map((c) => {
                      const checked = selClasses.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition ${checked ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary))]/5" : "border-gray-100 hover:border-gray-200"}`}
                        >
                          <input type="checkbox" checked={checked} onChange={() => toggleClass(c.id)} className="accent-[rgb(var(--primary))]" />
                          <span className="text-sm font-semibold flex-1">{c.name}</span>
                          <span className="text-[11px] opacity-60">{c.subjects.length} subjects</span>
                        </label>
                      );
                    })}
                    {filteredClasses.length === 0 && (
                      <div className="text-xs text-[rgb(var(--text))] opacity-60 text-center py-6">No classes match “{classSearch}”.</div>
                    )}
                  </div>
                </div>
              </SectionCard>

              <SectionCard step={3} title="Subjects & Duration" desc="Tick subjects to include; set a different exam duration per class (e.g. Class 1 = 1 hr, Class 4 = 2 hrs)">
                {selectedRows.length === 0 ? (
                  <p className="text-xs text-[rgb(var(--text))] opacity-60">Select at least one class to see its subjects.</p>
                ) : (
                  <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                    {selectedRows.map((c) => {
                      const cur = selSubjects[c.id] || [];
                      const checkedAll = c.options.length > 0 && cur.length === c.options.length;
                      return (
                        <div key={c.id} className="rounded-xl border border-gray-100 p-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                            <span className="text-sm font-bold">{c.name}</span>
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[rgb(var(--text))]">
                                Exam duration
                                <select
                                  value={classDurations[c.id] || 120}
                                  onChange={(e) =>
                                    setClassDurations((prev) => ({ ...prev, [c.id]: Number(e.target.value) }))
                                  }
                                  className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                >
                                  {DURATION_OPTIONS.map((m) => (
                                    <option key={m} value={m}>{durLabel(m)}</option>
                                  ))}
                                </select>
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelSubjects((prev) => ({
                                    ...prev,
                                    [c.id]: checkedAll ? [] : c.options.map((o) => o.subjectId),
                                  }));
                                }}
                                className="text-[11px] font-semibold text-[rgb(var(--primary))] hover:underline"
                              >
                                {checkedAll ? "Select none" : "Select all"}
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {c.options.map((o) => {
                              const on = cur.includes(o.subjectId);
                              return (
                                <button
                                  key={o.subjectId}
                                  type="button"
                                  onClick={() => toggleSubForClass(c.id, o.subjectId)}
                                  className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition ${on ? "bg-[rgb(var(--primary))] border-[rgb(var(--primary))] text-white" : "bg-gray-50 border-gray-200 text-[rgb(var(--text))] hover:bg-gray-100"}`}
                                >
                                  <FaCheckCircle className={on ? "inline mb-0.5 mr-1" : "hidden"} />
                                  {o.subjectName}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>
            </div>
          </div>

          {/* STEP 4 */}
          <SectionCard step={4} title="Teachers / Invigilators" desc="Choose the pool of invigilators and mark their unavailable dates">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[rgb(var(--text))]">{selTeachers.length} of {teacherList.length} teachers selected</span>
                <button
                  type="button"
                  onClick={() => {
                    if (selTeachers.length === teacherList.length) {
                      setSelTeachers([]);
                      setUnavail({});
                    } else {
                      setSelTeachers(teacherList.map((t) => t._id));
                    }
                  }}
                  className="text-[11px] font-semibold text-[rgb(var(--primary))] hover:underline"
                >
                  {selTeachers.length === teacherList.length ? "Clear all" : "Select all teachers"}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                {teacherList.map((t) => {
                  const checked = selTeachers.includes(t._id);
                  return (
                    <div
                      key={t._id}
                      className={`rounded-xl border p-3 transition ${checked ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary))]/5" : "border-gray-100 hover:border-gray-200"}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input type="checkbox" checked={checked} onChange={() => toggleTeacher(t._id)} className="accent-[rgb(var(--primary))]" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold truncate">{t.fullName}</div>
                          <div className="text-[11px] opacity-60 truncate">{t.subjects.length ? `${t.subjects.length} subjects` : "No subjects mapped"}</div>
                        </div>
                      </div>
                      {checked && (
                        <div className="mt-2 pl-7">
                          <div className="flex gap-1.5">
                            <input
                              type="date"
                              min={form.startDate}
                              max={form.endDate}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  addUnavailable(t._id, e.target.value);
                                  e.target.value = "";
                                }
                              }}
                              placeholder="Unavailable date"
                              className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-[rgb(var(--surface))] text-[rgb(var(--text))]"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                const input = e.currentTarget.previousSibling;
                                addUnavailable(t._id, input.value);
                                input.value = "";
                              }}
                              className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
                            >
                              + Unavailable
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {(unavail[t._id] || []).map((d) => (
                              <span key={d} className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">
                                {d}
                                <FaTimes
                                  className="cursor-pointer"
                                  onClick={() =>
                                    setUnavail((prev) => {
                                      const nv = { ...prev };
                                      nv[t._id] = (nv[t._id] || []).filter((x) => x !== d);
                                      if (!nv[t._id].length) delete nv[t._id];
                                      return nv;
                                    })
                                  }
                                />
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {teacherList.length === 0 && <p className="text-xs text-[rgb(var(--text))] opacity-60">No teachers found for this school.</p>}
              </div>
            </div>
          </SectionCard>

          {/* action bar */}
          <div className="flex flex-wrap items-center gap-2 bg-[rgb(var(--surface))] rounded-2xl border border-gray-100 shadow-sm p-4">
            <button type="button" onClick={generate} disabled={generating} className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl bg-[rgb(var(--primary))] text-white hover:opacity-90 disabled:opacity-50 transition">
              {generating ? <LoadingSpinner size="sm" inline /> : <FaBolt />}
              {generating ? "Optimizing…" : "Generate Schedule"}
            </button>
            <button type="button" onClick={saveForm} disabled={saving} className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-[rgb(var(--text))] disabled:opacity-50 transition">
              <FaSave /> {saving ? "Saving…" : "Save Draft"}
            </button>
            <button type="button" onClick={exportExcel} className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition">
              <FaFileExcel /> Export Excel
            </button>
            <button type="button" onClick={exportPdf} className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 transition">
              <FaPrint /> Export PDF / Print
            </button>
            <div className="flex-1" />
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${syncing ? "bg-gray-100 text-[rgb(var(--text))] opacity-70" : "invisible"}`}>
              {syncing ? "Checking conflicts…" : "·"}
            </span>
          </div>

          {/* STEP 5/6 result table */}
          <SectionCard step={5} title="Generated Timetable" desc="Click a cell to edit inline — conflicts are re-checked automatically">
            {rows.length === 0 ? (
              <div className="text-center py-10">
                <FaHistory className="mx-auto text-3xl text-gray-300 mb-3" />
                <p className="text-sm text-[rgb(var(--text))] opacity-60">
                  No timetable yet. Configure the steps above, then hit <b>Generate Schedule</b>.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto -mx-5 px-5">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
                        <th className="py-2 pr-2">Date</th>
                        <th className="py-2 pr-2">Class</th>
                        <th className="py-2 pr-2">Subject</th>
                        <th className="py-2 pr-2">Invigilator</th>
                        <th className="py-2 pr-2">Time</th>
                        <th className="py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => {
                        const conflict = conflictByRow.get(i);
                        const clsOpts = byClassSubjects.find((c) => c.id === r.classId);
                        const subOpts = (clsOpts?.options || []).filter((o) => (selSubjects[r.classId] || []).includes(o.subjectId));
                        const rowDateKey = r.date;
                        return (
                          <tr
                            key={`${r.date}-${r.classId}-${r.subjectId}-${i}`}
                            className={`border-t transition ${conflict ? "bg-red-50" : i % 2 ? "bg-transparent" : "bg-gray-50/60"}`}
                          >
                            <td className="py-2 pr-2">
                              <input
                                type="date"
                                value={rowDateKey}
                                min={form.startDate}
                                max={form.endDate}
                                onChange={(e) => updateRow(i, { date: e.target.value })}
                                className={`w-[130px] rounded-lg border px-2 py-1.5 text-xs focus:outline-none focus:ring-2 transition ${conflict ? "border-red-300 bg-white" : "border-gray-200 bg-[rgb(var(--surface))] text-[rgb(var(--text))]"}`}
                              />
                              <div className="text-[10px] opacity-60 mt-0.5">{rowDateKey ? dayName(rowDateKey) : "—"}</div>
                            </td>
                            <td className="py-2 pr-2">
                              <select
                                value={r.classId}
                                onChange={(e) => {
                                  const nc = byClassSubjects.find((c) => c.id === e.target.value);
                                  const dur = classDurations[nc.id] || 120;
                                  updateRow(i, {
                                    classId: nc.id,
                                    className: nc.name,
                                    subjectId: (selSubjects[nc.id] || [])[0] || "",
                                    subjectName: "",
                                    endTime: addMins(r.startTime || form.startTime, dur),
                                  });
                                }}
                                className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none focus:ring-2"
                              >
                                {selectedRows.map((c) => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 pr-2">
                              <select
                                value={r.subjectId}
                                onChange={(e) => {
                                  const subOpt = byClassSubjects.find((c) => c.id === r.classId)?.options.find((o) => o.subjectId === e.target.value);
                                  updateRow(i, { subjectId: e.target.value, subjectName: subOpt?.subjectName || "" });
                                }}
                                className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none focus:ring-2"
                              >
                                {(subOpts.length ? subOpts : clsOpts?.options || []).map((o) => (
                                  <option key={o.subjectId} value={o.subjectId}>{o.subjectName}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 pr-2">
                              <select
                                value={r.teacherId}
                                onChange={(e) => {
                                  const tid = e.target.value;
                                  updateRow(i, { teacherId: tid, teacherName: tid ? teacherName(tid) : "" });
                                }}
                                className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none focus:ring-2"
                              >
                                <option value="">— unassigned —</option>
                                {selTeachers.map((tid) => (
                                  <option key={tid} value={tid}>{teacherName(tid)}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 pr-2 text-xs whitespace-nowrap text-[rgb(var(--text))]">
                              {r.startTime || form.startTime} – {r.endTime || form.endTime}
                              <span className="opacity-60"> · {durLabel(diffMins(r.startTime || form.startTime, r.endTime || form.endTime))}</span>
                            </td>
                            <td className="py-2">
                              <button type="button" onClick={() => removeRow(i)} className="w-7 h-7 rounded-lg hover:bg-red-100 text-red-500 flex items-center justify-center">
                                <FaTrash className="text-[10px]" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <button type="button" onClick={addRow} className="mt-3 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-[rgb(var(--text))] transition">
                  <FaPlus /> Add row
                </button>

                {conflicts.length > 0 && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-red-600 mb-2">
                      <FaExclamationTriangle /> Conflict Detected
                    </div>
                    <ul className="space-y-1">
                      {conflicts.map((c, i) => (
                        <li key={i} className="text-xs text-red-600">
                          {c.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </SectionCard>

          {/* suggestions + versions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard step={6} title="Optimization & Suggestions" desc="Quality score and AI-style recommendations">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold">Schedule Quality Score</span>
                  <span className="text-sm font-bold">{score}/100</span>
                </div>
                <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-400" : "bg-red-500"}`}
                    style={{ width: `${score}%` }}
                  />
                </div>
                <p className="text-[11px] opacity-60 mt-1">
                  Based on difficult-subject spacing, language distribution, teacher workload balance, gap consistency and conflict count.
                </p>
              </div>
              <div className="space-y-2">
                {suggestions.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-50/50 p-2.5 text-xs text-indigo-700">
                    <FaLightbulb className="mt-0.5 shrink-0" />
                    <span>{s}</span>
                  </div>
                ))}
                {suggestions.length === 0 && rows.length > 0 && (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-2.5 text-xs text-emerald-700">
                    <FaCheckCircle /> No suggestions — this schedule looks clean.
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard step={7} title="Version History" desc="Every generation & publish is snapshotted — restore any version">
              {versions.length === 0 ? (
                <p className="text-xs text-[rgb(var(--text))] opacity-60">No older versions yet. Each <b>Generate</b> or <b>Publish</b> archives the current one here.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {[...versions].reverse().map((v) => (
                    <div key={v.version} className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 p-3">
                      <div className="min-w-0">
                        <div className="text-sm font-bold">Version {v.version}</div>
                        <div className="text-[11px] opacity-60">
                          {v.schedule?.length || 0} rows · score {v.score} · {new Date(v.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusBadge(v.status)}`}>{v.status}</span>
                        <button type="button" onClick={() => restore(v.version)} className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition">
                          Restore
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}