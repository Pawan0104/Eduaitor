import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FaArrowLeft,
  FaBook,
  FaExternalLinkAlt,
  FaEye,
  FaListUl,
} from "react-icons/fa";
import ChapterPdfViewer from "../components/ChapterPdfViewer";

const API = import.meta.env.VITE_API_URL;
const NCERT_HOME = "https://ncert.nic.in/textbook.php";

const fieldCls =
  "w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-slate-400";

function ViewChapterModal({ chapter, book, onClose }) {
  if (!chapter) return null;

  const mainContent = (chapter.content || chapter.description || "").trim();
  const portalUrl =
    chapter.ncertPortalUrl || book?.ncertPortalUrl || NCERT_HOME;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/45 p-0 sm:p-4">
      <div className="bg-[rgb(var(--surface))] w-full sm:max-w-4xl rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] flex flex-col text-[rgb(var(--text))]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="min-w-0 pr-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
              Chapter
            </p>
            <h2 className="text-base font-semibold mt-0.5">{chapter.name}</h2>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              Book: {book?.title || "—"} · Class {book?.className || "—"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg text-xl shrink-0 border border-slate-200"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          <ChapterPdfViewer
            chapter={chapter}
            topics={chapter.topics || []}
          />

          {portalUrl ? (
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800"
            >
              <FaExternalLinkAlt size={10} /> Open chapter on NCERT website
            </a>
          ) : null}

          <section className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-bold uppercase text-slate-600 mb-2">
              Study outline (Eduaitor)
            </p>
            <p className="text-sm whitespace-pre-wrap leading-relaxed text-slate-800">
              {mainContent || "No study outline available for this chapter."}
            </p>
          </section>

          {(chapter.learningOutcomes || []).length > 0 && (
            <section>
              <p className="text-xs font-bold uppercase text-slate-600 mb-2">
                Learning outcomes
              </p>
              <ul className="list-disc pl-5 space-y-1">
                {chapter.learningOutcomes.map((lo, i) => (
                  <li key={i} className="text-sm text-slate-700">
                    {lo}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <p className="text-xs font-bold uppercase text-slate-600 mb-2">
              Modules / topics ({(chapter.topics || []).length})
            </p>
            {(chapter.topics || []).length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6 border border-dashed border-slate-200 rounded-xl">
                No topics in this chapter
              </p>
            ) : (
              <div className="space-y-2">
                {chapter.topics.map((t, idx) => (
                  <div
                    key={t._id || idx}
                    className="rounded-xl border border-slate-200 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">
                        {idx + 1}. {t.name}
                      </p>
                      {t.pageFrom ? (
                        <span className="text-[10px] font-semibold text-emerald-800 shrink-0">
                          p.{t.pageFrom}
                          {t.pageTo ? `–${t.pageTo}` : ""}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-600 mt-2 whitespace-pre-wrap leading-relaxed">
                      {t.content?.trim()
                        ? t.content
                        : "No topic content available."}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="px-5 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[rgb(var(--primary))]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Read-only syllabus books browser for Parent & Student.
 * Flow: Books list → Chapters list → Chapter content modal
 */
export default function SyllabusBooksViewer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
  const isParent = user?.loginAs === "parent";

  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [boardId, setBoardId] = useState("");
  const [studentClassName, setStudentClassName] = useState("");

  /** "books" | "chapters" */
  const [screen, setScreen] = useState("books");
  const [selectedBook, setSelectedBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [viewChapter, setViewChapter] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        let preferredClass = "";
        if (user?.student_id) {
          try {
            const stu = await axios.get(`${API}/students/${user.student_id}`, {
              withCredentials: true,
            });
            const raw =
              stu.data?.data?.classId?.name || stu.data?.classId?.name || "";
            const match = String(raw).match(/(\d{1,2})/);
            preferredClass = match ? match[1] : "";
          } catch {
            /* catalog still loads */
          }
        }

        const res = await axios.get(`${API}/syllabus-catalog/school-catalog`, {
          withCredentials: true,
          params: preferredClass ? { className: preferredClass } : undefined,
        });
        const boards = res.data.data || [];
        setCatalog(boards);
        const fromApi = res.data.studentClassName || preferredClass || "";
        setStudentClassName(fromApi);
        if (boards[0]?._id) setBoardId(boards[0]._id);
        if (!fromApi) {
          toast.info("No class is linked to this account yet");
        }
      } catch (err) {
        toast.error(
          err.response?.data?.message || "Failed to load syllabus books",
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.student_id]);

  const board = useMemo(
    () => catalog.find((b) => b._id === boardId),
    [catalog, boardId],
  );

  const books = useMemo(() => {
    if (!board?.books) return [];
    // Student/parent: only books for their own class
    if (!studentClassName) return [];
    return board.books.filter((b) => b.className === studentClassName);
  }, [board, studentClassName]);

  const openBook = async (book) => {
    setLoadingChapters(true);
    setSelectedBook(book);
    setChapters([]);
    setScreen("chapters");
    try {
      const res = await axios.get(`${API}/syllabus-catalog/books/${book._id}`, {
        withCredentials: true,
      });
      const detail = res.data?.data;
      setSelectedBook(detail?.book || book);
      setChapters(detail?.chapters || []);
      if (!(detail?.chapters || []).length) {
        toast.info("This book has no chapters yet");
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to open book chapters",
      );
      setScreen("books");
      setSelectedBook(null);
    } finally {
      setLoadingChapters(false);
    }
  };

  const backToBooks = () => {
    setScreen("books");
    setSelectedBook(null);
    setChapters([]);
    setViewChapter(null);
  };

  return (
    <div className="min-h-screen p-4 sm:p-8 text-[rgb(var(--text))]">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />

      {isMobile && (
        <button
          type="button"
          onClick={() => (screen === "chapters" ? backToBooks() : navigate(-1))}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white shadow-sm border border-slate-100 text-sm font-bold text-slate-600 mb-3"
        >
          <FaArrowLeft size={16} />{" "}
          {screen === "chapters" ? "Back to books" : "Back"}
        </button>
      )}

      <div className="mb-5">
        <h1 className="text-xl font-semibold">
          {screen === "chapters" ? "Book chapters" : "Syllabus Books"}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {screen === "chapters"
            ? `Chapters inside “${selectedBook?.title || "book"}”`
            : `${isParent ? "Browse your child's" : "Browse your"} NCERT / CBSE / RBSE books${
                studentClassName ? ` · Class ${studentClassName}` : ""
              }`}
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500 text-center py-16">Loading…</p>
      ) : catalog.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-16">
          No syllabus books available yet.
        </p>
      ) : screen === "books" ? (
        <div className="space-y-4 max-w-3xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">Board</label>
              <select
                className={fieldCls}
                value={boardId}
                onChange={(e) => setBoardId(e.target.value)}
              >
                {catalog.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">Class</label>
              <div
                className={`${fieldCls} flex items-center font-semibold text-slate-700`}
              >
                {studentClassName
                  ? `Class ${studentClassName}`
                  : "Class not linked"}
              </div>
            </div>
          </div>

          <div className="bg-[rgb(var(--surface))] border border-slate-200 rounded-2xl p-3">
            <p className="text-xs font-semibold uppercase text-slate-500 mb-3 flex items-center gap-2">
              <FaBook size={12} /> Books ({books.length})
            </p>

            {books.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-10">
                {studentClassName
                  ? `No books for Class ${studentClassName} on this board`
                  : "Link a class to this student account to see books"}
              </p>
            ) : (
              <div className="space-y-2">
                {books.map((book) => (
                  <div
                    key={book._id}
                    className="rounded-xl border border-slate-200 px-3 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase text-amber-700">
                        Book
                      </p>
                      <p className="text-sm font-semibold truncate">
                        {book.title}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Class {book.className} · {book.subjectName}
                        {book.medium ? ` · ${book.medium}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openBook(book)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[rgb(var(--primary))] shrink-0"
                    >
                      <FaListUl size={12} /> Open book
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4 max-w-3xl">
          {!isMobile && (
            <button
              type="button"
              onClick={backToBooks}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600"
            >
              <FaArrowLeft size={14} /> Back to books
            </button>
          )}

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
            <p className="text-[10px] font-bold uppercase text-amber-700">
              Selected book
            </p>
            <p className="text-sm font-semibold mt-0.5">
              {selectedBook?.title}
            </p>
            <p className="text-[11px] text-slate-600">
              Class {selectedBook?.className} · {selectedBook?.subjectName}
            </p>
            {selectedBook?.ncertPortalUrl ? (
              <a
                href={selectedBook.ncertPortalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800"
              >
                <FaExternalLinkAlt size={10} /> Open full book on NCERT
              </a>
            ) : null}
          </div>

          <div className="bg-[rgb(var(--surface))] border border-slate-200 rounded-2xl p-3">
            <p className="text-xs font-semibold uppercase text-slate-500 mb-3">
              Chapters ({chapters.length})
            </p>

            {loadingChapters ? (
              <p className="text-sm text-slate-500 text-center py-10">
                Loading chapters…
              </p>
            ) : chapters.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-10">
                No chapters in this book yet
              </p>
            ) : (
              <div className="space-y-2">
                {chapters.map((ch, idx) => (
                  <div
                    key={ch._id}
                    className="rounded-xl border border-slate-200 px-3 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase text-slate-500">
                        Chapter {idx + 1}
                      </p>
                      <p className="text-sm font-semibold">{ch.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {(ch.topics || []).length} topics
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewChapter(ch)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[rgb(var(--primary))] shrink-0"
                    >
                      <FaEye size={12} /> View chapter
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ViewChapterModal
        chapter={viewChapter}
        book={selectedBook}
        onClose={() => setViewChapter(null)}
      />
    </div>
  );
}
