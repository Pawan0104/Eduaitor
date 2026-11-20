import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import LoadingSpinner from "../components/LoadingSpinner";
import NewClassModal from "../components/NewClassModal";
import AcademicHeaderActions from "../components/AcademicHeaderActions";

const API = import.meta.env.VITE_API_URL;

const PlusIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M5 12h14"></path>
    <path d="M12 5v14"></path>
  </svg>
);

const PenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M13 21h8"></path>
    <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"></path>
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 11v6"></path>
    <path d="M14 11v6"></path>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
    <path d="M3 6h18"></path>
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const ArrowRight = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14"></path>
    <path d="m12 5 7 7-7 7"></path>
  </svg>
);

const ArrowLeft = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m12 19-7-7 7-7"></path>
    <path d="M19 12H5"></path>
  </svg>
);

export default function OptionalGroups() {
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [streams, setStreams] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [loading, setLoading] = useState(true);
  const [groupsByClass, setGroupsByClass] = useState({});
  const [newClassOpen, setNewClassOpen] = useState(false);

  // Rename modal
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameClass, setRenameClass] = useState(null);
  const [renameName, setRenameName] = useState("");

  // Delete modal
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteClass, setDeleteClass] = useState(null);

  // Create group modal
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupScope, setGroupScope] = useState("Common");
  const [groupStream, setGroupStream] = useState("");
  const [groupSubjects, setGroupSubjects] = useState([]);
  const [groupMin, setGroupMin] = useState(1);
  const [groupMax, setGroupMax] = useState(2);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [clsRes, secRes, subRes, strmRes] = await Promise.all([
        axios.get(`${API}/classes/all`, { withCredentials: true }),
        axios.get(`${API}/sections/all`, { withCredentials: true }),
        axios.get(`${API}/subjects/all`, { withCredentials: true }),
        axios.get(`${API}/streams/all`, { params: { status: "Active" }, withCredentials: true }),
      ]);
      const cls = clsRes.data.classes || clsRes.data.data || [];
      setClasses(cls);
      setSections(secRes.data.sections || secRes.data.data || []);
      setSubjects(subRes.data.subjects || subRes.data.data || []);
      setStreams(strmRes.data?.streams || strmRes.data?.data || []);
      if (cls.length && !selectedClassId) setSelectedClassId(cls[0]._id);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const selectedClass = classes.find((c) => c._id === selectedClassId);

  const sectionsForClass = (cls) =>
    (cls?.details || []).map((d) => {
      const sec = sections.find((s) => s._id === (d.sectionId?._id || d.sectionId));
      return { ...d, sectionName: sec?.name || sec?.sectionName || "Section" };
    });

  const streamsForClass = (cls) => {
    const classId = String(cls?._id || "");
    const isLinked = (st) =>
      (st.classIds || []).map((c) => String(c?._id || c)).includes(classId) ||
      (cls?.streamIds || []).some((s) => String(s?._id || s) === String(st._id));
    return (streams || [])
      .map((st) => ({
        _id: String(st?._id || ""),
        name: st?.name || "Stream",
        linked: isLinked(st),
      }))
      .filter((s) => s._id && s._id !== "undefined")
      .sort((a, b) => Number(b.linked) - Number(a.linked));
  };

  const secList = sectionsForClass(selectedClass);
  const streamList = streamsForClass(selectedClass);
  const groups = groupsByClass[selectedClassId] || [];

  const openGroupModal = () => {
    setGroupName("");
    setGroupScope("Common");
    setGroupStream(streamList[0]?._id || "");
    setGroupSubjects([]);
    setGroupMin(1);
    setGroupMax(2);
    setGroupOpen(true);
  };

  const saveGroup = () => {
    if (!groupName.trim()) { toast.error("Group name is required"); return; }
    if (groupScope === "Stream" && !groupStream) { toast.error("Please select a stream"); return; }
    if (groupSubjects.length === 0) { toast.error("Select at least one optional subject"); return; }
    const newGroup = {
      _id: `local-${Date.now()}`,
      name: groupName.trim(),
      scope: groupScope,
      streamName: groupScope === "Stream" ? (streamList.find((s) => s._id === groupStream)?.name || "Stream") : null,
      subjectIds: groupSubjects,
      subjectNames: subjects.filter((s) => groupSubjects.includes(s._id)).map((s) => s.name),
      min: groupMin,
      max: groupMax,
    };
    setGroupsByClass((prev) => ({ ...prev, [selectedClassId]: [...(prev[selectedClassId] || []), newGroup] }));
    setGroupOpen(false);
    toast.success("Optional Group created successfully!");
  };

  const deleteGroup = (id) => {
    setGroupsByClass((prev) => ({ ...prev, [selectedClassId]: (prev[selectedClassId] || []).filter((g) => g._id !== id) }));
    toast.success("Optional Group deleted.");
  };

  const go = (key) => {
    if (key === "subjects") window.location.href = `${import.meta.env.BASE_URL}school/subjects-master`;
    else if (key === "classes") window.location.href = `${import.meta.env.BASE_URL}school/classes-subjects`;
    else if (key === "compulsory") window.location.href = `${import.meta.env.BASE_URL}school/compulsory-subjects`;
    else if (key === "teachers") window.location.href = `${import.meta.env.BASE_URL}school/teachers-assignment`;
    else if (key === "flow") window.location.href = `${import.meta.env.BASE_URL}school/flow-simulator`;
  };

  if (loading) return <LoadingSpinner />;

  const tabs = [
    { key: "subjects", title: "Subjects Master", subtitle: "Full-page subject catalog", badge: "book" },
    { key: "classes", title: "Class & Sections", subtitle: "Structure, strength & streams", badge: "check" },
    { key: "compulsory", title: "Compulsory Subjects", subtitle: "Class & Stream fixed", badge: "check" },
    { key: "optional", title: "Optional Groups", subtitle: "Common & Stream electives", badge: "3", active: true },
    { key: "teachers", title: "Teachers Assignment", subtitle: "Class & Subject Teachers", badge: "check" },
    { key: "flow", title: "Flow Simulator", subtitle: "Test Class → Stream → Sec", badge: "eye" },
  ];

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
                  {tab.badge === "3" && "3"}
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
                <button type="button" onClick={() => setNewClassOpen(true)} className="px-2.5 py-1.5 rounded-lg bg-[#4834b8] hover:bg-[#3a289c] text-white text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer">
                  <PlusIcon /><span>New Class</span>
                </button>
              </div>
              <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-0.5">
                {classes.map((cls) => (
                  <div
                    key={cls._id}
                    onClick={() => setSelectedClassId(cls._id)}
                    className={`rounded-lg border px-3 py-2 text-xs transition cursor-pointer ${selectedClassId === cls._id ? "bg-indigo-50/90 border-[#4834b8] text-[#4834b8]" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button type="button" className="flex-1 text-left cursor-pointer min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-slate-900">{cls.name}</span>
                          <span className="text-[10px] font-mono tabular-nums text-slate-500">{cls.details?.reduce((a, d) => a + (d.capacity || 0), 0) || 0} seats</span>
                        </div>
                        <div className="text-[10.5px] text-slate-500 mt-0.5 font-mono tabular-nums truncate">
                          {cls.details?.length || 0} Sec · {(cls.streamIds || []).length > 0 ? `${cls.streamIds.length} Streams` : "Direct"} · {(() => { const ids = new Set(); (cls.details || []).forEach((d) => (d.subjectTeachers || []).forEach((st) => { const sid = st.subjectId?._id || st.subjectId; if (sid) ids.add(String(sid)); })); return ids.size; })()} Common
                        </div>
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

          {/* Main panel */}
          <div className="lg:col-span-9 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Configured Optional Groups — {selectedClass?.name || "Class"}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Optional Groups belong to Class (Common) or a specific Stream — uniformly available across <span className="font-semibold text-[#4834b8]">{secList.map((d) => `Sec ${d.sectionName}`).join(", ") || "all sections"}</span>.</p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="font-mono font-bold text-slate-700 tabular-nums">{groups.length} Group(s)</span>
                  <button type="button" onClick={openGroupModal} className="px-3.5 py-2 rounded-lg bg-[#4834b8] hover:bg-[#3a289c] text-white font-bold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer">
                    <PlusIcon /><span>Create Optional Group</span>
                  </button>
                </div>
              </div>

              {groups.length === 0 ? (
                <div className="py-12 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl space-y-2.5">
                  <div>No Optional Groups defined for {selectedClass?.name || "this class"}. Create an elective group via the dialog if students choose optional subjects.</div>
                  <button type="button" onClick={openGroupModal} className="px-4 py-2 rounded-lg bg-[#4834b8] text-white font-bold inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#3a289c]">
                    <PlusIcon /><span>Create First Optional Group</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {groups.map((g) => (
                    <div key={g._id} className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-sm truncate">{g.name}</div>
                          <div className="text-[10.5px] text-slate-500 mt-0.5">{g.scope === "Common" ? "Class Common" : `Stream: ${g.streamName}`} · Select {g.min}–{g.max}</div>
                        </div>
                        <button type="button" onClick={() => deleteGroup(g._id)} aria-label={`Delete ${g.name}`} className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer shrink-0"><TrashIcon /></button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(g.subjectNames || []).map((n) => (<span key={n} className="px-2 py-0.5 rounded-full bg-white border border-indigo-200 text-[10.5px] text-[#4834b8] font-semibold">{n}</span>))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom step navigation */}
            <div className="bg-white border border-slate-200 rounded-xl px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => go("compulsory")} className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold inline-flex items-center gap-1.5 cursor-pointer">
                  <ArrowLeft /><span>Step 2: Compulsory Subjects</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => go("teachers")} className="px-4 py-2 rounded-lg bg-[#4834b8] hover:bg-[#3a289c] text-white font-bold inline-flex items-center gap-1.5 cursor-pointer">
                  <span>Next: Step 4 · Teachers Assignment</span><ArrowRight />
                </button>
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
              <button
                type="button"
                onClick={async () => {
                  if (!renameName.trim()) { toast.error("Class name is required"); return; }
                  if (!renameClass) return;
                  try {
                    await axios.put(`${API}/classes/update/${renameClass._id}`, { name: renameName.trim(), status: renameClass.status || "Active", streamIds: (renameClass.streamIds || []).map((s) => s?._id || s), details: (renameClass.details || []).map((d) => ({ _id: d._id, sectionId: d.sectionId?._id || d.sectionId || null, roomNumber: d.roomNumber || "", teacherId: d.teacherId?._id || d.teacherId || null, capacity: d.capacity || 40, subjectTeachers: (d.subjectTeachers || []).map((st) => ({ subjectId: st.subjectId?._id || st.subjectId, teacherId: st.teacherId?._id || st.teacherId || null })) })) }, { withCredentials: true });
                    toast.success("Class renamed successfully!");
                    setRenameOpen(false);
                    fetchAll();
                  } catch (err) {
                    toast.error(err?.response?.data?.message || "Failed to rename class.");
                  }
                }}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#4834b8] rounded-lg"
              >Save</button>
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
              <button
                type="button"
                onClick={async () => {
                  if (!deleteClass) return;
                  try {
                    await axios.delete(`${API}/classes/delete/${deleteClass._id}`, { withCredentials: true });
                    toast.success("Class deleted successfully!");
                    if (selectedClassId === deleteClass._id) setSelectedClassId("");
                    setDeleteOpen(false);
                    setDeleteClass(null);
                    fetchAll();
                  } catch (err) {
                    toast.error(err?.response?.data?.message || "Failed to delete class.");
                  }
                }}
                className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >Confirm Delete Class</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Optional Group modal */}
      {groupOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Create Optional Group — {selectedClass?.name || "Class"}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Elective subjects are available uniformly across all sections of this class.</p>
              </div>
              <button type="button" onClick={() => setGroupOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">1. Group Name *</label>
                <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Language Electives" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">2. Applies To</label>
                <div className="flex gap-2 mb-2">
                  {["Common", "Stream"].map((scope) => (
                    <button key={scope} type="button" onClick={() => { setGroupScope(scope); if (scope === "Stream" && !groupStream && streamList.length) setGroupStream(streamList[0]._id); }} className={`px-3 py-2 rounded-lg text-xs font-semibold border ${groupScope === scope ? "bg-[#4834b8] text-white border-[#4834b8]" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"}`}>
                      {scope === "Common" ? "Class (Common)" : "Specific Stream"}
                    </button>
                  ))}
                </div>
                {groupScope === "Stream" && (
                  <>
                    <select value={groupStream} onChange={(e) => setGroupStream(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
                      <option value="">Select a stream</option>
                      {streamList.map((s) => (<option key={s._id} value={s._id}>{s.name}</option>))}
                    </select>
                    {streamList.length === 0 && (
                      <p className="text-[11px] text-rose-600 mt-1">
                        No streams available. Add streams in Class &amp; Sections first.
                      </p>
                    )}
                  </>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">3. Optional Subjects</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                  {subjects.map((s) => {
                    const checked = groupSubjects.includes(s._id);
                    return (
                      <label key={s._id} className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer text-xs ${checked ? "bg-indigo-50 border-[#4834b8] text-[#4834b8] font-semibold" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
                        <input type="checkbox" checked={checked} onChange={() => setGroupSubjects((prev) => (checked ? prev.filter((id) => id !== s._id) : [...prev, s._id]))} className="accent-[#4834b8] w-3.5 h-3.5" />
                        <span className="truncate">{s.name}</span>
                      </label>
                    );
                  })}
                  {subjects.length === 0 && <p className="text-xs text-slate-400 col-span-full">No subjects available.</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Min Subjects</label>
                  <input type="number" min={1} value={groupMin} onChange={(e) => setGroupMin(Number(e.target.value) || 1)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Max Subjects</label>
                  <input type="number" min={1} value={groupMax} onChange={(e) => setGroupMax(Number(e.target.value) || 1)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" onClick={() => setGroupOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg">Cancel</button>
              <button type="button" onClick={saveGroup} className="px-4 py-2 text-sm font-semibold text-white bg-[#4834b8] rounded-lg">Create Group</button>
            </div>
          </div>
        </div>
      )}
      <NewClassModal open={newClassOpen} onClose={() => setNewClassOpen(false)} onCreated={fetchAll} />
    </>
  );
}
