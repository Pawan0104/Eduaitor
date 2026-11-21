import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const API = import.meta.env.VITE_API_URL;

export default function EditClassModal({
  open,
  classData,
  sections = [],
  streams = [],
  onClose,
  onSaved,
}) {
  const [className, setClassName] = useState("");
  const [status, setStatus] = useState("Active");
  const [classSections, setClassSections] = useState([]);
  const [streamIds, setStreamIds] = useState([]);
  const [newSectionName, setNewSectionName] = useState("");
  const [newStreamName, setNewStreamName] = useState("");
  const [saving, setSaving] = useState(false);
  const [localStreams, setLocalStreams] = useState(streams);

  useEffect(() => {
    setLocalStreams(streams);
  }, [streams]);

  useEffect(() => {
    if (!open || !classData) return;
    const details = (classData.details || []).map((d, index) => {
      const sectionId = d.sectionId?._id || d.sectionId || null;
      const master = sections.find((s) => String(s._id) === String(sectionId));
      return {
        key: d._id || `detail-${index}`,
        detailId: d._id,
        sectionId,
        name: master?.name || master?.sectionName || "Section",
        capacity: d.capacity || 40,
        roomNumber: d.roomNumber || "",
        teacherId: d.teacherId?._id || d.teacherId || null,
        subjectTeachers: d.subjectTeachers || [],
      };
    });
    const classId = String(classData._id || "");
    const linked = streams.filter(
      (st) =>
        (classData.streamIds || []).map(String).includes(String(st._id)) ||
        (st.classIds || []).map(String).includes(classId),
    );
    setClassName(classData.name || "");
    setStatus(classData.status || "Active");
    setClassSections(details);
    setStreamIds(
      (linked.length ? linked : classData.streamIds || []).map((s) =>
        String(s?._id || s),
      ),
    );
    setNewSectionName("");
    setNewStreamName("");
  }, [open, classData, sections, streams]);

  if (!open || !classData) return null;

  const updateSection = (index, field, value) => {
    setClassSections((prev) =>
      prev.map((section, idx) =>
        idx === index ? { ...section, [field]: value } : section,
      ),
    );
  };

  const addSection = () => {
    const name = String(newSectionName || "").trim();
    if (!name) {
      toast.error("Section name is required");
      return;
    }
    if (
      classSections.some(
        (s) => String(s.name || "").trim().toLowerCase() === name.toLowerCase(),
      )
    ) {
      toast.error("This section is already in the class");
      return;
    }
    setClassSections((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}`,
        detailId: null,
        sectionId: null,
        name,
        capacity: 40,
        roomNumber: "",
        teacherId: null,
        subjectTeachers: [],
      },
    ]);
    setNewSectionName("");
  };

  const removeSection = (index) => {
    setClassSections((prev) => prev.filter((_, idx) => idx !== index));
  };

  const toggleStream = (streamId) => {
    const id = String(streamId);
    setStreamIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const addStream = async () => {
    const name = String(newStreamName || "").trim();
    if (!name) {
      toast.error("Stream name is required");
      return;
    }
    const key = name.toLowerCase();
    let stream = localStreams.find(
      (s) => String(s.name || "").trim().toLowerCase() === key,
    );
    if (!stream) {
      try {
        const response = await axios.post(
          `${API}/streams/create`,
          {
            name,
            status: "Active",
            compulsorySubjectIds: [],
            allowEmptyCompulsorySubjects: true,
          },
          { withCredentials: true },
        );
        stream = response.data?.data || response.data?.stream;
        if (stream?._id) setLocalStreams((prev) => [...prev, stream]);
      } catch (err) {
        toast.error(
          err?.response?.data?.message || "Could not add stream to the school.",
        );
        return;
      }
    }
    if (stream?._id && !streamIds.includes(String(stream._id))) {
      setStreamIds((prev) => [...prev, String(stream._id)]);
    }
    setNewStreamName("");
  };

  const save = async () => {
    if (!className.trim()) {
      toast.error("Class name is required");
      return;
    }
    if (classSections.some((s) => !String(s.name || "").trim())) {
      toast.error("All section names are required");
      return;
    }
    setSaving(true);
    try {
      const details = [];
      for (const section of classSections) {
        const name = String(section.name || "").trim();
        let sectionId = section.sectionId;
        const master = sections.find(
          (s) => String(s._id) === String(sectionId),
        );
        if (master) {
          const currentName = String(master.name || master.sectionName || "").trim();
          if (currentName !== name) {
            await axios.put(
              `${API}/sections/update/${sectionId}`,
              { name },
              { withCredentials: true },
            );
          }
        } else {
          const existing = sections.find(
            (s) =>
              String(s.name || s.sectionName || "").trim().toLowerCase() ===
              name.toLowerCase(),
          );
          if (existing) {
            sectionId = existing._id;
          } else {
            const response = await axios.post(
              `${API}/sections/create`,
              { name, status: "Active" },
              { withCredentials: true },
            );
            const created = response.data?.section || response.data?.data;
            if (!created?._id) throw new Error(`Could not create section ${name}`);
            sectionId = created._id;
          }
        }
        details.push({
          _id: section.detailId,
          sectionId,
          roomNumber: section.roomNumber || "",
          teacherId: section.teacherId || null,
          capacity: Number(section.capacity) || 40,
          subjectTeachers: (section.subjectTeachers || []).map((st) => ({
            subjectId: st.subjectId?._id || st.subjectId,
            teacherId: st.teacherId?._id || st.teacherId || null,
          })),
        });
      }

      await axios.put(
        `${API}/classes/update/${classData._id}`,
        {
          name: className.trim(),
          status,
          streamIds,
          details,
        },
        { withCredentials: true },
      );
      toast.success("Class updated successfully!");
      if (onSaved) await onSaved();
      if (onClose) onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update class.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Edit Class — Full Setup
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Update class details, sections, strength, rooms and streams in one place.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-5 flex-1 overflow-y-auto min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Class Name *
              </label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-700 mb-2">
              Sections, Strength &amp; Rooms
            </p>
            <div className="space-y-2">
              {classSections.map((section, index) => (
                <div
                  key={section.key || index}
                  className="grid grid-cols-[1fr_90px_1fr_32px] gap-2 items-end rounded-lg border border-slate-200 bg-white p-2"
                >
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                      Section Name
                    </label>
                    <input
                      type="text"
                      value={section.name}
                      onChange={(e) => updateSection(index, "name", e.target.value)}
                      className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                      Strength
                    </label>
                    <input
                      type="number"
                      value={section.capacity}
                      onChange={(e) =>
                        updateSection(index, "capacity", Number(e.target.value) || 0)
                      }
                      className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                      Room / Wing
                    </label>
                    <input
                      type="text"
                      value={section.roomNumber}
                      onChange={(e) => updateSection(index, "roomNumber", e.target.value)}
                      placeholder="Optional"
                      className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSection(index)}
                    aria-label={`Remove section ${index + 1}`}
                    className="h-8 w-8 rounded-md bg-rose-50 text-rose-600 hover:bg-rose-100 text-sm font-bold"
                  >
                    ×
                  </button>
                </div>
              ))}
              {classSections.length === 0 && (
                <p className="text-[11px] text-slate-400">
                  No sections linked to this class.
                </p>
              )}
            </div>
            <div className="flex gap-2 mt-3">
              <input
                type="text"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSection();
                  }
                }}
                placeholder="New section name, e.g. C"
                className="flex-1 border border-slate-300 rounded-md px-2.5 py-1.5 text-xs bg-white"
              />
              <button
                type="button"
                onClick={addSection}
                className="px-3 py-1.5 rounded-md bg-[#4834b8] text-white text-xs font-semibold hover:bg-[#3a289c]"
              >
                Add Section
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-700">Academic Streams</p>
              <span className="text-[10px] text-slate-400">
                check to include for this class
              </span>
            </div>
            {localStreams.length === 0 ? (
              <p className="text-[11px] text-slate-400">
                No school streams available.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {localStreams.map((stream) => (
                  <label
                    key={stream._id}
                    className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={streamIds.includes(String(stream._id))}
                      onChange={() => toggleStream(stream._id)}
                      className="w-3.5 h-3.5 accent-[#4834b8]"
                    />
                    <span className="truncate">{stream.name}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <input
                type="text"
                value={newStreamName}
                onChange={(e) => setNewStreamName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addStream();
                  }
                }}
                placeholder="Add new stream to the school"
                className="flex-1 border border-slate-300 rounded-md px-2.5 py-1.5 text-xs bg-white"
              />
              <button
                type="button"
                onClick={addStream}
                className="px-3 py-1.5 rounded-md bg-[#4834b8] text-white text-xs font-semibold hover:bg-[#3a289c]"
              >
                Add Stream
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2 shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#4834b8] rounded-lg disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
