import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import {
  FiChevronDown,
  FiEdit2,
  FiFileText,
  FiPrinter,
  FiRefreshCw,
  FiSearch,
  FiX,
} from "react-icons/fi";
import MessageButton from "../components/MessageButton";
import UserAvatar from "../components/UserAvatar";
import Pagination from "../components/Pagination";

const API = import.meta.env.VITE_API_URL;

const CATEGORY_OPTIONS = ["General", "OBC", "SC", "ST", "EWS", "Minority"];

const EMPTY_CHIPS = { enrollType: "", facility: "", feeDue: false };

const EMPTY_STATS = {
  total: 0,
  active: 0,
  inactive: 0,
  old: 0,
  new: 0,
  male: 0,
  female: 0,
  boarding: 0,
  transport: 0,
  feeDue: 0,
  confirmed: 0,
  notConfirmed: 0,
};

const REPORT_ITEMS = ["Custom Report"];

const CERTIFICATE_ITEMS = [
  "Character Certificate",
  "DOB / Study Certificate",
  "Fee Structure Certificate",
  "Transfer Certificate",
];

const TC_ITEMS = [
  "Generate TC",
  "TC/ Refund Requests",
  "Tc Summary Report",
  "Generated Tc Report",
];

const INACTIVE_ITEMS = ["Make Student Inactive", "Inactive Student Report"];

const ACADEMIC_ITEMS = [
  "Change Status",
  "Change Class",
  "Change Section",
  "Change Course Duration",
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const fullName = (s = {}) =>
  [s.firstName, s.lastName].filter(Boolean).join(" ").trim() || "Unnamed Student";

const initialsOf = (s = {}) => {
  const words = fullName(s).split(/\s+/).filter(Boolean);
  return (words[0]?.[0] || "?") + (words[1]?.[0] || "");
};

const fmtDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const fmtAadhaar = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 12) return value || "—";
  return digits.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3");
};

const money = (value) => {
  const n = Number(value || 0);
  return `₹${n.toLocaleString("en-IN")}`;
};

const isConfirmed = (s = {}) => s.confirmationStatus !== "Non-Confirmed";

const convStatusLabel = (s = {}) => (isConfirmed(s) ? "Confirmed" : "Not Confirmed");

const enrollOf = (s = {}) => (s.feeBatch === "Old" ? "P" : "N");

const facilityOf = (s = {}) => {
  if (s.isBoarding) return "Boarding";
  if (s.transport) return "Transport";
  return "Day Scholar";
};

const feeStatusOf = (s = {}) => (Number(s.totalDue || 0) > 0 ? "Fee Due" : "Paid");

const classLabel = (s = {}) => {
  const cls = s.classId?.name || s.classId?.className || "—";
  const sec = s.sectionId?.name || s.sectionId?.sectionName || "";
  return sec ? `${cls} ${sec}` : cls;
};

/* ------------------------------------------------------------------ */
/* Custom report field registry                                         */
/* ------------------------------------------------------------------ */

const yn = (v) => (v ? "Yes" : "No");

const STATIC_REPORT_FIELDS = [
  // Student
  { key: "fullName", label: "Student Name", group: "Student", get: (s) => fullName(s) },
  { key: "studentId", label: "Adm No", group: "Student", get: (s) => s.studentId || "" },
  { key: "confirmationStatus", label: "Adm. Status", group: "Student", get: (s) => convStatusLabel(s) },
  { key: "admissionDate", label: "Adm. Date", group: "Student", get: (s) => fmtDate(s.admissionDate) },
  { key: "srNo", label: "SR No", group: "Student", get: (s) => s.srNo || "" },
  { key: "rollNo", label: "Roll No", group: "Student", get: (s) => s.rollNo || "" },
  { key: "gender", label: "Gender", group: "Student", get: (s) => s.gender || "" },
  { key: "dob", label: "Date of Birth", group: "Student", get: (s) => fmtDate(s.dob) },
  { key: "bloodGroup", label: "Blood Group", group: "Student", get: (s) => s.bloodGroup || "" },
  { key: "nationality", label: "Nationality", group: "Student", get: (s) => s.nationality || "" },
  { key: "placeOfBirth", label: "Place of Birth", group: "Student", get: (s) => s.placeOfBirth || "" },
  { key: "caste", label: "Caste", group: "Student", get: (s) => s.caste || "" },
  { key: "category", label: "Category", group: "Student", get: (s) => s.category || "" },
  { key: "community", label: "Community", group: "Student", get: (s) => s.community || "" },
  { key: "religion", label: "Religion", group: "Student", get: (s) => s.religion || "" },
  { key: "aadhaarNumber", label: "Aadhaar", group: "Student", get: (s) => fmtAadhaar(s.aadhaarNumber) },
  { key: "penNumber", label: "PEN Number", group: "Student", get: (s) => s.penNumber || "" },
  { key: "apaarId", label: "APAAR ID", group: "Student", get: (s) => s.apaarId || "" },
  { key: "nicNumber", label: "NIC Number", group: "Student", get: (s) => s.nicNumber || "" },
  { key: "isSpecialChild", label: "Special Child", group: "Student", get: (s) => yn(s.isSpecialChild) },
  { key: "isEws", label: "EWS", group: "Student", get: (s) => yn(s.isEws) },
  { key: "isPhysicallyDisabled", label: "Physically Disabled", group: "Student", get: (s) => yn(s.isPhysicallyDisabled) },
  { key: "medicalConditionRemarks", label: "Medical Remarks", group: "Student", get: (s) => s.medicalConditionRemarks || "" },
  { key: "admissionNotes", label: "Notes", group: "Student", get: (s) => s.admissionNotes || "" },
  { key: "isActive", label: "Status", group: "Student", get: (s) => (s.isActive !== false ? "Active" : "Inactive") },
  { key: "admissionSource", label: "Source", group: "Student", get: (s) => s.admissionSource || "" },
  { key: "feeBatch", label: "Enrollment", group: "Student", get: (s) => (enrollOf(s) === "N" ? "New" : "Promoted") },
  { key: "studentType", label: "Student Type", group: "Student", get: (s) => s.studentType || "" },
  { key: "academicYear", label: "Academic Year", group: "Student", get: (s) => s.academicYear || "" },
  { key: "createdAt", label: "Created At", group: "Student", get: (s) => fmtDate(s.createdAt) },
  { key: "updatedAt", label: "Updated At", group: "Student", get: (s) => fmtDate(s.updatedAt) },
  // Class & Academic
  { key: "className", label: "Class", group: "Class & Academic", get: (s) => classLabel(s) },
  { key: "classOnly", label: "Class Name", group: "Class & Academic", get: (s) => s.classId?.name || s.classId?.className || "" },
  { key: "sectionName", label: "Section", group: "Class & Academic", get: (s) => s.sectionId?.name || s.sectionId?.sectionName || "" },
  { key: "stream", label: "Stream", group: "Class & Academic", get: (s) => s.stream || s.streamId?.name || s.streamId?.streamName || "" },
  { key: "house", label: "House", group: "Class & Academic", get: (s) => s.houseId?.name || s.houseId?.code || "" },
  { key: "optionalSubjects", label: "Optional Subjects", group: "Class & Academic", get: (s) => (s.optionalSubjectIds || []).map((x) => x?.name || x).join(", ") },
  // Parent & Guardian
  { key: "fatherName", label: "Father's Name", group: "Parent & Guardian", get: (s) => s.fatherName || "" },
  { key: "fatherMobile", label: "Father Mobile", group: "Parent & Guardian", get: (s) => s.fatherMobile || "" },
  { key: "fatherEmail", label: "Father Email", group: "Parent & Guardian", get: (s) => s.fatherEmail || "" },
  { key: "motherName", label: "Mother's Name", group: "Parent & Guardian", get: (s) => s.motherName || "" },
  { key: "motherMobile", label: "Mother Mobile", group: "Parent & Guardian", get: (s) => s.motherMobile || "" },
  { key: "motherEmail", label: "Mother Email", group: "Parent & Guardian", get: (s) => s.motherEmail || "" },
  { key: "guardianName", label: "Guardian Name", group: "Parent & Guardian", get: (s) => s.guardianName || "" },
  { key: "guardianMobile", label: "Guardian Mobile", group: "Parent & Guardian", get: (s) => s.guardianMobile || "" },
  { key: "guardianRelation", label: "Guardian Relation", group: "Parent & Guardian", get: (s) => s.guardianRelation || "" },
  { key: "guardianEmail", label: "Guardian Email", group: "Parent & Guardian", get: (s) => s.guardianEmail || "" },
  { key: "relative", label: "Relative", group: "Parent & Guardian", get: (s) => s.relative || "" },
  // Contact & Address
  { key: "address", label: "Address", group: "Contact & Address", get: (s) => s.address || "" },
  { key: "city", label: "City", group: "Contact & Address", get: (s) => s.city || "" },
  { key: "district", label: "District", group: "Contact & Address", get: (s) => s.district || "" },
  { key: "state", label: "State", group: "Contact & Address", get: (s) => s.state || "" },
  { key: "pincode", label: "Pincode", group: "Contact & Address", get: (s) => s.pincode || "" },
  // Previous School
  { key: "previousSchoolName", label: "Previous School Name", group: "Previous School", get: (s) => s.previousSchoolName || "" },
  { key: "previousSchoolClass", label: "Previous School Class", group: "Previous School", get: (s) => s.previousSchoolClass || "" },
  { key: "previousSchoolResult", label: "Previous School Result", group: "Previous School", get: (s) => s.previousSchoolResult || "" },
  { key: "previousSchoolTcNumber", label: "Previous School TC No.", group: "Previous School", get: (s) => s.previousSchoolTcNumber || "" },
  { key: "previousSchoolUdise", label: "Previous School UDISE", group: "Previous School", get: (s) => s.previousSchoolUdise || "" },
  { key: "schoolLeavingDate", label: "School Leaving Date", group: "Previous School", get: (s) => fmtDate(s.schoolLeavingDate) },
  { key: "prevSchoolAddress", label: "Previous School Address", group: "Previous School", get: (s) => s.prevSchoolAddress || "" },
  // Transport & Hostel
  { key: "facility", label: "Facility", group: "Transport & Hostel", get: (s) => facilityOf(s) },
  { key: "isBoarding", label: "Boarding", group: "Transport & Hostel", get: (s) => yn(s.isBoarding) },
  { key: "transportRoute", label: "Transport Route", group: "Transport & Hostel", get: (s) => s.transport?.name || s.transport?.routeId || "" },
  { key: "busFeeFrequency", label: "Bus Fee Frequency", group: "Transport & Hostel", get: (s) => s.busFeeFrequency || "" },
  { key: "busFeeQuarter", label: "Bus Fee Quarter", group: "Transport & Hostel", get: (s) => s.busFeeQuarter || "" },
  // Fees
  { key: "totalFee", label: "Total Fee", group: "Fees", get: (s) => Number(s.totalFee || 0) },
  { key: "discountType", label: "Discount Type", group: "Fees", get: (s) => s.discountType || "" },
  { key: "discountValue", label: "Discount Value", group: "Fees", get: (s) => Number(s.discountValue || 0) },
  { key: "finalFee", label: "Final Fee", group: "Fees", get: (s) => Number(s.finalFee || 0) },
  { key: "totalPaid", label: "Total Paid", group: "Fees", get: (s) => Number(s.totalPaid || 0) },
  { key: "totalDue", label: "Total Due", group: "Fees", get: (s) => Number(s.totalDue || 0) },
  { key: "feeFrequency", label: "Fee Frequency", group: "Fees", get: (s) => s.feeFrequency || "" },
  { key: "feeStatus", label: "Fee Status", group: "Fees", get: (s) => feeStatusOf(s) },
  { key: "selectedOptionalFees", label: "Selected Optional Fees", group: "Fees", get: (s) => (s.selectedOptionalFees || []).join(", ") },
  // Other
  { key: "idCardIssuedAt", label: "ID Card Issued", group: "Other", get: (s) => fmtDate(s.idCardIssuedAt) },
  { key: "houseIdRaw", label: "House ID", group: "Other", get: (s) => s.houseId?._id || s.houseId || "" },
];

const buildReportFields = (students) => {
  const fields = [...STATIC_REPORT_FIELDS];
  const customKeys = new Map();
  (students || []).forEach((s) => {
    (s.customFields || []).forEach((cf) => {
      if (cf?.key && !customKeys.has(cf.key)) customKeys.set(cf.key, cf.label || cf.key);
    });
  });
  customKeys.forEach((label, key) => {
    fields.push({
      key: `cf:${key}`,
      label,
      group: "Custom Fields",
      get: (s) => (s.customFields || []).find((c) => c.key === key)?.value || "",
    });
  });
  return fields;
};

const REPORT_FIELD_GROUPS = [
  "Student",
  "Class & Academic",
  "Parent & Guardian",
  "Contact & Address",
  "Previous School",
  "Transport & Hostel",
  "Fees",
  "Other",
  "Custom Fields",
];

const copyValue = async (value, label) => {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(String(value));
    toast.success(`${label} copied`);
  } catch {
    toast.error("Copy failed");
  }
};

const printHtml = (html) => {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);

  const frameWindow = frame.contentWindow;
  if (!frameWindow) {
    frame.remove();
    toast.error("Could not prepare the print view.");
    return;
  }

  frameWindow.document.open();
  frameWindow.document.write(html);
  frameWindow.document.close();

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    frame.remove();
  };
  frameWindow.addEventListener("afterprint", cleanup);
  frameWindow.focus();
  frameWindow.print();
  setTimeout(cleanup, 60000);
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/* ------------------------------------------------------------------ */
/* KPI artwork                                                         */
/* ------------------------------------------------------------------ */

const KPI_ART = {
  active: (
    <svg className="w-12 h-12" viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="20" r="11" fill="#d1fae5" stroke="#10b981" strokeWidth="2.2" />
      <path d="M22 18c2-5 18-5 20 0" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 56c1-12 10-18 18-18s17 6 18 18H14z" fill="#a7f3d0" stroke="#10b981" strokeWidth="2.2" strokeLinejoin="round" />
      <rect x="36" y="47" width="7" height="4" rx="1" fill="#ffffff" stroke="#10b981" strokeWidth="1.5" />
    </svg>
  ),
  inactive: (
    <svg className="w-12 h-12" viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="20" r="11" fill="#ffe4e6" stroke="#f43f5e" strokeWidth="2.2" />
      <path d="M22 18c2-5 18-5 20 0" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 56c1-12 10-18 18-18s17 6 18 18H14z" fill="#fecdd3" stroke="#f43f5e" strokeWidth="2.2" strokeLinejoin="round" />
      <rect x="36" y="47" width="7" height="4" rx="1" fill="#ffffff" stroke="#f43f5e" strokeWidth="1.5" />
    </svg>
  ),
  old: (
    <svg className="w-14 h-12" viewBox="0 0 68 58" fill="none">
      <g transform="rotate(-32 34 29)">
        <path d="M10 18h34l12 11-12 11H10a4 4 0 0 1-4-4V22a4 4 0 0 1 4-4z" fill="#fef3c7" stroke="#d97706" strokeWidth="2.4" />
        <circle cx="46" cy="29" r="2.5" fill="#d97706" />
        <text x="16" y="33" fill="#b45309" fontSize="11" fontWeight="800" fontFamily="Inter, sans-serif">OLD</text>
      </g>
    </svg>
  ),
  new: (
    <svg className="w-14 h-12" viewBox="0 0 68 58" fill="none">
      <g transform="rotate(-32 34 29)">
        <path d="M10 18h34l12 11-12 11H10a4 4 0 0 1-4-4V22a4 4 0 0 1 4-4z" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2.4" />
        <circle cx="46" cy="29" r="2.5" fill="#0284c7" />
        <text x="14" y="33" fill="#0369a1" fontSize="10.5" fontWeight="800" fontFamily="Inter, sans-serif">NEW</text>
      </g>
    </svg>
  ),
  male: (
    <svg className="w-12 h-12" viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="20" r="11" fill="#dbeafe" stroke="#2563eb" strokeWidth="2.2" />
      <path d="M14 56c1-12 10-18 18-18s17 6 18 18H14z" fill="#bfdbfe" stroke="#2563eb" strokeWidth="2.2" strokeLinejoin="round" />
      <rect x="36" y="47" width="7" height="4" rx="1" fill="#ffffff" stroke="#2563eb" strokeWidth="1.5" />
    </svg>
  ),
  female: (
    <svg className="w-12 h-12" viewBox="0 0 64 64" fill="none">
      <path d="M20 26c0-9 5-16 12-16s12 7 12 16c0 4-1 8-3 10H23c-2-2-3-6-3-10z" fill="#bfdbfe" stroke="#2563eb" strokeWidth="2" />
      <circle cx="32" cy="21" r="9.5" fill="#dbeafe" stroke="#2563eb" strokeWidth="2.2" />
      <path d="M15 56c1.5-11 9.5-17 17-17s15.5 6 17 17H15z" fill="#93c5fd" stroke="#2563eb" strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  ),
  boarding: (
    <svg className="w-14 h-12" viewBox="0 0 64 60" fill="none">
      <path d="M8 24L32 8l24 16" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 22v32h38V22" stroke="#0f172a" strokeWidth="2.6" strokeLinecap="round" />
      <line x1="20" y1="28" x2="20" y2="52" stroke="#0f172a" strokeWidth="2.5" />
      <line x1="44" y1="28" x2="44" y2="52" stroke="#0f172a" strokeWidth="2.5" />
      <rect x="22" y="32" width="20" height="5" rx="1" fill="#0284c7" />
      <rect x="22" y="43" width="20" height="5" rx="1" fill="#0284c7" />
    </svg>
  ),
  transport: (
    <svg className="w-14 h-11" viewBox="0 0 68 48" fill="none">
      <path d="M8 28l6-11c1.2-2 3.2-3.2 5.5-3.2h24c2.5 0 4.7 1.3 5.8 3.5L54 26l6 2c1.8.6 3 2.2 3 4v5a2 2 0 0 1-2 2h-5" stroke="#0284c7" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 28v9a2 2 0 0 0 2 2h6m12 0h18" stroke="#0284c7" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="22" cy="39" r="5" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2.4" />
      <circle cx="50" cy="39" r="5" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2.4" />
    </svg>
  ),
};

const KpiCompartment = ({ label, value, art, highlight, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`sd-kpi ${highlight ? "active-filter" : ""}`}
  >
    <span className="sd-kpi-label">{label}</span>
    <span className="sd-kpi-number">{value}</span>
    <span className="sd-kpi-art">{KPI_ART[art]}</span>
  </button>
);

const KpiCard = ({ color, top, bottom }) => (
  <div
    className="bg-white rounded-md border border-slate-200 border-b-[3px] shadow-2xs overflow-hidden divide-y divide-slate-200/80"
    style={{ borderBottomColor: color }}
  >
    <KpiCompartment {...top} />
    <KpiCompartment {...bottom} />
  </div>
);

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const Students = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });

  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Active");
  const [admStatus, setAdmStatus] = useState("All");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [gender, setGender] = useState("");
  const [category, setCategory] = useState("");
  const [chips, setChips] = useState(EMPTY_CHIPS);
  const [sort, setSort] = useState({ field: "createdAt", asc: false });

  const [openNav, setOpenNav] = useState(null);
  const [rowMenu, setRowMenu] = useState(null);
  const [drawerStudent, setDrawerStudent] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState("");

  const [notesFor, setNotesFor] = useState(null);
  const [notesText, setNotesText] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const [erpModal, setErpModal] = useState(null);

  const [progOpen, setProgOpen] = useState(false);
  const [progMode, setProgMode] = useState("Promote");
  const [progSourceSession, setProgSourceSession] = useState("");
  const [progSourceClass, setProgSourceClass] = useState("");
  const [progSourceSearch, setProgSourceSearch] = useState("");
  const [progSourceStudents, setProgSourceStudents] = useState([]);
  const [progSourceLoading, setProgSourceLoading] = useState(false);
  const [progSelectedIds, setProgSelectedIds] = useState(new Set());
  const [progTargetSession, setProgTargetSession] = useState("");
  const [progTargetClass, setProgTargetClass] = useState("");
  const [progAssignSection, setProgAssignSection] = useState("");
  const [progDemoteReason, setProgDemoteReason] = useState("");
  const [progSortField, setProgSortField] = useState("admNo");
  const [progSortAsc, setProgSortAsc] = useState(true);
  const [progRunning, setProgRunning] = useState(false);

  /* ---------------- custom report ---------------- */
  const [reportOpen, setReportOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportStudents, setReportStudents] = useState([]);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [reportHasGenerated, setReportHasGenerated] = useState(false);
  const [reportSelected, setReportSelected] = useState(new Set());

  const reportFields = useMemo(() => buildReportFields(reportStudents), [reportStudents]);

  /* ---------------- data loading ---------------- */

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/students/stats`, {
        withCredentials: true,
      });
      setStats({ ...EMPTY_STATS, ...(res.data?.data || {}) });
    } catch {
      toast.error("Failed to load student stats");
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params = { page, limit, status: status || "Active" };
      if (search) params.search = search;
      if (classId) params.classId = classId;
      if (sectionId) params.sectionId = sectionId;
      if (gender) params.gender = gender;
      if (category) params.category = category;
      if (admStatus !== "All") params.confirmationStatus = admStatus;
      if (chips.enrollType) params.feeBatch = chips.enrollType;
      if (chips.facility) params.facility = chips.facility;
      if (chips.feeDue) params.feeDue = "due";
      if (sort.field && sort.field !== "createdAt") {
        params.sort = `${sort.asc ? "" : "-"}${sort.field}`;
      }

      const res = await axios.get(`${API}/students`, {
        params,
        withCredentials: true,
      });

      setRows(res.data.data || []);
      setPagination(
        res.data.pagination || {
          total: res.data.data?.length || 0,
          page: 1,
          totalPages: 1,
        },
      );
    } catch {
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await axios.get(`${API}/classes/all`, {
        withCredentials: true,
      });
      setClasses(res.data.classes || []);
    } catch {
      toast.error("Failed to load classes");
    }
  };

  const fetchSections = async () => {
    try {
      const res = await axios.get(`${API}/sections/all`, {
        withCredentials: true,
      });
      setSections(res.data.sections || []);
    } catch {
      /* section filter is optional */
    }
  };

  useEffect(() => {
    fetchStats();
    fetchClasses();
    fetchSections();
  }, []);

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, search, status, admStatus, classId, sectionId, gender, category, chips, sort]);

  useEffect(() => {
    if (location.state?.refresh) {
      fetchStudents();
      fetchStats();
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.refresh]);

  // Debounced quick search (both search boxes stay in sync).
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  useEffect(() => {
    const close = () => {
      setOpenNav(null);
      setRowMenu(null);
    };
    document.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, []);

  useEffect(() => {
    if (!progOpen || !progSourceClass) {
      setProgSourceStudents([]);
      return undefined;
    }
    let cancelled = false;
    setProgSourceLoading(true);
    axios
      .get(`${API}/students`, {
        params: { all: true, status: "Active", classId: progSourceClass },
        withCredentials: true,
      })
      .then((res) => {
        if (!cancelled) setProgSourceStudents(res.data.data || []);
      })
      .catch(() => {
        if (!cancelled) setProgSourceStudents([]);
      })
      .finally(() => {
        if (!cancelled) setProgSourceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [progOpen, progSourceClass]);

  /* ---------------- filters ---------------- */

  const resetAllFilters = () => {
    setSearchDraft("");
    setSearch("");
    setStatus("Active");
    setAdmStatus("All");
    setClassId("");
    setSectionId("");
    setGender("");
    setCategory("");
    setChips(EMPTY_CHIPS);
    setSort({ field: "createdAt", asc: false });
    setPage(1);
  };

  const changeStatus = (value) => {
    setStatus(value);
    setPage(1);
  };

  const toggleChip = (field, value) => {
    setChips((prev) => {
      if (field === "feeDue") return { ...prev, feeDue: !prev.feeDue };
      return { ...prev, [field]: prev[field] === value ? "" : value };
    });
    setPage(1);
  };

  const applyKpiFilter = (type, value) => {
    setPage(1);
    if (type === "status") {
      setStatus(value);
      setChips(EMPTY_CHIPS);
      setGender("");
      return;
    }
    setStatus("Active");
    if (type === "gender") {
      setChips(EMPTY_CHIPS);
      setGender(value);
      return;
    }
    setGender("");
    if (type === "enrollType") {
      setChips({ ...EMPTY_CHIPS, enrollType: value });
      return;
    }
    if (type === "facility") {
      setChips({ ...EMPTY_CHIPS, facility: value });
    }
  };

  const toggleSort = (field) => {
    setSort((prev) =>
      prev.field === field
        ? { field, asc: !prev.asc }
        : { field, asc: true },
    );
    setPage(1);
  };

  const changeFilter = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  /* ---------------- derived ---------------- */

  const selectedClassName = useMemo(
    () => classes.find((c) => c._id === classId)?.name || "",
    [classes, classId],
  );
  const selectedSectionName = useMemo(
    () => sections.find((s) => s._id === sectionId)?.name || "",
    [sections, sectionId],
  );

  const activeBadges = useMemo(() => {
    const items = [];
    if (search) {
      items.push({ key: "search", label: `Search: ${search}`, clear: () => { setSearchDraft(""); setSearch(""); } });
    }
    if (status !== "Active") {
      items.push({ key: "status", label: `Status: ${status}`, clear: () => setStatus("Active") });
    }
    if (admStatus !== "All") {
      items.push({ key: "adm", label: `Adm: ${admStatus}`, clear: () => setAdmStatus("All") });
    }
    if (selectedClassName) {
      items.push({ key: "class", label: `Class: ${selectedClassName}`, clear: () => setClassId("") });
    }
    if (selectedSectionName) {
      items.push({ key: "section", label: `Section: ${selectedSectionName}`, clear: () => setSectionId("") });
    }
    if (gender) {
      items.push({ key: "gender", label: `Gender: ${gender}`, clear: () => setGender("") });
    }
    if (category) {
      items.push({ key: "category", label: `Category: ${category}`, clear: () => setCategory("") });
    }
    if (chips.enrollType) {
      items.push({
        key: "enroll",
        label: chips.enrollType === "New" ? "New students" : "Promoted students",
        clear: () => setChips((prev) => ({ ...prev, enrollType: "" })),
      });
    }
    if (chips.facility) {
      items.push({
        key: "facility",
        label: chips.facility,
        clear: () => setChips((prev) => ({ ...prev, facility: "" })),
      });
    }
    if (chips.feeDue) {
      items.push({
        key: "feeDue",
        label: "Fee due",
        clear: () => setChips((prev) => ({ ...prev, feeDue: false })),
      });
    }
    return items;
  }, [
    search,
    status,
    admStatus,
    selectedClassName,
    selectedSectionName,
    gender,
    category,
    chips,
  ]);

  const highlightedKpi = chips.enrollType
    ? chips.enrollType === "New"
      ? "kpi-new"
      : "kpi-old"
    : chips.facility
      ? chips.facility === "Boarding"
        ? "kpi-boarding"
        : "kpi-transport"
      : gender
        ? gender === "Male"
          ? "kpi-male"
          : "kpi-female"
        : status === "Inactive"
          ? "kpi-inactive"
          : status === "Active"
            ? "kpi-active"
            : "";

  /* ---------------- actions ---------------- */

  const openStudent = (student) => {
    setRowMenu(null);
    setDrawerStudent(student);
  };

  const handleToggleActive = (student) => {
    const currentlyActive = student.isActive !== false;
    const nextActive = !currentlyActive;
    setRowMenu(null);
    setDrawerStudent(null);
    setConfirmMessage(
      nextActive
        ? `Mark “${fullName(student)}” as Active?`
        : `Mark “${fullName(student)}” as Inactive? They will be hidden from the default Active list.`,
    );
    setConfirmAction(() => () => toggleStudentActive(student, nextActive));
    setConfirmOpen(true);
  };

  const toggleStudentActive = async (student, nextActive) => {
    try {
      const data = new FormData();
      data.append("isActive", nextActive ? "true" : "false");
      await axios.put(`${API}/students/${student._id}`, data, {
        withCredentials: true,
      });
      toast.success(nextActive ? "Student marked Active" : "Student marked Inactive");
      fetchStudents();
      fetchStats();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update student status");
    }
  };

  const openNotes = (student) => {
    setRowMenu(null);
    setNotesFor(student);
    setNotesText(student.admissionNotes || "");
  };

  const saveNotes = async () => {
    if (!notesFor) return;
    setSavingNotes(true);
    try {
      const data = new FormData();
      data.append("admissionNotes", notesText);
      await axios.put(`${API}/students/${notesFor._id}`, data, {
        withCredentials: true,
      });
      setRows((prev) =>
        prev.map((r) =>
          r._id === notesFor._id ? { ...r, admissionNotes: notesText } : r,
        ),
      );
      setDrawerStudent((prev) =>
        prev && prev._id === notesFor._id ? { ...prev, admissionNotes: notesText } : prev,
      );
      toast.success("Student notes saved");
      setNotesFor(null);
    } catch {
      toast.error("Could not save notes");
    } finally {
      setSavingNotes(false);
    }
  };

  const printStudent = (student) => {
    setRowMenu(null);
    const detail = (label, value) =>
      `<tr><td class="label">${escapeHtml(label)}</td><td>${escapeHtml(value || "—")}</td></tr>`;
    printHtml(`<!DOCTYPE html>
<html><head><meta charset="utf-8" /><title>Student - ${escapeHtml(fullName(student))}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
  h1 { font-size: 20px; margin: 0 0 2px; }
  p { margin: 0 0 16px; color: #64748b; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  td { border: 1px solid #cbd5e1; padding: 7px 9px; }
  td.label { width: 32%; background: #f1f5f9; font-weight: 600; }
  @media print { body { padding: 0; } }
</style></head><body>
  <h1>${escapeHtml(fullName(student))}</h1>
  <p>Adm #${escapeHtml(student.studentId || "—")} · ${escapeHtml(classLabel(student))} · ${escapeHtml(convStatusLabel(student))}</p>
  <table>
    ${detail("Admission Date", fmtDate(student.admissionDate))}
    ${detail("SR No.", student.srNo)}
    ${detail("Roll No.", student.rollNo)}
    ${detail("Date of Birth", fmtDate(student.dob))}
    ${detail("Gender", student.gender)}
    ${detail("Aadhaar", fmtAadhaar(student.aadhaarNumber))}
    ${detail("Category", student.category)}
    ${detail("Father", student.fatherName)}
    ${detail("Father Mobile", student.fatherMobile)}
    ${detail("Mother", student.motherName)}
    ${detail("Mother Mobile", student.motherMobile)}
    ${detail("Address", student.address)}
    ${detail("Enrollment", enrollOf(student) === "N" ? "New" : "Promoted")}
    ${detail("Facility", facilityOf(student))}
    ${detail("Fee Status", feeStatusOf(student))}
    ${detail("Total Due", money(student.totalDue))}
  </table>
</body></html>`);
  };

  const handleNavItem = (group, item) => {
    setOpenNav(null);
    if (group === "Report") {
      if (item === "Custom Report") {
        setReportOpen(true);
        setReportGenerated(false);
      }
      return;
    }
    if (group === "Certificates" || group === "TC") {
      navigate("/school/certificates");
      return;
    }
    if (group === "Inactive") {
      if (item === "Make Student Inactive") {
        setStatus("Inactive");
        setPage(1);
        toast.info("Showing inactive students — use the row menu to reactivate a student.");
      } else {
        setStatus("Inactive");
        setPage(1);
      }
      return;
    }
    if (group === "Change Academics") {
      if (item === "Change Status") {
        setStatus(status === "Active" ? "Inactive" : "Active");
        setPage(1);
        toast.info(`Directory switched to ${status === "Active" ? "Inactive" : "Active"} students.`);
        return;
      }
      setErpModal({ category: group, title: item });
      return;
    }
    setErpModal({ category: group, title: item });
  };

  const executeStudentProgression = async () => {
    const selected = progSourceStudents.filter((s) =>
      progSelectedIds.has(s._id),
    );
    if (!selected.length) {
      toast.error("Select at least one student");
      return;
    }
    let targetClassId = progTargetClass;
    if (progMode === "Repeat") targetClassId = progSourceClass;
    if (progMode === "Demote" && !targetClassId) {
      toast.error("Choose the target class to restore to");
      return;
    }
    if (progMode === "Promote" && !targetClassId) {
      toast.error("Choose the target class");
      return;
    }
    if (progMode === "Demote" && !progDemoteReason.trim()) {
      toast.error("Reason for demotion is required");
      return;
    }
    setProgRunning(true);
    try {
      let ok = 0;
      let failed = 0;
      for (const student of selected) {
        const data = new FormData();
        data.append("classId", targetClassId);
        if (progAssignSection) data.append("sectionId", progAssignSection);
        data.append("feeBatch", progMode === "Promote" ? "Old" : "Old");
        try {
          await axios.put(`${API}/students/${student._id}`, data, {
            withCredentials: true,
          });
          ok += 1;
        } catch {
          failed += 1;
        }
      }
      toast.success(
        `${progMode}ed ${ok} student(s)${failed ? ` · ${failed} failed` : ""}`,
      );
      setProgSelectedIds(new Set());
      fetchStudents();
      fetchStats();
    } catch {
      toast.error("Student progression failed");
    } finally {
      setProgRunning(false);
    }
  };

  const toggleProgStudent = (id) => {
    setProgSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleProgSelectAll = (checked) => {
    if (checked) {
      setProgSelectedIds(new Set(progSourceStudents.map((s) => s._id)));
    } else {
      setProgSelectedIds(new Set());
    }
  };

  /* ---------------- exports ---------------- */

  const buildExportRows = (list) =>
    list.map((s, index) => ({
      "S.No": index + 1,
      "Student Name": fullName(s),
      "Adm. Status": convStatusLabel(s),
      "Adm No": s.studentId || "",
      "Adm. Date": fmtDate(s.admissionDate),
      "SR No": s.srNo || "",
      "Class": classLabel(s),
      DOB: fmtDate(s.dob),
      Aadhaar: fmtAadhaar(s.aadhaarNumber),
      Father: s.fatherName || "",
      Mother: s.motherName || "",
      "Father No.": s.fatherMobile || "",
      "Mother No.": s.motherMobile || "",
      Gender: s.gender || "",
      Category: s.category || "",
      Enrollment: enrollOf(s) === "N" ? "New" : "Promoted",
      Facility: facilityOf(s),
      "Fee Status": feeStatusOf(s),
      "Total Due": Number(s.totalDue || 0),
    }));

  const fetchExportRows = async () => {
    const params = { all: true, status: status || "Active" };
    if (search) params.search = search;
    if (classId) params.classId = classId;
    if (sectionId) params.sectionId = sectionId;
    if (gender) params.gender = gender;
    if (category) params.category = category;
    if (admStatus !== "All") params.confirmationStatus = admStatus;
    if (chips.enrollType) params.feeBatch = chips.enrollType;
    if (chips.facility) params.facility = chips.facility;
    if (chips.feeDue) params.feeDue = "due";
    if (sort.field && sort.field !== "createdAt") {
      params.sort = `${sort.asc ? "" : "-"}${sort.field}`;
    }

    try {
      const res = await axios.get(`${API}/students`, {
        params,
        withCredentials: true,
      });
      return buildExportRows(res.data.data || []);
    } catch {
      toast.error("Failed to fetch students for export");
      return null;
    }
  };

  const exportExcel = async () => {
    const rowsToExport = await fetchExportRows();
    if (!rowsToExport) return;
    if (rowsToExport.length === 0) {
      toast.error("No students to export");
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(rowsToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `students-${stamp}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    toast.success("Excel downloaded");
  };

  const exportPdf = async () => {
    const rowsToExport = await fetchExportRows();
    if (!rowsToExport) return;
    if (rowsToExport.length === 0) {
      toast.error("No students to export");
      return;
    }
    const headers = Object.keys(rowsToExport[0]);
    const stamp = new Date().toLocaleString();
    const tableHead = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
    const tableBody = rowsToExport
      .map(
        (row) =>
          `<tr>${headers
            .map((h) => `<td>${escapeHtml(row[h])}</td>`)
            .join("")}</tr>`,
      )
      .join("");

    printHtml(`<!DOCTYPE html>
<html><head><meta charset="utf-8" /><title>Student Directory</title>
<style>
  body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  p { margin: 0 0 16px; color: #64748b; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th, td { border: 1px solid #cbd5e1; padding: 5px 6px; text-align: left; }
  th { background: #5c5987; color: #fff; }
  @media print { body { padding: 0; } }
</style></head><body>
  <h1>Student Directory</h1>
  <p>Exported ${escapeHtml(stamp)} · ${rowsToExport.length} student(s)</p>
  <table><thead><tr>${tableHead}</tr></thead><tbody>${tableBody}</tbody></table>
</body></html>`);
    toast.info("Use Print → Save as PDF in the dialog");
  };

  /* ---------------- custom report ---------------- */

  const reportParams = () => {
    const params = { all: true, status: status || "Active" };
    if (search) params.search = search;
    if (classId) params.classId = classId;
    if (sectionId) params.sectionId = sectionId;
    if (gender) params.gender = gender;
    if (category) params.category = category;
    if (admStatus !== "All") params.confirmationStatus = admStatus;
    if (chips.enrollType) params.feeBatch = chips.enrollType;
    if (chips.facility) params.facility = chips.facility;
    if (chips.feeDue) params.feeDue = "due";
    if (sort.field && sort.field !== "createdAt") {
      params.sort = `${sort.asc ? "" : "-"}${sort.field}`;
    }
    return params;
  };

  const generateReport = async () => {
    setReportLoading(true);
    try {
      const res = await axios.get(`${API}/students`, {
        params: reportParams(),
        withCredentials: true,
      });
      const list = res.data.data || [];
      const isFirst = !reportHasGenerated;
      setReportStudents(list);
      if (isFirst) {
        setReportSelected(new Set(buildReportFields(list).map((f) => f.key)));
      }
      setReportGenerated(true);
      setReportHasGenerated(true);
      if (list.length === 0) toast.info("No students match the current filters");
    } catch {
      toast.error("Failed to generate report");
    } finally {
      setReportLoading(false);
    }
  };

  const toggleReportField = (key) => {
    setReportSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAllReportFields = () =>
    setReportSelected(new Set(reportFields.map((f) => f.key)));
  const clearAllReportFields = () => setReportSelected(new Set());

  const selectedReportFields = reportFields.filter((f) =>
    reportSelected.has(f.key),
  );

  const buildReportRows = () =>
    reportStudents.map((s) => {
      const row = {};
      selectedReportFields.forEach((f) => {
        row[f.label] = f.get(s);
      });
      return row;
    });

  const exportReportExcel = () => {
    if (reportSelected.size === 0) {
      toast.error("Select at least one field");
      return;
    }
    if (reportStudents.length === 0) {
      toast.error("Generate the report first");
      return;
    }
    const rows = buildReportRows();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Custom Report");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `custom-report-${stamp}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    toast.success("Excel downloaded");
  };

  const exportReportPdf = () => {
    if (reportSelected.size === 0) {
      toast.error("Select at least one field");
      return;
    }
    if (reportStudents.length === 0) {
      toast.error("Generate the report first");
      return;
    }
    const rows = buildReportRows();
    const headers = Object.keys(rows[0] || {});
    const stamp = new Date().toLocaleString();
    const tableHead = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
    const tableBody = rows
      .map(
        (row) =>
          `<tr>${headers
            .map((h) => `<td>${escapeHtml(row[h])}</td>`)
            .join("")}</tr>`,
      )
      .join("");
    printHtml(`<!DOCTYPE html>
<html><head><meta charset="utf-8" /><title>Custom Student Report</title>
<style>
  body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  p { margin: 0 0 16px; color: #64748b; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 9px; }
  th, td { border: 1px solid #cbd5e1; padding: 4px 5px; text-align: left; }
  th { background: #5c5987; color: #fff; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>Custom Student Report</h1>
<p>Exported ${escapeHtml(stamp)} · ${rows.length} student(s) · ${headers.length} field(s)</p>
<table><thead><tr>${tableHead}</tr></thead><tbody>${tableBody}</tbody></table>
</body></html>`);
    toast.info("Use Print → Save as PDF in the dialog");
  };

  /* ---------------- render ---------------- */

  const pageTotal = pagination.total || 0;
  const hasFilters = activeBadges.length > 0;
  const showingFrom = pageTotal === 0 ? 0 : (page - 1) * limit + 1;
  const showingTo = Math.min(page * limit, pageTotal);

  return (
    <div className="students-directory min-h-full">
      {/* ── Manage Student toolbar ─────────────────────────────── */}
      <section className="bg-white border border-slate-200 rounded-xl shadow-2xs px-3 sm:px-5 py-3 space-y-2.5 no-print">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={resetAllFilters}
            className="text-base sm:text-[19px] font-semibold text-slate-900 tracking-tight cursor-pointer hover:text-[#4834b8] transition"
          >
            Manage Student
          </button>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={resetAllFilters}
              className="px-3 py-1.5 rounded bg-[#4834b8] text-white font-semibold border border-[#4834b8] shadow-2xs cursor-pointer transition"
            >
              Students
            </button>

            <NavDropdown
              id="report"
              label="Report"
              open={openNav === "report"}
              onToggle={(event) => {
                event.stopPropagation();
                setOpenNav(openNav === "report" ? null : "report");
              }}
            >
              {REPORT_ITEMS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleNavItem("Report", item)}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-indigo-50 hover:text-[#4834b8] cursor-pointer"
                >
                  {item}
                </button>
              ))}
            </NavDropdown>

            <NavDropdown
              id="certificates"
              label="Certificates"
              open={openNav === "certificates"}
              onToggle={(event) => {
                event.stopPropagation();
                setOpenNav(openNav === "certificates" ? null : "certificates");
              }}
            >
              {CERTIFICATE_ITEMS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleNavItem("Certificates", item)}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-indigo-50 hover:text-[#4834b8] cursor-pointer"
                >
                  {item}
                </button>
              ))}
            </NavDropdown>

            <NavDropdown
              id="tc"
              label="TC"
              open={openNav === "tc"}
              onToggle={(event) => {
                event.stopPropagation();
                setOpenNav(openNav === "tc" ? null : "tc");
              }}
            >
              {TC_ITEMS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleNavItem("TC", item)}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-indigo-50 hover:text-[#4834b8] cursor-pointer"
                >
                  {item}
                </button>
              ))}
            </NavDropdown>

            <NavDropdown
              id="inactive"
              label="Inactive"
              open={openNav === "inactive"}
              onToggle={(event) => {
                event.stopPropagation();
                setOpenNav(openNav === "inactive" ? null : "inactive");
              }}
            >
              {INACTIVE_ITEMS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleNavItem("Inactive", item)}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-indigo-50 hover:text-[#4834b8] cursor-pointer"
                >
                  {item}
                </button>
              ))}
            </NavDropdown>

            <button
              type="button"
              onClick={() => {
                setOpenNav(null);
                setProgMode("Promote");
                setProgSourceClass("");
                setProgSourceSearch("");
                setProgSelectedIds(new Set());
                setProgTargetClass("");
                setProgAssignSection("");
                setProgDemoteReason("");
                setProgOpen(true);
              }}
              className="px-2.5 py-1.5 rounded bg-white text-[#4834b8] hover:bg-indigo-50 font-medium border border-[#4834b8]/60 cursor-pointer transition"
            >
              Student Progression
            </button>

            <NavDropdown
              id="academics"
              label="Change Academics"
              open={openNav === "academics"}
              onToggle={(event) => {
                event.stopPropagation();
                setOpenNav(openNav === "academics" ? null : "academics");
              }}
            >
              {ACADEMIC_ITEMS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleNavItem("Change Academics", item)}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-indigo-50 hover:text-[#4834b8] cursor-pointer"
                >
                  {item}
                </button>
              ))}
            </NavDropdown>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
            <button
              type="button"
              onClick={resetAllFilters}
              className="px-3.5 py-1 rounded-full border border-[#4834b8]/60 bg-white text-xs font-medium text-slate-800 cursor-pointer hover:bg-indigo-50 transition"
            >
              <span className="font-bold text-[#4834b8]">{stats.total}</span> Students
            </button>

            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Search by Adm No, Name, Mobile"
                className="w-full pl-3.5 pr-8 py-1 rounded-full border border-[#4834b8]/40 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#4834b8]"
              />
              <FiSearch className="w-3.5 h-3.5 text-[#4834b8] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportExcel}
              title="Export Student Directory to Excel"
              className="w-8 h-8 rounded border border-emerald-500 bg-emerald-50/60 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center cursor-pointer transition"
            >
              <FiFileText className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => navigate("/school/students/bulk-upload")}
              className="px-3.5 py-1.5 rounded bg-[#007bff] hover:bg-blue-600 text-white font-semibold text-xs inline-flex items-center gap-1.5 shadow-2xs cursor-pointer transition"
            >
              <FiRefreshCw className="w-3.5 h-3.5" />
              <span>Import</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/school/student-manage")}
              className="px-3.5 py-1.5 rounded bg-[#007bff] hover:bg-blue-600 text-white font-semibold text-xs inline-flex items-center gap-1.5 shadow-2xs cursor-pointer transition"
            >
              <span className="text-sm leading-none font-bold">+</span>
              <span>Add Student</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── KPI analytics ──────────────────────────────────────── */}
      <section
        aria-label="Student Key Metrics"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-4 no-print"
      >
        <KpiCard
          color="#ff5252"
          top={{
            id: "kpi-active",
            label: "Active Students",
            value: stats.active,
            art: "active",
            highlight: highlightedKpi === "kpi-active",
            onClick: () => applyKpiFilter("status", "Active"),
          }}
          bottom={{
            id: "kpi-inactive",
            label: "InActive Students",
            value: stats.inactive,
            art: "inactive",
            highlight: highlightedKpi === "kpi-inactive",
            onClick: () => applyKpiFilter("status", "Inactive"),
          }}
        />
        <KpiCard
          color="#00d09c"
          top={{
            id: "kpi-old",
            label: "Old Students",
            value: stats.old,
            art: "old",
            highlight: highlightedKpi === "kpi-old",
            onClick: () => applyKpiFilter("enrollType", "Old"),
          }}
          bottom={{
            id: "kpi-new",
            label: "New Students",
            value: stats.new,
            art: "new",
            highlight: highlightedKpi === "kpi-new",
            onClick: () => applyKpiFilter("enrollType", "New"),
          }}
        />
        <KpiCard
          color="#f59e0b"
          top={{
            id: "kpi-male",
            label: "Male Student",
            value: stats.male,
            art: "male",
            highlight: highlightedKpi === "kpi-male",
            onClick: () => applyKpiFilter("gender", "Male"),
          }}
          bottom={{
            id: "kpi-female",
            label: "Female Student",
            value: stats.female,
            art: "female",
            highlight: highlightedKpi === "kpi-female",
            onClick: () => applyKpiFilter("gender", "Female"),
          }}
        />
        <KpiCard
          color="#007bff"
          top={{
            id: "kpi-boarding",
            label: "Boarding",
            value: stats.boarding,
            art: "boarding",
            highlight: highlightedKpi === "kpi-boarding",
            onClick: () => applyKpiFilter("facility", "Boarding"),
          }}
          bottom={{
            id: "kpi-transport",
            label: "Transport",
            value: stats.transport,
            art: "transport",
            highlight: highlightedKpi === "kpi-transport",
            onClick: () => applyKpiFilter("facility", "Transport"),
          }}
        />
      </section>

      {/* ── Directory ──────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden mt-4">
        <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">Student Directory</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-50 text-[#4834b8] border border-indigo-200/60">
              {pageTotal} of {stats.total} shown
            </span>

            <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200 ml-1">
              {["Active", "Inactive", "All"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => changeStatus(item)}
                  className={
                    status === item
                      ? "px-2.5 py-1 rounded-md text-xs font-bold bg-[#0066ff] text-white shadow-2xs cursor-pointer transition"
                      : "px-2.5 py-1 rounded-md text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer transition"
                  }
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pl-1">
              <Chip
                active={chips.enrollType === "New"}
                onClick={() => toggleChip("enrollType", "New")}
                tone="emerald"
              >
                N New
              </Chip>
              <Chip
                active={chips.enrollType === "Old"}
                onClick={() => toggleChip("enrollType", "Old")}
                tone="indigo"
              >
                P Promoted
              </Chip>
              <Chip
                active={chips.facility === "Boarding"}
                onClick={() => toggleChip("facility", "Boarding")}
                tone="amber"
              >
                🏠 Boarding
              </Chip>
              <Chip
                active={chips.facility === "Transport"}
                onClick={() => toggleChip("facility", "Transport")}
                tone="sky"
              >
                🚌 Transport
              </Chip>
              <Chip
                active={chips.feeDue}
                onClick={() => toggleChip("feeDue", "due")}
                tone="rose"
              >
                ₹ Fee Due
              </Chip>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportExcel}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Export Excel</span>
            </button>
            <button
              type="button"
              onClick={exportPdf}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Filter ribbon */}
        <div className="p-3 bg-[#e2e5f1] border-b border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 items-center text-xs">
            <div className="lg:col-span-3">
              <input
                type="text"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Search Name, Adm No, SR No, Aadhaar, Father, Mobile..."
                className="w-full h-8 px-3 rounded bg-white border border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#4834b8]"
              />
            </div>

            <div className="lg:col-span-2">
              <select
                value={admStatus}
                onChange={changeFilter(setAdmStatus)}
                className="w-full h-8 px-2.5 rounded bg-white border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none"
              >
                <option value="All">Adm. Status: All</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Not Confirmed">Not Confirmed</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <select
                value={classId}
                onChange={changeFilter(setClassId)}
                className="w-full h-8 px-2.5 rounded bg-white border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none"
              >
                <option value="">-- All Classes --</option>
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-1">
              <select
                value={sectionId}
                onChange={changeFilter(setSectionId)}
                className="w-full h-8 px-2 rounded bg-white border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none"
              >
                <option value="">Sec: All</option>
                {sections.map((section) => (
                  <option key={section._id} value={section._id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-1">
              <select
                value={gender}
                onChange={changeFilter(setGender)}
                className="w-full h-8 px-2 rounded bg-white border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none"
              >
                <option value="">Gender: All</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div className="lg:col-span-1">
              <select
                value={category}
                onChange={changeFilter(setCategory)}
                className="w-full h-8 px-2 rounded bg-white border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none"
              >
                <option value="">Category: All</option>
                {CATEGORY_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2 flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSearch(searchDraft.trim());
                  setPage(1);
                }}
                className="h-8 px-3.5 rounded bg-[#4834b8] hover:bg-indigo-800 text-white font-bold text-xs cursor-pointer transition"
              >
                Search
              </button>
              <button
                type="button"
                onClick={resetAllFilters}
                className="h-8 px-3 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs cursor-pointer transition"
              >
                Reset
              </button>
            </div>
          </div>

          {hasFilters && (
            <div className="pt-2 mt-2 border-t border-indigo-200/60 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                {activeBadges.map((badge) => (
                  <span
                    key={badge.key}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-indigo-200 text-[#4834b8] font-semibold"
                  >
                    {badge.label}
                    <button
                      type="button"
                      onClick={badge.clear}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      aria-label={`Clear ${badge.label}`}
                    >
                      <FiX className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={resetAllFilters}
                className="text-[11px] font-bold text-rose-700 hover:underline cursor-pointer"
              >
                ✕ Clear All Filters
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1250px]">
            <thead>
              <tr className="bg-[#5c5987] text-white text-[11px] font-bold tracking-wide">
                <th className="py-2.5 px-3.5 w-[21%]">Student Name</th>
                <th className="py-2.5 px-2.5 w-[10%]">Adm. Status</th>
                <th className="py-2.5 px-2.5 w-[7%]">
                  <SortHeader
                    label="Adm No."
                    active={sort.field === "studentId"}
                    asc={sort.asc}
                    onClick={() => toggleSort("studentId")}
                  />
                </th>
                <th className="py-2.5 px-2.5 w-[8%]">Adm. Date</th>
                <th className="py-2.5 px-2.5 w-[8%]">
                  <SortHeader
                    label="SR. No."
                    active={sort.field === "srNo"}
                    asc={sort.asc}
                    onClick={() => toggleSort("srNo")}
                  />
                </th>
                <th className="py-2.5 px-2.5 w-[7%]">Class</th>
                <th className="py-2.5 px-2.5 w-[8%]">DOB</th>
                <th className="py-2.5 px-2.5 w-[11%]">Aadhar No.</th>
                <th className="py-2.5 px-2.5 w-[11%]">Parents</th>
                <th className="py-2.5 px-2.5 w-[6%]">Father No.</th>
                <th className="py-2.5 px-3.5 w-[3%] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs bg-white">
              {loading && (
                <tr>
                  <td colSpan={11} className="py-14 text-center text-slate-500">
                    <div className="inline-flex flex-col items-center gap-2">
                      <div className="h-7 w-7 border-2 border-[#4834b8] border-t-transparent rounded-full animate-spin" />
                      <span>Loading students…</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((student) => {
                  const enrollment = enrollOf(student);
                  const facility = facilityOf(student);
                  return (
                    <tr key={student._id} className="hover:bg-indigo-50/40 transition">
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            name={fullName(student)}
                            photoUrl={student.documents?.studentPhoto?.url}
                            size="sm"
                          />
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-extrabold rounded border ${
                              enrollment === "N"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                : "bg-indigo-100 text-indigo-800 border-indigo-200"
                            }`}
                            title={enrollment === "N" ? "New admission" : "Promoted / old student"}
                          >
                            {enrollment}
                          </span>
                          {facility !== "Day Scholar" && (
                            <span
                              title={facility === "Boarding" ? "Boarding / Hosteller" : "School Transport"}
                              className={facility === "Boarding" ? "text-slate-800" : "text-sky-600"}
                            >
                              {facility === "Boarding" ? "🏠" : "🚌"}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => openStudent(student)}
                            className="font-bold text-[#0066ff] hover:underline text-left uppercase tracking-tight cursor-pointer"
                          >
                            {fullName(student)}
                          </button>
                        </div>
                      </td>

                      <td className="py-2.5 px-2.5">
                        {isConfirmed(student) ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Confirmed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Not Confirmed
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-2.5 font-mono font-bold text-slate-800">
                        {student.studentId || "—"}
                      </td>

                      <td className="py-2.5 px-2.5 font-mono text-slate-600 whitespace-nowrap">
                        {fmtDate(student.admissionDate)}
                      </td>

                      <td className="py-2.5 px-2.5 font-mono font-semibold text-[#4834b8]">
                        {student.srNo || "—"}
                      </td>

                      <td className="py-2.5 px-2.5 font-semibold text-slate-800">
                        {classLabel(student)}
                      </td>

                      <td className="py-2.5 px-2.5 font-mono text-slate-700 whitespace-nowrap">
                        {fmtDate(student.dob)}
                      </td>

                      <td className="py-2.5 px-2.5 font-mono text-slate-700 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => copyValue(student.aadhaarNumber, "Aadhaar")}
                          className="hover:text-[#0066ff] cursor-pointer"
                          title="Click to copy Aadhaar"
                        >
                          {fmtAadhaar(student.aadhaarNumber)}
                        </button>
                      </td>

                      <td className="py-2.5 px-2.5 leading-tight">
                        <div className="font-semibold text-slate-800 uppercase text-[11px]">
                          {student.fatherName || "—"}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase">
                          {student.motherName || ""}
                        </div>
                      </td>

                      <td className="py-2.5 px-2.5 font-mono text-slate-800">
                        <button
                          type="button"
                          onClick={() => copyValue(student.fatherMobile, "Father mobile")}
                          className="hover:text-[#0066ff] cursor-pointer"
                        >
                          {student.fatherMobile || "—"}
                        </button>
                      </td>

                      <td className="py-2.5 px-3.5 text-center">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (rowMenu?.student._id === student._id) {
                              setRowMenu(null);
                              return;
                            }
                            const rect = event.currentTarget.getBoundingClientRect();
                            const left = Math.max(
                              8,
                              Math.min(rect.right - 176, window.innerWidth - 184),
                            );
                            const top =
                              rect.bottom + 230 > window.innerHeight
                                ? Math.max(8, rect.top - 230)
                                : rect.bottom + 4;
                            setRowMenu({ student, top, left });
                          }}
                          className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-600 inline-flex items-center justify-center font-bold cursor-pointer"
                          title="Actions"
                        >
                          ⋮
                        </button>
                      </td>
                    </tr>
                  );
                })}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-12 px-4 text-center">
                    <p className="text-sm font-bold text-slate-700">
                      No students match the current filters.
                    </p>
                    <button
                      type="button"
                      onClick={resetAllFilters}
                      className="mt-3 px-4 py-1.5 rounded-lg bg-[#4834b8] text-white text-xs font-bold cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <span>
              Showing {showingFrom} to {showingTo} of {pageTotal} students
            </span>
            <span className="text-[11px] text-slate-500">
              Click any <strong>Student Name</strong> to inspect basic, parent, and complete fee details
            </span>
          </div>
          <Pagination
            page={pagination.page || page}
            totalPages={pagination.totalPages || 1}
            total={pageTotal}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(size) => {
              setLimit(size);
              setPage(1);
            }}
          />
        </div>
      </section>

      {/* ── Floating row action menu ───────────────────────────── */}
      {rowMenu && (
        <div
          className="fixed z-[90] w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 text-left text-xs"
          style={{ top: rowMenu.top, left: rowMenu.left }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              setRowMenu(null);
              navigate(`/school/student-manage/${rowMenu.student._id}`);
            }}
            className="w-full px-3.5 py-1.5 hover:bg-indigo-50 text-slate-700 font-semibold flex items-center gap-2 cursor-pointer"
          >
            <FiEdit2 className="w-3.5 h-3.5" /> Edit
          </button>
          <button
            type="button"
            onClick={() => printStudent(rowMenu.student)}
            className="w-full px-3.5 py-1.5 hover:bg-indigo-50 text-slate-700 font-semibold flex items-center gap-2 cursor-pointer"
          >
            <FiPrinter className="w-3.5 h-3.5" /> Print
          </button>
          <button
            type="button"
            onClick={() => openNotes(rowMenu.student)}
            className="w-full px-3.5 py-1.5 hover:bg-indigo-50 text-slate-700 font-semibold flex items-center gap-2 cursor-pointer"
          >
            <FiFileText className="w-3.5 h-3.5" /> Notes
          </button>
          <button
            type="button"
            onClick={() => handleToggleActive(rowMenu.student)}
            className={`w-full px-3.5 py-1.5 hover:bg-indigo-50 font-semibold flex items-center gap-2 cursor-pointer ${
              rowMenu.student.isActive === false ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {rowMenu.student.isActive === false ? "✓ Mark Active" : "⏸ Mark Inactive"}
          </button>
          <div className="my-1 border-t border-slate-100" />
          <button
            type="button"
            onClick={() => {
              setRowMenu(null);
              navigate(`/school/student-view/${rowMenu.student._id}`);
            }}
            className="w-full px-3.5 py-1.5 hover:bg-indigo-50 text-[#4834b8] font-bold flex items-center gap-2 cursor-pointer"
          >
            📄 View Full Form
          </button>
        </div>
      )}

      {/* ── Student quick-view drawer ──────────────────────────── */}
      {drawerStudent && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/40 z-[75]"
            onClick={() => setDrawerStudent(null)}
          />
          <aside className="fixed right-0 top-0 h-full w-full max-w-[560px] bg-slate-50 shadow-2xl z-[80] overflow-y-auto">
            <div className="sticky top-0 z-10 bg-[#4834b8] text-white px-4 py-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold">Student Quick View</h3>
                <p className="text-[11px] text-indigo-100 mt-0.5">
                  {fullName(drawerStudent)} · Adm #{drawerStudent.studentId || "—"} ·{" "}
                  {drawerStudent.srNo || "SR —"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerStudent(null)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
                aria-label="Close student drawer"
              >
                <FiX />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3.5">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#4834b8] to-indigo-700 text-white font-extrabold text-base flex items-center justify-center shrink-0 border-2 border-indigo-100 uppercase">
                    {initialsOf(drawerStudent)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h4 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">
                        {fullName(drawerStudent)}
                      </h4>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          drawerStudent.isActive === false
                            ? "bg-rose-100 text-rose-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {drawerStudent.isActive === false ? "Inactive" : "Active"}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isConfirmed(drawerStudent)
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {convStatusLabel(drawerStudent)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-slate-600 mt-1.5">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-bold text-slate-800">
                        Adm #{drawerStudent.studentId || "—"}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200/70 text-[#4834b8] font-bold">
                        {drawerStudent.srNo || "SR —"}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200/70 text-emerald-800 font-bold">
                        {classLabel(drawerStudent)}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200/70 text-amber-800 font-bold">
                        Roll #{drawerStudent.rollNo || "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                  <SummaryCell
                    label="Enrollment"
                    value={enrollOf(drawerStudent) === "N" ? "New (N)" : "Promoted (P)"}
                  />
                  <SummaryCell label="Facility" value={facilityOf(drawerStudent)} />
                  <SummaryCell label="Category" value={drawerStudent.category || "General"} />
                  <SummaryCell
                    label="Fee Status"
                    value={feeStatusOf(drawerStudent)}
                    tone={Number(drawerStudent.totalDue || 0) > 0 ? "rose" : "emerald"}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerStudent(null);
                      navigate(`/school/student-manage/${drawerStudent._id}`);
                    }}
                    className="px-3.5 py-2 rounded-lg bg-[#0066ff] hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    ✎ Edit Form
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerStudent(null);
                      navigate(`/school/student-view/${drawerStudent._id}`);
                    }}
                    className="px-3.5 py-2 rounded-lg bg-[#4834b8] hover:bg-indigo-800 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    📄 View Full Form
                  </button>
                </div>
              </div>

              <DrawerSection title="01. Student Basic & Academic Details">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                  <Detail label="Admission No." value={`#${drawerStudent.studentId || "—"}`} mono />
                  <Detail label="Admission Date" value={fmtDate(drawerStudent.admissionDate)} mono />
                  <Detail
                    label="Adm. Confirmation"
                    value={convStatusLabel(drawerStudent)}
                    tone={isConfirmed(drawerStudent) ? "emerald" : "amber"}
                  />
                  <Detail label="SR. No. (Scholar Reg.)" value={drawerStudent.srNo || "—"} mono accent />
                  <Detail label="Date of Birth" value={fmtDate(drawerStudent.dob)} mono />
                  <Detail label="Gender" value={drawerStudent.gender || "—"} />
                  <Detail label="Class" value={classLabel(drawerStudent)} />
                  <Detail label="Roll No." value={drawerStudent.rollNo || "—"} mono />
                  <Detail label="Aadhaar Number" value={fmtAadhaar(drawerStudent.aadhaarNumber)} mono />
                  <Detail label="Category" value={drawerStudent.category || "General"} />
                  <Detail label="Religion" value={drawerStudent.religion || "—"} />
                  <Detail label="Blood Group" value={drawerStudent.bloodGroup || "—"} />
                  <Detail label="Student Type" value={drawerStudent.studentType || "—"} />
                  <Detail label="Academic Session" value={drawerStudent.academicYear || "—"} mono />
                  <Detail label="PEN Number" value={drawerStudent.penNumber || "—"} mono />
                  <Detail label="APAAR ID" value={drawerStudent.apaarId || "—"} mono />
                </div>
              </DrawerSection>

              <DrawerSection title="02. Parent & Contact Details">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                  <Detail label="Father's Name" value={drawerStudent.fatherName || "—"} />
                  <Detail label="Father Mobile" value={drawerStudent.fatherMobile || "—"} mono />
                  <Detail label="Father Email" value={drawerStudent.fatherEmail || "—"} />
                  <Detail label="Mother's Name" value={drawerStudent.motherName || "—"} />
                  <Detail label="Mother Mobile" value={drawerStudent.motherMobile || "—"} mono />
                  <Detail label="Mother Email" value={drawerStudent.motherEmail || "—"} />
                  <Detail label="Guardian" value={drawerStudent.guardianName || "—"} />
                  <Detail label="Guardian Mobile" value={drawerStudent.guardianMobile || "—"} mono />
                  <Detail label="Guardian Relation" value={drawerStudent.guardianRelation || "—"} />
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <Detail label="Address" value={drawerStudent.address || "—"} />
                </div>
              </DrawerSection>

              <DrawerSection title="03. Fee & Facility Details">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                  <Detail label="Total Fee" value={money(drawerStudent.totalFee)} mono />
                  <Detail label="Final Fee" value={money(drawerStudent.finalFee)} mono />
                  <Detail label="Total Paid" value={money(drawerStudent.totalPaid)} mono />
                  <Detail
                    label="Total Due"
                    value={money(drawerStudent.totalDue)}
                    mono
                    tone={Number(drawerStudent.totalDue || 0) > 0 ? "rose" : "emerald"}
                  />
                  <Detail label="Fee Frequency" value={drawerStudent.feeFrequency || "—"} />
                  <Detail label="Facility" value={facilityOf(drawerStudent)} />
                  <Detail label="Transport Route" value={drawerStudent.transport?.name || "—"} />
                  <Detail label="Hostel" value={drawerStudent.isBoarding ? "Boarding" : "Day Scholar"} />
                </div>
              </DrawerSection>

              <DrawerSection title="04. Notes">
                <p className="text-xs text-slate-700 whitespace-pre-wrap">
                  {drawerStudent.admissionNotes || "No notes added for this student yet."}
                </p>
                <button
                  type="button"
                  onClick={() => openNotes(drawerStudent)}
                  className="mt-2 text-xs font-bold text-[#4834b8] hover:underline cursor-pointer"
                >
                  ✎ Edit notes
                </button>
              </DrawerSection>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => printStudent(drawerStudent)}
                  className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FiPrinter /> Print Student
                </button>
                <MessageButton
                  targetId={drawerStudent._id}
                  targetModel="Student"
                  label="Message"
                  className="!w-full !rounded-lg !text-xs !font-bold !bg-indigo-500"
                />
              </div>
            </div>
          </aside>
        </>
      )}

      {/* ── Notes modal ────────────────────────────────────────── */}
      {notesFor && (
        <Modal onClose={() => setNotesFor(null)} title="Student Notes" size="max-w-lg">
          <p className="text-xs text-slate-500 mb-2">
            Notes for <strong>{fullName(notesFor)}</strong> (Adm #{notesFor.studentId || "—"})
          </p>
          <textarea
            value={notesText}
            onChange={(event) => setNotesText(event.target.value)}
            rows={6}
            placeholder="Hostel allotment, document reminders, fee follow-ups…"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#4834b8]"
          />
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => setNotesFor(null)}
              className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveNotes}
              disabled={savingNotes}
              className="px-3.5 py-2 rounded-lg bg-[#4834b8] hover:bg-indigo-800 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
            >
              {savingNotes ? "Saving…" : "Save Notes"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Confirm toggle modal ───────────────────────────────── */}
      {confirmOpen && (
        <Modal onClose={() => setConfirmOpen(false)} title="Confirmation" size="max-w-md">
          <p className="text-sm text-slate-700 mb-6">{confirmMessage}</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                confirmAction?.();
                setConfirmOpen(false);
              }}
              className="px-4 py-2 rounded-lg bg-[#4834b8] hover:bg-indigo-800 text-white text-xs font-bold cursor-pointer"
            >
              Confirm
            </button>
          </div>
        </Modal>
      )}

      {/* ── Student progression workspace (full page parity) ─────────── */}
      {progOpen && (
        <div className="fixed inset-0 z-[90] bg-slate-50 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-5 space-y-5">
            {/* Header */}
            <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <svg className="w-6 h-6 text-[#16a34a] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
                    <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
                  </svg>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">Student Progression</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Promote, demote, or repeat students across academic years with sequence-based automation.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { key: "Promote", color: "bg-[#16a34a]", text: "text-white" },
                  { key: "Demote", color: "bg-white", text: "text-slate-700" },
                  { key: "Repeat", color: "bg-white", text: "text-slate-700" },
                  { key: "History", color: "bg-white", text: "text-slate-700" },
                ].map((m) => {
                  const active = progMode === m.key;
                  const label =
                    m.key === "History" ? "Demotion History" : m.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => {
                        setProgMode(m.key);
                        setProgSelectedIds(new Set());
                      }}
                      className={`px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition border ${
                        active
                          ? "bg-[#16a34a] text-white border-[#16a34a] shadow-2xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => !progRunning && setProgOpen(false)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>

            {progMode === "History" ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Student Demotion History</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-[#4f46e5] border border-indigo-100">
                    Showing 0 of 0 records
                  </span>
                </div>
                <div className="py-16 px-4 text-center text-slate-500">
                  <p className="text-xs font-medium text-slate-600">
                    No demotion audit records found.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                {/* Left panel */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col min-h-[560px]">
                  <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                      1. SELECT STUDENTS
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-[#15803d]">
                      {progSelectedIds.size} / {progSourceStudents.length} SELECTED
                    </span>
                  </div>
                  <div className="p-4 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <select
                      value={progSourceSession}
                      onChange={(e) => setProgSourceSession(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800"
                    >
                      <option value="">All Sessions</option>
                      <option value="2026-27">2026-27</option>
                      <option value="2025-26">2025-26</option>
                    </select>
                    <select
                      value={progSourceClass}
                      onChange={(e) => {
                        setProgSourceClass(e.target.value);
                        setProgSelectedIds(new Set());
                        if (progMode === "Repeat") setProgTargetClass(e.target.value);
                      }}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800"
                    >
                      <option value="">Select Class</option>
                      {classes.map((cls) => (
                        <option key={cls._id} value={cls._id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={progSourceSearch}
                      onChange={(e) => setProgSourceSearch(e.target.value)}
                      placeholder="Search by name, adm no..."
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400"
                    />
                  </div>
                  <div className="grid grid-cols-12 items-center px-4 py-2.5 bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                    <div className="col-span-3 flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={
                          progSourceStudents.length > 0 &&
                          progSourceStudents.every((s) =>
                            progSelectedIds.has(s._id),
                          )
                        }
                        onChange={(e) => toggleProgSelectAll(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-[#16a34a] focus:ring-0 cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setProgSortField("studentId");
                          setProgSortAsc((p) => (progSortField === "studentId" ? !p : true));
                        }}
                        className="inline-flex items-center gap-1 cursor-pointer"
                      >
                        Adm. no.
                      </button>
                    </div>
                    <div
                      className="col-span-4 flex items-center gap-1 cursor-pointer select-none"
                      onClick={() => {
                        setProgSortField("firstName");
                        setProgSortAsc((p) => (progSortField === "firstName" ? !p : true));
                      }}
                    >
                      Student
                    </div>
                    <div className="col-span-2 text-center">Current Class</div>
                    <div className="col-span-3 text-right pr-1">
                      {progMode === "Demote" ? "Previous Class" : "Transferred Class"}
                    </div>
                  </div>
                  <div className="flex-1 max-h-[420px] overflow-y-auto divide-y divide-slate-100 text-xs">
                    {!progSourceClass ? (
                      <div className="py-16 px-4 text-center text-slate-500">
                        <p className="text-xs font-medium text-slate-600">
                          Please select a class to load students.
                        </p>
                      </div>
                    ) : progSourceLoading ? (
                      <div className="py-16 px-4 text-center text-slate-500">
                        <p className="text-xs font-medium text-slate-600">
                          Loading students…
                        </p>
                      </div>
                    ) : (() => {
                        const q = progSourceSearch.trim().toLowerCase();
                        const filtered = progSourceStudents
                          .filter((s) =>
                            !q ||
                            `${fullName(s)} ${s.studentId || ""} ${s.fatherName || ""}`
                              .toLowerCase()
                              .includes(q),
                          )
                          .sort((a, b) => {
                            const va = String(
                              progSortField === "studentId"
                                ? a.studentId || ""
                                : progSortField === "firstName"
                                ? fullName(a)
                                : "",
                            );
                            const vb = String(
                              progSortField === "studentId"
                                ? b.studentId || ""
                                : progSortField === "firstName"
                                ? fullName(b)
                                : "",
                            );
                            return progSortAsc
                              ? va.localeCompare(vb, undefined, { numeric: true })
                              : vb.localeCompare(va, undefined, { numeric: true });
                          });
                        if (filtered.length === 0) {
                          return (
                            <div className="py-16 px-4 text-center text-slate-500">
                              <p className="text-xs font-medium text-slate-600">
                                No students found.
                              </p>
                            </div>
                          );
                        }
                        return filtered.map((s) => {
                          const checked = progSelectedIds.has(s._id);
                          return (
                            <div
                              key={s._id}
                              onClick={() => toggleProgStudent(s._id)}
                              className={`grid grid-cols-12 items-center px-4 py-3 cursor-pointer transition ${
                                checked ? "bg-emerald-50/70" : "hover:bg-slate-50"
                              }`}
                            >
                              <div className="col-span-3 flex items-center gap-2.5 font-mono font-bold text-slate-800">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={() => toggleProgStudent(s._id)}
                                  className="w-4 h-4 rounded border-slate-300 text-[#16a34a] focus:ring-0 cursor-pointer"
                                />
                                <span>{s.studentId || "—"}</span>
                              </div>
                              <div className="col-span-4 leading-tight">
                                <div className="font-bold text-slate-900 uppercase">
                                  {fullName(s)}
                                </div>
                                <div className="text-[10px] text-slate-500 uppercase">
                                  Father: {s.fatherName || "—"}
                                </div>
                              </div>
                              <div className="col-span-2 text-center font-semibold text-slate-800">
                                {classLabel(s)}
                              </div>
                              <div className="col-span-3 text-right font-medium text-slate-700 pr-1">
                                {progMode === "Demote"
                                  ? classLabel(s)
                                  : progMode === "Repeat"
                                  ? `${classLabel(s)} (Same Class)`
                                  : progTargetClass
                                  ? classes.find((c) => c._id === progTargetClass)?.name || "—"
                                  : "—"}
                              </div>
                            </div>
                          );
                        });
                      })()}
                  </div>
                </div>

                {/* Right panel */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col min-h-[560px]">
                  <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[#16a34a] flex items-center">
                        {progMode === "Promote" && (
                          <svg className="w-4 h-4 text-[#16a34a]" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
                          </svg>
                        )}
                        {progMode === "Demote" && (
                          <svg className="w-4 h-4 text-[#dc2626]" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
                          </svg>
                        )}
                        {progMode === "Repeat" && (
                          <svg className="w-4 h-4 text-[#d97706]" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                        {progMode === "Promote" && "2. TARGET ACADEMIC YEAR & CLASS"}
                        {progMode === "Demote" && "2. REVIEW DEMOTION & VALIDATIONS"}
                        {progMode === "Repeat" && "2. CONFIGURE CLASS REPEAT"}
                      </h3>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-[#15803d]">
                      {progSelectedIds.size} {progMode === "Demote" ? "ELIGIBLE" : progMode === "Repeat" ? "REPEATING" : "READY"}
                    </span>
                  </div>

                  {progMode === "Demote" && (
                    <div className="p-4 border-b border-slate-100">
                      <div className="border-l-4 border-rose-600 bg-rose-50/70 rounded-r-lg p-3.5 text-xs text-rose-900 leading-relaxed">
                        <span className="font-bold text-rose-700">Important:</span>{" "}
                        <span className="text-rose-800">
                          Demoting will restore students to a chosen class. Demotion is blocked
                          if fees have been paid in the current session.
                        </span>
                      </div>
                    </div>
                  )}

                  {(progMode === "Promote" || progMode === "Repeat") && (
                    <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70">
                          <span className="text-[11px] font-bold uppercase text-slate-500">
                            UPCOMING SESSION:
                          </span>
                          <select
                            value={progTargetSession}
                            onChange={(e) => setProgTargetSession(e.target.value)}
                            className="bg-white border border-slate-200 rounded px-2 py-0.5 text-xs font-semibold text-slate-800"
                          >
                            <option value="">No Upcoming Session</option>
                            <option value="2027-28">2027-28</option>
                            <option value="2026-27">2026-27</option>
                          </select>
                        </div>
                        {progMode === "Promote" && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white">
                            <span className="text-[11px] font-bold uppercase text-slate-500">
                              NEXT CLASS:
                            </span>
                            <select
                              value={progTargetClass}
                              onChange={(e) => setProgTargetClass(e.target.value)}
                              className="bg-white border border-slate-200 rounded px-2 py-0.5 text-xs font-semibold text-slate-800"
                            >
                              <option value="">Select target class</option>
                              {classes.map((cls) => (
                                <option key={cls._id} value={cls._id}>
                                  {cls.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        {progMode === "Repeat" && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white">
                            <span className="text-[11px] font-bold uppercase text-slate-500">
                              REPEAT CLASS:
                            </span>
                            <span className="font-bold text-slate-900">
                              {progSourceClass
                                ? classes.find((c) => c._id === progSourceClass)?.name || "Same Class"
                                : "(Same Class)"}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-auto">
                        <span className="text-xs font-semibold text-slate-600">Assign All To:</span>
                        <select
                          value={progAssignSection}
                          onChange={(e) => setProgAssignSection(e.target.value)}
                          className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800"
                        >
                          <option value="">Select Section</option>
                          {sections.map((sec) => (
                            <option key={sec._id} value={sec._id}>
                              {sec.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {progMode === "Demote" && (
                    <div className="p-4 border-b border-slate-100">
                      <label className="block text-xs">
                        <span className="block font-bold text-slate-700 mb-1">
                          Restore To Class
                        </span>
                        <select
                          value={progTargetClass}
                          onChange={(e) => setProgTargetClass(e.target.value)}
                          className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs"
                        >
                          <option value="">Select previous class</option>
                          {classes.map((cls) => (
                            <option key={cls._id} value={cls._id}>
                              {cls.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  )}

                  <div className="grid grid-cols-12 items-center px-4 py-2.5 bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                    <div className="col-span-2">Adm. no.</div>
                    <div className="col-span-4">Student</div>
                    <div className="col-span-2">Current Class</div>
                    <div className="col-span-2">
                      {progMode === "Promote"
                        ? "Target Class"
                        : progMode === "Repeat"
                        ? "Repeat in Section"
                        : "Restore To"}
                    </div>
                    <div className="col-span-2 text-right">Status</div>
                  </div>

                  <div className="flex-1 max-h-[320px] overflow-y-auto divide-y divide-slate-100 text-xs">
                    {progSelectedIds.size === 0 ? (
                      <div className="py-16 px-4 text-center text-slate-500 space-y-2">
                        <p className="text-xs font-medium text-slate-600">
                          {progMode === "Promote"
                            ? "Select students from the left panel to promote them to the next class."
                            : progMode === "Demote"
                            ? "Select students from the left panel to review demotion eligibility."
                            : "Select students from the left panel who will be repeating in the upcoming session."}
                        </p>
                      </div>
                    ) : (
                      progSourceStudents
                        .filter((s) => progSelectedIds.has(s._id))
                        .map((s) => (
                          <div
                            key={s._id}
                            className="grid grid-cols-12 items-center px-4 py-3"
                          >
                            <div className="col-span-2 font-mono font-bold text-slate-800">
                              {s.studentId || "—"}
                            </div>
                            <div className="col-span-4 leading-tight">
                              <div className="font-bold text-slate-900 uppercase">
                                {fullName(s)}
                              </div>
                              <div className="text-[10px] text-slate-500 uppercase">
                                F: {s.fatherName || "—"}
                              </div>
                            </div>
                            <div className="col-span-2 text-slate-700 font-medium">
                              {classLabel(s)}
                            </div>
                            <div className="col-span-2">
                              {progMode === "Repeat" ? (
                                <span className="text-slate-700 font-medium">
                                  {progAssignSection
                                    ? sections.find((x) => x._id === progAssignSection)?.name
                                    : "—"}
                                </span>
                              ) : (
                                <span className="text-slate-700 font-medium">
                                  {classes.find((c) => c._id === progTargetClass)?.name || "—"}
                                </span>
                              )}
                            </div>
                            <div className="col-span-2 text-right">
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {progMode === "Demote" ? "Eligible" : "Ready"}
                              </span>
                            </div>
                          </div>
                        ))
                    )}
                  </div>

                  {progMode === "Demote" && progSelectedIds.size > 0 && (
                    <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/40 space-y-1.5 text-xs">
                      <label className="block font-bold text-slate-700">
                        Reason for Demotion <span className="text-rose-600">*</span>{" "}
                        <span className="text-slate-500 font-semibold">
                          (Mandatory for audit trail)
                        </span>
                      </label>
                      <textarea
                        rows={2}
                        value={progDemoteReason}
                        onChange={(e) => setProgDemoteReason(e.target.value)}
                        placeholder="Enter administrative or academic reason for demoting selected student(s)..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-rose-500 resize-y"
                      />
                    </div>
                  )}

                  <div className="px-5 py-3.5 bg-white border-t border-slate-200 rounded-b-xl flex flex-wrap items-center justify-between gap-3 text-xs mt-auto">
                    <div className="text-slate-600">
                      <strong className="text-slate-900">
                        {progSelectedIds.size}
                      </strong>{" "}
                      student(s) selected for{" "}
                      {progMode === "Promote"
                        ? "promotion"
                        : progMode === "Demote"
                        ? "demotion"
                        : "repeat"}
                      .
                    </div>
                    <button
                      type="button"
                      onClick={executeStudentProgression}
                      disabled={
                        progRunning ||
                        progSelectedIds.size === 0 ||
                        (progMode === "Promote" && !progTargetClass) ||
                        (progMode === "Demote" && (!progTargetClass || !progDemoteReason.trim()))
                      }
                      className={`px-4 py-2 rounded-lg font-bold text-white inline-flex items-center gap-1.5 transition ${
                        progMode === "Demote"
                          ? "bg-rose-600 hover:bg-rose-700 disabled:bg-rose-600/50"
                          : progMode === "Repeat"
                          ? "bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/50"
                          : "bg-[#16a34a] hover:bg-green-700 disabled:bg-[#16a34a]/50"
                      } disabled:cursor-not-allowed`}
                    >
                      {progRunning
                        ? "Processing…"
                        : `${progMode === "Promote" ? "↑" : progMode === "Demote" ? "↓" : "↻"} ${progMode} ${progSelectedIds.size} Student(s)`}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ERP placeholder modal (modules without a wired backend) ── */}
      {erpModal && (
        <Modal
          onClose={() => setErpModal(null)}
          title={`${erpModal.category} · ${erpModal.title}`}
          size="max-w-lg"
        >
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 text-xs text-slate-700">
            <p className="font-bold text-[#4834b8] mb-1">ERP module</p>
            <p>
              <strong>{erpModal.title}</strong> belongs to the {erpModal.category}{" "}
              workspace. The ERP backend for this specific module is not wired in this
              build yet — use the existing Reports, Certificates, and Student modules
              for live data.
            </p>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => {
                const target =
                  erpModal.category === "Certificates" || erpModal.category === "TC"
                    ? "/school/certificates"
                    : "/school/reports";
                setErpModal(null);
                navigate(target);
              }}
              className="px-3.5 py-2 rounded-lg bg-[#4834b8] hover:bg-indigo-800 text-white text-xs font-bold cursor-pointer"
            >
              Open Related Module
            </button>
            <button
              type="button"
              onClick={() => setErpModal(null)}
              className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* ── Custom report modal ─────────────────────────────────────── */}
      {reportOpen && (
        <Modal
          onClose={() => setReportOpen(false)}
          title="Custom Report"
          size="max-w-6xl"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-600">
                Uses the current student filters. Choose the fields to include, then
                generate.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={selectAllReportFields}
                  className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={clearAllReportFields}
                  className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={generateReport}
                  disabled={reportLoading}
                  className="px-3.5 py-1.5 rounded bg-[#4834b8] hover:bg-indigo-800 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                >
                  {reportLoading ? "Generating…" : "Generate Report"}
                </button>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg p-3">
              {REPORT_FIELD_GROUPS.filter((g) =>
                reportFields.some((f) => f.group === g),
              ).map((group) => (
                <div key={group} className="mb-3 last:mb-0">
                  <p className="text-[11px] font-bold text-[#4834b8] uppercase tracking-wide mb-1.5">
                    {group}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                    {reportFields
                      .filter((f) => f.group === group)
                      .map((field) => (
                        <label
                          key={field.key}
                          className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={reportSelected.has(field.key)}
                            onChange={() => toggleReportField(field.key)}
                            className="accent-[#4834b8]"
                          />
                          <span className="truncate" title={field.label}>
                            {field.label}
                          </span>
                        </label>
                      ))}
                  </div>
                </div>
              ))}
            </div>

            {reportGenerated && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-600">
                    {reportStudents.length} student(s) · {selectedReportFields.length} field(s)
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={exportReportExcel}
                      className="px-3 py-1.5 rounded border border-emerald-500 bg-emerald-50/60 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      Export Excel
                    </button>
                    <button
                      type="button"
                      onClick={exportReportPdf}
                      className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      Export PDF
                    </button>
                  </div>
                </div>

                <div className="overflow-auto border border-slate-200 rounded-lg max-h-[45vh]">
                  <table className="min-w-full text-xs">
                    <thead className="bg-[#5c5987] text-white sticky top-0">
                      <tr>
                        {selectedReportFields.map((f) => (
                          <th
                            key={f.key}
                            className="px-2.5 py-2 text-left font-semibold whitespace-nowrap"
                          >
                            {f.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportStudents.map((s, idx) => (
                        <tr
                          key={s._id || idx}
                          className="border-t border-slate-100 hover:bg-slate-50"
                        >
                          {selectedReportFields.map((f) => (
                            <td
                              key={f.key}
                              className="px-2.5 py-1.5 whitespace-nowrap"
                            >
                              {String(f.get(s) ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {reportStudents.length === 0 && (
                        <tr>
                          <td
                            colSpan={selectedReportFields.length || 1}
                            className="px-3 py-6 text-center text-slate-500"
                          >
                            No students found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Small presentational components                                     */
/* ------------------------------------------------------------------ */

const NavDropdown = ({ label, open, onToggle, children }) => (
  <div className="relative inline-block">
    <button
      type="button"
      onClick={onToggle}
      className="px-2.5 py-1.5 rounded bg-white text-[#4834b8] hover:bg-indigo-50 font-medium border border-[#4834b8]/60 inline-flex items-center gap-1 cursor-pointer transition"
    >
      <span>{label}</span>
      <FiChevronDown className="w-3 h-3" />
    </button>
    {open && (
      <div
        className="absolute right-0 mt-1 w-60 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-50 text-[12px] text-slate-700"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    )}
  </div>
);

const chipTones = {
  emerald: "border-emerald-200 bg-emerald-50/70 text-emerald-700 hover:bg-emerald-100",
  indigo: "border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100",
  amber: "border-amber-200 bg-amber-50/70 text-amber-800 hover:bg-amber-100",
  sky: "border-sky-200 bg-sky-50/70 text-sky-700 hover:bg-sky-100",
  rose: "border-rose-200 bg-rose-50/70 text-rose-700 hover:bg-rose-100",
};

const Chip = ({ active, onClick, tone, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer transition ${chipTones[tone]} ${
      active ? "ring-2 ring-offset-1 ring-[#4834b8] shadow-2xs" : ""
    }`}
  >
    {children}
  </button>
);

const SortHeader = ({ label, active, asc, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1 select-none cursor-pointer text-white"
  >
    {label}
    <span className="text-[9px]">{active ? (asc ? "▲" : "▼") : "⇅"}</span>
  </button>
);

const SummaryCell = ({ label, value, tone = "slate" }) => (
  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/70">
    <span className="text-slate-400 block text-[10px] uppercase font-bold">{label}</span>
    <span
      className={`font-bold ${
        tone === "rose" ? "text-rose-700" : tone === "emerald" ? "text-emerald-700" : "text-slate-800"
      }`}
    >
      {value}
    </span>
  </div>
);

const DrawerSection = ({ title, children }) => (
  <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3 text-xs">
    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
      <span className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px]">
        {title}
      </span>
    </div>
    {children}
  </div>
);

const Detail = ({ label, value, mono, accent, tone }) => (
  <div>
    <span className="text-slate-400 block text-[10px] uppercase font-semibold">{label}</span>
    <span
      className={`mt-0.5 block break-words ${mono ? "font-mono font-semibold" : "font-semibold"} ${
        tone === "rose"
          ? "text-rose-700"
          : tone === "emerald"
            ? "text-emerald-700"
            : tone === "amber"
              ? "text-amber-700"
              : accent
                ? "text-[#4834b8]"
                : "text-slate-800"
      }`}
    >
      {value}
    </span>
  </div>
);

const Modal = ({ title, children, onClose, size = "max-w-lg" }) => (
  <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-slate-900/45" onClick={onClose} />
    <div
      className={`relative bg-white rounded-xl shadow-2xl w-full ${size} max-h-[92vh] overflow-y-auto`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-md hover:bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer"
          aria-label="Close"
        >
          <FiX />
        </button>
      </div>
      <div className="p-4">{children}</div>
    </div>
  </div>
);

export default Students;
