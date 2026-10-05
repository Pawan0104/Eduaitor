import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Link, useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaCog,
  FaPrint,
  FaSearch,
  FaFileAlt,
  FaUserGraduate,
} from "react-icons/fa";
import CertificatePreview from "./CertificatePreview";

const API = import.meta.env.VITE_API_URL;

const TYPES = [
  {
    id: "transfer",
    label: "Transfer Certificate",
    hint: "For students leaving / transferring schools",
  },
  {
    id: "character",
    label: "Character Certificate",
    hint: "Conduct & character for official use",
  },
];

const buildQuery = ({
  issueDate,
  leavingDate,
  reason,
  conduct,
  remarks,
  certificateNo,
}) => {
  const params = new URLSearchParams({
    issueDate,
    leavingDate,
    reason,
    conduct,
    remarks,
  });
  const no = String(certificateNo || "").trim();
  if (no) params.set("certificateNo", no);
  return params;
};

export default function Certificates() {
  const navigate = useNavigate();
  const [type, setType] = useState("transfer");
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState("");
  const [studentId, setStudentId] = useState("");
  const [issueDate, setIssueDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [leavingDate, setLeavingDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [reason, setReason] = useState("Parent's request");
  const [conduct, setConduct] = useState("Good");
  const [remarks, setRemarks] = useState("");
  const [certificateNo, setCertificateNo] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [certificate, setCertificate] = useState(null);

  // The generate endpoint is a stateless GET — it writes nothing and derives the
  // certificate number from type + student + year. So the preview can be built
  // automatically the moment a type and student are chosen, and kept in sync as
  // the option fields change. No separate "generate" step is needed.
  useEffect(() => {
    if (!studentId) {
      setCertificate(null);
      setPreviewError("");
      setPreviewing(false);
      return;
    }

    const controller = new AbortController();

    // Debounced so typing in Remarks/Reason does not fire a request per keystroke.
    const timer = setTimeout(async () => {
      setPreviewing(true);
      try {
        const { data } = await axios.get(
          `${API}/certificates/generate/${type}/${studentId}?${buildQuery({
            issueDate,
            leavingDate,
            reason,
            conduct,
            remarks,
            certificateNo,
          })}`,
          { withCredentials: true, signal: controller.signal },
        );
        setCertificate(data.certificate);
        setPreviewError("");
      } catch (err) {
        if (axios.isCancel(err)) return;
        setCertificate(null);
        setPreviewError(
          err.response?.data?.message || "Could not build preview",
        );
      } finally {
        if (!controller.signal.aborted) setPreviewing(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    type,
    studentId,
    issueDate,
    leavingDate,
    reason,
    conduct,
    remarks,
    certificateNo,
  ]);

  // Explicit re-fetch, e.g. after editing the template under Document designs.
  const refreshPreview = async () => {
    if (!studentId) {
      toast.error("Select a student");
      return;
    }
    try {
      setPreviewing(true);
      const { data } = await axios.get(
        `${API}/certificates/generate/${type}/${studentId}?${buildQuery({
          issueDate,
          leavingDate,
          reason,
          conduct,
          remarks,
          certificateNo,
        })}`,
        { withCredentials: true },
      );
      setCertificate(data.certificate);
      setPreviewError("");
      toast.success("Preview refreshed");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not build preview");
    } finally {
      setPreviewing(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingList(true);
        const { data } = await axios.get(`${API}/students`, {
          withCredentials: true,
        });
        const list = data?.data || data?.students || [];
        setStudents(Array.isArray(list) ? list : []);
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load students");
      } finally {
        setLoadingList(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students.slice(0, 40);
    return students
      .filter((s) => {
        const name = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();
        const id = String(s.studentId || "").toLowerCase();
        return name.includes(q) || id.includes(q);
      })
      .slice(0, 40);
  }, [students, query]);

  const getCertificateSheetHtml = () => {
    const el = document.querySelector(".certificate-sheet");
    if (!el) return null;
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((n) => n.outerHTML)
      .join("\n");
    return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Certificate</title>
      ${styles}
      <style>
        @page { size: A4; margin: 12mm; }
        body { margin: 0; background: #fff !important; }
        .certificate-sheet { box-shadow: none !important; max-width: none !important; margin: 0 auto !important; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
      </head><body>${el.outerHTML}</body></html>`;
  };

  const printCertificateSheet = () => {
    const html = getCertificateSheetHtml();
    if (!html) {
      toast.error("Select a student first — the preview builds automatically");
      return;
    }
    const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=1200");
    if (!win) {
      toast.error("Pop-up blocked — allow pop-ups to print");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 400);
  };

  const downloadCertificate = () => {
    const el = document.querySelector(".certificate-sheet");
    if (!el) {
      toast.error("Select a student first — the preview builds automatically");
      return;
    }
    const html = getCertificateSheetHtml();
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-certificate-${studentId || "student"}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Certificate downloaded — open the file and use Print → Save as PDF");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6 print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))]"
          >
            <FaArrowLeft />
          </button>
          <div>
            <h1 className="text-xl font-black text-[rgb(var(--text))]">
              Certificates
            </h1>
            <p className="text-sm text-[rgb(var(--text-muted))]">
              Live preview of Transfer or Character certificates
            </p>
          </div>
        </div>
        <Link
          to="/school/certificates/settings"
          className="inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 py-2.5 text-sm font-bold text-[rgb(var(--text))]"
        >
          <FaCog /> Document designs
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[340px_1fr] print:block">
        <div className="space-y-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 print:hidden">
          <p className="text-xs font-bold uppercase tracking-wide text-[rgb(var(--text-muted))]">
            Certificate type
          </p>
          <div className="space-y-2">
            {TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setType(t.id);
                  setCertificate(null);
                }}
                className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                  type === t.id
                    ? "border-[rgba(var(--primary),0.45)] bg-[rgba(var(--primary),0.08)]"
                    : "border-[rgb(var(--border))]"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-[rgb(var(--text))]">
                  <FaFileAlt className="opacity-70" />
                  {t.label}
                </div>
                <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
                  {t.hint}
                </p>
              </button>
            ))}
          </div>

          <div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[rgb(var(--text-muted))]">
              Student
            </p>
            <div className="relative mb-2">
              <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or ID…"
                className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] py-2.5 pl-9 pr-3 text-sm outline-none"
              />
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-[rgb(var(--border))] p-1">
              {loadingList ? (
                <p className="p-3 text-sm text-[rgb(var(--text-muted))]">
                  Loading students…
                </p>
              ) : filtered.length === 0 ? (
                <p className="p-3 text-sm text-[rgb(var(--text-muted))]">
                  No students found
                </p>
              ) : (
                filtered.map((s) => {
                  const id = s._id;
                  const active = String(studentId) === String(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setStudentId(id);
                        setCertificate(null);
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm ${
                        active
                          ? "bg-[rgba(var(--primary),0.12)] font-bold"
                          : "hover:bg-[rgba(var(--primary),0.05)]"
                      }`}
                    >
                      <FaUserGraduate className="shrink-0 opacity-50" />
                      <span className="min-w-0 truncate">
                        {s.firstName} {s.lastName}
                        <span className="ml-1 text-xs opacity-60">
                          {s.studentId || ""}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <label className="block space-y-1 text-sm">
            <span className="text-xs font-bold uppercase text-[rgb(var(--text-muted))]">
              Issue date
            </span>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2"
            />
          </label>

          {type === "transfer" && (
            <>
              <label className="block space-y-1 text-sm">
                <span className="text-xs font-bold uppercase text-[rgb(var(--text-muted))]">
                  Leaving date
                </span>
                <input
                  type="date"
                  value={leavingDate}
                  onChange={(e) => setLeavingDate(e.target.value)}
                  className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-xs font-bold uppercase text-[rgb(var(--text-muted))]">
                  Reason for leaving
                </span>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2"
                />
              </label>
            </>
          )}

          <label className="block space-y-1 text-sm">
            <span className="text-xs font-bold uppercase text-[rgb(var(--text-muted))]">
              Conduct / character
            </span>
            <select
              value={conduct}
              onChange={(e) => setConduct(e.target.value)}
              className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2"
            >
              {["Excellent", "Very Good", "Good", "Satisfactory", "Average"].map(
                (c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="block space-y-1 text-sm">
            <span className="text-xs font-bold uppercase text-[rgb(var(--text-muted))]">
              Remarks (optional)
            </span>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="text-xs font-bold uppercase text-[rgb(var(--text-muted))]">
              Certificate no. (optional)
            </span>
            <input
              value={certificateNo}
              onChange={(e) => setCertificateNo(e.target.value)}
              placeholder="Auto if empty"
              className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2"
            />
          </label>

          <p className="text-xs text-[rgb(var(--text-muted))]">
            The preview builds itself as soon as you pick a certificate type and
            student, and updates whenever you change anything below.
          </p>
          <button
            type="button"
            disabled={previewing || !studentId}
            onClick={refreshPreview}
            className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] py-3 text-sm font-bold text-[rgb(var(--text))] transition hover:bg-[rgba(var(--primary),0.06)] disabled:opacity-50"
          >
            {previewing ? "Refreshing…" : "Refresh preview"}
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-[rgb(var(--text))]">
                Preview
              </p>
              {previewing ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(var(--primary),0.10)] px-2.5 py-1 text-xs font-semibold text-[rgb(var(--text-muted))]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[rgb(var(--primary))]" />
                  Updating…
                </span>
              ) : null}
              {certificate && !previewing ? (
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  Live — ready to print
                </span>
              ) : null}
            </div>
            {certificate && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={printCertificateSheet}
                  className="inline-flex items-center gap-2 rounded-xl bg-[rgb(var(--primary))] px-4 py-2.5 text-sm font-bold text-white"
                >
                  <FaPrint /> Print
                </button>
                <button
                  type="button"
                  onClick={downloadCertificate}
                  className="inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 py-2.5 text-sm font-bold text-[rgb(var(--text))]"
                >
                  Download
                </button>
              </div>
            )}
          </div>

          {previewError ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-red-300 bg-red-50/60 p-8 text-center print:hidden">
              <p className="text-sm font-bold text-red-800">
                Preview unavailable
              </p>
              <p className="text-sm text-red-700">{previewError}</p>
              <button
                type="button"
                onClick={refreshPreview}
                className="rounded-xl bg-[rgb(var(--primary))] px-4 py-2 text-sm font-bold text-white"
              >
                Try again
              </button>
            </div>
          ) : !certificate ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-8 text-center text-sm text-[rgb(var(--text-muted))] print:hidden">
              {studentId
                ? "Building preview…"
                : "Select a certificate type and a student — the preview appears here automatically."}
            </div>
          ) : (
            <div
              className={`overflow-auto rounded-2xl bg-slate-200/80 p-3 transition-opacity print:bg-white print:p-0 ${
                previewing ? "opacity-60" : "opacity-100"
              }`}
            >
              <CertificatePreview certificate={certificate} />
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .certificate-sheet, .certificate-sheet * { visibility: visible !important; }
          .certificate-sheet {
            position: absolute !important;
            left: 0; top: 0;
            width: 100% !important;
            max-width: none !important;
            box-shadow: none !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
