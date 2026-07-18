import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FiX } from "react-icons/fi";

const API = import.meta.env.VITE_API_URL;

/**
 * Modal for school/teacher/staff to import books from Super Admin catalog.
 * Props:
 *  - open, onClose, onImported
 *  - classes, terms
 *  - selectedClass, selectedSubject, selectedTerm (prefill)
 *  - subjects (for selected class)
 */
export default function ImportSyllabusCatalog({
  open,
  onClose,
  onImported,
  classes = [],
  terms = [],
  subjects = [],
  selectedClass = "",
  selectedSubject = "",
  selectedTerm = "",
}) {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const [boardId, setBoardId] = useState("");
  const [className, setClassName] = useState("");
  const [selectedBookIds, setSelectedBookIds] = useState([]);
  const [targetClassId, setTargetClassId] = useState(selectedClass || "");
  const [targetTermId, setTargetTermId] = useState(selectedTerm || "");
  const [targetSubjectId, setTargetSubjectId] = useState(selectedSubject || "");
  const [mode, setMode] = useState("merge");

  useEffect(() => {
    if (!open) return;
    setTargetClassId(selectedClass || "");
    setTargetTermId(selectedTerm || "");
    setTargetSubjectId(selectedSubject || "");
    setSelectedBookIds([]);
    setBoardId("");
    setClassName("");
    setMode("merge");

    const load = async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          `${API}/syllabus-catalog/school-catalog`,
          { withCredentials: true },
        );
        setCatalog(res.data.data || []);
      } catch (err) {
        toast.error(
          err.response?.data?.message || "Failed to load syllabus catalog",
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, selectedClass, selectedSubject, selectedTerm]);

  const board = useMemo(
    () => catalog.find((b) => b._id === boardId),
    [catalog, boardId],
  );

  const classOptions = useMemo(() => {
    if (!board?.books?.length) return [];
    return Array.from(new Set(board.books.map((b) => b.className))).sort(
      (a, b) => Number(a) - Number(b) || a.localeCompare(b),
    );
  }, [board]);

  const books = useMemo(() => {
    if (!board?.books) return [];
    return board.books.filter(
      (b) => !className || b.className === className,
    );
  }, [board, className]);

  const toggleBook = (id) => {
    setSelectedBookIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectAllVisible = () => {
    setSelectedBookIds(books.map((b) => b._id));
  };

  const handleImport = async () => {
    if (!selectedBookIds.length) {
      return toast.error("Select at least one book");
    }
    if (!targetClassId || !targetTermId) {
      return toast.error("Choose target class and term");
    }

    setImporting(true);
    try {
      const body = {
        bookIds: selectedBookIds,
        classId: targetClassId,
        termId: targetTermId,
        mode,
      };
      if (selectedBookIds.length === 1 && targetSubjectId) {
        body.subjectId = targetSubjectId;
      }

      const res = await axios.post(`${API}/syllabus-catalog/import`, body, {
        withCredentials: true,
      });
      toast.success(res.data.message || "Syllabus imported");
      onImported?.(res.data.data);
      onClose?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  if (!open) return null;

  const fieldCls =
    "w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-slate-400";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-[rgb(var(--surface))] w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] flex flex-col text-[rgb(var(--text))]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-semibold">Import from catalog</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Choose NCERT / CBSE / RBSE books — chapters & topics copy into your
              school syllabus.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {loading ? (
            <p className="text-sm text-slate-500 text-center py-10">Loading…</p>
          ) : catalog.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">
              No global syllabus boards available yet. Ask Super Admin to add
              NCERT / CBSE / RBSE.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Board / syllabus</label>
                  <select
                    className={fieldCls}
                    value={boardId}
                    onChange={(e) => {
                      setBoardId(e.target.value);
                      setClassName("");
                      setSelectedBookIds([]);
                    }}
                  >
                    <option value="">Select board…</option>
                    {catalog.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium">Catalog class</label>
                  <select
                    className={fieldCls}
                    value={className}
                    disabled={!boardId}
                    onChange={(e) => {
                      setClassName(e.target.value);
                      setSelectedBookIds([]);
                    }}
                  >
                    <option value="">All classes</option>
                    {classOptions.map((c) => (
                      <option key={c} value={c}>
                        Class {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium">
                    Books ({selectedBookIds.length} selected)
                  </label>
                  {books.length > 0 && (
                    <button
                      type="button"
                      onClick={selectAllVisible}
                      className="text-[11px] text-slate-600 underline"
                    >
                      Select all shown
                    </button>
                  )}
                </div>
                <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {books.length === 0 ? (
                    <p className="text-xs text-slate-500 p-4 text-center">
                      {boardId
                        ? "No books for this filter"
                        : "Select a board first"}
                    </p>
                  ) : (
                    books.map((book) => (
                      <label
                        key={book._id}
                        className="flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={selectedBookIds.includes(book._id)}
                          onChange={() => toggleBook(book._id)}
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">
                            {book.title}
                          </span>
                          <span className="block text-[11px] text-slate-500">
                            Class {book.className} · {book.subjectName}
                            {book.medium ? ` · ${book.medium}` : ""}
                          </span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium">Import into class</label>
                  <select
                    className={fieldCls}
                    value={targetClassId}
                    onChange={(e) => setTargetClassId(e.target.value)}
                  >
                    <option value="">Select class…</option>
                    {classes.map((c) => (
                      <option key={c._id} value={c._id}>
                        Class {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium">Term</label>
                  <select
                    className={fieldCls}
                    value={targetTermId}
                    onChange={(e) => setTargetTermId(e.target.value)}
                  >
                    <option value="">Select term…</option>
                    {terms.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium">
                    Subject (optional)
                  </label>
                  <select
                    className={fieldCls}
                    value={targetSubjectId}
                    onChange={(e) => setTargetSubjectId(e.target.value)}
                    disabled={selectedBookIds.length !== 1}
                  >
                    <option value="">
                      {selectedBookIds.length === 1
                        ? "Auto from book name"
                        : "Auto per book"}
                    </option>
                    {subjects.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium">If chapters exist</label>
                <div className="flex gap-3 mt-1">
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="radio"
                      checked={mode === "merge"}
                      onChange={() => setMode("merge")}
                    />
                    Merge (skip duplicates)
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="radio"
                      checked={mode === "replace"}
                      onChange={() => setMode("replace")}
                    />
                    Replace subject+term
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm border border-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={importing || !selectedBookIds.length}
            onClick={handleImport}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-[rgb(var(--primary))] disabled:opacity-50"
          >
            {importing ? "Importing…" : "Import selected"}
          </button>
        </div>
      </div>
    </div>
  );
}
