import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import LoadingSpinner from "../components/LoadingSpinner";
import NewClassModal from "../components/NewClassModal";
import AcademicHeaderActions from "../components/AcademicHeaderActions";

const API = import.meta.env.VITE_API_URL;

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
);
const PenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 21h8"></path><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"></path></svg>
);
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
);
const BriefcaseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path><rect width="20" height="14" x="2" y="6" rx="2"></rect></svg>
);
const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>
);
const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><path d="M16 3.128a4 4 0 0 1 0 7.744"></path><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><circle cx="9" cy="7" r="4"></circle></svg>
);
const ArrowRight = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
);
const ArrowLeft = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path></svg>
);

export default function TeachersAssignment() {
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [scopeFilter, setScopeFilter] = useState("ALL");
  const [copyFrom, setCopyFrom] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newClassOpen, setNewClassOpen] = useState(false);

  // Class & Subject teacher assignments kept as a local draft
  const [classTeacherByDetail, setClassTeacherByDetail] = useState({});
  const [subjectTeacherByDetail, setSubjectTeacherByDetail] = useState({});

  // Rename / Delete class modals
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameClass, setRenameClass] = useState(null);
  const [renameName, setRenameName] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteClass, setDeleteClass] = useState(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [clsRes, secRes, subRes, tchRes, stfRes] = await Promise.all([
        axios.get(`${API}/classes/all`, { withCredentials: true }),
        axios.get(`${API}/sections/all`, { withCredentials: true }),
        axios.get(`${API}/subjects/all`, { withCredentials: true }),
        axios.get(`${API}/teachers`, { withCredentials: true }),
        axios.get(`${API}/staff`, { withCredentials: true }).catch(() => ({ data: {} })),
      ]);
      const cls = clsRes.data.classes || clsRes.data.data || [];
      setClasses(cls);
      setSections(secRes.data.sections || secRes.data.data || []);
      setSubjects(subRes.data.subjects || subRes.data.data || []);
      setTeachers(tchRes.data.data || tchRes.data.teachers || []);
      setStaff(stfRes.data.staff || stfRes.data.data || stfRes.data.staffs || []);
      if (cls.length && !selectedClassId) setSelectedClassId(cls[0]._id);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const selectedClass = classes.find((c) => c._id === selectedClassId);

  const detailsForClass = (cls) =>
    (cls?.details || []).map((d) => {
      const sec = sections.find((s) => s._id === (d.sectionId?._id || d.sectionId));
      return { ...d, sectionName: sec?.name || sec?.sectionName || "Section" };
    });

  const secList = detailsForClass(selectedClass);

  useEffect(() => {
    if (secList.length && !secList.some((d) => String(d._id || d.sectionId?._id || d.sectionId) === String(selectedSectionId))) {
      const first = secList[0];
      setSelectedSectionId(String(first._id || first.sectionId?._id || first.sectionId || ""));
    }
  }, [selectedClassId, secList.length]);

  const detailKey = (d) => String(d?._id || d?.sectionId?._id || d?.sectionId || "");
  const activeDetail = secList.find((d) => detailKey(d) === String(selectedSectionId)) || secList[0];

  const teacherLabel = (t) => {
    const designation = t?.designation ? ` (${t.designation})` : "";
    return `${t?.fullName || t?.name || "Unknown"}${designation}`;
  };
  const teacherId = (t) => String(t?._id || "");

  const teacherOptions = [
    ...teachers.map((t) => ({ ...t, _label: teacherLabel(t) })),
    ...staff.filter((s) => s.staffRole === "teacher" || s.staffRole === "principal" || s.staffRole === "administrator").map((s) => ({ ...s, _label: `${s.fullName || s.name || "Unknown"}${s.designation || s.staffRoleCustom ? ` (${s.designation || s.staffRoleCustom})` : ""}` })),
  ];

  const classSubjects = useMemo(() => {
    const ids = new Set();
    (selectedClass?.details || []).forEach((d) => (d.subjectTeachers || []).forEach((st) => {
      const sid = st.subjectId?._id || st.subjectId;
      if (sid) ids.add(String(sid));
    }));
    let list = subjects.filter((s) => ids.has(String(s._id)));
    if (list.length === 0) list = subjects;
    if (scopeFilter === "Common") return list;
    return list;
  }, [selectedClass, subjects, scopeFilter]);

  const getDetailCT = (d) => {
    const key = detailKey(d);
    if (Object.prototype.hasOwnProperty.call(classTeacherByDetail, key)) return classTeacherByDetail[key];
    return String(d?.teacherId?._id || d?.teacherId || "");
  };

  const getDetailST = (d, subjectId) => {
    const key = `${detailKey(d)}::${subjectId}`;
    if (Object.prototype.hasOwnProperty.call(subjectTeacherByDetail, key)) return subjectTeacherByDetail[key];
    const found = (d?.subjectTeachers || []).find((st) => String(st.subjectId?._id || st.subjectId) === String(subjectId));
    return String(found?.teacherId?._id || found?.teacherId || "");
  };

  const handleClassTeacherChange = (id, value) => {
    setClassTeacherByDetail((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubjectTeacherChange = (id, subjectId, value) => {
    setSubjectTeacherByDetail((prev) => ({ ...prev, [`${id}::${subjectId}`]: value }));
  };

  const handleCopy = () => {
    if (!copyFrom || !activeDetail) return;
    const source = secList.find((d) => detailKey(d) === String(copyFrom));
    if (!source) return;
    const key = detailKey(activeDetail);
    setClassTeacherByDetail((prev) => ({ ...prev, [key]: String(source.teacherId?._id || source.teacherId || "") }));
    const next = { ...subjectTeacherByDetail };
    (selectedClass.details || []).forEach(() => {});
    const sourceMap = {};
    (source.subjectTeachers || []).forEach((st) => {
      const sid = String(st.subjectId?._id || st.subjectId);
      sourceMap[sid] = String(st.teacherId?._id || st.teacherId || "");
    });
    classSubjects.forEach((s) => { next[`${key}::${s._id}`] = sourceMap[String(s._id)] || ""; });
    setSubjectTeacherByDetail(next);
    toast.success(`Teachers copied from ${source.sectionName}.`);
  };

  const saveAssignments = async () => {
    if (!selectedClass || !activeDetail) return;
    setSaving(true);
    try {
      const key = detailKey(activeDetail);
      const updatedDetails = (selectedClass.details || []).map((d) => {
        const dkey = String(d._id || d.sectionId?._id || d.sectionId || "");
        const teacherValue = Object.prototype.hasOwnProperty.call(classTeacherByDetail, dkey)
          ? classTeacherByDetail[dkey]
          : String(d.teacherId?._id || d.teacherId || "");
        const stMap = (d.subjectTeachers || []).map((st) => {
          const sid = String(st.subjectId?._id || st.subjectId);
          const mapKey = `${dkey}::${sid}`;
          const value = Object.prototype.hasOwnProperty.call(subjectTeacherByDetail, mapKey)
            ? subjectTeacherByDetail[mapKey]
            : String(st.teacherId?._id || st.teacherId || "");
          return { subjectId: sid, teacherId: value || null };
        });
        return {
          _id: d._id,
          sectionId: d.sectionId?._id || d.sectionId || null,
          roomNumber: d.roomNumber || "",
          teacherId: teacherValue || null,
          capacity: d.capacity || 40,
          subjectTeachers: stMap,
        };
      });
      await axios.put(`${API}/classes/update/${selectedClass._id}`, {
        name: selectedClass.name,
        status: selectedClass.status || "Active",
        streamIds: (selectedClass.streamIds || []).map((s) => s?._id || s),
        details: updatedDetails,
      }, { withCredentials: true });
      // clear draft for this class detail after successful save
      setClassTeacherByDetail((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setSubjectTeacherByDetail((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => { if (k.startsWith(`${key}::`)) delete next[k]; });
        return next;
      });
      toast.success("Teacher assignments saved successfully!");
      fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save teacher assignments.");
    } finally {
      setSaving(false);
    }
  };

  const go = (key) => {
    if (key === "subjects") window.location.href = "/school/subjects-master";
    else if (key === "classes") window.location.href = "/school/classes-subjects";
    else if (key === "compulsory") window.location.href = "/school/compulsory-subjects";
    else if (key === "optional") window.location.href = "/school/optional-groups";
    else if (key === "flow") window.location.href = "/school/flow-simulator";
  };

  if (loading) return <LoadingSpinner />;

  const tabs = [
    { key: "subjects", title: "Subjects Master", subtitle: "Full-page subject catalog", badge: "book" },
    { key: "classes", title: "Class & Sections", subtitle: "Structure, strength & streams", badge: "check" },
    { key: "compulsory", title: "Compulsory Subjects", subtitle: "Class & Stream fixed", badge: "check" },
    { key: "optional", title: "Optional Groups", subtitle: "Common & Stream electives", badge: "3" },
    { key: "teachers", title: "Teachers Assignment", subtitle: "Class & Subject Teachers", badge: "4", active: true },
    { key: "flow", title: "Flow Simulator", subtitle: "Test Class → Stream → Sec", badge: "eye" },
  ];

  const assignedSubjectsCount = activeDetail
    ? (activeDetail.subjectTeachers || []).filter((st) => {
        const sid = String(st.subjectId?._id || st.subjectId);
        const key = `${detailKey(activeDetail)}::${sid}`;
        const value = Object.prototype.hasOwnProperty.call(subjectTeacherByDetail, key)
          ? subjectTeacherByDetail[key]
          : String(st.teacherId?._id || st.teacherId || "");
        return !!value;
      }).length
    : 0;

  return (
    <>
      <div className="space-y-4 p-6">
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Academic Curriculum &amp; Class Setup</h2>
              <span className="text-xs font-mono text-slate-400">·</span>
              <span className="text-xs font-semibold text-[#4834b8]">Class → Stream (Optional) → Section (Strength) → Subjects → Teachers</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Step-by-step workflow: first create Class with Sections &amp; optional Streams, configure Class &amp; Stream subjects, then assign Class &amp; Subject Teachers from Staff Panel.</p>
          </div>
          <AcademicHeaderActions />
        </div>

        {/* Navbar */}
        <nav aria-label="Academic Setup Steps" className="bg-white border border-slate-200 rounded-xl p-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {tabs.map((tab) => {
            const isActive = !!tab.active;
            const activeCls = isActive ? "bg-[#4834b8] border-[#4834b8] text-white" : "bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100";
            const badgeCls = isActive ? "bg-white text-[#4834b8]" : (tab.badge === "check" ? "bg-emerald-600 text-white" : "bg-white border border-slate-300 text-slate-600");
            return (
              <button key={tab.key} type="button" onClick={() => { if (!isActive) go(tab.key); }} className={`px-3 py-2.5 rounded-lg border text-left transition flex items-start gap-2.5 cursor-pointer ${activeCls}`}>
                <span className={`w-6 h-6 rounded-md text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 ${badgeCls}`}>
                  {tab.badge === "book" && (<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 7v14"></path><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path></svg>)}
                  {tab.badge === "check" && (<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>)}
                  {tab.badge === "eye" && (<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path><circle cx="12" cy="12" r="3"></circle></svg>)}
                  {(tab.badge === "3" || tab.badge === "4") && tab.badge}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {tab.key === "classes" && (<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-85"><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"></path><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"></path><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"></path></svg>)}
                    {tab.key === "compulsory" && (<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-85"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>)}
                    {tab.key === "optional" && (<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-85"><path d="M13 5h8"></path><path d="M13 12h8"></path><path d="M13 19h8"></path><path d="m3 17 2 2 4-4"></path><path d="m3 7 2 2 4-4"></path></svg>)}
                    {tab.key === "teachers" && (<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-85"><path d="m16 11 2 2 4-4"></path><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>)}
                    <span className="text-xs font-bold truncate">{tab.title}</span>
                  </div>
                  <div className={`text-[10.5px] truncate mt-0.5 ${isActive ? "text-indigo-100" : "text-slate-500"}`}>{tab.subtitle}</div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Classes Directory */}
          <aside className="lg:col-span-3 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Classes Directory</h3>
                  <p className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">{classes.length} Active Classes</p>
                </div>
                <button type="button" onClick={() => setNewClassOpen(true)} className="px-2.5 py-1.5 rounded-lg bg-[#4834b8] hover:bg-[#3a289c] text-white text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"><PlusIcon /><span>New Class</span></button>
              </div>
              <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-0.5">
                {classes.map((cls) => (
                  <div key={cls._id} onClick={() => { setSelectedClassId(cls._id); setSelectedSectionId(""); setScopeFilter("ALL"); setClassTeacherByDetail({}); setSubjectTeacherByDetail({}); }} className={`rounded-lg border px-3 py-2 text-xs transition cursor-pointer ${selectedClassId === cls._id ? "bg-indigo-50/90 border-[#4834b8] text-[#4834b8]" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <button type="button" className="flex-1 text-left cursor-pointer min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-slate-900">{cls.name}</span>
                          <span className="text-[10px] font-mono tabular-nums text-slate-500">{cls.details?.reduce((a, d) => a + (d.capacity || 0), 0) || 0} seats</span>
                        </div>
                        <div className="text-[10.5px] text-slate-500 mt-0.5 font-mono tabular-nums truncate">{cls.details?.length || 0} Sec · {(cls.streamIds || []).length > 0 ? `${cls.streamIds.length} Streams` : "Direct"} · {(() => { const ids = new Set(); (cls.details || []).forEach((d) => (d.subjectTeachers || []).forEach((st) => { const sid = st.subjectId?._id || st.subjectId; if (sid) ids.add(String(sid)); })); return ids.size; })()} Common</div>
                      </button>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button type="button" aria-label={`Rename ${cls.name}`} onClick={(e) => { e.stopPropagation(); setRenameClass(cls); setRenameName(cls.name || ""); setRenameOpen(true); }} className="p-1 text-slate-400 hover:text-[#4834b8] rounded cursor-pointer"><PenIcon /></button>
                        <button type="button" aria-label={`Delete ${cls.name}`} onClick={(e) => { e.stopPropagation(); setDeleteClass(cls); setDeleteOpen(true); }} className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"><TrashIcon /></button>
                      </div>
                    </div>
                  </div>
                ))}
                {classes.length === 0 && <p className="text-xs text-slate-400 text-center py-6">No classes yet.</p>}
              </div>
            </div>
          </aside>

          {/* Main */}
          <div className="lg:col-span-9 space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start text-xs">
              {/* Sections panel */}
              <div className="xl:col-span-4 bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Sections — {selectedClass?.name || "Class"}</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Select a Section to assign its Class Teacher &amp; Subject Teachers.</p>
                  </div>
                  <button type="button" onClick={() => go("classes")} className="text-[11px] font-semibold text-[#4834b8] hover:underline cursor-pointer">Edit Sections</button>
                </div>
                <div className="space-y-2">
                  {secList.map((d) => {
                    const key = detailKey(d);
                    const isActive = key === detailKey(activeDetail);
                    const ct = teacherOptions.find((t) => String(t._id) === String(classTeacherByDetail[key] || d.teacherId?._id || d.teacherId || ""));
                    const assigned = (d.subjectTeachers || []).filter((st) => {
                      const sid = String(st.subjectId?._id || st.subjectId);
                      const mapKey = `${key}::${sid}`;
                      const v = Object.prototype.hasOwnProperty.call(subjectTeacherByDetail, mapKey) ? subjectTeacherByDetail[mapKey] : String(st.teacherId?._id || st.teacherId || "");
                      return !!v;
                    }).length;
                    return (
                      <button key={key} type="button" onClick={() => { setSelectedSectionId(key); setScopeFilter("ALL"); }} className={`w-full text-left p-3 rounded-xl border transition cursor-pointer ${isActive ? "bg-indigo-50/90 border-[#4834b8] text-[#4834b8]" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900 text-[13px]">Section {d.sectionName} · {d.roomNumber ? `Room ${d.roomNumber}` : "No Room"}</span>
                          <span className="font-mono text-[11px] text-slate-500 tabular-nums">0/{d.capacity || 40}</span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-1">Class Teacher: <span className="font-semibold text-slate-900">{ct ? (ct.fullName || ct.name) : "Not Assigned"}</span></div>
                        <div className={`text-[10.5px] font-mono tabular-nums mt-0.5 font-semibold ${assigned === (d.subjectTeachers || []).length && assigned > 0 ? "text-emerald-700" : "text-slate-500"}`}>{assigned}/{(d.subjectTeachers || []).length} Subject Teachers Assigned</div>
                      </button>
                    );
                  })}
                  {secList.length === 0 && <p className="text-xs text-slate-400 text-center py-6">No sections configured for this class.</p>}
                </div>
              </div>

              {/* Assignment panel */}
              <div className="xl:col-span-8 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <UsersIcon />
                      <h3 className="text-sm font-bold text-slate-900">Teachers Assignment — {selectedClass?.name || "Class"} · <span className="text-[#4834b8]">Section {activeDetail?.sectionName || "—"}</span></h3>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Teachers pulled live from Staff Panel ({teacherOptions.length} Active Teaching Staff).</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => (window.location.href = "/school/staff")} className="px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-[#4834b8] text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer"><BriefcaseIcon /><span>Manage Teachers in Staff Panel</span></button>
                  <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
                    <select aria-label="Copy subject teachers from section" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} className="px-2 py-1 border border-slate-300 rounded bg-white text-slate-700 text-[11px]">
                      <option value="">Copy from Section...</option>
                      {secList.filter((d) => detailKey(d) !== detailKey(activeDetail)).map((d) => (<option key={detailKey(d)} value={detailKey(d)}>Section {d.sectionName}</option>))}
                    </select>
                    <button type="button" onClick={handleCopy} disabled={!copyFrom} className="px-2.5 py-1 rounded bg-slate-800 disabled:bg-slate-300 text-white font-semibold inline-flex items-center gap-1 cursor-pointer"><CopyIcon /><span>Copy</span></button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-indigo-50/40 border border-indigo-200/80 rounded-xl p-3">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Section {activeDetail?.sectionName || "—"} Class Teacher</label>
                    <select value={activeDetail ? getDetailCT(activeDetail) : ""} onChange={(e) => activeDetail && handleClassTeacherChange(detailKey(activeDetail), e.target.value)} className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900">
                      <option value="">-- Select Class Teacher --</option>
                      {teacherOptions.map((t) => (<option key={teacherId(t)} value={teacherId(t)}>{t._label || teacherLabel(t)}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Filter Subjects by Scope</label>
                    <select value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)} className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900">
                      <option value="ALL">All {selectedClass?.name || "Class"} Subjects ({classSubjects.length})</option>
                      <option value="Common">Common Subjects</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#5c5987] text-white font-semibold">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Subject &amp; Code</th>
                        <th className="py-2.5 px-3">Class / Stream Scope</th>
                        <th className="py-2.5 px-3">Subject Teacher (Sec {activeDetail?.sectionName || "—"})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {classSubjects.map((sub, idx) => {
                        const current = activeDetail ? getDetailST(activeDetail, sub._id) : "";
                        return (
                          <tr key={sub._id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500">{idx + 1}</td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900">{sub.name}</div>
                              <div className="text-[10px] font-mono text-slate-400">{sub.code || "—"}</div>
                            </td>
                            <td className="py-2.5 px-3 text-[11px] text-slate-700">Common Compulsory</td>
                            <td className="py-2.5 px-3 min-w-[230px]">
                              <select aria-label={`Teacher for ${sub.name}`} value={current} onChange={(e) => activeDetail && handleSubjectTeacherChange(detailKey(activeDetail), sub._id, e.target.value)} className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-semibold focus:outline-none ${current ? "bg-emerald-50/40 border-emerald-300 text-slate-900" : "bg-white border-slate-300 text-slate-700"}`}>
                                <option value="">-- Assign Subject Teacher --</option>
                                {teacherOptions.map((t) => (<option key={teacherId(t)} value={teacherId(t)}>{t._label || teacherLabel(t)}</option>))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                      {classSubjects.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-slate-400">No subjects configured for this class.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Bottom step navigation */}
            <div className="bg-white border border-slate-200 rounded-xl px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => go("optional")} className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold inline-flex items-center gap-1.5 cursor-pointer"><ArrowLeft /><span>Step 3: Optional Groups</span></button>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => go("flow")} className="px-4 py-2 rounded-lg bg-[#4834b8] hover:bg-[#3a289c] text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"><span>Next: Flow Simulator</span><ArrowRight /></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rename modal */}
      {renameOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Rename</h3>
              <button type="button" onClick={() => setRenameOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Class Name *</label>
                <input type="text" value={renameName} onChange={(e) => setRenameName(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" onClick={() => setRenameOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg">Cancel</button>
              <button type="button" onClick={async () => {
                if (!renameName.trim()) { toast.error("Class name is required"); return; }
                if (!renameClass) return;
                try {
                  await axios.put(`${API}/classes/update/${renameClass._id}`, { name: renameName.trim(), status: renameClass.status || "Active", streamIds: (renameClass.streamIds || []).map((s) => s?._id || s), details: (renameClass.details || []).map((d) => ({ _id: d._id, sectionId: d.sectionId?._id || d.sectionId || null, roomNumber: d.roomNumber || "", teacherId: d.teacherId?._id || d.teacherId || null, capacity: d.capacity || 40, subjectTeachers: (d.subjectTeachers || []).map((st) => ({ subjectId: st.subjectId?._id || st.subjectId, teacherId: st.teacherId?._id || st.teacherId || null })) })) }, { withCredentials: true });
                  toast.success("Class renamed successfully!");
                  setRenameOpen(false);
                  fetchAll();
                } catch (err) { toast.error(err?.response?.data?.message || "Failed to rename class."); }
              }} className="px-4 py-2 text-sm font-semibold text-white bg-[#4834b8] rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {deleteOpen && deleteClass && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-5 py-6 text-center">
              <h3 className="text-base font-bold text-slate-900">Delete {deleteClass.name} along with all its sections, streams, compulsory mappings, and optional groups?</h3>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" onClick={() => { setDeleteOpen(false); setDeleteClass(null); }} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg">Cancel</button>
              <button type="button" onClick={async () => {
                if (!deleteClass) return;
                try {
                  await axios.delete(`${API}/classes/delete/${deleteClass._id}`, { withCredentials: true });
                  toast.success("Class deleted successfully!");
                  if (selectedClassId === deleteClass._id) setSelectedClassId("");
                  setDeleteOpen(false);
                  setDeleteClass(null);
                  fetchAll();
                } catch (err) { toast.error(err?.response?.data?.message || "Failed to delete class."); }
              }} className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg">Confirm Delete Class</button>
            </div>
          </div>
        </div>
      )}
      <NewClassModal open={newClassOpen} onClose={() => setNewClassOpen(false)} onCreated={fetchAll} />
    </>
  );
}
