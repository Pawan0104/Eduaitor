import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  FaCheckCircle,
  FaCheckDouble,
  FaCloudUploadAlt,
  FaDownload,
  FaEdit,
  FaExternalLinkAlt,
  FaFileAlt,
  FaFileExcel,
  FaFilePdf,
  FaFolderOpen,
  FaIdCard,
  FaListUl,
  FaMinus,
  FaPaperPlane,
  FaPlus,
  FaSearch,
  FaSyncAlt,
  FaTable,
  FaThLarge,
  FaTimes,
  FaTrashAlt,
  FaUpload,
} from "react-icons/fa";

const API = import.meta.env.VITE_API_URL;

/** The five documents the school requires for every student. */
const DOC_CATEGORIES = [
  {
    key: "studentPhoto",
    cardTitle: "Student Passport Photo",
    listLabel: "Student Passport Photo",
  },
  {
    key: "transferCertificate",
    cardTitle: "Transfer Certificate (TC)",
    listLabel: "Transfer Certificate",
  },
  {
    key: "studentAadhar",
    cardTitle: "Student Aadhaar Card",
    listLabel: "Aadhar",
  },
  {
    key: "characterCertificate",
    cardTitle: "Character Certificate",
    listLabel: "Character Certificate",
  },
  {
    key: "lastMarksheet",
    cardTitle: "Last Qualifying Marksheet",
    listLabel: "Last Year Marksheet",
  },
];

const CATEGORY_BY_KEY = new Map(DOC_CATEGORIES.map((c) => [c.key, c]));

const MAX_BYTES = 2 * 1024 * 1024;

const isPdfFile = (fileOrUrl = "", mime = "") => {
  const value = String(fileOrUrl || "").toLowerCase();
  return (
    mime === "application/pdf" ||
    value.endsWith(".pdf") ||
    value.includes("application/pdf") ||
    /\.pdf(\?|$)/.test(value)
  );
};

const isImageUrl = (value = "", mime = "") =>
  /^image\//i.test(mime) || /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(value);

const firstNameToken = (name = "") =>
  String(name || "")
    .trim()
    .split(/\s+/)[0]
    .toUpperCase();

const guessCategory = (fileName = "") => {
  const lower = String(fileName).toLowerCase();
  if (lower.includes("aadhar") || lower.includes("aadhaar")) return "studentAadhar";
  if (lower.includes("tc") || lower.includes("transfer")) return "transferCertificate";
  if (lower.includes("mark")) return "lastMarksheet";
  if (lower.includes("photo") || lower.includes("passport")) return "studentPhoto";
  if (lower.includes("char") || lower.includes("conduct")) return "characterCertificate";
  return "";
};

const downloadCsv = (rows) => {
  const headers = [
    "Student Name",
    "Class Name",
    "Admission No.",
    "File Name",
    "Category",
    "Approval Status",
  ];
  const csvRows = rows.map((doc) =>
    [
      doc.studentName,
      doc.className,
      doc.admNo,
      doc.fileName,
      doc.categoryLabel,
      doc.status,
    ].map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`),
  );
  const csv = [headers.join(","), ...csvRows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Student_Documents_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const emptyDelete = () => ({ open: false, type: "", doc: null, item: null });
const emptyEdit = () => ({
  open: false,
  doc: null,
  category: "studentPhoto",
  fileName: "",
  status: "Pending",
});

const StudentDocuments = () => {
  const cardFileInputRef = useRef(null);
  const activeCardCategoryRef = useRef("");
  const selectedStudentRef = useRef(null);

  const [rows, setRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  // Module navigation
  const [page, setPage] = useState("student-docs"); // student-docs | upload-docs
  const [viewMode, setViewMode] = useState("list"); // list | matrix
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Filters
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [studentFilter, setStudentFilter] = useState("ALL");

  // Upload workspace
  const [uploadClass, setUploadClass] = useState("ALL");
  const [uploadStatus, setUploadStatus] = useState("Active");
  const [uploadStudentId, setUploadStudentId] = useState("");
  const [uploadAdmNo, setUploadAdmNo] = useState("");
  const [uploadQueue, setUploadQueue] = useState([]);
  const [queueLabel, setQueueLabel] = useState("No file chosen");
  const [busy, setBusy] = useState(false);

  // Modals
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [editForm, setEditForm] = useState(emptyEdit);
  const [deleteTarget, setDeleteTarget] = useState(emptyDelete);

  /* ------------------------------- data ------------------------------- */

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${API}/classes/all`, {
          withCredentials: true,
        });
        setClasses(data.classes || []);
      } catch {
        /* class dropdown still works from loaded students */
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`${API}/students/documents`, {
          withCredentials: true,
        });
        setRows(data.data || []);
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load documents");
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [reloadKey]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchDraft.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  const students = useMemo(() => {
    const byStudent = new Map();
    rows.forEach((row) => {
      const key = row.studentMongoId || `${row.studentId}-${row.studentName}`;
      if (!byStudent.has(key)) {
        byStudent.set(key, {
          id: key,
          studentMongoId: row.studentMongoId,
          studentId: row.studentId || "",
          studentName: row.studentName || "Unnamed student",
          className: row.className || "",
          sectionName: row.sectionName || "",
          fatherName: row.fatherName || "",
          motherName: row.motherName || "",
          isActive: row.isActive !== false,
          documents: [],
        });
      }
      if (row.url && row.documentKey) {
        byStudent.get(key).documents.push(row);
      }
    });
    return [...byStudent.values()].sort((a, b) =>
      a.studentName.localeCompare(b.studentName),
    );
  }, [rows]);

  const documentRows = useMemo(() => {
    return students.flatMap((student) =>
      student.documents.map((doc) => {
        const category = CATEGORY_BY_KEY.get(doc.documentKey);
        const label = category?.listLabel || doc.documentLabel || doc.documentKey;
        const fileName =
          String(doc.displayName || "").trim() ||
          `${doc.studentId}_${firstNameToken(doc.studentName)}_${label}`;
        return {
          id: `${doc.studentMongoId}:${doc.documentKey}`,
          studentMongoId: doc.studentMongoId,
          studentName: doc.studentName,
          studentId: doc.studentId,
          admNo: doc.studentId || "",
          className: doc.className || "",
          sectionName: doc.sectionName || "",
          documentKey: doc.documentKey,
          categoryLabel: label,
          cardTitle: category?.cardTitle || doc.documentLabel || label,
          fileName,
          status: doc.status === "Approved" ? "Approved" : "Pending",
          url: doc.url,
          fileType: doc.fileType || "",
          source: doc.source || "documents",
          editable: doc.source === "documents",
          // Only the five checklist categories can be re-categorised; other
          // admission-form uploads (father/mother Aadhaar, etc.) stay put.
          categoryEditable:
            doc.source === "documents" && CATEGORY_BY_KEY.has(doc.documentKey),
        };
      }),
    );
  }, [students]);

  const classNames = useMemo(() => {
    const set = new Set();
    classes.forEach((cls) => {
      const name = cls.name || cls.className;
      if (name) set.add(name);
    });
    students.forEach((student) => student.className && set.add(student.className));
    return [...set].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    );
  }, [classes, students]);

  const counts = useMemo(
    () => ({
      all: documentRows.length,
      approved: documentRows.filter((doc) => doc.status === "Approved").length,
      pending: documentRows.filter((doc) => doc.status !== "Approved").length,
    }),
    [documentRows],
  );

  const filteredDocuments = useMemo(() => {
    const needle = search.toLowerCase();
    return documentRows.filter((doc) => {
      if (statusFilter !== "ALL" && doc.status !== statusFilter) return false;
      if (classFilter !== "ALL" && doc.className !== classFilter) return false;
      if (categoryFilter !== "ALL" && doc.documentKey !== categoryFilter) {
        return false;
      }
      if (studentFilter !== "ALL" && doc.studentName !== studentFilter) {
        return false;
      }
      if (needle) {
        const haystack = `${doc.admNo} ${doc.studentName} ${doc.fileName} ${doc.categoryLabel}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [
    documentRows,
    statusFilter,
    classFilter,
    categoryFilter,
    studentFilter,
    search,
  ]);

  const filteredStudents = useMemo(() => {
    const needle = search.toLowerCase();
    return students.filter((student) => {
      if (classFilter !== "ALL" && student.className !== classFilter) return false;
      if (studentFilter !== "ALL" && student.studentName !== studentFilter) {
        return false;
      }
      if (needle) {
        const haystack = `${student.studentId} ${student.studentName}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [students, classFilter, studentFilter, search]);

  /* --------------------------- upload workspace --------------------------- */

  const uploadStudentOptions = useMemo(
    () =>
      students.filter((student) => {
        if (uploadClass !== "ALL" && student.className !== uploadClass) {
          return false;
        }
        const status = student.isActive ? "Active" : "Inactive";
        return status === uploadStatus;
      }),
    [students, uploadClass, uploadStatus],
  );

  const selectedStudent =
    uploadStudentOptions.find(
      (student) => student.studentMongoId === uploadStudentId,
    ) ||
    uploadStudentOptions[0] ||
    null;

  useEffect(() => {
    selectedStudentRef.current = selectedStudent;
  }, [selectedStudent]);

  const selectedDocs = selectedStudent?.documents || [];
  const uploadedCount = DOC_CATEGORIES.filter((cat) =>
    selectedDocs.some((doc) => doc.documentKey === cat.key),
  ).length;

  useEffect(() => {
    if (uploadClass !== "ALL") return;
    if (!students.length) return;
    const firstWithDocs =
      students.find((student) => student.documents.length > 0) || students[0];
    if (firstWithDocs.className) setUploadClass(firstWithDocs.className);
  }, [students, uploadClass]);

  /* ------------------------------ uploads ------------------------------ */

  const validateFile = (file) => {
    if (!file) return false;
    if (file.size > MAX_BYTES) {
      toast.error("File must be less than 2MB");
      return false;
    }
    const ok =
      /^image\/(jpeg|png|webp)$/i.test(file.type) ||
      file.type === "application/pdf" ||
      /\.(jpe?g|png|webp|pdf)$/i.test(file.name);
    if (!ok) {
      toast.error("Use JPG, PNG, WEBP or PDF");
      return false;
    }
    return true;
  };

  const uploadOne = async (student, categoryKey, file) => {
    const formData = new FormData();
    formData.append(categoryKey, file);
    await axios.put(`${API}/students/${student.studentMongoId}`, formData, {
      withCredentials: true,
    });
  };

  const handleCardFileSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    const categoryKey = activeCardCategoryRef.current;
    const student = selectedStudentRef.current;
    if (!file || !categoryKey || !student) return;
    if (!validateFile(file)) return;

    try {
      setBusy(true);
      await uploadOne(student, categoryKey, file);
      const label = CATEGORY_BY_KEY.get(categoryKey)?.listLabel || categoryKey;
      toast.success(`${label} uploaded for ${student.studentName}`);
      setReloadKey((n) => n + 1);
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const triggerCardUpload = (categoryKey) => {
    if (!selectedStudent) {
      toast.warning("Select a student first");
      return;
    }
    activeCardCategoryRef.current = categoryKey;
    if (cardFileInputRef.current) {
      cardFileInputRef.current.value = "";
      cardFileInputRef.current.click();
    }
  };

  const handleQueueFiles = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    const accepted = [];
    files.forEach((file) => {
      if (!validateFile(file)) return;
      accepted.push({
        id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        file,
        fileName: file.name,
        category: guessCategory(file.name),
      });
    });
    if (!accepted.length) return;
    setQueueLabel(`${accepted.length} file(s) chosen`);
    setUploadQueue((prev) => [...prev, ...accepted]);
    toast.info(`Added ${accepted.length} file(s) to the upload queue`);
  };

  const commitQueue = async () => {
    if (!uploadQueue.length) {
      toast.warning("Choose at least one file first");
      return;
    }
    if (!selectedStudent) {
      toast.warning("Select a student first");
      return;
    }
    const missing = uploadQueue.find((item) => !item.category);
    if (missing) {
      toast.warning(`Select a category for "${missing.fileName}"`);
      return;
    }

    try {
      setBusy(true);
      let done = 0;
      const failures = [];
      for (const item of uploadQueue) {
        try {
          await uploadOne(selectedStudent, item.category, item.file);
          done += 1;
        } catch (err) {
          failures.push(
            `${item.fileName}: ${err.response?.data?.message || "upload failed"}`,
          );
        }
      }
      setUploadQueue([]);
      setQueueLabel("No file chosen");
      setReloadKey((n) => n + 1);
      if (done) {
        toast.success(
          `Uploaded ${done} document(s) for ${selectedStudent.studentName}`,
        );
      }
      if (failures.length) {
        toast.error(`${failures.length} file(s) failed. ${failures[0]}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const updateDocumentMeta = async (doc, patch) => {
    await axios.put(
      `${API}/students/${doc.studentMongoId}/documents/${doc.documentKey}`,
      patch,
      { withCredentials: true },
    );
  };

  const toggleStatus = async (doc) => {
    if (!doc.editable) return;
    const nextStatus = doc.status === "Approved" ? "Pending" : "Approved";
    try {
      await updateDocumentMeta(doc, { status: nextStatus });
      setRows((prev) =>
        prev.map((row) =>
          String(row.studentMongoId) === String(doc.studentMongoId) &&
          row.documentKey === doc.documentKey
            ? { ...row, status: nextStatus }
            : row,
        ),
      );
      toast.success(`"${doc.fileName}" marked ${nextStatus}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update status");
    }
  };

  const approveAllFiltered = async () => {
    const pending = filteredDocuments.filter(
      (doc) => doc.editable && doc.status !== "Approved",
    );
    if (!pending.length) {
      toast.info("All filtered documents are already approved");
      return;
    }
    try {
      setBusy(true);
      const results = await Promise.allSettled(
        pending.map((doc) => updateDocumentMeta(doc, { status: "Approved" })),
      );
      const ok = results.filter((r) => r.status === "fulfilled").length;
      setReloadKey((n) => n + 1);
      if (ok) toast.success(`Approved ${ok} document(s)`);
      if (ok < results.length) {
        toast.error(`${results.length - ok} document(s) could not be approved`);
      }
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------ editing ------------------------------ */

  const openEdit = (doc) => {
    if (!doc.editable) {
      toast.info("This document was added from the admission form and is read-only here");
      return;
    }
    if (!doc.categoryEditable) {
      toast.info(
        "Only the five required checklist documents can be edited here",
      );
      return;
    }
    setEditForm({
      open: true,
      doc,
      category: doc.documentKey,
      fileName: doc.fileName,
      status: doc.status,
    });
  };

  const saveEdit = async () => {
    const doc = editForm.doc;
    if (!doc) return;
    const fileName = editForm.fileName.trim();
    if (!fileName) {
      toast.warning("File name cannot be empty");
      return;
    }
    try {
      setBusy(true);
      await updateDocumentMeta(doc, {
        category: editForm.category,
        displayName: fileName,
        status: editForm.status,
      });
      setEditForm(emptyEdit());
      setReloadKey((n) => n + 1);
      toast.success(`Updated "${fileName}"`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update document");
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------ deletion ----------------------------- */

  const confirmDelete = async () => {
    const target = deleteTarget;
    if (!target.open) return;

    if (target.type === "queue-item") {
      setUploadQueue((prev) => prev.filter((item) => item.id !== target.item.id));
      setDeleteTarget(emptyDelete());
      toast.info("Removed file from upload queue");
      return;
    }

    if (target.type === "clear-queue") {
      setUploadQueue([]);
      setQueueLabel("No file chosen");
      setDeleteTarget(emptyDelete());
      toast.info("Cleared the upload queue");
      return;
    }

    if (target.type === "doc") {
      try {
        setBusy(true);
        await axios.delete(
          `${API}/students/${target.doc.studentMongoId}/documents/${target.doc.documentKey}`,
          { withCredentials: true },
        );
        setDeleteTarget(emptyDelete());
        setReloadKey((n) => n + 1);
        toast.success(`Deleted "${target.doc.fileName}"`);
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to delete document");
      } finally {
        setBusy(false);
      }
    }
  };

  /* ---------------------------- navigation ---------------------------- */

  const resetFilters = () => {
    setSearchDraft("");
    setSearch("");
    setClassFilter("ALL");
    setCategoryFilter("ALL");
    setStudentFilter("ALL");
    setStatusFilter("ALL");
    toast.info("Filters reset");
  };

  const openUploadWorkspace = (student, categoryKey) => {
    if (student) {
      setUploadClass(student.className || "ALL");
      setUploadStatus(student.isActive ? "Active" : "Inactive");
      setUploadStudentId(student.studentMongoId);
      selectedStudentRef.current = student;
    }
    setPage("upload-docs");
    if (student && categoryKey) {
      activeCardCategoryRef.current = categoryKey;
      // Keep the picker inside the click gesture so browsers allow it.
      if (cardFileInputRef.current) {
        cardFileInputRef.current.value = "";
        cardFileInputRef.current.click();
      }
    }
  };

  const searchUploadAdmNo = () => {
    const needle = String(uploadAdmNo || "").trim().toLowerCase();
    if (!needle) {
      toast.warning("Enter an Admission Number to search");
      return;
    }
    const match = students.find(
      (student) =>
        String(student.studentId).toLowerCase() === needle ||
        student.studentName.toLowerCase().includes(needle),
    );
    if (!match) {
      toast.warning(`No student found for "${uploadAdmNo}"`);
      return;
    }
    setUploadClass(match.className || "ALL");
    setUploadStatus(match.isActive ? "Active" : "Inactive");
    setUploadStudentId(match.studentMongoId);
    toast.success(`Loaded ${match.studentName} (Adm #${match.studentId})`);
  };

  const queuePendingDocs = selectedDocs.filter((doc) =>
    CATEGORY_BY_KEY.has(doc.documentKey),
  );
  const previewFileType = previewDoc
    ? isPdfFile(previewDoc.url, previewDoc.fileType)
      ? "pdf"
      : isImageUrl(previewDoc.url, previewDoc.fileType)
        ? "image"
        : "other"
    : "other";
  const previewFileName = previewDoc
    ? isPdfFile(previewDoc.url, previewDoc.fileType)
      ? `${previewDoc.fileName.replace(/\.pdf$/i, "")}.pdf`
      : previewDoc.fileName
    : "";

  const statusChipClass = (active, tone) => {
    if (tone === "approved") {
      return active
        ? "rounded bg-emerald-700 px-2.5 py-1 text-xs font-bold text-white shadow-sm"
        : "rounded border border-emerald-200 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50";
    }
    if (tone === "pending") {
      return active
        ? "rounded bg-amber-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm"
        : "rounded border border-amber-200 bg-white px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50";
    }
    return active
      ? "rounded bg-[#4834b8] px-2.5 py-1 text-xs font-bold text-white shadow-sm"
      : "rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50";
  };

  const tabClass = (active) =>
    active
      ? "flex items-center gap-1 rounded border border-[#4834b8] bg-[#4834b8] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all"
      : "rounded border border-[#7c69ef] bg-white px-3 py-1.5 text-xs font-medium text-[#4834b8] transition-all hover:bg-indigo-50";

  return (
    <div className="docs-module px-1 py-2 text-[#1e293b]">
      {/* Hidden input used by the "Upload Original File" buttons. */}
      <input
        ref={cardFileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handleCardFileSelected}
      />

      {/* Top bar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded border border-indigo-200 bg-indigo-50 text-[#4834b8] shadow-sm">
            <FaFileAlt size={13} />
          </div>
          <h1 className="text-base font-extrabold uppercase tracking-tight text-slate-900 sm:text-lg">
            Document Management
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPage("student-docs")}
            className={tabClass(page === "student-docs")}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => setPage("upload-docs")}
            className={tabClass(page === "upload-docs")}
          >
            Upload Documents
          </button>
          <button
            type="button"
            onClick={() => setPage("student-docs")}
            className={tabClass(page === "student-docs")}
          >
            Student Documents
          </button>
        </div>
      </div>

      {page === "student-docs" ? (
        <div className="space-y-3">
          {/* Section heading */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <FaListUl className="text-slate-700" size={14} />
              <h2 className="text-lg font-medium text-slate-800">
                Student Documents
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 shadow-sm">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={
                    viewMode === "list"
                      ? "flex items-center gap-1.5 rounded bg-[#4834b8] px-3 py-1 text-xs font-semibold text-white transition-all"
                      : "flex items-center gap-1.5 rounded px-3 py-1 text-xs font-semibold text-slate-600 transition-all hover:text-slate-900"
                  }
                >
                  <FaTable size={11} /> Document List View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("matrix")}
                  className={
                    viewMode === "matrix"
                      ? "flex items-center gap-1.5 rounded bg-[#4834b8] px-3 py-1 text-xs font-semibold text-white transition-all"
                      : "flex items-center gap-1.5 rounded px-3 py-1 text-xs font-semibold text-slate-600 transition-all hover:text-slate-900"
                  }
                >
                  <FaThLarge size={11} /> 5-Doc Checklist Matrix
                </button>
              </div>
              <button
                type="button"
                onClick={() => openUploadWorkspace(null)}
                className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-emerald-700"
              >
                <FaCloudUploadAlt size={12} /> + Upload Student Document
              </button>
            </div>
          </div>

          {/* Filter ribbon */}
          <div className="rounded-lg border border-[#d8dff2] bg-[#eef1fb] p-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-600">
                    Total Count:
                  </span>
                  <span className="rounded border-2 border-amber-400 bg-white px-2.5 py-0.5 text-sm font-extrabold text-slate-900 shadow-sm">
                    {documentRows.length}
                  </span>
                  <span className="rounded bg-indigo-100/80 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                    Showing {filteredDocuments.length} of{" "}
                    {documentRows.length} records
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 border-l border-indigo-200 pl-3">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("ALL")}
                    className={statusChipClass(statusFilter === "ALL", "all")}
                  >
                    All ({counts.all})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("Approved")}
                    className={statusChipClass(
                      statusFilter === "Approved",
                      "approved",
                    )}
                  >
                    <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-600 align-middle" />
                    Approved ({counts.approved})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("Pending")}
                    className={statusChipClass(
                      statusFilter === "Pending",
                      "pending",
                    )}
                  >
                    <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500 align-middle" />
                    Pending Review ({counts.pending})
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <input
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                    placeholder="Search By Adm No. or Name"
                    className="w-48 rounded border border-slate-300 bg-white px-3 py-1.5 pr-8 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:w-52"
                  />
                  <FaSearch
                    className="pointer-events-none absolute right-2.5 top-2 text-slate-400"
                    size={11}
                  />
                </div>

                <select
                  value={classFilter}
                  onChange={(event) => setClassFilter(event.target.value)}
                  className="min-w-[115px] rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:outline-none"
                >
                  <option value="ALL">All Classes</option>
                  {classNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>

                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="min-w-[140px] rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:outline-none"
                >
                  <option value="ALL">All Categories</option>
                  {DOC_CATEGORIES.map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {cat.cardTitle}
                    </option>
                  ))}
                </select>

                <select
                  value={studentFilter}
                  onChange={(event) => setStudentFilter(event.target.value)}
                  className="min-w-[175px] rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:outline-none"
                >
                  <option value="ALL">Select Student</option>
                  <optgroup label="Active">
                    {students
                      .filter((student) => student.isActive)
                      .map((student) => (
                        <option
                          key={`a-${student.id}`}
                          value={student.studentName}
                        >
                          {student.studentName}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Inactive">
                    {students
                      .filter((student) => !student.isActive)
                      .map((student) => (
                        <option
                          key={`i-${student.id}`}
                          value={student.studentName}
                        >
                          {student.studentName}
                        </option>
                      ))}
                  </optgroup>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    if (!filteredDocuments.length) {
                      toast.warning("No records to export");
                      return;
                    }
                    downloadCsv(filteredDocuments);
                    toast.success(
                      `Exported ${filteredDocuments.length} record(s)`,
                    );
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded border border-emerald-500 bg-white text-emerald-600 shadow-sm transition-all hover:bg-emerald-50"
                  title="Export filtered documents to Excel (CSV)"
                >
                  <FaFileExcel size={13} />
                </button>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex h-8 w-8 items-center justify-center rounded bg-[#29b6f6] text-white shadow-sm transition-all hover:bg-[#0288d1]"
                  title="Reset filters and refresh list"
                >
                  <FaSyncAlt size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* List view */}
          {viewMode === "list" ? (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="erp-doc-table w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="w-[20%]">Student Name</th>
                      <th className="w-[10%]">Class Name</th>
                      <th className="w-[11%]">Admission No.</th>
                      <th className="w-[24%]">File Name</th>
                      <th className="w-[15%]">Category</th>
                      <th className="w-[11%] text-center">Approval Status</th>
                      <th className="w-[9%] text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-500">
                          Loading student documents…
                        </td>
                      </tr>
                    ) : filteredDocuments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <FaFolderOpen className="text-2xl text-slate-400" />
                            <p className="font-semibold text-slate-700">
                              No student documents match your current filter
                              criteria.
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={resetFilters}
                                className="rounded border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
                              >
                                Reset Filters
                              </button>
                              <button
                                type="button"
                                onClick={() => openUploadWorkspace(null)}
                                className="rounded bg-[#4834b8] px-3 py-1 text-xs font-semibold text-white"
                              >
                                + Upload Document for Student
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredDocuments.map((doc) => (
                        <tr key={doc.id}>
                          <td className="font-semibold text-slate-800">
                            {doc.studentName}
                          </td>
                          <td className="text-slate-600">{doc.className}</td>
                          <td className="font-semibold text-slate-800">
                            {doc.admNo}
                          </td>
                          <td className="font-medium text-[#0284c7]">
                            {doc.fileName}
                          </td>
                          <td>
                            <span className="text-xs font-medium text-slate-700">
                              {doc.categoryLabel}
                            </span>
                          </td>
                          <td className="text-center">
                            {doc.status === "Approved" ? (
                              <button
                                type="button"
                                onClick={() => toggleStatus(doc)}
                                disabled={!doc.editable}
                                title={
                                  doc.editable
                                    ? "Click to mark this document as Pending"
                                    : "Added from the admission form"
                                }
                                className="rounded bg-[#15803d] px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm transition-all hover:bg-[#166534] disabled:cursor-default disabled:opacity-90"
                              >
                                Approved
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => toggleStatus(doc)}
                                disabled={!doc.editable}
                                title={
                                  doc.editable
                                    ? "Click to approve this document"
                                    : "Added from the admission form"
                                }
                                className="rounded border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 transition-all hover:bg-emerald-600 hover:text-white disabled:cursor-default"
                              >
                                Pending
                              </button>
                            )}
                          </td>
                          <td>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewDoc(doc);
                                  setPreviewZoom(1);
                                }}
                                className="flex h-6 w-6 items-center justify-center rounded bg-[#7cb342] text-white shadow-sm transition-all hover:bg-[#689f38]"
                                title="Preview and download document"
                              >
                                <FaDownload size={10} />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({
                                    open: true,
                                    type: "doc",
                                    doc,
                                    item: null,
                                  })
                                }
                                disabled={!doc.editable}
                                className="flex h-6 w-6 items-center justify-center rounded bg-[#e53935] text-white shadow-sm transition-all hover:bg-[#c62828] disabled:cursor-not-allowed disabled:opacity-50"
                                title="Delete document"
                              >
                                <FaTrashAlt size={10} />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEdit(doc)}
                                disabled={!doc.categoryEditable}
                                className="flex h-6 w-6 items-center justify-center rounded bg-[#3949ab] text-white shadow-sm transition-all hover:bg-[#283593] disabled:cursor-not-allowed disabled:opacity-50"
                                title={
                                  doc.categoryEditable
                                    ? "Edit document category, name or status"
                                    : "Only the five required checklist documents can be re-categorised"
                                }
                              >
                                <FaEdit size={10} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-600">
                <span>
                  Tip: use the green action button in the{" "}
                  <strong>Action</strong> column to view or download the
                  document PDF.
                </span>
                <button
                  type="button"
                  onClick={approveAllFiltered}
                  disabled={busy}
                  className="flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 hover:underline disabled:opacity-60"
                >
                  <FaCheckDouble size={11} /> Approve All Filtered Documents
                </button>
              </div>
            </div>
          ) : (
            /* Matrix view */
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-indigo-50/70 px-4 py-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Student 5-Document Compliance Matrix
                  </h3>
                  <p className="text-xs text-slate-500">
                    Track all 5 required documents per student. Click any{" "}
                    <span className="font-semibold text-amber-700">Pending</span>{" "}
                    slot to upload directly.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <FaCheckCircle size={11} /> Approved
                  </span>
                  <span className="inline-flex items-center gap-1 text-blue-700">
                    <FaFileAlt size={11} /> Uploaded (Review)
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <FaPlus size={9} /> Pending (Click to Upload)
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="erp-doc-table w-full border-collapse">
                  <thead>
                    <tr>
                      <th>Adm No.</th>
                      <th>Student Name</th>
                      <th>Class</th>
                      <th>Completion</th>
                      {DOC_CATEGORIES.map((cat, index) => (
                        <th key={cat.key} className="text-center">
                          {index + 1}. {cat.cardTitle}
                        </th>
                      ))}
                      <th className="text-center">Quick Upload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="py-10 text-center text-slate-500"
                        >
                          No students match your current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((student) => {
                        const uploadedCategories = DOC_CATEGORIES.filter(
                          (cat) =>
                            student.documents.some(
                              (doc) => doc.documentKey === cat.key,
                            ),
                        ).length;
                        const progressClass =
                          uploadedCategories === 5
                            ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                            : uploadedCategories > 0
                              ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                              : "border-rose-200 bg-rose-50 text-rose-700";

                        return (
                          <tr key={student.id}>
                            <td className="font-bold text-slate-700">
                              {student.studentId}
                            </td>
                            <td className="font-semibold text-slate-800">
                              {student.studentName}
                            </td>
                            <td className="text-slate-600">
                              {student.className}
                            </td>
                            <td>
                              <span
                                className={`rounded border px-2 py-0.5 text-[11px] font-bold ${progressClass}`}
                              >
                                {uploadedCategories} / 5 Uploaded
                              </span>
                            </td>
                            {DOC_CATEGORIES.map((cat) => {
                              const found = student.documents.find(
                                (doc) => doc.documentKey === cat.key,
                              );
                              if (!found) {
                                return (
                                  <td key={cat.key} className="text-center">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openUploadWorkspace(student, cat.key)
                                      }
                                      className="inline-flex items-center gap-1 rounded border border-dashed border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-400 transition-all hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-600"
                                      title={`Upload ${cat.cardTitle}`}
                                    >
                                      <FaPlus size={8} /> Pending
                                    </button>
                                  </td>
                                );
                              }
                              const approved = found.status === "Approved";
                              return (
                                <td key={cat.key} className="text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const doc = documentRows.find(
                                        (row) =>
                                          String(row.studentMongoId) ===
                                            String(student.studentMongoId) &&
                                          row.documentKey === cat.key,
                                      );
                                      if (doc) {
                                        setPreviewDoc(doc);
                                        setPreviewZoom(1);
                                      }
                                    }}
                                    className={
                                      approved
                                        ? "inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                                        : "inline-flex items-center gap-1 rounded border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100"
                                    }
                                    title={`Preview ${found.displayName || cat.listLabel}`}
                                  >
                                    <FaFileAlt size={9} />{" "}
                                    {approved ? "Approved" : "Pending"}
                                  </button>
                                </td>
                              );
                            })}
                            <td className="text-center">
                              <button
                                type="button"
                                onClick={() => openUploadWorkspace(student)}
                                className="rounded bg-[#4834b8] px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-[#3b2a9e]"
                              >
                                Open Checklist
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ------------------------- Upload Documents page ------------------------- */
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* Student selector */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:col-span-4">
            <div className="mb-5 flex items-center gap-2.5 border-b-2 border-slate-800 pb-3">
              <FaPaperPlane className="text-amber-500" size={16} />
              <h2 className="text-lg font-normal text-slate-700">
                Upload documents
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  User Type <span className="text-rose-600">*</span>
                </label>
                <select
                  value="Student"
                  disabled
                  className="w-44 rounded border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:outline-none"
                >
                  <option value="Student">Student</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  Admission No.
                </label>
                <div className="flex items-center gap-2">
                  <input
                    value={uploadAdmNo}
                    onChange={(event) => setUploadAdmNo(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        searchUploadAdmNo();
                      }
                    }}
                    placeholder="Enter Admission Number"
                    className="flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={searchUploadAdmNo}
                    className="rounded bg-[#5b2cbe] px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#48219c]"
                  >
                    Search
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Try Adm No:{" "}
                  {students.slice(0, 3).map((student) => (
                    <span key={student.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadAdmNo(student.studentId);
                          const match = students.find(
                            (s) => s.studentId === student.studentId,
                          );
                          if (match) {
                            setUploadClass(match.className || "ALL");
                            setUploadStatus(
                              match.isActive ? "Active" : "Inactive",
                            );
                            setUploadStudentId(match.studentMongoId);
                          }
                        }}
                        className="font-semibold text-indigo-600 hover:underline"
                      >
                        {student.studentId || "—"} ({firstNameToken(student.studentName)})
                      </button>
                      {", "}
                    </span>
                  ))}
                  or search by name.
                </p>
              </div>

              <div className="grid grid-cols-12 items-end gap-3">
                <div className="col-span-6">
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">
                    Class name<span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={uploadClass}
                    onChange={(event) => {
                      setUploadClass(event.target.value);
                      setUploadStudentId("");
                    }}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:outline-none"
                  >
                    <option value="ALL">All classes</option>
                    {classNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-6 flex items-center gap-2">
                  <select
                    value={uploadStatus}
                    onChange={(event) => {
                      setUploadStatus(event.target.value);
                      setUploadStudentId("");
                    }}
                    className="flex-1 rounded border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                  <span className="whitespace-nowrap text-xs font-bold text-slate-700">
                    Status <span className="text-rose-600">*</span>
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  Students <span className="text-rose-600">*</span>
                </label>
                <select
                  value={selectedStudent?.studentMongoId || ""}
                  onChange={(event) => setUploadStudentId(event.target.value)}
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-600 focus:outline-none"
                >
                  {uploadStudentOptions.length === 0 ? (
                    <option value="">No students in this class</option>
                  ) : (
                    uploadStudentOptions.map((student) => (
                      <option
                        key={student.id}
                        value={student.studentMongoId}
                      >
                        {student.studentName}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="mt-4 border-t border-slate-200 pt-4">
                {selectedStudent ? (
                  <div className="space-y-2.5 rounded-lg border border-indigo-200 bg-indigo-50/70 p-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                          Selected Student Profile
                        </span>
                        <h4 className="text-sm font-extrabold text-slate-900">
                          {selectedStudent.studentName}
                        </h4>
                      </div>
                      <span className="rounded border border-indigo-200 bg-white px-2.5 py-1 text-xs font-bold text-[#4834b8]">
                        Adm #{selectedStudent.studentId}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 border-t border-indigo-100 pt-2 text-xs">
                      <div>
                        <span className="block text-[10px] font-semibold text-slate-500">
                          Father&apos;s Name
                        </span>
                        <strong className="text-slate-800">
                          {selectedStudent.fatherName || "—"}
                        </strong>
                      </div>
                      <div>
                        <span className="block text-[10px] font-semibold text-slate-500">
                          Mother&apos;s Name
                        </span>
                        <strong className="text-slate-800">
                          {selectedStudent.motherName || "—"}
                        </strong>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-indigo-100 pt-2 text-xs text-slate-600">
                      <span>
                        Class: <strong>{selectedStudent.className}</strong>
                      </span>
                      <span>
                        Uploaded Docs:{" "}
                        <strong
                          className={
                            selectedDocs.length > 0
                              ? "text-emerald-700"
                              : "text-amber-700"
                          }
                        >
                          {selectedDocs.length} file(s)
                        </strong>
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-500">
                    Select a class and status to load students.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Checklist + queue */}
          <div className="space-y-6 lg:col-span-8">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <FaIdCard className="text-indigo-600" size={15} />
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Required Student Document Checklist —{" "}
                      <span className="text-[#4834b8]">
                        {selectedStudent
                          ? `${selectedStudent.studentName} (Adm No: ${selectedStudent.studentId})`
                          : "No student selected"}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Click <strong>&quot;Upload Original File&quot;</strong> on
                      any card below to directly upload that document, or click
                      an uploaded document to view it.
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                    uploadedCount === 5
                      ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  {uploadedCount} of 5 Uploaded
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {DOC_CATEGORIES.map((cat) => {
                  const uploaded = selectedDocs.find(
                    (doc) => doc.documentKey === cat.key,
                  );
                  const listDoc = uploaded
                    ? documentRows.find(
                        (doc) =>
                          String(doc.studentMongoId) ===
                            String(selectedStudent?.studentMongoId) &&
                          doc.documentKey === cat.key,
                      )
                    : null;
                  const fileName =
                    listDoc?.fileName ||
                    (uploaded
                      ? `${uploaded.studentId}_${firstNameToken(uploaded.studentName)}_${cat.listLabel}`
                      : "");

                  return (
                    <div
                      key={cat.key}
                      className="checklist-card flex flex-col justify-between gap-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-bold leading-snug text-slate-900">
                          {cat.cardTitle}
                        </h4>
                        {uploaded ? (
                          uploaded.status === "Approved" ? (
                            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                              <FaCheckCircle size={11} /> Approved
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs font-bold text-sky-600">
                              <FaPlus size={9} /> Uploaded
                            </span>
                          )
                        ) : (
                          <span className="text-xs font-semibold text-[#94a3b8]">
                            Pending
                          </span>
                        )}
                      </div>

                      <div>
                        {uploaded ? (
                          <div className="space-y-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (listDoc) {
                                  setPreviewDoc(listDoc);
                                  setPreviewZoom(1);
                                }
                              }}
                              className="flex w-full items-center justify-center gap-1.5 truncate rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 transition-all hover:bg-emerald-100"
                              title={`Click to view: ${fileName}`}
                            >
                              <FaFilePdf size={11} />{" "}
                              <span className="truncate">{fileName}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => triggerCardUpload(cat.key)}
                              className="w-full rounded px-2 py-1 text-[11px] font-semibold text-slate-500 transition-all hover:bg-slate-50 hover:text-indigo-700"
                            >
                              Replace Original File
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => triggerCardUpload(cat.key)}
                            className="upload-orig-btn"
                          >
                            Upload Original File
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upload queue */}
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <FaFolderOpen className="text-amber-500" size={16} />
                  <h3 className="text-lg font-normal text-slate-700">
                    Upload queue{" "}
                    <span className="ml-1 text-xs font-normal text-slate-500">
                      Number of Files:{" "}
                      <strong className="text-slate-800">
                        {uploadQueue.length}
                      </strong>
                    </span>
                  </h3>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="erp-doc-table w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="w-[38%]">
                        Category <span className="text-rose-600">*</span>
                      </th>
                      <th className="w-[32%]">Uploaded File</th>
                      <th className="w-[18%]">Status</th>
                      <th className="w-[12%]">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadQueue.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-6 text-center text-xs text-slate-400"
                        >
                          No files in queue. Click{" "}
                          <strong>&quot;Choose Files&quot;</strong> below to add
                          batch files, or use{" "}
                          <strong>&quot;Upload Original File&quot;</strong> on
                          any card above.
                        </td>
                      </tr>
                    ) : (
                      uploadQueue.map((item) => {
                        const firstName = firstNameToken(
                          selectedStudent?.studentName,
                        );
                        const admNo = selectedStudent?.studentId || "";
                        const erpName = item.category
                          ? `${admNo}_${firstName}_${
                              CATEGORY_BY_KEY.get(item.category)?.listLabel ||
                              item.category
                            }`
                          : "Select category to auto-format ERP filename";

                        return (
                          <tr key={item.id}>
                            <td>
                              <select
                                value={item.category}
                                onChange={(event) =>
                                  setUploadQueue((prev) =>
                                    prev.map((entry) =>
                                      entry.id === item.id
                                        ? {
                                            ...entry,
                                            category: event.target.value,
                                          }
                                        : entry,
                                    ),
                                  )
                                }
                                className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-600 focus:outline-none"
                              >
                                <option value="">Select Category</option>
                                {DOC_CATEGORIES.map((cat) => (
                                  <option key={cat.key} value={cat.key}>
                                    {cat.listLabel}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <div className="space-y-0.5">
                                <div className="text-xs font-semibold text-slate-800">
                                  {item.fileName}
                                </div>
                                <div className="text-[11px] font-medium text-indigo-600">
                                  ERP Name:{" "}
                                  <span className="truncate">{erpName}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span
                                className={
                                  item.category
                                    ? "inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700"
                                    : "inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700"
                                }
                              >
                                {item.category ? "Ready" : "Select Category"}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({
                                    open: true,
                                    type: "queue-item",
                                    doc: null,
                                    item,
                                  })
                                }
                                className="flex h-7 w-7 items-center justify-center rounded bg-[#e53935] text-white shadow-sm transition-all hover:bg-[#c62828]"
                                title="Remove file from queue"
                              >
                                <FaTrashAlt size={11} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex h-11 items-center justify-between rounded border border-slate-300 bg-[#f2f2f2] px-3">
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <FaUpload className="text-slate-400" size={11} /> Use
                  &quot;Choose Files&quot; below for batch queue uploads.
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="queueMultiFileInput"
                    className="cursor-pointer rounded border border-slate-400 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-900 shadow-sm transition-all hover:bg-slate-200"
                  >
                    Choose Files
                  </label>
                  <span className="text-xs text-slate-700">{queueLabel}</span>
                  <input
                    id="queueMultiFileInput"
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleQueueFiles}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 border-y border-slate-200 bg-[#f5f5f5] px-3 py-2.5">
                <button
                  type="button"
                  onClick={commitQueue}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded bg-[#5cb85c] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#4cae4c] disabled:opacity-60"
                >
                  <FaCloudUploadAlt size={11} /> <span>Upload</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDeleteTarget({
                      open: true,
                      type: "clear-queue",
                      doc: null,
                      item: null,
                    })
                  }
                  className="flex items-center gap-1.5 rounded bg-[#d9534f] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#c9302c]"
                >
                  <FaTrashAlt size={11} /> <span>Remove</span>
                </button>
              </div>

              {queuePendingDocs.length > 0 && (
                <p className="mt-3 text-[11px] text-slate-500">
                  Already uploaded for this student:{" "}
                  {queuePendingDocs
                    .map(
                      (doc) =>
                        CATEGORY_BY_KEY.get(doc.documentKey)?.listLabel ||
                        doc.documentLabel,
                    )
                    .join(", ")}
                  . Uploading a new file replaces the existing one.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------- PDF / image preview ------------------------- */}
      {previewDoc && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-[#323639]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/40 bg-[#202124] px-4 py-2.5 text-white shadow-md">
            <div className="flex items-center gap-3">
              <FaFilePdf className="text-rose-400" size={14} />
              <span className="text-xs font-semibold tracking-wide text-slate-100 sm:text-sm">
                {previewFileName}
              </span>
              <span className="hidden rounded bg-white/10 px-2 py-0.5 text-[11px] text-slate-400 sm:inline-block">
                1 / 1
              </span>
            </div>

            <div className="flex items-center gap-1.5 rounded border border-white/10 bg-[#323639] px-2.5 py-1 text-xs">
              <button
                type="button"
                onClick={() =>
                  setPreviewZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(2)))
                }
                className="px-1.5 hover:text-indigo-300"
                title="Zoom out"
              >
                <FaMinus size={10} />
              </button>
              <span className="px-2 font-mono text-[11px] text-slate-200">
                {Math.round(previewZoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() =>
                  setPreviewZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)))
                }
                className="px-1.5 hover:text-indigo-300"
                title="Zoom in"
              >
                <FaPlus size={10} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={previewDoc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-100 transition-all hover:bg-white/20"
                title="Open raw file in a new tab"
              >
                <FaExternalLinkAlt size={10} />
                <span className="hidden sm:inline">Open File</span>
              </a>
              <a
                href={previewDoc.url}
                download={previewFileName}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-indigo-500"
                title="Download file"
              >
                <FaDownload size={10} />
                <span>Download</span>
              </a>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="flex items-center gap-1 rounded bg-rose-600 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-rose-700"
              >
                <FaTimes size={11} />
                <span>Close</span>
              </button>
            </div>
          </div>

          <div className="flex flex-1 items-start justify-center overflow-auto bg-[#525659] p-4 sm:p-8">
            <div
              className="origin-top transition-transform"
              style={{ transform: `scale(${previewZoom})` }}
            >
              {previewFileType === "pdf" ? (
                <iframe
                  src={previewDoc.url}
                  title={previewFileName}
                  className="h-[85vh] w-[min(760px,90vw)] rounded border border-slate-300 bg-white shadow-2xl"
                />
              ) : previewFileType === "image" ? (
                <img
                  src={previewDoc.url}
                  alt={previewFileName}
                  className="max-h-[85vh] w-auto max-w-full rounded border border-slate-300 bg-white shadow-2xl"
                />
              ) : (
                <div className="w-[min(760px,90vw)] rounded border border-slate-300 bg-white p-8 text-center text-sm text-slate-700 shadow-2xl">
                  <p className="font-semibold">Preview not available</p>
                  <a
                    href={previewDoc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block font-semibold text-indigo-600 underline"
                  >
                    Open the file in a new tab
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------- edit modal ----------------------------- */}
      {editForm.open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-[#4338ca] px-5 py-3.5 text-white">
              <div className="flex items-center gap-2">
                <FaEdit size={13} />
                <h3 className="text-sm font-bold">
                  Edit Student Document Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditForm(emptyEdit())}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <FaTimes size={12} />
              </button>
            </div>

            <div className="space-y-3.5 p-5 text-xs">
              <div>
                <label className="mb-1 block font-bold text-slate-600">
                  Student &amp; Admission No.
                </label>
                <input
                  readOnly
                  value={
                    editForm.doc
                      ? `${editForm.doc.studentName} (Adm No: ${editForm.doc.admNo} • ${editForm.doc.className})`
                      : ""
                  }
                  className="w-full rounded border border-slate-300 bg-slate-100 px-3 py-2 font-semibold text-slate-700"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  Document Category <span className="text-rose-600">*</span>
                </label>
                <select
                  value={editForm.category}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      category: event.target.value,
                    }))
                  }
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 font-medium text-slate-800 focus:border-indigo-600 focus:outline-none"
                >
                  {DOC_CATEGORIES.map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {cat.cardTitle}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  File Name <span className="text-rose-600">*</span>
                </label>
                <input
                  value={editForm.fileName}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      fileName: event.target.value,
                    }))
                  }
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  Approval Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      status: event.target.value,
                    }))
                  }
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-800 focus:border-indigo-600 focus:outline-none"
                >
                  <option value="Approved">Approved</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
              <button
                type="button"
                onClick={() => setEditForm(emptyEdit())}
                className="rounded border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={busy}
                className="rounded bg-[#4338ca] px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#3730a3] disabled:opacity-60"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------- delete modal ---------------------------- */}
      {deleteTarget.open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-rose-600 px-5 py-3.5 text-white">
              <div className="flex items-center gap-2">
                <FaTrashAlt size={12} />
                <h3 className="text-sm font-bold">
                  {deleteTarget.type === "doc"
                    ? "Confirm Delete Document"
                    : deleteTarget.type === "queue-item"
                      ? "Remove Queued File"
                      : "Remove All Queued Files"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(emptyDelete())}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <FaTimes size={12} />
              </button>
            </div>

            <div className="space-y-3 p-5 text-xs text-slate-700">
              <p className="font-medium text-slate-700">
                {deleteTarget.type === "doc"
                  ? "Are you sure you want to permanently delete this student document?"
                  : deleteTarget.type === "queue-item"
                    ? "Are you sure you want to remove this file from the upload queue?"
                    : "Are you sure you want to remove all files currently in the upload queue?"}
              </p>
              <div className="space-y-1 rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-900">
                {deleteTarget.type === "doc" && deleteTarget.doc && (
                  <>
                    <div>
                      Student:{" "}
                      <strong>
                        {deleteTarget.doc.studentName} (Adm #
                        {deleteTarget.doc.admNo})
                      </strong>
                    </div>
                    <div>
                      File Name: <strong>{deleteTarget.doc.fileName}</strong>
                    </div>
                    <div>
                      Category: <strong>{deleteTarget.doc.categoryLabel}</strong>
                    </div>
                  </>
                )}
                {deleteTarget.type === "queue-item" && deleteTarget.item && (
                  <>
                    <div>
                      Queued File: <strong>{deleteTarget.item.fileName}</strong>
                    </div>
                    <div>
                      Category:{" "}
                      <strong>
                        {CATEGORY_BY_KEY.get(deleteTarget.item.category)
                          ?.listLabel || "Not Selected"}
                      </strong>
                    </div>
                  </>
                )}
                {deleteTarget.type === "clear-queue" && (
                  <div>
                    Total Files in Queue:{" "}
                    <strong>{uploadQueue.length} file(s)</strong>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(emptyDelete())}
                className="rounded border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={busy}
                className="flex items-center gap-1.5 rounded bg-rose-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
              >
                <FaTrashAlt size={11} />
                <span>Yes, Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDocuments;
