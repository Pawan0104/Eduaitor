import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaEye,
  FaFileAlt,
  FaPrint,
  FaSearch,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

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

const StudentDocuments = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
  const isStaff = user?.role === "staff_admin";
  const basePath = isStaff ? "/staff" : "/school";

  const [classes, setClasses] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");

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
  }, [classId, sectionId, search]);

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

  const totalDocs = rows.length;

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
            All uploaded student documents in one place. Filter by class and
            section, then view or print.
          </p>
        </div>
        <p className="text-sm font-medium text-[rgb(var(--text-muted))]">
          {loading
            ? "Loading…"
            : `${studentRows.length} student${studentRows.length === 1 ? "" : "s"} · ${totalDocs} document${totalDocs === 1 ? "" : "s"}`}
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
            <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))]" size={12} />
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
                <th className="px-4 py-3 font-semibold w-[220px]">Student</th>
                <th className="px-4 py-3 font-semibold">Class</th>
                <th className="px-4 py-3 font-semibold">Section</th>
                <th className="px-4 py-3 font-semibold">Documents</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-[rgb(var(--text-muted))]">
                    Loading documents…
                  </td>
                </tr>
              ) : studentRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-[rgb(var(--text-muted))]">
                    No documents found for the selected filters.
                  </td>
                </tr>
              ) : (
                studentRows.map((student) => (
                  <tr
                    key={student.studentMongoId || student.studentId}
                    className="border-t border-[rgb(var(--border))] align-top hover:bg-black/[0.02]"
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
                      <ul className="space-y-2">
                        {student.documents.map((doc, index) => (
                          <li
                            key={`${doc.documentKey}-${index}`}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2"
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
                                  printDocument(
                                    doc.url,
                                    `${student.studentName || "Student"} — ${doc.documentLabel}`,
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentDocuments;
