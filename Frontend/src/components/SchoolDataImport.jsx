import { useRef, useState } from "react";
import { FaDownload, FaFileImport, FaTimes, FaCopy, FaCheck } from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import api from "../config/axios";
import LoadingSpinner from "./LoadingSpinner";

/* ── Field mapping: sample headers → backend field keys ─────────────────── */
const TEACHER_FIELDS = [
  { key: "fullName", aliases: ["full name", "fullname", "name"] },
  { key: "email", aliases: ["email"] },
  { key: "phone", aliases: ["phone", "mobile"] },
  { key: "gender", aliases: ["gender"] },
  { key: "dob", aliases: ["dob"] },
  { key: "qualification", aliases: ["qualification"] },
  { key: "designation", aliases: ["designation"] },
  { key: "username", aliases: ["username"] },
  { key: "password", aliases: ["password"] },
];

const STAFF_FIELDS = [
  { key: "fullName", aliases: ["full name", "fullname", "name"] },
  { key: "email", aliases: ["email"] },
  { key: "phone", aliases: ["phone", "mobile"] },
  { key: "gender", aliases: ["gender"] },
  { key: "staffRole", aliases: ["staff role", "staffrole", "role"] },
  { key: "username", aliases: ["username"] },
  { key: "password", aliases: ["password"] },
];

const STUDENT_FIELDS = [
  { key: "firstName", aliases: ["first name", "firstname"] },
  { key: "lastName", aliases: ["last name", "lastname"] },
  { key: "gender", aliases: ["gender"] },
  { key: "dob", aliases: ["dob"] },
  { key: "fatherName", aliases: ["father name", "fathername"] },
  { key: "fatherMobile", aliases: ["father mobile", "fathermobile", "mobile"] },
  { key: "motherName", aliases: ["mother name", "mothername"] },
  { key: "address", aliases: ["address"] },
];

/* ── Sample Excel workbook ──────────────────────────────────────────────── */
const TEACHER_HEADERS = [
  "Full Name",
  "Email",
  "Phone",
  "Gender",
  "DOB",
  "Qualification",
  "Designation",
  "Username",
  "Password",
];
const STAFF_HEADERS = [
  "Full Name",
  "Email",
  "Phone",
  "Gender",
  "Staff Role",
  "Username",
  "Password",
];
const STUDENT_HEADERS = [
  "First Name",
  "Last Name",
  "Gender",
  "DOB",
  "Father Name",
  "Father Mobile",
  "Mother Name",
  "Address",
];

const buildSampleSheet = (sheetName, headers, rows) => {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 2, 16) }));
  return ws;
};

const buildSampleWorkbook = () => {
  const wb = XLSX.utils.book_new();
  const instructions = [
    ["How to import data"],
    [""],
    [
      "Fill the Teachers, Staff and Students sheets below. Keep the header row exactly as shown.",
    ],
    ["One row per person. Rows with empty required fields are skipped and listed as failed."],
    ["Leave Username / Password blank to auto-generate them."],
    ["DOB must be in YYYY-MM-DD format."],
    ["Staff Role values: principal, administrator, librarian, teacher, accountant,"],
    ["  receptionist, counselor, security_guard, hostel_warden, other."],
    ["Parent login = child's Father Mobile; the auto password is shown after import."],
    [""],
    ["This workbook is only a guide — the uploaded file just needs the same columns."],
  ];
  const wsInstr = XLSX.utils.aoa_to_sheet(instructions);
  wsInstr["!cols"] = [{ wch: 110 }];
  XLSX.utils.book_append_sheet(wb, wsInstr, "Instructions");

  XLSX.utils.book_append_sheet(
    wb,
    buildSampleSheet("Teachers", TEACHER_HEADERS, [
      ["Ravi Kumar", "ravi.kumar@bca.edu", "9876543210", "Male", "1990-05-12", "M.Sc Mathematics", "Senior Teacher", "ravi.kumar", "School@123"],
      ["Meena Joshi", "meena.joshi@bca.edu", "9876543211", "Female", "1992-11-03", "B.Ed", "", "", ""],
    ]),
    "Teachers",
  );

  XLSX.utils.book_append_sheet(
    wb,
    buildSampleSheet("Staff", STAFF_HEADERS, [
      ["Sunil Verma", "sunil@bca.edu", "9876512345", "Male", "librarian", "", ""],
      ["Asha Rani", "asha@bca.edu", "9876512346", "Female", "accountant", "", ""],
    ]),
    "Staff",
  );

  XLSX.utils.book_append_sheet(
    wb,
    buildSampleSheet("Students", STUDENT_HEADERS, [
      ["Aarav", "Sharma", "Male", "2012-04-10", "Rajesh Sharma", "9876500001", "Priya Sharma", "14, MG Road, Indore"],
      ["Anaya", "Verma", "Female", "2012-08-21", "Rakesh Verma", "9876500002", "Sunita Verma", "22, Station Road, Indore"],
    ]),
    "Students",
  );

  return wb;
};

/* ── Sheet parser ───────────────────────────────────────────────────────── */
const asStr = (v) =>
  v === undefined || v === null ? "" : typeof v === "string" ? v.trim() : String(v);

const parseSheet = (sheetName, fields, wb) => {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: "",
    raw: false,
  });
  if (!rows.length) return [];

  const headerRow = rows[0];
  const idx = {};
  headerRow.forEach((h, i) => {
    const norm = asStr(h).toLowerCase().replace(/\s+/g, " ");
    const f = fields.find((x) => x.aliases.includes(norm));
    if (f && idx[f.key] === undefined) idx[f.key] = i;
  });

  return rows
    .slice(1)
    .filter((r) => Array.isArray(r) && r.some((c) => asStr(c) !== ""))
    .map((r) => {
      const o = {};
      Object.keys(idx).forEach((k) => {
        o[k] = asStr(r[idx[k]]);
      });
      return o;
    });
};

/* ── Component ──────────────────────────────────────────────────────────── */
export default function SchoolDataImport({ school, onClose, onDone }) {
  const [step, setStep] = useState("idle"); // idle | ready | importing | done
  const [filePickerKey, setFilePickerKey] = useState(0);
  const [teachers, setTeachers] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [students, setStudents] = useState([]);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef(null);

  const handleSample = () => {
    const wb = buildSampleWorkbook();
    XLSX.writeFile(
      wb,
      `import-template-${(school?.school_name || "school")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}.xlsx`,
    );
    toast.success("Sample Excel downloaded");
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const t = parseSheet("Teachers", TEACHER_FIELDS, wb);
      const s = parseSheet("Staff", STAFF_FIELDS, wb);
      const st = parseSheet("Students", STUDENT_FIELDS, wb);
      if (!t.length && !s.length && !st.length) {
        toast.error(
          "No data found. Please use sheets named Teachers, Staff, Students (see sample format).",
        );
        setFilePickerKey((k) => k + 1);
        return;
      }
      setTeachers(t);
      setStaffList(s);
      setStudents(st);
      setResult(null);
      setStep("ready");
    } catch {
      toast.error("Could not read this file. Please upload a valid .xlsx file.");
      setFilePickerKey((k) => k + 1);
    }
  };

  const handleImport = async () => {
    setStep("importing");
    try {
      const res = await api.post(`/schools/${school._id}/import`, {
        teachers,
        staffList,
        students,
      });
      setResult(res.data);
      setStep("done");
      toast.success(res.data.message || "Import completed");
    } catch (err) {
      toast.error(err.response?.data?.message || "Import failed");
      setStep("ready");
    }
  };

  const handleCopy = async () => {
    const lines = (result?.credentials || []).map(
      (c) => `${c.type} | ${c.name} | ${c.username} | ${c.password}`,
    );
    const text = lines.join("\n");
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  };

  const counts = {
    Teachers: teachers.length,
    Staff: staffList.length,
    Students: students.length,
  };

  const totalRows = teachers.length + staffList.length + students.length;
  const totalCreated = result
    ? result.summary.teachers.created +
      result.summary.staff.created +
      result.summary.students.created
    : 0;
  const failed = result
    ? result.summary.teachers.failed.length +
      result.summary.staff.failed.length +
      result.summary.students.failed.length
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[90] p-4">
      <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-2xl
        shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* header */}
        <div className="px-6 py-4 border-b border-[rgb(var(--border))] flex items-start justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold">
              Import Data — {school?.school_name || "School"}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Upload teachers, staff and students from an Excel file
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
            title="Close"
          >
            <FaTimes />
          </button>
        </div>

        {/* body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {step === "idle" && (
            <div className="space-y-5">
              <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center">
                <FaFileImport className="mx-auto text-3xl text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">
                  Need the correct format? Download the sample Excel first, fill
                  it in, then upload.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleSample}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5
                    rounded-lg border border-[rgb(var(--primary))] text-[rgb(var(--primary))]
                    text-sm font-medium hover:opacity-90 transition"
                >
                  <FaDownload />
                  Download Sample Excel
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5
                    rounded-lg bg-[rgb(var(--primary))] text-white text-sm font-medium
                    shadow-sm hover:opacity-90 transition"
                >
                  <FaFileImport />
                  Upload Excel & Import
                </button>
              </div>

              <p className="text-xs text-gray-400 text-center">
                Sheets expected: <b>Teachers</b>, <b>Staff</b>, <b>Students</b>.
                Leave Username / Password blank to auto-generate.
              </p>
            </div>
          )}

          {step === "ready" && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-medium text-green-700 mb-2">
                  File parsed — ready to import
                </p>
                <div className="flex flex-wrap gap-3 text-sm">
                  {Object.entries(counts).map(([k, v]) => (
                    <span
                      key={k}
                      className="bg-white rounded-md px-2.5 py-1 border border-green-200 text-green-700"
                    >
                      {k}: <b>{v}</b>
                    </span>
                  ))}
                  <span className="bg-white rounded-md px-2.5 py-1 border border-green-200 text-green-700">
                    Total: <b>{totalRows}</b>
                  </span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 transition"
                >
                  Choose Another File
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-[rgb(var(--primary))] text-white
                    text-sm font-medium shadow-sm hover:opacity-90 transition"
                >
                  Start Import
                </button>
              </div>
            </div>
          )}

          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <LoadingSpinner size="md" label="" inline />
              <p className="text-sm text-gray-400">Importing data…</p>
            </div>
          )}

          {step === "done" && result && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="rounded-md px-2.5 py-1 border border-green-200 bg-green-50 text-green-700">
                  Created: <b>{totalCreated}</b>
                </span>
                <span className="rounded-md px-2.5 py-1 border border-yellow-200 bg-yellow-50 text-yellow-700">
                  Failed: <b>{failed}</b>
                </span>
              </div>

              {(result.credentials || []).length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold">
                      Generated Login Credentials
                    </p>
                    <button
                      type="button"
                      onClick={handleCopy}
                      disabled={copied}
                      className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                        border border-gray-300 hover:bg-gray-50 transition"
                    >
                      {copied ? <FaCheck className="text-green-500" /> : <FaCopy />}
                      {copied ? "Copied" : "Copy All"}
                    </button>
                  </div>
                  <div className="overflow-y-auto max-h-64 rounded-xl border border-[rgb(var(--border))]">
                    <table className="w-full text-xs">
                      <thead className="bg-[rgb(var(--surface))] border-b border-[rgb(var(--border))] sticky top-0">
                        <tr>
                          <th className="p-2.5 text-left">Type</th>
                          <th className="p-2.5 text-left">Name</th>
                          <th className="p-2.5 text-left">Username</th>
                          <th className="p-2.5 text-left">Password</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.credentials.map((c, i) => (
                          <tr
                            key={`${c.type}-${c.username}-${i}`}
                            className="border-t border-[rgb(var(--border))]"
                          >
                            <td className="p-2.5">
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-medium
                                  bg-indigo-100 text-indigo-600"
                              >
                                {c.type}
                              </span>
                            </td>
                            <td className="p-2.5">{c.name}</td>
                            <td className="p-2.5 font-mono">{c.username}</td>
                            <td className="p-2.5 font-mono">{c.password}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {failed > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 max-h-40 overflow-y-auto text-xs text-yellow-700">
                  {[
                    ...result.summary.teachers.failed.map((f) => ({
                      k: "Teacher",
                      ...f,
                    })),
                    ...result.summary.staff.failed.map((f) => ({
                      k: "Staff",
                      ...f,
                    })),
                    ...result.summary.students.failed.map((f) => ({
                      k: "Student",
                      ...f,
                    })),
                  ].map((f, i) => (
                    <p key={i} className="py-0.5">
                      <b>
                        {f.k} (row {f.row}):</b> {f.reason}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-[rgb(var(--border))] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm transition hover:bg-gray-50"
          >
            {step === "done" ? "Close" : "Skip for Now"}
          </button>
          {step === "done" && (
            <button
              type="button"
              onClick={onDone}
              className="px-5 py-2 bg-[rgb(var(--primary))] text-white rounded-lg text-sm
                font-medium shadow-sm hover:opacity-90 transition"
            >
              Done
            </button>
          )}
        </div>

        <input
          ref={fileRef}
          key={filePickerKey}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFile}
          className="hidden"
        />
      </div>
    </div>
  );
}