import { useRef, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";

const API = import.meta.env.VITE_API_URL;

// Fields we can sanity-check on the client before even hitting the server.
// (className/sectionName/etc. still need the server, since only it knows
// which classes and sections actually exist for this school.)
const getRowIssues = (row) => {
  const issues = [];
  if (!row.firstName) issues.push("firstName missing");
  if (!row.lastName) issues.push("lastName missing");
  return issues;
};

const BulkStudentUpload = ({ onComplete }) => {
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState(null);

  const parseFileForPreview = (selectedFile) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        setPreviewRows(rows); // show everything — no slicing
      } catch {
        setPreviewRows([]);
        toast.error("Couldn't read that file. Is it a valid .xlsx/.xls/.csv?");
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleFileChange = (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setResult(null);
    parseFileForPreview(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (uploading) return;
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleFileChange(dropped);
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await axios.get(`${API}/students/bulk-upload/template`, {
        withCredentials: true,
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "student_bulk_upload_template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download the template");
    }
  };

  // Clears the picked file + preview only — used after a successful upload
  // so the form is immediately ready for the next batch.
  const clearFileOnly = () => {
    setFile(null);
    setPreviewRows([]);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Full manual reset — also clears the results panel.
  const resetAll = () => {
    clearFileOnly();
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.warn("Choose a file first");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    setUploadProgress(0);
    setResult(null);

    try {
      const res = await axios.post(`${API}/students/bulk-upload`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) return;
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          setUploadProgress(percent);
        },
      });

      setResult(res.data);

      if (res.data.createdCount > 0) {
        toast.success(`${res.data.createdCount} student(s) created`);
      }
      if (res.data.failedCount > 0) {
        toast.warn(`${res.data.failedCount} row(s) failed — see details below`);
      }

      onComplete?.(res.data);

      // Upload succeeded (even if some rows failed) — clear the file so the
      // dropzone is ready for another batch, while keeping the results visible.
      clearFileOnly();
    } catch (err) {
      toast.error(err.response?.data?.message || "Bulk upload failed");
      // Keep the file selected on failure so the user can just retry.
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadFailedRows = () => {
    if (!result?.failed?.length) return;

    const exportRows = result.failed.map((f) => ({
      row: f.row,
      ...f.data,
      errors: f.errors?.join("; "),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Failed Rows");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    const blob = new Blob([buffer], {
      type: "application/octet-stream",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "failed_rows.xlsx");
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const previewColumns = previewRows.length ? Object.keys(previewRows[0]) : [];
  const issueCount = previewRows.filter(
    (row) => getRowIssues(row).length > 0,
  ).length;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Bulk Student Upload</h2>
          <p className="text-sm text-gray-500">
            Add many students at once from a spreadsheet.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownloadTemplate}
          disabled={uploading}
          className="text-sm px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
        >
          Download template
        </button>
      </div>

      {/* ── DROPZONE ── */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-disabled={uploading}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 ${
          uploading
            ? "cursor-not-allowed opacity-60 border-gray-200"
            : "cursor-pointer " +
              (isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300")
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          disabled={uploading}
          onChange={(e) => handleFileChange(e.target.files?.[0])}
        />
        {file ? (
          <p className="text-sm text-gray-700">
            Selected file: <span className="font-medium">{file.name}</span>
          </p>
        ) : (
          <p className="text-sm text-gray-500">
            Drag and drop a filled-in template here, or click to browse (.xlsx,
            .xls, or .csv)
          </p>
        )}
      </div>

      {/* ── UPLOAD PROGRESS ── */}
      {uploading && (
        <div className="space-y-1.5">
          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-150"
              style={{
                width: `${uploadProgress}%`,
              }}
            />
          </div>
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            {uploadProgress < 100
              ? `Uploading file… ${uploadProgress}%`
              : "Creating student records on the server…"}
          </p>
        </div>
      )}

      {/* ── PREVIEW ── */}
      {previewRows.length > 0 && !uploading && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            {previewRows.length} row(s) found
            {issueCount > 0 && (
              <span className="text-red-600">
                {" "}
                · {issueCount} missing firstName/lastName
              </span>
            )}
          </p>
          <div className="overflow-auto border rounded-md max-h-[28rem]">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    #
                  </th>
                  {previewColumns.map((col) => (
                    <th
                      key={col}
                      className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, idx) => {
                  const issues = getRowIssues(row);
                  return (
                    <tr
                      key={idx}
                      className={`border-t ${
                        issues.length > 0 ? "bg-red-50" : ""
                      }`}
                      title={issues.length ? issues.join(", ") : undefined}
                    >
                      <td className="px-3 py-2 text-gray-400">{idx + 2}</td>
                      {previewColumns.map((col) => (
                        <td key={col} className="px-3 py-2 whitespace-nowrap">
                          {String(row[col] ?? "")}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ACTIONS ── */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || uploading}
          className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50 flex items-center gap-2"
        >
          {uploading && (
            <span className="inline-block h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {uploading ? "Uploading…" : "Upload students"}
        </button>
        <button
          type="button"
          onClick={resetAll}
          disabled={uploading}
          className="px-4 py-2 rounded-md border border-gray-300 text-sm disabled:opacity-50"
        >
          Reset
        </button>
      </div>

      {/* ── RESULTS ── */}
      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-green-700">
              Created: {result.createdCount}
            </span>
            <span className="text-red-700">Failed: {result.failedCount}</span>
            {result.failed?.length > 0 && (
              <button
                type="button"
                onClick={handleDownloadFailedRows}
                className="ml-auto text-xs px-2.5 py-1 rounded-md border border-gray-300 hover:bg-gray-50"
              >
                Download failed rows
              </button>
            )}
          </div>

          {result.failed?.length > 0 && (
            <div className="border border-red-200 rounded-md max-h-64 overflow-y-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-red-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Row</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">What went wrong</th>
                  </tr>
                </thead>
                <tbody>
                  {result.failed.map((f, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-3 py-2">{f.row}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {f.data?.firstName} {f.data?.lastName}
                      </td>
                      <td className="px-3 py-2 text-red-600">
                        {f.errors?.join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkStudentUpload;