import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const initialBookForm = {
  title: "",
  author: "",
  category: "",
  isbn: "",
  totalCopies: 1,
};

const initialIssueForm = {
  studentId: "",
  dueDate: "",
};

const bookCategories = [
  "Fiction",
  "Non-Fiction",
  "Science",
  "Mathematics",
  "History",
  "Language",
  "Reference",
  "Technology",
];

const LibraryManagement = () => {
  const API = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  const [activeTab, setActiveTab] = useState("inventory");
  const [searchTerm, setSearchTerm] = useState("");
  const [books, setBooks] = useState([]);
  const [students, setStudents] = useState([]);
  const [issueRecords, setIssueRecords] = useState([]);
  const [inventoryStats, setInventoryStats] = useState({
    totalTitles: 0,
    totalCopies: 0,
    availableCopies: 0,
    lowStock: 0,
  });
  const [issueStats, setIssueStats] = useState({
    totalIssued: 0,
    overdue: 0,
    returned: 0,
    pendingFine: 0,
  });

  const [showBookModal, setShowBookModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [bookForm, setBookForm] = useState(initialBookForm);
  const [issueForm, setIssueForm] = useState(initialIssueForm);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === "inventory") {
        fetchBooks(searchTerm);
      } else {
        fetchIssueRecords(
          searchTerm,
          activeTab === "circulation" ? "active" : "returned",
        );
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [activeTab, searchTerm]);

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${API}/students`, { withCredentials: true });
      setStudents(res.data.data || []);
    } catch (error) {
      toast.error("Could not load students");
    }
  };

  const fetchBooks = async (search = "") => {
    try {
      const res = await axios.get(`${API}/library/books`, {
        params: {
          search,
        },
        withCredentials: true,
      });
      const data = res.data.data || [];
      setBooks(data);
      setInventoryStats({
        totalTitles: data.length,
        totalCopies: data.reduce(
          (sum, book) => sum + (book.totalCopies || 0),
          0,
        ),
        availableCopies: data.reduce(
          (sum, book) => sum + (book.availableCopies || 0),
          0,
        ),
        lowStock: data.filter((book) => (book.availableCopies || 0) < 2).length,
      });
    } catch (error) {
      toast.error(error.response?.data?.error || "Could not load books");
    }
  };

  const fetchIssueRecords = async (search = "", status = "active") => {
    try {
      const res = await axios.get(`${API}/library/issues`, {
        params: {
          search,
          status,
        },
        withCredentials: true,
      });
      setIssueRecords(res.data.allissuebook || []);
      setIssueStats(
        res.data.summary || {
          totalIssued: 0,
          overdue: 0,
          returned: 0,
          pendingFine: 0,
        },
      );
    } catch (error) {
      toast.error(
        error.response?.data?.error || "Could not load issue records",
      );
    }
  };

  const refreshCurrentTab = () => {
    if (activeTab === "inventory") {
      fetchBooks(searchTerm);
      return;
    }

    fetchIssueRecords(
      searchTerm,
      activeTab === "circulation" ? "active" : "returned",
    );
    fetchBooks("");
  };

  const closeAllModals = () => {
    setShowBookModal(false);
    setShowIssueModal(false);
    setShowDetailsModal(false);
    setShowDeleteConfirm(false);
    setSelectedBook(null);
    setSelectedIssue(null);
    setIsEditing(false);
    setBookForm(initialBookForm);
    setIssueForm(initialIssueForm);
  };

  const openAddBookModal = () => {
    setIsEditing(false);
    setSelectedBook(null);
    setBookForm(initialBookForm);
    setShowBookModal(true);
  };

  const openEditBookModal = () => {
    if (!selectedBook) return;

    setBookForm({
      title: selectedBook.title || "",
      author: selectedBook.author || "",
      category: selectedBook.category || "",
      isbn: selectedBook.isbn || "",
      totalCopies: selectedBook.totalCopies || 1,
    });
    setIsEditing(true);
    setShowDetailsModal(false);
    setShowBookModal(true);
  };

  const handleSaveBook = async (event) => {
    event.preventDefault();
    const payload = {
      ...bookForm,
      totalCopies: Number(bookForm.totalCopies),
    };

    const loader = toast.loading(
      isEditing ? "Updating book..." : "Adding book...",
    );

    try {
      if (isEditing && selectedBook) {
        await axios.put(`${API}/library/books/${selectedBook._id}`, payload, {
          withCredentials: true,
        });
      } else {
        await axios.post(`${API}/library/books`, payload, {
          withCredentials: true,
        });
      }

      toast.update(loader, {
        render: isEditing
          ? "Book updated successfully"
          : "Book added successfully",
        type: "success",
        isLoading: false,
        autoClose: 2000,
      });
      closeAllModals();
      fetchBooks(searchTerm);
    } catch (error) {
      toast.update(loader, {
        render: error.response?.data?.error || "Could not save book",
        type: "error",
        isLoading: false,
        autoClose: 2500,
      });
    }
  };

  const handleDeleteBook = async () => {
    if (!selectedBook) return;

    const loader = toast.loading("Deleting book...");

    try {
      await axios.delete(`${API}/library/books/${selectedBook._id}`, {
        withCredentials: true,
      });
      toast.update(loader, {
        render: "Book deleted successfully",
        type: "success",
        isLoading: false,
        autoClose: 2000,
      });
      closeAllModals();
      fetchBooks(searchTerm);
    } catch (error) {
      toast.update(loader, {
        render: error.response?.data?.error || "Could not delete book",
        type: "error",
        isLoading: false,
        autoClose: 2500,
      });
    }
  };

  const handleIssueBook = async (event) => {
    event.preventDefault();
    if (!selectedBook) return;

    const loader = toast.loading("Issuing book...");

    try {
      await axios.post(
        `${API}/library/issues`,
        {
          bookId: selectedBook._id,
          studentId: issueForm.studentId,
          dueDate: issueForm.dueDate,
        },
        {
          withCredentials: true,
        },
      );

      toast.update(loader, {
        render: "Book issued successfully",
        type: "success",
        isLoading: false,
        autoClose: 2000,
      });
      closeAllModals();
      fetchBooks(searchTerm);
      fetchIssueRecords("", "active");
    } catch (error) {
      toast.update(loader, {
        render: error.response?.data?.error || "Could not issue book",
        type: "error",
        isLoading: false,
        autoClose: 2500,
      });
    }
  };

  const handleReturnBook = async () => {
    if (!selectedIssue) return;

    const loader = toast.loading("Processing return...");

    try {
      await axios.post(
        `${API}/library/issues/${selectedIssue._id}/return`,
        {
          finePaid: selectedIssue.fineAmount || 0,
        },
        {
          withCredentials: true,
        },
      );

      toast.update(loader, {
        render: "Book returned successfully",
        type: "success",
        isLoading: false,
        autoClose: 2000,
      });
      closeAllModals();
      refreshCurrentTab();
    } catch (error) {
      toast.update(loader, {
        render: error.response?.data?.error || "Could not return book",
        type: "error",
        isLoading: false,
        autoClose: 2500,
      });
    }
  };

  const statCards =
    activeTab === "inventory"
      ? [
          { title: "Titles", value: inventoryStats.totalTitles, tone: "blue" },
          {
            title: "Total Copies",
            value: inventoryStats.totalCopies,
            tone: "slate",
          },
          {
            title: "Available",
            value: inventoryStats.availableCopies,
            tone: "green",
          },
          { title: "Low Stock", value: inventoryStats.lowStock, tone: "amber" },
        ]
      : [
          {
            title: "Active Issues",
            value: issueStats.totalIssued,
            tone: "blue",
          },
          { title: "Overdue", value: issueStats.overdue, tone: "red" },
          { title: "Returned", value: issueStats.returned, tone: "green" },
          {
            title: "Pending Fine",
            value: `Rs ${issueStats.pendingFine || 0}`,
            tone: "amber",
          },
        ];

  const minDueDate = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen text-[rgb(var(--text))] p-8">
      <ToastContainer />

      <div className="border-b border-slate-200">
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
        <div className="mx-auto flex max-w-7xl items-center rounded-2xl justify-between px-4 py-6 text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[rgb(var(--text))]">
              Library Management
            </h1>
            <p className="text-sm text-[rgb(var(--text))]">
              Manage inventory, issue books to students, and process returns
              with school-ready workflows.
            </p>
          </div>
          <button
            onClick={openAddBookModal}
            className="hidden rounded-xl bg-[rgb(var(--primary))] px-5 py-2.5 text-sm font-bold text-[rgb(var(--text))] shadow-lg sm:block"
          >
            Add Book
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {statCards.map((card) => (
            <StatCard key={card.title} {...card} />
          ))}
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200  p-3 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex rounded-xl  p-1">
              <TabButton
                active={activeTab === "inventory"}
                label="Inventory"
                onClick={() => setActiveTab("inventory")}
              />
              <TabButton
                active={activeTab === "circulation"}
                label="Active Issued"
                onClick={() => setActiveTab("circulation")}
              />
              <TabButton
                active={activeTab === "history"}
                label="Return History"
                onClick={() => setActiveTab("history")}
              />
            </div>

            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="flex-1 rounded-xl bg-[rgb(var(--surface))] px-4 py-3 text-sm outline-none ring-0"
              placeholder={
                activeTab === "inventory"
                  ? "Search by title, author, ISBN or category"
                  : "Search by student, admission number, book title or ISBN"
              }
            />

            <button
              onClick={openAddBookModal}
              className="rounded-xl bg-[rgb(var(--primary))] px-4 py-3 text-sm font-bold text-[rgb(var(--text))] sm:hidden"
            >
              Add Book
            </button>
          </div>
        </div>

        {activeTab === "inventory" ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {books.length === 0 ? (
              <EmptyState
                title="No books found"
                description="Start by adding the first title to your school library."
              />
            ) : (
              books.map((book) => (
                <BookCard
                  key={book._id}
                  book={book}
                  onIssue={() => {
                    setSelectedBook(book);
                    setIssueForm(initialIssueForm);
                    setShowIssueModal(true);
                  }}
                  onDetails={() => {
                    setSelectedBook(book);
                    setShowDetailsModal(true);
                  }}
                />
              ))
            )}
          </div>
        ) : (
          <IssueTable
            records={issueRecords}
            mode={activeTab}
            onReturn={(record) => setSelectedIssue(record)}
          />
        )}
      </div>

      {showBookModal && (
        <ModalWrapper
          onClose={closeAllModals}
          title={isEditing ? "Edit Book" : "Add New Book"}
        >
          <form onSubmit={handleSaveBook} className="space-y-4 p-5 text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
            <Input
              label="Book Title"
              value={bookForm.title}
              onChange={(value) =>
                setBookForm((prev) => ({ ...prev, title: value }))
              }
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Author"
                value={bookForm.author}
                onChange={(value) =>
                  setBookForm((prev) => ({ ...prev, author: value }))
                }
              />
              <Select
                label="Category"
                value={bookForm.category}
                options={bookCategories}
                onChange={(value) =>
                  setBookForm((prev) => ({ ...prev, category: value }))
                }
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="ISBN"
                value={bookForm.isbn}
                onChange={(value) =>
                  setBookForm((prev) => ({ ...prev, isbn: value }))
                }
              />
              <Input
                label="Total Copies"
                type="number"
                min="1"
                value={bookForm.totalCopies}
                onChange={(value) =>
                  setBookForm((prev) => ({ ...prev, totalCopies: value }))
                }
              />
            </div>
            <button className="w-full rounded-2xl text-[rgb(var(--text))] bg-[rgb(var(--primary))] py-3 text-sm font-black">
              {isEditing ? "Update Book" : "Save Book"}
            </button>
          </form>
        </ModalWrapper>
      )}

      {showIssueModal && selectedBook && (
        <ModalWrapper onClose={closeAllModals} title="Issue Book">
          <div className="space-y-4 p-5 text-[rgb(var(--text))] bg-[rgb(var(--surface))] ">
            <div className="rounded-2xl text-[rgb(var(--text))] bg-[rgb(var(--surface))] p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-[rgb(var(--primary))]">
                {selectedBook.category}
              </p>
              <h3 className="mt-1 text-lg font-black text-[rgb(var(--text))]">
                {selectedBook.title}
              </h3>
              <p className="text-sm text-[rgb(var(--primary))]">
                {selectedBook.author} | Available {selectedBook.availableCopies}
                /{selectedBook.totalCopies}
              </p>
            </div>

            <form onSubmit={handleIssueBook} className="space-y-4">
              <div>
                <label className="mb-1 ml-1 block text-[10px] font-black uppercase ">
                  Student
                </label>
                <select
                  value={issueForm.studentId}
                  onChange={(event) =>
                    setIssueForm((prev) => ({
                      ...prev,
                      studentId: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-[rgb(var(--primary))] bg-[rgb(var(--surface))] p-3.5 text-sm outline-none"
                  required
                >
                  <option value="">Select student</option>
                  {students.map((student) => (
                    <option key={student._id} value={student._id}>
                      {student.firstName} {student.lastName}
                      {student.studentId ? ` | ${student.studentId}` : ""}
                      {student.classId?.name
                        ? ` | ${student.classId.name}`
                        : ""}
                      {student.sectionId?.name
                        ? `-${student.sectionId.name}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Due Date"
                type="date"
                min={minDueDate}
                value={issueForm.dueDate}
                onChange={(value) =>
                  setIssueForm((prev) => ({ ...prev, dueDate: value }))
                }
              />

              <button className="w-full rounded-2xl  text-[rgb(var(--text))] bg-[rgb(var(--primary))] py-3 text-sm font-black ">
                Confirm Issue
              </button>
            </form>
          </div>
        </ModalWrapper>
      )}

      {showDetailsModal && selectedBook && (
        <ModalWrapper onClose={closeAllModals} title="Book Details">
          <div className="space-y-5 p-5 text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide">
                {selectedBook.category}
              </p>
              <h3 className="mt-1 text-xl font-black ">
                {selectedBook.title}
              </h3>
              <p className="text-sm italic">
                by {selectedBook.author}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DetailBox label="ISBN" value={selectedBook.isbn} />
              <DetailBox
                label="Copies"
                value={`${selectedBook.availableCopies}/${selectedBook.totalCopies} available`}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={openEditBookModal}
                className="flex-1 rounded-xl px-4 py-3 text-sm font-bold text-[rgb(var(--text))] bg-[rgb(var(--primary))]"
              >
                Edit
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </ModalWrapper>
      )}

      {showDeleteConfirm && selectedBook && (
        <ConfirmDialog
          title="Delete this book?"
          description="This removes the book record. Deletion is blocked while any copy is still issued."
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteBook}
          confirmLabel="Delete Book"
        />
      )}

      {selectedIssue && (
        <ConfirmDialog
          title="Process return?"
          description={`Return "${selectedIssue.bookId?.title}" from ${getStudentName(selectedIssue.studentId)}. Fine due: Rs ${selectedIssue.fineAmount || 0}.`}
          onCancel={() => setSelectedIssue(null)}
          onConfirm={handleReturnBook}
          confirmLabel="Confirm Return"
        />
      )}
    </div>
  );
};

const TabButton = ({ active, label, onClick }) => (
  <button
    onClick={onClick}
    className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
      active ? "text-[rgb(var(--text))] bg-[rgb(var(--primary))] shadow-sm" : "text-[rgb(var(--text))]"
    }`}
  >
    {label}
  </button>
);

const StatCard = ({ title, value, tone }) => {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 text-[rgb(var(--text))] bg-[rgb(var(--surface))] p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-widest ">
          {title}
        </span>
        <span
          className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${tones[tone]}`}
        >
          {title}
        </span>
      </div>
      <p className="text-2xl font-black text-[rgb(var(--text))]">{value}</p>
    </div>
  );
};

const BookCard = ({ book, onIssue, onDetails }) => (
  <div className="rounded-2xl border border-slate-200 text-[rgb(var(--text))] bg-[rgb(var(--surface))] p-5 shadow-sm">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <p className="rounded-md  px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[rgb(var(--text))]">
          {book.category}
        </p>
        <h3 className="mt-3 text-lg font-black text-[rgb(var(--text))]">{book.title}</h3>
        <p className="text-sm italic text-[rgb(var(--primary))]">by {book.author}</p>
      </div>
      <StatusPill availableCopies={book.availableCopies} />
    </div>

    <div className="rounded-xl bg-[rgb(var(--surface))] p-3 text-sm text-[rgb(var(--text))]">
      <p>ISBN: {book.isbn}</p>
      <p>
        Copies:{" "}
        <span className="font-bold text-[rgb(var(--text))]">{book.availableCopies}</span>{" "}
        available out of{" "}
        <span className="font-bold text-[rgb(var(--text))]">{book.totalCopies}</span>
      </p>
    </div>

    <div className="mt-4 flex gap-2">
      <button
        onClick={onIssue}
        disabled={book.availableCopies < 1}
        className="flex-1 rounded-xl bg-[rgb(var(--primary))]  px-4 py-2.5 text-sm font-bold text-[rgb(var(--text))] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
      >
        Issue
      </button>
      <button
        onClick={onDetails}
        className="rounded-xl text-[rgb(var(--text))] bg-[rgb(var(--primary))] px-4 py-2.5 text-sm font-bold "
      >
        Details
      </button>
    </div>
  </div>
);

const IssueTable = ({ records, mode, onReturn }) => {
  const isLoanDesk = mode === "circulation";

  if (records.length === 0) {
    return (
      <EmptyState
        title={isLoanDesk ? "No active loans" : "No return history"}
        description={
          isLoanDesk
            ? "Issued books will appear here until they are returned."
            : "Completed returns will appear here once books start coming back."
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:hidden">
        {records.map((record) => (
          <div
            key={record._id}
            className="rounded-2xl border border-slate-200 text-[rgb(var(--text))] bg-[rgb(var(--surface))] p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[rgb(var(--primary))]">
                  {record.bookId?.category || "Library Book"}
                </p>
                <p className="mt-1 text-lg font-black text-[rgb(var(--text))]">
                  {record.bookId?.title}
                </p>
                <p className="mt-1 text-xs text-[rgb(var(--primary))]">
                  {record.bookId?.author} | {record.bookId?.isbn}
                </p>
              </div>
              <StatusBadge status={record.status} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-[rgb(var(--surface))] p-3">
              <MiniDetail
                label="Student"
                value={getStudentName(record.studentId)}
              />
              <MiniDetail
                label="Admission"
                value={record.studentId?.studentId || "N/A"}
              />
              <MiniDetail
                label="Issued On"
                value={formatDate(record.issueDate)}
              />
              <MiniDetail
                label={isLoanDesk ? "Due Back" : "Returned On"}
                value={
                  isLoanDesk
                    ? formatDate(record.dueDate)
                    : formatDate(record.returnDate)
                }
              />
            </div>

            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-[rgb(var(--primary))]">
                {record.studentId?.classId?.name || "Class N/A"}
                {record.studentId?.sectionId?.name
                  ? ` - ${record.studentId.sectionId.name}`
                  : ""}
              </p>
              {record.fineAmount > 0 && (
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
                  Fine Rs {record.fineAmount}
                </span>
              )}
            </div>

            <div className="mt-4">
              {isLoanDesk ? (
                <button
                  onClick={() => onReturn(record)}
                  className="w-full rounded-xl text-[rgb(var(--text))] bg-[rgb(var(--primary))] px-4 py-2.5 text-sm font-bold "
                >
                  Return
                </button>
              ) : (
                <div className="rounded-xl bg-[rgb(var(--surface))] px-4 py-2.5 text-center text-sm font-bold text-[rgb(var(--primary))]">
                  Completed
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden lg:block rounded-2xl border border-slate-200 text-[rgb(var(--text))] bg-[rgb(var(--surface))] shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          {/* HEADER */}
          <thead className="text-xs uppercase tracking-wide">
            <tr className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
              <th className="text-left px-6 py-4 font-bold">Borrower Name</th>
              <th className="text-left px-6 py-4 font-bold">Book</th>
              <th className="text-left px-6 py-4 font-bold">Issued</th>
              <th className="text-left px-6 py-4 font-bold">
                {mode === "circulation" ? "Due" : "Returned"}
              </th>
              <th className="text-right px-6 py-4 font-bold">Status</th>
            </tr>
          </thead>

          {/* BODY */}
          <tbody className="divide-y">
            {records.map((record, index) => {
              const isOverdue = record.status === "Overdue";

              return (
                <tr
                  key={record._id}
                  
                >
                  {/* BORROWER */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 flex items-center justify-center rounded-full text-[rgb(var(--text))] bg-[rgb(var(--primary))] text-xs font-bold">
                        {getStudentName(record.studentId)
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </div>

                      <div>
                        <p className="font-semibold ">
                          {getStudentName(record.studentId)}
                        </p>
                        <p className="text-xs ">
                          class- {record.studentId?.classId?.name || ""}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* BOOK */}
                  <td className="px-6 py-4">
                    <p className="font-semibold text-[rgb(var(--text))]">
                      {record.bookId?.title}
                    </p>
                    <p className="text-xs text-[rgb(var(--text))]">
                      {record.bookId?.author}
                    </p>
                  </td>

                  {/* ISSUED */}
                  <td className="px-6 py-4 font-medium text-[rgb(var(--text))]">
                    {formatDate(record.issueDate)}
                  </td>

                  {/* DUE / RETURN */}
                  <td
                    className={`px-6 py-4 font-medium ${
                      isOverdue ? "text-red-600" : "text-[rgb(var(--text))]"
                    }`}
                  >
                    {mode === "circulation"
                      ? formatDate(record.dueDate)
                      : formatDate(record.returnDate)}
                  </td>

                  {/* STATUS */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end items-center gap-3">
                      {record.fineAmount > 0 && (
                        <span className="text-xs font-bold text-red-600">
                          ₹{record.fineAmount}
                        </span>
                      )}

                      {mode === "circulation" ? (
                        <button
                          onClick={() => onReturn(record)}
                          className="rounded-lg px-4 py-1.5 text-xs font-bold text-[rgb(var(--text))] bg-[rgb(var(--primary))] "
                        >
                          Return
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-[rgb(var(--bg))] bg-[rgb(var(--primary))] px-3 py-1 rounded-full">
                          Completed
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ModalWrapper = ({ children, onClose, title }) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
    <div className="w-full max-w-xl rounded-t-3xl bg-[rgb(var(--primary))] text-[rgb(var(--text))] shadow-2xl sm:rounded-3xl">
      <div className="flex items-center justify-between border-b border-slate-200 p-4">
        <h2 className="text-lg ">{title}</h2>
        <button
          onClick={onClose}
          className="text-xl"
        >
          x
        </button>
      </div>
      {children}
    </div>
  </div>
);

const ConfirmDialog = ({
  title,
  description,
  onCancel,
  onConfirm,
  confirmLabel,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="w-full max-w-sm rounded-3xl text-[rgb(var(--text))] bg-[rgb(var(--surface))] p-6 shadow-2xl">
      <h3 className="text-lg font-black ">{title}</h3>
      <p className="mt-2 text-sm ">{description}</p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 rounded-xl text-[rgb(var(--text))] bg-[rgb(var(--primary))] px-4 py-2.5 text-sm font-bold "
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 rounded-xl text-[rgb(var(--text))] bg-[rgb(var(--primary))] px-4 py-2.5 text-sm font-bold "
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

const Input = ({ label, type = "text", min, value, onChange }) => (
  <div>
    <label className="mb-1 ml-1 block text-[10px] font-black uppercase text-[rgb(var(--text))]">
      {label}
    </label>
    <input
      type={type}
      min={min}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border border-[rgb(var(--primary))] bg-[rgb(var(--surface))] p-3.5 text-sm outline-none focus:border-blue-400 focus:bg-white"
      required
    />
  </div>
);

const Select = ({ label, value, options, onChange }) => (
  <div>
    <label className="mb-1 ml-1 block text-[10px] font-black uppercase ">
      {label}
    </label>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border border-[rgb(var(--primary))] bg-[rgb(var(--surface))] p-3.5 text-sm outline-none focus:border-blue-400"
      required
    >
      <option value="">Select category</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </div>
);

const DetailBox = ({ label, value }) => (
  <div className="rounded-xl text-[rgb(var(--text))] bg-[rgb(var(--surface))] border p-3">
    <p className="text-[10px] font-black uppercase">{label}</p>
    <p className="mt-1 font-bold">{value}</p>
  </div>
);

const MiniDetail = ({ label, value }) => (
  <div className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
    <p className="text-[10px] font-black uppercase ">{label}</p>
    <p className="mt-1 text-sm font-bold ">{value}</p>
  </div>
);

const EmptyState = ({ title, description }) => (
  <div className="rounded-2xl border border-dashed border-slate-300 text-[rgb(var(--text))] bg-[rgb(var(--surface))] p-10 text-center">
    <h3 className="text-lg font-black ">{title}</h3>
    <p className="mt-2 text-sm ">{description}</p>
  </div>
);

const StatusPill = ({ availableCopies }) => {
  if (availableCopies < 1) {
    return (
      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
        Out
      </span>
    );
  }

  if (availableCopies < 3) {
    return (
      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
        Low
      </span>
    );
  }

  return (
    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
      Good
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const styles = {
    Issued: "bg-blue-50 text-blue-700",
    Overdue: "bg-red-50 text-red-700",
    Returned: "bg-emerald-50 text-emerald-700",
  };

  return (
    <span
      className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${styles[status] || "bg-slate-100 text-slate-700"}`}
    >
      {status}
    </span>
  );
};

const getStudentName = (student) => {
  if (!student) return "Unknown student";
  return [student.firstName, student.lastName].filter(Boolean).join(" ");
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
};

export default LibraryManagement;
