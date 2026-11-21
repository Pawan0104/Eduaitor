import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import QuickAddStreams from "./QuickAddStreams";
import { getSchoolStreamNames } from "../utils/streamNames";

const API = import.meta.env.VITE_API_URL;

export default function NewClassModal({ open, onClose, onCreated }) {
  const [newClassName, setNewClassName] = useState("");
  const [sectionCount, setSectionCount] = useState(2);
  const [sectionNames, setSectionNames] = useState(["A", "B"]);
  const [maxStrength, setMaxStrength] = useState(40);
  const [streamMode, setStreamMode] = useState("direct");
  const [availableStreams, setAvailableStreams] = useState([]);
  const [schoolStreams, setSchoolStreams] = useState([]);
  const [selectedStreams, setSelectedStreams] = useState([]);
  const [customStreamName, setCustomStreamName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    axios
      .get(`${API}/streams/all`, {
        params: { status: "Active" },
        withCredentials: true,
      })
      .then((res) => {
        const list = res.data?.streams || res.data?.data || [];
        setSchoolStreams(list);
        setAvailableStreams(getSchoolStreamNames(list));
      })
      .catch(() => {
        setSchoolStreams([]);
        setAvailableStreams([]);
      });
  }, [open]);

  if (!open) return null;

  const totalSeats = sectionNames.length * (maxStrength || 0);

  const isSelected = (name) =>
    selectedStreams.some(
      (s) => String(s).toLowerCase() === String(name).trim().toLowerCase(),
    );

  const findSchoolStream = (name) =>
    schoolStreams.find(
      (s) =>
        String(s.name || "").trim().toLowerCase() ===
        String(name || "").trim().toLowerCase(),
    );

  const addNewStreamToList = async (value) => {
    const trimmed = String(value || "").trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();

    let saved = findSchoolStream(trimmed);

    if (!saved) {
      try {
        const response = await axios.post(
          `${API}/streams/create`,
          {
            name: trimmed,
            status: "Active",
            compulsorySubjectIds: [],
            allowEmptyCompulsorySubjects: true,
          },
          { withCredentials: true },
        );
        const created = response.data?.data || response.data?.stream;
        if (!created?._id) throw new Error("Stream was not saved");
        saved = created;
        setSchoolStreams((prev) => [...prev, created]);
      } catch (err) {
        const message = String(err?.response?.data?.message || "");
        if (/already exists/i.test(message)) {
          const refreshed = await axios
            .get(`${API}/streams/all`, {
              params: { status: "Active" },
              withCredentials: true,
            })
            .catch(() => ({ data: {} }));
          const list = refreshed.data?.streams || refreshed.data?.data || [];
          saved = list.find(
            (s) => String(s.name || "").trim().toLowerCase() === key,
          );
          if (saved) setSchoolStreams(list);
        } else {
          toast.error(message || "Could not save stream to the school.");
          return;
        }
      }
    }

    if (!saved) {
      toast.error("Could not save stream to the school.");
      return;
    }

    const canonical = String(saved.name || trimmed).trim();
    setAvailableStreams((prev) =>
      getSchoolStreamNames([...prev.map((name) => ({ name })), saved]),
    );
    setSelectedStreams((prev) =>
      prev.some((s) => String(s).toLowerCase() === key)
        ? prev
        : [...prev, canonical],
    );
    setCustomStreamName("");
  };

  const removeStreamFromList = async (name) => {
    const key = String(name || "").trim().toLowerCase();
    const saved = findSchoolStream(name);
    if (saved?._id) {
      try {
        await axios.delete(`${API}/streams/delete/${saved._id}`, {
          withCredentials: true,
        });
        setSchoolStreams((prev) => prev.filter((s) => s._id !== saved._id));
        toast.success(`${name} deleted from school streams.`);
      } catch (err) {
        toast.error(
          err?.response?.data?.message || `Could not delete ${name} from the school.`,
        );
        return;
      }
    } else {
      toast.info(`${name} removed from this class only; no saved school stream found.`);
    }
    setAvailableStreams((prev) =>
      prev.filter((s) => String(s).toLowerCase() !== key),
    );
    setSelectedStreams((prev) =>
      prev.filter((s) => String(s).toLowerCase() !== key),
    );
  };

  const toggleStreamSelection = (name) => {
    const key = String(name).toLowerCase();
    setSelectedStreams((prev) => {
      if (prev.some((s) => String(s).toLowerCase() === key)) {
        return prev.filter((s) => String(s).toLowerCase() !== key);
      }
      const canonical =
        availableStreams.find((s) => String(s).toLowerCase() === key) || name;
      return [...prev, canonical];
    });
  };

  const applySectionCount = (n) => {
    setSectionCount(n);
    setSectionNames((prev) => {
      const names = [...prev];
      while (names.length < n) names.push(String.fromCharCode(65 + names.length));
      while (names.length > n) names.pop();
      return names;
    });
  };

  const updateSectionName = (index, value) => {
    setSectionNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const close = () => {
    setNewClassName("");
    setSectionCount(2);
    setSectionNames(["A", "B"]);
    setMaxStrength(40);
    setStreamMode("direct");
    setAvailableStreams(getSchoolStreamNames(schoolStreams));
    setSelectedStreams([]);
    setCustomStreamName("");
    setCreating(false);
    onClose();
  };

  const resolveSectionIds = async () => {
    const { data } = await axios.get(`${API}/sections/all`, {
      withCredentials: true,
    });
    const existing = data?.sections || data?.data || [];
    const byName = new Map(
      existing.map((s) => [String(s.name || "").trim().toLowerCase(), s._id]),
    );
    const ids = [];
    for (const name of sectionNames) {
      const trimmed = String(name || "").trim();
      if (!trimmed) {
        ids.push(null);
        continue;
      }
      const key = trimmed.toLowerCase();
      if (byName.has(key)) {
        ids.push(byName.get(key));
        continue;
      }
      const res = await axios.post(
        `${API}/sections/create`,
        { name: trimmed, status: "Active" },
        { withCredentials: true },
      );
      const created = res.data?.section || res.data?.data;
      if (created?._id) {
        byName.set(key, created._id);
        ids.push(created._id);
      } else {
        ids.push(null);
      }
    }
    return ids;
  };

  const createClass = async () => {
    if (!newClassName.trim()) {
      toast.error("Class name is required");
      return;
    }
    if (sectionNames.some((n) => !String(n || "").trim())) {
      toast.error("All section names are required");
      return;
    }
    setCreating(true);
    try {
      const sectionIds = await resolveSectionIds();
      await axios.post(
        `${API}/classes/create`,
        {
          name: newClassName.trim(),
          status: "Active",
          streamIds: schoolStreams
            .filter((s) => isSelected(s.name))
            .map((s) => s._id),
          details: sectionNames.map((name, i) => ({
            sectionId: sectionIds[i] || null,
            roomNumber: "",
            teacherId: null,
            capacity: maxStrength || 40,
            subjectTeachers: [],
          })),
        },
        { withCredentials: true },
      );
      toast.success("Class created successfully!");
      if (onCreated) await onCreated();
      close();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create class.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Create New Class — Sections &amp; Optional Streams Setup
            </h3>
          </div>
          <button type="button" onClick={close} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="p-5 space-y-4 flex-1 overflow-y-auto min-h-0">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">1. Class Name *</label>
            <input
              type="text"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="e.g. 5th , LKG ,12th"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
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
                    onClick={() => applySectionCount(n)}
                    className={`w-8 h-8 rounded-md text-xs font-mono font-bold flex items-center justify-center border ${selected ? "bg-[#4834b8] text-white border-[#4834b8]" : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"}`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <div className="space-y-2 mt-2">
              {sectionNames.map((name, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-500 w-16">Section {idx + 1}</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => updateSectionName(idx, e.target.value)}
                    placeholder={`e.g. ${String.fromCharCode(65 + idx)}`}
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Creating {sectionNames.length} section(s): {sectionNames.filter(Boolean).join(", ")} ({totalSeats} total seats)
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">3. Max Strength per Section</label>
            <input
              type="number"
              value={maxStrength}
              onChange={(e) => setMaxStrength(Number(e.target.value) || 0)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">4. Does this Class have Academic Streams? (Optional)</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setStreamMode("direct"); setSelectedStreams([]); setCustomStreamName(""); }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border ${streamMode === "direct" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300"}`}
              >
                No Streams (Direct Class)
              </button>
              <button
                type="button"
                onClick={() => {
                  setStreamMode("streams");
                  setSelectedStreams((prev) =>
                    prev.length > 0 ? prev : [...availableStreams],
                  );
                }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border ${streamMode === "streams" ? "bg-[#4834b8] text-white border-[#4834b8]" : "bg-white text-slate-700 border-slate-300"}`}
              >
                Has Streams
              </button>
            </div>
            {streamMode === "streams" && (
              <div className="mt-3 space-y-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-semibold text-slate-600">
                      Available streams for this class (live): {availableStreams.length}
                    </p>
                    <span className="text-[10px] text-slate-400">× remove · ☑ include</span>
                  </div>
                  {availableStreams.length === 0 ? (
                    <p className="text-[11px] text-slate-400">No streams available. Add a new stream below.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {availableStreams.map((name) => (
                        <div key={name} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5">
                          <button
                            type="button"
                            onClick={() => removeStreamFromList(name)}
                            className="w-5 h-5 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-bold leading-none shrink-0"
                            aria-label={`Remove ${name}`}
                          >
                            ×
                          </button>
                          <label className="flex items-center gap-2 flex-1 text-xs text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected(name)}
                              onChange={() => toggleStreamSelection(name)}
                              className="w-3.5 h-3.5 accent-[#4834b8]"
                            />
                            <span className="truncate">{name}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                  <QuickAddStreams
                    availableStreams={availableStreams}
                    onAdd={addNewStreamToList}
                  />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 mb-1.5">
                    Add a new stream (appears in the list immediately)
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customStreamName}
                      onChange={(e) => setCustomStreamName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addNewStreamToList(customStreamName);
                        }
                      }}
                      placeholder="Add new Stream name"
                      className="px-3 py-2 rounded-lg text-xs border border-slate-300 bg-white text-slate-700 min-w-[180px] flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => addNewStreamToList(customStreamName)}
                      disabled={!customStreamName.trim()}
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
          <button type="button" onClick={close} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg">Cancel</button>
          <button type="button" onClick={createClass} disabled={creating} className="px-4 py-2 text-sm font-semibold text-[#4834b8] bg-white border border-[#4834b8] rounded-lg disabled:opacity-60">Create Class</button>
          <button
            type="button"
            onClick={createClass}
            disabled={creating}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#4834b8] rounded-lg inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create Class & Assign Subjects →"}
          </button>
        </div>
      </div>
    </div>
  );
}
