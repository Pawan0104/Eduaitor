import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FaArrowLeft,
  FaBolt,
  FaCalendarAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSchool,
  FaUserGraduate,
  FaUsers,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const API = import.meta.env.VITE_API_URL;

const createInitialActionForm = () => ({
  schoolId: "",
  schoolName: "",
  mode: "extend",
  status: "Active",
  end_date: "",
});

const dateLabel = (value) => {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const daysUntil = (value) => {
  if (!value) return null;
  const diff = new Date(value).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / 86400000);
};

const getChecklist = (school, details) => {
  const items = [
    {
      id: "profile",
      label: "School profile",
      done: Boolean(
        school.school_name &&
          school.slug &&
          school.contact_email &&
          school.contact_phone &&
          school.address,
      ),
    },
    {
      id: "subscription",
      label: "Subscription assigned",
      done: Boolean(school.subscription_plan),
    },
    {
      id: "admin",
      label: "Admin account",
      done: Boolean(school.admin_name && school.admin_email),
    },
    {
      id: "classes",
      label: "Classes created",
      done: (details.classesCount || 0) > 0,
    },
    {
      id: "sections",
      label: "Sections created",
      done: (details.sectionsCount || 0) > 0,
    },
    {
      id: "teachers",
      label: "Teachers added",
      done: (details.teachersCount || 0) > 0,
    },
    {
      id: "students",
      label: "Students added",
      done: (details.studentsCount || 0) > 0,
    },
    {
      id: "syllabus",
      label: "Syllabus started",
      done: (details.syllabusClassesCount || 0) > 0,
    },
  ];

  const completed = items.filter((item) => item.done).length;
  return {
    items,
    completed,
    total: items.length,
    percent: Math.round((completed / items.length) * 100),
  };
};

const getHealth = (school, details, checklist) => {
  const subscriptionDaysLeft = daysUntil(school.end_date);
  const defaultersCount = details.defaultersCount || 0;
  const totalStudents = details.studentsCount || 0;
  const defaulterRatio = totalStudents ? defaultersCount / totalStudents : 0;
  const teacherCoverage = details.classesCount
    ? Math.min((details.teachersCount || 0) / details.classesCount, 1)
    : details.teachersCount > 0
      ? 1
      : 0;

  let score = 0;

  score += school.status === "Active" ? 20 : 0;
  score += subscriptionDaysLeft === null ? 0 : subscriptionDaysLeft > 30 ? 20 : subscriptionDaysLeft >= 0 ? 12 : 0;
  score += Math.round(checklist.percent * 0.35);
  score += Math.round(teacherCoverage * 15);
  score += defaulterRatio <= 0.1 ? 10 : defaulterRatio <= 0.25 ? 5 : 0;

  score = Math.min(score, 100);

  if (score >= 80) return { score, label: "Healthy", tone: "emerald" };
  if (score >= 55) return { score, label: "Needs attention", tone: "amber" };
  return { score, label: "Critical", tone: "rose" };
};

const getExpiryMeta = (endDate) => {
  const days = daysUntil(endDate);
  if (days === null) return { label: "No end date", tone: "slate" };
  if (days < 0) return { label: "Expired", tone: "rose" };
  if (days <= 30) return { label: `${days} days left`, tone: "amber" };
  return { label: "Active", tone: "emerald" };
};

const fetchCount = async (url, mapper) => {
  try {
    const res = await axios.get(url, { withCredentials: true });
    return mapper(res.data);
  } catch {
    return 0;
  }
};

export default function PlatformAnalytics() {
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [schools, setSchools] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [healthFilter, setHealthFilter] = useState("all");
  const [actionForm, setActionForm] = useState(createInitialActionForm());
  const [showActionModal, setShowActionModal] = useState(false);
  const [savingAction, setSavingAction] = useState(false);

  const loadData = async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const schoolsRes = await axios.get(`${API}/schools`, {
        withCredentials: true,
      });
      const rawSchools = schoolsRes.data.data || [];

      const schoolRows = await Promise.all(
        rawSchools.map(async (school) => {
          const schoolId = school._id;
          const [studentsCount, teachersCount, classesCount, sectionsCount, defaultersCount, syllabusClassesCount] =
            await Promise.all([
              fetchCount(
                `${API}/students/all/admin?schoolId=${schoolId}`,
                (data) => data.data?.length || 0,
              ),
              fetchCount(
                `${API}/teachers/all/admin?schoolId=${schoolId}`,
                (data) => data.data?.length || 0,
              ),
              fetchCount(
                `${API}/classes/all/admin?schoolId=${schoolId}`,
                (data) => data.classes?.length || 0,
              ),
              fetchCount(
                `${API}/sections/all/admin?schoolId=${schoolId}`,
                (data) => data.sections?.length || 0,
              ),
              fetchCount(
                `${API}/fees/defaulters/admin?schoolId=${schoolId}&page=1&limit=1`,
                (data) => data.pagination?.total || data.defaulters?.length || 0,
              ),
              fetchCount(
                `${API}/syllabus/complete?schoolId=${schoolId}`,
                (data) => data.data?.classes?.length || 0,
              ),
            ]);

          const details = {
            studentsCount,
            teachersCount,
            classesCount,
            sectionsCount,
            defaultersCount,
            syllabusClassesCount,
          };

          const checklist = getChecklist(school, details);
          const health = getHealth(school, details, checklist);
          const expiry = getExpiryMeta(school.end_date);

          return {
            ...school,
            details,
            checklist,
            health,
            expiry,
          };
        }),
      );

      setSchools(schoolRows);
    } catch (error) {
      toast.error("Failed to load platform analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredSchools = useMemo(() => {
    return schools.filter((school) => {
      const matchesQuery =
        !query ||
        school.school_name?.toLowerCase().includes(query.toLowerCase()) ||
        school.slug?.toLowerCase().includes(query.toLowerCase()) ||
        school.admin_email?.toLowerCase().includes(query.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ? true : school.status === statusFilter;

      const matchesHealth =
        healthFilter === "all" ? true : school.health.label === healthFilter;

      return matchesQuery && matchesStatus && matchesHealth;
    });
  }, [healthFilter, query, schools, statusFilter]);

  const summary = useMemo(() => {
    const totalSchools = schools.length;
    const activeSchools = schools.filter((school) => school.status === "Active").length;
    const totalStudents = schools.reduce(
      (sum, school) => sum + (school.details.studentsCount || 0),
      0,
    );
    const totalTeachers = schools.reduce(
      (sum, school) => sum + (school.details.teachersCount || 0),
      0,
    );
    const expiringSoon = schools.filter((school) => {
      const days = daysUntil(school.end_date);
      return days !== null && days >= 0 && days <= 30;
    }).length;
    const criticalSchools = schools.filter(
      (school) => school.health.label === "Critical",
    ).length;

    return {
      totalSchools,
      activeSchools,
      totalStudents,
      totalTeachers,
      expiringSoon,
      criticalSchools,
    };
  }, [schools]);

  const openActionModal = (school, mode) => {
    setActionForm({
      schoolId: school._id,
      schoolName: school.school_name,
      mode,
      status: mode === "suspend" ? "Inactive" : "Active",
      end_date: school.end_date ? school.end_date.slice(0, 10) : "",
    });
    setShowActionModal(true);
  };

  const saveAction = async () => {
    const payload = {};

    if (actionForm.mode === "extend") {
      if (!actionForm.end_date) {
        toast.error("Please choose a new end date");
        return;
      }
      payload.end_date = actionForm.end_date;
      payload.status = "Active";
    } else {
      payload.status = actionForm.status;
    }

    setSavingAction(true);
    try {
      await axios.put(`${API}/schools/${actionForm.schoolId}`, payload, {
        withCredentials: true,
      });
      toast.success(
        actionForm.mode === "extend"
          ? "Subscription updated"
          : `School ${actionForm.status === "Active" ? "reactivated" : "suspended"}`,
      );
      setShowActionModal(false);
      setActionForm(createInitialActionForm());
      await loadData({ silent: true });
    } catch (error) {
      toast.error("Action failed");
    } finally {
      setSavingAction(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {isMobile && (
        <div className="pt-4">
          <button
            onClick={() => navigate(-1)}
            className="mb-2.5 flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-1.5 text-sm font-bold text-slate-600 shadow-sm transition-transform active:scale-95"
          >
            <FaArrowLeft size={16} />
            Back
          </button>
        </div>
      )}

      <section className="overflow-hidden rounded-3xl bg-linear-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-200">
              Super Admin
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              Platform Analytics and School Health
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Track school readiness, detect expiring subscriptions, and take quick
              operational actions from one workspace.
            </p>
          </div>

          <button
            onClick={() => loadData({ silent: true })}
            className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            {refreshing ? "Refreshing..." : "Refresh analytics"}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          icon={<FaSchool />}
          label="Total schools"
          value={summary.totalSchools}
          detail={`${summary.activeSchools} active`}
          tone="indigo"
        />
        <StatCard
          icon={<FaUserGraduate />}
          label="Students tracked"
          value={summary.totalStudents}
          detail="Across all schools"
          tone="sky"
        />
        <StatCard
          icon={<FaUsers />}
          label="Teachers tracked"
          value={summary.totalTeachers}
          detail="Across all schools"
          tone="emerald"
        />
        <StatCard
          icon={<FaCalendarAlt />}
          label="Expiring soon"
          value={summary.expiringSoon}
          detail="Within 30 days"
          tone="amber"
        />
        <StatCard
          icon={<FaExclamationTriangle />}
          label="Critical schools"
          value={summary.criticalSchools}
          detail="Need intervention"
          tone="rose"
        />
        <StatCard
          icon={<FaCheckCircle />}
          label="Healthy schools"
          value={schools.filter((school) => school.health.label === "Healthy").length}
          detail="Operationally stable"
          tone="violet"
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Filters</h2>
            <p className="text-sm text-slate-500">
              Narrow the schools list to find risks faster.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-180">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search school, slug, or email"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none ring-0 transition focus:border-indigo-400"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
            >
              <option value="all">All statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            <select
              value={healthFilter}
              onChange={(e) => setHealthFilter(e.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
            >
              <option value="all">All health states</option>
              <option value="Healthy">Healthy</option>
              <option value="Needs attention">Needs attention</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">School health board</h2>
            <p className="text-sm text-slate-500">
              Readiness, subscription state, and quick operational actions.
            </p>
          </div>
          <p className="text-sm font-semibold text-slate-500">
            {filteredSchools.length} schools
          </p>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-500">Loading analytics...</div>
        ) : filteredSchools.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            No schools match the current filters.
          </div>
        ) : (
          <div className="grid gap-4 p-5 xl:grid-cols-2">
            {filteredSchools.map((school) => (
              <article
                key={school._id}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-bold text-slate-900">
                        {school.school_name}
                      </h3>
                      <StatusPill text={school.status} tone={school.status === "Active" ? "emerald" : "slate"} />
                      <StatusPill text={school.expiry.label} tone={school.expiry.tone} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{school.slug}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {school.admin_email || "No admin email"} - {school.contact_phone || "No phone"}
                    </p>
                  </div>

                  <div className="min-w-32 rounded-2xl bg-white px-4 py-3 text-center shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Health
                    </p>
                    <p className={`mt-1 text-3xl font-black ${toneText(school.health.tone)}`}>
                      {school.health.score}
                    </p>
                    <p className="text-sm font-semibold text-slate-600">
                      {school.health.label}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <MiniMetric label="Students" value={school.details.studentsCount} />
                  <MiniMetric label="Teachers" value={school.details.teachersCount} />
                  <MiniMetric label="Classes" value={school.details.classesCount} />
                  <MiniMetric label="Defaulters" value={school.details.defaultersCount} warn={school.details.defaultersCount > 0} />
                </div>

                <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900">Onboarding checklist</p>
                      <p className="text-xs text-slate-500">
                        {school.checklist.completed}/{school.checklist.total} completed
                      </p>
                    </div>
                    <p className="text-sm font-black text-indigo-600">
                      {school.checklist.percent}%
                    </p>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-indigo-500 to-sky-400"
                      style={{ width: `${school.checklist.percent}%` }}
                    />
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {school.checklist.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                      >
                        <span className={item.done ? "text-emerald-500" : "text-slate-300"}>
                          <FaCheckCircle />
                        </span>
                        <span className="text-sm font-medium text-slate-600">
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={() => navigate(`/admin/school-view/${school._id}`)}
                    className="rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    Open school detail
                  </button>
                  <button
                    onClick={() => openActionModal(school, "extend")}
                    className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
                  >
                    Extend subscription
                  </button>
                  {school.status === "Active" ? (
                    <button
                      onClick={() => openActionModal(school, "suspend")}
                      className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                    >
                      Suspend school
                    </button>
                  ) : (
                    <button
                      onClick={() => openActionModal(school, "reactivate")}
                      className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      Reactivate school
                    </button>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>Plan: {school.subscription_plan?.name || "Not assigned"}</span>
                  <span>Start: {dateLabel(school.start_date)}</span>
                  <span>End: {dateLabel(school.end_date)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {showActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="mt-1 rounded-2xl bg-indigo-50 p-3 text-indigo-600">
                {actionForm.mode === "extend" ? <FaCalendarAlt /> : <FaBolt />}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {actionForm.mode === "extend"
                    ? "Extend subscription"
                    : actionForm.mode === "suspend"
                      ? "Suspend school"
                      : "Reactivate school"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {actionForm.schoolName}
                </p>
              </div>
            </div>

            {actionForm.mode === "extend" ? (
              <div className="mt-6 space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  New subscription end date
                </label>
                <input
                  type="date"
                  value={actionForm.end_date}
                  onChange={(e) =>
                    setActionForm((prev) => ({ ...prev, end_date: e.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                />
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-600">
                  {actionForm.mode === "suspend"
                    ? "This will mark the school as inactive while preserving its data."
                    : "This will restore the school to active status."}
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowActionModal(false)}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={saveAction}
                disabled={savingAction}
                className="rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {savingAction ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const StatCard = ({ icon, label, value, detail, tone }) => (
  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
        <p className="mt-1 text-sm text-slate-500">{detail}</p>
      </div>
      <div className={`rounded-2xl p-3 ${toneBg(tone)} ${toneText(tone)}`}>{icon}</div>
    </div>
  </div>
);

const MiniMetric = ({ label, value, warn = false }) => (
  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
      {label}
    </p>
    <p className={`mt-1 text-2xl font-black ${warn ? "text-rose-600" : "text-slate-900"}`}>
      {value}
    </p>
  </div>
);

const StatusPill = ({ text, tone }) => (
  <span className={`rounded-full px-3 py-1 text-xs font-bold ${toneBg(tone)} ${toneText(tone)}`}>
    {text}
  </span>
);

const toneBg = (tone) => {
  switch (tone) {
    case "emerald":
      return "bg-emerald-50";
    case "amber":
      return "bg-amber-50";
    case "rose":
      return "bg-rose-50";
    case "sky":
      return "bg-sky-50";
    case "violet":
      return "bg-violet-50";
    case "slate":
      return "bg-slate-100";
    default:
      return "bg-indigo-50";
  }
};

const toneText = (tone) => {
  switch (tone) {
    case "emerald":
      return "text-emerald-700";
    case "amber":
      return "text-amber-700";
    case "rose":
      return "text-rose-700";
    case "sky":
      return "text-sky-700";
    case "violet":
      return "text-violet-700";
    case "slate":
      return "text-slate-600";
    default:
      return "text-indigo-700";
  }
};
