import { useEffect, useState } from "react";
import axios from "axios";
import { FiChevronDown, FiPlus, FiEdit2, FiTrash2, FiX } from "react-icons/fi";
import { FaArrowLeft } from "react-icons/fa";
import { toast } from "react-toastify";
import TermManagement from "../components/TermManagement";
import { useNavigate } from "react-router-dom";

function Syllabus() {
  const API = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();

  // ==================== STATE ====================
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [terms, setTerms] = useState([]);
  const [showTerm, setShowTerm] = useState(false);

  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState({});
  const [expandedChapters, setExpandedChapters] = useState(new Set());

  const [loading, setLoading] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [formData, setFormData] = useState({});

  const [confirmState, setConfirmState] = useState({
    open: false,
    type: "", // "chapter" | "topic"
    id: null,
  });

  const isMobile = window.innerWidth <= 768;

  // ==================== FETCH DATA ====================
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await axios.get(`${API}/classes/all`, {
          withCredentials: true,
        });
        setClasses(res.data.classes || []);
      } catch (err) {
        console.error("Error fetching classes:", err);
      }
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    if (!selectedClass) {
      setSubjects([]);
      return;
    }

    const selected = classes.find((cls) => cls._id === selectedClass);

    if (!selected || !selected.details?.length) {
      setSubjects([]);
      return;
    }

    const allSubjects = selected.details.flatMap((detail) =>
      (detail.subjectTeachers || []).map((st) => st.subjectId),
    );

    // ✅ remove duplicates
    const uniqueSubjects = Array.from(
      new Map(allSubjects.map((sub) => [sub._id, sub])).values(),
    );

    setSubjects(uniqueSubjects);

    // reset dependent states
    setSelectedSubject("");
    setChapters([]);
    setTopics({});
  }, [selectedClass, classes]);

  useEffect(() => {
    if (selectedSubject && selectedClass) {
      fetchChapters();
    }
  }, [selectedSubject, selectedTerm]);

  const fetchTerms = async () => {
    const res = await axios.get(`${API}/terms`, { withCredentials: true });
    setTerms(res.data.terms);
  };

  useEffect(() => {
    fetchTerms();
  }, []);

  const fetchChapters = async () => {
    try {
      if (!selectedClass || !selectedSubject || !selectedTerm) return;

      setLoading(true);
      const res = await axios.get(`${API}/syllabus/chapters`, {
        params: {
          classId: selectedClass,
          subjectId: selectedSubject,
          termId: selectedTerm,
        },
        withCredentials: true,
      });
      setChapters(res.data.chapters || []);

      // Fetch all topics for these chapters
      const chaptersData = res.data.chapters || [];
      const topicsData = {};
      for (const chapter of chaptersData) {
        const topicsRes = await axios.get(`${API}/syllabus/topics`, {
          params: { chapterId: chapter._id },
          withCredentials: true,
        });
        topicsData[chapter._id] = topicsRes.data.topics || [];
      }
      setTopics(topicsData);
    } catch (err) {
      console.error("Error fetching chapters:", err);
    } finally {
      setLoading(false);
    }
  };

  // ==================== MODAL HANDLERS ====================
  const openChapterModal = (chapter = null) => {
    if (chapter) {
      setFormData({
        termId: chapter.termId || "",
        type: "editChapter",
        id: chapter._id,
        name: chapter.name,
        description: chapter.description || "",
        learningOutcomes: chapter.learningOutcomes?.join("\n") || "",
      });
    } else {
      setFormData({
        type: "addChapter",
        name: "",
        description: "",
        learningOutcomes: "",
      });
    }
    setActiveModal("chapter");
  };

  const openTopicModal = (chapterId, topic = null) => {
    if (topic) {
      setFormData({
        type: "editTopic",
        id: topic._id,
        chapterId,
        name: topic.name,
        content: topic.content || "",
        difficultyLevel: topic.difficultyLevel || "medium",
        keywords: topic.keywords?.join(", ") || "",
      });
    } else {
      setFormData({
        type: "addTopic",
        chapterId,
        name: "",
        content: "",
        difficultyLevel: "medium",
        keywords: "",
      });
    }
    setActiveModal("topic");
  };

  const closeModal = () => {
    setActiveModal(null);
    setFormData({});
  };

  // ==================== SUBMIT HANDLERS ====================
  const submitChapter = async () => {
    if (!formData.termId) {
      toast.error("Please select term");
      return;
    }
    try {
      const payload = {
        classId: selectedClass,
        subjectId: selectedSubject,
        termId: formData.termId,
        name: formData.name,
        description: formData.description,
        learningOutcomes: formData.learningOutcomes
          .split("\n")
          .filter((item) => item.trim()),
      };

      const toastloading = toast.loading("Processing ..");

      if (formData.type === "addChapter") {
        await axios.post(`${API}/syllabus/chapters`, payload, {
          withCredentials: true,
        });
        toast.success("chapter added");
      } else {
        await axios.put(`${API}/syllabus/chapters/${formData.id}`, payload, {
          withCredentials: true,
        });
        toast.success("chapter updated");
      }

      await fetchChapters();
      closeModal();
      toast.dismiss(toastloading);
    } catch (err) {
      console.error("Error saving chapter:", err);
      toast.error("erro:", err.response?.data?.message);
      alert(err.response?.data?.message || "Error saving chapter");
    }
  };

  const submitTopic = async () => {
    try {
      const payload = {
        classId: selectedClass,
        subjectId: selectedSubject,
        chapterId: formData.chapterId,
        name: formData.name,
        content: formData.content,
        difficultyLevel: formData.difficultyLevel,
        keywords: formData.keywords
          .split(",")
          .map((k) => k.trim())
          .filter((k) => k),
      };
      const toastloading = toast.loading("Processing ..");

      if (formData.type === "addTopic") {
        await axios.post(`${API}/syllabus/topics`, payload, {
          withCredentials: true,
        });
        toast.success("topic added successfully");
      } else {
        await axios.put(`${API}/syllabus/topics/${formData.id}`, payload, {
          withCredentials: true,
        });
        toast.success("topic updated successfully");
      }

      await fetchChapters();
      closeModal();
      toast.dismiss(toastloading);
    } catch (err) {
      console.error("Error saving topic:", err);
      alert(err.response?.data?.message || "Error saving topic");
    } finally {
      setTimeout(() => toast.dismiss(loadingToast), 500);
    }
  };

  const deleteChapter = (chapterId) => {
    setConfirmState({
      open: true,
      type: "chapter",
      id: chapterId,
    });
  };

  const deleteTopic = (topicId) => {
    setConfirmState({
      open: true,
      type: "topic",
      id: topicId,
    });
  };
  const handleConfirmDelete = async () => {
    try {
      if (confirmState.type === "chapter") {
        await axios.delete(`${API}/syllabus/chapters/${confirmState.id}`);
      } else if (confirmState.type === "topic") {
        await axios.delete(`${API}/syllabus/topics/${confirmState.id}`);
      }

      await fetchChapters();
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setConfirmState({ open: false, type: "", id: null });
    }
  };

  const toggleChapter = (chapterId) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedChapters(newExpanded);
  };

  return (
    <div className="min-h-screen text-[rgb(var(--text))]">
      <div className="max-w-6xl mx-auto p-6">
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
        <div className="mb-8 text-[rgb(var(--text))] ">
          <h1 className="text-4xl py-1 font-bold bg-clip-text mb-2">
            Syllabus Management
          </h1>
          <p className="font-bold mt-2">Add chapters and topics.</p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Class Select */}
          <div className="relative">
            <label className="block text-sm font-semibold mb-2">
              Select Class
            </label>
            <div className="relative">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-3  border border-slate-700 rounded-lg 
                  text-[rgb(var(--text))] bg-[rgb(var(--surface))]
                focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 outline-none transition appearance-none cursor-pointer"
              >
                <option
                  value=""
                  className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
                >
                  Choose a class...
                </option>
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>
                    {cls.name}
                  </option>
                ))}
              </select>
              <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Subject Select */}
          <div className="relative">
            <label className="block text-sm font-semibold  mb-2">
              Select Subject
            </label>
            <div className="relative">
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                disabled={!selectedClass}
                className="w-full px-4 py-3  border border-slate-700 rounded-lg 
                  text-[rgb(var(--text))] bg-[rgb(var(--surface))]
                focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 outline-none transition appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Choose a subject...</option>
                {subjects.map((sub) => (
                  <option key={sub._id} value={sub._id}>
                    {sub.name}
                  </option>
                ))}
              </select>
              <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>
          </div>
          {/* Term Select */}
          <div className="relative">
            <label className="block text-sm font-semibold mb-2">
              Select Term
            </label>
            <div className="relative">
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                disabled={!selectedSubject}
                className="w-full px-4 py-3  border border-slate-700 rounded-lg 
                text-[rgb(var(--text))] bg-[rgb(var(--surface))]
                focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 outline-none transition appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select Term</option>
                {terms?.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}{" "}
                  </option>
                ))}
              </select>
              <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <button
            onClick={() => setShowTerm((p) => !p)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-linear-to-r text-[rgb(var(--text))] bg-[rgb(var(--primary))] font-medium shadow-md hover:scale-105 transition"
          >
            {showTerm ? "Hide Terms" : "Manage Terms"}
          </button>
        </div>
        {showTerm && <TermManagement onDataChange={fetchTerms} />}
        {/* Content Area */}
        {selectedSubject && (
          <div className="space-y-4 text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
            {/* Add Chapter Button */}
            <button
              onClick={() => openChapterModal()}
              className="flex items-center gap-2 px-4 py-3 text-[rgb(var(--text))] bg-[rgb(var(--primary))]  font-semibold rounded-lg transition transform hover:scale-105"
            >
              <FiPlus className="w-5 h-5" />
              Add Chapter
            </button>

            {/* Loading State */}
            {loading && (
              <div className="text-center py-8 text-slate-400">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                <p className="mt-2">Loading chapters...</p>
              </div>
            )}

            {/* Chapters List */}
            {!loading && chapters.length > 0 && (
              <div className="space-y-3">
                {chapters.map((chapter) => (
                  <div
                    key={chapter._id}
                    className=" border border-slate-700 rounded-lg overflow-hidden transition"
                  >
                    {/* Chapter Header */}
                    <div
                      onClick={() => toggleChapter(chapter._id)}
                      className="flex items-center gap-3 p-4 cursor-pointer  transition"
                    >
                      <FiChevronDown
                        className={`w-5 h-5 text-[rgb(var(--primary))] transition-transform ${
                          expandedChapters.has(chapter._id) ? "rotate-180" : ""
                        }`}
                      />
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold ">
                          Chapter {chapter.order}: {chapter.name}
                        </h3>
                        {chapter.description && (
                          <p className="text-sm  mt-1">{chapter.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openChapterModal(chapter);
                          }}
                          className="p-2 text-[rgb(var(--text))] bg-[rgb(var(--primary))] rounded-2xl transition cursor-pointer"
                        >
                          <FiEdit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteChapter(chapter._id);
                          }}
                          className="p-2 text-[rgb(var(--text))] bg-[rgb(var(--bg))] rounded-2xl transition cursor-pointer "
                        >
                          <FiTrash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Topics */}
                    {expandedChapters.has(chapter._id) && (
                      <div className="border-t border-slate-700  p-4 space-y-3">
                        <button
                          onClick={() => openTopicModal(chapter._id)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-[rgb(var(--text))] bg-[rgb(var(--primary))] rounded cursor-pointer transition"
                        >
                          <FiPlus className="w-4 h-4" />
                          Add Topic
                        </button>

                        {topics[chapter._id]?.length > 0 ? (
                          <div className="space-y-2">
                            {topics[chapter._id].map((topic) => (
                              <div
                                key={topic._id}
                                className="flex items-start gap-3 p-3  rounded-lg border border-slate-700 hover:border-slate-600 transition"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs px-2 py-1  rounded">
                                      {topic.difficultyLevel}
                                    </span>
                                    <h4 className=" font-medium">
                                      Topic {topic.order}: {topic.name}
                                    </h4>
                                  </div>
                                  {topic.content && (
                                    <p className="text-sm  mt-1 line-clamp-2">
                                      {topic.content}
                                    </p>
                                  )}
                                  {topic.keywords?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {topic.keywords.map((kw, idx) => (
                                        <span
                                          key={idx}
                                          className="text-xs px-2 py-1 bg-[rgb(var(--primary))]  rounded"
                                        >
                                          {kw}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 ml-2">
                                  <button
                                    onClick={() =>
                                      openTopicModal(chapter._id, topic)
                                    }
                                    className="p-1 text-[rgb(var(--text))]  transition"
                                  >
                                    <FiEdit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => deleteTopic(topic._id)}
                                    className="p-1 text-[rgb(var(--text))]  transition"
                                  >
                                    <FiTrash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm  text-center py-4">
                            No topics yet
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!loading && chapters.length === 0 && selectedSubject && (
              <div className="text-center py-12 ">
                <p className="text-lg mb-4">No chapters created yet</p>
                <p className="text-sm">Click "Add Chapter" to get started</p>
              </div>
            )}
          </div>
        )}

        {!selectedSubject && selectedClass && (
          <div className="text-center py-12 ">
            <p className="text-lg">Select a subject to begin</p>
          </div>
        )}
      </div>
      {/* delete modal */}
      {confirmState.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]  rounded-2xl shadow-xl w-[90%] max-w-sm p-6">
            <h2 className="text-lg font-semibold mb-2">
              Delete {confirmState.type === "chapter" ? "Chapter" : "Topic"}
            </h2>

            <p className="text-sm  mb-6">
              {confirmState.type === "chapter"
                ? "This will delete the chapter and all its topics."
                : "This will delete the topic permanently."}
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() =>
                  setConfirmState({ open: false, type: "", id: null })
                }
                className="px-4 py-2 text-sm rounded-md border"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm rounded-md bg-red-500 text-white hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {activeModal === "chapter" && (
        <ChapterModal
          formData={formData}
          setFormData={setFormData}
          onSubmit={submitChapter}
          onClose={closeModal}
          terms={terms}
        />
      )}

      {activeModal === "topic" && (
        <TopicModal
          formData={formData}
          setFormData={setFormData}
          onSubmit={submitTopic}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

// ==================== CHAPTER MODAL ====================
function ChapterModal({ formData, setFormData, onSubmit, onClose, terms }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]  rounded-lg shadow-xl max-w-md w-full border border-slate-700">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold">
            {formData.type === "addChapter" ? "Add Chapter" : "Edit Chapter"}
          </h2>
          <button onClick={onClose} className="transition">
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="relative">
            <label className="block text-sm font-semibold mb-2 ">
              Select Term
            </label>
            <div className="relative">
              <select
                value={formData.termId || ""}
                onChange={(e) =>
                  setFormData({ ...formData, termId: e.target.value })
                }
                className="w-full px-4 py-3 border border-slate-700 rounded-lg 
                text-[rgb(var(--text))] bg-[rgb(var(--surface))]
                focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 outline-none transition appearance-none cursor-pointer"
              >
                <option value="">All Terms</option>
                {terms?.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}{" "}
                  </option>
                ))}
              </select>
              <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold  mb-2">
              Chapter Name *
            </label>
            <input
              type="text"
              value={formData.name || ""}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Introduction to Biology"
              className="w-full px-4 py-2 border border-slate-600 rounded-lg placeholder-slate-400 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold  mb-2">
              Description
            </label>
            <textarea
              value={formData.description || ""}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Brief description of the chapter"
              rows="3"
              className="w-full px-4 py-2  border border-slate-600 rounded-lg  placeholder-slate-400  outline-none transition resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold  mb-2">
              Learning Outcomes (one per line)
            </label>
            <textarea
              value={formData.learningOutcomes || ""}
              onChange={(e) =>
                setFormData({ ...formData, learningOutcomes: e.target.value })
              }
              placeholder="Students will be able to...&#10;Understand..."
              rows="3"
              className="w-full px-4 py-2 border border-slate-600 rounded-lg placeholder-slate-400  outline-none transition resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-slate-700 ">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-[rgb(var(--text))] bg-[rgb(var(--primary))] border border-slate-600 rounded-lg  transition"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="flex-1 px-4 py-2 bg-linear-to-r font-semibold rounded-lg text-[rgb(var(--text))] bg-[rgb(var(--primary))] transition"
          >
            {formData.type === "addChapter" ? "Create" : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== TOPIC MODAL ====================
function TopicModal({ formData, setFormData, onSubmit, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-lg shadow-xl max-w-md w-full border border-slate-700">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold ">
            {formData.type === "addTopic" ? "Add Topic" : "Edit Topic"}
          </h2>
          <button onClick={onClose} className=" transition">
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold t300 mb-2">
              Topic Name *
            </label>
            <input
              type="text"
              value={formData.name || ""}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Cell Structure"
              className="w-full px-4 py-2 border border-slate-600 rounded-lg placeholder-slate-400  outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold  mb-2">Content</label>
            <textarea
              value={formData.content || ""}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              placeholder="Topic content/description"
              rows="6"
              className="w-full px-4 py-2 border border-slate-600 rounded-lg  placeholder-slate-400 focus:border-cyan-400 outline-none transition resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold  mb-2">
              Difficulty Level
            </label>
            <select
              value={formData.difficultyLevel || "medium"}
              onChange={(e) =>
                setFormData({ ...formData, difficultyLevel: e.target.value })
              }
              className="w-full px-4 py-2 text-[rgb(var(--text))] bg-[rgb(var(--surface))] border-slate-600 rounded-lg outline-none transition"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold  mb-2">
              Keywords (comma separated)
            </label>
            <input
              type="text"
              value={formData.keywords || ""}
              onChange={(e) =>
                setFormData({ ...formData, keywords: e.target.value })
              }
              placeholder="e.g., mitochondria, ATP, respiration"
              className="w-full px-4 py-2  border border-slate-600 rounded-lg placeholder-slate-400 focus:border-cyan-400 outline-none transition"
            />
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-slate-700 ">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2  border border-slate-600 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="flex-1 px-4 py-2 bg-linear-to-r  font-semibold rounded-lg text-[rgb(var(--text))] bg-[rgb(var(--primary))] transition"
          >
            {formData.type === "addTopic" ? "Create" : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Syllabus;
