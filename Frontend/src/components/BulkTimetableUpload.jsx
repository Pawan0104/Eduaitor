import { useRef, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import { FaFileExcel, FaUpload, FaTimes } from "react-icons/fa";

const API = import.meta.env.VITE_API_URL;

/**
 * Spreadsheet upload for class timetables (school + teacher).
 * Template columns: className, sectionName, day, periodName, start, end,
 * type, subjectName, teacherName, customName
 */
export default function BulkTimetableUpload({ onComplete, compact = false }) {
  const fileInputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const parsePreview = (selected) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        setPreviewRows(rows.slice(0, 8));
      } catch {
        setPreviewRows([]);
        toast.error("Could not read that file");
      }
    };
    reader.readAsBinaryString(selected);
  };

  const handleFile = (selected) => {
    if (!selected) return;
    setFile(selected);
    setResult(null);
    parsePreview(selected);
  };

  const downloadTemplate = async () => {
    try {
      const res = await axios.get(`${API}/timetable/bulk-upload/template`, {
        withCredentials: true,
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "timetable_bulk_upload_template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download template");
    }
  };

  const reset = () => {
    setFile(null);
    setPreviewRows([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const upload = async () => {
    if (!file) {
      toast.warn("Choose a file first");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await axios.post(`${API}/timetable/bulk-upload`, fd, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data.data || null);
      toast.success(res.data.message || "Timetable uploaded");
      onComplete?.(res.data.data);
      reset();
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-semibold text-[rgb(var(--text))] transition hover:bg-[rgb(var(--bg))] ${
          compact ? "px-2.5 py-1.5 text-xs" : ""
        }`}
      >
        <FaUpload size={compact ? 11 : 13} />
        Upload Timetable
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-[rgb(var(--text))]">
            Upload Timetable
          </h3>
          <p className="mt-0.5 text-xs text-[rgb(var(--text-muted))]">
            Excel/CSV with class, section, day, period, subject &amp; teacher.
            Existing timetable for that class/section is replaced.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            reset();
          }}
          className="rounded-lg p-1.5 text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--bg))]"
          aria-label="Close"
        >
          <FaTimes size={14} />
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={downloadTemplate}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"
        >
          <FaFileExcel /> Download template
        </button>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[rgb(var(--border))] px-3 py-2 text-xs font-bold text-[rgb(var(--text))]">
          Choose file
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
        <button
          type="button"
          disabled={!file || uploading}
          onClick={upload}
          className="inline-flex items-center gap-2 rounded-lg bg-[rgb(var(--primary))] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </div>

      {file && (
        <p className="mb-2 text-xs font-semibold text-[rgb(var(--text))]">
          Selected: {file.name}
        </p>
      )}

      {previewRows.length > 0 && (
        <div className="mb-3 overflow-x-auto rounded-xl border border-[rgb(var(--border))]">
          <table className="w-full min-w-150 text-left text-[11px]">
            <thead className="bg-[rgb(var(--bg))]">
              <tr>
                {Object.keys(previewRows[0]).map((k) => (
                  <th key={k} className="px-2 py-1.5 font-bold uppercase">
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, i) => (
                <tr key={i} className="border-t border-[rgb(var(--border))]">
                  {Object.keys(previewRows[0]).map((k) => (
                    <td key={k} className="px-2 py-1.5">
                      {String(row[k] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result && (
        <div className="rounded-xl bg-[rgb(var(--bg))] p-3 text-xs">
          <p className="font-bold text-[rgb(var(--text))]">
            Uploaded {result.uploaded || 0} · Failed rows {result.failed || 0}
          </p>
          {result.failedRows?.length > 0 && (
            <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-rose-600">
              {result.failedRows.slice(0, 12).map((f, i) => (
                <li key={i}>
                  Row {f.row}: {f.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
