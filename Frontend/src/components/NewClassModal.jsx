import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const API = import.meta.env.VITE_API_URL;

export default function NewClassModal({ open, onClose, onCreated }) {
  const [newClassName, setNewClassName] = useState("");
  const [sectionCount, setSectionCount] = useState(2);
  const [sectionNames, setSectionNames] = useState(["A", "B"]);
  const [maxStrength, setMaxStrength] = useState(40);
  const [streamMode, setStreamMode] = useState("direct");
  const [selectedStreams, setSelectedStreams] = useState([]);

  if (!open) return null;

  const totalSeats = sectionNames.length * (maxStrength || 0);

  const applySectionCount = (n) => {
    setSectionCount(n);
    const names = [];
    for (let i = 0; i < n; i++) names.push(String.fromCharCode(65 + i));
    setSectionNames(names);
  };

  const close = () => {
    setNewClassName("");
    setSectionCount(2);
    setSectionNames(["A", "B"]);
    setMaxStrength(40);
    setStreamMode("direct");
    setSelectedStreams([]);
    onClose();
  };

  const createClass = async () => {
    if (!newClassName.trim()) {
      toast.error("Class name is required");
      return;
    }
    try {
      await axios.post(
        `${API}/classes/create`,
        {
          name: newClassName.trim(),
          status: "Active",
          streamIds: [],
          details: sectionNames.map((name) => ({
            sectionId: null,
            roomNumber: "",
            teacherId: null,
            capacity: maxStrength || 40,
            subjectTeachers: [],
          })),
        },
        { withCredentials: true },
      );
      toast.success("Class created successfully!");
      close();
      if (onCreated) onCreated();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create class.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Create New Class — Sections &amp; Optional Streams Setup
            </h3>
          </div>
          <button type="button" onClick={close} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="p-5 space-y-4">
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
            <p className="text-[11px] text-slate-500">
              Creating {sectionNames.length} section(s): {sectionNames.join(", ")} ({totalSeats} total seats)
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
                onClick={() => { setStreamMode("direct"); setSelectedStreams([]); }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border ${streamMode === "direct" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300"}`}
              >
                No Streams (Direct Class)
              </button>
              <button
                type="button"
                onClick={() => setStreamMode("streams")}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border ${streamMode === "streams" ? "bg-[#4834b8] text-white border-[#4834b8]" : "bg-white text-slate-700 border-slate-300"}`}
              >
                Has Streams
              </button>
            </div>
            {streamMode === "streams" && (
              <div className="flex flex-wrap gap-2 mt-3">
                {["Science", "Commerce", "Arts", "Agriculture", "Sanskrit Sahitya"].map((name) => {
                  const selected = selectedStreams.includes(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        if (selected) setSelectedStreams(selectedStreams.filter((s) => s !== name));
                        else setSelectedStreams([...selectedStreams, name]);
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border ${selected ? "bg-[#4834b8] text-white border-[#4834b8]" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"}`}
                    >
                      {name}
                    </button>
                  );
                })}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add custom Stream name"
                    className="px-3 py-2 rounded-lg text-xs border border-slate-300 bg-white text-slate-700 min-w-[180px]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = e.target.value.trim();
                        if (!val) return;
                        if (!selectedStreams.includes(val)) setSelectedStreams([...selectedStreams, val]);
                        e.target.value = "";
                      }
                    }}
                    id="newClassCustomStream"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const inp = document.getElementById("newClassCustomStream");
                      const val = (inp?.value || "").trim();
                      if (!val) return;
                      if (!selectedStreams.includes(val)) setSelectedStreams([...selectedStreams, val]);
                      if (inp) inp.value = "";
                    }}
                    className="px-3 py-2 rounded-lg text-xs font-semibold bg-[#4834b8] text-white border border-[#4834b8] hover:bg-[#3a289c]"
                  >
                    Add stream
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onClick={close} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg">Cancel</button>
          <button type="button" onClick={close} className="px-4 py-2 text-sm font-semibold text-[#4834b8] bg-white border border-[#4834b8] rounded-lg">Create Class Only</button>
          <button
            type="button"
            onClick={createClass}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#4834b8] rounded-lg inline-flex items-center gap-1.5"
          >
            Create Class &amp; Assign Subjects →
          </button>
        </div>
      </div>
    </div>
  );
}
