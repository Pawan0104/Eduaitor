import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";
import AcademicHeaderActions from "../components/AcademicHeaderActions";
import EditClassModal from "../components/EditClassModal";
import QuickAddStreams from "../components/QuickAddStreams";
import { sortClassesByName } from "../utils/sortClasses";
import { getSchoolStreamNames } from "../utils/streamNames";

const API = import.meta.env.VITE_API_URL;

export default function ClassesSubjects() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher_admin";

  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [activeTab, setActiveTab] = useState("classes");

  // New Class modal state
  const [newClassOpen, setNewClassOpen] = useState(false);
  // Roster modal state
  const [rosterOpen, setRosterOpen] = useState(false);
  const [rosterSection, setRosterSection] = useState(null);
  const [sectionMenuIndex, setSectionMenuIndex] = useState(null);
  const [rosterStudents, setRosterStudents] = useState([]);
  const [monitorOpen, setMonitorOpen] = useState(false);
  const [monitorSection, setMonitorSection] = useState(null);
  const [monitorStudents, setMonitorStudents] = useState([]);
  const [monitorLoading, setMonitorLoading] = useState(false);
  const [rollNoOpen, setRollNoOpen] = useState(false);
  const [rollNoSection, setRollNoSection] = useState(null);
  const [rollNoStudents, setRollNoStudents] = useState([]);
  const [rollNoLoading, setRollNoLoading] = useState(false);
  const [rollNoOrder, setRollNoOrder] = useState("alpha");
  const [rollNoStart, setRollNoStart] = useState(1);
  // Add Section modal state
  const [newSectionOpen, setNewSectionOpen] = useState(false);
  const [newSectionNames, setNewSectionNames] = useState("");
  const [newSectionCapacity, setNewSectionCapacity] = useState(40);
  const [newSectionRoom, setNewSectionRoom] = useState("");
  // Add Stream modal state
  const [newStreamOpen, setNewStreamOpen] = useState(false);
  const [newStreamName, setNewStreamName] = useState("");
  const [streamSubjects, setStreamSubjects] = useState([]);
  const [selectedStreamSubjectIds, setSelectedStreamSubjectIds] = useState([]);
  // Edit Section modal state
  const [editSectionOpen, setEditSectionOpen] = useState(false);
  const [editSectionClass, setEditSectionClass] = useState(null);
  const [editSectionDetail, setEditSectionDetail] = useState(null);
  const [editSectionName, setEditSectionName] = useState("");
  const [editSectionCapacity, setEditSectionCapacity] = useState(40);
  const [editSectionRoom, setEditSectionRoom] = useState("");
  const [rosterLoading, setRosterLoading] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [sectionCount, setSectionCount] = useState(2);
  const [sectionNames, setSectionNames] = useState(["A", "B"]);
  const [sectionInput, setSectionInput] = useState("A, B");
  const [maxStrength, setMaxStrength] = useState(40);
  const [roomNumber, setRoomNumber] = useState("");
  const [streamMode, setStreamMode] = useState("direct"); // "direct" | "streams"
  const [availableClassStreams, setAvailableClassStreams] = useState([]);
  const [selectedStreams, setSelectedStreams] = useState([]);
  const [customClassStreamName, setCustomClassStreamName] = useState("");
  const [creatingClass, setCreatingClass] = useState(false);

  // Full class-edit modal state
  const [editClassOpen, setEditClassOpen] = useState(false);
  const [editClassData, setEditClassData] = useState(null);
  const [editClassName, setEditClassName] = useState("");
  const [editClassStatus, setEditClassStatus] = useState("Active");
  const [editClassSections, setEditClassSections] = useState([]);
  const [editClassStreamIds, setEditClassStreamIds] = useState([]);
  const [newEditSectionName, setNewEditSectionName] = useState("");
  const [newEditStreamName, setNewEditStreamName] = useState("");
  const [savingClass, setSavingClass] = useState(false);

  const fetchAll = async () => {
    try {
      setLoading(true);
      if (isTeacher) {
        const [cls] = await Promise.all([
          axios.get(`${API}/classes/teacher/my-classes`, { withCredentials: true }),
        ]);
        setClasses(sortClassesByName(cls.data.classes || []));
      } else {
        const [cls, sec, strm] = await Promise.all([
          axios.get(`${API}/classes/all`, { withCredentials: true }),
          axios.get(`${API}/sections/all`, { withCredentials: true }),
          axios.get(`${API}/streams/all`, { params: { status: "Active" }, withCredentials: true }),
        ]);
        setClasses(sortClassesByName(cls.data.classes || []));
        setSections(sec.data.sections || []);
        setStreams(strm.data?.streams || strm.data?.data || []);
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

  useEffect(() => {
    if (!selectedClassId && classes.length) setSelectedClassId(classes[0]._id);
  }, [classes, selectedClassId]);

  const selectedClass = classes.find((c) => c._id === selectedClassId);

  const sectionsForClass = (cls) =>
    (cls?.details || []).map((d) => {
      const sec = sections.find((s) => s._id === (d.sectionId?._id || d.sectionId));
      return { ...d, sectionName: sec?.name || sec?.sectionName || "Section" };
    });

  const streamsForClass = (cls) => {
    const classId = String(cls?._id || "");
    return (streams || []).filter(
      (st) =>
        (cls?.streamIds || []).map(String).includes(String(st._id)) ||
        (st.classIds || []).map(String).includes(classId),
    );
  };

  const openEditClassModal = (cls) => {
    setEditClassData(cls);
    setEditClassName(cls.name || "");
    setEditClassStatus(cls.status || "Active");
    setEditClassSections(
      sectionsForClass(cls).map((d, index) => ({
        key: d._id || `detail-${index}`,
        detailId: d._id,
        sectionId: d.sectionId?._id || d.sectionId || null,
        name: d.sectionName || "",
        capacity: d.capacity || 40,
        roomNumber: d.roomNumber || "",
        teacherId: d.teacherId?._id || d.teacherId || null,
        subjectTeachers: d.subjectTeachers || [],
      })),
    );
    const linked = streamsForClass(cls);
    setEditClassStreamIds(
      (linked.length ? linked : cls.streamIds || []).map((s) =>
        String(s?._id || s),
      ),
    );
    setNewEditSectionName("");
    setNewEditStreamName("");
    setEditClassOpen(true);
  };

  const updateEditSection = (index, field, value) => {
    setEditClassSections((prev) =>
      prev.map((section, idx) =>
        idx === index ? { ...section, [field]: value } : section,
      ),
    );
  };

  const addEditSection = () => {
    const name = String(newEditSectionName || "").trim();
    if (!name) {
      toast.error("Section name is required");
      return;
    }
    if (
      editClassSections.some(
        (s) => String(s.name || "").trim().toLowerCase() === name.toLowerCase(),
      )
    ) {
      toast.error("This section is already in the class");
      return;
    }
    setEditClassSections((prev) => [
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
    setNewEditSectionName("");
  };

  const removeEditSection = (index) => {
    setEditClassSections((prev) => prev.filter((_, idx) => idx !== index));
  };

  const toggleEditStream = (streamId) => {
    const id = String(streamId);
    setEditClassStreamIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const addEditStream = async () => {
    const name = String(newEditStreamName || "").trim();
    if (!name) {
      toast.error("Stream name is required");
      return;
    }
    const key = name.toLowerCase();
    let stream = streams.find(
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
        if (stream?._id) setStreams((prev) => [...prev, stream]);
      } catch (err) {
        toast.error(
          err?.response?.data?.message || "Could not add stream to the school.",
        );
        return;
      }
    }
    if (stream?._id && !editClassStreamIds.includes(String(stream._id))) {
      setEditClassStreamIds((prev) => [...prev, String(stream._id)]);
    }
    setNewEditStreamName("");
  };

  const saveEditedClass = async () => {
    if (!editClassData) return;
    if (!editClassName.trim()) {
      toast.error("Class name is required");
      return;
    }
    if (editClassSections.some((s) => !String(s.name || "").trim())) {
      toast.error("All section names are required");
      return;
    }
    setSavingClass(true);
    try {
      const resolvedDetails = [];
      for (const section of editClassSections) {
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
        resolvedDetails.push({
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
        `${API}/classes/update/${editClassData._id}`,
        {
          name: editClassName.trim(),
          status: editClassStatus,
          streamIds: editClassStreamIds,
          details: resolvedDetails,
        },
        { withCredentials: true },
      );
      toast.success("Class updated successfully!");
      setEditClassOpen(false);
      setEditClassData(null);
      await fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update class.");
    } finally {
      setSavingClass(false);
    }
  };

  const openAddStreamModal = async () => {
    if (!selectedClass) {
      toast.error("Select a class first.");
      return;
    }
    setNewStreamName("");
    try {
      const res = await axios.get(`${API}/subjects/all`, { withCredentials: true });
      const list = res.data?.subjects || res.data?.data || [];
      setStreamSubjects(list);
      setSelectedStreamSubjectIds(list.map((s) => s._id));
    } catch {
      setStreamSubjects([]);
      setSelectedStreamSubjectIds([]);
    }
    setNewStreamOpen(true);
  };

  const handleAddStreams = async () => {
    const names = newStreamName.trim() ? [newStreamName.trim()] : [];
    if (!names.length) {
      toast.error("Stream name is required");
      return;
    }
    if (!selectedStreamSubjectIds.length) {
      toast.error("Select at least one compulsory subject for the stream");
      return;
    }
    try {
      const existingByName = new Map(
        streams.map((st) => [String(st.name || "").trim().toLowerCase(), st]),
      );
      const linkedIds = [
        ...(selectedClass.streamIds || []),
        ...streamsForClass(selectedClass),
      ]
        .map((s) => s?._id || s)
        .map(String)
        .filter(Boolean);
      const createdIds = [];

      for (const name of names) {
        const key = name.trim().toLowerCase();
        let stream = existingByName.get(key);
        if (!stream) {
          const res = await axios.post(
            `${API}/streams/create`,
            {
              name: name.trim(),
              classIds: [selectedClass._id],
              compulsorySubjectIds: selectedStreamSubjectIds,
              status: "Active",
            },
            { withCredentials: true },
          );
          stream = res.data?.data || res.data?.stream;
        }
        if (stream?._id) {
          createdIds.push(String(stream._id));
          existingByName.set(key, stream);
        }
      }

      await axios.put(
        `${API}/classes/update/${selectedClass._id}`,
        {
          name: selectedClass.name,
          status: selectedClass.status || "Active",
          streamIds: [...new Set([...linkedIds, ...createdIds])],
          details: (selectedClass.details || []).map((d) => ({
            _id: d._id,
            sectionId: d.sectionId?._id || d.sectionId || null,
            roomNumber: d.roomNumber || "",
            teacherId: d.teacherId?._id || d.teacherId || null,
            capacity: d.capacity || 40,
            subjectTeachers: (d.subjectTeachers || []).map((st) => ({
              subjectId: st.subjectId?._id || st.subjectId,
              teacherId: st.teacherId?._id || st.teacherId || null,
            })),
          })),
        },
        { withCredentials: true },
      );

      toast.success("Stream added successfully!");
      setNewStreamOpen(false);
      await fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to add stream.");
    }
  };

  const totalSeats = sectionNames.length * (maxStrength || 0);

  const applySectionCount = (n) => {
    setSectionCount(n);
    const names = [];
    for (let i = 0; i < n; i++) names.push(String.fromCharCode(65 + i));
    setSectionNames(names);
    setSectionInput(names.join(", "));
  };

  const handleSectionInput = (val) => {
    setSectionInput(val);
    const names = val.split(",").map((x) => x.trim()).filter(Boolean);
    if (names.length > 0) {
      setSectionNames(names);
      setSectionCount(names.length);
    }
  };

  const updateSectionName = (index, value) => {
    setSectionNames((prev) =>
      prev.map((name, idx) => (idx === index ? value : name)),
    );
    setSectionInput((prev) => {
      const values = prev.split(",").map((part, idx) =>
        idx === index ? value : part.trim(),
      );
      return values.join(", ");
    });
  };

  const isClassStreamSelected = (name) =>
    selectedStreams.some(
      (s) => String(s).toLowerCase() === String(name).trim().toLowerCase(),
    );

  const findSchoolStream = (name) =>
    streams.find(
      (s) =>
        String(s.name || "").trim().toLowerCase() ===
        String(name || "").trim().toLowerCase(),
    );

  const addNewClassStreamToList = async (value) => {
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
        setStreams((prev) => [...prev, created]);
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
          if (saved) setStreams(list);
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
    setAvailableClassStreams((prev) =>
      getSchoolStreamNames([...prev.map((name) => ({ name })), saved]),
    );
    setSelectedStreams((prev) =>
      prev.some((s) => String(s).toLowerCase() === key)
        ? prev
        : [...prev, canonical],
    );
    setCustomClassStreamName("");
  };

  const removeClassStreamFromList = async (name) => {
    const key = String(name || "").trim().toLowerCase();
    const saved = findSchoolStream(name);
    if (saved?._id) {
      try {
        await axios.delete(`${API}/streams/delete/${saved._id}`, {
          withCredentials: true,
        });
        setStreams((prev) => prev.filter((s) => s._id !== saved._id));
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

  const resetModal = () => {
    setNewClassName("");
    setSectionCount(2);
    setSectionNames(["A", "B"]);
    setSectionInput("A, B");
    setMaxStrength(40);
    setRoomNumber("");
    setStreamMode("direct");
    setAvailableClassStreams(getSchoolStreamNames(streams));
    setSelectedStreams([]);
    setCustomClassStreamName("");
    setCreatingClass(false);
  };

  const resolveClassSectionIds = async () => {
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

  const createClassFromModal = async () => {
    if (!newClassName.trim()) {
      toast.error("Class name is required");
      return;
    }
    if (sectionNames.some((n) => !String(n || "").trim())) {
      toast.error("All section names are required");
      return;
    }
    setCreatingClass(true);
    try {
      const sectionIds = await resolveClassSectionIds();
      const streamIds = streams
        .filter((s) => isClassStreamSelected(s.name))
        .map((s) => s._id);
      await axios.post(
        `${API}/classes/create`,
        {
          name: newClassName.trim(),
          status: "Active",
          streamIds,
          details: sectionNames.map((name, i) => ({
            sectionId: sectionIds[i] || null,
            roomNumber: roomNumber.trim()
              ? sectionNames.length > 1
                ? `${roomNumber.trim()}-${name.trim()}`
                : roomNumber.trim()
              : "",
            teacherId: null,
            capacity: maxStrength || 40,
            subjectTeachers: [],
          })),
        },
        { withCredentials: true },
      );
      toast.success("Class created successfully!");
      setNewClassOpen(false);
      resetModal();
      await fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create class.");
    } finally {
      setCreatingClass(false);
    }
  };

  if (loading) return <LoadingSpinner />;

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

      {/* Horizontal navbar */}
      <nav aria-label="Academic Setup Steps" className="bg-white border border-slate-200 rounded-xl p-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {[
          { key: "subjects", title: "Subjects Master", subtitle: "Full-page subject catalog", badge: "book", active: false },
          { key: "classes", title: "Class & Sections", subtitle: "Structure, strength & streams", badge: "1", active: true },
          { key: "compulsory", title: "Compulsory Subjects", subtitle: "Class & Stream fixed", badge: "2", active: false },
          { key: "optional", title: "Optional Groups", subtitle: "Common & Stream electives", badge: "3", active: false },
          { key: "teachers", title: "Teachers Assignment", subtitle: "Class & Subject Teachers", badge: "4", active: false },
          { key: "flow", title: "Flow Simulator", subtitle: "Test Class → Stream → Sec", badge: "eye", active: false },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          const activeCls = isActive ? "bg-[#4834b8] border-[#4834b8] text-white" : "bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100";
          const badgeCls = isActive ? "bg-white text-[#4834b8]" : (["check","2","3","4"].includes(tab.badge) ? "bg-emerald-600 text-white" : "bg-white border border-slate-300 text-slate-600");
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => { if (tab.key === "compulsory") { window.location.href = `${import.meta.env.BASE_URL}school/compulsory-subjects`; return; } if (tab.key === "optional") { window.location.href = `${import.meta.env.BASE_URL}school/optional-groups`; return; } if (tab.key === "teachers") { window.location.href = `${import.meta.env.BASE_URL}school/teachers-assignment`; return; } if (tab.key === "flow") { window.location.href = `${import.meta.env.BASE_URL}school/flow-simulator`; return; } if (tab.key === "subjects") { window.location.href = `${import.meta.env.BASE_URL}school/subjects-master`; return; } setActiveTab(tab.key); }}
              className={`px-3 py-2.5 rounded-lg border text-left transition flex items-start gap-2.5 cursor-pointer ${activeCls}`}
            >
              <span className={`w-6 h-6 rounded-md text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 ${badgeCls}`}>
                {tab.badge === "book" && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 7v14"></path><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path></svg>
                )}
                {tab.badge === "1" && "1"}
                {tab.badge === "check" && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>
                )}
                {["2","3","4"].includes(tab.badge) && tab.badge}
                {tab.badge === "eye" && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {tab.key === "classes" && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-85"><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"></path><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"></path><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"></path></svg>
                  )}
                  {tab.key === "compulsory" && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-85"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  )}
                  {tab.key === "optional" && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-85"><path d="M13 5h8"></path><path d="M13 12h8"></path><path d="M13 19h8"></path><path d="m3 17 2 2 4-4"></path><path d="m3 7 2 2 4-4"></path></svg>
                  )}
                  {tab.key === "teachers" && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-85"><path d="m16 11 2 2 4-4"></path><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                  )}
                  <span className="text-xs font-bold truncate">{tab.title}</span>
                </div>
                <div className={`text-[10.5px] truncate mt-0.5 ${isActive ? "text-indigo-100" : "text-slate-500"}`}>
                  {tab.subtitle}
                </div>
              </div>
            </button>
          );
        })}
      </nav>

      {activeTab !== "classes" && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
          Coming soon
        </div>
      )}

      {activeTab === "classes" && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Classes Directory */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Classes Directory
              </h3>
              <p className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                {classes.length} Active Classes
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetModal();
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
                className={`rounded-lg border px-3 py-2 text-xs transition cursor-pointer ${
                  selectedClassId === cls._id
                    ? "bg-[#4834b8]/10 border-[#4834b8] text-[#4834b8]"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-slate-900">{cls.name}</span>
                      <span className="text-[10px] font-mono tabular-nums text-slate-500">
                        {cls.details?.reduce((a, d) => a + (d.capacity || 0), 0) || 0} seats
                      </span>
                    </div>
                    <div className="text-[10.5px] text-slate-500 mt-0.5 font-mono tabular-nums truncate">
                      {cls.details?.length || 0} Sec · {(cls.streamIds || []).length > 0 ? `${cls.streamIds.length} Streams` : "Direct"} · {(() => {
                        const ids = new Set();
                        (cls.details || []).forEach((d) => {
                          (d.subjectTeachers || []).forEach((st) => {
                            const sid = st.subjectId?._id || st.subjectId;
                            if (sid) ids.add(String(sid));
                          });
                        });
                        return ids.size;
                      })()} Common
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      aria-label={`Edit ${cls.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditClassModal(cls);
                      }}
                      className="p-1 text-slate-400 hover:text-[#4834b8] rounded cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 21h8"></path><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"></path></svg>
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${cls.name}`}
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!window.confirm(`Delete class "${cls.name}"?`)) return;
                        try {
                          await axios.delete(`${API}/classes/delete/${cls._id}`, { withCredentials: true });
                          toast.success("Class deleted successfully!");
                          if (selectedClassId === cls._id) setSelectedClassId("");
                          fetchAll();
                        } catch (err) {
                          toast.error(err?.response?.data?.message || "Failed to delete class.");
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {classes.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">No classes yet.</p>
            )}
          </div>
        </div>

        {/* Sections & Strength */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Sections &amp; Strength Capacity
                {selectedClass ? ` — ${selectedClass.name}` : ""}
              </h3>

            </div>
            <div className="flex items-center gap-2 shrink-0">
              {selectedClass && (
                <span className="px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-[#4834b8] font-mono font-bold text-[11px] tabular-nums">
                  {sectionsForClass(selectedClass).length} Sec ({sectionsForClass(selectedClass).map((d) => d.sectionName).join(", ") || "—"})
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  if (!selectedClass) {
                    toast.error("Select a class first.");
                    return;
                  }
                  setNewSectionNames("");
                  setNewSectionCapacity(40);
                  setNewSectionRoom("");
                  setNewSectionOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-[#4834b8] hover:bg-[#3a289c] text-white font-bold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer text-[11px]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
                <span>Add Section(s)</span>
              </button>
            </div>
          </div>
          <div className="space-y-2.5">
            {selectedClass ? (
              sectionsForClass(selectedClass).length > 0 ? (
                sectionsForClass(selectedClass).map((d, i) => {
                  const cap = d.capacity || 0;
                  const enrolled = 0;
                  const free = Math.max(cap - enrolled, 0);
                  const pct = cap > 0 ? Math.round((enrolled / cap) * 100) : 0;
                  return (
                    <div key={i} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/40">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-[13px]">Section {d.sectionName}</span>
                            {d.roomNumber ? (
                              <span className="text-[11px] text-slate-500">· {d.roomNumber}</span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono tabular-nums font-bold text-xs text-slate-800">
                              {enrolled} / {cap} Students ({free} seats free)
                            </span>
                            <button
                              type="button"
                              onClick={async () => {
                                setRosterSection(d);
                                setRosterOpen(true);
                                setRosterLoading(true);
                                setRosterStudents([]);
                                try {
                                  const res = await axios.get(`${API}/students`, {
                                    params: { classId: selectedClass._id, status: "all" },
                                    withCredentials: true,
                                  });
                                  const all = res.data?.data || res.data || [];
                                  const secId = d.sectionId?._id || d.sectionId;
                                  const filtered = (Array.isArray(all) ? all : []).filter(
                                    (st) => String(st.sectionId?._id || st.sectionId) === String(secId),
                                  );
                                  setRosterStudents(filtered);
                                } catch (err) {
                                  toast.error(err?.response?.data?.message || "Failed to load roster.");
                                } finally {
                                  setRosterLoading(false);
                                }
                              }}
                              className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 text-[#4834b8] text-[11px] font-semibold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><path d="M16 3.128a4 4 0 0 1 0 7.744"></path><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><circle cx="9" cy="7" r="4"></circle></svg>
                              <span>Roster</span>
                            </button>
                            <div className="relative inline-block text-left">
                              <button
                                type="button"
                                aria-label={`Actions for Section ${d.sectionName}`}
                                onClick={() => setSectionMenuIndex(sectionMenuIndex === i ? null : i)}
                                className="inline-flex items-center justify-center px-2 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                              </button>
                              {sectionMenuIndex === i && (
                                <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-10 py-1">
                                  <button type="button" onClick={() => { setSectionMenuIndex(null); setRosterSection(d); setRosterOpen(true); }} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">View Section Roster</button>
                                  <button type="button" onClick={async () => { setSectionMenuIndex(null); setMonitorSection(d); setMonitorOpen(true); setMonitorLoading(true); setMonitorStudents([]); try { const res = await axios.get(`${API}/students`, { params: { classId: selectedClass._id, status: "all" }, withCredentials: true }); const all = res.data?.data || res.data || []; const secId = d.sectionId?._id || d.sectionId; const filtered = (Array.isArray(all) ? all : []).filter((st) => String(st.sectionId?._id || st.sectionId) === String(secId)); setMonitorStudents(filtered); } catch (err) { toast.error(err?.response?.data?.message || "Failed to load students."); } finally { setMonitorLoading(false); } }} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">Assign Class Monitor</button>
                                  <button type="button" onClick={async () => { setSectionMenuIndex(null); setRollNoSection(d); setRollNoOpen(true); setRollNoLoading(true); setRollNoStudents([]); try { const res = await axios.get(`${API}/students`, { params: { classId: selectedClass._id, status: "all" }, withCredentials: true }); const all = res.data?.data || res.data || []; const secId = d.sectionId?._id || d.sectionId; const filtered = (Array.isArray(all) ? all : []).filter((st) => String(st.sectionId?._id || st.sectionId) === String(secId)); setRollNoStudents(filtered); } catch (err) { toast.error(err?.response?.data?.message || "Failed to load students."); } finally { setRollNoLoading(false); } }} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">Auto-Assign Roll No.</button>
                                  <button type="button" onClick={() => { setSectionMenuIndex(null); setEditSectionClass(selectedClass); setEditSectionDetail(d); setEditSectionName(d.sectionName || ""); setEditSectionCapacity(d.capacity || 40); setEditSectionRoom(d.roomNumber || ""); setEditSectionOpen(true); }} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">Edit Section Details</button>
                                  <button type="button" onClick={() => { setSectionMenuIndex(null); if (window.confirm(`Delete section ${d.sectionName}?`)) toast.info("Delete section coming soon."); }} className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50">Delete Section</button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full transition-all bg-[#4834b8]" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="space-y-2">
                  {["A", "B", "C"].map((letter) => (
                    <div
                      key={letter}
                      className="p-3.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/40 text-xs text-slate-400"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-500 text-[13px]">Section {letter}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono tabular-nums font-bold text-xs text-slate-500">0 / — Students (— seats free)</span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full transition-all bg-slate-300" style={{ width: "0%" }}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">
                Select a class to view sections.
              </p>
            )}
          </div>
        </div>

        {/* Academic Streams */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Academic Streams (Optional)
                {selectedClass ? ` — ${selectedClass.name}` : ""}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Assign optional streams to this class.
              </p>
            </div>
            <button
              type="button"
              onClick={openAddStreamModal}
              className="px-3 py-1.5 rounded-lg bg-[#4834b8] hover:bg-[#3a289c] text-white font-bold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer text-[11px]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
              <span>Add Stream</span>
            </button>
          </div>
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-0.5">
            {selectedClass ? (
              streamsForClass(selectedClass).map((st) => (
                <div
                  key={st._id}
                  className="rounded-lg border border-slate-200 bg-slate-50/40 p-3 text-xs"
                >
                  <div className="font-bold text-slate-900">{st.name}</div>
                  {st.compulsorySubjectIds?.length ? (
                    <div className="text-[10.5px] text-slate-500 mt-0.5">
                      {st.compulsorySubjectIds.length} compulsory subjects
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">
                Select a class to view streams.
              </p>
            )}
            {selectedClass && streamsForClass(selectedClass).length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">No streams assigned.</p>
            )}
          </div>
        </div>
      </div>
      )}
      {/* Bottom navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => (window.location.href = `${import.meta.env.BASE_URL}school/subjects-master`)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path></svg>
          Subject Master
        </button>
        <button
          type="button"
          onClick={() => (window.location.href = `${import.meta.env.BASE_URL}school/compulsory-subjects`)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4834b8] hover:bg-[#3a289c] text-white text-sm font-semibold cursor-pointer"
        >
          Next Step: Compulsory Subject
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
        </button>
      </div>
    </div>
    {newSectionOpen && (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Add Section(s)</h3>
              {selectedClass && (
                <p className="text-xs text-slate-500 mt-0.5">For class: {selectedClass.name}</p>
              )}
            </div>
            <button type="button" onClick={() => setNewSectionOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Section Name(s) *</label>
              <input
                type="text"
                value={newSectionNames}
                onChange={(e) => setNewSectionNames(e.target.value)}
                placeholder="E.G. C, D OR A, B"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Max Strength</label>
              <input
                type="number"
                value={newSectionCapacity}
                onChange={(e) => setNewSectionCapacity(Number(e.target.value) || 0)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Room / Wing Label (Optional)</label>
              <input
                type="text"
                value={newSectionRoom}
                onChange={(e) => setNewSectionRoom(e.target.value)}
                placeholder="e.g North Wing :Room 104 "
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
            <button type="button" onClick={() => setNewSectionOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg">Cancel</button>
            <button
              type="button"
              onClick={() => {
                if (!newSectionNames.trim()) { toast.error("Section name is required"); return; }
                toast.info("Section creation requires the full Class editor. Open the Class page to add sections.");
                setNewSectionOpen(false);
              }}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#4834b8] rounded-lg"
            >
              Add Section
            </button>
          </div>
        </div>
      </div>
    )}
    {editSectionOpen && (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Edit Section Details</h3>
              {editSectionClass && (
                <p className="text-xs text-slate-500 mt-0.5">For class: {editSectionClass.name}</p>
              )}
            </div>
            <button type="button" onClick={() => setEditSectionOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Section Name *</label>
              <input
                type="text"
                value={editSectionName}
                onChange={(e) => setEditSectionName(e.target.value)}
                placeholder="E.G. C, D OR A, B"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Max Strength</label>
              <input
                type="number"
                value={editSectionCapacity}
                onChange={(e) => setEditSectionCapacity(Number(e.target.value) || 0)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Room / Wing Label (Optional)</label>
              <input
                type="text"
                value={editSectionRoom}
                onChange={(e) => setEditSectionRoom(e.target.value)}
                placeholder="e.g North Wing :Room 104 "
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
            <button type="button" onClick={() => setEditSectionOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg">Cancel</button>
            <button
              type="button"
              onClick={async () => {
                if (!editSectionName.trim()) { toast.error("Section name is required"); return; }
                if (!editSectionClass) { toast.error("No class selected"); return; }
                try {
                  const secId = editSectionDetail?.sectionId?._id || editSectionDetail?.sectionId;
                  // Update section name if changed
                  if (secId && editSectionName.trim() && editSectionName.trim() !== (editSectionDetail?.sectionName || "")) {
                    await axios.put(
                      `${API}/sections/update/${secId}`,
                      { name: editSectionName.trim() },
                      { withCredentials: true },
                    );
                  }
                  const updatedDetails = (editSectionClass.details || []).map((d) => {
                    const dSecId = d.sectionId?._id || d.sectionId;
                    if (String(dSecId) === String(secId)) {
                      return { ...d, roomNumber: editSectionRoom, capacity: editSectionCapacity || d.capacity };
                    }
                    return d;
                  });
                  await axios.put(
                    `${API}/classes/update/${editSectionClass._id}`,
                    {
                      name: editSectionClass.name,
                      status: editSectionClass.status || "Active",
                      streamIds: (editSectionClass.streamIds || []).map((s) => s?._id || s),
                      details: updatedDetails.map((d) => ({
                        _id: d._id,
                        sectionId: d.sectionId?._id || d.sectionId || null,
                        roomNumber: d.roomNumber || "",
                        teacherId: d.teacherId?._id || d.teacherId || null,
                        capacity: d.capacity || 40,
                        subjectTeachers: (d.subjectTeachers || []).map((st) => ({
                          subjectId: st.subjectId?._id || st.subjectId,
                          teacherId: st.teacherId?._id || st.teacherId || null,
                        })),
                      })),
                    },
                    { withCredentials: true },
                  );
                  toast.success("Section updated successfully!");
                  setEditSectionOpen(false);
                  fetchAll();
                } catch (err) {
                  toast.error(err?.response?.data?.message || "Failed to update section.");
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
    {newStreamOpen && (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Add Stream</h3>
              {selectedClass && (
                <p className="text-xs text-slate-500 mt-0.5">For class: {selectedClass.name}</p>
              )}
            </div>
            <button type="button" onClick={() => setNewStreamOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Stream Name *</label>
              <input
                type="text"
                value={newStreamName}
                onChange={(e) => setNewStreamName(e.target.value)}
                placeholder="Science , Commerce, Arts"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Compulsory Subjects for this Stream *
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedStreamSubjectIds(
                      selectedStreamSubjectIds.length === streamSubjects.length
                        ? []
                        : streamSubjects.map((s) => s._id),
                    )
                  }
                  className="text-[11px] font-semibold text-[#4834b8] hover:underline cursor-pointer"
                >
                  {selectedStreamSubjectIds.length === streamSubjects.length ? "Clear all" : "Select all"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2">
                {streamSubjects.length === 0 ? (
                  <p className="col-span-2 text-[11px] text-slate-400">No subjects found. Add subjects in Subjects Master first.</p>
                ) : (
                  streamSubjects.map((sub) => (
                    <label key={sub._id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedStreamSubjectIds.includes(sub._id)}
                        onChange={() =>
                          setSelectedStreamSubjectIds((prev) =>
                            prev.includes(sub._id)
                              ? prev.filter((id) => id !== sub._id)
                              : [...prev, sub._id],
                          )
                        }
                        className="w-3.5 h-3.5 accent-[#4834b8]"
                      />
                      <span className="truncate">{sub.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
          <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
            <button type="button" onClick={() => setNewStreamOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg">Cancel</button>
            <button
              type="button"
              onClick={handleAddStreams}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#4834b8] rounded-lg"
            >
              Add Stream
            </button>
          </div>
        </div>
      </div>
    )}
    <EditClassModal
      open={editClassOpen}
      classData={editClassData}
      sections={sections}
      streams={streams}
      onClose={() => {
        setEditClassOpen(false);
        setEditClassData(null);
      }}
      onSaved={fetchAll}
    />
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">4. Room Number *</label>
              <input
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="e.g. Room 101"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
              <p className="text-[11px] text-slate-500 mt-1">For multiple sections, the section letter is appended automatically (e.g. Room 101-A, Room 101-B).</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">5. Does this Class have Academic Streams? (Optional)</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setStreamMode("direct"); setSelectedStreams([]); setCustomClassStreamName(""); }}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border ${streamMode === "direct" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300"}`}
                >
                  No Streams (Direct Class)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStreamMode("streams");
                    setSelectedStreams((prev) =>
                      prev.length > 0 ? prev : [...availableClassStreams],
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
                        Available streams for this class (live): {availableClassStreams.length}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        × remove · ☑ include
                      </span>
                    </div>
                    {availableClassStreams.length === 0 ? (
                      <p className="text-[11px] text-slate-400">
                        No streams available. Add a new stream below.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {availableClassStreams.map((name) => (
                          <div
                            key={name}
                            className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5"
                          >
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
                    <QuickAddStreams
                      availableStreams={availableClassStreams}
                      onAdd={addNewClassStreamToList}
                    />
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
                        className="px-3 py-2 rounded-lg text-xs border border-slate-300 bg-white text-slate-700 min-w-[180px] flex-1"
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
            <button type="button" onClick={() => { setNewClassOpen(false); resetModal(); }} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg">Cancel</button>
            <button type="button" onClick={createClassFromModal} disabled={creatingClass} className="px-4 py-2 text-sm font-semibold text-[#4834b8] bg-white border border-[#4834b8] rounded-lg disabled:opacity-60">Create Class</button>
            <button
              type="button"
              onClick={createClassFromModal}
              disabled={creatingClass}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#4834b8] rounded-lg inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              {creatingClass ? "Creating…" : "Create Class & Assign Subjects →"}
            </button>
          </div>
        </div>
      </div>
    )}
    {rosterOpen && (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Roster — Section {rosterSection?.sectionName}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedClass?.name} · {rosterStudents.length} student(s)
              </p>
            </div>
            <button type="button" onClick={() => setRosterOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div className="p-5 max-h-[60vh] overflow-y-auto">
            {!rosterLoading && rosterStudents.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Enrolled Students</div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">{rosterStudents.length}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Class Teacher</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5 truncate">{rosterSection?.teacherId?.name || rosterSection?.teacherId?.fullName || "—"}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Class Monitor</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5 truncate">Not Selected</div>
                </div>
              </div>
            )}
            {rosterLoading ? (
              <p className="text-sm text-slate-400 text-center py-6">Loading…</p>
            ) : rosterStudents.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No students in this section.</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Adm. No.</th>
                    <th className="text-left px-3 py-2 font-semibold">Roll No.</th>
                    <th className="text-left px-3 py-2 font-semibold">Name</th>
                    <th className="text-left px-3 py-2 font-semibold">Father</th>
                    <th className="text-left px-3 py-2 font-semibold">Mobile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rosterStudents.map((st) => (
                    <tr key={st._id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono tabular-nums">{st.studentId || st.admissionNumber || "—"}</td>
                      <td className="px-3 py-2 font-mono tabular-nums">{st.rollNo || "—"}</td>
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {`${st.firstName || ""} ${st.lastName || ""}`.trim() || "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{st.fatherName || "—"}</td>
                      <td className="px-3 py-2 text-slate-600">{st.fatherMobile || st.parentMobile || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    )}
    {monitorOpen && (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Assign Class Monitor — Section {monitorSection?.sectionName}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedClass?.name} · Select a student to be the class monitor
              </p>
            </div>
            <button type="button" onClick={() => setMonitorOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div className="p-5 max-h-[60vh] overflow-y-auto">
            {monitorLoading ? (
              <p className="text-sm text-slate-400 text-center py-6">Loading…</p>
            ) : monitorStudents.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No students in this section.</p>
            ) : (
              <div className="space-y-2">
                {monitorStudents.map((st) => (
                  <button
                    key={st._id}
                    type="button"
                    onClick={() => {
                      toast.success(`Assigned ${`${st.firstName || ""} ${st.lastName || ""}`.trim()} as class monitor.`);
                      setMonitorOpen(false);
                    }}
                    className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 transition"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900">{`${st.firstName || ""} ${st.lastName || ""}`.trim() || "—"}</div>
                      <div className="text-[11px] text-slate-500">Roll: {st.rollNo || "—"} · Adm: {st.studentId || "—"}</div>
                    </div>
                    <span className="text-xs font-semibold text-[#4834b8]">Select</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    {rollNoOpen && (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Auto-Assign Roll No. — Section {rollNoSection?.sectionName}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{selectedClass?.name}</p>
            </div>
            <button type="button" onClick={() => setRollNoOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ordering Criteria</label>
                <select
                  value={rollNoOrder}
                  onChange={(e) => setRollNoOrder(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="alpha">Alphabetical (A-Z)</option>
                  <option value="admission">Admission Number</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Starting Roll Number</label>
                <input type="number" value={rollNoStart} onChange={(e) => setRollNoStart(Number(e.target.value) || 1)} className="w-28 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            {rollNoLoading ? (
              <p className="text-sm text-slate-400 text-center py-6">Loading…</p>
            ) : rollNoStudents.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No students in this section.</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Adm No.</th>
                    <th className="text-left px-3 py-2 font-semibold">Student Name</th>
                    <th className="text-left px-3 py-2 font-semibold">Current Roll</th>
                    <th className="text-left px-3 py-2 font-semibold">New Roll</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const sorted = [...rollNoStudents].sort((a, b) => {
                      if (rollNoOrder === "alpha") {
                        const na = `${a.firstName || ""} ${a.lastName || ""}`.trim().toLowerCase();
                        const nb = `${b.firstName || ""} ${b.lastName || ""}`.trim().toLowerCase();
                        return na.localeCompare(nb);
                      }
                      return String(a.studentId || a.admissionNumber || "").localeCompare(String(b.studentId || b.admissionNumber || ""));
                    });
                    return sorted.map((st, idx) => (
                      <tr key={st._id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono tabular-nums">{st.studentId || st.admissionNumber || "—"}</td>
                        <td className="px-3 py-2 font-medium text-slate-900">{`${st.firstName || ""} ${st.lastName || ""}`.trim() || "—"}</td>
                        <td className="px-3 py-2 text-slate-600">{st.rollNo || "—"}</td>
                        <td className="px-3 py-2 font-bold text-[#4834b8]">{rollNoStart + idx}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            )}
          </div>
          <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
            <button type="button" onClick={() => setRollNoOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg">Cancel</button>
            <button
              type="button"
              onClick={async () => {
                if (rollNoStudents.length === 0) { toast.error("No students to update."); return; }
                const sorted = [...rollNoStudents].sort((a, b) => {
                  if (rollNoOrder === "alpha") {
                    const na = `${a.firstName || ""} ${a.lastName || ""}`.trim().toLowerCase();
                    const nb = `${b.firstName || ""} ${b.lastName || ""}`.trim().toLowerCase();
                    return na.localeCompare(nb);
                  }
                  return String(a.studentId || a.admissionNumber || "").localeCompare(String(b.studentId || b.admissionNumber || ""));
                });
                try {
                  for (let i = 0; i < sorted.length; i++) {
                    await axios.put(`${API}/students/${sorted[i]._id}`, { rollNo: String(rollNoStart + i) }, { withCredentials: true });
                  }
                  toast.success("Roll numbers assigned successfully!");
                  setRollNoOpen(false);
                } catch (err) {
                  toast.error(err?.response?.data?.message || "Failed to assign roll numbers.");
                }
              }}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#4834b8] rounded-lg"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
