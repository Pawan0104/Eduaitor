import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FaSchool,
  FaUsers,
  FaChalkboardUser,
  FaBookOpen,
  FaCreditCard,
  FaGraduationCap,
  FaBus,
  FaCircleCheck,
  FaEnvelope,
  FaPhone,
  FaBuilding,
  FaBell,
  FaLocationDot,
  FaBook,
} from "react-icons/fa6";
import {
  FiRefreshCw,
  FiChevronDown,
  FiActivity,
  FiBarChart2,
  FiAlertCircle,
} from "react-icons/fi";
import { toast } from "react-toastify";
import { FaStudiovinari } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

const API = import.meta.env.VITE_API_URL;

const fmt = (v) =>
  v
    ? new Date(v).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const fmtCur = (v) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

const planStatus = (end) => {
  if (!end) return { label: "No Plan", cls: "bg-slate-100 text-slate-500" };
  const d = Math.ceil((new Date(end) - new Date()) / 86400000);
  if (d < 0) return { label: "Expired", cls: "bg-red-100 text-red-700" };
  if (d < 30)
    return { label: `${d}d left`, cls: "bg-amber-100 text-amber-700" };
  return { label: "Active", cls: "bg-emerald-100 text-emerald-700" };
};

const TABS = [
  { id: "overview", label: "Overview", icon: FiActivity },
  { id: "students", label: "Students", icon: FaUsers },
  { id: "teachers", label: "Teachers", icon: FaChalkboardUser },
  { id: "academics", label: "Academics", icon: FaGraduationCap },
  { id: "communication", label: "Communication", icon: FaBell },
  { id: "finance", label: "Finance", icon: FiBarChart2 },
  { id: "transport", label: "Transport", icon: FaBus },
  { id: "library", label: "Library", icon: FaBookOpen },
  { id: "syllabus", label: "Syllabus", icon: FaStudiovinari },
  { id: "setup", label: "Setup Checklist", icon: FaCircleCheck },
  { id: "alerts", label: "Alerts", icon: FiAlertCircle },
  { id: "subscription", label: "Subscription", icon: FaCreditCard },
];

export default function SchoolDetail() {
  const { id } = useParams();

  const [schools, setSchools] = useState([]);
  const [selId, setSelId] = useState("");
  const [tab, setTab] = useState("overview");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingWS, setLoadingWS] = useState(false);
  const [ws, setWs] = useState(null);
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  useEffect(() => {
    axios
      .get(`${API}/schools`)
      .then((r) => {
        const allSchools = r.data.data || [];

        setSchools(allSchools);

        // auto select school from URL
        if (id) {
          setSelId(id);
          load(id);
        }
      })
      .catch(() => toast.error("Failed to load schools"))
      .finally(() => setLoadingList(false));
  }, [id]);

  const load = async (id) => {
    if (!id) return;
    setLoadingWS(true);
    setWs(null);
    try {
      const p = (url, options = {}) =>
        axios
          .get(url, {
            ...options,
            withCredentials: true,
          })
          .catch(() => null);
      const [
        school,
        students,
        teachers,
        sections,
        classes,
        subjects,
        notices,
        events,
        feeHistory,
        defaulters,
        buses,
        drivers,
        routes,
        transportSummary,
        books,
        issues,
        syllabus,
      ] = await Promise.all([
        p(`${API}/schools/${id}`),
        p(`${API}/students/all/admin`, { params: { schoolId: id } }),
        p(`${API}/teachers/all/admin`, { params: { schoolId: id } }),
        p(`${API}/sections/all/admin`, { params: { schoolId: id } }),
        p(`${API}/classes/all/admin`, { params: { schoolId: id } }),
        p(`${API}/subjects/all/admin`, { params: { schoolId: id } }),
        p(`${API}/notices/all/admin`, { params: { schoolId: id } }),
        p(`${API}/events/all/admin`, { params: { schoolId: id } }),
        p(`${API}/fee-history/admin`, {
          params: { schoolId: id, page: 1, limit: 50 },
        }),
        p(`${API}/fees/defaulters/admin`, {
          params: { schoolId: id, page: 1, limit: 50 },
        }),
        p(`${API}/transport/buses/admin`, { params: { schoolId: id } }),
        p(`${API}/transport/drivers/admin`, { params: { schoolId: id } }),
        p(`${API}/transport/routes/admin`, { params: { schoolId: id } }),
        p(`${API}/transport/summary/admin`, { params: { schoolId: id } }),
        p(`${API}/library/books/admin`, { params: { schoolId: id } }),
        p(`${API}/library/issues/admin`, {
          params: { schoolId: id, status: "all" },
        }),
        p(`${API}/syllabus/complete/`, { params: { schoolId: id } }),
      ]);

      const schoolData = school?.data?.data;
      if (!schoolData) throw new Error("School not found");

      setWs({
        school: schoolData,
        students: students?.data?.data || [],
        teachers: teachers?.data?.data || [],
        sections: sections?.data?.sections || [],
        classes: classes?.data?.classes || [],
        subjects: subjects?.data?.subjects || [],
        notices: notices?.data?.notices || [],
        noticeStats: notices?.data?.stats || {},
        events: events?.data?.events || [],
        eventStats: events?.data?.stats || {},
        payments: feeHistory?.data?.Allhistory || [],
        feeSummary: feeHistory?.data?.summary || {},
        defaulters: defaulters?.data?.defaulters || [],
        buses: buses?.data?.data || [],
        drivers: drivers?.data?.data || [],
        routes: routes?.data?.data || [],
        transportSummary: transportSummary?.data || {},
        books: books?.data?.data || [],
        issues: issues?.data?.allissuebook || [],
        issueSummary: issues?.data?.summary || {},
        syllabusClasses: syllabus?.data?.data?.classes || [],
      });
      setTab("overview");
    } catch (e) {
      toast.error(e.message || "Failed to load workspace");
    } finally {
      setLoadingWS(false);
    }
  };

  const metrics = useMemo(() => {
    if (!ws) return null;
    const totalSections = ws.classes.reduce(
      (s, c) => s + (c.details?.length || 0),
      0,
    );
    const totalCapacity = ws.classes.reduce(
      (s, c) =>
        s + (c.details || []).reduce((i, d) => i + Number(d.capacity || 0), 0),
      0,
    );
    const enrolledInClasses = ws.classes.reduce(
      (s, c) =>
        s +
        (c.details || []).reduce((i, d) => i + Number(d.studentCount || 0), 0),
      0,
    );
    const assignedTeachers = ws.classes.reduce(
      (s, c) => s + (c.details || []).filter((d) => d.teacherId).length,
      0,
    );
    const booksAvailable = ws.books.reduce(
      (s, b) => s + Number(b.availableCopies || 0),
      0,
    );
    const totalCollected = ws.feeSummary?.totalAmount || 0;
    const totalDue = ws.students.reduce(
      (s, st) => s + Number(st.totalDue || 0),
      0,
    );
    const maleCount = ws.students.filter(
      (s) => s.gender?.toLowerCase() === "male",
    ).length;
    const femaleCount = ws.students.filter(
      (s) => s.gender?.toLowerCase() === "female",
    ).length;
    const fullTime = ws.teachers.filter(
      (t) => t.employmentType?.toLowerCase() === "full-time",
    ).length;
    const partTime = ws.teachers.filter(
      (t) => t.employmentType?.toLowerCase() === "part-time",
    ).length;
    return {
      totalStudents: ws.students.length,
      totalTeachers: ws.teachers.length,
      totalClasses: ws.classes.length,
      totalSections,
      totalSubjects: ws.subjects.length,
      totalCapacity,
      enrolledInClasses,
      assignedTeachers,
      booksAvailable,
      totalCollected,
      totalDue,
      maleCount,
      femaleCount,
      fullTime,
      partTime,
    };
  }, [ws]);

  const setupChecklist = useMemo(() => {
    if (!ws || !metrics) return null;

    const items = [
      {
        label: "School profile completed",
        done: Boolean(
          ws.school.school_name &&
          ws.school.slug &&
          ws.school.contact_email &&
          ws.school.contact_phone &&
          ws.school.address,
        ),
        note: "Basic institution record and contact details",
      },
      {
        label: "Subscription assigned",
        done: Boolean(ws.school.subscription_plan),
        note: ws.school.subscription_plan?.name || "No active plan linked",
      },
      {
        label: "Admin credentials set",
        done: Boolean(ws.school.admin_name && ws.school.admin_email),
        note: ws.school.admin_email || "Admin account missing",
      },
      {
        label: "Classes created",
        done: metrics.totalClasses > 0,
        note: `${metrics.totalClasses} classes configured`,
      },
      {
        label: "Sections created",
        done: ws.sections.length > 0,
        note: `${ws.sections.length} sections configured`,
      },
      {
        label: "Subjects mapped",
        done: metrics.totalSubjects > 0,
        note: `${metrics.totalSubjects} subjects available`,
      },
      {
        label: "Teachers onboarded",
        done: metrics.totalTeachers > 0,
        note: `${metrics.totalTeachers} teachers added`,
      },
      {
        label: "Students onboarded",
        done: metrics.totalStudents > 0,
        note: `${metrics.totalStudents} students added`,
      },
      {
        label: "Fee activity started",
        done: ws.payments.length > 0,
        note: `${ws.payments.length} payment records`,
      },
      {
        label: "Transport module configured",
        done:
          ws.buses.length > 0 || ws.routes.length > 0 || ws.drivers.length > 0,
        note: `${ws.buses.length} buses · ${ws.routes.length} routes · ${ws.drivers.length} drivers`,
      },
      {
        label: "Library inventory added",
        done: ws.books.length > 0,
        note: `${ws.books.length} books in inventory`,
      },
      {
        label: "Syllabus started",
        done: ws.syllabusClasses.length > 0,
        note: `${ws.syllabusClasses.length} classes with syllabus data`,
      },
    ];

    const completed = items.filter((item) => item.done).length;
    const percent = Math.round((completed / items.length) * 100);

    return { items, completed, total: items.length, percent };
  }, [metrics, ws]);

  const alertSummary = useMemo(() => {
    if (!ws || !metrics || !setupChecklist) return null;

    const alerts = [];
    const daysLeft = ws.school.end_date
      ? Math.ceil((new Date(ws.school.end_date) - new Date()) / 86400000)
      : null;
    const noTeachersAssigned =
      metrics.totalClasses > 0 && metrics.assignedTeachers === 0;
    const enrollmentPressure =
      metrics.totalCapacity > 0
        ? Math.round((metrics.enrolledInClasses / metrics.totalCapacity) * 100)
        : 0;

    if (ws.school.status !== "Active") {
      alerts.push({
        title: "School is inactive",
        severity: "high",
        detail: "The school account is currently not active.",
      });
    }

    if (daysLeft !== null && daysLeft < 0) {
      alerts.push({
        title: "Subscription expired",
        severity: "high",
        detail: `Plan expired on ${fmt(ws.school.end_date)}.`,
      });
    } else if (daysLeft !== null && daysLeft <= 30) {
      alerts.push({
        title: "Subscription expiring soon",
        severity: "medium",
        detail: `${daysLeft} day${daysLeft === 1 ? "" : "s"} remaining on the current plan.`,
      });
    }

    if (metrics.totalStudents === 0) {
      alerts.push({
        title: "No students onboarded",
        severity: "high",
        detail: "Student records have not been added yet.",
      });
    }

    if (metrics.totalTeachers === 0) {
      alerts.push({
        title: "No teachers onboarded",
        severity: "high",
        detail: "Teacher directory is empty.",
      });
    }

    if (metrics.totalClasses === 0) {
      alerts.push({
        title: "No classes created",
        severity: "high",
        detail: "Academic structure is incomplete.",
      });
    }

    if (noTeachersAssigned) {
      alerts.push({
        title: "Classes missing teacher assignment",
        severity: "medium",
        detail: "Classes exist but none are linked to teachers.",
      });
    }

    if (metrics.totalDue > 0) {
      alerts.push({
        title: "Outstanding fee balance",
        severity: ws.defaulters.length > 0 ? "high" : "medium",
        detail: `${fmtCur(metrics.totalDue)} still pending across students.`,
      });
    }

    if (ws.defaulters.length > 0) {
      alerts.push({
        title: "Students with pending dues",
        severity: "medium",
        detail: `${ws.defaulters.length} defaulter${ws.defaulters.length > 1 ? "s" : ""} detected.`,
      });
    }

    if (ws.syllabusClasses.length === 0) {
      alerts.push({
        title: "Syllabus not started",
        severity: "medium",
        detail: "No syllabus structure is available yet.",
      });
    }

    if (ws.noticeStats?.highPriority > 0) {
      alerts.push({
        title: "High-priority notices active",
        severity: "low",
        detail: `${ws.noticeStats.highPriority} high-priority notice${ws.noticeStats.highPriority > 1 ? "s are" : " is"} live.`,
      });
    }

    if (
      ws.transportSummary.maintenance > 0 ||
      ws.transportSummary.suspended > 0 ||
      ws.transportSummary.on_leave > 0
    ) {
      alerts.push({
        title: "Transport operations need review",
        severity: "medium",
        detail: `${ws.transportSummary.maintenance || 0} maintenance · ${ws.transportSummary.suspended || 0} suspended · ${ws.transportSummary.on_leave || 0} on leave.`,
      });
    }

    if (ws.issueSummary?.overdue > 0) {
      alerts.push({
        title: "Overdue library issues",
        severity: "low",
        detail: `${ws.issueSummary.overdue} books are overdue.`,
      });
    }

    if (enrollmentPressure >= 90) {
      alerts.push({
        title: "Seat capacity nearly full",
        severity: "medium",
        detail: `${enrollmentPressure}% of total capacity is occupied.`,
      });
    }

    if (setupChecklist.percent < 60) {
      alerts.push({
        title: "School setup incomplete",
        severity: "high",
        detail: `Only ${setupChecklist.percent}% of the recommended setup checklist is complete.`,
      });
    }

    const grouped = {
      high: alerts.filter((item) => item.severity === "high"),
      medium: alerts.filter((item) => item.severity === "medium"),
      low: alerts.filter((item) => item.severity === "low"),
    };

    return {
      alerts,
      grouped,
      total: alerts.length,
    };
  }, [metrics, setupChecklist, ws]);

  const ps = ws ? planStatus(ws.school.end_date) : null;

  return (
    <div
      className="min-h-screen bg-[#F0F2F8]"
      style={{ fontFamily: "'Sora','Nunito',system-ui,sans-serif" }}
    >
      {/* 🔙 BACK BUTTON */}
      {isMobile && (
        <div className="pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl
                 bg-white shadow-sm border border-slate-100
                 text-sm font-bold text-slate-600 active:scale-95 transition-transform mb-2.5"
          >
            <FaArrowLeft size={16} />
            Back
          </button>
        </div>
      )}
      {/* TOP BAR */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-sm shadow">
            <FaSchool />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm leading-tight">
              School Workspace
            </p>
            <p className="text-xs text-slate-400">Super Admin · Read-only</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <select
              value={selId}
              onChange={(e) => setSelId(e.target.value)}
              disabled={loadingList}
              className="appearance-none pl-3 pr-9 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 min-w-50 disabled:opacity-50"
            >
              <option value="">
                {loadingList ? "Loading…" : "— Select school —"}
              </option>
              {schools.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.school_name}
                </option>
              ))}
            </select>
            <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm" />
          </div>
          <button
            onClick={() => load(selId)}
            disabled={!selId || loadingWS}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loadingWS ? (
              <FiRefreshCw className="animate-spin" />
            ) : (
              <FaSchool />
            )}
            {loadingWS ? "Loading…" : "Open"}
          </button>
          {ws && (
            <button
              onClick={() => load(selId)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm transition"
            >
              <FiRefreshCw /> Refresh
            </button>
          )}
        </div>
      </div>

      <div className="p-5 lg:p-7 max-w-screen-2xl mx-auto space-y-5">
        {!ws && !loadingWS && (
          <div className="rounded-2xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-400 text-2xl flex items-center justify-center mx-auto mb-4">
              <FaSchool />
            </div>
            <p className="font-semibold text-slate-700">No school selected</p>
            <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              Pick a school from the dropdown and click Open to load the full
              workspace.
            </p>
          </div>
        )}

        {loadingWS && (
          <div className="rounded-2xl bg-white border border-slate-200 p-10 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-indigo-100 border-t-indigo-500 animate-spin shrink-0" />
            <div>
              <p className="font-semibold text-slate-800">Loading workspace…</p>
              <p className="text-sm text-slate-400 mt-0.5">
                Fetching all modules in parallel
              </p>
            </div>
          </div>
        )}

        {ws && metrics && (
          <>
            {/* IDENTITY CARD */}
            <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
              <div className="h-1 bg-linear-to-r from-indigo-500 via-violet-500 to-purple-500" />
              <div className="p-5 lg:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xl shrink-0 shadow">
                      <FaSchool />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-bold text-slate-900">
                          {ws.school.school_name}
                        </h2>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ps.cls}`}
                        >
                          {ps.label}
                        </span>
                        {ws.school.status && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            {ws.school.status}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                        <FaLocationDot className="shrink-0 text-slate-400" />
                        {ws.school.address || "No address on record"}
                      </p>
                      <div className="flex flex-wrap gap-4 mt-2">
                        {ws.school.contact_email && (
                          <ContactChip
                            icon={<FaEnvelope />}
                            text={ws.school.contact_email}
                          />
                        )}
                        {ws.school.contact_phone && (
                          <ContactChip
                            icon={<FaPhone />}
                            text={ws.school.contact_phone}
                          />
                        )}
                        {ws.school.slug && (
                          <ContactChip
                            icon={<FaBuilding />}
                            text={`/${ws.school.slug}`}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 min-w-57.5 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                      Subscription
                    </p>
                    <InfoPair
                      label="Plan"
                      value={ws.school.subscription_plan?.name || "—"}
                    />
                    <InfoPair
                      label="Billing"
                      value={
                        ws.school.subscription_plan
                          ? `${ws.school.subscription_plan.currency} ${ws.school.subscription_plan.price} / ${ws.school.subscription_plan.billing_cycle}`
                          : "—"
                      }
                    />
                    <InfoPair
                      label="Admin"
                      value={ws.school.admin_name || "—"}
                    />
                    <InfoPair
                      label="Admin Email"
                      value={ws.school.admin_email || "—"}
                    />
                    <InfoPair
                      label="Period"
                      value={`${fmt(ws.school.start_date)} → ${fmt(ws.school.end_date)}`}
                    />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <KpiCard
                    icon={<FaUsers />}
                    color="indigo"
                    label="Students"
                    value={metrics.totalStudents}
                    sub={`${metrics.maleCount}M · ${metrics.femaleCount}F`}
                  />
                  <KpiCard
                    icon={<FaChalkboardUser />}
                    color="violet"
                    label="Teachers"
                    value={metrics.totalTeachers}
                    sub={`${metrics.fullTime} full-time`}
                  />
                  <KpiCard
                    icon={<FaGraduationCap />}
                    color="sky"
                    label="Classes / Sec."
                    value={`${metrics.totalClasses} / ${metrics.totalSections}`}
                    sub={`${metrics.totalSubjects} subjects`}
                  />
                  <KpiCard
                    icon={<FaCreditCard />}
                    color="emerald"
                    label="Collected"
                    value={fmtCur(metrics.totalCollected)}
                    sub={`${ws.payments.length} payments`}
                  />
                </div>
              </div>
            </div>

            {/* SECONDARY STRIP */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatStrip
                label="Seat Capacity"
                value={metrics.totalCapacity}
                sub={`${metrics.enrolledInClasses} enrolled`}
                accent="indigo"
              />
              <StatStrip
                label="Defaulters"
                value={ws.defaulters.length}
                sub="Unpaid this month"
                accent={ws.defaulters.length > 0 ? "rose" : "emerald"}
                warn={ws.defaulters.length > 0}
              />
              <StatStrip
                label="Fleet"
                value={`${ws.buses.length} buses`}
                sub={`${ws.routes.length} routes · ${ws.drivers.length} drivers`}
                accent="amber"
              />
              <StatStrip
                label="Library"
                value={metrics.booksAvailable}
                sub={`${ws.issueSummary?.totalIssued || 0} issued · ${ws.issueSummary?.overdue || 0} overdue`}
                accent="teal"
              />
            </div>

            {/* TABS */}
            <div className="bg-white border border-slate-200 rounded-xl p-1.5 flex flex-wrap gap-1 shadow-sm">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
                    tab === id
                      ? "bg-indigo-600 text-white shadow"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  }`}
                >
                  <Icon />
                  {label}
                </button>
              ))}
            </div>

            {/* ═══ OVERVIEW ═══ */}
            {tab === "overview" && (
              <div className="grid gap-5 xl:grid-cols-3">
                <Panel
                  title="Institution Profile"
                  subtitle="Core record"
                  className="xl:col-span-2"
                >
                  <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="School Name" value={ws.school.school_name} />
                    <Field label="Status" value={ws.school.status} />
                    <Field label="Slug" value={ws.school.slug} />
                    <Field
                      label="Contact Email"
                      value={ws.school.contact_email}
                    />
                    <Field
                      label="Contact Phone"
                      value={ws.school.contact_phone}
                    />
                    <Field label="Admin Name" value={ws.school.admin_name} />
                    <Field label="Admin Email" value={ws.school.admin_email} />
                    <Field
                      label="Plan Start"
                      value={fmt(ws.school.start_date)}
                    />
                    <Field label="Plan End" value={fmt(ws.school.end_date)} />
                  </div>
                  <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                      Address
                    </p>
                    <p className="text-sm text-slate-600">
                      {ws.school.address || "—"}
                    </p>
                  </div>
                </Panel>

                <div className="space-y-4">
                  <div className="rounded-2xl bg-linear-to-br from-indigo-600 to-violet-700 p-5 text-white">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200 mb-3">
                      At a Glance
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <GlanceBox
                        label="Students"
                        value={metrics.totalStudents}
                      />
                      <GlanceBox
                        label="Teachers"
                        value={metrics.totalTeachers}
                      />
                      <GlanceBox
                        label="Notices"
                        value={ws.noticeStats?.total || ws.notices.length}
                      />
                      <GlanceBox
                        label="Events"
                        value={ws.eventStats?.total || ws.events.length}
                      />
                      <GlanceBox label="Books" value={ws.books.length} />
                      <GlanceBox
                        label="Active Issues"
                        value={ws.issueSummary?.totalIssued || 0}
                      />
                      <GlanceBox
                        label="Total Due"
                        value={fmtCur(metrics.totalDue)}
                      />
                      <GlanceBox
                        label="Defaulters"
                        value={ws.defaulters.length}
                      />
                    </div>
                  </div>

                  <Panel title="Transport Summary" subtitle="Fleet overview">
                    <div className="space-y-0">
                      <MiniField
                        label="Buses"
                        value={ws.transportSummary.buses ?? ws.buses.length}
                      />
                      <MiniField
                        label="Routes"
                        value={ws.transportSummary.routes ?? ws.routes.length}
                      />
                      <MiniField
                        label="Drivers"
                        value={ws.transportSummary.drivers ?? ws.drivers.length}
                      />
                      <MiniField
                        label="Students"
                        value={ws.transportSummary.students || 0}
                      />
                      <MiniField
                        label="Maintenance"
                        value={ws.transportSummary.maintenance || 0}
                        warn={ws.transportSummary.maintenance > 0}
                      />
                      <MiniField
                        label="Suspended"
                        value={ws.transportSummary.suspended || 0}
                        warn={ws.transportSummary.suspended > 0}
                      />
                      <MiniField
                        label="On Leave"
                        value={ws.transportSummary.on_leave || 0}
                        warn={ws.transportSummary.on_leave > 0}
                      />
                    </div>
                  </Panel>
                </div>
              </div>
            )}

            {/* ═══ STUDENTS ═══ */}
            {tab === "students" && (
              <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
                <Panel
                  title="Student Directory"
                  subtitle={`${metrics.totalStudents} students`}
                >
                  <div className="space-y-2 max-h-145 overflow-y-auto pr-1">
                    {ws.students.length ? (
                      ws.students.map((s, i) => (
                        <div
                          key={s._id || i}
                          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 hover:bg-white transition"
                        >
                          <Avatar
                            name={`${s.firstName} ${s.lastName}`}
                            color="indigo"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-slate-800">
                                {s.firstName} {s.lastName}
                              </p>
                              {s.gender && <Tag text={s.gender} />}
                              {s.bloodGroup && (
                                <Tag text={s.bloodGroup} color="rose" />
                              )}
                              {s.studentType && (
                                <Tag text={s.studentType} color="indigo" />
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              ID: {s.studentId || "—"} ·{" "}
                              {s.classId?.name || s.classId?.className || "—"}
                              {s.sectionId?.name
                                ? ` - ${s.sectionId.name}`
                                : ""}{" "}
                              · Roll {s.rollNo || "—"}
                            </p>
                            <p className="text-xs text-slate-400">
                              Father: {s.fatherName || "—"}
                              {s.fatherMobile ? ` · ${s.fatherMobile}` : ""}
                            </p>
                            <p className="text-xs text-slate-400">
                              Admitted: {fmt(s.admissionDate)}
                            </p>
                          </div>
                          <div className="text-right shrink-0 space-y-1">
                            <p className="text-xs font-semibold text-slate-600">
                              Fee: {fmtCur(s.finalFee)}
                            </p>
                            <p className="text-xs text-slate-400">
                              Paid: {fmtCur(s.totalPaid)}
                            </p>
                            <p
                              className={`text-xs font-bold ${(s.totalDue || 0) > 0 ? "text-rose-600" : "text-emerald-600"}`}
                            >
                              {(s.totalDue || 0) > 0
                                ? `Due ${fmtCur(s.totalDue)}`
                                : "✓ Paid"}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <Empty label="No students found." />
                    )}
                  </div>
                </Panel>

                <div className="space-y-4">
                  <Panel title="Demographics" subtitle="">
                    <div className="space-y-3">
                      <BarStat
                        label="Male"
                        value={metrics.maleCount}
                        max={metrics.totalStudents}
                        color="bg-indigo-400"
                      />
                      <BarStat
                        label="Female"
                        value={metrics.femaleCount}
                        max={metrics.totalStudents}
                        color="bg-violet-400"
                      />
                    </div>
                    <div className="mt-3 space-y-0">
                      <MiniField label="Total" value={metrics.totalStudents} />
                      <MiniField
                        label="Capacity"
                        value={metrics.totalCapacity}
                      />
                      <MiniField
                        label="Enrolled"
                        value={metrics.enrolledInClasses}
                      />
                    </div>
                  </Panel>

                  <Panel title="Fee Overview" subtitle="">
                    <div className="space-y-0">
                      <MiniField
                        label="Total Fee (all)"
                        value={fmtCur(
                          ws.students.reduce(
                            (s, st) => s + (st.finalFee || 0),
                            0,
                          ),
                        )}
                      />
                      <MiniField
                        label="Total Paid"
                        value={fmtCur(
                          ws.students.reduce(
                            (s, st) => s + (st.totalPaid || 0),
                            0,
                          ),
                        )}
                      />
                      <MiniField
                        label="Total Due"
                        value={fmtCur(metrics.totalDue)}
                        warn={metrics.totalDue > 0}
                      />
                      <MiniField
                        label="Defaulters"
                        value={ws.defaulters.length}
                        warn={ws.defaulters.length > 0}
                      />
                    </div>
                  </Panel>
                </div>
              </div>
            )}

            {/* ═══ TEACHERS ═══ */}
            {tab === "teachers" && (
              <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
                <Panel
                  title="Teacher Directory"
                  subtitle={`${metrics.totalTeachers} staff`}
                >
                  <div className="space-y-2 max-h-145 overflow-y-auto pr-1">
                    {ws.teachers.length ? (
                      ws.teachers.map((t, i) => (
                        <div
                          key={t._id || i}
                          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 hover:bg-white transition"
                        >
                          <Avatar name={t.fullName} color="violet" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-slate-800">
                                {t.fullName}
                              </p>
                              {t.designation && <Tag text={t.designation} />}
                              {t.employmentType && (
                                <Tag
                                  text={t.employmentType}
                                  color={
                                    t.employmentType
                                      ?.toLowerCase()
                                      .includes("full")
                                      ? "emerald"
                                      : "amber"
                                  }
                                />
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              ID: {t.teacherId || "—"} · {t.department || "—"} ·
                              Subject: {t.subject || "—"}
                            </p>
                            <p className="text-xs text-slate-400">
                              {t.email || "—"}
                              {t.phone ? ` · ${t.phone}` : ""}
                            </p>
                            <p className="text-xs text-slate-400">
                              {t.qualification || "—"}
                              {t.experience ? ` · ${t.experience} yrs` : ""} ·
                              Joined {fmt(t.joiningDate)}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-semibold text-slate-700">
                              {fmtCur(t.salary)}
                              <span className="text-slate-400 font-normal">
                                /mo
                              </span>
                            </p>
                            <p
                              className={`text-xs mt-1 px-2 py-0.5 rounded-full font-semibold ${t.status === "Present" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                            >
                              {t.status || "—"}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <Empty label="No teachers found." />
                    )}
                  </div>
                </Panel>

                <div className="space-y-4">
                  <Panel title="Staffing" subtitle="">
                    <div className="space-y-3">
                      <BarStat
                        label="Full-Time"
                        value={metrics.fullTime}
                        max={metrics.totalTeachers}
                        color="bg-violet-400"
                      />
                      <BarStat
                        label="Part-Time"
                        value={metrics.partTime}
                        max={metrics.totalTeachers}
                        color="bg-amber-400"
                      />
                    </div>
                    <div className="mt-3 space-y-0">
                      <MiniField label="Total" value={metrics.totalTeachers} />
                      <MiniField
                        label="Class-linked"
                        value={metrics.assignedTeachers}
                      />
                    </div>
                  </Panel>

                  <Panel title="Departments" subtitle="">
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {[
                        ...new Set(
                          ws.teachers.map((t) => t.department).filter(Boolean),
                        ),
                      ].map((d) => (
                        <div
                          key={d}
                          className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-3 py-2"
                        >
                          <p className="text-xs font-medium text-slate-700">
                            {d}
                          </p>
                          <span className="text-xs text-slate-400 font-semibold">
                            {
                              ws.teachers.filter((t) => t.department === d)
                                .length
                            }
                          </span>
                        </div>
                      ))}
                      {ws.teachers.every((t) => !t.department) && (
                        <p className="text-xs text-slate-400 py-2">
                          No department data
                        </p>
                      )}
                    </div>
                  </Panel>
                </div>
              </div>
            )}

            {/* ═══ ACADEMICS ═══ */}
            {tab === "academics" && (
              <div className="grid gap-5 xl:grid-cols-2">
                <Panel
                  title="Classes & Sections"
                  subtitle="Structure with capacity and teacher assignment"
                >
                  <div className="space-y-3 max-h-135 overflow-y-auto pr-1">
                    {ws.classes.length ? (
                      ws.classes.map((cls) => {
                        const enrolled = (cls.details || []).reduce(
                          (s, d) => s + Number(d.studentCount || 0),
                          0,
                        );
                        const cap = (cls.details || []).reduce(
                          (s, d) => s + Number(d.capacity || 0),
                          0,
                        );
                        const pct = cap
                          ? Math.round((enrolled / cap) * 100)
                          : 0;
                        return (
                          <div
                            key={cls._id}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-sm font-bold text-slate-800">
                                {cls.name || cls.className}
                              </p>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cls.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-500"}`}
                                >
                                  {cls.status}
                                </span>
                                <span className="text-xs bg-white border border-slate-200 rounded-full px-2 py-0.5 text-slate-500">
                                  {cls.details?.length || 0} sec.
                                </span>
                              </div>
                            </div>
                            <div className="space-y-1.5 mb-3">
                              {(cls.details || []).map((d) => (
                                <div
                                  key={d._id}
                                  className="flex items-center justify-between text-xs bg-white border border-slate-100 rounded-lg px-3 py-1.5"
                                >
                                  <span className="font-medium text-slate-700">
                                    {d.sectionId?.name || "—"} · Room{" "}
                                    {d.roomNumber || "—"}
                                  </span>
                                  <span className="text-slate-400">
                                    {d.studentCount || 0}/{d.capacity || 0} ·{" "}
                                    {d.teacherId?.fullName || "No teacher"}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                <div
                                  className="h-full bg-indigo-500 rounded-full transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="shrink-0">
                                {enrolled}/{cap} ({pct}%)
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <Empty label="No class data." />
                    )}
                  </div>
                </Panel>

                <div className="space-y-4">
                  <Panel
                    title="Subjects"
                    subtitle={`${metrics.totalSubjects} registered`}
                  >
                    <div className="space-y-1.5 max-h-72.5 overflow-y-auto pr-1">
                      {ws.subjects.length ? (
                        ws.subjects.map((sub) => (
                          <div
                            key={sub._id}
                            className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${sub.status === "Active" ? "bg-emerald-400" : "bg-slate-300"}`}
                              />
                              <p className="text-sm font-medium text-slate-800">
                                {sub.name}
                              </p>
                            </div>
                            <span className="text-xs text-slate-400">
                              {sub.classCount || 0} class
                              {sub.classCount !== 1 ? "es" : ""}
                            </span>
                          </div>
                        ))
                      ) : (
                        <Empty label="No subjects." />
                      )}
                    </div>
                  </Panel>

                  <Panel
                    title="Sections"
                    subtitle={`${ws.sections.length} registered`}
                  >
                    <div className="grid grid-cols-2 gap-2 max-h-55 overflow-y-auto">
                      {ws.sections.length ? (
                        ws.sections.map((s) => (
                          <div
                            key={s._id}
                            className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5"
                          >
                            <p className="text-sm font-semibold text-slate-800">
                              {s.name}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {s.subsections?.length || 0} sub · {s.status}
                            </p>
                          </div>
                        ))
                      ) : (
                        <Empty label="No sections." />
                      )}
                    </div>
                  </Panel>
                </div>
              </div>
            )}

            {/* ═══ COMMUNICATION ═══ */}
            {tab === "communication" && (
              <div className="grid gap-5 xl:grid-cols-2">
                <Panel title="Notices" subtitle="Published notice board">
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <SumBox
                      label="Total"
                      value={ws.noticeStats?.total || ws.notices.length}
                    />
                    <SumBox
                      label="Active"
                      value={ws.noticeStats?.active || 0}
                      color="emerald"
                    />
                    <SumBox
                      label="High Priority"
                      value={ws.noticeStats?.highPriority || 0}
                      color="rose"
                    />
                  </div>
                  <div className="space-y-2 max-h-105 overflow-y-auto pr-1">
                    {ws.notices.length ? (
                      ws.notices.map((n, i) => (
                        <div
                          key={n._id || i}
                          className={`rounded-xl border px-4 py-3 ${n.priority === "High" ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-slate-50"} ${!n.isActive ? "opacity-60" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <p className="text-sm font-semibold text-slate-800">
                                  {n.title}
                                </p>
                                <Tag text={n.category} />
                                <Tag text={n.audience} color="indigo" />
                                {n.priority === "High" && (
                                  <Tag text="High" color="rose" />
                                )}
                              </div>
                              <p className="text-xs text-slate-500 line-clamp-2">
                                {n.content}
                              </p>
                              <p className="text-xs text-slate-400 mt-1">
                                By {n.createdBy} · Expires {fmt(n.expiryDate)}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${n.isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-200 text-slate-500"}`}
                              >
                                {n.isActive ? "Active" : "Inactive"}
                              </span>
                              <p className="text-xs text-slate-400 mt-1">
                                {fmt(n.publishDate)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <Empty label="No notices." />
                    )}
                  </div>
                </Panel>

                <Panel title="Events" subtitle="School calendar">
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <SumBox
                      label="Total"
                      value={ws.eventStats?.total || ws.events.length}
                    />
                    <SumBox
                      label="Upcoming"
                      value={ws.eventStats?.upcoming || 0}
                      color="blue"
                    />
                    <SumBox
                      label="Completed"
                      value={ws.eventStats?.completed || 0}
                      color="emerald"
                    />
                  </div>
                  <div className="space-y-2 max-h-105 overflow-y-auto pr-1">
                    {ws.events.length ? (
                      ws.events.map((e, i) => {
                        const isUpcoming = new Date(e.startDate) > new Date();
                        return (
                          <div
                            key={e._id || i}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <p className="text-sm font-semibold text-slate-800">
                                    {e.title}
                                  </p>
                                  <Tag text={e.type} />
                                  {e.priority === "High" && (
                                    <Tag text="High" color="rose" />
                                  )}
                                </div>
                                <p className="text-xs text-slate-400">
                                  <FaLocationDot className="inline mr-1" />
                                  {e.location} · Org: {e.organizer}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {e.assignClass || "All Classes"} · {e.time}
                                </p>
                                {e.registrationRequired && (
                                  <p className="text-xs text-amber-600">
                                    Reg. required
                                    {e.capacity
                                      ? ` · Cap: ${e.capacity}`
                                      : ""}{" "}
                                    · Attendees: {e.attendees || 0}
                                  </p>
                                )}
                                <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                                  {e.description}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isUpcoming ? "bg-blue-50 text-blue-600" : "bg-slate-200 text-slate-500"}`}
                                >
                                  {isUpcoming ? "Upcoming" : "Past"}
                                </span>
                                <p className="text-xs text-slate-400 mt-1">
                                  {fmt(e.startDate)}
                                </p>
                                {e.endDate && (
                                  <p className="text-xs text-slate-400">
                                    → {fmt(e.endDate)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <Empty label="No events." />
                    )}
                  </div>
                </Panel>
              </div>
            )}

            {/* ═══ FINANCE ═══ */}
            {tab === "finance" && (
              <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
                <Panel
                  title="Payment History"
                  subtitle={`${ws.payments.length} records`}
                >
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-1">
                        Total Collected
                      </p>
                      <p className="text-xl font-bold text-emerald-800">
                        {fmtCur(ws.feeSummary?.totalAmount || 0)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-rose-50 border border-rose-100 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-rose-600 mb-1">
                        Total Due
                      </p>
                      <p className="text-xl font-bold text-rose-800">
                        {fmtCur(metrics.totalDue)}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-110 overflow-y-auto pr-1">
                    {ws.payments.length ? (
                      ws.payments.map((p, i) => (
                        <div
                          key={p._id || i}
                          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                        >
                          <Avatar
                            name={`${p.studentId?.firstName || "?"} ${p.studentId?.lastName || ""}`}
                            color="emerald"
                            size="sm"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800">
                              {p.studentId?.firstName} {p.studentId?.lastName}
                            </p>
                            <p className="text-xs text-slate-400">
                              {p.studentId?.studentId || "—"} ·{" "}
                              {p.studentId?.className || "—"}
                              {p.studentId?.section
                                ? ` - ${p.studentId.section}`
                                : ""}
                            </p>
                            <p className="text-xs text-slate-400">
                              Receipt: {p.receiptNo} · {p.paymentMode} ·{" "}
                              {fmt(p.paidDate)}
                            </p>
                            {p.remarks && (
                              <p className="text-xs text-slate-400 italic">
                                "{p.remarks}"
                              </p>
                            )}
                          </div>
                          <p className="text-sm font-bold text-emerald-700 shrink-0">
                            {fmtCur(p.amountPaid)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <Empty label="No payment records." />
                    )}
                  </div>
                </Panel>

                <Panel
                  title="Defaulters"
                  subtitle="Students with dues this month"
                >
                  {ws.defaulters.length > 0 && (
                    <div className="mb-3 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-100 px-3 py-2.5">
                      <FiAlertCircle className="text-rose-500 shrink-0" />
                      <p className="text-xs text-rose-700 font-semibold">
                        {ws.defaulters.length} student
                        {ws.defaulters.length > 1 ? "s" : ""} with pending dues
                      </p>
                    </div>
                  )}
                  <div className="space-y-2 max-h-125 overflow-y-auto pr-1">
                    {ws.defaulters.length ? (
                      ws.defaulters.map((s, i) => (
                        <div
                          key={s._id || i}
                          className="flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3"
                        >
                          <Avatar
                            name={`${s.firstName || "?"} ${s.lastName || ""}`}
                            color="rose"
                            size="sm"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-rose-900">
                              {s.firstName} {s.lastName}
                            </p>
                            <p className="text-xs text-rose-600">
                              {s.studentId || "—"} · {s.className || "—"}
                            </p>
                            {s.lastPayment?.paidDate && (
                              <p className="text-xs text-rose-400">
                                Last paid: {fmt(s.lastPayment.paidDate)}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-rose-700">
                              {fmtCur(s.calculatedDue || s.totalDue || 0)}
                            </p>
                            <p className="text-xs text-rose-400">due</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-8 text-center">
                        <FaCircleCheck className="text-emerald-400 text-2xl mx-auto mb-2" />
                        <p className="text-sm font-semibold text-emerald-800">
                          No defaulters
                        </p>
                        <p className="text-xs text-emerald-500 mt-0.5">
                          All students paid this month
                        </p>
                      </div>
                    )}
                  </div>
                </Panel>
              </div>
            )}

            {/* ═══ TRANSPORT ═══ */}
            {tab === "transport" && (
              <div className="grid gap-5 xl:grid-cols-3">
                <Panel title="Buses" subtitle={`${ws.buses.length} registered`}>
                  <div className="space-y-2 max-h-125 overflow-y-auto pr-1">
                    {ws.buses.length ? (
                      ws.buses.map((b, i) => (
                        <div
                          key={b._id || i}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-bold text-slate-800">
                              {b.busId}
                            </p>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-semibold ${b.status === "Active" ? "bg-emerald-50 text-emerald-700" : b.status === "Maintenance" ? "bg-amber-50 text-amber-700" : "bg-slate-200 text-slate-500"}`}
                            >
                              {b.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            Reg: {b.regNo} · {b.model || "—"} ·{" "}
                            {b.capacity || "—"} seats
                          </p>
                          <p className="text-xs text-slate-400">
                            Driver: {b.driver?.name || "—"} · Route:{" "}
                            {b.route?.name || "—"}
                          </p>
                          {b.nextService && (
                            <p className="text-xs text-amber-600 mt-1">
                              Next service: {fmt(b.nextService)}
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <Empty label="No buses." />
                    )}
                  </div>
                </Panel>

                <Panel title="Routes" subtitle={`${ws.routes.length} active`}>
                  <div className="space-y-2 max-h-125 overflow-y-auto pr-1">
                    {ws.routes.length ? (
                      ws.routes.map((r, i) => (
                        <div
                          key={r._id || i}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-bold text-slate-800">
                              {r.name}
                            </p>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-semibold ${r.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
                            >
                              {r.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">
                            ID: {r.routeId || r.id || "—"} · Bus:{" "}
                            {r.bus?.busId || "—"} · Driver:{" "}
                            {r.driver?.name || "—"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {r.stops || 0} stops · {r.students || 0} students ·{" "}
                            {r.startTime || "—"} – {r.endTime || "—"}
                          </p>
                          {r.stopsList?.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {r.stopsList.slice(0, 4).map((stop) => (
                                <span
                                  key={stop}
                                  className="text-[10px] bg-white border border-slate-200 rounded-md px-2 py-0.5 text-slate-600"
                                >
                                  {stop}
                                </span>
                              ))}
                              {r.stopsList.length > 4 && (
                                <span className="text-[10px] text-slate-400">
                                  +{r.stopsList.length - 4}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <Empty label="No routes." />
                    )}
                  </div>
                </Panel>

                <Panel
                  title="Drivers"
                  subtitle={`${ws.drivers.length} registered`}
                >
                  <div className="space-y-2 max-h-125 overflow-y-auto pr-1">
                    {ws.drivers.length ? (
                      ws.drivers.map((d, i) => (
                        <div
                          key={d._id || i}
                          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                        >
                          <Avatar name={d.name} color="amber" size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-slate-800">
                                {d.name}
                              </p>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${d.status === "Active" ? "bg-emerald-50 text-emerald-700" : d.status === "On Leave" ? "bg-amber-50 text-amber-700" : "bg-slate-200 text-slate-500"}`}
                              >
                                {d.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">
                              {d.driverId || "—"} · {d.phone}
                            </p>
                            <p className="text-xs text-slate-400">
                              Exp: {d.experience || "—"} · Bus:{" "}
                              {d.bus?.busId || "—"} · Route:{" "}
                              {d.route?.name || "—"}
                            </p>
                            {d.license && (
                              <p className="text-xs text-slate-400">
                                Lic: {d.license}
                                {d.licenseExpiry
                                  ? ` · Exp: ${fmt(d.licenseExpiry)}`
                                  : ""}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <Empty label="No drivers." />
                    )}
                  </div>
                </Panel>
              </div>
            )}

            {/* ═══ LIBRARY ═══ */}
            {tab === "library" && (
              <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
                <Panel
                  title="Book Inventory"
                  subtitle={`${ws.books.length} titles · ${metrics.booksAvailable} available`}
                >
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <SumBox label="Titles" value={ws.books.length} />
                    <SumBox
                      label="Available"
                      value={metrics.booksAvailable}
                      color="emerald"
                    />
                    <SumBox
                      label="Issued"
                      value={ws.issueSummary?.totalIssued || 0}
                      color="blue"
                    />
                  </div>
                  <div className="space-y-2 max-h-110 overflow-y-auto pr-1">
                    {ws.books.length ? (
                      ws.books.map((b, i) => (
                        <div
                          key={b._id || i}
                          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                        >
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center text-sm shrink-0">
                            <FaBook />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">
                              {b.title}
                            </p>
                            <p className="text-xs text-slate-400">
                              {b.author} · {b.category}
                            </p>
                            <p className="text-xs text-slate-400">
                              ISBN: {b.isbn}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${Number(b.availableCopies) > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-500 border-slate-200"}`}
                            >
                              {b.availableCopies}/{b.totalCopies}
                            </span>
                            <p className="text-xs text-slate-400 mt-0.5">
                              copies
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <Empty label="No books." />
                    )}
                  </div>
                </Panel>

                <div className="space-y-4">
                  <Panel title="Issue Summary" subtitle="">
                    <div className="grid grid-cols-2 gap-3">
                      <SumCard
                        label="Issued"
                        value={ws.issueSummary?.totalIssued || 0}
                        color="blue"
                      />
                      <SumCard
                        label="Overdue"
                        value={ws.issueSummary?.overdue || 0}
                        color={ws.issueSummary?.overdue > 0 ? "rose" : "slate"}
                      />
                      <SumCard
                        label="Returned"
                        value={ws.issueSummary?.returned || 0}
                        color="emerald"
                      />
                      <SumCard
                        label="Fine"
                        value={fmtCur(ws.issueSummary?.pendingFine || 0)}
                        color="amber"
                      />
                    </div>
                  </Panel>

                  <Panel title="Issue Records" subtitle="All transactions">
                    <div className="space-y-2 max-h-85 overflow-y-auto pr-1">
                      {ws.issues.length ? (
                        ws.issues.map((iss, i) => {
                          const sc =
                            iss.status === "Overdue"
                              ? "text-rose-600 bg-rose-50 border-rose-100"
                              : iss.status === "Returned"
                                ? "text-slate-500 bg-slate-100 border-slate-200"
                                : "text-blue-600 bg-blue-50 border-blue-100";
                          return (
                            <div
                              key={iss._id || i}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-800">
                                    {iss.studentId?.firstName || "—"}{" "}
                                    {iss.studentId?.lastName || ""}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    {iss.bookId?.title || "—"} ·{" "}
                                    {iss.bookId?.author || ""}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    ISBN: {iss.bookId?.isbn || "—"} · Category:{" "}
                                    {iss.bookId?.category || "—"}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    Due: {fmt(iss.dueDate)}
                                    {iss.returnDate
                                      ? ` · Returned: ${fmt(iss.returnDate)}`
                                      : ""}
                                  </p>
                                  {iss.fineAmount > 0 && (
                                    <p className="text-xs text-rose-500">
                                      Fine: {fmtCur(iss.fineAmount)} (Paid:{" "}
                                      {fmtCur(iss.finePaid || 0)})
                                    </p>
                                  )}
                                </div>
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full font-semibold border shrink-0 ${sc}`}
                                >
                                  {iss.status}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <Empty label="No issue records." />
                      )}
                    </div>
                  </Panel>
                </div>
              </div>
            )}

            {/*=== syllabus ==== */}
            {tab === "syllabus" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    Course Syllabus
                  </h2>
                  <span className="text-xs font-medium px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full">
                    {ws.syllabusClasses?.length || 0} Classes
                  </span>
                </div>

                {!ws.syllabusClasses || ws.syllabusClasses.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                    <p className="text-sm text-slate-400">
                      No syllabus data available yet.
                    </p>
                  </div>
                ) : (
                  ws.syllabusClasses.map((classItem) => (
                    <div key={classItem._id} className="group">
                      {/* Class Label */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-6 w-1 bg-indigo-500 rounded-full"></div>
                        <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                          Class
                        </span>
                        <h3 className="text-base font-bold text-slate-800">
                          {classItem.name}
                        </h3>
                      </div>

                      {/* Subjects Grid - Side by Side on Desktop */}
                      {classItem.subjects?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {classItem.subjects.map((subject) => (
                            <div
                              key={subject._id}
                              className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                            >
                              <div className="flex flex-col gap-3">
                                <div>
                                  <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-tight">
                                    Subject
                                  </span>
                                  <p className="text-sm font-semibold text-slate-800 leading-none mt-1">
                                    {subject.name}
                                  </p>
                                </div>

                                <div className="space-y-2">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                    Chapters
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {subject.chapters?.length > 0 ? (
                                      subject.chapters.map((chapter) => (
                                        <span
                                          key={chapter._id}
                                          className="text-[11px] bg-slate-50 text-slate-600 border border-slate-100 rounded-md px-2 py-1 hover:bg-white hover:border-indigo-200 transition-colors"
                                        >
                                          {chapter.name}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-xs italic text-slate-300">
                                        No chapters listed
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-slate-50 rounded-lg p-4 text-xs text-slate-400 italic">
                          No subjects assigned to this class.
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/*=== setup checklist ==== */}
            {tab === "setup" && setupChecklist && (
              <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                <Panel
                  title="Implementation Checklist"
                  subtitle="Super admin readiness tracker"
                >
                  <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          Completion
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {setupChecklist.completed}/{setupChecklist.total}{" "}
                          setup milestones completed
                        </p>
                      </div>
                      <p className="text-3xl font-black text-indigo-600">
                        {setupChecklist.percent}%
                      </p>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-indigo-500 to-sky-400"
                        style={{ width: `${setupChecklist.percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {setupChecklist.items.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <div
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                            item.done
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-slate-200 text-slate-400"
                          }`}
                        >
                          <FaCircleCheck />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-slate-800">
                              {item.label}
                            </p>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                item.done
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {item.done ? "Done" : "Pending"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            {item.note}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>

                <div className="space-y-4">
                  <Panel title="What Needs Attention" subtitle="">
                    <div className="space-y-2">
                      {setupChecklist.items
                        .filter((item) => !item.done)
                        .map((item) => (
                          <div
                            key={item.label}
                            className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3"
                          >
                            <p className="text-sm font-semibold text-amber-800">
                              {item.label}
                            </p>
                            <p className="text-xs text-amber-700 mt-1">
                              {item.note}
                            </p>
                          </div>
                        ))}
                      {setupChecklist.items.every((item) => item.done) && (
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5 text-center">
                          <FaCircleCheck className="mx-auto mb-2 text-2xl text-emerald-500" />
                          <p className="text-sm font-semibold text-emerald-800">
                            Setup looks complete
                          </p>
                          <p className="text-xs text-emerald-600 mt-1">
                            This school has completed all tracked setup
                            milestones.
                          </p>
                        </div>
                      )}
                    </div>
                  </Panel>

                  <Panel title="Module Snapshot" subtitle="">
                    <div className="space-y-0">
                      <MiniField label="Classes" value={metrics.totalClasses} />
                      <MiniField label="Sections" value={ws.sections.length} />
                      <MiniField
                        label="Subjects"
                        value={metrics.totalSubjects}
                      />
                      <MiniField
                        label="Teachers"
                        value={metrics.totalTeachers}
                      />
                      <MiniField
                        label="Students"
                        value={metrics.totalStudents}
                      />
                      <MiniField label="Payments" value={ws.payments.length} />
                      <MiniField label="Books" value={ws.books.length} />
                      <MiniField
                        label="Syllabus Classes"
                        value={ws.syllabusClasses.length}
                      />
                    </div>
                  </Panel>
                </div>
              </div>
            )}

            {/*=== alerts ==== */}
            {tab === "alerts" && alertSummary && (
              <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-4">
                  <Panel
                    title="Alert Summary"
                    subtitle="Live operational signals"
                  >
                    <div className="grid grid-cols-3 gap-3">
                      <SumCard
                        label="High"
                        value={alertSummary.grouped.high.length}
                        color={
                          alertSummary.grouped.high.length > 0
                            ? "rose"
                            : "slate"
                        }
                      />
                      <SumCard
                        label="Medium"
                        value={alertSummary.grouped.medium.length}
                        color={
                          alertSummary.grouped.medium.length > 0
                            ? "amber"
                            : "slate"
                        }
                      />
                      <SumCard
                        label="Low"
                        value={alertSummary.grouped.low.length}
                        color={
                          alertSummary.grouped.low.length > 0 ? "blue" : "slate"
                        }
                      />
                    </div>
                    <div className="mt-4 space-y-0">
                      <MiniField
                        label="Checklist Completion"
                        value={`${setupChecklist?.percent || 0}%`}
                        warn={(setupChecklist?.percent || 0) < 60}
                      />
                      <MiniField
                        label="Subscription Status"
                        value={ps?.label || "—"}
                        warn={ps?.label === "Expired"}
                      />
                      <MiniField
                        label="Defaulters"
                        value={ws.defaulters.length}
                        warn={ws.defaulters.length > 0}
                      />
                      <MiniField
                        label="Overdue Books"
                        value={ws.issueSummary?.overdue || 0}
                        warn={(ws.issueSummary?.overdue || 0) > 0}
                      />
                    </div>
                  </Panel>

                  <Panel title="Priority Flags" subtitle="">
                    <div className="space-y-2">
                      {alertSummary.grouped.high.length ? (
                        alertSummary.grouped.high.map((item) => (
                          <AlertCard key={item.title} item={item} />
                        ))
                      ) : (
                        <Empty label="No high-severity alerts." />
                      )}
                    </div>
                  </Panel>
                </div>

                <Panel
                  title="All Alerts"
                  subtitle={`${alertSummary.total} active`}
                >
                  <div className="space-y-2 max-h-155 overflow-y-auto pr-1">
                    {alertSummary.alerts.length ? (
                      alertSummary.alerts.map((item) => (
                        <AlertCard
                          key={`${item.severity}-${item.title}`}
                          item={item}
                        />
                      ))
                    ) : (
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-8 text-center">
                        <FaCircleCheck className="mx-auto mb-2 text-2xl text-emerald-500" />
                        <p className="text-sm font-semibold text-emerald-800">
                          No active alerts
                        </p>
                        <p className="text-xs text-emerald-600 mt-0.5">
                          This workspace does not currently show any risk flags.
                        </p>
                      </div>
                    )}
                  </div>
                </Panel>
              </div>
            )}

            {/*=== subscription ==== */}
            {tab === "subscription" && (
              <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
                <Panel
                  title="Current Plan"
                  subtitle="Subscription and access context"
                >
                  <div className="rounded-2xl bg-linear-to-br from-indigo-600 to-violet-700 p-5 text-white">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">
                      Active Plan
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-2xl font-bold">
                          {ws.school.subscription_plan?.name ||
                            "No plan assigned"}
                        </p>
                        <p className="text-sm text-indigo-100 mt-1">
                          {ws.school.subscription_plan
                            ? `${ws.school.subscription_plan.currency} ${ws.school.subscription_plan.price} / ${ws.school.subscription_plan.billing_cycle}`
                            : "Assign a plan to unlock role-based access."}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${ps?.cls || "bg-white/20 text-white"}`}
                      >
                        {ps?.label || "No Plan"}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <GlanceBox
                        label="Start"
                        value={fmt(ws.school.start_date)}
                      />
                      <GlanceBox label="End" value={fmt(ws.school.end_date)} />
                      <GlanceBox
                        label="School Status"
                        value={ws.school.status || "—"}
                      />
                      <GlanceBox
                        label="Admin"
                        value={ws.school.admin_name || "—"}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Field
                      label="Plan Name"
                      value={ws.school.subscription_plan?.name}
                    />
                    <Field
                      label="Slug"
                      value={ws.school.subscription_plan?.slug}
                    />
                    <Field
                      label="Currency"
                      value={ws.school.subscription_plan?.currency}
                    />
                    <Field
                      label="Billing Cycle"
                      value={ws.school.subscription_plan?.billing_cycle}
                    />
                    <Field
                      label="Price"
                      value={
                        ws.school.subscription_plan?.price != null
                          ? fmtCur(ws.school.subscription_plan.price)
                          : "—"
                      }
                    />
                    <Field
                      label="Plan Status"
                      value={ws.school.subscription_plan?.status}
                    />
                  </div>
                </Panel>

                <div className="space-y-4">
                  <Panel title="Included Roles" subtitle="Plan-level access">
                    <div className="flex flex-wrap gap-2">
                      {ws.school.subscription_plan?.roles?.length ? (
                        ws.school.subscription_plan.roles.map((role) => (
                          <Tag
                            key={role._id || role.name}
                            text={role.name}
                            color="indigo"
                          />
                        ))
                      ) : (
                        <p className="text-xs text-slate-400">
                          No roles mapped to this subscription.
                        </p>
                      )}
                    </div>
                  </Panel>

                  <Panel title="Renewal Readiness" subtitle="">
                    <div className="space-y-0">
                      <MiniField
                        label="Plan Window"
                        value={`${fmt(ws.school.start_date)} → ${fmt(ws.school.end_date)}`}
                        warn={ps?.label === "Expired"}
                      />
                      <MiniField
                        label="School Status"
                        value={ws.school.status}
                        warn={ws.school.status !== "Active"}
                      />
                      <MiniField
                        label="Outstanding Due"
                        value={fmtCur(metrics.totalDue)}
                        warn={metrics.totalDue > 0}
                      />
                      <MiniField
                        label="Checklist Completion"
                        value={`${setupChecklist?.percent || 0}%`}
                        warn={(setupChecklist?.percent || 0) < 60}
                      />
                    </div>
                  </Panel>

                  <Panel title="Super Admin Notes" subtitle="">
                    <div className="space-y-2">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-sm font-semibold text-slate-800">
                          Best next action
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {ps?.label === "Expired"
                            ? "Renew or extend the subscription immediately to keep the school operational."
                            : ws.school.status !== "Active"
                              ? "Reactivate the school after validating the subscription and admin setup."
                              : (setupChecklist?.percent || 0) < 80
                                ? "Finish the remaining setup items before considering this school fully onboarded."
                                : "This school looks stable. Monitor fees, transport, and library risk indicators."}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-sm font-semibold text-slate-800">
                          Current operational signal
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {alertSummary?.total
                            ? `${alertSummary.total} alert${alertSummary.total > 1 ? "s are" : " is"} active for this school.`
                            : "No major risk signals are active right now."}
                        </p>
                      </div>
                    </div>
                  </Panel>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════ ATOMS ═══════════ */

const ContactChip = ({ icon, text }) => (
  <span className="flex items-center gap-1 text-xs text-slate-400">
    {icon}
    {text}
  </span>
);

const InfoPair = ({ label, value }) => (
  <div className="flex items-start justify-between gap-2">
    <p className="text-xs text-slate-400 shrink-0">{label}</p>
    <p className="text-xs font-semibold text-slate-700 text-right truncate max-w-32.5">
      {value}
    </p>
  </div>
);

const KpiCard = ({ icon, color, label, value, sub }) => {
  const c = {
    indigo: "bg-indigo-50 text-indigo-600",
    violet: "bg-violet-50 text-violet-600",
    sky: "bg-sky-50 text-sky-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3.5 flex items-center gap-3">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm shrink-0 ${c[color]}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400 font-medium truncate">{label}</p>
        <p className="text-lg font-bold text-slate-900 leading-tight">
          {value}
        </p>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
};

const StatStrip = ({ label, value, sub, warn }) => (
  <div
    className={`rounded-xl bg-white border shadow-sm p-4 ${warn ? "border-rose-200" : "border-slate-200"}`}
  >
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
      {label}
    </p>
    <p
      className={`text-2xl font-bold mt-1 ${warn ? "text-rose-600" : "text-slate-900"}`}
    >
      {value}
    </p>
    <p className="text-xs text-slate-400 mt-1">{sub}</p>
  </div>
);

const Panel = ({ title, subtitle, children, className = "" }) => (
  <div
    className={`rounded-2xl bg-white border border-slate-200 shadow-sm p-5 ${className}`}
  >
    <div className="mb-4 pb-3 border-b border-slate-100">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
);

const Field = ({ label, value }) => (
  <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
      {label}
    </p>
    <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">
      {value || "—"}
    </p>
  </div>
);

const MiniField = ({ label, value, warn }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
    <p className="text-xs text-slate-500">{label}</p>
    <p
      className={`text-xs font-bold ${warn ? "text-rose-600" : "text-slate-800"}`}
    >
      {value ?? "—"}
    </p>
  </div>
);

const GlanceBox = ({ label, value }) => (
  <div className="rounded-xl bg-white/15 px-3 py-2.5">
    <p className="text-[10px] text-indigo-200 font-medium">{label}</p>
    <p className="text-lg font-bold text-white leading-tight">{value}</p>
  </div>
);

const SumBox = ({ label, value, color }) => {
  const cls = {
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
    rose: "bg-rose-50 border-rose-100 text-rose-700",
    blue: "bg-blue-50 border-blue-100 text-blue-700",
  };
  return (
    <div
      className={`rounded-xl border p-3 text-center ${cls[color] || "bg-slate-50 border-slate-200 text-slate-700"}`}
    >
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[10px] font-semibold mt-0.5 opacity-80 uppercase tracking-wide">
        {label}
      </p>
    </div>
  );
};

const SumCard = ({ label, value, color }) => {
  const cls = {
    blue: "bg-blue-50 border-blue-100",
    rose: "bg-rose-50 border-rose-100",
    emerald: "bg-emerald-50 border-emerald-100",
    amber: "bg-amber-50 border-amber-100",
    slate: "bg-slate-50 border-slate-200",
  };
  const text = {
    blue: "text-blue-800",
    rose: "text-rose-800",
    emerald: "text-emerald-800",
    amber: "text-amber-800",
    slate: "text-slate-700",
  };
  return (
    <div className={`rounded-xl border p-4 text-center ${cls[color]}`}>
      <p className={`text-2xl font-bold ${text[color]}`}>{value}</p>
      <p className="text-xs font-semibold mt-0.5 opacity-70">{label}</p>
    </div>
  );
};

const BarStat = ({ label, value, max, color }) => {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-slate-600 font-medium">{label}</span>
        <span className="text-slate-400">
          {value} ({pct}%)
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

const Tag = ({ text, color }) => {
  const cls = {
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${cls[color] || "bg-slate-100 text-slate-600 border-slate-200"}`}
    >
      {text}
    </span>
  );
};

const AlertCard = ({ item }) => {
  const tone =
    item.severity === "high"
      ? "border-rose-100 bg-rose-50 text-rose-800"
      : item.severity === "medium"
        ? "border-amber-100 bg-amber-50 text-amber-800"
        : "border-sky-100 bg-sky-50 text-sky-800";

  const badge =
    item.severity === "high"
      ? "bg-rose-100 text-rose-700"
      : item.severity === "medium"
        ? "bg-amber-100 text-amber-700"
        : "bg-sky-100 text-sky-700";

  return (
    <div className={`rounded-xl border px-4 py-3 ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{item.title}</p>
          <p className="text-xs mt-1 opacity-80">{item.detail}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${badge}`}
        >
          {item.severity}
        </span>
      </div>
    </div>
  );
};

const Avatar = ({ name = "?", color = "indigo", size = "md" }) => {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const sizes = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm" };
  const colors = {
    indigo: "bg-indigo-100 text-indigo-700",
    violet: "bg-violet-100 text-violet-700",
    emerald: "bg-emerald-100 text-emerald-700",
    rose: "bg-rose-100 text-rose-700",
    amber: "bg-amber-100 text-amber-700",
  };
  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold shrink-0 ${sizes[size]} ${colors[color] || colors.indigo}`}
    >
      {initials}
    </div>
  );
};

const Empty = ({ label }) => (
  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
    <p className="text-xs text-slate-400">{label}</p>
  </div>
);
