import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Eye,
  Plus,
  RotateCcw,
  Search,
  Shield,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

const ROLES = [
  { name: "School Admin", modules: 25, total: 25, category: "Admin", actions: 125, description: "Full school-wide administrator access to every ERP module and action." },
  { name: "Principal / Vice Principal", modules: 25, total: 25, category: "Teaching", actions: 88, description: "Complete academic and administrative oversight with focused teaching controls." },
  { name: "Teacher", modules: 13, total: 25, category: "Teaching", actions: 42, description: "Classroom teacher with attendance, timetable, syllabus, homework, exams, certificates & parent notices." },
  { name: "Subject Teacher", modules: 10, total: 25, category: "Teaching", actions: 27, description: "Subject-level access for lesson planning, marks entry and homework." },
  { name: "Academic Coordinator / HOD", modules: 16, total: 25, category: "Teaching", actions: 63, description: "Department head access to curriculum, exams, teachers and academic reports." },
  { name: "PTI / Sports & Activity Coach", modules: 7, total: 25, category: "Teaching", actions: 19, description: "Sports, physical education and activity management access." },
  { name: "Office Assistant / Clerk", modules: 8, total: 25, category: "Non-Teaching", actions: 26, description: "Front-office records, admissions support and daily school operations." },
  { name: "Accountant / Fee Desk", modules: 6, total: 25, category: "Non-Teaching", actions: 19, description: "Fee collection, receipts, dues and account ledger access." },
  { name: "Librarian", modules: 4, total: 25, category: "Non-Teaching", actions: 12, description: "Library catalog, book issue/return and overdue register access." },
  { name: "Admission Counselor", modules: 5, total: 25, category: "Non-Teaching", actions: 14, description: "Lead management, enquiry follow-ups and admission form access." },
  { name: "Transport & Fleet Incharge", modules: 4, total: 25, category: "Non-Teaching", actions: 13, description: "Bus routes, stops, drivers and vehicle log management access." },
  { name: "Hostel Warden", modules: 5, total: 25, category: "Non-Teaching", actions: 18, description: "Hostel rooms, boarders, mess roster and gate pass access." },
  { name: "IT & ERP Administrator", modules: 25, total: 25, category: "Non-Teaching", actions: 125, description: "Technical administrator with full ERP configuration and audit access." },
  { name: "Lab Attendant / Support Staff", modules: 3, total: 25, category: "Non-Teaching", actions: 9, description: "Inventory and basic support-module access." },
];

const MODULE_ACCESS = [
  { id: "student_management", name: "Student Management", category: "Academics", description: "Student directory, profiles, status updates, progression & class records.", access: [1, 0, 1, 0, 1] },
  { id: "admissions_registrations", name: "Admissions & Registrations", category: "Finance & Admin", description: "Inquiry leads, admission forms, entrance verification & follow-ups.", access: [0, 0, 0, 0, 0] },
  { id: "classes_sections", name: "Classes & Sections", category: "Academics", description: "Class structure, sections, capacity, streams & class teacher setup.", access: [1, 0, 0, 0, 0] },
  { id: "subjects_groups", name: "Subjects & Groups", category: "Academics", description: "Subject master, common/stream compulsory & optional elective groups.", access: [1, 0, 0, 0, 0] },
  { id: "staff_management", name: "Staff & Teacher Management", category: "Administration", description: "Teaching and non-teaching staff directory, onboarding & credentials.", access: [0, 0, 0, 0, 0] },
  { id: "access_control", name: "Access Control & Roles", category: "Administration", description: "Role definitions and granular view/create/edit/delete/export permissions.", access: [0, 0, 0, 0, 0] },
  { id: "attendance", name: "Attendance", category: "Academics", description: "Daily student & staff attendance marking, leaves & monthly summaries.", access: [1, 1, 1, 0, 1] },
  { id: "timetable", name: "Timetable", category: "Academics", description: "Section-wise period schedules, teacher substitution & bell timings.", access: [1, 0, 0, 0, 0] },
  { id: "syllabus", name: "Syllabus", category: "Academics", description: "Term-wise curriculum units, chapter progress & lesson plans.", access: [1, 1, 1, 0, 1] },
  { id: "exam_management", name: "Exam Management", category: "Academics", description: "Exam schedules, marks entry, grade sheets & result publication.", access: [1, 1, 1, 0, 1] },
  { id: "homework", name: "Homework", category: "Academics", description: "Daily class homework publishing and submission verification.", access: [1, 1, 1, 1, 1] },
  { id: "assignments", name: "Assignments", category: "Academics", description: "Subject projects, practical assignments & rubric grading.", access: [1, 1, 1, 1, 1] },
  { id: "diary", name: "Diary", category: "Academics", description: "Digital student diary notes and teacher-parent daily remarks.", access: [1, 1, 1, 1, 1] },
  { id: "certificates", name: "Certificates", category: "Finance & Admin", description: "Bonafide, Character, Transfer Certificate (TC) & Migration issuance.", access: [1, 1, 0, 0, 1] },
  { id: "fee_management", name: "Fee Management", category: "Finance & Admin", description: "Fee slabs, receipt collection, dues tracking & concession approvals.", access: [0, 0, 0, 0, 0] },
  { id: "payroll_accounts", name: "Payroll & Accounts", category: "Finance & Admin", description: "Monthly staff salary sheets, vouchers & institutional ledger.", access: [0, 0, 0, 0, 0] },
  { id: "commerce_suite", name: "School Commerce Suite", category: "Finance & Admin", description: "Uniform, books, stationery counter billing & stock reconciliation.", access: [0, 0, 0, 0, 0] },
  { id: "transport_management", name: "Transport Management", category: "Operations", description: "Bus routes, stop allocations, driver rosters & vehicle logs.", access: [0, 0, 0, 0, 0] },
  { id: "bus_gps", name: "Bus GPS Tracking", category: "Operations", description: "Live route status, trip alerts & pickup/drop verification.", access: [0, 0, 0, 0, 0] },
  { id: "hostel_management", name: "Hostel Management", category: "Operations", description: "Hostel rooms, mess roster, warden duty log & boarder gate passes.", access: [0, 0, 0, 0, 0] },
  { id: "library", name: "Library", category: "Operations", description: "Book catalog, barcode issue/return & overdue fine register.", access: [0, 0, 0, 0, 0] },
  { id: "house_allocation", name: "House Allocation", category: "Operations", description: "Student house allotment, inter-house events & points tally.", access: [0, 0, 0, 0, 0] },
  { id: "inventory_assets", name: "Inventory & Assets", category: "Operations", description: "Lab equipment, furniture stock, procurement & maintenance logs.", access: [0, 0, 0, 0, 0] },
  { id: "notices_communication", name: "Notices & Communication", category: "Academics", description: "School circulars, SMS/WhatsApp alerts, calendar & event announcements.", access: [1, 1, 1, 0, 1] },
  { id: "reports_analytics", name: "Reports & Analytics", category: "Finance & Admin", description: "Optional subject student lists, class strength & exportable registers.", access: [1, 0, 0, 0, 1] },
];

const ACTION_LABELS = ["View", "Create", "Edit", "Delete", "Export"];

const STAFF = [
  ["STF-020", "Mrs. Meenakshi Sharma", "Teacher", true],
  ["STF-001", "Mrs. Sunita Sharma", "Teacher", true],
  ["STF-002", "Mr. Arvind Joshi", "Teacher", false],
  ["STF-003", "Pt. Rameshwar Dixit", "Academic Coordinator / HOD", true],
  ["STF-004", "Acharya Vedprakash Shastri", "Academic Coordinator / HOD", false],
  ["STF-005", "Mr. Vikram Singh Rathore", "Subject Teacher", false],
  ["STF-006", "Mrs. Kavita Agarwal", "Teacher", false],
  ["STF-007", "Dr. Mahendra Pareek", "Teacher", false],
  ["STF-008", "Mr. Deepak Khandelwal", "Subject Teacher", false],
  ["STF-009", "Dr. Anjali Choudhary", "Subject Teacher", false],
  ["STF-010", "Mr. Manoj Kumar Saini", "Teacher", false],
  ["STF-011", "Mr. Sanjay Taparia", "Teacher", false],
  ["STF-012", "Mrs. Priya Bhargava", "Subject Teacher", false],
  ["STF-013", "Mr. Raghuveer Singh", "Teacher", false],
  ["STF-014", "Ms. Rekha Vyas", "Subject Teacher", false],
  ["STF-015", "Mr. Rohitashva Verma", "Subject Teacher", true],
  ["STF-016", "Mr. Rajendra Poonia", "PTI / Sports & Activity Coach", false],
  ["STF-017", "Mr. Pankaj Sharma", "Office Assistant / Clerk", false],
  ["STF-018", "Mr. Mohan Lal Jangid", "Accountant / Fee Desk", false],
  ["STF-019", "Mrs. Geeta Devi", "Librarian", false],
];

const LEVELS = {
  Full: [1, 1, 1, 1, 1],
  Std: [1, 1, 1, 0, 1],
  View: [1, 0, 0, 0, 0],
  Off: [0, 0, 0, 0, 0],
};

const effectiveLabel = (a) => {
  if (a.every((v) => !v)) return "No Access";
  if (a.every((v) => v)) return "Full Access";
  if (a[0] && !a[1] && !a[2] && !a[3] && !a[4]) return "View Only";
  return a
    .map((v, i) => (v ? ACTION_LABELS[i] : null))
    .filter(Boolean)
    .join(" · ");
};

const defaultMatrixFor = (role) => {
  if ((role.baseRole || role.name) === "Teacher") {
    return MODULE_ACCESS.reduce((acc, m) => ({ ...acc, [m.id]: [...m.access] }), {});
  }
  return MODULE_ACCESS.reduce((acc, m, i) => {
    const on = i < role.modules;
    const base =
      role.category === "Admin"
        ? [1, 1, 1, 1, 1]
        : role.category === "Teaching"
          ? [1, 1, 1, 0, 1]
          : [1, 0, 0, 0, 0];
    return { ...acc, [m.id]: on ? [...base] : [0, 0, 0, 0, 0] };
  }, {});
};

const AccessControlRbac = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("roles");
  const [roleFilter, setRoleFilter] = useState("All");
  const [selectedRoleName, setSelectedRoleName] = useState("Teacher");
  const [moduleFilter, setModuleFilter] = useState("All");
  const [moduleQuery, setModuleQuery] = useState("");
  const [roles, setRoles] = useState(ROLES);
  const [matrix, setMatrix] = useState(() => defaultMatrixFor(ROLES[2]));
  const [createOpen, setCreateOpen] = useState(false);
  const [newRole, setNewRole] = useState({
    name: "",
    category: "Teaching",
    basedOn: "Teacher",
    description: "",
  });

  const selectedRole = roles.find((r) => r.name === selectedRoleName) || ROLES[2];

  const filteredRoles = useMemo(
    () => roles.filter((r) => roleFilter === "All" || r.category === roleFilter),
    [roles, roleFilter],
  );

  const visibleModules = useMemo(() => {
    const q = moduleQuery.trim().toLowerCase();
    return MODULE_ACCESS.filter((m) => {
      if (moduleFilter !== "All" && m.category !== moduleFilter) return false;
      if (!q) return true;
      return `${m.name} ${m.description}`.toLowerCase().includes(q);
    });
  }, [moduleFilter, moduleQuery]);

  const enabledModules = Object.values(matrix).filter((a) => a.some(Boolean)).length;
  const actionGrants = Object.values(matrix).reduce((sum, a) => sum + a.filter(Boolean).length, 0);

  const selectRole = (role) => {
    setSelectedRoleName(role.name);
    setMatrix(defaultMatrixFor(role));
    setModuleFilter("All");
    setModuleQuery("");
  };

  const setLevel = (moduleId, level) =>
    setMatrix((p) => ({ ...p, [moduleId]: [...LEVELS[level]] }));

  const toggleAction = (moduleId, index) =>
    setMatrix((p) => ({
      ...p,
      [moduleId]: p[moduleId].map((v, i) => (i === index ? (v ? 0 : 1) : v)),
    }));

  const applyAll = (level) =>
    setMatrix(
      MODULE_ACCESS.reduce((acc, m) => ({ ...acc, [m.id]: [...LEVELS[level]] }), {}),
    );

  const resetDefault = () => setMatrix(defaultMatrixFor(selectedRole));

  const createRole = () => {
    const name = newRole.name.trim();
    if (!name) return;
    const base = roles.find((r) => r.name === newRole.basedOn) || ROLES[2];
    const created = {
      name,
      modules: base.modules,
      total: 25,
      category: newRole.category,
      actions: base.actions,
      description:
        newRole.description.trim() ||
        `Custom ${newRole.category.toLowerCase()} role based on ${base.name}.`,
      baseRole: base.name,
    };
    setRoles((p) => (p.some((r) => r.name === name) ? p : [...p, created]));
    selectRole(created);
    setNewRole({ name: "", category: newRole.category, basedOn: newRole.basedOn, description: "" });
    setCreateOpen(false);
  };

  const tabButton = (active) =>
    `px-3.5 py-1.5 rounded-md font-bold inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
      active ? "bg-white text-[#4834b8] shadow-xs" : "text-slate-600 hover:text-slate-900"
    }`;

  const filterButton = (active) =>
    `px-2.5 py-1 rounded-md font-semibold transition cursor-pointer whitespace-nowrap ${
      active ? "bg-white text-[#4834b8] shadow-xs" : "text-slate-600 hover:text-slate-900"
    }`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-[260px] sm:max-w-2xl">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#4834b8]" />
            <h2 className="text-lg font-bold text-slate-900">
              Access Control - Role &amp; Staff User Management
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage default <strong className="text-slate-700">Role Templates</strong> as well as{" "}
            <strong className="text-slate-700">Individual Staff Overrides</strong> (grant more or
            restrict fewer modules/actions than a user's base role).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/teacher/menu")}
            className="px-3.5 py-2 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-[#4834b8] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview App as Teacher</span>
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2 rounded-lg bg-[#4834b8] hover:bg-[#3a289c] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Create Role</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "roles"}
            onClick={() => setActiveTab("roles")}
            className={tabButton(activeTab === "roles")}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Role-Based Access ({roles.length})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "staff"}
            onClick={() => setActiveTab("staff")}
            className={tabButton(activeTab === "staff")}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Staff / User-Based Access ({STAFF.length})</span>
          </button>
        </div>
        <div className="text-[11.5px] text-slate-500 flex items-center gap-2">
          <span>
            Customized Staff Accounts:{" "}
            <strong className="font-mono tabular-nums text-slate-900">
              {STAFF.filter((s) => s[3]).length}
            </strong>{" "}
            / <span className="font-mono tabular-nums">{STAFF.length}</span>
          </span>
        </div>
      </div>

      {activeTab === "roles" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Defined roles */}
          <div className="lg:col-span-4 xl:col-span-3 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-3.5 border-b border-slate-200 space-y-2.5 bg-slate-50/70">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Defined Roles ({roles.length})</span>
                <span className="text-[11px] font-mono tabular-nums text-slate-500">
                  Active: School Admin
                </span>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-[11px]">
                {["All", "Admin", "Teaching", "Non-Teaching"].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setRoleFilter(f)}
                    className={`flex-1 py-1 px-1.5 rounded-md font-semibold transition cursor-pointer whitespace-nowrap ${
                      roleFilter === f
                        ? "bg-white text-[#4834b8] shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="divide-y divide-slate-100 max-h-[650px] overflow-y-auto">
              {filteredRoles.map((r) => {
                const active = r.name === selectedRoleName;
                return (
                  <button
                    key={r.name}
                    type="button"
                    onClick={() => selectRole(r)}
                    className={`w-full text-left px-3.5 py-3 transition cursor-pointer flex flex-col gap-1 ${
                      active
                        ? "bg-indigo-50/80 text-slate-900"
                        : "bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-xs font-bold truncate ${active ? "text-[#4834b8]" : "text-slate-900"}`}
                      >
                        {r.name}
                      </span>
                      <span className="text-[10.5px] font-mono font-semibold text-slate-500 tabular-nums shrink-0">
                        {r.modules}/{r.total}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span>
                        {r.category} · <span className="font-mono tabular-nums">{r.actions}</span>{" "}
                        actions
                      </span>
                      {r.name === "School Admin" && (
                        <span className="font-semibold text-emerald-700">Current View</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Role detail + matrix */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Shield className="w-4 h-4 text-[#4834b8]" />
                    <h3 className="text-base font-bold text-slate-900">{selectedRole.name}</h3>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-xs font-semibold text-slate-600">{selectedRole.category}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{selectedRole.description}</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <div className="text-[11px] text-slate-500">Enabled Modules</div>
                    <div className="text-base font-bold font-mono tabular-nums text-slate-900">
                      {enabledModules} / 25
                    </div>
                  </div>
                  <div className="border-l border-slate-200 pl-4">
                    <div className="text-[11px] text-slate-500">Action Grants</div>
                    <div className="text-base font-bold font-mono tabular-nums text-[#4834b8]">
                      {actionGrants} / 125
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto max-w-full">
                    {["All", "Academics", "Finance & Admin", "Operations", "Administration"].map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setModuleFilter(f)}
                        className={filterButton(moduleFilter === f)}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <div className="relative w-56">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={moduleQuery}
                      onChange={(e) => setModuleQuery(e.target.value)}
                      placeholder="Filter modules..."
                      aria-label="Filter modules in matrix"
                      className="w-full pl-8 pr-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs text-slate-900 focus:outline-none focus:border-[#4834b8]"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => applyAll("Full")}
                    className="px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold cursor-pointer whitespace-nowrap"
                  >
                    Grant All Full
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAll("View")}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer whitespace-nowrap"
                  >
                    All View Only
                  </button>
                  <button
                    type="button"
                    onClick={resetDefault}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Default</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#5c5987] text-white font-semibold">
                      <th className="py-2.5 px-3.5">ERP Module &amp; Scope</th>
                      <th className="py-2.5 px-3">Effective Access</th>
                      <th className="py-2.5 px-2.5 text-center whitespace-nowrap">View</th>
                      <th className="py-2.5 px-2.5 text-center whitespace-nowrap">Create</th>
                      <th className="py-2.5 px-2.5 text-center whitespace-nowrap">Edit</th>
                      <th className="py-2.5 px-2.5 text-center whitespace-nowrap">Delete</th>
                      <th className="py-2.5 px-2.5 text-center whitespace-nowrap">Export</th>
                      <th className="py-2.5 px-3.5 text-right whitespace-nowrap">Quick Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {visibleModules.map((m, i) => {
                      const a = matrix[m.id];
                      const label = effectiveLabel(a);
                      return (
                        <tr
                          key={m.id}
                          data-testid={`matrix-row-${m.id}`}
                          className={`hover:bg-indigo-50/25 transition ${i % 2 ? "bg-slate-50/60" : ""}`}
                        >
                          <td className="py-2.5 px-3.5">
                            <div className="font-bold text-slate-900">{m.name}</div>
                            <div className="text-[11px] text-slate-500">
                              {m.category} · {m.description}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`text-[11px] font-semibold ${
                                label === "No Access" ? "text-slate-400" : "text-[#4834b8]"
                              }`}
                            >
                              {label}
                            </span>
                          </td>
                          {a.map((v, idx) => (
                            <td key={idx} className="py-2.5 px-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={Boolean(v)}
                                onChange={() => toggleAction(m.id, idx)}
                                aria-label={`${selectedRole.name} ${m.name} ${ACTION_LABELS[idx]}`}
                                className="w-4 h-4 rounded border-slate-300 text-[#4834b8] focus:ring-[#4834b8] cursor-pointer disabled:opacity-50"
                              />
                            </td>
                          ))}
                          <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              {["Full", "Std", "View", "Off"].map((lvl) => (
                                <button
                                  key={lvl}
                                  type="button"
                                  onClick={() => setLevel(m.id, lvl)}
                                  className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 text-[11px] font-semibold text-slate-700 hover:text-[#4834b8] cursor-pointer disabled:opacity-50"
                                >
                                  {lvl}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {visibleModules.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-400">
                          No modules match the current filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <div className="text-xs font-bold text-slate-800">Staff / User-Based Access ({STAFF.length})</div>
            <div className="text-[11px] text-slate-500">
              Customized Staff Accounts: <strong className="font-mono text-slate-900">4</strong> /{" "}
              {STAFF.length}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#5c5987] text-white font-semibold">
                  <th className="py-2.5 px-3.5">Code</th>
                  <th className="py-2.5 px-3">Staff Name</th>
                  <th className="py-2.5 px-3">Base Role</th>
                  <th className="py-2.5 px-3">Overrides</th>
                  <th className="py-2.5 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {STAFF.map(([code, name, role, customized]) => (
                  <tr key={code} className="hover:bg-indigo-50/25 transition">
                    <td className="py-2.5 px-3.5 font-mono font-bold text-slate-700">{code}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{role}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[11px] font-bold ${
                          customized ? "text-[#4834b8]" : "text-slate-400"
                        }`}
                      >
                        {customized ? "Customized" : "Base role only"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          const r = roles.find((x) => x.name === role) || ROLES[2];
                          setActiveTab("roles");
                          selectRole(r);
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-[#4834b8] text-[11px] font-bold cursor-pointer"
                      >
                        Manage Access
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create role modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#4834b8]" />
                <h3 className="text-base font-bold text-slate-900">Create Custom ERP Role</h3>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 text-xs space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Role Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={newRole.name}
                  onChange={(e) => setNewRole((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Exam Cell Coordinator"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#4834b8]"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Staff Category <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={newRole.category}
                    onChange={(e) => setNewRole((p) => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-[#4834b8] cursor-pointer"
                  >
                    <option value="Teaching">Teaching</option>
                    <option value="Non-Teaching">Non-Teaching</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Permissions From</label>
                  <select
                    value={newRole.basedOn}
                    onChange={(e) => setNewRole((p) => ({ ...p, basedOn: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-[#4834b8] cursor-pointer"
                  >
                    {roles.map((r) => (
                      <option key={r.name} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Role Scope Description</label>
                <textarea
                  rows={3}
                  value={newRole.description}
                  onChange={(e) => setNewRole((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Describe operational responsibilities for this role."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#4834b8] resize-y"
                />
              </div>
            </div>
            <div className="px-5 pb-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newRole.name.trim() || !newRole.category}
                onClick={createRole}
                className={`px-4 py-2 rounded-lg text-white text-xs font-bold ${
                  newRole.name.trim() && newRole.category
                    ? "bg-[#4834b8] hover:bg-[#3a289c] cursor-pointer"
                    : "bg-slate-300 cursor-not-allowed"
                }`}
              >
                Create Role
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="hidden">
        <Check />
      </div>
    </div>
  );
};

export default AccessControlRbac;
