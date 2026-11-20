import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import LoadingSpinner from "../components/LoadingSpinner";
import AcademicHeaderActions from "../components/AcademicHeaderActions";

const API = import.meta.env.VITE_API_URL;
const PRESET_CLASS_STREAM_NAMES = [
  "Science",
  "Commerce",
  "Arts",
  "Agriculture",
  "Sanskrit Sahitya",
];

export default function CompulsorySubjects() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [loading, setLoading] = useState(true);
  const [commonSelected, setCommonSelected] = useState(new Set());
  const [streamSelected, setStreamSelected] = useState({});
  const [selectedStream, setSelectedStream] = useState("");
  // New Class modal state
  const [newClassOpen, setNewClassOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [sectionCount, setSectionCount] = useState(2);
  const [sectionNames, setSectionNames] = useState(["A", "B"]);
  const [maxStrength, setMaxStrength] = useState(40);
  const [streamMode, setStreamMode] = useState("direct");
  const [availableClassStreams, setAvailableClassStreams] = useState([...PRESET_CLASS_STREAM_NAMES]);
  const [selectedStreams, setSelectedStreams] = useState([]);
  const [customClassStreamName, setCustomClassStreamName] = useState("");
  // Rename modal state
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameClass, setRenameClass] = useState(null);
  const [renameName, setRenameName] = useState("");
  // Delete modal state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteClass, setDeleteClass] = useState(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [clsRes, subRes] = await Promise.all([
        axios.get(`${API}/classes/all`, { withCredentials: true }),
        axios.get(`${API}/subjects/all`, { withCredentials: true }),
      ]);
      const cls = clsRes.data.classes || clsRes.data.data || [];
      setClasses(cls);
      setSubjects(subRes.data.subjects || subRes.data.data || []);
      if (cls.length && !selectedClassId) setSelectedClassId(cls[0]._id);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const selectedClass = classes.find((c) => c._id === selectedClassId);

  // Load already-assigned common subjects whenever the class changes
  useEffect(() => {
    if (!selectedClass) { setCommonSelected(new Set()); return; }
    const ids = new Set();
    (selectedClass.details || []).forEach((d) => (d.subjectTeachers || []).forEach((st) => {
      const sid = st.subjectId?._id || st.subjectId;
      if (sid) ids.add(String(sid));
    }));
    setCommonSelected(ids);
  }, [selectedClassId]);

  const saveCommonSubjects = async () => {
    if (!selectedClass) { toast.error("Select a class first"); return; }
    try {
      const selectedIds = Array.from(commonSelected).map(String);
      const details = (selectedClass.details || []).map((d) => {
        const existing = (d.subjectTeachers || []).map((st) => ({
          subjectId: String(st.subjectId?._id || st.subjectId),
          teacherId: st.teacherId?._id || st.teacherId || null,
        }));
        return {
          _id: d._id,
          sectionId: d.sectionId?._id || d.sectionId || null,
          roomNumber: d.roomNumber || "",
          teacherId: d.teacherId?._id || d.teacherId || null,
          capacity: d.capacity || 40,
          subjectTeachers: selectedIds.map((sid) => ({
            subjectId: sid,
            teacherId: existing.find((x) => x.subjectId === sid)?.teacherId || null,
          })),
        };
      });
      await axios.put(`${API}/classes/update/${selectedClass._id}`, {
        name: selectedClass.name,
        status: selectedClass.status || "Active",
        streamIds: (selectedClass.streamIds || []).map((s) => s?._id || s),
        details,
      }, { withCredentials: true });
      toast.success(`Saved ${selectedIds.length} common compulsory subject(s) for ${selectedClass.name}.`);
      await fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save common subjects.");
    }
  };
  const streamsForClass = (cls) => (cls?.streamIds || []).map((s) => (typeof s === "object" ? s : { _id: s, name: s }));

  const totalSeats = sectionNames.length * (maxStrength || 0);

  const applySectionCount = (n) => {
    setSectionCount(n);
    const names = [];
    for (let i = 0; i < n; i++) names.push(String.fromCharCode(65 + i));
    setSectionNames(names);
  };

  const isClassStreamSelected = (name) =>
    selectedStreams.some(
      (s) => String(s).toLowerCase() === String(name).trim().toLowerCase(),
    );

  const addNewClassStreamToList = (value) => {
    const trimmed = String(value || "").trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    setAvailableClassStreams((prev) => {
      if (prev.some((s) => String(s).toLowerCase() === key)) return prev;
      return [...prev, trimmed];
    });
    setSelectedStreams((prev) => {
      if (prev.some((s) => String(s).toLowerCase() === key)) return prev;
      return [...prev, trimmed];
    });
    setCustomClassStreamName("");
  };

  const removeClassStreamFromList = (name) => {
    const key = String(name).toLowerCase();
    setAvailableClassStreams((prev) =>
      prev.filter((s) => String(s).toLowerCase() !== key),
    );
    setSelectedStreams((prev) =>
      prev.filter((s) => String(s).toLowerCase() !== key),
    );
  };

  const toggleClassStreamSelection = (name) => {
    const key = String(name).toLowerCase();
    setSelectedStreams((prev) => {
      if (prev.some((s) => String(s).toLowerCase() === key)) {
        return prev.filter((s) => String(s).toLowerCase() !== key);
      }
      const canonical =
        availableClassStreams.find((s) => String(s).toLowerCase() === key) || name;
      return [...prev, canonical];
    });
  };

  if (loading) return <LoadingSpinner />;

  const toggleCommon = (id) => {
    const next = new Set(commonSelected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setCommonSelected(next);
  };

  const toggleStream = (streamId, subjId) => {
    const next = { ...streamSelected };
    const set = new Set(next[streamId] || []);
    if (set.has(subjId)) set.delete(subjId); else set.add(subjId);
    next[streamId] = set;
    setStreamSelected(next);
  };

  const streamList = selectedClass ? streamsForClass(selectedClass) : [];

  return (
    <>
    <div className="space-y-6 p-6">
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
        {[
          { key: "subjects", title: "Subjects Master", subtitle: "Full-page subject catalog", badge: "book" },
          { key: "classes", title: "Class & Sections", subtitle: "Structure, strength & streams", badge: "1" },
          { key: "compulsory", title: "Compulsory Subjects", subtitle: "Class & Stream fixed", badge: "2", active: true },
          { key: "optional", title: "Optional Groups", subtitle: "Common & Stream electives", badge: "3" },
          { key: "teachers", title: "Teachers Assignment", subtitle: "Class & Subject Teachers", badge: "4" },
          { key: "flow", title: "Flow Simulator", subtitle: "Test Class → Stream → Sec", badge: "eye" },
        ].map((tab) => {
          const isActive = tab.key === "compulsory";
          const activeCls = isActive ? "bg-[#4834b8] border-[#4834b8] text-white" : "bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100";
          const badgeCls = isActive ? "bg-white text-[#4834b8]" : (["2","3","4"].includes(tab.badge) ? "bg-emerald-600 text-white" : (tab.badge === "check" ? "bg-emerald-600 text-white" : "bg-white border border-slate-300 text-slate-600"));
          return (
            <button key={tab.key} type="button" onClick={() => { if (tab.key === "optional") { window.location.href = `${import.meta.env.BASE_URL}school/optional-groups`; return; } if (tab.key === "subjects") { window.location.href = `${import.meta.env.BASE_URL}school/subjects-master`; return; } if (tab.key === "classes") { window.location.href = `${import.meta.env.BASE_URL}school/classes-subjects`; return; } if (tab.key === "teachers") { window.location.href = `${import.meta.env.BASE_URL}school/teachers-assignment`; return; } if (tab.key === "flow") { window.location.href = `${import.meta.env.BASE_URL}school/flow-simulator`; return; } }} className={`px-3 py-2.5 rounded-lg border text-left transition flex items-start gap-2.5 cursor-pointer ${activeCls}`}>
              <span className={`w-6 h-6 rounded-md text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 ${badgeCls}`}>
                {tab.badge === "book" && (<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 7v14"></path><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path></svg>)}
                {["1","2","3","4"].includes(tab.badge) && tab.badge}
                {tab.badge === "eye" && (<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path><circle cx="12" cy="12" r="3"></circle></svg>)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold truncate">{tab.title}</span>
                </div>
                <div className={`text-[10.5px] truncate mt-0.5 ${isActive ? "text-indigo-100" : "text-slate-500"}`}>{tab.subtitle}</div>
              </div>
            </button>
          );
        })}
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Classes Directory */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Classes Directory</h3>
                <p className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">{classes.length} Active Classes</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNewClassName("");
                  setSectionCount(2);
                  setSectionNames(["A", "B"]);
                  setMaxStrength(40);
                  setStreamMode("direct");
                  setAvailableClassStreams([...PRESET_CLASS_STREAM_NAMES]);
                  setSelectedStreams([]);
                  setCustomClassStreamName("");
                  setNewClassOpen(true);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#4834b8] hover:bg-[#3a289c] text-white text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
                New Class
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
                      <div className="text-[10.5px] text-slate-500 mt-0.5 font-mono tabular-nums truncate">{cls.details?.length || 0} Sec · {(cls.streamIds || []).length > 0 ? `${cls.streamIds.length} Streams` : "Direct"} · {(() => { const ids = new Set(); (cls.details || []).forEach((d) => (d.subjectTeachers || []).forEach((st) => { const sid = st.subjectId?._id || st.subjectId; if (sid) ids.add(String(sid)); })); return ids.size; })()} Common</div>
                    </button>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        aria-label={`Rename ${cls.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameClass(cls);
                          setRenameName(cls.name || "");
                          setRenameOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-[#4834b8] rounded cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 21h8"></path><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"></path></svg>
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${cls.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteClass(cls);
                          setDeleteOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {classes.length === 0 && <p className="text-xs text-slate-400 text-center py-6">No classes yet.</p>}
            </div>
          </div>
        </aside>

        {/* Assignment panel */}
        <section className="lg:col-span-9 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Compulsory Subjects Assignment — {selectedClass?.name || "Class"}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Assigned at Class &amp; Stream level — automatically applies uniformly across all sections.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input placeholder="Filter subjects..." className="pl-3 pr-3 py-1.5 border border-slate-300 rounded-lg w-44 focus:outline-none focus:border-[#4834b8] text-sm" type="text" />
                <button type="button" onClick={() => (window.location.href = `${import.meta.env.BASE_URL}school/subjects-master`)} className="px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-[#4834b8] font-semibold inline-flex items-center gap-1.5 cursor-pointer text-xs">
                  Open Subjects Master
                </button>
              </div>
            </div>

            {/* A. Common Compulsory */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">A. Common Compulsory Subjects (Entire Class)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Mandatory for EVERY student across all Streams &amp; Sections.</p>
                </div>
                <button type="button" onClick={saveCommonSubjects} className="px-4 py-2 rounded-lg bg-[#4834b8] hover:bg-[#3a289c] text-white font-bold inline-flex items-center gap-1.5 cursor-pointer text-xs">
                  Save Common Subjects ({commonSelected.size})
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {subjects.map((sub) => {
                  const checked = commonSelected.has(sub._id);
                  return (
                    <label key={sub._id} className={`p-2.5 rounded-lg border flex items-center gap-2.5 cursor-pointer transition ${checked ? "bg-indigo-50 border-[#4834b8] text-[#4834b8] font-semibold" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleCommon(sub._id)} className="accent-[#4834b8] w-4 h-4" />
                      <div className="min-w-0">
                        <div className="truncate text-sm">{sub.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{sub.code || sub._id?.slice(-6)}</div>
                      </div>
                    </label>
                  );
                })}
                {subjects.length === 0 && <p className="text-xs text-slate-400 col-span-full text-center py-4">No subjects found.</p>}
              </div>
            </div>

            {/* B. Stream Compulsory */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">B. Stream Compulsory Subjects</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Mandatory for students in the selected Stream.</p>
                </div>
              </div>
              {streamList.length > 0 ? (
                <div className="space-y-3">
                  <select
                    value={selectedStream}
                    onChange={(e) => setSelectedStream(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    <option value="">Select a stream</option>
                    {streamList.map((st) => (
                      <option key={st._id} value={st._id}>{st.name}</option>
                    ))}
                  </select>
                  {selectedStream && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {subjects.map((sub) => {
                        const set = streamSelected[selectedStream] || new Set();
                        const checked = set.has(sub._id);
                        return (
                          <label key={sub._id} className={`p-2.5 rounded-lg border flex items-center gap-2.5 cursor-pointer transition ${checked ? "bg-indigo-50 border-[#4834b8] text-[#4834b8] font-semibold" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
                            <input type="checkbox" checked={checked} onChange={() => toggleStream(selectedStream, sub._id)} className="accent-[#4834b8] w-4 h-4" />
                            <div className="min-w-0">
                              <div className="truncate text-sm">{sub.name}</div>
                              <div className="text-[10px] font-mono text-slate-400">{sub.code || sub._id?.slice(-6)}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 space-y-2">
                  <p className="text-xs text-slate-400">No streams assigned to this class.</p>
                  <button
                    type="button"
                    onClick={() => (window.location.href = `${import.meta.env.BASE_URL}school/classes-subjects`)}
                    className="px-4 py-2 rounded-lg border border-[#4834b8] bg-white text-[#4834b8] text-xs font-bold hover:bg-indigo-50 cursor-pointer"
                  >
                    Configure Stream in Step 1
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bottom step navigation */}
          <div className="bg-white border border-slate-200 rounded-xl px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => (window.location.href = `${import.meta.env.BASE_URL}school/classes-subjects`)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left w-3.5 h-3.5" aria-hidden="true"><path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path></svg>
                <span>Step 1: Class &amp; Sections</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => (window.location.href = `${import.meta.env.BASE_URL}school/optional-groups`)}
                className="px-4 py-2 rounded-lg bg-[#4834b8] hover:bg-[#3a289c] text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>Next: Step 3 · Optional Groups</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right w-3.5 h-3.5" aria-hidden="true"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
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
              <input
                type="text"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
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
            >
              Save
            </button>
          </div>
        </div>
      </div>
    )}
    {deleteOpen && deleteClass && (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
          <div className="px-5 py-6 text-center">
            <h3 className="text-base font-bold text-slate-900">
              Delete {deleteClass.name} along with all its sections, streams, compulsory mappings, and optional groups?
            </h3>
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
            >
              Confirm Delete Class
            </button>
          </div>
        </div>
      </div>
    )}
    {newClassOpen && (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-base font-bold text-slate-900">Create New Class — Sections &amp; Optional Streams Setup</h3>
            </div>
            <button type="button" onClick={() => setNewClassOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div className="p-5 space-y-4 flex-1 overflow-y-auto min-h-0">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">1. Class Name *</label>
              <input type="text" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="e.g. 5th, LKG, 11th" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">2. Multiple Sections (Quick Select)</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[1, 2, 3, 4, 5, 6].map((n) => {
                  const selected = sectionCount === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        setSectionCount(n);
                        const names = [];
                        for (let i = 0; i < n; i++) names.push(String.fromCharCode(65 + i));
                        setSectionNames(names);
                      }}
                      className={`w-8 h-8 rounded-md text-xs font-mono font-bold flex items-center justify-center border ${selected ? "bg-[#4834b8] text-white border-[#4834b8]" : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"}`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500">
                Creating {sectionNames.length} section(s): {sectionNames.join(", ")} ({sectionNames.length * (maxStrength || 0)} total seats)
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">3. Max Strength per Section</label>
              <input type="number" value={maxStrength} onChange={(e) => setMaxStrength(Number(e.target.value) || 0)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">4. Does this Class have Academic Streams? (Optional)</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setStreamMode("direct"); setSelectedStreams([]); setCustomClassStreamName(""); }} className={`px-3 py-2 rounded-lg text-xs font-semibold border ${streamMode === "direct" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300"}`}>No Streams (Direct Class)</button>
                <button type="button" onClick={() => {
                  setStreamMode("streams");
                  setSelectedStreams((prev) => prev.length > 0 ? prev : [...availableClassStreams]);
                }} className={`px-3 py-2 rounded-lg text-xs font-semibold border ${streamMode === "streams" ? "bg-[#4834b8] text-white border-[#4834b8]" : "bg-white text-slate-700 border-slate-300"}`}>Has Streams</button>
              </div>
              {streamMode === "streams" && (
                <div className="mt-3 space-y-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-semibold text-slate-600">
                        Available streams for this class (live): {availableClassStreams.length}
                      </p>
                      <span className="text-[10px] text-slate-400">× remove · ☑ include</span>
                    </div>
                    {availableClassStreams.length === 0 ? (
                      <p className="text-[11px] text-slate-400">No streams available. Add a new stream below.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {availableClassStreams.map((name) => (
                          <div key={name} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5">
                            <button
                              type="button"
                              onClick={() => removeClassStreamFromList(name)}
                              className="w-5 h-5 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-bold leading-none shrink-0"
                              aria-label={`Remove ${name}`}
                            >
                              ×
                            </button>
                            <label className="flex items-center gap-2 flex-1 text-xs text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isClassStreamSelected(name)}
                                onChange={() => toggleClassStreamSelection(name)}
                                className="w-3.5 h-3.5 accent-[#4834b8]"
                              />
                              <span className="truncate">{name}</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 mb-1.5">
                      Add a new stream (appears in the list immediately)
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customClassStreamName}
                        onChange={(e) => setCustomClassStreamName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addNewClassStreamToList(customClassStreamName);
                          }
                        }}
                        placeholder="Add new Stream name"
                        className="flex-1 px-3 py-2 rounded-lg text-xs border border-slate-300 bg-white text-slate-700"
                      />
                      <button
                        type="button"
                        onClick={() => addNewClassStreamToList(customClassStreamName)}
                        disabled={!customClassStreamName.trim()}
                        className="px-3 py-2 rounded-lg text-xs font-semibold bg-[#4834b8] text-white border border-[#4834b8] hover:bg-[#3a289c] disabled:opacity-50"
                      >
                        Add stream
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2 shrink-0 bg-white">
            <button type="button" onClick={() => setNewClassOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg">Cancel</button>
            <button type="button" onClick={() => { if (!newClassName.trim()) { toast.error("Class name is required"); return; } toast.info("Class creation requires the full Class editor."); setNewClassOpen(false); }} className="px-4 py-2 text-sm font-semibold text-white bg-[#4834b8] rounded-lg">Create Class</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}