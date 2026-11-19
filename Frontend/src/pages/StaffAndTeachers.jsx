import { Fragment, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Briefcase,
  Check,
  Eye,
  GraduationCap,
  Mail,
  PenLine,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserMinus,
  Users,
  X,
} from "lucide-react";

const MODULES = [
  "Dashboard",
  "Students",
  "Registration",
  "Admission",
  "Classes & Subjects",
  "Staff & Teachers",
  "Access Control",
  "Attendance",
  "Leave Management",
  "Attendance Reports",
  "Timetable",
  "Syllabus",
  "Exams",
  "Homework",
  "School Diary",
  "Fee Management",
  "Payroll",
  "School Commerce",
  "Certificates",
  "Transport",
  "Library",
  "Hostel",
  "House Allocation",
  "Reports",
  "Settings",
];

const STEPS = [
  { n: 1, label: "Personal & Contact" },
  { n: 2, label: "Qualification & Status" },
  { n: 3, label: "Designation & Payroll" },
  { n: 4, label: "Role & Module Access" },
  { n: 5, label: "Review & Save" },
];

const REQUIRED_FIELDS = {
  1: ["name", "mobile", "governmentId"],
  2: ["qualification", "joined"],
  3: ["designation", "department"],
  4: ["role"],
};

const ROLE_OPTIONS = [
  { value: "principal_vice_principal", label: "Principal / Vice Principal (Teaching)", category: "Teaching" },
  { value: "teacher", label: "Teacher (Teaching)", category: "Teaching" },
  { value: "subject_teacher", label: "Subject Teacher (Teaching)", category: "Teaching" },
  { value: "academic_coordinator", label: "Academic Coordinator / HOD (Teaching)", category: "Teaching" },
  { value: "sports_activity_coach", label: "PTI / Sports & Activity Coach (Teaching)", category: "Teaching" },
  { value: "office_assistant", label: "Office Assistant / Clerk (Non-Teaching)", category: "Non-Teaching" },
  { value: "accountant", label: "Accountant / Fee Desk (Non-Teaching)", category: "Non-Teaching" },
  { value: "librarian", label: "Librarian (Non-Teaching)", category: "Non-Teaching" },
  { value: "admission_counselor", label: "Admission Counselor (Non-Teaching)", category: "Non-Teaching" },
  { value: "transport_manager", label: "Transport & Fleet Incharge (Non-Teaching)", category: "Non-Teaching" },
  { value: "hostel_warden", label: "Hostel Warden (Non-Teaching)", category: "Non-Teaching" },
  { value: "erp_admin", label: "IT & ERP Administrator (Non-Teaching)", category: "Non-Teaching" },
  { value: "support_staff", label: "Lab Attendant / Support Staff (Non-Teaching)", category: "Non-Teaching" },
];

const INITIAL_STAFF = [
  {
    code: "STF-020",
    name: "Mrs. Meenakshi Sharma",
    qualification: "M.Sc. Mathematics, B.Ed.",
    joined: "2026-04-01",
    category: "Teaching",
    role: "teacher",
    roleLabel: "Teacher",
    designation: "PGT Mathematics",
    modules: 13,
    extra: "",
    mobile: "9876500001",
    email: "meenakshi.sharma@taparia-vidhyalay.edu.in",
    scope: ["Ready for Subject Master"],
    scopeTone: "plain",
    status: "Active",
  },
  {
    code: "STF-001",
    name: "Mrs. Sunita Sharma",
    qualification: "M.A. (English), B.Ed.",
    joined: "2018-07-02",
    category: "Teaching",
    role: "teacher",
    roleLabel: "Teacher",
    designation: "PGT English",
    modules: 13,
    extra: "",
    mobile: "9414021001",
    email: "sunita.sharma@taparia-vidhyalay.edu.in",
    scope: ["CT: 10th A", "7 Subject Slots Assigned"],
    scopeTone: "class",
    status: "Active",
  },
  {
    code: "STF-002",
    name: "Mr. Arvind Joshi",
    qualification: "M.A. (English), B.Ed.",
    joined: "2020-07-15",
    category: "Teaching",
    role: "teacher",
    roleLabel: "Teacher",
    designation: "TGT English",
    modules: 13,
    extra: "",
    mobile: "9414021002",
    email: "arvind.joshi@taparia-vidhyalay.edu.in",
    scope: ["CT: 6th A, 8th B", "7 Subject Slots Assigned"],
    scopeTone: "class",
    status: "Active",
  },
  {
    code: "STF-003",
    name: "Pt. Rameshwar Dixit",
    qualification: "M.A. (Hindi), Acharya",
    joined: "2015-04-10",
    category: "Teaching",
    role: "academic_coordinator",
    roleLabel: "Academic Coordinator / HOD",
    designation: "PGT Hindi & Sanskrit",
    modules: 16,
    extra: "",
    mobile: "9414021003",
    email: "rameshwar.dixit@taparia-vidhyalay.edu.in",
    scope: ["CT: 7th B", "17 Subject Slots Assigned"],
    scopeTone: "class",
    status: "Active",
  },
  {
    code: "STF-004",
    name: "Acharya Vedprakash Shastri",
    qualification: "Vyakaranacharya, Shiksha Shastri",
    joined: "2012-07-01",
    category: "Teaching",
    role: "academic_coordinator",
    roleLabel: "Academic Coordinator / HOD · Hostel Warden",
    designation: "Varishth Sanskrit Acharya",
    modules: 17,
    extra: "",
    mobile: "9414021004",
    email: "vedprakash.shastri@taparia-vidhyalay.edu.in",
    scope: ["CT: 8th C, 11th C", "18 Subject Slots Assigned"],
    scopeTone: "class",
    status: "Active",
  },
  {
    code: "STF-005",
    name: "Mr. Vikram Singh Rathore",
    qualification: "M.Sc. (Mathematics), B.Ed.",
    joined: "2017-07-05",
    category: "Teaching",
    role: "subject_teacher",
    roleLabel: "Subject Teacher",
    designation: "PGT Mathematics",
    modules: 10,
    extra: "",
    mobile: "9414021005",
    email: "vikram.rathore@taparia-vidhyalay.edu.in",
    scope: ["CT: 10th B", "11 Subject Slots Assigned"],
    scopeTone: "class",
    status: "Active",
  },
  {
    code: "STF-006",
    name: "Mrs. Kavita Agarwal",
    qualification: "B.Sc., B.Ed.",
    joined: "2021-06-21",
    category: "Teaching",
    role: "teacher",
    roleLabel: "Teacher",
    designation: "TGT Mathematics",
    modules: 13,
    extra: "",
    mobile: "9414021006",
    email: "kavita.agarwal@taparia-vidhyalay.edu.in",
    scope: ["CT: 6th B, 8th A", "16 Subject Slots Assigned"],
    scopeTone: "class",
    status: "Active",
  },
  {
    code: "STF-007",
    name: "Dr. Mahendra Pareek",
    qualification: "Ph.D., M.Sc. (Physics), B.Ed.",
    joined: "2016-07-11",
    category: "Teaching",
    role: "teacher",
    roleLabel: "Teacher",
    designation: "PGT Physics",
    modules: 13,
    extra: "",
    mobile: "9414021007",
    email: "mahendra.pareek@taparia-vidhyalay.edu.in",
    scope: ["CT: 11th A", "13 Subject Slots Assigned"],
    scopeTone: "class",
    status: "Active",
  },
  {
    code: "STF-008",
    name: "Mr. Deepak Khandelwal",
    qualification: "M.Sc. (Chemistry), B.Ed.",
    joined: "2019-07-04",
    category: "Teaching",
    role: "subject_teacher",
    roleLabel: "Subject Teacher",
    designation: "PGT Chemistry",
    modules: 10,
    extra: "",
    mobile: "9414021008",
    email: "deepak.khandelwal@taparia-vidhyalay.edu.in",
    scope: ["CT: 12th A", "10 Subject Slots Assigned"],
    scopeTone: "class",
    status: "Active",
  },
  {
    code: "STF-009",
    name: "Dr. Anjali Choudhary",
    qualification: "Ph.D., M.Sc. (Botany), B.Ed.",
    joined: "2019-08-12",
    category: "Teaching",
    role: "subject_teacher",
    roleLabel: "Subject Teacher",
    designation: "PGT Biology & Biotech",
    modules: 10,
    extra: "",
    mobile: "9414021009",
    email: "anjali.choudhary@taparia-vidhyalay.edu.in",
    scope: ["14 Subject Slots Assigned"],
    scopeTone: "plain",
    status: "Active",
  },
  {
    code: "STF-010",
    name: "Mr. Manoj Kumar Saini",
    qualification: "M.Sc., B.Ed.",
    joined: "2022-04-04",
    category: "Teaching",
    role: "teacher",
    roleLabel: "Teacher",
    designation: "TGT General Science",
    modules: 13,
    extra: "",
    mobile: "9414021010",
    email: "manoj.saini@taparia-vidhyalay.edu.in",
    scope: ["CT: 7th A, 9th A", "9 Subject Slots Assigned"],
    scopeTone: "class",
    status: "Active",
  },
  {
    code: "STF-011",
    name: "Mr. Sanjay Taparia",
    qualification: "M.Com., B.Ed.",
    joined: "2014-07-01",
    category: "Teaching",
    role: "teacher",
    roleLabel: "Teacher",
    designation: "PGT Accountancy & BST",
    modules: 13,
    extra: "",
    mobile: "9414021011",
    email: "sanjay.taparia@taparia-vidhyalay.edu.in",
    scope: ["CT: 11th B", "16 Subject Slots Assigned"],
    scopeTone: "class",
    status: "Active",
  },
  {
    code: "STF-012",
    name: "Mrs. Priya Bhargava",
    qualification: "M.A. (Economics), B.Ed.",
    joined: "2020-07-09",
    category: "Teaching",
    role: "subject_teacher",
    roleLabel: "Subject Teacher",
    designation: "PGT Economics & SST",
    modules: 10,
    extra: "",
    mobile: "9414021012",
    email: "priya.bhargava@taparia-vidhyalay.edu.in",
    scope: ["CT: 9th B, 12th B", "17 Subject Slots Assigned"],
    scopeTone: "class",
    status: "Active",
  },
  {
    code: "STF-013",
    name: "Mr. Raghuveer Singh",
    qualification: "M.A. (History), B.Ed.",
    joined: "2016-07-18",
    category: "Teaching",
    role: "teacher",
    roleLabel: "Teacher",
    designation: "PGT History & Pol. Sci.",
    modules: 13,
    extra: "",
    mobile: "9414021013",
    email: "raghuveer.singh@taparia-vidhyalay.edu.in",
    scope: ["CT: 12th C", "17 Subject Slots Assigned"],
    scopeTone: "class",
    status: "Active",
  },
  {
    code: "STF-014",
    name: "Ms. Rekha Vyas",
    qualification: "M.A. (Geography), B.Ed.",
    joined: "2021-07-03",
    category: "Teaching",
    role: "subject_teacher",
    roleLabel: "Subject Teacher",
    designation: "PGT Geography & Arts",
    modules: 10,
    extra: "",
    mobile: "9414021014",
    email: "rekha.vyas@taparia-vidhyalay.edu.in",
    scope: ["24 Subject Slots Assigned"],
    scopeTone: "plain",
    status: "Active",
  },
  {
    code: "STF-015",
    name: "Mr. Rohitashva Verma",
    qualification: "M.C.A., B.Ed.",
    joined: "2020-01-10",
    category: "Teaching",
    role: "subject_teacher",
    roleLabel: "Subject Teacher",
    designation: "PGT Computer Science & IP",
    modules: 11,
    extra: "+1 extra",
    mobile: "9414021015",
    email: "rohitashva.verma@taparia-vidhyalay.edu.in",
    scope: ["CT: 9th C", "13 Subject Slots Assigned"],
    scopeTone: "class",
    status: "Active",
  },
  {
    code: "STF-016",
    name: "Mr. Rajendra Poonia",
    qualification: "M.P.Ed.",
    joined: "2018-04-15",
    category: "Teaching",
    role: "sports_activity_coach",
    roleLabel: "PTI / Sports & Activity Coach · Hostel Warden",
    designation: "PTI & Physical Education",
    modules: 8,
    extra: "",
    mobile: "9414021016",
    email: "rajendra.poonia@taparia-vidhyalay.edu.in",
    scope: ["7 Subject Slots Assigned"],
    scopeTone: "plain",
    status: "Active",
  },
  {
    code: "STF-017",
    name: "Mr. Pankaj Sharma",
    qualification: "B.Com., RSCIT",
    joined: "2019-04-01",
    category: "Non-Teaching",
    role: "office_assistant",
    roleLabel: "Office Assistant / Clerk",
    designation: "Office Assistant & ERP Coordinator",
    modules: 10,
    extra: "+2 extra",
    mobile: "9414021017",
    email: "pankaj.office@taparia-vidhyalay.edu.in",
    scope: ["Main Office & Admissions Desk", "Full Day (08:00 AM - 04:00 PM)"],
    scopeTone: "plain",
    status: "Active",
  },
  {
    code: "STF-018",
    name: "Mr. Mohan Lal Jangid",
    qualification: "M.Com.",
    joined: "2015-07-01",
    category: "Non-Teaching",
    role: "accountant",
    roleLabel: "Accountant / Fee Desk",
    designation: "Senior Accountant",
    modules: 6,
    extra: "",
    mobile: "9414021018",
    email: "accounts@taparia-vidhyalay.edu.in",
    scope: ["Accounts & Fee Desk", "Full Day (08:00 AM - 04:00 PM)"],
    scopeTone: "plain",
    status: "Active",
  },
  {
    code: "STF-019",
    name: "Mrs. Geeta Devi",
    qualification: "B.Lib.Sc.",
    joined: "2022-07-12",
    category: "Non-Teaching",
    role: "librarian",
    roleLabel: "Librarian",
    designation: "Librarian",
    modules: 4,
    extra: "",
    mobile: "9414021019",
    email: "library@taparia-vidhyalay.edu.in",
    scope: ["Central Library & Reading Room", "Morning (08:00 AM - 02:30 PM)"],
    scopeTone: "plain",
    status: "Active",
  },
];

const EMPTY_FORM = {
  name: "",
  dob: "",
  gender: "Male",
  mobile: "",
  email: "",
  governmentId: "",
  qualification: "",
  status: "Active",
  joined: new Date().toISOString().slice(0, 10),
  designation: "",
  department: "",
  payroll: "",
  category: "Teaching",
  role: "teacher",
};

function Modal({ title, subtitle, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl shadow-xl w-full ${wide ? "max-w-3xl" : "max-w-lg"} overflow-hidden`}>
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

const FieldLabel = ({ text }) => {
  const parts = String(text).split("*");
  return (
    <label className="block font-semibold text-slate-700 mb-1">
      {parts[0]}
      {parts.length > 1 && <span className="text-rose-600"> *</span>}
    </label>
  );
};

function StatCard({ label, value, note, tone, icon }) {
  const tones = {
    indigo: { text: "text-slate-900", label: "text-slate-500", icon: "bg-indigo-50 text-[#4834b8]" },
    emerald: { text: "text-emerald-700", label: "text-emerald-700", icon: "bg-emerald-50 text-emerald-700" },
    sky: { text: "text-sky-700", label: "text-sky-700", icon: "bg-sky-50 text-sky-700" },
    amber: { text: "text-amber-700", label: "text-amber-700", icon: "bg-amber-50 text-amber-700" },
  };
  const c = tones[tone];
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
      <div>
        <div className={`text-[11px] font-semibold uppercase tracking-wide ${c.label}`}>{label}</div>
        <div className={`text-2xl font-bold mt-1 font-mono tabular-nums ${c.text}`}>{value}</div>
        <div className="text-[11px] text-slate-500 mt-0.5">{note}</div>
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.icon}`}>{icon}</div>
    </div>
  );
}

const StaffAndTeachers = () => {
  const navigate = useNavigate();
  const [staff, setStaff] = useState(INITIAL_STAFF);
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [role, setRole] = useState("ALL");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [step, setStep] = useState(1);
  const [formModules, setFormModules] = useState(MODULES.slice(0, 4));
  const [accessChecked, setAccessChecked] = useState([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return staff.filter((s) => {
      if (category !== "All" && s.category !== category) return false;
      if (status !== "All" && s.status !== status) return false;
      if (role !== "ALL" && s.role !== role) return false;
      if (!q) return true;
      return [s.name, s.code, s.roleLabel, s.designation, s.mobile, s.email]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [staff, category, status, role, query]);

  const teachingCount = staff.filter((s) => s.category === "Teaching" && s.status === "Active").length;
  const nonTeachingCount = staff.filter((s) => s.category === "Non-Teaching").length;
  const inactiveCount = staff.filter((s) => s.status !== "Active").length;

  const filled = (key) => String(form[key] ?? "").trim().length > 0;
  const stepValid =
    (REQUIRED_FIELDS[step] || []).every(filled) &&
    (step !== 4 || formModules.length > 0);
  const allRequiredValid =
    Object.values(REQUIRED_FIELDS).every((keys) => keys.every(filled)) &&
    formModules.length > 0;

  const openForm = (member) => {
    if (member) {
      setForm({
        ...EMPTY_FORM,
        name: member.name,
        qualification: member.qualification,
        category: member.category,
        role: member.role,
        designation: member.designation,
        mobile: member.mobile,
        email: member.email,
        joined: member.joined,
        status: member.status,
        department: member.designation,
        payroll: member.code,
      });
      setFormModules(MODULES.slice(0, member.modules));
    } else {
      setForm(EMPTY_FORM);
      setFormModules(MODULES.slice(0, 4));
    }
    setStep(1);
    setModal({ type: member ? "edit" : "add", member });
  };

  const openAccess = (member) => {
    setAccessChecked(MODULES.slice(0, member.modules));
    setModal({ type: "access", member });
  };

  const toggleAccess = (moduleName) => {
    setAccessChecked((prev) =>
      prev.includes(moduleName) ? prev.filter((m) => m !== moduleName) : [...prev, moduleName],
    );
  };

  const toggleFormModule = (moduleName) => {
    setFormModules((prev) =>
      prev.includes(moduleName) ? prev.filter((m) => m !== moduleName) : [...prev, moduleName],
    );
  };

  const fillDummyData = () => {
    setForm({
      name: "Mrs. Meenakshi Sharma",
      dob: "1990-04-15",
      gender: "Female",
      mobile: "9876500001",
      email: "meenakshi.sharma@taparia-vidhyalay.edu.in",
      governmentId: "AADHAAR-1234-5678",
      qualification: "M.Sc. Mathematics, B.Ed.",
      status: "Active",
      joined: "2026-04-01",
      designation: "PGT Mathematics",
      department: "Mathematics",
      payroll: "STF-020",
      category: "Teaching",
      role: "teacher",
    });
    setFormModules(MODULES.slice(0, 13));
  };

  const saveForm = () => {
    if (!form.name.trim() || !form.mobile.trim()) return;
    const roleOption = ROLE_OPTIONS.find((r) => r.value === form.role);
    const payload = {
      ...form,
      name: form.name.trim(),
      mobile: form.mobile.trim(),
      email: form.email.trim(),
      roleLabel: roleOption
        ? roleOption.label.replace(/\s*\((Teaching|Non-Teaching)\)\s*$/, "")
        : form.role,
      scope: [form.department ? `${form.department} · Ready for Subject Master` : "Ready for Subject Master"],
      scopeTone: "plain",
      status: form.status || "Active",
      modules: formModules.length,
      extra: "",
    };

    if (modal?.type === "edit" && modal.member) {
      setStaff((prev) =>
        prev.map((s) => (s.code === modal.member.code ? { ...s, ...payload } : s)),
      );
    } else {
      const nextNum = Math.max(...staff.map((s) => Number(s.code.replace(/\D/g, "")) || 0)) + 1;
      setStaff((prev) => [
        { ...payload, code: `STF-${String(nextNum).padStart(3, "0")}` },
        ...prev,
      ]);
    }
    setModal(null);
  };

  const toggleStatus = (code) => {
    setStaff((prev) =>
      prev.map((s) =>
        s.code === code ? { ...s, status: s.status === "Active" ? "Inactive" : "Active" } : s,
      ),
    );
  };

  const removeStaff = (code) => {
    setStaff((prev) => prev.filter((s) => s.code !== code));
    setModal(null);
  };

  const moduleTabClass = (active, primary = false) =>
    `px-3 py-1 rounded-md font-semibold transition cursor-pointer whitespace-nowrap ${
      active
        ? primary
          ? "bg-[#4834b8] text-white"
          : "bg-slate-800 text-white"
        : "text-slate-600 hover:text-slate-900"
    }`;

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#4834b8]" />
            <h2 className="text-lg font-bold text-slate-900">
              Staff Panel &amp; Role-Based Access Directory
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Onboard <span className="font-semibold text-[#4834b8]">Teaching</span> and{" "}
            <span className="font-semibold text-slate-700">Non-Teaching</span> staff with predefined
            roles, auto-assigned ERP modules, and flexible overrides. Subject &amp; section mapping stays
            cleanly inside <span className="font-semibold text-slate-700">Subjects &amp; Groups</span>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/school/access-control")}
            className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition whitespace-nowrap"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#4834b8]" />
            <span>Role Permissions</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/school/teachers-assignment")}
            className="px-3.5 py-2 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-[#4834b8] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Assign Subject Teachers</span>
          </button>
          <button
            type="button"
            onClick={() => openForm(null)}
            className="px-4 py-2 rounded-lg bg-[#4834b8] hover:bg-[#3a289c] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Staff Roster"
          value={staff.length}
          note="All registered employees"
          tone="indigo"
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          label="Active Teaching Faculty"
          value={teachingCount}
          note="Synced to Subject Teacher dropdowns"
          tone="emerald"
          icon={<GraduationCap className="w-5 h-5" />}
        />
        <StatCard
          label="Non-Teaching Staff"
          value={nonTeachingCount}
          note="Office, Accounts, Library & Support"
          tone="sky"
          icon={<Briefcase className="w-5 h-5" />}
        />
        <StatCard
          label="Inactive / On Leave"
          value={inactiveCount}
          note="Excluded from new teacher assignments"
          tone="amber"
          icon={<UserMinus className="w-5 h-5" />}
        />
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button type="button" className={moduleTabClass(category === "All", true)} onClick={() => setCategory("All")}>
              All Categories ({staff.length})
            </button>
            <button type="button" className={moduleTabClass(category === "Teaching")} onClick={() => setCategory("Teaching")}>
              Teaching
            </button>
            <button type="button" className={moduleTabClass(category === "Non-Teaching")} onClick={() => setCategory("Non-Teaching")}>
              Non-Teaching
            </button>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button type="button" className={moduleTabClass(status === "All")} onClick={() => setStatus("All")}>
              All
            </button>
            <button type="button" className={moduleTabClass(status === "Active")} onClick={() => setStatus("Active")}>
              Active
            </button>
            <button type="button" className={moduleTabClass(status === "Inactive")} onClick={() => setStatus("Inactive")}>
              Inactive
            </button>
          </div>
          <select
            aria-label="Filter by staff role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:outline-none focus:border-[#4834b8]"
          >
            <option value="ALL">All Staff Roles</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, code, role, mobile..."
            aria-label="Search staff directory"
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-[#4834b8]"
          />
        </div>
      </div>

      {/* Directory */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70">
          <div className="text-xs font-bold text-slate-800">Staff Directory ({filtered.length} shown)</div>
          <div className="text-[11px] text-slate-500">
            Predefined role assigns ERP modules automatically · Click{" "}
            <span className="font-semibold text-[#4834b8]">Manage Access</span> on any row to add or
            customize modules
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#5c5987] text-white font-semibold">
                <th className="py-2.5 px-3">Code</th>
                <th className="py-2.5 px-3">Staff Name &amp; Qualification</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Role &amp; Designation</th>
                <th className="py-2.5 px-3">Module Access</th>
                <th className="py-2.5 px-3">Contact</th>
                <th className="py-2.5 px-3">Class / Work Scope</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((s) => (
                <tr key={s.code} className="hover:bg-indigo-50/30 transition">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-700 whitespace-nowrap tabular-nums">
                    {s.code}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-slate-900">{s.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {s.qualification} · Joined {s.joined}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap text-[11px] font-semibold">
                    <span className={s.category === "Teaching" ? "text-[#4834b8]" : "text-slate-700"}>
                      {s.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-900">{s.roleLabel}</div>
                    <div className="text-[11px] text-slate-500">{s.designation}</div>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="font-mono font-semibold text-slate-800 tabular-nums">
                      {s.modules}/25 Modules{s.extra ? ` ${s.extra}` : ""}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10.5px]">
                      <button
                        type="button"
                        onClick={() => openAccess(s)}
                        className="text-[#4834b8] font-semibold hover:underline cursor-pointer"
                      >
                        Manage Access
                      </button>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1 font-mono text-slate-800 tabular-nums">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{s.mobile}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10.5px] text-slate-500 mt-0.5">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span className="truncate max-w-[175px]">{s.email}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="space-y-0.5 text-[11px]">
                      {s.scope.map((line, i) => (
                        <div
                          key={line}
                          className={
                            s.scopeTone === "class" && i === 0
                              ? "font-semibold text-amber-800"
                              : s.scopeTone === "class" && i === 1
                                ? "font-semibold text-emerald-700 font-mono tabular-nums"
                                : "text-slate-500"
                          }
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap text-[11px] font-bold">
                    <span className={s.status === "Active" ? "text-emerald-700" : "text-amber-700"}>
                      {s.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        title={`View details for ${s.name}`}
                        aria-label={`View details for ${s.name}`}
                        onClick={() => setModal({ type: "view", member: s })}
                        className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title={`Edit ${s.name}`}
                        aria-label={`Edit ${s.name}`}
                        onClick={() => openForm(s)}
                        className="p-1.5 rounded border border-slate-200 bg-white hover:bg-indigo-50 text-slate-600 hover:text-[#4834b8] cursor-pointer"
                      >
                        <PenLine className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title={`Mark ${s.name} ${s.status === "Active" ? "Inactive" : "Active"}`}
                        aria-label={`Mark ${s.name} ${s.status === "Active" ? "Inactive" : "Active"}`}
                        onClick={() => toggleStatus(s.code)}
                        className="p-1.5 rounded border bg-white cursor-pointer border-amber-200 text-amber-700 hover:bg-amber-50"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title={`Remove ${s.name}`}
                        aria-label={`Remove ${s.name}`}
                        onClick={() => setModal({ type: "delete", member: s })}
                        className="p-1.5 rounded border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    No staff members match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role permissions modal */}
      {modal?.type === "roles" && (
        <Modal
          title="Role Permissions"
          subtitle="Predefined ERP module access assigned automatically to each staff role."
          onClose={() => setModal(null)}
          wide
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MODULES.map((m) => (
              <div
                key={m}
                className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2 text-xs"
              >
                <span className="font-medium text-slate-700">{m}</span>
                <span className="text-[10px] font-mono text-[#4834b8]">Auto</span>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Manage access modal */}
      {modal?.type === "access" && (
        <Modal
          title={`Manage Access — ${modal.member.name}`}
          subtitle={`${modal.member.roleLabel} · ${modal.member.code}`}
          onClose={() => setModal(null)}
          wide
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MODULES.map((m) => {
              const checked = accessChecked.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleAccess(m)}
                  className={`flex items-center justify-between border rounded-lg px-3 py-2 text-xs cursor-pointer transition ${
                    checked
                      ? "border-indigo-200 bg-indigo-50 text-[#4834b8]"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="font-medium">{m}</span>
                  {checked && <Check className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              {accessChecked.length}/{MODULES.length} modules selected
            </span>
            <button
              type="button"
              onClick={() => {
                setStaff((prev) =>
                  prev.map((s) =>
                    s.code === modal.member.code
                      ? { ...s, modules: accessChecked.length, extra: "" }
                      : s,
                  ),
                );
                setModal(null);
              }}
              className="px-4 py-2 rounded-lg bg-[#4834b8] hover:bg-[#3a289c] text-white text-xs font-bold cursor-pointer"
            >
              Save Access
            </button>
          </div>
        </Modal>
      )}

      {/* Add / edit staff modal — 5-step onboarding nav */}
      {(modal?.type === "add" || modal?.type === "edit") && (
        <Modal
          title={
            modal.type === "edit"
              ? `Edit Staff Member — ${modal.member.name}`
              : "Add New Staff Member"
          }
          subtitle="Personal details, predefined role & automatic ERP module access"
          onClose={() => setModal(null)}
          wide
        >
          <div className="-mx-5 -mt-5 mb-5 px-5 pt-4 pb-3 border-b border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-[#4834b8]">
                Step {step} of 5 · {STEPS[step - 1].label} ({step * 20}%)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fillDummyData}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-[10px] font-semibold cursor-pointer"
                >
                  Fill dummy data
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      category: p.category === "Teaching" ? "Non-Teaching" : "Teaching",
                    }))
                  }
                  className="px-2.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-[#4834b8] text-[10px] font-bold cursor-pointer"
                >
                  {form.category === "Teaching" ? "Teaching Staff" : "Non-Teaching Staff"}
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-start">
              {STEPS.map((s, i) => (
                <div key={s.n} className="flex-1 relative flex flex-col items-center">
                  {i > 0 && (
                    <span
                      className={`absolute top-3.5 right-1/2 h-px w-1/2 ${
                        i <= step - 1 ? "bg-[#4834b8]" : "bg-slate-200"
                      }`}
                    />
                  )}
                  {i < 4 && (
                    <span
                      className={`absolute top-3.5 left-1/2 h-px w-1/2 ${
                        i + 1 <= step - 1 ? "bg-[#4834b8]" : "bg-slate-200"
                      }`}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setStep(s.n)}
                    className="relative z-10 flex flex-col items-center gap-1 cursor-pointer"
                  >
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ${
                        s.n < step
                          ? "bg-[#4834b8] text-white"
                          : s.n === step
                            ? "bg-[#4834b8] text-white ring-4 ring-indigo-100"
                            : "bg-white border border-slate-300 text-slate-500"
                      }`}
                    >
                      {s.n < step ? <Check className="w-3.5 h-3.5" /> : s.n}
                    </span>
                    <span
                      className={`text-[9.5px] leading-tight text-center max-w-[100px] ${
                        s.n === step ? "font-bold text-[#4834b8]" : "text-slate-500"
                      }`}
                    >
                      {s.label}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 text-xs">
            {step === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: "name", label: "Full Name *", placeholder: "e.g. Mrs. Meenakshi Sharma" },
                  { key: "dob", label: "Date of Birth", placeholder: "", type: "date" },
                  { key: "mobile", label: "Phone *", placeholder: "10-digit mobile number", maxLength: 10 },
                  { key: "email", label: "Email", placeholder: "name@school.edu.in" },
                  { key: "governmentId", label: "Government ID *", placeholder: "Aadhaar / PAN number" },
                ].map((f) => (
                  <div key={f.key}>
                    <FieldLabel text={f.label} />
                    <input
                      type={f.type || "text"}
                      value={form[f.key] || ""}
                      maxLength={f.maxLength}
                      placeholder={f.placeholder}
                      onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#4834b8]"
                    />
                  </div>
                ))}
                <div>
                  <FieldLabel text="Gender" />
                  <select
                    value={form.gender}
                    onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#4834b8]"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: "qualification", label: "Qualification *", placeholder: "e.g. M.Sc. Mathematics, B.Ed." },
                  { key: "joined", label: "Joining Date *", placeholder: "", type: "date" },
                ].map((f) => (
                  <div key={f.key}>
                    <FieldLabel text={f.label} />
                    <input
                      type={f.type || "text"}
                      value={form[f.key] || ""}
                      placeholder={f.placeholder}
                      onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#4834b8]"
                    />
                  </div>
                ))}
                <div>
                  <FieldLabel text="Status" />
                  <select
                    value={form.status}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#4834b8]"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <FieldLabel text="Category" />
                  <select
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#4834b8]"
                  >
                    <option value="Teaching">Teaching</option>
                    <option value="Non-Teaching">Non-Teaching</option>
                  </select>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: "designation", label: "Designation *", placeholder: "e.g. PGT Mathematics" },
                  { key: "department", label: "Department / Work Scope *", placeholder: "e.g. Mathematics" },
                  { key: "payroll", label: "Payroll Code", placeholder: "e.g. STF-020" },
                ].map((f) => (
                  <div key={f.key}>
                    <FieldLabel text={f.label} />
                    <input
                      type="text"
                      value={form[f.key] || ""}
                      placeholder={f.placeholder}
                      onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#4834b8]"
                    />
                  </div>
                ))}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <div>
                  <FieldLabel text="Predefined Role *" />
                  <select
                    value={form.role}
                    onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#4834b8]"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <FieldLabel text="ERP Module Access *" />
                    <span className="text-[10px] font-mono text-[#4834b8]">
                      {formModules.length}/{MODULES.length} selected
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {MODULES.map((m) => {
                      const checked = formModules.includes(m);
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => toggleFormModule(m)}
                          className={`flex items-center justify-between px-2 py-1.5 rounded border text-[10px] cursor-pointer transition ${
                            checked
                              ? "border-indigo-200 bg-indigo-50 text-[#4834b8] font-semibold"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <span className="truncate">{m}</span>
                          {checked && <Check className="w-3 h-3 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["Full Name", form.name],
                  ["Phone", form.mobile],
                  ["Email", form.email],
                  ["Government ID", form.governmentId],
                  ["Qualification", form.qualification],
                  ["Joining Date", form.joined],
                  ["Designation", form.designation],
                  ["Department", form.department],
                  ["Category", form.category],
                  ["Status", form.status],
                  ["Module Access", `${formModules.length}/${MODULES.length} Modules`],
                ].map(([k, v]) => (
                  <div key={k} className="border border-slate-200 rounded-lg p-2.5">
                    <div className="text-[9px] uppercase font-bold text-slate-400">{k}</div>
                    <div className="font-semibold text-slate-800 mt-0.5 break-words">{v || "—"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setModal(null)}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <div className="flex items-center gap-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Back
                </button>
              )}
              {step < 5 ? (
                <button
                  type="button"
                  disabled={!stepValid}
                  onClick={() => setStep((s) => Math.min(5, s + 1))}
                  className={`px-4 py-2 rounded-lg text-white text-xs font-bold ${
                    stepValid
                      ? "bg-[#4834b8] hover:bg-[#3a289c] cursor-pointer"
                      : "bg-slate-300 cursor-not-allowed"
                  }`}
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!allRequiredValid}
                  onClick={saveForm}
                  className={`px-4 py-2 rounded-lg text-white text-xs font-bold ${
                    allRequiredValid
                      ? "bg-[#4834b8] hover:bg-[#3a289c] cursor-pointer"
                      : "bg-slate-300 cursor-not-allowed"
                  }`}
                >
                  {modal.type === "edit" ? "Save Changes" : "Save Staff Member"}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirmation dialog */}
      {modal?.type === "delete" && (
        <Modal
          title="Delete Staff Member"
          subtitle="This action cannot be undone."
          onClose={() => setModal(null)}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Are you sure you want to delete{" "}
              <span className="font-bold text-slate-900">{modal.member.name}</span>{" "}
              (<span className="font-mono font-semibold text-slate-600">{modal.member.code}</span>){" "}
              from the Staff Directory? Their role and module access will be removed as well.
            </p>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModal(null)}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => removeStaff(modal.member.code)}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
            >
              Delete Staff Member
            </button>
          </div>
        </Modal>
      )}

      {/* View details modal */}
      {modal?.type === "view" && (
        <Modal
          title={modal.member.name}
          subtitle={`${modal.member.code} · ${modal.member.roleLabel}`}
          onClose={() => setModal(null)}
        >
          <dl className="grid grid-cols-2 gap-3 text-xs">
            {[
              ["Category", modal.member.category],
              ["Designation", modal.member.designation],
              ["Qualification", modal.member.qualification],
              ["Joined", modal.member.joined],
              ["Module Access", `${modal.member.modules}/25 Modules${modal.member.extra ? ` ${modal.member.extra}` : ""}`],
              ["Mobile", modal.member.mobile],
              ["Email", modal.member.email],
              ["Status", modal.member.status],
              ["Class / Work Scope", modal.member.scope.join(" · ")],
            ].map(([k, v]) => (
              <div key={k} className="border border-slate-200 rounded-lg p-2.5">
                <dt className="text-[10px] uppercase font-bold text-slate-400">{k}</dt>
                <dd className="font-semibold text-slate-800 mt-0.5 break-words">{v}</dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}
    </div>
  );
};

export default StaffAndTeachers;
