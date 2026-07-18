import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaPlus,
  FaTrash,
  FaEdit,
  FaEye,
  FaBook,
  FaChevronRight,
  FaChevronDown,
  FaFilePdf,
} from "react-icons/fa";
import ChapterPdfViewer from "../components/ChapterPdfViewer";

const API = import.meta.env.VITE_API_URL;

const CLASS_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i + 1));

const fieldCls =
  "w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-slate-400";

function Modal({ title, onClose, children, wide, subtitle }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-0 sm:p-4">
      <div
        className={`bg-[rgb(var(--surface))] w-full ${
          wide ? "sm:max-w-4xl" : "sm:max-w-md"
        } rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="min-w-0 pr-3">
            <h2 className="text-sm font-semibold text-[rgb(var(--text))]">
              {title}
            </h2>
            {subtitle ? (
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-lg text-[rgb(var(--text))] shrink-0"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export default function SyllabusCatalogAdmin() {
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  const [boards, setBoards] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [bookDetail, setBookDetail] = useState(null);
  const [classFilter, setClassFilter] = useState("");
  const [expanded, setExpanded] = useState(new Set());
  const [loading, setLoading] = useState(false);

  const [modal, setModal] = useState(null); // board | book | chapter | topic | edit*
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const chapterPdfInputRef = useRef(null);

  const fetchBoards = async () => {
    try {
      const res = await axios.get(`${API}/syllabus-catalog/boards`, {
        withCredentials: true,
      });
      setBoards(res.data.data || []);
    } catch {
      toast.error("Failed to load boards");
    }
  };

  const fetchBooks = async (boardId) => {
    if (!boardId) {
      setBooks([]);
      return;
    }
    try {
      setLoading(true);
      const params = { boardId };
      if (classFilter) params.className = classFilter;
      const res = await axios.get(`${API}/syllabus-catalog/books`, {
        params,
        withCredentials: true,
      });
      setBooks(res.data.data || []);
    } catch {
      toast.error("Failed to load books");
    } finally {
      setLoading(false);
    }
  };

  const fetchBookDetail = async (bookId) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/syllabus-catalog/books/${bookId}`, {
        withCredentials: true,
      });
      setBookDetail(res.data.data);
      setSelectedBook(res.data.data.book);
    } catch {
      toast.error("Failed to load book details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  useEffect(() => {
    if (selectedBoard) fetchBooks(selectedBoard._id);
  }, [selectedBoard, classFilter]);

  const openCreateBoard = () => {
    setForm({ name: "", code: "", description: "" });
    setModal("board");
  };

  const openCreateBook = () => {
    if (!selectedBoard) return toast.error("Select a board first");
    setForm({
      className: "1",
      subjectName: "",
      title: "",
      description: "",
      medium: "English",
    });
    setModal("book");
  };

  const openCreateChapter = () => {
    if (!selectedBook) return toast.error("Select a book first");
    setForm({ name: "", description: "", content: "", termHint: "" });
    setModal("chapter");
  };

  const openCreateTopic = (chapter) => {
    setEditTarget(chapter);
    setForm({
      name: "",
      content: "",
      difficultyLevel: "medium",
      pageFrom: "",
      pageTo: "",
    });
    setModal("topic");
  };

  const uploadChapterPdf = async (chapter, file) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed");
      return;
    }
    setPdfUploading(true);
    try {
      const fd = new FormData();
      fd.append("pdf", file);
      const res = await axios.post(
        `${API}/syllabus-catalog/chapters/${chapter._id}/pdf`,
        fd,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      toast.success(res.data.message || "Chapter PDF uploaded");
      const updated = res.data.data;
      if (editTarget?._id === chapter._id) {
        setEditTarget((prev) => ({
          ...prev,
          ...updated,
          topics: prev.topics || [],
        }));
      }
      fetchBookDetail(selectedBook._id);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to upload PDF");
    } finally {
      setPdfUploading(false);
      if (chapterPdfInputRef.current) chapterPdfInputRef.current.value = "";
    }
  };

  const removeChapterPdf = async (chapter) => {
    if (!window.confirm("Remove uploaded chapter PDF?")) return;
    setPdfUploading(true);
    try {
      const res = await axios.delete(
        `${API}/syllabus-catalog/chapters/${chapter._id}/pdf`,
        { withCredentials: true },
      );
      toast.success("Chapter PDF removed");
      const updated = res.data.data;
      if (editTarget?._id === chapter._id) {
        setEditTarget((prev) => ({
          ...prev,
          ...updated,
          topics: prev.topics || [],
        }));
      }
      fetchBookDetail(selectedBook._id);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove PDF");
    } finally {
      setPdfUploading(false);
    }
  };

  const saveBoard = async () => {
    if (!form.name?.trim() || !form.code?.trim()) {
      return toast.error("Name and code required");
    }
    setSaving(true);
    try {
      if (editTarget) {
        await axios.put(
          `${API}/syllabus-catalog/boards/${editTarget._id}`,
          form,
          { withCredentials: true },
        );
        toast.success("Board updated");
      } else {
        await axios.post(`${API}/syllabus-catalog/boards`, form, {
          withCredentials: true,
        });
        toast.success("Board created");
      }
      setModal(null);
      setEditTarget(null);
      fetchBoards();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save board");
    } finally {
      setSaving(false);
    }
  };

  const saveBook = async () => {
    if (!form.className || !form.subjectName?.trim() || !form.title?.trim()) {
      return toast.error("Class, subject and title required");
    }
    setSaving(true);
    try {
      if (editTarget) {
        await axios.put(
          `${API}/syllabus-catalog/books/${editTarget._id}`,
          form,
          { withCredentials: true },
        );
        toast.success("Book updated");
      } else {
        await axios.post(
          `${API}/syllabus-catalog/books`,
          { ...form, boardId: selectedBoard._id },
          { withCredentials: true },
        );
        toast.success("Book created");
      }
      setModal(null);
      setEditTarget(null);
      fetchBooks(selectedBoard._id);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save book");
    } finally {
      setSaving(false);
    }
  };

  const saveChapter = async () => {
    if (!form.name?.trim()) return toast.error("Chapter name required");
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description || `Chapter: ${form.name.trim()}`,
      content: form.content || form.description || "",
      termHint: form.termHint || null,
    };
    try {
      if (editTarget && modal === "editChapter") {
        await axios.put(
          `${API}/syllabus-catalog/chapters/${editTarget._id}`,
          payload,
          { withCredentials: true },
        );
        toast.success("Chapter content saved");
      } else {
        await axios.post(
          `${API}/syllabus-catalog/chapters`,
          {
            ...payload,
            bookId: selectedBook._id,
          },
          { withCredentials: true },
        );
        toast.success("Chapter added");
      }
      setModal(null);
      setEditTarget(null);
      fetchBookDetail(selectedBook._id);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save chapter");
    } finally {
      setSaving(false);
    }
  };

  const saveTopic = async () => {
    if (!form.name?.trim()) return toast.error("Topic name required");
    setSaving(true);
    try {
      const payload = {
        ...form,
        pageFrom: form.pageFrom === "" ? null : form.pageFrom,
        pageTo: form.pageTo === "" ? null : form.pageTo,
      };
      if (modal === "editTopic" && editTarget) {
        await axios.put(
          `${API}/syllabus-catalog/topics/${editTarget._id}`,
          payload,
          { withCredentials: true },
        );
        toast.success("Topic updated");
      } else {
        await axios.post(
          `${API}/syllabus-catalog/topics`,
          {
            ...payload,
            templateChapterId: editTarget._id,
          },
          { withCredentials: true },
        );
        toast.success("Topic added");
      }
      setModal(null);
      setEditTarget(null);
      fetchBookDetail(selectedBook._id);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save topic");
    } finally {
      setSaving(false);
    }
  };

  const deleteBoard = async (board) => {
    if (
      !window.confirm(
        `Delete board "${board.name}" and ALL its books/chapters/topics?`,
      )
    )
      return;
    try {
      await axios.delete(`${API}/syllabus-catalog/boards/${board._id}`, {
        withCredentials: true,
      });
      toast.success("Board deleted");
      if (selectedBoard?._id === board._id) {
        setSelectedBoard(null);
        setSelectedBook(null);
        setBookDetail(null);
      }
      fetchBoards();
    } catch {
      toast.error("Failed to delete board");
    }
  };

  const deleteBook = async (book) => {
    if (!window.confirm(`Delete book "${book.title}"?`)) return;
    try {
      await axios.delete(`${API}/syllabus-catalog/books/${book._id}`, {
        withCredentials: true,
      });
      toast.success("Book deleted");
      if (selectedBook?._id === book._id) {
        setSelectedBook(null);
        setBookDetail(null);
      }
      fetchBooks(selectedBoard._id);
    } catch {
      toast.error("Failed to delete book");
    }
  };

  const deleteChapter = async (chapter) => {
    if (!window.confirm(`Delete chapter "${chapter.name}"?`)) return;
    try {
      await axios.delete(`${API}/syllabus-catalog/chapters/${chapter._id}`, {
        withCredentials: true,
      });
      toast.success("Chapter deleted");
      fetchBookDetail(selectedBook._id);
    } catch {
      toast.error("Failed to delete chapter");
    }
  };

  const deleteTopic = async (topic) => {
    if (!window.confirm(`Delete topic "${topic.name}"?`)) return;
    try {
      await axios.delete(`${API}/syllabus-catalog/topics/${topic._id}`, {
        withCredentials: true,
      });
      toast.success("Topic deleted");
      fetchBookDetail(selectedBook._id);
    } catch {
      toast.error("Failed to delete topic");
    }
  };

  const toggleExpand = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const booksByClass = books.reduce((acc, b) => {
    const key = b.className || "?";
    if (!acc[key]) acc[key] = [];
    acc[key].push(b);
    return acc;
  }, {});

  return (
    <div className="min-h-screen p-4 sm:p-8 text-[rgb(var(--text))]">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />

      {isMobile && (
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white shadow-sm border border-slate-100 text-sm font-bold text-slate-600 mb-3"
        >
          <FaArrowLeft size={16} /> Back
        </button>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold">Global Syllabus Catalog</h1>
          <p className="text-xs text-slate-500 mt-1">
            Add NCERT, CBSE, RBSE (and other) boards with books for every class.
            Schools can import these into their syllabus in one click.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateBoard}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[rgb(var(--primary))]"
        >
          <FaPlus size={12} /> Add board
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Boards */}
        <div className="lg:col-span-3 bg-[rgb(var(--surface))] border border-slate-200 rounded-2xl p-3">
          <p className="text-xs font-semibold uppercase text-slate-500 mb-2">
            Boards
          </p>
          <div className="space-y-1">
            {boards.length === 0 && (
              <p className="text-xs text-slate-500 py-4 text-center">
                No boards yet. Add NCERT, CBSE, RBSE…
              </p>
            )}
            {boards.map((b) => (
              <div
                key={b._id}
                className={`rounded-xl px-3 py-2 cursor-pointer border transition ${
                  selectedBoard?._id === b._id
                    ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary))]/10"
                    : "border-transparent hover:bg-slate-50"
                }`}
                onClick={() => {
                  setSelectedBoard(b);
                  setSelectedBook(null);
                  setBookDetail(null);
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{b.name}</p>
                    <p className="text-[11px] text-slate-500">{b.code}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      className="p-1.5 text-slate-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditTarget(b);
                        setForm({
                          name: b.name,
                          code: b.code,
                          description: b.description || "",
                          status: b.status,
                        });
                        setModal("board");
                      }}
                    >
                      <FaEdit size={11} />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 text-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteBoard(b);
                      }}
                    >
                      <FaTrash size={11} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Books */}
        <div className="lg:col-span-4 bg-[rgb(var(--surface))] border border-slate-200 rounded-2xl p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Books {selectedBoard ? `· ${selectedBoard.name}` : ""}
            </p>
            <button
              type="button"
              disabled={!selectedBoard}
              onClick={openCreateBook}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-slate-200 disabled:opacity-40"
            >
              <FaPlus size={10} /> Book
            </button>
          </div>

          <select
            className={`${fieldCls} mb-3`}
            value={classFilter}
            disabled={!selectedBoard}
            onChange={(e) => setClassFilter(e.target.value)}
          >
            <option value="">All classes</option>
            {CLASS_OPTIONS.map((c) => (
              <option key={c} value={c}>
                Class {c}
              </option>
            ))}
          </select>

          {!selectedBoard ? (
            <p className="text-xs text-slate-500 text-center py-10">
              Select a board to manage books
            </p>
          ) : loading && !books.length ? (
            <p className="text-xs text-slate-500 text-center py-10">Loading…</p>
          ) : books.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-10">
              No books for this filter
            </p>
          ) : (
            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
              {Object.keys(booksByClass)
                .sort((a, b) => Number(a) - Number(b) || a.localeCompare(b))
                .map((cls) => (
                  <div key={cls}>
                    <p className="text-[11px] font-semibold text-slate-500 mb-1">
                      Class {cls}
                    </p>
                    <div className="space-y-1">
                      {booksByClass[cls].map((book) => (
                        <div
                          key={book._id}
                          className={`rounded-xl px-3 py-2 cursor-pointer border ${
                            selectedBook?._id === book._id
                              ? "border-amber-400 bg-amber-50"
                              : "border-slate-100 hover:bg-slate-50"
                          }`}
                          onClick={() => fetchBookDetail(book._id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium flex items-center gap-1.5">
                                <FaBook size={11} className="text-amber-600" />
                                <span className="truncate">{book.title}</span>
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {book.subjectName}
                                {book.medium ? ` · ${book.medium}` : ""}
                              </p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button
                                type="button"
                                className="p-1.5 text-slate-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditTarget(book);
                                  setForm({
                                    className: book.className,
                                    subjectName: book.subjectName,
                                    title: book.title,
                                    description: book.description || "",
                                    medium: book.medium || "English",
                                    status: book.status,
                                  });
                                  setModal("book");
                                }}
                              >
                                <FaEdit size={11} />
                              </button>
                              <button
                                type="button"
                                className="p-1.5 text-red-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteBook(book);
                                }}
                              >
                                <FaTrash size={11} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Chapters / topics */}
        <div className="lg:col-span-5 bg-[rgb(var(--surface))] border border-slate-200 rounded-2xl p-3">
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="text-xs font-semibold uppercase text-slate-500 truncate">
              {selectedBook
                ? `Chapters · ${selectedBook.title}`
                : "Chapters & topics"}
            </p>
            <button
              type="button"
              disabled={!selectedBook}
              onClick={openCreateChapter}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-slate-200 disabled:opacity-40 shrink-0"
            >
              <FaPlus size={10} /> Chapter
            </button>
          </div>

          {!selectedBook ? (
            <p className="text-xs text-slate-500 text-center py-16">
              Select a book to add chapters and topics
            </p>
          ) : !bookDetail?.chapters?.length ? (
            <p className="text-xs text-slate-500 text-center py-16">
              No chapters yet. Add chapters for this book.
            </p>
          ) : (
            <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
              {bookDetail.chapters.map((ch) => {
                const open = expanded.has(ch._id);
                return (
                  <div
                    key={ch._id}
                    className="border border-slate-200 rounded-xl overflow-hidden"
                  >
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => toggleExpand(ch._id)}
                        className="text-slate-500"
                      >
                        {open ? (
                          <FaChevronDown size={11} />
                        ) : (
                          <FaChevronRight size={11} />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ch.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {(ch.topics || []).length} topics
                          {ch.termHint ? ` · ${ch.termHint}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[rgb(var(--primary))] text-[rgb(var(--text))]"
                        onClick={() => {
                          setEditTarget(ch);
                          setModal("viewChapter");
                        }}
                        title="View main chapter content"
                      >
                        <FaEye size={12} /> View content
                      </button>
                      <button
                        type="button"
                        className="p-1.5 text-slate-500"
                        onClick={() => openCreateTopic(ch)}
                        title="Add topic"
                      >
                        <FaPlus size={11} />
                      </button>
                      <button
                        type="button"
                        className="p-1.5 text-slate-500"
                        onClick={() => {
                          setEditTarget(ch);
                          setForm({
                            name: ch.name,
                            description: ch.description || "",
                            content: ch.content || ch.description || "",
                            termHint: ch.termHint || "",
                          });
                          setModal("editChapter");
                        }}
                      >
                        <FaEdit size={11} />
                      </button>
                      <button
                        type="button"
                        className="p-1.5 text-red-500"
                        onClick={() => deleteChapter(ch)}
                      >
                        <FaTrash size={11} />
                      </button>
                    </div>
                    {open && (
                      <div className="px-3 py-3 space-y-3 border-t border-slate-100">
                        <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase text-amber-800 mb-1">
                            Main content
                          </p>
                          <p className="text-xs text-slate-700 whitespace-pre-wrap line-clamp-4">
                            {(ch.content || ch.description)?.trim()
                              ? ch.content || ch.description
                              : "No main content yet. Click View content."}
                          </p>
                        </div>

                        <p className="text-[10px] font-semibold uppercase text-slate-500">
                          Topics
                        </p>

                        {(ch.topics || []).length === 0 ? (
                          <p className="text-[11px] text-slate-500 py-2">
                            No topics
                          </p>
                        ) : (
                          ch.topics.map((t) => (
                            <div
                              key={t._id}
                              className="rounded-lg border border-slate-100 px-3 py-2 hover:bg-slate-50"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold">
                                    {t.name}
                                    {t.pageFrom ? (
                                      <span className="ml-2 text-[10px] font-semibold text-emerald-700">
                                        p.{t.pageFrom}
                                        {t.pageTo ? `–${t.pageTo}` : ""}
                                      </span>
                                    ) : null}
                                  </p>
                                  <p className="text-[11px] text-slate-600 mt-1 whitespace-pre-wrap">
                                    {t.content?.trim()
                                      ? t.content
                                      : "No topic content yet. Click edit to add."}
                                  </p>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  <button
                                    type="button"
                                    className="p-1 text-slate-500"
                                    onClick={() => {
                                      setEditTarget(t);
                                      setForm({
                                        name: t.name,
                                        content: t.content || "",
                                        difficultyLevel:
                                          t.difficultyLevel || "medium",
                                        pageFrom: t.pageFrom || "",
                                        pageTo: t.pageTo || "",
                                      });
                                      setModal("editTopic");
                                    }}
                                  >
                                    <FaEdit size={10} />
                                  </button>
                                  <button
                                    type="button"
                                    className="p-1 text-red-500"
                                    onClick={() => deleteTopic(t)}
                                  >
                                    <FaTrash size={10} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {(modal === "board" || (modal === "board" && editTarget)) && (
        <Modal
          title={editTarget ? "Edit board" : "Add board"}
          onClose={() => {
            setModal(null);
            setEditTarget(null);
          }}
        >
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Name</label>
              <input
                className={fieldCls}
                placeholder="e.g. NCERT"
                value={form.name || ""}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium">Code</label>
              <input
                className={fieldCls}
                placeholder="e.g. NCERT"
                value={form.code || ""}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium">Description</label>
              <textarea
                rows={3}
                className={fieldCls}
                value={form.description || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={saveBoard}
              className="w-full py-2.5 rounded-xl text-sm font-medium bg-[rgb(var(--primary))] disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save board"}
            </button>
          </div>
        </Modal>
      )}

      {modal === "book" && (
        <Modal
          title={editTarget ? "Edit book" : "Add book"}
          onClose={() => {
            setModal(null);
            setEditTarget(null);
          }}
        >
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Class</label>
              <select
                className={fieldCls}
                value={form.className || "1"}
                onChange={(e) =>
                  setForm((f) => ({ ...f, className: e.target.value }))
                }
              >
                {CLASS_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    Class {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">Subject name</label>
              <input
                className={fieldCls}
                placeholder="e.g. Mathematics"
                value={form.subjectName || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, subjectName: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium">Book title</label>
              <input
                className={fieldCls}
                placeholder="e.g. Mathematics Class 6"
                value={form.title || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium">Medium</label>
              <input
                className={fieldCls}
                value={form.medium || "English"}
                onChange={(e) =>
                  setForm((f) => ({ ...f, medium: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium">Description</label>
              <textarea
                rows={2}
                className={fieldCls}
                value={form.description || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={saveBook}
              className="w-full py-2.5 rounded-xl text-sm font-medium bg-[rgb(var(--primary))] disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save book"}
            </button>
          </div>
        </Modal>
      )}

      {(modal === "chapter" || modal === "editChapter") && (
        <Modal
          title={modal === "editChapter" ? "Edit chapter" : "Add chapter"}
          onClose={() => {
            setModal(null);
            setEditTarget(null);
          }}
        >
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Chapter name</label>
              <input
                className={fieldCls}
                value={form.name || ""}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium">Main content</label>
              <textarea
                rows={10}
                className={fieldCls}
                placeholder="Write the full main content of this chapter here"
                value={form.content || form.description || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    content: e.target.value,
                    description: f.description || `Chapter: ${f.name || ""}`,
                  }))
                }
              />
              <p className="text-[11px] text-slate-500 mt-1">
                This is the chapter content shown in View content.
              </p>
            </div>
            <div>
              <label className="text-xs font-medium">Term hint (optional)</label>
              <select
                className={fieldCls}
                value={form.termHint || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, termHint: e.target.value }))
                }
              >
                <option value="">None</option>
                <option value="term1">Term 1</option>
                <option value="term2">Term 2</option>
                <option value="full_year">Full year</option>
              </select>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={saveChapter}
              className="w-full py-2.5 rounded-xl text-sm font-medium bg-[rgb(var(--primary))] disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save chapter"}
            </button>
          </div>
        </Modal>
      )}

      {(modal === "topic" || modal === "editTopic") && (
        <Modal
          title={modal === "editTopic" ? "Edit module / topic" : "Add module / topic"}
          onClose={() => {
            setModal(null);
            setEditTarget(null);
          }}
        >
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Topic name</label>
              <input
                className={fieldCls}
                value={form.name || ""}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium">Content</label>
              <textarea
                rows={4}
                className={fieldCls}
                value={form.content || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, content: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">PDF page from</label>
                <input
                  type="number"
                  min={1}
                  className={fieldCls}
                  placeholder="e.g. 1"
                  value={form.pageFrom ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, pageFrom: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium">PDF page to</label>
                <input
                  type="number"
                  min={1}
                  className={fieldCls}
                  placeholder="e.g. 3"
                  value={form.pageTo ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, pageTo: e.target.value }))
                  }
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Module page range inside the chapter PDF (optional). Students jump
              to “page from” when they tap the module.
            </p>
            <div>
              <label className="text-xs font-medium">Difficulty</label>
              <select
                className={fieldCls}
                value={form.difficultyLevel || "medium"}
                onChange={(e) =>
                  setForm((f) => ({ ...f, difficultyLevel: e.target.value }))
                }
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={saveTopic}
              className="w-full py-2.5 rounded-xl text-sm font-medium bg-[rgb(var(--primary))] disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save topic"}
            </button>
          </div>
        </Modal>
      )}

      {modal === "viewChapter" && editTarget && (
        <Modal
          wide
          title={`Chapter — ${editTarget.name}`}
          subtitle={`${selectedBook?.title || "Book"} · Class ${
            selectedBook?.className || "—"
          } · ${selectedBook?.subjectName || ""} · ${
            (editTarget.topics || []).length
          } modules`}
          onClose={() => {
            setModal(null);
            setEditTarget(null);
          }}
        >
          <div className="space-y-4">
            <section className="rounded-xl border border-slate-200 px-4 py-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase text-slate-600 flex items-center gap-1.5">
                  <FaFilePdf /> Chapter PDF
                </p>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={chapterPdfInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={(e) =>
                      uploadChapterPdf(editTarget, e.target.files?.[0])
                    }
                  />
                  <button
                    type="button"
                    disabled={pdfUploading}
                    onClick={() => chapterPdfInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-700 text-white disabled:opacity-60"
                  >
                    {pdfUploading
                      ? "Uploading…"
                      : editTarget.pdf?.url
                        ? "Replace PDF"
                        : "Upload PDF"}
                  </button>
                  {editTarget.pdf?.url ? (
                    <button
                      type="button"
                      disabled={pdfUploading}
                      onClick={() => removeChapterPdf(editTarget)}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-red-200 text-red-600"
                    >
                      Remove upload
                    </button>
                  ) : null}
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Uploaded PDF is preferred in-app. Otherwise NCERT chapter PDF URL
                is used.
              </p>
            </section>

            <ChapterPdfViewer
              chapter={editTarget}
              topics={editTarget.topics || []}
            />

            <section className="rounded-xl border-2 border-amber-200 bg-amber-50/60 px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-800 mb-3">
                Study outline (Eduaitor)
              </p>
              <div className="text-sm text-slate-900 whitespace-pre-wrap leading-relaxed min-h-[80px]">
                {(editTarget.content || editTarget.description)?.trim()
                  ? editTarget.content || editTarget.description
                  : "No study outline added for this chapter yet. Click Edit main content to add it."}
              </div>
              {(editTarget.learningOutcomes || []).length > 0 && (
                <div className="mt-4 pt-3 border-t border-amber-200">
                  <p className="text-[11px] font-semibold text-amber-800 mb-1">
                    Learning outcomes
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    {editTarget.learningOutcomes.map((lo, i) => (
                      <li key={i} className="text-xs text-slate-700">
                        {lo}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2">
                Modules / topics
              </p>
              {(editTarget.topics || []).length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center border border-dashed border-slate-200 rounded-xl">
                  No topics in this chapter
                </p>
              ) : (
                <div className="space-y-3">
                  {editTarget.topics.map((t, idx) => (
                    <div
                      key={t._id || idx}
                      className="rounded-xl border border-slate-200 bg-[rgb(var(--surface))] px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-bold text-[rgb(var(--text))]">
                          {idx + 1}. {t.name}
                          {t.pageFrom ? (
                            <span className="ml-2 text-[10px] font-semibold text-emerald-700">
                              p.{t.pageFrom}
                              {t.pageTo ? `–${t.pageTo}` : ""}
                            </span>
                          ) : null}
                        </p>
                        {t.difficultyLevel ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize shrink-0">
                            {t.difficultyLevel}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {t.content?.trim()
                          ? t.content
                          : "No topic content added yet."}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setForm({
                    name: editTarget.name,
                    description: editTarget.description || "",
                    content:
                      editTarget.content || editTarget.description || "",
                    termHint: editTarget.termHint || "",
                  });
                  setModal("editChapter");
                }}
                className="flex-1 py-2.5 rounded-xl text-sm border border-slate-200"
              >
                Edit main content
              </button>
              <button
                type="button"
                onClick={() => {
                  setModal(null);
                  setEditTarget(null);
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-[rgb(var(--primary))]"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
