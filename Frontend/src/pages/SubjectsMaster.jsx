import { useEffect, useState } from "react";
import axios from "axios";
import { FaPlus, FaEdit, FaTrash, FaArrowLeft } from "react-icons/fa";
import { FiSearch } from "react-icons/fi";
import { toast } from "react-toastify";
import LoadingSpinner from "../components/LoadingSpinner";
import AcademicHeaderActions from "../components/AcademicHeaderActions";

const API = import.meta.env.VITE_API_URL;

export default function SubjectsMaster() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | compulsory | optional | unassigned
  const [search, setSearch] = useState("");
  // Add Subject modal state
  const [addSubjectOpen, setAddSubjectOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectCode, setNewSubjectCode] = useState("");
  // View subject modal state
  const [viewSubjectOpen, setViewSubjectOpen] = useState(false);
  const [viewSubject, setViewSubject] = useState(null);
  // Edit subject modal state
  const [editSubjectOpen, setEditSubjectOpen] = useState(false);
  const [editSubject, setEditSubject] = useState(null);
  const [editSubjectName, setEditSubjectName] = useState("");
  const [editSubjectCode, setEditSubjectCode] = useState("");
  // Delete subject modal state
  const [deleteSubjectOpen, setDeleteSubjectOpen] = useState(false);
  const [deleteSubject, setDeleteSubject] = useState(null);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API}/subjects/all`, { withCredentials: true });
      setSubjects(data.subjects || data.data || []);
    } catch {
      toast.error("Failed to load subjects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const filtered = subjects.filter((s) => {
    const name = (s.name || "").toLowerCase();
    const q = search.trim().toLowerCase();
    if (q && !name.includes(q)) return false;
    return true;
  });

  if (loading) return <LoadingSpinner />;

  const allCount = subjects.length;
  const compulsoryCount = subjects.filter((s) => s.type === "compulsory" || s.compulsory).length;
  const optionalCount = subjects.filter((s) => s.type === "optional" || s.optional).length;
  const unassignedCount = subjects.filter((s) => !(s.classes && s.classes.length)).length;

  return (
    <>
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Academic Curriculum &amp; Class Setup
            </h2>
            <span className="text-xs font-mono text-slate-400">·</span>
            <span className="text-xs font-semibold text-[#4834b8]">
              Class → Stream (Optional) → Section (Strength) → Subjects → Teachers
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Step-by-step workflow: first create Class with Sections &amp; optional Streams, configure Class &amp; Stream
            subjects, then assign Class &amp; Subject Teachers from Staff Panel.
          </p>
        </div>
        <AcademicHeaderActions />
      </div>

      {/* Summary Stat Boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-[#4834b8]/10 text-[#4834b8] flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold text-slate-900 leading-none">{allCount}</div>
            <div className="text-xs font-semibold text-slate-800 mt-1">Total Master Subjects</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Shared across all Classes &amp; Streams</div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold text-slate-900 leading-none">{compulsoryCount}</div>
            <div className="text-xs font-semibold text-slate-800 mt-1">Compulsory Mapped</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Used in Class Common or Stream fixed lists</div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v4l2.5 2.5"></path></svg>
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold text-slate-900 leading-none">{optionalCount}</div>
            <div className="text-xs font-semibold text-slate-800 mt-1">Optional Electives</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Available in Common / Stream Optional Groups</div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold text-slate-900 leading-none">{unassignedCount}</div>
            <div className="text-xs font-semibold text-slate-800 mt-1">Unassigned Subjects</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Ready to assign to Classes or Groups</div>
          </div>
        </div>
      </div>

      {/* Subjects Master Repository */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Subjects Master Repository (Full Page)</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Create, view, edit, or delete the school-wide subject catalog via standardized Scientific ERP dialogs.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setNewSubjectName(""); setNewSubjectCode(""); setAddSubjectOpen(true); }} className="px-3.5 py-1.5 rounded-lg bg-[#4834b8] hover:bg-[#3a289c] text-white font-bold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer text-xs">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
              Add Subject
            </button>
            <button type="button" onClick={() => (window.location.href = `${import.meta.env.BASE_URL}school/compulsory-subjects`)} className="px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-[#4834b8] font-semibold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer text-xs">
              Assign to Class
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="inline-flex flex-wrap rounded-lg bg-slate-100 p-1 border border-slate-200 gap-1">
            {[
              { key: "all", label: `All (${allCount})` },
              { key: "compulsory", label: `Compulsory (${compulsoryCount})` },
              { key: "optional", label: `Optional (${optionalCount})` },
              { key: "unassigned", label: `Unassigned (${unassignedCount})` },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setFilter(t.key)}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${filter === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><path d="m21 21-4.34-4.34"></path><circle cx="11" cy="11" r="8"></circle></svg>
            <input
              aria-label="Search Subjects Master"
              placeholder="Search subject name, code, or class..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#4834b8] text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#5c5987] text-white font-semibold text-[11.5px]">
                <th className="py-2.5 px-3 w-12">#</th>
                <th className="py-2.5 px-3">Subject Name</th>
                <th className="py-2.5 px-3">Code</th>
                <th className="py-2.5 px-3">Compulsory Mapping (Class / Stream)</th>
                <th className="py-2.5 px-3">Optional Groups Mapping</th>
                <th className="py-2.5 px-3 text-right">Active Students</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((sub, idx) => (
                <tr key={sub._id || idx} className="hover:bg-slate-50/80 align-top">
                  <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 min-w-[180px]">{sub.name}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">{sub.code || "—"}</td>
                  <td className="py-2.5 px-3 text-[11px] text-slate-700 min-w-[200px]">
                    {sub.classes && sub.classes.length > 0 ? (
                      <div className="space-y-0.5">
                        <div><span className="font-semibold text-[#4834b8]">Common:</span> {sub.classes.map((c) => c.name || c.label).join(", ")}</div>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-[11px] text-slate-700 min-w-[220px]">
                    <span className="text-slate-400">—</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-800">{sub.activeStudents || 0}</td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button type="button" aria-label={`View ${sub.name}`} onClick={() => { setViewSubject(sub); setViewSubjectOpen(true); }} className="p-1.5 text-slate-400 hover:text-slate-800 rounded cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      </button>
                      <button type="button" aria-label={`Edit ${sub.name}`} onClick={() => { setEditSubject(sub); setEditSubjectName(sub.name || ""); setEditSubjectCode(sub.code || ""); setEditSubjectOpen(true); }} className="p-1.5 text-slate-400 hover:text-[#4834b8] rounded cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 21h8"></path><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"></path></svg>
                      </button>
                      <button type="button" aria-label={`Delete ${sub.name}`} onClick={() => { setDeleteSubject(sub); setDeleteSubjectOpen(true); }} className="p-1.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-slate-400">
                    No subjects found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom step navigation */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-3 flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-slate-500">Subjects Master · Subject Catalog</span>
        <button
          type="button"
          onClick={() => (window.location.href = `${import.meta.env.BASE_URL}school/classes-subjects`)}
          className="px-4 py-2 rounded-lg bg-[#4834b8] hover:bg-[#3a289c] text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <span>Next: Step 1 . Class &amp; Section</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
        </button>
      </div>
    </div>
    {addSubjectOpen && (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Add New Subject to Master Catalog</h3>
              <p className="text-xs text-slate-500 mt-0.5">Subjects added here become immediately available across all classes &amp; streams</p>
            </div>
            <button type="button" onClick={() => setAddSubjectOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">1. Subject Name *</label>
              <input
                type="text"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="e.g. Artificial Intelligence , Legal Studies"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">2. Subject Code (Optional — auto-generated if blank)</label>
              <input
                type="text"
                value={newSubjectCode}
                onChange={(e) => setNewSubjectCode(e.target.value)}
                placeholder="E.G  AI -75"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
            <button type="button" onClick={() => setAddSubjectOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg">Cancel</button>
            <button
              type="button"
              onClick={async () => {
                if (!newSubjectName.trim()) { toast.error("Subject name is required"); return; }
                try {
                  await axios.post(`${API}/subjects/create`, { name: newSubjectName.trim(), status: "Active" }, { withCredentials: true });
                  toast.success("Subject added successfully!");
                  setAddSubjectOpen(false);
                  fetchSubjects();
                } catch (err) {
                  toast.error(err?.response?.data?.message || "Failed to add subject.");
                }
              }}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#4834b8] rounded-lg"
            >
              Add Subject
            </button>
          </div>
        </div>
      </div>
    )}
    {viewSubjectOpen && viewSubject && (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {viewSubject.name} {viewSubject.code ? `(${viewSubject.code})` : ""}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Cross-class compulsory mapping, elective groups &amp; student enrollment</p>
            </div>
            <button type="button" onClick={() => setViewSubjectOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Subject Name</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{viewSubject.name}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Code</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{viewSubject.code || "—"}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Active Students</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{viewSubject.activeStudents || 0}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Compulsory Mapping</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {viewSubject.classes && viewSubject.classes.length > 0 ? viewSubject.classes.map((c) => c.name || c.label).join(", ") : "—"}
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Optional Elective Groups</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">—</div>
            </div>
          </div>
          <div className="px-5 py-4 border-t border-slate-200 flex justify-end">
            <button type="button" onClick={() => setViewSubjectOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg">Close</button>
          </div>
        </div>
      </div>
    )}
    {editSubjectOpen && editSubject && (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Edit Subject in Catalog</h3>
            <button type="button" onClick={() => setEditSubjectOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">1. Subject Name *</label>
              <input
                type="text"
                value={editSubjectName}
                onChange={(e) => setEditSubjectName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">2. Subject Code (Optional — auto-generated if blank)</label>
              <input
                type="text"
                value={editSubjectCode}
                onChange={(e) => setEditSubjectCode(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
            <button type="button" onClick={() => setEditSubjectOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg">Cancel</button>
            <button
              type="button"
              onClick={async () => {
                if (!editSubjectName.trim()) { toast.error("Subject name is required"); return; }
                try {
                  await axios.put(`${API}/subjects/${editSubject._id}`, { name: editSubjectName.trim() }, { withCredentials: true });
                  toast.success("Subject updated successfully!");
                  setEditSubjectOpen(false);
                  fetchSubjects();
                } catch (err) {
                  toast.error(err?.response?.data?.message || "Failed to update subject.");
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
    {deleteSubjectOpen && deleteSubject && (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
          <div className="px-5 py-6 text-center">
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Delete Subject from Master?
            </h3>
            <p className="text-sm text-slate-600">
              Delete "{deleteSubject.name}" {deleteSubject.code ? `(${deleteSubject.code})` : ""}? It is currently mapped to curriculum rules or {deleteSubject.activeStudents || 0} student(s) and will be removed from all classes and optional groups.
            </p>
          </div>
          <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
            <button type="button" onClick={() => { setDeleteSubjectOpen(false); setDeleteSubject(null); }} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg">Cancel</button>
            <button
              type="button"
              onClick={async () => {
                if (!deleteSubject) return;
                try {
                  await axios.delete(`${API}/subjects/${deleteSubject._id}`, { withCredentials: true });
                  toast.success("Subject deleted successfully!");
                  setDeleteSubjectOpen(false);
                  setDeleteSubject(null);
                  fetchSubjects();
                } catch (err) {
                  toast.error(err?.response?.data?.message || "Failed to delete subject.");
                }
              }}
              className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}