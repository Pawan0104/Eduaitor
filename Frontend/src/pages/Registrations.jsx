import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  FiAlertCircle,
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClipboard,
  FiCopy,
  FiDownload,
  FiEdit2,
  FiExternalLink,
  FiEye,
  FiLink,
  FiLock,
  FiMessageSquare,
  FiMoreVertical,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiTrash2,
  FiUserPlus,
  FiX,
} from "react-icons/fi";
import { toast } from "react-toastify";
import { API } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { useAcademicSession } from "../context/AcademicSessionContext";
import AdmissionFormBuilder from "../components/AdmissionFormBuilder";
import ConfigurableFormFields, {
  buildCustomFieldsPayload,
  emptyCustomValues,
  hydrateCustomValues,
  isCustomFieldKey,
  validateConfigurableFields,
} from "../components/ConfigurableFormFields";
import {
  REGISTRATION_FIELD_TYPES,
  REGISTRATION_LOCKED_FIELD_KEYS,
  mergeRegistrationSteps,
} from "../lib/registrationFormDefaults";
import { INDIA_STATES, districtsForState } from "../lib/indiaLocations";

const STATUS_META = {
  registered: {
    label: "Registered",
    className: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-500",
  },
  exam_scheduled: {
    label: "Exam scheduled",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200",
    dot: "bg-indigo-600",
  },
  passed: {
    label: "Passed",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-600",
  },
  failed: {
    label: "Failed",
    className: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-600",
  },
  admitted: {
    label: "Admitted",
    className: "bg-emerald-100 text-emerald-800 border-emerald-300",
    dot: "bg-emerald-600",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-slate-100 text-slate-500 border-slate-200",
    dot: "bg-slate-400",
  },
  new: {
    label: "New",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-600",
  },
  in_followup: {
    label: "In follow-up",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
};

const STATUS_FILTERS = [
  { value: "", label: "Status: All" },
  { value: "registered", label: "Registered" },
  { value: "exam_scheduled", label: "Exam scheduled" },
  { value: "passed", label: "Passed" },
  { value: "failed", label: "Failed" },
  { value: "admitted", label: "Admitted" },
  { value: "cancelled", label: "Cancelled" },
];

const FOLLOWUP_FILTERS = [
  { value: "", label: "Status: All" },
  { value: "new", label: "New" },
  { value: "in_followup", label: "In follow-up" },
  { value: "admitted", label: "Admitted" },
  { value: "cancelled", label: "Cancelled" },
];

const SOURCE_OPTIONS = ["Website", "Walk-in", "Referral", "Previous School"];

const emptyRegistration = () => ({
  studentName: "",
  dob: "",
  gender: "",
  bloodGroup: "",
  classId: "",
  sectionId: "",
  streamId: "",
  parentName: "",
  parentMobile: "",
  parentEmail: "",
  address: "",
  city: "",
  state: "",
  district: "",
  pincode: "",
  previousSchoolName: "",
  notes: "",
  nextFollowUpDate: "",
});

const normalizeFieldLabel = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "");

const fieldsOfSteps = (steps = []) =>
  (steps || []).flatMap((step) =>
    (step.fields || []).filter((field) => field?.key),
  );

const withCarriedFields = (steps, fields) => {
  if (!fields.length) return steps;
  return [
    ...steps.filter((step) => step.key !== "carried_from_lead"),
    {
      key: "carried_from_lead",
      title: "From Lead",
      builtin: false,
      removedFieldKeys: [],
      fields,
    },
  ];
};

/** Copy every lead value onto the registration form, including admin-added fields. */
const mapLeadOntoRegistration = (lead, steps) => {
  const form = {
    ...emptyRegistration(),
    studentName: lead.studentName || "",
    parentName: lead.parentName || "",
    parentMobile: lead.parentMobile || "",
    parentEmail: lead.parentEmail || "",
    previousSchoolName: lead.previousSchoolName || "",
    classId: lead.classId ? String(lead.classId) : "",
    streamId: lead.streamId ? String(lead.streamId) : "",
  };

  const regFields = fieldsOfSteps(steps);
  const customByKey = new Map();
  const customByLabel = new Map();
  const builtinByLabel = new Map();
  for (const field of regFields) {
    const labelKey = normalizeFieldLabel(field.label || field.key);
    if (isCustomFieldKey(field.key)) {
      customByKey.set(field.key, field);
      if (labelKey && !customByLabel.has(labelKey)) {
        customByLabel.set(labelKey, field);
      }
    } else if (
      labelKey &&
      Object.prototype.hasOwnProperty.call(form, field.key)
    ) {
      builtinByLabel.set(labelKey, field.key);
    }
  }

  const customValues = emptyCustomValues(steps);
  const carried = [];
  const seenCarry = new Set();

  for (const item of lead.customFields || []) {
    if (!item?.key) continue;
    const raw = item.value ?? "";
    if (String(raw).trim() === "") continue;

    const direct = customByKey.get(item.key);
    if (direct) {
      customValues[direct.key] =
        direct.type === "checkbox"
          ? raw === true || raw === "true"
          : String(raw);
      continue;
    }

    const labelKey = normalizeFieldLabel(item.label || item.key);
    const byLabel = labelKey ? customByLabel.get(labelKey) : null;
    if (byLabel) {
      customValues[byLabel.key] =
        byLabel.type === "checkbox"
          ? raw === true || raw === "true"
          : String(raw);
      continue;
    }

    const builtinKey = labelKey ? builtinByLabel.get(labelKey) : "";
    if (builtinKey && !String(form[builtinKey] || "").trim()) {
      form[builtinKey] = String(raw);
      continue;
    }

    const carryKey = isCustomFieldKey(item.key) ? item.key : `cf_${item.key}`;
    if (seenCarry.has(carryKey) || customByKey.has(carryKey)) continue;
    seenCarry.add(carryKey);
    const type = item.type || "text";
    carried.push({
      key: carryKey,
      label: item.label || item.key,
      type,
      required: false,
      visible: true,
      placeholder: "",
      help: "",
      options: [],
      builtin: false,
    });
    customValues[carryKey] =
      type === "checkbox" ? raw === true || raw === "true" : String(raw);
  }

  return {
    form,
    customValues,
    steps: withCarriedFields(steps, carried),
  };
};

const emptyExam = () => ({
  name: "",
  classId: "",
  examDate: "",
  startTime: "09:00",
  endTime: "11:00",
  venue: "",
  totalMarks: 100,
  passingMarks: 33,
  instructions: "",
});

const dateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const shortDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

const todayISO = () => dateInput(new Date());

const isSameDay = (value) => {
  if (!value) return false;
  return dateInput(value) === todayISO();
};

const latestFollowUpOf = (registration) => {
  const list = Array.isArray(registration?.followUps)
    ? registration.followUps
    : [];
  if (!list.length) return null;
  return [...list].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
  )[0];
};

const nextFollowUpOf = (registration) =>
  registration?.nextFollowUpDate ||
  latestFollowUpOf(registration)?.nextFollowUpDate ||
  null;

const isDueToday = (registration) => isSameDay(nextFollowUpOf(registration));

const followupStatusOf = (registration) => {
  if (!registration) return "new";
  if (registration.status === "admitted") return "admitted";
  if (registration.status === "cancelled") return "cancelled";
  return Array.isArray(registration.followUps) && registration.followUps.length
    ? "in_followup"
    : "new";
};

const displayStatusOf = (registration, mode) =>
  mode === "followup" ? followupStatusOf(registration) : registration?.status;

const initialsOf = (name = "") =>
  String(name || "?")
    .trim()
    .slice(0, 1)
    .toUpperCase() || "?";

const AVATAR_PALETTE = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
];

const avatarClassFor = (name = "") => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
};

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.registered;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
};

const Modal = ({
  open,
  title,
  subtitle,
  onClose,
  children,
  width = "max-w-2xl",
  footer,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[1px]">
      <div
        className={`flex max-h-[92vh] w-full ${width} flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-2xl`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50/70 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200/60 hover:text-slate-700"
            aria-label="Close"
          >
            <FiX size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer ? (
          <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
};

const Field = ({ label, children, hint, className = "" }) => (
  <label className={`flex flex-col gap-1 text-xs font-medium text-slate-700 ${className}`}>
    {label}
    {children}
    {hint ? (
      <span className="text-[11px] font-normal text-slate-400">{hint}</span>
    ) : null}
  </label>
);

/** Matches the built-in field shell so custom-rendered selects line up with
 * the text inputs rendered by ConfigurableFormFields. */
const ConfigField = ({ field, children }) => (
  <label className="flex flex-col gap-2 text-sm font-medium">
    <span>
      {field.label}
      {field.required ? " *" : ""}
    </span>
    {children}
  </label>
);

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15";

const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60";

const btnSecondary =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60";

const btnGhost =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60";

const Registrations = () => {
  const { user } = useAuth();
  const { selectedName } = useAcademicSession();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isStaff = user?.role === "staff_admin";
  const basePath = isStaff ? "/staff" : "/school";
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  const [mode, setMode] = useState(() => {
    if (typeof window === "undefined") return "exam";
    return window.localStorage.getItem("eduaitor_registration_mode") || "exam";
  });
  const [subTab, setSubTab] = useState("all");
  const [registrations, setRegistrations] = useState([]);
  const [stats, setStats] = useState({});
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
  });
  const [filters, setFilters] = useState({
    search: "",
    classId: "",
    status: "",
    page: 1,
  });
  const [sourceFilter, setSourceFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [searchDraft, setSearchDraft] = useState("");
  const [classes, setClasses] = useState([]);
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [rowMenuId, setRowMenuId] = useState("");
  const [applyLink, setApplyLink] = useState(null);
  const [examEnabled, setExamEnabled] = useState(true);
  const [confirmAction, setConfirmAction] = useState({
    open: false,
    type: "admit",
    registration: null,
  });

  const [regModal, setRegModal] = useState({
    open: false,
    mode: "create",
    id: "",
    leadId: "",
  });
  const [regForm, setRegForm] = useState(emptyRegistration());
  const [regSaving, setRegSaving] = useState(false);
  const [leadInfo, setLeadInfo] = useState(null);
  const [sourceLead, setSourceLead] = useState(null);
  const [modalSteps, setModalSteps] = useState(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [formSteps, setFormSteps] = useState(() =>
    mergeRegistrationSteps(null),
  );
  const [customValues, setCustomValues] = useState(() =>
    emptyCustomValues(mergeRegistrationSteps(null)),
  );

  const [exams, setExams] = useState([]);
  const [examsLoading, setExamsLoading] = useState(false);
  const [manageExamsOpen, setManageExamsOpen] = useState(false);
  const [examModal, setExamModal] = useState({ open: false, mode: "create", id: "" });
  const [examForm, setExamForm] = useState(emptyExam());
  const [examSaving, setExamSaving] = useState(false);

  const [marksModal, setMarksModal] = useState({
    open: false,
    loading: false,
    saving: false,
    exam: null,
    candidates: [],
  });
  const [marksRows, setMarksRows] = useState({});

  const [linkModal, setLinkModal] = useState({
    open: false,
    loading: false,
    saving: false,
    data: null,
  });

  const [followUpDrafts, setFollowUpDrafts] = useState({});
  const [followUpDates, setFollowUpDates] = useState({});
  const [followUpAssignees, setFollowUpAssignees] = useState({});
  const [followUpSavingId, setFollowUpSavingId] = useState("");
  const [followUpHistory, setFollowUpHistory] = useState({
    open: false,
    loading: false,
    registrationId: "",
    studentName: "",
    followUps: [],
  });
  const [viewModal, setViewModal] = useState({
    open: false,
    loading: false,
    data: null,
  });
  const followUpBoxRef = useRef(null);

  const handledQuery = useRef("");

  /* ------------------------------- loaders ------------------------------- */
  const loadRegistrations = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/registrations`, {
        params: {
          page: filters.page,
          limit: 200,
          search: filters.search || undefined,
          classId: filters.classId || undefined,
          status: mode === "exam" ? filters.status || undefined : undefined,
        },
        withCredentials: true,
      });
      setRegistrations(data?.data?.registrations || []);
      setStats(data?.data?.stats || {});
      if (typeof data?.data?.entranceExamEnabled === "boolean") {
        setExamEnabled(data.data.entranceExamEnabled);
      }
      setPagination(
        data?.data?.pagination || { page: 1, pages: 1, total: 0 },
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not load registrations.",
      );
    } finally {
      setLoading(false);
    }
  }, [filters, mode]);

  const loadExams = useCallback(async () => {
    setExamsLoading(true);
    try {
      const { data } = await axios.get(`${API}/entrance-exams`, {
        withCredentials: true,
      });
      setExams(data?.data?.exams || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not load entrance exams.",
      );
    } finally {
      setExamsLoading(false);
    }
  }, []);

  const loadClasses = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/classes/all`, {
        withCredentials: true,
      });
      setClasses(data?.classes || []);
    } catch {
      setClasses([]);
    }
    try {
      const { data } = await axios.get(`${API}/streams/all`, {
        params: { status: "Active" },
        withCredentials: true,
      });
      setStreams(data?.streams || data?.data || []);
    } catch {
      setStreams([]);
    }
  }, []);

  const loadApplyLink = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/registrations/link`, {
        withCredentials: true,
      });
      setApplyLink(data?.data || null);
      if (typeof data?.data?.entranceExamEnabled === "boolean") {
        setExamEnabled(data.data.entranceExamEnabled);
      }
    } catch {
      setApplyLink(null);
    }
  }, []);

  useEffect(() => {
    loadRegistrations();
  }, [loadRegistrations]);

  useEffect(() => {
    loadClasses();
    loadApplyLink();
  }, [loadClasses, loadApplyLink]);

  // Schools with entrance exams switched off always stay in follow-up mode.
  useEffect(() => {
    if (examEnabled) return;
    if (mode !== "followup") {
      setMode("followup");
      setFilters((prev) => ({ ...prev, status: "", page: 1 }));
      if (typeof window !== "undefined") {
        window.localStorage.setItem("eduaitor_registration_mode", "followup");
      }
    }
    if (subTab === "exams") setSubTab("all");
  }, [examEnabled, mode, subTab]);

  useEffect(() => {
    if (examEnabled && (subTab === "exams" || mode === "exam")) loadExams();
  }, [subTab, mode, examEnabled, loadExams]);

  useEffect(() => {
    if (!registrations.length) return;
    setSelectedId((prev) => {
      if (prev && registrations.some((row) => row._id === prev)) return prev;
      return registrations[0]._id;
    });
  }, [registrations]);

  useEffect(() => {
    let cancelled = false;
    let loadGen = 0;
    (async () => {
      const gen = ++loadGen;
      try {
        const { data } = await axios.get(`${API}/registration-form`, {
          withCredentials: true,
        });
        if (cancelled || gen !== loadGen) return;
        const steps = mergeRegistrationSteps(data?.data?.steps);
        setFormSteps(steps);
      } catch {
        if (!cancelled && gen === loadGen) {
          const steps = mergeRegistrationSteps(null);
          setFormSteps(steps);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ------------------------- lead / registration prefill ------------------------- */
  const applyRegistration = useCallback(
    (registration) => {
      setRegForm({
        studentName: registration.studentName || "",
        dob: dateInput(registration.dob),
        gender: registration.gender || "",
        bloodGroup: registration.bloodGroup || "",
        classId: registration.classId || "",
        sectionId: registration.sectionId || "",
        streamId: registration.streamId ? String(registration.streamId) : "",
        parentName: registration.parentName || "",
        parentMobile: registration.parentMobile || "",
        parentEmail: registration.parentEmail || "",
        address: registration.address || "",
        city: registration.city || "",
        state: registration.state || "",
        district: registration.district || "",
        pincode: registration.pincode || "",
        previousSchoolName: registration.previousSchoolName || "",
        notes: registration.notes || "",
        nextFollowUpDate: dateInput(registration.nextFollowUpDate),
      });
      setCustomValues(
        hydrateCustomValues(formSteps, registration.customFields || []),
      );
    },
    [formSteps],
  );

  const openEditById = useCallback(
    async (id) => {
      try {
        const { data } = await axios.get(`${API}/registrations/${id}`, {
          withCredentials: true,
        });
        const registration = data?.data;
        if (!registration) throw new Error("Registration not found");
        applyRegistration(registration);
        setLeadInfo(null);
        setSourceLead(null);
        setModalSteps(null);
        setRegModal({ open: true, mode: "edit", id: registration._id });
      } catch (error) {
        toast.error(
          error.response?.data?.message || "Could not open the registration.",
        );
      }
    },
    [applyRegistration],
  );

  const openFromLead = useCallback(
    async (leadId) => {
      try {
        const { data } = await axios.get(`${API}/leads/${leadId}`, {
          withCredentials: true,
        });
        const lead = data?.data;
        if (!lead) throw new Error("Lead not found");
        if (lead.registrationId) {
          await openEditById(lead.registrationId);
          return;
        }
        setLeadInfo({ _id: lead._id, name: lead.studentName });
        setSourceLead(lead);
        setRegModal({ open: true, mode: "create", id: "", leadId: lead._id });
      } catch (error) {
        toast.error(error.response?.data?.message || "Could not open the lead.");
      }
    },
    [openEditById],
  );

  useEffect(() => {
    const leadId = searchParams.get("leadId");
    const registrationId = searchParams.get("registrationId");
    if (
      (!leadId && !registrationId) ||
      handledQuery.current === searchParams.toString()
    ) {
      return;
    }
    handledQuery.current = searchParams.toString();
    if (registrationId) openEditById(registrationId);
    else openFromLead(leadId);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams, openEditById, openFromLead]);

  useEffect(() => {
    if (!sourceLead) return;
    const latestRemark =
      [...(sourceLead.followUps || [])]
        .reverse()
        .find((entry) => String(entry?.comment || "").trim())?.comment || "";
    const mapped = mapLeadOntoRegistration(sourceLead, formSteps);
    setRegForm({ ...mapped.form, notes: latestRemark });
    setCustomValues(mapped.customValues);
    setModalSteps(mapped.steps);
  }, [sourceLead, formSteps]);

  const activeFormSteps = modalSteps || formSteps;

  /* ------------------------------- helpers ------------------------------- */
  const classSections = useMemo(() => {
    const map = new Map();
    classes.forEach((cls) => {
      const sections = [];
      (cls.details || []).forEach((detail) => {
        if (detail.sectionId && detail.sectionId._id) {
          if (String(detail.sectionId.status || "Active") !== "Active") return;
          sections.push({
            _id: detail.sectionId._id,
            name: detail.sectionId.name || "Section",
          });
        }
      });
      map.set(cls._id, sections);
    });
    return map;
  }, [classes]);

  const sectionOptions = (classId) => classSections.get(classId) || [];

  const streamsForClass = (classId) => {
    const selected = String(classId || "");
    return (streams || []).filter((item) => {
      const linked = (item.classIds || []).map(String);
      if (!linked.length) return true;
      if (!selected) return true;
      return linked.includes(selected);
    });
  };

  const setFilter = (patch) =>
    setFilters((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));

  const switchMode = (nextMode) => {
    if (!examEnabled && nextMode === "exam") return;
    setMode(nextMode);
    setSubTab("all");
    setFilters((prev) => ({ ...prev, status: "", page: 1 }));
    setRowMenuId("");
    if (typeof window !== "undefined") {
      window.localStorage.setItem("eduaitor_registration_mode", nextMode);
    }
  };

  const sourceText = (registration) =>
    registration?.sourceLabel ||
    (registration?.source === "public"
      ? "Website"
      : registration?.source === "lead"
        ? "Lead"
        : registration?.createdByName || "Office");

  const publicUrl = linkModal.data?.token
    ? `${window.location.origin}${import.meta.env.BASE_URL}register/${linkModal.data.token}`
    : "";

  const applyLinkUrl = applyLink?.token
    ? `${window.location.origin}${import.meta.env.BASE_URL}register/${applyLink.token}`
    : "";

  const copyText = async (text, message) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(message || "Copied.");
    } catch {
      window.prompt("Copy this link", text);
    }
  };

  /* --------------------------- registration CRUD --------------------------- */
  const openCreate = () => {
    setLeadInfo(null);
    setSourceLead(null);
    setModalSteps(null);
    setRegForm({
      ...emptyRegistration(),
      nextFollowUpDate: todayISO(),
    });
    setCustomValues(emptyCustomValues(formSteps));
    setRegModal({ open: true, mode: "create", id: "", leadId: "" });
  };

  const submitRegistration = async () => {
    const configError = validateConfigurableFields(
      activeFormSteps,
      regForm,
      customValues,
    );
    if (configError) return toast.error(configError);
    if (String(regForm.parentMobile || "").replace(/\D/g, "").length !== 10)
      return toast.error("Parent mobile must be 10 digits.");

    setRegSaving(true);
    try {
      const payload = {
        ...regForm,
        sectionId: regForm.sectionId || null,
        dob: regForm.dob || null,
        nextFollowUpDate: regForm.nextFollowUpDate || null,
        leadId: regModal.leadId || undefined,
        customFields: buildCustomFieldsPayload(activeFormSteps, customValues),
      };
      if (regModal.mode === "edit") {
        await axios.put(`${API}/registrations/${regModal.id}`, payload, {
          withCredentials: true,
        });
        toast.success("Registration updated.");
      } else {
        const { data } = await axios.post(`${API}/registrations`, payload, {
          withCredentials: true,
        });
        toast.success(data?.message || "Registration saved.");
      }
      setRegModal({ open: false, mode: "create", id: "", leadId: "" });
      setLeadInfo(null);
      setSourceLead(null);
      setModalSteps(null);
      await loadRegistrations();
      if (subTab === "exams") await loadExams();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not save the registration.",
      );
    } finally {
      setRegSaving(false);
    }
  };

  const changeStatus = async (registration, status) => {
    try {
      await axios.patch(
        `${API}/registrations/${registration._id}/status`,
        { status },
        { withCredentials: true },
      );
      toast.success(
        status === "cancelled"
          ? "Registration cancelled."
          : "Registration restored.",
      );
      setRowMenuId("");
      await loadRegistrations();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not update the registration.",
      );
    }
  };

  const deleteRegistration = async (registration) => {
    try {
      await axios.delete(`${API}/registrations/${registration._id}`, {
        withCredentials: true,
      });
      toast.success("Registration deleted.");
      setRowMenuId("");
      await loadRegistrations();
      if (subTab === "exams") await loadExams();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not delete the registration.",
      );
    }
  };

  const admit = (registration) => {
    if (registration.status === "admitted") {
      if (registration.studentId) {
        navigate(`${basePath}/student-view/${registration.studentId}`);
      } else {
        toast.info("This registration is already admitted.");
      }
      return;
    }
    if (!registration.canAdmit) {
      toast.error(
        registration.entrance?.result === "fail"
          ? "This candidate did not pass the entrance exam."
          : "Entrance exam result is pending. Enter marks first.",
      );
      return;
    }
    navigate(`${basePath}/student-manage?registrationId=${registration._id}`);
  };

  const restoreRegistration = (registration) =>
    changeStatus(registration, "registered");

  const openConfirm = (type, registration) => {
    setRowMenuId("");
    setConfirmAction({ open: true, type, registration });
  };

  const runConfirmAction = async () => {
    const { type, registration } = confirmAction;
    setConfirmAction({ open: false, type: "admit", registration: null });
    if (!registration) return;
    if (type === "admit") admit(registration);
    else if (type === "cancel") await changeStatus(registration, "cancelled");
    else if (type === "delete") await deleteRegistration(registration);
  };

  const openViewRegistration = async (registration) => {
    setViewModal({ open: true, loading: true, data: null });
    try {
      const { data } = await axios.get(
        `${API}/registrations/${registration._id}`,
        { withCredentials: true },
      );
      setViewModal({
        open: true,
        loading: false,
        data: data?.data || registration,
      });
    } catch (error) {
      setViewModal({ open: false, loading: false, data: null });
      toast.error(
        error.response?.data?.message || "Could not open registration.",
      );
    }
  };

  const handleAddFollowUp = async (registrationId) => {
    const comment = String(followUpDrafts[registrationId] || "").trim();
    if (!comment) {
      toast.error("Enter a follow-up comment first.");
      return;
    }
    setFollowUpSavingId(registrationId);
    try {
      const { data } = await axios.post(
        `${API}/registrations/${registrationId}/followups`,
        {
          comment,
          nextFollowUpDate: followUpDates[registrationId] || null,
          assignedTo: followUpAssignees[registrationId] || "",
        },
        { withCredentials: true },
      );
      const updated = data?.data;
      if (updated?._id) {
        setRegistrations((prev) =>
          prev.map((row) =>
            String(row._id) === String(registrationId)
              ? { ...row, ...updated }
              : row,
          ),
        );
      }
      toast.success("Follow-up added.");
      setFollowUpDrafts((prev) => ({ ...prev, [registrationId]: "" }));
      await loadRegistrations();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not add follow-up.",
      );
    } finally {
      setFollowUpSavingId("");
    }
  };

  const openFollowUpHistory = async (registration) => {
    setFollowUpHistory({
      open: true,
      loading: true,
      registrationId: registration._id,
      studentName: registration.studentName,
      followUps: [],
    });
    try {
      const { data } = await axios.get(
        `${API}/registrations/${registration._id}/followups`,
        { withCredentials: true },
      );
      setFollowUpHistory((prev) => ({
        ...prev,
        loading: false,
        followUps: data?.data?.followUps || [],
      }));
    } catch {
      setFollowUpHistory((prev) => ({
        ...prev,
        loading: false,
        followUps: [],
      }));
      toast.error("Could not load follow-ups.");
    }
  };

  const focusFollowUpBox = (registrationId) => {
    setSelectedId(registrationId);
    setRowMenuId("");
    setTimeout(() => {
      const node = followUpBoxRef.current;
      if (node?.focus) {
        node.focus();
        node.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 60);
  };

  /* ------------------------------ exam CRUD ------------------------------ */
  const openExamCreate = (classId = "") => {
    setExamForm({ ...emptyExam(), classId: classId || filters.classId || "" });
    setExamModal({ open: true, mode: "create", id: "" });
  };

  const openExamForRegistration = (registration) => {
    if (!registration) return;
    const linked = registration.entranceExamId
      ? (exams || []).find(
          (exam) => String(exam._id) === String(registration.entranceExamId),
        )
      : null;
    if (linked) {
      openMarks(linked);
      return;
    }
    openExamCreate(registration.classId);
  };

  const openExamEdit = (exam) => {
    setExamForm({
      name: exam.name || "",
      classId: exam.classId || "",
      examDate: dateInput(exam.examDate),
      startTime: exam.startTime || "09:00",
      endTime: exam.endTime || "11:00",
      venue: exam.venue || "",
      totalMarks: exam.totalMarks || 100,
      passingMarks: exam.passingMarks ?? 33,
      instructions: exam.instructions || "",
    });
    setExamModal({ open: true, mode: "edit", id: exam._id });
    setManageExamsOpen(false);
  };

  const submitExam = async () => {
    if (!examForm.name.trim()) return toast.error("Exam name is required.");
    if (!examForm.classId) return toast.error("Select the class.");
    if (!examForm.examDate) return toast.error("Exam date is required.");

    setExamSaving(true);
    try {
      if (examModal.mode === "edit") {
        await axios.put(
          `${API}/entrance-exams/${examModal.id}`,
          examForm,
          { withCredentials: true },
        );
        toast.success("Entrance exam updated.");
      } else {
        const { data } = await axios.post(
          `${API}/entrance-exams`,
          examForm,
          { withCredentials: true },
        );
        toast.success(data?.message || "Entrance exam scheduled.");
      }
      setExamModal({ open: false, mode: "create", id: "" });
      await Promise.all([loadExams(), loadRegistrations()]);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not save the entrance exam.",
      );
    } finally {
      setExamSaving(false);
    }
  };

  const deleteExam = async (exam) => {
    if (
      !window.confirm(
        `Delete "${exam.name}"? Linked candidates will go back to Registered.`,
      )
    )
      return;
    try {
      await axios.delete(`${API}/entrance-exams/${exam._id}`, {
        withCredentials: true,
      });
      toast.success("Entrance exam deleted.");
      await Promise.all([loadExams(), loadRegistrations()]);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not delete the entrance exam.",
      );
    }
  };

  const completeExam = async (exam) => {
    if (!window.confirm(`Mark "${exam.name}" as completed?`)) return;
    try {
      await axios.patch(
        `${API}/entrance-exams/${exam._id}/status`,
        { status: "completed" },
        { withCredentials: true },
      );
      toast.success("Exam marked completed.");
      await loadExams();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not complete the exam.",
      );
    }
  };

  const openMarks = async (exam) => {
    setManageExamsOpen(false);
    setMarksModal({
      open: true,
      loading: true,
      saving: false,
      exam,
      candidates: [],
    });
    setMarksRows({});
    try {
      const { data } = await axios.get(`${API}/entrance-exams/${exam._id}`, {
        withCredentials: true,
      });
      const candidates = data?.data?.candidates || [];
      const rows = {};
      candidates.forEach((candidate) => {
        rows[candidate._id] = {
          obtainedMarks:
            candidate.entrance?.obtainedMarks === null ||
            candidate.entrance?.obtainedMarks === undefined
              ? ""
              : String(candidate.entrance.obtainedMarks),
          absent: candidate.entrance?.result === "absent",
          remarks: candidate.entrance?.remarks || "",
        };
      });
      setMarksRows(rows);
      setMarksModal((prev) => ({
        ...prev,
        loading: false,
        exam: data?.data?.exam || exam,
        candidates,
      }));
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not load the candidates.",
      );
      setMarksModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const saveMarks = async (complete = false) => {
    const exam = marksModal.exam;
    if (!exam) return;
    const results = marksModal.candidates.map((candidate) => {
      const row = marksRows[candidate._id] || {};
      return {
        registrationId: candidate._id,
        obtainedMarks: row.absent ? null : row.obtainedMarks,
        absent: Boolean(row.absent),
        remarks: row.remarks || "",
      };
    });
    setMarksModal((prev) => ({ ...prev, saving: true }));
    try {
      const { data } = await axios.post(
        `${API}/entrance-exams/${exam._id}/marks`,
        { results, complete },
        { withCredentials: true },
      );
      toast.success(data?.message || "Marks saved.");
      const refreshed = await axios.get(
        `${API}/entrance-exams/${exam._id}`,
        { withCredentials: true },
      );
      const candidates = refreshed?.data?.data?.candidates || [];
      const rows = {};
      candidates.forEach((candidate) => {
        rows[candidate._id] = {
          obtainedMarks:
            candidate.entrance?.obtainedMarks === null ||
            candidate.entrance?.obtainedMarks === undefined
              ? ""
              : String(candidate.entrance.obtainedMarks),
          absent: candidate.entrance?.result === "absent",
          remarks: candidate.entrance?.remarks || "",
        };
      });
      setMarksRows(rows);
      setMarksModal((prev) => ({
        ...prev,
        saving: false,
        exam: refreshed?.data?.data?.exam || prev.exam,
        candidates,
      }));
      await Promise.all([loadRegistrations(), loadExams()]);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not save the marks.",
      );
      setMarksModal((prev) => ({ ...prev, saving: false }));
    }
  };

  /* ------------------------------ public link ------------------------------ */
  const openLinkModal = async () => {
    setLinkModal({ open: true, loading: true, saving: false, data: null });
    try {
      const { data } = await axios.get(`${API}/registrations/link`, {
        withCredentials: true,
      });
      setLinkModal({ open: true, loading: false, saving: false, data: data.data });
      setApplyLink(data.data || null);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not load the public link.",
      );
      setLinkModal({ open: false, loading: false, saving: false, data: null });
    }
  };

  const saveLink = async (patch) => {
    if (!linkModal.data) return;
    setLinkModal((prev) => ({ ...prev, saving: true }));
    try {
      const { data } = await axios.put(
        `${API}/registrations/link`,
        { ...linkModal.data, ...patch },
        { withCredentials: true },
      );
      setLinkModal((prev) => ({ ...prev, saving: false, data: data.data }));
      setApplyLink(data.data || null);
      toast.success(data?.message || "Public form updated.");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not update the public form.",
      );
      setLinkModal((prev) => ({ ...prev, saving: false }));
    }
  };

  const copyLink = () => copyText(publicUrl, "Link copied.");

  const copyApplyLink = () => {
    if (!applyLinkUrl) {
      openLinkModal();
      return;
    }
    copyText(applyLinkUrl, "Application link copied.");
  };

  /* ------------------------------- data views ------------------------------- */
  const visibleRegistrations = useMemo(() => {
    let list = [...registrations];

    if (subTab === "followups_due") {
      list = list.filter(isDueToday);
    } else if (subTab === "exams") {
      list = list.filter(
        (row) =>
          row.entranceExamId ||
          ["exam_scheduled", "passed", "failed"].includes(row.status),
      );
    }

    if (sourceFilter) {
      list = list.filter((row) => sourceText(row) === sourceFilter);
    }

    if (mode === "followup" && filters.status) {
      list = list.filter(
        (row) => followupStatusOf(row) === filters.status,
      );
    }

    list.sort((a, b) => {
      if (sortOrder === "name")
        return String(a.studentName || "").localeCompare(
          String(b.studentName || ""),
        );
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return sortOrder === "oldest" ? aTime - bTime : bTime - aTime;
    });

    return list;
  }, [registrations, subTab, sourceFilter, mode, filters.status, sortOrder]);

  const selectedRegistration = useMemo(() => {
    if (!registrations.length) return null;
    return (
      visibleRegistrations.find((row) => row._id === selectedId) ||
      registrations.find((row) => row._id === selectedId) ||
      visibleRegistrations[0] ||
      registrations[0]
    );
  }, [registrations, visibleRegistrations, selectedId]);

  const dueTodayCount = useMemo(
    () => registrations.filter(isDueToday).length,
    [registrations],
  );

  const examLinkedCount = useMemo(
    () =>
      registrations.filter(
        (row) =>
          row.entranceExamId ||
          ["exam_scheduled", "passed", "failed"].includes(row.status),
      ).length,
    [registrations],
  );

  const followupCounts = useMemo(() => {
    let next = 0;
    let inFollowup = 0;
    registrations.forEach((row) => {
      const status = followupStatusOf(row);
      if (status === "new") next += 1;
      if (status === "in_followup") inFollowup += 1;
    });
    return { next, inFollowup };
  }, [registrations]);

  const totalCount = stats.total ?? registrations.length;
  const admittedCount =
    stats.admitted ??
    registrations.filter((row) => row.status === "admitted").length;
  const cancelledCount =
    stats.cancelled ??
    registrations.filter((row) => row.status === "cancelled").length;
  const conversionRate = totalCount
    ? Math.round((admittedCount / totalCount) * 100)
    : 0;

  const kpiCards =
    mode === "exam"
      ? [
          {
            key: "total",
            label: "TOTAL",
            value: totalCount,
            sub: `All leads · ${selectedName || "Session"}`,
            onClick: () => setSubTab("all"),
          },
          {
            key: "registered",
            label: "REGISTERED",
            value: stats.registered || 0,
            sub: "Awaiting exam",
            tone: "text-slate-700",
          },
          {
            key: "exam_scheduled",
            label: "EXAM SCHEDULED",
            value: stats.exam_scheduled || 0,
            sub: `${exams.length} exam${exams.length === 1 ? "" : "s"} set up`,
            tone: "text-indigo-600",
            onClick: () => setSubTab("exams"),
          },
          {
            key: "passed",
            label: "PASSED",
            value: stats.passed || 0,
            sub: `${
              (stats.passed || 0) + (stats.failed || 0)
                ? Math.round(
                    ((stats.passed || 0) /
                      ((stats.passed || 0) + (stats.failed || 0))) *
                      100,
                  )
                : 0
            }% pass rate`,
            tone: "text-emerald-600",
            subTone: "text-emerald-600",
          },
          {
            key: "failed",
            label: "FAILED",
            value: stats.failed || 0,
            sub: `${stats.failed || 0} re-test pending`,
            tone: "text-rose-600",
          },
          {
            key: "admitted",
            label: "ADMITTED",
            value: admittedCount,
            sub: `${conversionRate}% conversion · ${cancelledCount} cancelled`,
            tone: "text-blue-600",
          },
        ]
      : [
          {
            key: "total",
            label: "TOTAL",
            value: totalCount,
            sub: `All leads · ${selectedName || "Session"}`,
            onClick: () => setSubTab("all"),
          },
          {
            key: "new",
            label: "NEW",
            value: followupCounts.next,
            sub: "Not contacted yet",
            tone: "text-blue-600",
          },
          {
            key: "in_followup",
            label: "IN FOLLOW-UP",
            value: followupCounts.inFollowup,
            sub: "Being contacted",
            tone: "text-amber-600",
          },
          {
            key: "due",
            label: "DUE TODAY",
            value: dueTodayCount,
            sub: "Follow-ups pending →",
            tone: "text-amber-700",
            subTone: "text-amber-700",
            onClick: () => setSubTab("followups_due"),
            active: subTab === "followups_due",
          },
          {
            key: "admitted",
            label: "ADMITTED",
            value: admittedCount,
            sub: `${conversionRate}% conversion`,
            tone: "text-emerald-600",
            subTone: "text-emerald-600",
          },
          {
            key: "cancelled",
            label: "CANCELLED",
            value: cancelledCount,
            sub: "Dropped leads",
          },
        ];

  const selectedSections = sectionOptions(regForm.classId);

  const closeRegModal = () => {
    setRegModal({ open: false, mode: "create", id: "", leadId: "" });
    setLeadInfo(null);
    setSourceLead(null);
    setModalSteps(null);
    setCustomValues(emptyCustomValues(formSteps));
  };

  const exportCSV = () => {
    const rows = visibleRegistrations;
    const headers = [
      "Reg ID",
      "Student Name",
      "Parent Name",
      "Mobile",
      "Class",
      "Section",
      "Status",
      "Next Follow-up",
    ];
    const escapeCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csvLines = [headers.join(",")];
    rows.forEach((row) => {
      csvLines.push(
        [
          row.registrationNumber || "",
          escapeCell(row.studentName),
          escapeCell(row.parentName),
          escapeCell(row.parentMobile),
          row.className || "",
          row.sectionName || "",
          escapeCell(
            STATUS_META[displayStatusOf(row, mode)]?.label ||
              displayStatusOf(row, mode),
          ),
          row.nextFollowUpDate ? formatDate(row.nextFollowUpDate) : "Not set",
        ].join(","),
      );
    });
    const blob = new Blob([csvLines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `eduaitor_${subTab}_${todayISO()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} records to CSV`);
  };

  const resetFilters = () => {
    setSearchDraft("");
    setSourceFilter("");
    setSortOrder("newest");
    setFilters({ search: "", classId: "", status: "", page: 1 });
  };

  const nextFollowUpInput = selectedRegistration
    ? followUpDates[selectedRegistration._id] ??
      dateInput(nextFollowUpOf(selectedRegistration))
    : "";

  const openNextFollowUp = (registration) => {
    setFollowUpDates((prev) => ({
      ...prev,
      [registration._id]: todayISO(),
    }));
    toast.success("Next follow-up date set to today.");
  };

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 text-slate-800 md:p-6">
      {isMobile && (
        <button
          type="button"
          onClick={() => window.history.back()}
          className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-700 transition-transform active:scale-95"
        >
          <FiChevronLeft size={13} /> Back
        </button>
      )}

      <div className="mx-auto w-full max-w-[1600px]">
        {/* Page title + actions */}
        <div className="mb-5 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[20px] font-bold tracking-tight text-slate-900">
                Registrations
              </h1>
              <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                Session {selectedName || "—"}
              </span>
            </div>
            <p className="mt-0.5 text-[13px] text-slate-500">
              {mode === "exam"
                ? "Track every lead from registration to admission. Schedule and score entrance exams in one place."
                : "Track every lead from registration to admission, with follow-ups in one place."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Application link copy pill */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-white py-1 pl-3 pr-1.5 shadow-sm">
              <FiLink className="mr-1.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="mr-2 max-w-[170px] truncate text-xs font-medium text-slate-600">
                {applyLinkUrl
                  ? applyLinkUrl.replace(/^https?:\/\//, "")
                  : "Public apply link"}
              </span>
              <button
                type="button"
                onClick={copyApplyLink}
                className="rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Copy
              </button>
            </div>

            <button
              type="button"
              onClick={openLinkModal}
              className={btnSecondary}
              title="Public registration form settings"
            >
              <FiExternalLink size={13} /> Public form
            </button>

            <button
              type="button"
              onClick={() => setBuilderOpen(true)}
              className={btnSecondary}
              title="Add, hide or reorder registration form fields"
            >
              <FiSettings size={13} /> Customize form
            </button>

            <button type="button" onClick={openCreate} className={btnPrimary}>
              <FiPlus size={14} /> New registration
            </button>
          </div>
        </div>

        {/* Mode switcher + tools */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          {examEnabled ? (
            <div
              className="flex items-center rounded-lg border border-slate-200/80 bg-slate-100 p-1 text-xs font-medium"
              role="group"
              aria-label="Portal Workflow Mode"
            >
              <button
                type="button"
                onClick={() => switchMode("exam")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition ${
                  mode === "exam"
                    ? "bg-white font-semibold text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                <span>With Entrance Exam</span>
              </button>
              <button
                type="button"
                onClick={() => switchMode("followup")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition ${
                  mode === "followup"
                    ? "bg-white font-semibold text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span>Without Entrance Exam</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              <FiAlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span>
                Entrance exams are turned off for this school, so registrations
                follow the follow-up workflow.
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span>
              Today: <strong className="font-semibold text-slate-700">{formatDate(new Date())}</strong>
            </span>
          </div>
        </div>

        {/* KPI strip */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {kpiCards.map((card) => (
            <button
              key={card.key}
              type="button"
              onClick={card.onClick}
              className={`rounded-xl border bg-white p-3.5 text-left shadow-sm transition ${
                card.onClick ? "cursor-pointer hover:border-slate-300" : "cursor-default"
              } ${
                card.active
                  ? "border-amber-500 bg-amber-50/30 ring-2 ring-amber-500/15"
                  : "border-slate-200"
              }`}
            >
              <div
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  card.tone || "text-slate-400"
                }`}
              >
                {card.label}
              </div>
              <div className="mt-1 text-2xl font-bold text-slate-900">
                {card.value}
              </div>
              <div
                className={`mt-1 text-[11px] ${
                  card.subTone || "text-slate-500"
                } ${card.subTone ? "font-medium" : ""}`}
              >
                {card.sub}
              </div>
            </button>
          ))}
        </div>

        {/* Split workspace */}
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
          {/* LEFT: table card */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-8">
            {/* Sub tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/50 px-4 pt-2.5">
              <div className="flex items-center gap-1 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setSubTab("all")}
                  className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-xs transition ${
                    subTab === "all"
                      ? "border-blue-600 font-semibold text-blue-600"
                      : "border-transparent font-medium text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span>{mode === "exam" ? "Registrations" : "All registrations"}</span>
                  <span className="rounded-full bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                    {totalCount}
                  </span>
                </button>

                {examEnabled && mode === "exam" ? (
                  <button
                    type="button"
                    onClick={() => setSubTab("exams")}
                    className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-xs transition ${
                      subTab === "exams"
                        ? "border-blue-600 font-semibold text-blue-600"
                        : "border-transparent font-medium text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <span>Entrance exams</span>
                    <span className="rounded-full bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                      {examLinkedCount}
                    </span>
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => setSubTab("followups_due")}
                  className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-xs transition ${
                    subTab === "followups_due"
                      ? "border-blue-600 font-semibold text-blue-600"
                      : "border-transparent font-medium text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span>Follow-ups due</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      subTab === "followups_due"
                        ? "bg-amber-500 text-white"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {dueTodayCount}
                  </span>
                </button>
              </div>

              {subTab === "exams" ? (
                <div className="flex items-center gap-1.5 pb-2">
                  <button
                    type="button"
                    onClick={() => openExamCreate()}
                    className={btnGhost}
                  >
                    <FiPlus size={12} /> Schedule
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setManageExamsOpen(true);
                      loadExams();
                    }}
                    className={btnGhost}
                  >
                    <FiSettings size={12} /> Manage exams
                  </button>
                </div>
              ) : null}
            </div>

            {/* Today banner */}
            {subTab === "followups_due" ? (
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 bg-amber-50/80 px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <FiCalendar size={14} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-amber-950">
                      <span>Today&apos;s Follow-ups Queue — {formatDate(new Date())}</span>
                      <span className="rounded bg-amber-200/80 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                        {dueTodayCount} due
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800/90">
                      Showing active leads whose next follow-up date is scheduled for today.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSubTab("all")}
                  className="rounded-md border border-amber-200 bg-white px-2.5 py-1 text-xs font-semibold text-amber-900 shadow-sm transition hover:text-amber-950"
                >
                  Back to all leads
                </button>
              </div>
            ) : null}

            {/* Filters */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-3">
              <div className="flex min-w-[240px] flex-1 flex-wrap items-center gap-2">
                <div className="relative min-w-[190px] max-w-xs flex-1">
                  <FiSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        setFilter({ search: searchDraft.trim() });
                      }
                    }}
                    placeholder="Name, mobile or registration no."
                    className={`${inputClass} pl-8`}
                  />
                </div>

                <select
                  value={filters.classId}
                  onChange={(event) => setFilter({ classId: event.target.value })}
                  className={`${inputClass} w-auto`}
                >
                  <option value="">Class: All</option>
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls._id}>
                      {cls.name}
                    </option>
                  ))}
                </select>

                <select
                  value={filters.status}
                  onChange={(event) => setFilter({ status: event.target.value })}
                  className={`${inputClass} w-auto`}
                >
                  {(mode === "exam" ? STATUS_FILTERS : FOLLOWUP_FILTERS).map(
                    (item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ),
                  )}
                </select>

                <select
                  value={sourceFilter}
                  onChange={(event) => setSourceFilter(event.target.value)}
                  className={`${inputClass} w-auto`}
                >
                  <option value="">Source: All</option>
                  {SOURCE_OPTIONS.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                >
                  Clear
                </button>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <select
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                  className={`${inputClass} w-auto`}
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="name">Name A–Z</option>
                </select>
                <button type="button" onClick={exportCSV} className={btnSecondary}>
                  <FiDownload size={13} /> Export
                </button>
              </div>
            </div>

            {/* Selection strip */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-700">
                  {visibleRegistrations.length}{" "}
                  {subTab === "followups_due"
                    ? "follow-ups due today"
                    : "registrations"}
                </span>
                <span className="text-slate-300">·</span>
                <span className="font-medium text-blue-600">
                  {selectedRegistration
                    ? `1 selected (${selectedRegistration.registrationNumber || "—"})`
                    : "0 selected"}
                </span>
              </div>
              <span className="hidden text-[11px] text-slate-400 sm:block">
                Select a lead row to inspect details or log follow-ups
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {subTab === "followups_due" ? (
                    <tr>
                      <th className="w-9 py-2.5 pl-4 pr-2" />
                      <th className="px-3 py-2.5">Student</th>
                      <th className="px-3 py-2.5">Parent / Contact</th>
                      <th className="px-3 py-2.5">Class</th>
                      <th className="px-3 py-2.5">Latest Discussion / Note</th>
                      <th className="px-3 py-2.5">Due Date</th>
                      <th className="py-2.5 pl-3 pr-4 text-right">Quick Action</th>
                    </tr>
                  ) : mode === "exam" ? (
                    <tr>
                      <th className="w-9 py-2.5 pl-4 pr-2" />
                      <th className="px-3 py-2.5">Student</th>
                      <th className="px-3 py-2.5">Parent / Contact</th>
                      <th className="px-3 py-2.5">Class</th>
                      <th className="px-3 py-2.5">Entrance exam</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">Last follow-up</th>
                      <th className="py-2.5 pl-3 pr-4 text-right">Action</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="w-9 py-2.5 pl-4 pr-2" />
                      <th className="px-3 py-2.5">Student</th>
                      <th className="px-3 py-2.5">Parent / Contact</th>
                      <th className="px-3 py-2.5">Class</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">Last follow-up</th>
                      <th className="px-3 py-2.5">Next follow-up</th>
                      <th className="py-2.5 pl-3 pr-4 text-right">Action</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-100 text-[13px]">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">
                        Loading registrations…
                      </td>
                    </tr>
                  ) : visibleRegistrations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
                        <div className="mx-auto max-w-xs">
                          <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                            <FiClipboard size={18} />
                          </div>
                          <p className="text-sm font-semibold text-slate-800">
                            {subTab === "followups_due"
                              ? "No follow-ups due today"
                              : "No matching registrations"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {subTab === "followups_due"
                              ? "All follow-ups scheduled for today are cleared!"
                              : "Try adjusting your search or filter criteria."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    visibleRegistrations.map((registration) => {
                      const statusKey = displayStatusOf(registration, mode);
                      const selected = registration._id === selectedId;
                      const latest = latestFollowUpOf(registration);
                      const classLabel = `${registration.className || "—"}${
                        registration.sectionName
                          ? ` · ${registration.sectionName}`
                          : ""
                      }`;

                      let examCell;
                      if (registration.entrance?.result === "pass" ||
                          registration.entrance?.result === "fail") {
                        const passed = registration.entrance.result === "pass";
                        examCell = (
                          <>
                            <div
                              className={`font-semibold ${
                                passed ? "text-emerald-700" : "text-rose-700"
                              }`}
                            >
                              {registration.entrance.obtainedMarks ?? "—"}/
                              {registration.entrance.totalMarks || 100}
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-400">
                              {formatDate(registration.entrance.examDate)}
                            </div>
                          </>
                        );
                      } else if (registration.entranceExamId) {
                        examCell = (
                          <>
                            <div className="font-medium text-slate-800">
                              {shortDate(registration.entrance?.examDate)}
                              {registration.entrance?.startTime
                                ? `, ${registration.entrance.startTime}`
                                : ""}
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-400">
                              {registration.entrance?.venue ||
                                registration.entrance?.examName ||
                                "Scheduled"}
                            </div>
                          </>
                        );
                      } else if (registration.status === "admitted") {
                        examCell = (
                          <span className="text-xs text-slate-400">Not required</span>
                        );
                      } else {
                        examCell = (
                          <span className="text-xs text-slate-400">Not linked</span>
                        );
                      }

                      let primaryAction;
                      if (registration.status === "admitted") {
                        primaryAction = (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openViewRegistration(registration);
                            }}
                            className={btnGhost}
                          >
                            View
                          </button>
                        );
                      } else if (registration.status === "cancelled") {
                        primaryAction = (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              restoreRegistration(registration);
                            }}
                            className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-100"
                          >
                            Restore
                          </button>
                        );
                      } else if (subTab === "followups_due") {
                        primaryAction = (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                focusFollowUpBox(registration._id);
                              }}
                              className="rounded-md bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 transition hover:bg-amber-200/80"
                            >
                              Log
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openConfirm("admit", registration);
                              }}
                              className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-100"
                            >
                              Admit
                            </button>
                          </div>
                        );
                      } else if (
                        mode === "exam" &&
                        registration.status === "exam_scheduled"
                      ) {
                        primaryAction = (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openExamForRegistration(registration);
                            }}
                            className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                          >
                            Score
                          </button>
                        );
                      } else if (
                        mode === "exam" &&
                        registration.status === "registered"
                      ) {
                        primaryAction = (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openExamForRegistration(registration);
                            }}
                            className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                          >
                            Exam
                          </button>
                        );
                      } else if (
                        mode === "exam" &&
                        registration.status === "failed"
                      ) {
                        primaryAction = (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openExamForRegistration(registration);
                            }}
                            className="rounded-md bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                          >
                            Re-test
                          </button>
                        );
                      } else {
                        primaryAction = (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openConfirm("admit", registration);
                            }}
                            className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-100"
                          >
                            Admit
                          </button>
                        );
                      }

                      return (
                        <tr
                          key={registration._id}
                          onClick={() => setSelectedId(registration._id)}
                          className={`cursor-pointer transition ${
                            selected ? "bg-blue-50/55" : "hover:bg-slate-50/90"
                          }`}
                        >
                          <td
                            className="py-3 pl-4 pr-2 align-middle"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <input
                              type="radio"
                              name="selectedRegistrationRadio"
                              checked={selected}
                              onChange={() => setSelectedId(registration._id)}
                              className="h-3.5 w-3.5 accent-blue-600"
                              aria-label={`Select ${registration.studentName}`}
                            />
                          </td>
                          <td className="px-3 py-3 align-middle">
                            <div className="font-semibold leading-snug text-slate-900">
                              {registration.studentName}
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-500">
                              {registration.registrationNumber || "—"} ·{" "}
                              {formatDate(registration.createdAt)}
                            </div>
                          </td>
                          <td className="px-3 py-3 align-middle">
                            <div className="font-medium text-slate-800">
                              {registration.parentName || "—"}
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-500">
                              {registration.parentMobile || "—"}
                            </div>
                          </td>
                          <td className="px-3 py-3 align-middle">
                            <div className="font-medium text-slate-800">
                              {classLabel}
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-400">
                              {registration.academicYear || selectedName || "—"}
                            </div>
                          </td>

                          {mode === "exam" && subTab !== "followups_due" ? (
                            <td className="px-3 py-3 align-middle">{examCell}</td>
                          ) : null}

                          {subTab !== "followups_due" ? (
                            <td className="px-3 py-3 align-middle">
                              <StatusBadge status={statusKey} />
                            </td>
                          ) : null}

                          {subTab === "followups_due" ? (
                            <td className="max-w-[240px] px-3 py-3 align-middle">
                              <div className="truncate text-xs font-medium text-slate-800">
                                {latest?.comment || registration.notes || "—"}
                              </div>
                              <div className="mt-0.5 truncate text-[11px] text-slate-500">
                                {latest?.addedBy?.name
                                  ? `Logged by ${latest.addedBy.name}`
                                  : sourceText(registration)}
                              </div>
                            </td>
                          ) : (
                            <td className="px-3 py-3 align-middle">
                              <div className="text-xs font-medium text-slate-700">
                                {latest
                                  ? shortDate(latest.createdAt)
                                  : formatDate(registration.createdAt)}
                              </div>
                              <div className="mt-0.5 max-w-[150px] truncate text-[11px] text-slate-400">
                                {latest?.comment || "Registration created"}
                              </div>
                            </td>
                          )}

                          {subTab === "followups_due" ? (
                            <td className="px-3 py-3 align-middle">
                              <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-100/90 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                                Today
                              </span>
                            </td>
                          ) : mode === "followup" ? (
                            <td className="px-3 py-3 align-middle">
                              {nextFollowUpOf(registration) ? (
                                <span
                                  className={`text-xs font-medium ${
                                    isDueToday(registration)
                                      ? "rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 font-semibold text-amber-700"
                                      : "text-slate-700"
                                  }`}
                                >
                                  {formatDate(nextFollowUpOf(registration))}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">Not set</span>
                              )}
                            </td>
                          ) : null}

                          <td
                            className="relative py-3 pl-3 pr-4 text-right align-middle"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {primaryAction}
                              <button
                                type="button"
                                onClick={() =>
                                  setRowMenuId((prev) =>
                                    prev === registration._id
                                      ? ""
                                      : registration._id,
                                  )
                                }
                                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                title="Row actions"
                                aria-label={`More actions for ${registration.studentName}`}
                              >
                                <FiMoreVertical size={15} />
                              </button>
                            </div>

                            {rowMenuId === registration._id ? (
                              <div className="absolute right-4 top-11 z-40 w-44 rounded-xl border border-slate-200 bg-white py-1 text-left text-xs shadow-xl">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRowMenuId("");
                                    openViewRegistration(registration);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  <FiEye size={13} className="text-slate-400" />
                                  View Profile
                                </button>

                                {registration.status === "admitted" ? (
                                  <>
                                    <div className="flex cursor-not-allowed select-none items-center gap-2 px-3 py-2 text-slate-400">
                                      <FiLock size={13} className="text-slate-300" />
                                      Edit (Locked)
                                    </div>
                                    <div className="flex cursor-not-allowed select-none items-center gap-2 px-3 py-2 text-slate-400">
                                      <FiLock size={13} className="text-slate-300" />
                                      Admitted (Locked)
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRowMenuId("");
                                        openEditById(registration._id);
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                      <FiEdit2 size={13} className="text-slate-400" />
                                      Edit Details
                                    </button>

                                    {registration.status === "cancelled" ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setRowMenuId("");
                                          restoreRegistration(registration);
                                        }}
                                        className="flex w-full items-center gap-2 px-3 py-2 font-medium text-blue-600 hover:bg-blue-50"
                                      >
                                        <FiRefreshCw size={13} />
                                        Restore Lead
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openConfirm("cancel", registration)
                                        }
                                        className="flex w-full items-center gap-2 px-3 py-2 font-medium text-rose-600 hover:bg-rose-50"
                                      >
                                        <FiX size={13} />
                                        Cancel Registration
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() =>
                                        openConfirm("delete", registration)
                                      }
                                      className="flex w-full items-center gap-2 px-3 py-2 font-medium text-rose-600 hover:bg-rose-50"
                                    >
                                      <FiTrash2 size={13} />
                                      Delete Record
                                    </button>
                                  </>
                                )}
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>Showing</span>
                <span className="rounded border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-700">
                  {visibleRegistrations.length}
                </span>
                <span>of {pagination.total || registrations.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, page: prev.page - 1 }))
                  }
                  disabled={pagination.page <= 1}
                  className={`${btnGhost} px-2 py-1`}
                >
                  <FiChevronLeft size={12} /> Prev
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
                  disabled={pagination.page >= pagination.pages}
                  className={`${btnGhost} px-2 py-1`}
                >
                  Next <FiChevronRight size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: details panel */}
          <aside className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-4 xl:sticky xl:top-18">
            {!selectedRegistration ? (
              <div className="px-4 py-12 text-center text-sm text-slate-400">
                Select a registration to see details.
              </div>
            ) : (
              (() => {
                const registration = selectedRegistration;
                const statusKey = displayStatusOf(registration, mode);
                const status = registration.status;
                const isAdmitted = status === "admitted";
                const isCancelled = status === "cancelled";
                const isLocked = isAdmitted || isCancelled;
                const step2Done =
                  mode === "exam"
                    ? ["exam_scheduled", "passed", "failed", "admitted"].includes(
                        status,
                      )
                    : ["in_followup", "admitted"].includes(
                        followupStatusOf(registration),
                      );
                const step3Done = isAdmitted;
                const latest = latestFollowUpOf(registration);

                let examBody = null;
                if (registration.entrance?.result !== "pending" &&
                    registration.entrance?.result) {
                  const passed = registration.entrance.result === "pass";
                  examBody = (
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-slate-800">
                          Score:{" "}
                          <span
                            className={
                              passed ? "text-emerald-600" : "text-rose-600"
                            }
                          >
                            {registration.entrance.obtainedMarks ?? "—"}/
                            {registration.entrance.totalMarks || 100}
                          </span>{" "}
                          ({passed ? "Passed" : "Below cutoff"})
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          {formatDate(registration.entrance.examDate)}
                          {registration.entrance.venue
                            ? ` · ${registration.entrance.venue}`
                            : ""}
                        </div>
                      </div>
                      {!isLocked ? (
                        <button
                          type="button"
                          onClick={() => openExamForRegistration(registration)}
                          className={btnGhost}
                        >
                          Update
                        </button>
                      ) : null}
                    </div>
                  );
                } else if (registration.entranceExamId) {
                  examBody = (
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-slate-800">
                          {formatDate(registration.entrance?.examDate)}
                          {registration.entrance?.startTime
                            ? `, ${registration.entrance.startTime}`
                            : ""}
                          {registration.entrance?.venue
                            ? ` · ${registration.entrance.venue}`
                            : ""}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          Scheduled · Awaiting score entry
                        </div>
                      </div>
                      {!isLocked ? (
                        <button
                          type="button"
                          onClick={() => openExamForRegistration(registration)}
                          className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-100"
                        >
                          Score
                        </button>
                      ) : null}
                    </div>
                  );
                } else {
                  examBody = (
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-slate-800">
                          No exam linked
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          Schedule one or skip to admission
                        </div>
                      </div>
                      {!isLocked ? (
                        <button
                          type="button"
                          onClick={() => openExamForRegistration(registration)}
                          className={btnGhost}
                        >
                          Schedule
                        </button>
                      ) : null}
                    </div>
                  );
                }

                return (
                  <>
                    {/* Header */}
                    <div className="border-b border-slate-100 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarClassFor(
                              registration.studentName,
                            )}`}
                          >
                            {initialsOf(registration.studentName)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="truncate text-[15px] font-bold text-slate-900">
                                {registration.studentName}
                              </h2>
                              <StatusBadge status={statusKey} />
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-500">
                              {registration.registrationNumber || "—"} ·{" "}
                              {formatDateTime(registration.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3.5 flex items-center gap-2">
                        {isAdmitted ? (
                          <>
                            <span className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-center text-xs font-semibold text-emerald-800">
                              <FiCheckCircle size={13} /> Student Admitted
                            </span>
                            <button
                              type="button"
                              disabled
                              className="flex cursor-not-allowed items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-400"
                              title="Admitted records are locked"
                            >
                              <FiLock size={12} /> Locked
                            </button>
                          </>
                        ) : isCancelled ? (
                          <>
                            <button
                              type="button"
                              onClick={() => restoreRegistration(registration)}
                              className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
                            >
                              Restore Registration
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditById(registration._id)}
                              className={btnSecondary}
                            >
                              Edit
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => openConfirm("admit", registration)}
                              className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
                            >
                              Admit student
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditById(registration._id)}
                              className={btnSecondary}
                            >
                              Edit
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Stage stepper */}
                    <div className="border-b border-slate-100 px-4 py-3">
                      <div className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        ADMISSION STAGE
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5 font-semibold text-emerald-700">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white">
                            ✓
                          </span>
                          <span>Registered</span>
                        </div>
                        <div
                          className={`mx-2 h-[1.5px] flex-1 ${
                            step2Done ? "bg-emerald-500" : "bg-slate-200"
                          }`}
                        />
                        <div
                          className={`flex items-center gap-1.5 ${
                            step2Done
                              ? "font-semibold text-emerald-700"
                              : "font-medium text-slate-400"
                          }`}
                        >
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                              step2Done
                                ? "bg-emerald-600 text-white"
                                : "border border-slate-300 bg-slate-100 text-slate-500"
                            }`}
                          >
                            {step2Done ? "✓" : "2"}
                          </span>
                          <span>{mode === "exam" ? "Exam" : "Follow-up"}</span>
                        </div>
                        <div
                          className={`mx-2 h-[1.5px] flex-1 ${
                            step3Done ? "bg-emerald-500" : "bg-slate-200"
                          }`}
                        />
                        <div
                          className={`flex items-center gap-1.5 ${
                            step3Done
                              ? "font-semibold text-emerald-700"
                              : "font-medium text-slate-400"
                          }`}
                        >
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                              step3Done
                                ? "bg-emerald-600 text-white"
                                : "border border-slate-300 bg-slate-100 text-slate-500"
                            }`}
                          >
                            {step3Done ? "✓" : "3"}
                          </span>
                          <span>Admitted</span>
                        </div>
                      </div>
                    </div>

                    {/* Details grid */}
                    <div className="border-b border-slate-100 px-4 py-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          DETAILS
                        </span>
                        <button
                          type="button"
                          onClick={() => openViewRegistration(registration)}
                          className="text-[11px] font-semibold text-blue-600 hover:underline"
                        >
                          Full profile
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs">
                        <div>
                          <div className="text-[11px] text-slate-400">Parent</div>
                          <div className="mt-0.5 font-medium text-slate-800">
                            {registration.parentName || "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-400">Mobile</div>
                          <div className="mt-0.5 font-medium text-slate-800">
                            {registration.parentMobile || "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-400">
                            Class applied
                          </div>
                          <div className="mt-0.5 font-medium text-slate-800">
                            {registration.className || "—"}
                            {registration.sectionName
                              ? ` · Section ${registration.sectionName}`
                              : ""}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-400">
                            {mode === "exam" ? "Session" : "Stream"}
                          </div>
                          <div className="mt-0.5 font-medium text-slate-800">
                            {mode === "exam"
                              ? registration.academicYear || selectedName || "—"
                              : registration.stream || "None"}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <div className="text-[11px] text-slate-400">
                            Source / previous school
                          </div>
                          <div className="mt-0.5 font-medium leading-snug text-slate-800">
                            {registration.previousSchoolName ||
                              sourceText(registration)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Entrance exam block */}
                    {mode === "exam" ? (
                      <div className="border-b border-slate-100 px-4 py-3">
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          ENTRANCE EXAM
                        </div>
                        <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3">
                          {examBody}
                        </div>
                      </div>
                    ) : null}

                    {/* Add follow-up */}
                    <div className="border-b border-slate-100 px-4 py-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          ADD FOLLOW-UP
                        </span>
                        {!isLocked ? (
                          <button
                            type="button"
                            onClick={() => openNextFollowUp(registration)}
                            className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100"
                          >
                            Set Today
                          </button>
                        ) : null}
                      </div>

                      {isLocked ? (
                        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                          <FiLock className="h-4 w-4 shrink-0 text-slate-400" />
                          <span>
                            Follow-ups locked — Student is already{" "}
                            <strong>{STATUS_META[statusKey]?.label || statusKey}</strong>.
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2.5 text-xs">
                          <textarea
                            ref={followUpBoxRef}
                            rows={2}
                            value={followUpDrafts[registration._id] || ""}
                            onChange={(event) =>
                              setFollowUpDrafts((prev) => ({
                                ...prev,
                                [registration._id]: event.target.value,
                              }))
                            }
                            placeholder="Write what was discussed..."
                            className={`${inputClass} resize-none`}
                          />

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="mb-1 block text-[11px] text-slate-500">
                                Next follow-up
                              </label>
                              <input
                                type="date"
                                value={nextFollowUpInput}
                                onChange={(event) =>
                                  setFollowUpDates((prev) => ({
                                    ...prev,
                                    [registration._id]: event.target.value,
                                  }))
                                }
                                className={`${inputClass} px-2.5 py-1.5`}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[11px] text-slate-500">
                                Assign to
                              </label>
                              <select
                                value={
                                  followUpAssignees[registration._id] || "Me"
                                }
                                onChange={(event) =>
                                  setFollowUpAssignees((prev) => ({
                                    ...prev,
                                    [registration._id]: event.target.value,
                                  }))
                                }
                                className={`${inputClass} px-2.5 py-1.5`}
                              >
                                <option value="Me">Me</option>
                                <option value="Admin">Admin</option>
                                <option value="Counselor">Counselor</option>
                              </select>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddFollowUp(registration._id)}
                            disabled={
                              followUpSavingId === registration._id ||
                              !String(followUpDrafts[registration._id] || "").trim()
                            }
                            className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {followUpSavingId === registration._id
                              ? "Saving…"
                              : "Save follow-up"}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Latest activity */}
                    <div className="bg-slate-50/40 px-4 py-3">
                      <div className="mb-2.5 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          ACTIVITY (LATEST)
                        </span>
                        <button
                          type="button"
                          onClick={() => openFollowUpHistory(registration)}
                          className="text-xs font-semibold text-blue-600 hover:underline"
                        >
                          View all (
                          {Array.isArray(registration.followUps)
                            ? registration.followUps.length
                            : 0}
                          )
                        </button>
                      </div>

                      {latest ? (
                        <div className="rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-sm">
                          <div className="flex items-start gap-2">
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold leading-snug text-slate-800">
                                {latest.assignedTo
                                  ? `Follow-up logged · Assigned to ${latest.assignedTo}`
                                  : "Follow-up logged"}
                              </div>
                              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">
                                {latest.comment}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 border-t border-slate-100 pt-1.5 text-[10px] text-slate-400">
                                <span>
                                  {latest.addedBy?.name || "System"} ·{" "}
                                  {formatDateTime(latest.createdAt)}
                                </span>
                                {latest.nextFollowUpDate ? (
                                  <span
                                    className={`rounded px-1.5 py-0.5 font-semibold ${
                                      isSameDay(latest.nextFollowUpDate)
                                        ? "bg-amber-50 text-amber-700"
                                        : "text-blue-600"
                                    }`}
                                  >
                                    Next: {formatDate(latest.nextFollowUpDate)}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs italic text-slate-400">
                          No activity recorded yet.
                        </div>
                      )}
                    </div>
                  </>
                );
              })()
            )}
          </aside>
        </div>
      </div>

      {/* ----------------------- registration form modal ----------------------- */}
      <Modal
        open={regModal.open}
        onClose={closeRegModal}
        title={
          regModal.mode === "edit"
            ? "Edit Student Registration"
            : "New Student Registration"
        }
        subtitle={
          leadInfo
            ? `Linked to lead: ${leadInfo.name}`
            : `Complete the admission inquiry form for Session ${
                selectedName || "—"
              }`
        }
        width="max-w-3xl"
        footer={
          <>
            <button type="button" onClick={closeRegModal} className={btnSecondary}>
              Cancel
            </button>
            <button
              type="button"
              onClick={submitRegistration}
              disabled={regSaving}
              className={btnPrimary}
            >
              {regSaving
                ? "Saving..."
                : regModal.mode === "edit"
                  ? "Update Registration"
                  : "Save Registration"}
            </button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ConfigurableFormFields
              steps={activeFormSteps}
              values={regForm}
              customValues={customValues}
              inputClass={inputClass}
              onChangeBuiltin={(key, value) =>
                setRegForm((prev) => ({
                  ...prev,
                  [key]: value,
                  ...(key === "classId" ? { sectionId: "" } : {}),
                }))
              }
              onChangeCustom={(key, value) =>
                setCustomValues((prev) => ({ ...prev, [key]: value }))
              }
              renderBuiltin={{
                classId: (field) => (
                  <ConfigField field={field}>
                    <select
                      value={regForm.classId}
                      onChange={(event) => {
                        const nextClassId = event.target.value;
                        const available = streamsForClass(nextClassId);
                        setRegForm((prev) => ({
                          ...prev,
                          classId: nextClassId,
                          sectionId: "",
                          streamId: available.some(
                            (item) => String(item._id) === String(prev.streamId),
                          )
                            ? prev.streamId
                            : "",
                        }));
                      }}
                      className={inputClass}
                    >
                      <option value="">Select class</option>
                      {classes.map((cls) => (
                        <option key={cls._id} value={cls._id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </ConfigField>
                ),
                streamId: (field) => (
                  <ConfigField field={field}>
                    <select
                      value={regForm.streamId}
                      onChange={(event) =>
                        setRegForm((prev) => ({
                          ...prev,
                          streamId: event.target.value,
                        }))
                      }
                      className={inputClass}
                    >
                      <option value="">
                        {regForm.classId
                          ? "Select stream (optional)"
                          : "Select class first"}
                      </option>
                      {streamsForClass(regForm.classId).map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </ConfigField>
                ),
                sectionId: (field) => (
                  <ConfigField field={field}>
                    <select
                      value={regForm.sectionId}
                      onChange={(event) =>
                        setRegForm((prev) => ({
                          ...prev,
                          sectionId: event.target.value,
                        }))
                      }
                      disabled={!selectedSections.length}
                      className={inputClass}
                    >
                      <option value="">
                        {selectedSections.length
                          ? "Select section"
                          : "No sections"}
                      </option>
                      {selectedSections.map((section) => (
                        <option key={section._id} value={section._id}>
                          {section.name}
                        </option>
                      ))}
                    </select>
                  </ConfigField>
                ),
                state: (field) => (
                  <ConfigField field={field}>
                    <select
                      value={regForm.state}
                      onChange={(event) => {
                        const nextState = event.target.value;
                        setRegForm((prev) => ({
                          ...prev,
                          state: nextState,
                          district:
                            prev.state === nextState ? prev.district : "",
                        }));
                      }}
                      className={inputClass}
                    >
                      <option value="">Select state</option>
                      {INDIA_STATES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </ConfigField>
                ),
                district: (field) => (
                  <ConfigField field={field}>
                    <select
                      value={regForm.district}
                      onChange={(event) =>
                        setRegForm((prev) => ({
                          ...prev,
                          district: event.target.value,
                        }))
                      }
                      disabled={!regForm.state}
                      className={inputClass}
                    >
                      <option value="">
                        {regForm.state
                          ? "Select district"
                          : "Select state first"}
                      </option>
                      {districtsForState(regForm.state).map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </ConfigField>
                ),
              }}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
            <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[11px] text-blue-700">
                6
              </span>
              Additional Information &amp; Initial Follow-up
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-medium text-slate-700">
                  Next Follow-up Date
                </label>
                <input
                  type="date"
                  value={regForm.nextFollowUpDate || ""}
                  onChange={(event) =>
                    setRegForm((prev) => ({
                      ...prev,
                      nextFollowUpDate: event.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-slate-700">
                  Counselor Notes
                </label>
                <input
                  value={regForm.notes || ""}
                  onChange={(event) =>
                    setRegForm((prev) => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Optional initial remarks..."
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* --------------------------- public link modal --------------------------- */}
      <Modal
        open={linkModal.open}
        onClose={() =>
          setLinkModal({ open: false, loading: false, saving: false, data: null })
        }
        title="Customize Public Apply Form"
        subtitle="Share this link with parents. No login is required."
        width="max-w-xl"
      >
        {linkModal.loading || !linkModal.data ? (
          <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {linkModal.data.enabled ? "Form is live" : "Form is off"}
                </p>
                <p className="text-[11px] text-slate-500">
                  Turn it on to accept applications from the link.
                </p>
              </div>
              <button
                type="button"
                onClick={() => saveLink({ enabled: !linkModal.data.enabled })}
                disabled={linkModal.saving}
                className={`relative h-7 w-12 rounded-full transition ${
                  linkModal.data.enabled ? "bg-blue-600" : "bg-slate-300"
                }`}
                aria-label="Toggle public form"
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                    linkModal.data.enabled ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Shareable link
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <input
                  readOnly
                  value={publicUrl}
                  className={`${inputClass} flex-1`}
                  onFocus={(event) => event.target.select()}
                />
                <button type="button" onClick={copyLink} className={btnSecondary}>
                  <FiCopy size={13} /> Copy
                </button>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={btnSecondary}
                >
                  <FiExternalLink size={13} /> Open
                </a>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      "Rotate the link? The old link will stop working immediately.",
                    )
                  )
                    saveLink({ rotate: true });
                }}
                className="mt-2 text-[11px] font-semibold text-rose-600 hover:underline"
              >
                Rotate link
              </button>
            </div>

            <Field label="Instructions shown to parents">
              <textarea
                rows={3}
                value={linkModal.data.instructions || ""}
                onChange={(event) =>
                  setLinkModal((prev) => ({
                    ...prev,
                    data: { ...prev.data, instructions: event.target.value },
                  }))
                }
                className={inputClass}
                placeholder="Documents to bring, office timings, etc."
              />
            </Field>

            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Classes open for registration
              </p>
              <p className="mb-2 text-[11px] text-slate-400">
                Leave every box unchecked to show all active classes.
              </p>
              <div className="grid max-h-48 grid-cols-2 gap-1.5 overflow-y-auto rounded-xl border border-slate-200 p-3 sm:grid-cols-3">
                {classes.map((cls) => {
                  const selected = (linkModal.data.openClassIds || []).includes(
                    cls._id,
                  );
                  return (
                    <label
                      key={cls._id}
                      className="flex items-center gap-2 text-xs text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        className="accent-blue-600"
                        onChange={() => {
                          const current = new Set(
                            linkModal.data.openClassIds || [],
                          );
                          if (selected) current.delete(cls._id);
                          else current.add(cls._id);
                          setLinkModal((prev) => ({
                            ...prev,
                            data: {
                              ...prev.data,
                              openClassIds: [...current],
                            },
                          }));
                        }}
                      />
                      {cls.name}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setLinkModal({
                    open: false,
                    loading: false,
                    saving: false,
                    data: null,
                  })
                }
                className={btnSecondary}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() =>
                  saveLink({
                    instructions: linkModal.data.instructions || "",
                    openClassIds: linkModal.data.openClassIds || [],
                  })
                }
                disabled={linkModal.saving}
                className={btnPrimary}
              >
                {linkModal.saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* --------------------------- exam form modal --------------------------- */}
      <Modal
        open={examModal.open}
        onClose={() => setExamModal({ open: false, mode: "create", id: "" })}
        title={
          examModal.mode === "edit"
            ? "Edit Entrance Exam"
            : "Schedule Entrance Exam"
        }
        subtitle="Pending registrations for the selected class are linked automatically."
        width="max-w-2xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setExamModal({ open: false, mode: "create", id: "" })}
              className={btnSecondary}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitExam}
              disabled={examSaving}
              className={btnPrimary}
            >
              {examSaving
                ? "Saving…"
                : examModal.mode === "edit"
                  ? "Update Exam"
                  : "Schedule Exam"}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Exam name *">
            <input
              value={examForm.name}
              onChange={(event) =>
                setExamForm((prev) => ({ ...prev, name: event.target.value }))
              }
              className={inputClass}
              placeholder="e.g. Class 6 Entrance Test"
            />
          </Field>
          <Field label="Class *">
            <select
              value={examForm.classId}
              onChange={(event) =>
                setExamForm((prev) => ({ ...prev, classId: event.target.value }))
              }
              className={inputClass}
            >
              <option value="">Select class</option>
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Exam date *">
            <input
              type="date"
              value={examForm.examDate}
              onChange={(event) =>
                setExamForm((prev) => ({
                  ...prev,
                  examDate: event.target.value,
                }))
              }
              className={inputClass}
            />
          </Field>
          <Field label="Venue">
            <input
              value={examForm.venue}
              onChange={(event) =>
                setExamForm((prev) => ({ ...prev, venue: event.target.value }))
              }
              className={inputClass}
              placeholder="Block / room"
            />
          </Field>
          <Field label="Start time">
            <input
              type="time"
              value={examForm.startTime}
              onChange={(event) =>
                setExamForm((prev) => ({
                  ...prev,
                  startTime: event.target.value,
                }))
              }
              className={inputClass}
            />
          </Field>
          <Field label="End time">
            <input
              type="time"
              value={examForm.endTime}
              onChange={(event) =>
                setExamForm((prev) => ({
                  ...prev,
                  endTime: event.target.value,
                }))
              }
              className={inputClass}
            />
          </Field>
          <Field label="Total marks">
            <input
              type="number"
              min="1"
              value={examForm.totalMarks}
              onChange={(event) =>
                setExamForm((prev) => ({
                  ...prev,
                  totalMarks: event.target.value,
                }))
              }
              className={inputClass}
            />
          </Field>
          <Field label="Passing marks">
            <input
              type="number"
              min="0"
              value={examForm.passingMarks}
              onChange={(event) =>
                setExamForm((prev) => ({
                  ...prev,
                  passingMarks: event.target.value,
                }))
              }
              className={inputClass}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Instructions">
              <textarea
                rows={3}
                value={examForm.instructions}
                onChange={(event) =>
                  setExamForm((prev) => ({
                    ...prev,
                    instructions: event.target.value,
                  }))
                }
                className={inputClass}
                placeholder="Reporting time, documents, etc."
              />
            </Field>
          </div>
        </div>
      </Modal>

      {/* --------------------------- manage exams modal --------------------------- */}
      <Modal
        open={manageExamsOpen}
        onClose={() => setManageExamsOpen(false)}
        title="Entrance Exams"
        subtitle="Schedule, edit, score and complete entrance exams by class."
        width="max-w-3xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setManageExamsOpen(false)}
              className={btnSecondary}
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                setManageExamsOpen(false);
                openExamCreate();
              }}
              className={btnPrimary}
            >
              <FiPlus size={13} /> Schedule exam
            </button>
          </>
        }
      >
        {examsLoading ? (
          <p className="py-8 text-center text-sm text-slate-400">
            Loading entrance exams…
          </p>
        ) : exams.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-5 py-10 text-center">
            <FiCalendar size={26} className="mx-auto text-slate-400" />
            <p className="mt-3 font-semibold text-slate-800">
              No entrance exams scheduled
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Schedule an exam for a class. Pending registrations for that class
              are linked automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {exams.map((exam) => (
              <div
                key={exam._id}
                className="rounded-xl border border-slate-200 p-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">
                        {exam.name}
                      </h3>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          exam.status === "completed"
                            ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                            : exam.status === "cancelled"
                              ? "border-slate-300 bg-slate-200 text-slate-600"
                              : "border-amber-200 bg-amber-100 text-amber-700"
                        }`}
                      >
                        {exam.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {exam.className} · {formatDate(exam.examDate)} ·{" "}
                      {exam.startTime || "—"}–{exam.endTime || "—"}
                      {exam.venue ? ` · ${exam.venue}` : ""}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Total {exam.totalMarks} · Passing {exam.passingMarks} ·{" "}
                      {exam.counts?.total || 0} candidate
                      {(exam.counts?.total || 0) === 1 ? "" : "s"} (
                      {exam.counts?.passed || 0} passed,{" "}
                      {exam.counts?.failed || 0} failed,{" "}
                      {exam.counts?.pending || 0} pending)
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => openMarks(exam)}
                      className={btnPrimary}
                    >
                      <FiClipboard size={12} /> Marks
                    </button>
                    <button
                      type="button"
                      onClick={() => openExamEdit(exam)}
                      className={btnGhost}
                    >
                      <FiEdit2 size={12} />
                    </button>
                    {exam.status === "scheduled" ? (
                      <button
                        type="button"
                        onClick={() => completeExam(exam)}
                        className={btnGhost}
                      >
                        <FiCheckCircle size={12} />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => deleteExam(exam)}
                      className="inline-flex items-center justify-center rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50"
                    >
                      <FiTrash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* ------------------------------ marks modal ------------------------------ */}
      <Modal
        open={marksModal.open}
        onClose={() =>
          setMarksModal({
            open: false,
            loading: false,
            saving: false,
            exam: null,
            candidates: [],
          })
        }
        title={marksModal.exam ? `Marks · ${marksModal.exam.name}` : "Entrance marks"}
        subtitle={
          marksModal.exam
            ? `${marksModal.exam.className} · ${formatDate(
                marksModal.exam.examDate,
              )} · Passing ${marksModal.exam.passingMarks}/${marksModal.exam.totalMarks}`
            : ""
        }
        width="max-w-4xl"
      >
        {marksModal.loading ? (
          <p className="py-8 text-center text-sm text-slate-400">
            Loading candidates…
          </p>
        ) : marksModal.candidates.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No candidates linked to this exam yet.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Candidate</th>
                    <th className="px-3 py-2">Reg no.</th>
                    <th className="px-3 py-2">Marks</th>
                    <th className="px-3 py-2">Absent</th>
                    <th className="px-3 py-2">Remarks</th>
                    <th className="px-3 py-2">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {marksModal.candidates.map((candidate) => {
                    const row = marksRows[candidate._id] || {};
                    return (
                      <tr
                        key={candidate._id}
                        className="border-t border-slate-100"
                      >
                        <td className="px-3 py-2">
                          <p className="font-medium text-slate-800">
                            {candidate.studentName}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {candidate.parentMobile}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-[11px] text-slate-500">
                          {candidate.registrationNumber}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            max={marksModal.exam?.totalMarks || undefined}
                            value={row.obtainedMarks ?? ""}
                            disabled={row.absent}
                            onChange={(event) =>
                              setMarksRows((prev) => ({
                                ...prev,
                                [candidate._id]: {
                                  ...prev[candidate._id],
                                  obtainedMarks: event.target.value,
                                },
                              }))
                            }
                            className={`${inputClass} w-24`}
                            placeholder="—"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={Boolean(row.absent)}
                            className="accent-blue-600"
                            onChange={(event) =>
                              setMarksRows((prev) => ({
                                ...prev,
                                [candidate._id]: {
                                  ...prev[candidate._id],
                                  absent: event.target.checked,
                                },
                              }))
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={row.remarks || ""}
                            onChange={(event) =>
                              setMarksRows((prev) => ({
                                ...prev,
                                [candidate._id]: {
                                  ...prev[candidate._id],
                                  remarks: event.target.value,
                                },
                              }))
                            }
                            className={`${inputClass} min-w-[140px]`}
                            placeholder="Optional"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge status={candidate.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => saveMarks(false)}
                disabled={marksModal.saving}
                className={btnSecondary}
              >
                {marksModal.saving ? "Saving…" : "Save marks"}
              </button>
              <button
                type="button"
                onClick={() => saveMarks(true)}
                disabled={marksModal.saving}
                className={btnPrimary}
              >
                Save &amp; complete exam
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* form builder */}
      {builderOpen && (
        <AdmissionFormBuilder
          apiPath="/registration-form"
          mergeSteps={mergeRegistrationSteps}
          fieldTypes={REGISTRATION_FIELD_TYPES}
          lockedFieldKeys={REGISTRATION_LOCKED_FIELD_KEYS}
          title="Customize Registration Form"
          description="Add, hide, rename, or delete fields on the registration form. Changes apply to your school only (including the public form)."
          lockedDeleteHint="Required to create a registration"
          reviewStepKey=""
          allowCustomSteps={false}
          onClose={() => setBuilderOpen(false)}
          onSaved={(steps) => {
            const merged = mergeRegistrationSteps(steps);
            setFormSteps(merged);
            setCustomValues(emptyCustomValues(merged));
          }}
        />
      )}

      {/* Follow-up & activity history */}
      <Modal
        open={followUpHistory.open}
        onClose={() =>
          setFollowUpHistory({
            open: false,
            loading: false,
            registrationId: "",
            studentName: "",
            followUps: [],
          })
        }
        title="Follow-up & Activity History"
        subtitle={followUpHistory.studentName}
        width="max-w-xl"
        footer={
          <>
            <button
              type="button"
              onClick={() =>
                setFollowUpHistory({
                  open: false,
                  loading: false,
                  registrationId: "",
                  studentName: "",
                  followUps: [],
                })
              }
              className={btnSecondary}
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                const id = followUpHistory.registrationId;
                setFollowUpHistory({
                  open: false,
                  loading: false,
                  registrationId: "",
                  studentName: "",
                  followUps: [],
                });
                focusFollowUpBox(id);
              }}
              className={btnPrimary}
            >
              + Add Follow-up
            </button>
          </>
        }
      >
        {followUpHistory.loading ? (
          <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
        ) : followUpHistory.followUps.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            No follow-up feedback yet.
          </p>
        ) : (
          <div className="space-y-0">
            {[...followUpHistory.followUps]
              .sort(
                (a, b) =>
                  new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
              )
              .map((entry, index, list) => (
                <div
                  key={`${entry.createdAt}-${index}`}
                  className={`relative ml-2 pb-4 pl-6 ${
                    index !== list.length - 1
                      ? "border-l-2 border-slate-200"
                      : ""
                  }`}
                >
                  <span
                    className={`absolute -left-[7px] top-1 h-3 w-3 rounded-full ${
                      index === 0
                        ? "bg-blue-600 ring-4 ring-blue-100"
                        : "bg-slate-400"
                    }`}
                  />
                  <div
                    className={`rounded-xl border p-3.5 ${
                      index === 0
                        ? "border-blue-200 bg-blue-50/25"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {entry.assignedTo
                            ? `Follow-up logged · Assigned to ${entry.assignedTo}`
                            : "Follow-up logged"}
                        </span>
                        {index === 0 ? (
                          <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                            Latest
                          </span>
                        ) : null}
                      </div>
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                        Follow-up
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                      {entry.comment}
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                      <span>
                        Logged by{" "}
                        <strong className="text-slate-700">
                          {entry.addedBy?.name || "Unknown"}
                        </strong>{" "}
                        · {formatDateTime(entry.createdAt)}
                      </span>
                      {entry.nextFollowUpDate ? (
                        <span
                          className={`rounded px-2 py-0.5 font-semibold ${
                            isSameDay(entry.nextFollowUpDate)
                              ? "border border-amber-200 bg-amber-50 text-amber-700"
                              : "text-blue-600"
                          }`}
                        >
                          Next follow-up: {formatDate(entry.nextFollowUpDate)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </Modal>

      {/* View / print registration */}
      <Modal
        open={viewModal.open}
        onClose={() => setViewModal({ open: false, loading: false, data: null })}
        title="Student Profile"
        subtitle={
          viewModal.data?.registrationNumber
            ? `${viewModal.data.registrationNumber} · Registered ${formatDate(
                viewModal.data.createdAt,
              )} · Session ${viewModal.data.academicYear || "—"}`
            : "Filled registration details"
        }
        width="max-w-3xl"
        footer={
          <>
            <button
              type="button"
              onClick={() =>
                setViewModal({ open: false, loading: false, data: null })
              }
              className={btnSecondary}
            >
              Close
            </button>
            {viewModal.data && viewModal.data.status !== "admitted" ? (
              <button
                type="button"
                onClick={() => {
                  const id = viewModal.data._id;
                  setViewModal({ open: false, loading: false, data: null });
                  openEditById(id);
                }}
                className={btnSecondary}
              >
                Edit Record
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!viewModal.data}
              className={btnPrimary}
            >
              <FiDownload size={13} /> Print
            </button>
          </>
        }
      >
        {viewModal.loading || !viewModal.data ? (
          <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
        ) : (
          <div id="registration-print-area" className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${avatarClassFor(
                  viewModal.data.studentName,
                )}`}
              >
                {initialsOf(viewModal.data.studentName)}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    {viewModal.data.studentName}
                  </h3>
                  <StatusBadge
                    status={displayStatusOf(viewModal.data, mode)}
                  />
                </div>
                {viewModal.data.studentId ? (
                  <p className="text-[11px] text-slate-500">
                    Admitted student record linked
                  </p>
                ) : null}
              </div>
            </div>

            {[
              {
                title: "1. Student Details",
                fields: [
                  ["Full Name", viewModal.data.studentName],
                  ["Date of Birth", formatDate(viewModal.data.dob)],
                  ["Gender", viewModal.data.gender],
                  ["Blood Group", viewModal.data.bloodGroup],
                ],
              },
              {
                title: "2. Parent / Guardian Details",
                fields: [
                  ["Parent / Guardian", viewModal.data.parentName],
                  ["Email Address", viewModal.data.parentEmail],
                  ["Registration No.", viewModal.data.registrationNumber],
                ],
              },
              {
                title: "3. Contact Information",
                fields: [
                  ["Primary Mobile", viewModal.data.parentMobile],
                  ["Email Address", viewModal.data.parentEmail],
                ],
              },
              {
                title: "4. Academic Interest",
                fields: [
                  [
                    "Class & Section",
                    `${viewModal.data.className || "—"}${
                      viewModal.data.sectionName
                        ? ` · Section ${viewModal.data.sectionName}`
                        : ""
                    }`,
                  ],
                  ["Stream", viewModal.data.stream],
                  ["Lead Source", sourceText(viewModal.data)],
                  ["Previous School", viewModal.data.previousSchoolName],
                ],
              },
              {
                title: "5. Address",
                fields: [
                  ["Street / Locality", viewModal.data.address],
                  ["City / Town / Tehsil", viewModal.data.city],
                  ["State", viewModal.data.state],
                  ["District", viewModal.data.district],
                  ["Pin Code", viewModal.data.pincode],
                ],
              },
              {
                title: "6. Additional Information & Admission Status",
                fields: [
                  [
                    "Current Status",
                    STATUS_META[displayStatusOf(viewModal.data, mode)]?.label ||
                      displayStatusOf(viewModal.data, mode),
                  ],
                  [
                    "Next Follow-up",
                    viewModal.data.nextFollowUpDate
                      ? formatDate(viewModal.data.nextFollowUpDate)
                      : "Not set",
                  ],
                  ["Counselor Notes", viewModal.data.notes],
                  ["Total Logs", String(viewModal.data.followUps?.length || 0)],
                ],
              },
            ].map((section) => (
              <div
                key={section.title}
                className="rounded-xl border border-slate-200 bg-slate-50/40 p-4"
              >
                <h4 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {section.title}
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                  {section.fields.map(([label, value]) => (
                    <div key={label}>
                      <span className="block text-slate-400">{label}</span>
                      <span className="font-semibold text-slate-800">
                        {value || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {Array.isArray(viewModal.data.customFields) &&
            viewModal.data.customFields.length > 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                <h4 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Additional Fields
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                  {viewModal.data.customFields.map((field) => (
                    <div key={field.key}>
                      <span className="block text-slate-400">
                        {field.label || field.key}
                      </span>
                      <span className="font-semibold text-slate-800">
                        {field.value || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </Modal>

      {/* Custom confirm modal (admit / cancel / delete) */}
      {confirmAction.open ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="p-5">
              <div
                className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${
                  confirmAction.type === "admit"
                    ? "bg-blue-50 text-blue-600"
                    : "bg-rose-50 text-rose-600"
                }`}
              >
                {confirmAction.type === "admit" ? (
                  <FiCheckCircle size={20} />
                ) : (
                  <FiX size={20} />
                )}
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {confirmAction.type === "admit"
                  ? `Admit ${confirmAction.registration?.studentName || "student"}?`
                  : confirmAction.type === "delete"
                    ? "Delete Registration?"
                    : "Cancel Registration?"}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {confirmAction.type === "admit"
                  ? `Confirm admission for ${confirmAction.registration?.studentName} into ${
                      confirmAction.registration?.className || "the selected class"
                    }. The admission wizard opens next and the registration is marked Admitted when you save.`
                  : confirmAction.type === "delete"
                    ? `Permanently delete ${
                        confirmAction.registration?.registrationNumber || "this registration"
                      } for ${confirmAction.registration?.studentName}? This cannot be undone.`
                    : `Mark ${
                        confirmAction.registration?.studentName
                      } as Cancelled? You can restore this lead later if the parent re-initiates the inquiry.`}
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setConfirmAction({
                      open: false,
                      type: "admit",
                      registration: null,
                    })
                  }
                  className={btnSecondary}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={runConfirmAction}
                  className={`rounded-lg px-4 py-1.5 text-xs font-semibold text-white ${
                    confirmAction.type === "admit"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {confirmAction.type === "admit"
                    ? "Confirm Admission"
                    : confirmAction.type === "delete"
                      ? "Delete"
                      : "Cancel Registration"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #registration-print-area, #registration-print-area * {
            visibility: visible !important;
          }
          #registration-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 12mm;
            background: #fff !important;
            color: #111 !important;
          }
          @page { size: auto; margin: 10mm; }
        }
      `}</style>
    </div>
  );
};

export default Registrations;
