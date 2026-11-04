import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaEye,
  FaFileAlt,
  FaPrint,
  FaSearch,
  FaUpload,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

const DOCUMENT_TYPES = [
  { key: "studentPhoto", label: "Student Photo" },
  { key: "fatherPhoto", label: "Father Photo" },
  { key: "motherPhoto", label: "Mother Photo" },
  { key: "guardianPhoto", label: "Guardian Photo" },
  { key: "birthCertificate", label: "Birth Certificate" },
  { key: "transferCertificate", label: "Transfer Certificate" },
  { key: "studentAadhar", label: "Student Aadhaar" },
  { key: "fatherAadhar", label: "Father Aadhaar" },
  { key: "motherAadhar", label: "Mother Aadhaar" },
];

const PHOTO_KEYS = new Set([
  "studentPhoto",
  "fatherPhoto",
  "motherPhoto",
  "guardianPhoto",
]);

const openDocument = (url) => {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
};

const printDocument = (url, title = "Document") => {
  if (!url) return;
  const safeTitle = String(title || "Document").replace(/[<>&"]/g, "");
  const lower = String(url).toLowerCase();
  const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(lower);
  const isPdf = /\.pdf(\?|$)/i.test(lower) || lower.includes("application/pdf");

  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) {
    toast.error("Please allow pop-ups to print documents");
    return;
  }

  const bodyHtml = isImage
    ? `<img src="${url}" alt="${safeTitle}" style="max-width:100%;height:auto;" onload="window.focus();window.print();" />`
    : isPdf
      ? `<embed src="${url}" type="application/pdf" style="width:100%;height:100vh;border:0;" />
         <script>setTimeout(function(){window.focus();window.print();},600);</script>`
      : `<p style="font-family:sans-serif;padding:24px;">
           Opening document… If printing does not start, 
           <a href="${url}" target="_blank" rel="noopener">open the file</a> and print from there.
         </p>
         <iframe src="${url}" style="width:100%;height:80vh;border:0;" onload="setTimeout(function(){window.focus();window.print();},400);"></iframe>`;

  win.document.write(`<!doctype html>
<html>
  <head>
    <title>${safeTitle}</title>
    <style>
      html, body { margin: 0; padding: 0; background: #fff; }
      @media print { body { margin: 0; } }
    </style>
  </head>
  <body>${bodyHtml}</body>
</html>`);
  win.document.close();
};

const emptyUploadForm = () => ({
  open: false,
  studentMongoId: "",
  studentName: "",
  documentKey: "studentPhoto",
});

const StudentDocuments = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
  const isStaff = user?.role === "staff_admin";
  const basePath = isStaff ? "/staff" : "/school";
  const fileInputRef = useRef(null);

  const [classes, setClasses] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [docsModal, setDocsModal] = useState({
    open: false,
    student: null,
  });
  const [uploadForm, setUploadForm] = useState(emptyUploadForm);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const sections = useMemo(() => {
    if (!classId) return [];
    const cls = classes.find((item) => String(item._id) === String(classId));
    if (!cls) return [];
    const list = [];
    const seen = new Set();
    (cls.details || []).forEach((detail) => {
      const section = detail?.sectionId;
      const id = section?._id || section;
      if (!id || seen.has(String(id))) return;
      seen.add(String(id));
      list.push({
        _id: id,
        name: section?.name || section?.sectionName || "Section",
      });
    });
    return list;
  }, [classes, classId]);

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const { data } = await axios.get(`${API}/classes/all`, {
          withCredentials: true,
        });
        setClasses(data.classes || []);
      } catch {
        toast.error("Failed to load classes");
      }
    };
    loadClasses();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchDraft.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setLoading(true);
        const params = {};
        if (classId) params.classId = classId;
        if (sectionId) params.sectionId = sectionId;
        if (search) params.search = search;
        const { data } = await axios.get(`${API}/students/documents`, {
          params,
          withCredentials: true,
        });
        setRows(data.data || []);
      } catch (err) {
        toast.error(
          err.response?.data?.message || "Failed to load documents",
        );
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    loadDocuments();
  }, [classId, sectionId, search, reloadKey]);

  const studentRows = useMemo(() => {
    const byStudent = new Map();
    rows.forEach((row) => {
      const key = row.studentMongoId || `${row.studentId}-${row.studentName}`;
      if (!byStudent.has(key)) {
        byStudent.set(key, {
          studentMongoId: row.studentMongoId,
          studentId: row.studentId,
          studentName: row.studentName,
          rollNo: row.rollNo,
          className: row.className,
          sectionName: row.sectionName,
          documents: [],
        });
      }
      if (!row.url || !row.documentKey) return;
      byStudent.get(key).documents.push({
        documentKey: row.documentKey,
        documentLabel: row.documentLabel,
        url: row.url,
        fileType: row.fileType,
        source: row.source,
      });
    });
    return [...byStudent.values()];
  }, [rows]);

  // Keep the open popup in sync after a reload/upload.
  const activeStudent = useMemo(() => {
    if (!docsModal.open || !docsModal.student?.studentMongoId) return null;
    return (
      studentRows.find(
        (s) => s.studentMongoId === docsModal.student.studentMongoId,
      ) || docsModal.student
    );
  }, [docsModal, studentRows]);

  const openDocsPopup = (student) => {
    if (!student?.studentMongoId) {
      toast.error("Student id missing");
      return;
    }
    setDocsModal({ open: true, student });
  };

  const closeDocsPopup = () => {
    if (uploading) return;
    setDocsModal({ open: false, student: null });
  };

  const openUpload = (student, documentKey = "studentPhoto") => {
    if (!student?.studentMongoId) {
      toast.error("Student id missing");
      return;
    }
    const allowed = DOCUMENT_TYPES.some((item) => item.key === documentKey);
    setUploadForm({
      open: true,
      studentMongoId: student.studentMongoId,
      studentName: student.studentName || "Student",
      documentKey: allowed ? documentKey : "studentPhoto",
    });
    setUploadFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const closeUpload = () => {
    if (uploading) return;
    setUploadForm(emptyUploadForm());
    setUploadFile(null);
  };

  const submitUpload = async () => {
    if (!uploadForm.studentMongoId) return;
    if (!uploadForm.documentKey) {
      toast.error("Select a document type");
      return;
    }
    if (!uploadFile) {
      toast.error("Choose a file to upload");
      return;
    }

    const maxBytes = 2 * 1024 * 1024;
    if (uploadFile.size > maxBytes) {
      toast.error("File must be less than 2MB");
      return;
    }

    const isPhoto = PHOTO_KEYS.has(uploadForm.documentKey);
    const okType = isPhoto
      ? /^image\/(jpeg|png|webp)$/i.test(uploadFile.type)
      : /^(image\/(jpeg|png|webp)|application\/pdf)$/i.test(uploadFile.type);
    if (!okType) {
      toast.error(
        isPhoto
          ? "Photos must be JPG, PNG, or WEBP"
          : "Use JPG, PNG, WEBP, or PDF",
      );
      return;
    }

    try {
      setUploading(true);
      const data = new FormData();
      data.append(uploadForm.documentKey, uploadFile);
      await axios.put(`${API}/students/${uploadForm.studentMongoId}`, data, {
        withCredentials: true,
      });
      toast.success("Document uploaded");
      closeUpload();
      setReloadKey((n) => n + 1);
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const acceptForType = PHOTO_KEYS.has(uploadForm.documentKey)
    ? "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
    : "image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf";

  return (
    <div className="p-4 lg:p-8 min-h-screen text-[rgb(var(--text))]">
      {isMobile && (
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-3 flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-1.5 text-sm font-bold text-slate-600 shadow-sm"
        >
          <FaArrowLeft size={14} /> Back
        </button>
      )}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <FaFileAlt className="text-[rgb(var(--primary))]" /> Documents
          </h1>
          <p className="text-sm text-[rgb(var(--text-muted))] mt-1">
            Open Upload or Print for a student to manage their documents.
          </p>
        </div>
        <p className="text-sm font-medium text-[rgb(var(--text-muted))]">
          {loading
            ? "Loading…"
            : `${studentRows.length} student${studentRows.length === 1 ? "" : "s"}`}
        </p>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Class
          <select
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setSectionId("");
            }}
            className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2.5 text-sm"
          >
            <option value="">All classes</option>
            {classes.map((cls) => (
              <option key={cls._id} value={cls._id}>
                {cls.name || cls.className}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Section
          <select
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            disabled={!classId}
            className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2.5 text-sm disabled:opacity-50"
          >
            <option value="">All sections</option>
            {sections.map((section) => (
              <option key={section._id} value={section._id}>
                {section.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Search student
          <div className="relative">
            <FaSearch
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))]"
              size={12}
            />
            <input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Name, admission no., roll…"
              className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] py-2.5 pl-9 pr-3 text-sm"
            />
          </div>
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[rgb(var(--bg))] text-left text-xs uppercase tracking-wide text-[rgb(var(--text-muted))]">
              <tr>
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Class</th>
                <th className="px-4 py-3 font-semibold">Section</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-[rgb(var(--text-muted))]"
                  >
                    Loading students…
                  </td>
                </tr>
              ) : studentRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-[rgb(var(--text-muted))]"
                  >
                    No students found for the selected filters.
                  </td>
                </tr>
              ) : (
                studentRows.map((student) => (
                  <tr
                    key={student.studentMongoId || student.studentId}
                    className="border-t border-[rgb(var(--border))] hover:bg-black/[0.02]"
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `${basePath}/student-view/${student.studentMongoId}`,
                          )
                        }
                        className="text-left font-semibold text-[rgb(var(--primary))] hover:underline"
                      >
                        {student.studentName || "—"}
                      </button>
                      <div className="text-xs text-[rgb(var(--text-muted))]">
                        {[
                          student.studentId,
                          student.rollNo ? `Roll ${student.rollNo}` : "",
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {student.className || "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {student.sectionName || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openDocsPopup(student)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-1.5 text-xs font-semibold hover:opacity-90"
                        >
                          <FaUpload size={11} /> Upload
                        </button>
                        <button
                          type="button"
                          onClick={() => openDocsPopup(student)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[rgb(var(--primary))] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                        >
                          <FaPrint size={11} /> Print
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {docsModal.open && activeStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-[rgb(var(--border))] px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {activeStudent.studentName || "Student"} — Documents
                </h2>
                <p className="mt-0.5 text-xs text-[rgb(var(--text-muted))]">
                  {[
                    activeStudent.studentId,
                    activeStudent.className,
                    activeStudent.sectionName
                      ? `Sec ${activeStudent.sectionName}`
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDocsPopup}
                className="rounded-lg border border-[rgb(var(--border))] px-2.5 py-1 text-sm font-semibold"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => openUpload(activeStudent)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[rgb(var(--primary))] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                >
                  <FaUpload size={11} /> Upload new
                </button>
              </div>

              {(!activeStudent.documents ||
                activeStudent.documents.length === 0) && (
                <p className="rounded-xl border border-dashed border-[rgb(var(--border))] px-4 py-8 text-center text-sm text-[rgb(var(--text-muted))]">
                  No documents uploaded yet. Use Upload new to add one.
                </p>
              )}

              <ul className="space-y-2">
                {(activeStudent.documents || []).map((doc, index) => (
                  <li
                    key={`${doc.documentKey}-${index}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2.5"
                  >
                    <span className="min-w-0 flex-1 font-medium truncate">
                      {doc.documentLabel}
                    </span>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => openDocument(doc.url)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2.5 py-1.5 text-xs font-semibold hover:opacity-90"
                      >
                        <FaEye size={11} /> View
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          openUpload(activeStudent, doc.documentKey)
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2.5 py-1.5 text-xs font-semibold hover:opacity-90"
                      >
                        <FaUpload size={11} /> Upload
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          printDocument(
                            doc.url,
                            `${activeStudent.studentName || "Student"} — ${doc.documentLabel}`,
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[rgb(var(--primary))] px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                      >
                        <FaPrint size={11} /> Print
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {uploadForm.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-xl">
            <h2 className="text-lg font-semibold">Upload document</h2>
            <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">
              {uploadForm.studentName}
            </p>

            <label className="mt-4 flex flex-col gap-1.5 text-sm font-medium">
              Document type
              <select
                value={uploadForm.documentKey}
                onChange={(e) =>
                  setUploadForm((prev) => ({
                    ...prev,
                    documentKey: e.target.value,
                  }))
                }
                className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2.5 text-sm"
              >
                {DOCUMENT_TYPES.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-3 flex flex-col gap-1.5 text-sm font-medium">
              File
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptForType}
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-sm"
              />
              <span className="text-[11px] font-normal text-[rgb(var(--text-muted))]">
                {PHOTO_KEYS.has(uploadForm.documentKey)
                  ? "JPG, PNG, or WEBP · max 2MB"
                  : "JPG, PNG, WEBP, or PDF · max 2MB"}
              </span>
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeUpload}
                disabled={uploading}
                className="rounded-lg border border-[rgb(var(--border))] px-3 py-2 text-sm font-semibold disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitUpload}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[rgb(var(--primary))] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                <FaUpload size={12} />
                {uploading ? "Uploading…" : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDocuments;
