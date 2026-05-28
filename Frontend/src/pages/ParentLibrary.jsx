import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

// ─── Parent Library ────────────────────────────────────────────────────────────
// Read-only. Auth token supplies studentId + schoolId server-side.
// Book issuing is librarian-only — no request/issue actions here.

const ParentLibrary = () => {
  const API = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  const [activeTab, setActiveTab] = useState("books");
  const [searchTerm, setSearchTerm] = useState("");

  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);

  // populated from res.data.myIssues
  const [activeIssues, setActiveIssues] = useState([]);
  const [returnHistory, setReturnHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // ── fetch: books (debounced search) ─────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === "books") fetchBooks(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, activeTab]);

  useEffect(() => {
    if (activeTab === "books") fetchBooks(searchTerm);
    if (activeTab === "issued") fetchIssues("active");
    if (activeTab === "history") fetchIssues("returned");
  }, [activeTab]);

  const fetchBooks = async (search = "") => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/library/books`, {
        params: { search },
        withCredentials: true,
      });
      setBooks(res.data.data || []);
    } catch {
      toast.error("Could not load books");
    } finally {
      setLoading(false);
    }
  };

  // ── fetch: student's own issues ──────────────────────────────────────────────
  // getStudentIssuesBooks reads studentId from req.user — no param needed here.
  // status=active  → returnDate: null (books still out)
  // status=returned → status: "Returned"
  const fetchIssues = async (status = "active") => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/library/issues/my`, {
        params: { status },
        withCredentials: true,
      });
      const records = res.data.myIssues || [];
      if (status === "active") setActiveIssues(records);
      else setReturnHistory(records);
    } catch {
      toast.error("Could not load issue records");
    } finally {
      setLoading(false);
    }
  };

  // ── summary stats computed locally from fetched records ──────────────────────
  const issueRecords = activeTab === "issued" ? activeIssues : returnHistory;

  const summary =
    activeTab === "books"
      ? [
          { label: "Total titles", value: books.length, tone: "blue" },
          {
            label: "Available now",
            value: books.filter((b) => b.availableCopies > 0).length,
            tone: "green",
          },
          {
            label: "Low stock",
            value: books.filter(
              (b) => b.availableCopies > 0 && b.availableCopies < 3,
            ).length,
            tone: "amber",
          },
          {
            label: "Out of stock",
            value: books.filter((b) => b.availableCopies < 1).length,
            tone: "red",
          },
        ]
      : activeTab === "issued"
        ? [
            {
              label: "Currently issued",
              value: activeIssues.length,
              tone: "blue",
            },
            {
              label: "Overdue",
              value: activeIssues.filter((r) => r.status === "Overdue").length,
              tone: "red",
            },
            {
              label: "Fine due",
              value: `₹${activeIssues.reduce((s, r) => s + Math.max(0, (r.fineAmount || 0) - (r.finePaid || 0)), 0)}`,
              tone: "amber",
            },
            {
              label: "Fine paid",
              value: `₹${activeIssues.reduce((s, r) => s + (r.finePaid || 0), 0)}`,
              tone: "green",
            },
          ]
        : [
            {
              label: "Books returned",
              value: returnHistory.length,
              tone: "green",
            },
            {
              label: "With fine",
              value: returnHistory.filter((r) => r.fineAmount > 0).length,
              tone: "amber",
            },
            {
              label: "Fine paid",
              value: `₹${returnHistory.reduce((s, r) => s + (r.finePaid || 0), 0)}`,
              tone: "green",
            },
            {
              label: "Cleared",
              value: returnHistory.filter(
                (r) =>
                  (r.fineAmount || 0) === (r.finePaid || 0) && r.fineAmount > 0,
              ).length,
              tone: "blue",
            },
          ];

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen  pb-16">
      <ToastContainer />

      {/* ── header ── */}
      <div className="border-b border-slate-200 ">
        {isMobile && (
          <div className="px-4 pt-4">
            <button
              onClick={() => navigate(-1)}
              className="mb-2.5 flex items-center gap-2 rounded-xl border border-slate-100
                         bg-white px-3 py-1.5 text-sm font-bold text-slate-600 shadow-sm
                         transition active:scale-95"
            >
              <FaArrowLeft size={14} /> Back
            </button>
          </div>
        )}
        <div className="mx-auto max-w-5xl px-4 py-6">
          <h1 className="text-2xl font-black tracking-tight ">
            School Library
          </h1>
          <p className="mt-1 text-sm text-[rgb(var(--text))]">
            Browse the collection and track your child's borrowing activity.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        {/* ── stat cards ── */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {summary.map((c) => (
            <StatCard key={c.label} {...c} />
          ))}
        </div>

        {/* ── tabs + search ── */}
        <div className="rounded-2xl border border-slate-200 bg-[rgb(var(--surface))] p-3 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex rounded-xl border p-1 shrink-0">
              <TabBtn
                active={activeTab === "books"}
                label="Books"
                onClick={() => {
                  setActiveTab("books");
                  setSelectedBook(null);
                }}
              />
              <TabBtn
                active={activeTab === "issued"}
                label="Active Issued"
                onClick={() => {
                  setActiveTab("issued");
                  setSelectedBook(null);
                }}
              />
              <TabBtn
                active={activeTab === "history"}
                label="Return History"
                onClick={() => {
                  setActiveTab("history");
                  setSelectedBook(null);
                }}
              />
            </div>

            {activeTab === "books" && (
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title, author, ISBN or category…"
                className="flex-1 rounded-xl  px-4 py-3 text-sm outline-none
                           ring-1 ring-slate-200 focus:ring-blue-300"
              />
            )}
          </div>
        </div>

        {/* ── loading ── */}
        {loading && (
          <div className="py-12 text-center text-sm font-bold text-[rgb(var(--text))] tracking-wide">
            Loading…
          </div>
        )}

        {/* ── books tab ── */}
        {!loading &&
          activeTab === "books" &&
          (selectedBook ? (
            <BookDetailCard
              book={selectedBook}
              onBack={() => setSelectedBook(null)}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {books.length === 0 ? (
                <EmptyState
                  title="No books found"
                  description="Try a different search term or check back later."
                />
              ) : (
                books.map((book) => (
                  <BookCard
                    key={book._id}
                    book={book}
                    onClick={() => setSelectedBook(book)}
                  />
                ))
              )}
            </div>
          ))}

        {/* ── issue / history tab ── */}
        {!loading && (activeTab === "issued" || activeTab === "history") && (
          <IssueCards records={issueRecords} mode={activeTab} />
        )}
      </div>
    </div>
  );
};

// ─── Book browse card ──────────────────────────────────────────────────────────
const BookCard = ({ book, onClick }) => (
  <button
    onClick={onClick}
    className="w-full text-left rounded-2xl border border-slate-200  p-5 shadow-sm
               hover:border-blue-200 hover:shadow-md transition-all"
  >
    <div className="mb-3 flex items-start justify-between  gap-2">
      <span className="rounded-md px-2 py-1  bg-[rgb(var(--primary))] text-[10px] font-bold uppercase tracking-wide text-[rgb(var(--text))]">
        {book.category}
      </span>
      <AvailPill copies={book.availableCopies} />
    </div>
    <h3 className="text-base font-black text-[rgb(var(--text))] leading-snug line-clamp-2">
      {book.title}
    </h3>
    <p className="mt-1 text-sm italic text-[rgb(var(--primary))]">by {book.author}</p>
    <p className="mt-3 text-xs text-[rgb(var(--text))]">ISBN: {book.isbn}</p>
  </button>
);

// ─── Book detail (full read-only) ─────────────────────────────────────────────
const BookDetailCard = ({ book, onBack }) => {
  const pct = Math.round((book.availableCopies / book.totalCopies) * 100);
  return (
    <div className="rounded-2xl border border-slate-200  bg-[rgb(var(--surface))] text-[rgb(var(--text))]  p-6 shadow-sm max-w-xl">
      <button
        onClick={onBack}
        className="mb-5 flex items-center gap-1.5 text-sm font-bold text-[rgb(var(--text))]  transition"
      >
        <FaArrowLeft size={12} /> Back to books
      </button>

      <div className="mb-5">
        <span className="rounded-md bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[rgb(var(--primary))]">
          {book.category}
        </span>
        <h2 className="mt-3 text-2xl font-black text-[rgb(var(--primary))]">
          {book.title}
        </h2>
        <p className="mt-1 text-sm italic text-[rgb(var(--text))]">by {book.author}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <InfoBox label="ISBN" value={book.isbn} />
        <InfoBox
          label="Available copies"
          value={`${book.availableCopies} / ${book.totalCopies}`}
          tone={
            book.availableCopies < 1
              ? "red"
              : book.availableCopies < 3
                ? "amber"
                : "green"
          }
        />
        <InfoBox label="Total copies" value={book.totalCopies} />
        <InfoBox
          label="Status"
          value={
            book.availableCopies < 1
              ? "Out of stock"
              : book.availableCopies < 3
                ? "Low stock"
                : "In stock"
          }
          tone={
            book.availableCopies < 1
              ? "red"
              : book.availableCopies < 3
                ? "amber"
                : "green"
          }
        />
      </div>

      {/* availability bar */}
      <div className="mb-5">
        <p className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-[rgb(var(--text))]">
          Copy availability — {pct}%
        </p>
        <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              book.availableCopies < 1
                ? "bg-red-400"
                : book.availableCopies < 3
                  ? "bg-amber-400"
                  : "bg-emerald-400"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="rounded-xlbg-[rgb(var(--surface))] text-[rgb(var(--primary))] border rounded-xl px-4 py-3 text-xs font-medium">
        Books can only be issued by the school librarian. Please contact the
        library to borrow this title.
      </div>
    </div>
  );
};

// ─── Issue cards list ─────────────────────────────────────────────────────────
const IssueCards = ({ records, mode }) => {
  if (records.length === 0) {
    return (
      <EmptyState
        title={mode === "issued" ? "No active issues" : "No return history"}
        description={
          mode === "issued"
            ? "Your child currently has no books checked out."
            : "No books have been returned yet."
        }
      />
    );
  }
  return (
    <div className="space-y-4">
      {records.map((record) => (
        <IssueCard key={record._id} record={record} mode={mode} />
      ))}
    </div>
  );
};

// ─── Single issue card ─────────────────────────────────────────────────────────
// Matches getStudentIssuesBooks response shape:
//   record.bookId       → { title, author, isbn, category }      (populated)
//   record.studentId    → { name, admissionNumber }               (populated)
//   record.issueDate, record.dueDate, record.returnDate
//   record.status       → "Issued" | "Overdue" | "Returned"
//   record.fineAmount, record.finePaid
const IssueCard = ({ record, mode }) => {
  const isOverdue = record.status === "Overdue";
  const fine = record.fineAmount || 0;
  const paid = record.finePaid || 0;
  const remaining = Math.max(0, fine - paid);

  return (
    <div
      className={`rounded-2xl border bg-[rgb(var(--surface))] text-[rgb(var(--text))]  shadow-sm overflow-hidden ${
        isOverdue ? "border-red-200" : "border-slate-200"
      }`}
    >
      {/* overdue banner */}
      {isOverdue && (
        <div className="bg-red-50 border-b border-red-100 px-5 py-2 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 inline-block" />
          <p className="text-xs font-bold text-red-600">
            Overdue — please return this book to the library
          </p>
        </div>
      )}

      <div className="p-5">
        {/* book info + badge */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <span className="inline-block rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[rgb(var(--primary))] mb-2">
              {record.bookId?.category || "Library"}
            </span>
            <h3 className="text-lg font-black text-[rgb(var(--text))] leading-snug">
              {record.bookId?.title}
            </h3>
            <p className="mt-0.5 text-sm italic text-[rgb(var(--text))]">
              by {record.bookId?.author}
            </p>
            <p className="mt-1 text-xs text-[rgb(var(--text))]">
              ISBN: {record.bookId?.isbn}
            </p>
          </div>
          <StatusBadge status={record.status} />
        </div>

        {/* admission number chip */}
        {record.studentId?.admissionNumber && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-xl  border border-slate-100 px-3 py-2">
            <span className="text-[10px] font-black uppercase tracking-wide text-[rgb(var(--text))]">
              Admission no.
            </span>
            <span className="text-sm font-bold text-[rgb(var(--text))]">
              {record.studentId.admissionNumber}
            </span>
          </div>
        )}

        {/* date grid */}
        <div
          className={`grid gap-3 ${mode === "history" ? "grid-cols-3" : "grid-cols-2"}`}
        >
          <DateBox label="Issue date" value={formatDate(record.issueDate)} />
          <DateBox
            label="Due date"
            value={formatDate(record.dueDate)}
            tone={isOverdue ? "red" : null}
          />
          {mode === "history" && (
            <DateBox
              label="Return date"
              value={formatDate(record.returnDate)}
              tone="green"
            />
          )}
        </div>

        {/* fine section — only when fine > 0 */}
        {fine > 0 && (
          <div
            className={`mt-4 rounded-2xl border p-4 ${
              remaining > 0
                ? " border-red-100"
                : "border-emerald-100"
            }`}
          >
            <p
              className={`mb-3 text-[10px] font-black uppercase tracking-widest ${
                remaining > 0 ? "text-red-400" : "text-emerald-500"
              }`}
            >
              Fine details
            </p>

            <div className="grid grid-cols-3 gap-3">
              <FineBox
                label="Total fine"
                value={`₹${fine}`}
                tone={remaining > 0 ? "red" : "slate"}
              />
              <FineBox label="Amount paid" value={`₹${paid}`} tone="green" />
              <FineBox
                label={remaining > 0 ? "Balance due" : "Cleared"}
                value={remaining > 0 ? `₹${remaining}` : "₹0"}
                tone={remaining > 0 ? "red" : "green"}
                bold
              />
            </div>

            {remaining > 0 && (
              <p className="mt-3 text-xs font-medium text-[rgb(var(--primary))]">
                ₹{remaining} is still outstanding. Please pay at the school
                library counter.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Atom components ──────────────────────────────────────────────────────────

const TabBtn = ({ active, label, onClick }) => (
  <button
    onClick={onClick}
    className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
      active
        ? "bg-[rgb(var(--primary))] text-[rgb(var(--text))]shadow-sm"
        : "text-[rgb(var(--text))]"
    }`}
  >
    {label}
  </button>
);

const StatCard = ({ label, value, tone }) => {
  const bg = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  };
  return (
    <div className="rounded-2xl border border-slate-200  p-4 shadow-sm">
      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-[rgb(var(--text))]">
        {label}
      </p>
      <p
        className={`inline-block rounded-xl px-3 py-1.5 text-xl font-black ${bg[tone]}`}
      >
        {value}
      </p>
    </div>
  );
};

const AvailPill = ({ copies }) => {
  if (copies < 1)
    return (
      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
        Out
      </span>
    );
  if (copies < 3)
    return (
      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
        Low
      </span>
    );
  return (
    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
      In stock
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const map = {
    Issued: "bg-blue-50 text-blue-700",
    Overdue: "bg-red-50 text-red-700",
    Returned: "bg-emerald-50 text-emerald-700",
  };
  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${map[status] || "bg-slate-100 text-slate-600"}`}
    >
      {status}
    </span>
  );
};

const InfoBox = ({ label, value, tone }) => {
  const tones = {
    red: "text-red-600",
    green: "text-emerald-700",
    amber: "text-amber-700",
  };
  return (
    <div className="rounded-xl  border border-slate-100 p-3">
      <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-[rgb(var(--text))]">
        {label}
      </p>
      <p
        className={`text-sm font-bold ${tone ? tones[tone] : ""}`}
      >
        {value}
      </p>
    </div>
  );
};

const DateBox = ({ label, value, tone }) => {
  const toneMap = {
    red: "border-red-100",
    green: "border-emerald-100",
  };
  const textMap = {
    red: "text-red-700",
    green: "text-emerald-700",
  };
  return (
    <div
      className={`rounded-xl border p-3 ${tone ? toneMap[tone] : "bg-[rgb(var(--surface))] text-[rgb(var(--text))] border-slate-100"}`}
    >
      <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-[rgb(var(--text))]">
        {label}
      </p>
      <p
        className={`text-sm font-bold ${tone ? textMap[tone] : "text-[rgb(var(--text))]"}`}
      >
        {value}
      </p>
    </div>
  );
};

const FineBox = ({ label, value, tone, bold }) => {
  const tones = {
    red: "text-red-700",
    green: "text-emerald-700",
    slate: "text-slate-700",
  };
  return (
    <div className="rounded-xl bg-[rgb(var(--surface))] border border-[rgb(var(--border))] p-3">
      <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-[rgb(var(--text))]">
        {label}
      </p>
      <p
        className={`text-base ${bold ? "font-black" : "font-bold"} ${tones[tone] || ""}`}
      >
        {value}
      </p>
    </div>
  );
};

const EmptyState = ({ title, description }) => (
  <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
    <h3 className="text-lg font-black text-slate-900">{title}</h3>
    <p className="mt-2 text-sm text-[rgb(var(--text))]">{description}</p>
  </div>
);

const formatDate = (val) => {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default ParentLibrary;
