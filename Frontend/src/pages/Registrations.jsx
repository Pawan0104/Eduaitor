import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClipboard,
  FiCopy,
  FiEdit2,
  FiExternalLink,
  FiEye,
  FiLink,
  FiMessageSquare,
  FiPlus,
  FiPrinter,
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
import AdmissionFormBuilder from "../components/AdmissionFormBuilder";
import ConfigurableFormFields, {
  buildCustomFieldsPayload,
  emptyCustomValues,
  hydrateCustomValues,
  validateConfigurableFields,
} from "../components/ConfigurableFormFields";
import {
  REGISTRATION_FIELD_TYPES,
  REGISTRATION_LOCKED_FIELD_KEYS,
  mergeRegistrationSteps,
} from "../lib/registrationFormDefaults";

const STATUS_META = {
  registered: {
    label: "Registered",
    className: "bg-sky-100 text-sky-700 border-sky-200",
  },
  exam_scheduled: {
    label: "Exam scheduled",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  passed: {
    label: "Passed",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  failed: {
    label: "Failed",
    className: "bg-rose-100 text-rose-700 border-rose-200",
  },
  admitted: {
    label: "Admitted",
    className: "bg-indigo-100 text-indigo-700 border-indigo-200",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-slate-200 text-slate-600 border-slate-300",
  },
};

const STATUS_FILTERS = [
  { value: "", label: "All statuses" },
  { value: "registered", label: "Registered" },
  { value: "exam_scheduled", label: "Exam scheduled" },
  { value: "passed", label: "Passed" },
  { value: "failed", label: "Failed" },
  { value: "admitted", label: "Admitted" },
  { value: "cancelled", label: "Cancelled" },
];

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
  pincode: "",
  previousSchoolName: "",
  notes: "",
});

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
  return date.toISOString().slice(0, 10);
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

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.registered;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}
    >
      {meta.label}
    </span>
  );
};

const Modal = ({ open, title, subtitle, onClose, children, width = "max-w-2xl", footer }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className={`flex max-h-[94vh] w-full ${width} flex-col overflow-hidden rounded-2xl bg-[rgb(var(--surface))] text-[rgb(var(--text))] shadow-2xl`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[rgb(var(--border))] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 text-xs text-[rgb(var(--text-muted))]">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[rgb(var(--text-muted))] transition hover:text-red-400"
            aria-label="Close"
          >
            <FiX size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
        {footer ? (
          <div className="flex shrink-0 justify-end gap-3 border-t border-[rgb(var(--border))] px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
};

const Field = ({ label, children, hint, className = "" }) => (
  <label className={`flex flex-col gap-2 text-sm font-medium ${className}`}>
    {label}
    {children}
    {hint ? (
      <span className="text-[11px] font-normal text-[rgb(var(--text-muted))]">{hint}</span>
    ) : null}
  </label>
);

const inputClass =
  "w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2.5 text-sm text-[rgb(var(--text))] outline-none transition focus:border-[rgb(var(--primary))]";

const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[rgb(var(--primary))] px-4 py-2.5 text-sm font-medium text-white shadow transition hover:opacity-90 disabled:opacity-60";

const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 py-2.5 text-sm font-medium text-[rgb(var(--text))] transition hover:bg-[rgb(var(--bg))]";

const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-sm font-medium text-[rgb(var(--text))] transition hover:bg-[rgb(var(--bg))]";

const Registrations = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isStaff = user?.role === "staff_admin";
  const basePath = isStaff ? "/staff" : "/school";
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  const [tab, setTab] = useState("registrations");
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
  const [searchDraft, setSearchDraft] = useState("");
  const [classes, setClasses] = useState([])
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);

  const [regModal, setRegModal] = useState({
    open: false,
    mode: "create",
    id: "",
    leadId: "",
  });
  const [regForm, setRegForm] = useState(emptyRegistration());
  const [regSaving, setRegSaving] = useState(false);
  const [leadInfo, setLeadInfo] = useState(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [formSteps, setFormSteps] = useState(() =>
    mergeRegistrationSteps(null),
  );
  const [customValues, setCustomValues] = useState(() =>
    emptyCustomValues(mergeRegistrationSteps(null)),
  );

  const [exams, setExams] = useState([]);
  const [examsLoading, setExamsLoading] = useState(false);
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

  const handledQuery = useRef("");

  /* ------------------------------- loaders ------------------------------- */
  const loadRegistrations = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/registrations`, {
        params: {
          page: filters.page,
          limit: 25,
          search: filters.search || undefined,
          classId: filters.classId || undefined,
          status: filters.status || undefined,
        },
        withCredentials: true,
      });
      setRegistrations(data?.data?.registrations || []);
      setStats(data?.data?.stats || {});
      setPagination(
        data?.data?.pagination || { page: 1, pages: 1, total: 0 }
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not load registrations."
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadExams = useCallback(async () => {
    setExamsLoading(true);
    try {
      const { data } = await axios.get(`${API}/entrance-exams`, {
        withCredentials: true,
      });
      setExams(data?.data?.exams || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not load entrance exams."
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

  useEffect(() => {
    loadRegistrations();
  }, [loadRegistrations]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    if (tab === "exams") loadExams();
  }, [tab, loadExams]);

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
        setCustomValues(emptyCustomValues(steps));
      } catch {
        if (!cancelled && gen === loadGen) {
          const steps = mergeRegistrationSteps(null);
          setFormSteps(steps);
          setCustomValues(emptyCustomValues(steps));
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
        pincode: registration.pincode || "",
        previousSchoolName: registration.previousSchoolName || "",
        notes: registration.notes || "",
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
        setRegModal({ open: true, mode: "edit", id: registration._id });
      } catch (error) {
        toast.error(
          error.response?.data?.message || "Could not open the registration."
        );
      }
    },
    [applyRegistration]
  );

  const openFromLead = useCallback(async (leadId) => {
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
      const latestRemark = [...(lead.followUps || [])]
        .reverse()
        .find((entry) => String(entry?.comment || "").trim())?.comment || "";
      setLeadInfo({ _id: lead._id, name: lead.studentName });
      setRegForm({
        ...emptyRegistration(),
        studentName: lead.studentName || "",
        parentName: lead.parentName || "",
        parentMobile: lead.parentMobile || "",
        parentEmail: lead.parentEmail || "",
        previousSchoolName: lead.previousSchoolName || "",
        classId: lead.classId ? String(lead.classId) : "",
        streamId: lead.streamId ? String(lead.streamId) : "",
        notes: latestRemark,
      });
      setCustomValues(
        hydrateCustomValues(formSteps, lead.customFields || []),
      );
      setRegModal({ open: true, mode: "create", id: "", leadId: lead._id });
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not open the lead.");
    }
  }, [openEditById, formSteps]);

  useEffect(() => {
    const leadId = searchParams.get("leadId");
    const registrationId = searchParams.get("registrationId");
    if ((!leadId && !registrationId) || handledQuery.current === searchParams.toString()) {
      return;
    }
    handledQuery.current = searchParams.toString();
    if (registrationId) openEditById(registrationId);
    else openFromLead(leadId);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams, openEditById, openFromLead]);

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

  const setFilter = (patch) =>
    setFilters((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));

  /* --------------------------- registration CRUD --------------------------- */
  const openCreate = () => {
    setLeadInfo(null);
    setRegForm(emptyRegistration());
    setCustomValues(emptyCustomValues(formSteps));
    setRegModal({ open: true, mode: "create", id: "", leadId: "" });
  };

  const submitRegistration = async () => {
    const configError = validateConfigurableFields(
      formSteps,
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
        leadId: regModal.leadId || undefined,
        customFields: buildCustomFieldsPayload(formSteps, customValues),
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
      await loadRegistrations();
      if (tab === "exams") await loadExams();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not save the registration."
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
        { withCredentials: true }
      );
      toast.success(
        status === "cancelled"
          ? "Registration cancelled."
          : "Registration restored."
      );
      await loadRegistrations();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not update the registration."
      );
    }
  };

  const deleteRegistration = async (registration) => {
    if (
      !window.confirm(
        `Delete registration ${registration.registrationNumber || ""} for ${registration.studentName}?`
      )
    )
      return;
    try {
      await axios.delete(`${API}/registrations/${registration._id}`, {
        withCredentials: true,
      });
      toast.success("Registration deleted.");
      await loadRegistrations();
      if (tab === "exams") await loadExams();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not delete the registration."
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
          : "Entrance exam result is pending. Enter marks first."
      );
      return;
    }
    navigate(`${basePath}/student-manage?registrationId=${registration._id}`);
  };

  const sourceText = (registration) =>
    registration?.sourceLabel ||
    (registration?.source === "public"
      ? "Website"
      : registration?.source === "lead"
        ? "Lead"
        : registration?.createdByName || "Office");

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

  const printViewRegistration = () => {
    window.print();
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
        { comment },
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
      setFollowUpHistory((prev) => ({ ...prev, loading: false, followUps: [] }));
      toast.error("Could not load follow-ups.");
    }
  };

  /* ------------------------------ exam CRUD ------------------------------ */
  const openExamCreate = () => {
    setExamForm({ ...emptyExam(), classId: filters.classId || "" });
    setExamModal({ open: true, mode: "create", id: "" });
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
          { withCredentials: true }
        );
        toast.success("Entrance exam updated.");
      } else {
        const { data } = await axios.post(
          `${API}/entrance-exams`,
          examForm,
          { withCredentials: true }
        );
        toast.success(data?.message || "Entrance exam scheduled.");
      }
      setExamModal({ open: false, mode: "create", id: "" });
      await Promise.all([loadExams(), loadRegistrations()]);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not save the entrance exam."
      );
    } finally {
      setExamSaving(false);
    }
  };

  const deleteExam = async (exam) => {
    if (
      !window.confirm(
        `Delete "${exam.name}"? Linked candidates will go back to Registered.`
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
        error.response?.data?.message || "Could not delete the entrance exam."
      );
    }
  };

  const completeExam = async (exam) => {
    if (!window.confirm(`Mark "${exam.name}" as completed?`)) return;
    try {
      await axios.patch(
        `${API}/entrance-exams/${exam._id}/status`,
        { status: "completed" },
        { withCredentials: true }
      );
      toast.success("Exam marked completed.");
      await loadExams();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not complete the exam."
      );
    }
  };

  const openMarks = async (exam) => {
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
        error.response?.data?.message || "Could not load the candidates."
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
        { withCredentials: true }
      );
      toast.success(data?.message || "Marks saved.");
      const refreshed = await axios.get(
        `${API}/entrance-exams/${exam._id}`,
        { withCredentials: true }
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
      toast.error(error.response?.data?.message || "Could not save the marks.");
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
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not load the public link."
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
        { withCredentials: true }
      );
      setLinkModal((prev) => ({ ...prev, saving: false, data: data.data }));
      toast.success(data?.message || "Public form updated.");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not update the public form."
      );
      setLinkModal((prev) => ({ ...prev, saving: false }));
    }
  };

  const publicUrl = linkModal.data?.token
    ? `${window.location.origin}${import.meta.env.BASE_URL}register/${linkModal.data.token}`
    : "";

  const copyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Link copied.");
    } catch {
      window.prompt("Copy this link", publicUrl);
    }
  };

  /* -------------------------------- render -------------------------------- */
  const statCards = [
    { key: "total", label: "Total", icon: FiClipboard },
    { key: "registered", label: "Registered", icon: FiUserPlus },
    { key: "exam_scheduled", label: "Exam scheduled", icon: FiCalendar },
    { key: "passed", label: "Passed", icon: FiCheckCircle },
    { key: "failed", label: "Failed", icon: FiX },
    { key: "admitted", label: "Admitted", icon: FiCheckCircle },
  ];

  const selectedSections = sectionOptions(regForm.classId);

  const closeRegModal = () => {
    setRegModal({ open: false, mode: "create", id: "", leadId: "" });
    setLeadInfo(null);
    setCustomValues(emptyCustomValues(formSteps));
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] p-4 text-[rgb(var(--text))] md:p-6">
      {isMobile && (
        <button
          type="button"
          onClick={() => window.history.back()}
          className="mb-4 flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-1.5 text-sm font-bold text-[rgb(var(--text))] transition-transform active:scale-95"
        >
          <FiChevronLeft size={13} /> Back
        </button>
      )}

      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-[rgb(var(--text))] md:text-3xl">
            Registration
          </h1>
          <p className="mt-0.5 text-sm text-[rgb(var(--text-muted))]">
            Admission funnel between leads and student admission. Entrance exams
            are scheduled and scored here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setBuilderOpen(true)}
            className={btnSecondary}
            title="Add, hide or reorder registration form fields"
          >
            <FiSettings size={14} /> Customize Form
          </button>
          <button type="button" onClick={openLinkModal} className={btnSecondary}>
            <FiLink size={14} /> Public form
          </button>
          <button
            type="button"
            onClick={() => loadRegistrations()}
            className={btnSecondary}
          >
            <FiRefreshCw size={14} /> Refresh
          </button>
          {tab === "registrations" ? (
            <button type="button" onClick={openCreate} className={btnPrimary}>
              <FiUserPlus size={14} /> New registration
            </button>
          ) : (
            <button type="button" onClick={openExamCreate} className={btnPrimary}>
              <FiPlus size={14} /> Schedule exam
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4"
            >
              <div className="mb-1 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(var(--primary),0.1)] text-[rgb(var(--primary))]">
                  <Icon size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">
                    {card.label}
                  </p>
                  <p className="text-xl font-bold text-[rgb(var(--text))]">
                    {stats[card.key] || 0}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { key: "registrations", label: "Registrations" },
          { key: "exams", label: "Entrance exams" },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setTab(item.key);
              if (item.key === "exams") loadExams();
            }}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              tab === item.key
                ? "bg-[rgb(var(--primary))] text-white shadow"
                : "border border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--bg))]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "registrations" ? (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <FiSearch
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))]"
                size={14}
              />
              <input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter")
                    setFilter({ search: searchDraft.trim() });
                }}
                placeholder="Search name, mobile, registration no."
                className={`${inputClass} pl-9`}
              />
            </div>
            <select
              value={filters.classId}
              onChange={(event) => setFilter({ classId: event.target.value })}
              className={inputClass}
            >
              <option value="">All classes</option>
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.name}
                </option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(event) => setFilter({ status: event.target.value })}
              className={inputClass}
            >
              {STATUS_FILTERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setSearchDraft("");
                setFilters({ search: "", classId: "", status: "", page: 1 });
              }}
              className={btnGhost}
            >
              Clear
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-sm">
            <div className="border-b border-[rgb(var(--border))] px-5 py-4">
              <h2 className="text-lg font-semibold text-[rgb(var(--text))]">
                Registrations
              </h2>
              <p className="text-xs text-[rgb(var(--text-muted))]">
                Page {pagination.page} of {pagination.pages} · {pagination.total}{" "}
                registration{pagination.total === 1 ? "" : "s"}
              </p>
            </div>

            {loading ? (
              <p className="px-5 py-10 text-center text-[rgb(var(--text-muted))]">
                Loading registrations…
              </p>
            ) : registrations.length === 0 ? (
              <p className="px-5 py-10 text-center text-[rgb(var(--text-muted))]">
                No registrations yet. Create one from a lead or New registration.
              </p>
            ) : (
              <div className="divide-y divide-[rgb(var(--border))]">
                {registrations.map((registration) => {
                  const followUpCount = Array.isArray(registration.followUps)
                    ? registration.followUps.length
                    : 0;
                  const latestFollowUp = followUpCount
                    ? [...registration.followUps].sort(
                        (a, b) =>
                          new Date(b.createdAt || 0) -
                          new Date(a.createdAt || 0),
                      )[0]
                    : null;
                  return (
                  <div
                    key={registration._id}
                    className="space-y-3 px-5 py-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold text-[rgb(var(--text))]">
                          {registration.studentName}
                        </p>
                        <StatusBadge status={registration.status} />
                        {registration.registrationNumber ? (
                          <span className="rounded-full bg-[rgba(var(--primary),0.1)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--primary))]">
                            {registration.registrationNumber}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-[rgb(var(--text-muted))]">
                        Parent: {registration.parentName || "—"}
                        {registration.parentMobile
                          ? ` · ${registration.parentMobile}`
                          : ""}
                      </p>
                      <p className="text-sm text-[rgb(var(--text-muted))]">
                        Class: {registration.className || "—"}
                        {registration.sectionName
                          ? ` · ${registration.sectionName}`
                          : ""}
                        {registration.academicYear
                          ? ` · ${registration.academicYear}`
                          : ""}
                      </p>
                      <p className="text-sm text-[rgb(var(--text-muted))]">
                        Source:{" "}
                        <span className="font-medium text-[rgb(var(--text))]">
                          {sourceText(registration)}
                        </span>
                      </p>
                      <p className="text-xs text-[rgb(var(--text-muted))]">
                        {registration.entranceExamId ? (
                          <>
                            Exam: {registration.entrance?.examName || "Scheduled"}{" "}
                            · {formatDate(registration.entrance?.examDate)}
                            {registration.entrance?.result === "pass"
                              ? ` · ${registration.entrance?.obtainedMarks ?? "—"}/${registration.entrance?.totalMarks} passed`
                              : registration.entrance?.result === "fail"
                                ? ` · ${registration.entrance?.obtainedMarks ?? "—"}/${registration.entrance?.totalMarks} failed`
                                : registration.entrance?.result === "absent"
                                  ? " · absent"
                                  : " · marks pending"}
                          </>
                        ) : (
                          "No entrance exam linked"
                        )}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
                      <button
                        type="button"
                        onClick={() => openViewRegistration(registration)}
                        className={btnGhost}
                      >
                        <FiEye size={12} /> View
                      </button>
                      <button
                        type="button"
                        onClick={() => admit(registration)}
                        disabled={
                          registration.status === "admitted" ||
                          registration.status === "cancelled"
                        }
                        className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        <FiCheckCircle size={12} />
                        {registration.status === "admitted" ? "Admitted" : "Admit"}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditById(registration._id)}
                        disabled={registration.status === "admitted"}
                        className={`${btnGhost} disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        <FiEdit2 size={12} /> Edit
                      </button>
                      {registration.status === "cancelled" ? (
                        <button
                          type="button"
                          onClick={() =>
                            changeStatus(registration, "registered")
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                        >
                          Restore
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            changeStatus(registration, "cancelled")
                          }
                          disabled={registration.status === "admitted"}
                          className={`${btnGhost} disabled:cursor-not-allowed disabled:opacity-40`}
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteRegistration(registration)}
                        disabled={registration.status === "admitted"}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <FiTrash2 size={12} /> Delete
                      </button>
                    </div>
                    </div>

                    <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">
                          Follow-up
                        </p>
                        <button
                          type="button"
                          onClick={() => openFollowUpHistory(registration)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[rgb(var(--primary))]"
                        >
                          <FiMessageSquare size={11} />
                          History ({followUpCount})
                        </button>
                      </div>
                      {latestFollowUp ? (
                        <p className="mb-2 line-clamp-2 text-xs text-[rgb(var(--text-muted))]">
                          Latest: {latestFollowUp.comment}
                          {latestFollowUp.addedBy?.name
                            ? ` — ${latestFollowUp.addedBy.name}`
                            : ""}
                        </p>
                      ) : (
                        <p className="mb-2 text-xs text-[rgb(var(--text-muted))]">
                          No follow-ups yet. Add the first note below.
                        </p>
                      )}
                      <textarea
                        value={followUpDrafts[registration._id] || ""}
                        onChange={(event) =>
                          setFollowUpDrafts((prev) => ({
                            ...prev,
                            [registration._id]: event.target.value,
                          }))
                        }
                        placeholder="Write a follow-up note…"
                        rows={2}
                        className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm text-[rgb(var(--text))] outline-none transition focus:border-[rgb(var(--primary))]"
                      />
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleAddFollowUp(registration._id)}
                          disabled={
                            followUpSavingId === registration._id ||
                            !String(followUpDrafts[registration._id] || "").trim()
                          }
                          className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-40`}
                        >
                          <FiMessageSquare size={12} />
                          {followUpSavingId === registration._id
                            ? "Saving…"
                            : "Add follow-up"}
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[rgb(var(--border))] px-5 py-3 text-sm text-[rgb(var(--text-muted))]">
              <span>
                Page {pagination.page} of {pagination.pages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, page: prev.page - 1 }))
                  }
                  disabled={pagination.page <= 1}
                  className={`${btnGhost} disabled:opacity-40`}
                >
                  <FiChevronLeft size={12} /> Prev
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
                  disabled={pagination.page >= pagination.pages}
                  className={`${btnGhost} disabled:opacity-40`}
                >
                  Next <FiChevronRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
          <div className="space-y-3">
            {examsLoading ? (
              <p className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-5 py-10 text-center text-[rgb(var(--text-muted))]">
                Loading entrance exams…
              </p>
            ) : exams.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-5 py-12 text-center">
                <FiCalendar
                  size={28}
                  className="mx-auto text-[rgb(var(--text-muted))]"
                />
                <p className="mt-3 font-semibold text-[rgb(var(--text))]">
                  No entrance exams scheduled
                </p>
                <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">
                  Schedule an exam for a class. Pending registrations for that
                  class are linked automatically.
                </p>
                <button
                  type="button"
                  onClick={openExamCreate}
                  className={`mt-4 ${btnPrimary}`}
                >
                  <FiPlus size={14} /> Schedule exam
                </button>
              </div>
            ) : (
              exams.map((exam) => (
                <div
                  key={exam._id}
                  className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-[rgb(var(--text))]">
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
                      <p className="text-sm text-[rgb(var(--text-muted))]">
                        {exam.className} · {formatDate(exam.examDate)} ·{" "}
                        {exam.startTime || "—"}–{exam.endTime || "—"}
                        {exam.venue ? ` · ${exam.venue}` : ""}
                      </p>
                      <p className="text-xs text-[rgb(var(--text-muted))]">
                        Total {exam.totalMarks} · Passing {exam.passingMarks} ·{" "}
                        {exam.counts?.total || 0} candidate
                        {(exam.counts?.total || 0) === 1 ? "" : "s"} (
                        {exam.counts?.passed || 0} passed,{" "}
                        {exam.counts?.failed || 0} failed,{" "}
                        {exam.counts?.pending || 0} pending)
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
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
                        <FiEdit2 size={12} /> Edit
                      </button>
                      {exam.status === "scheduled" ? (
                        <button
                          type="button"
                          onClick={() => completeExam(exam)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                        >
                          <FiCheckCircle size={12} /> Complete
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => deleteExam(exam)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-500 transition hover:bg-red-50"
                      >
                        <FiTrash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
      )}

      {/* ----------------------- registration form modal ----------------------- */}
      <Modal
        open={regModal.open}
        onClose={closeRegModal}
        title={regModal.mode === "edit" ? "Edit Registration" : "New Registration"}
        subtitle={
          leadInfo
            ? `Linked to lead: ${leadInfo.name}`
            : "Candidate moves to Admission after the entrance exam (if any) is passed."
        }
        width="max-w-2xl"
        footer={
          <>
            <button type="button" onClick={closeRegModal} className={btnGhost}>
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
                  ? "Update"
                  : "Create Registration"}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ConfigurableFormFields
            steps={formSteps}
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
                <Field
                  label={`${field.label}${field.required ? " *" : ""}`}
                >
                  <select
                    value={regForm.classId}
                    onChange={(event) =>
                      setRegForm((prev) => ({
                        ...prev,
                        classId: event.target.value,
                        sectionId: "",
                      }))
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
              ),
              streamId: (field) => (
                <Field
                  label={`${field.label}${field.required ? " *" : ""}`}
                >
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
                    <option value="">Select stream (optional)</option>
                    {streams.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </Field>
              ),
              sectionId: (field) => (
                <Field
                  label={`${field.label}${field.required ? " *" : ""}`}
                >
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
                </Field>
              ),
            }}
          />
        </div>
      </Modal>

      {/* --------------------------- public link modal --------------------------- */}
      <Modal
        open={linkModal.open}
        onClose={() =>
          setLinkModal({ open: false, loading: false, saving: false, data: null })
        }
        title="Public registration form"
        subtitle="Share this link with parents. No login is required."
        width="max-w-2xl"
      >
        {linkModal.loading || !linkModal.data ? (
          <p className="py-8 text-center text-sm text-[rgb(var(--text-muted))]">
            Loading…
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-[rgb(var(--border))] px-3 py-2.5">
              <div>
                <p className="text-sm font-semibold text-[rgb(var(--text))]">
                  {linkModal.data.enabled ? "Form is live" : "Form is off"}
                </p>
                <p className="text-xs text-[rgb(var(--text-muted))]">
                  Turn it on to accept applications from the link.
                </p>
              </div>
              <button
                type="button"
                onClick={() => saveLink({ enabled: !linkModal.data.enabled })}
                disabled={linkModal.saving}
                className={`relative h-7 w-12 rounded-full transition ${
                  linkModal.data.enabled
                    ? "bg-[rgb(var(--primary))]"
                    : "bg-slate-300"
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

            <div className="rounded-xl border border-[rgb(var(--border))] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">
                Shareable link
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <input
                  readOnly
                  value={publicUrl}
                  className={`${inputClass} flex-1`}
                  onFocus={(event) => event.target.select()}
                />
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[rgb(var(--border))] px-3 py-2 text-sm font-semibold text-[rgb(var(--text))]"
                >
                  <FiCopy size={13} /> Copy
                </button>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[rgb(var(--border))] px-3 py-2 text-sm font-semibold text-[rgb(var(--text))]"
                >
                  <FiExternalLink size={13} /> Open
                </a>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      "Rotate the link? The old link will stop working immediately."
                    )
                  )
                    saveLink({ rotate: true });
                }}
                className="mt-2 text-xs font-semibold text-rose-600 hover:underline"
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
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">
                Classes open for registration
              </p>
              <p className="mb-2 text-[11px] text-[rgb(var(--text-muted))]">
                Leave every box unchecked to show all active classes.
              </p>
              <div className="grid max-h-48 grid-cols-2 gap-1.5 overflow-y-auto rounded-xl border border-[rgb(var(--border))] p-3 sm:grid-cols-3">
                {classes.map((cls) => {
                  const selected = (linkModal.data.openClassIds || []).includes(
                    cls._id
                  );
                  return (
                    <label
                      key={cls._id}
                      className="flex items-center gap-2 text-sm text-[rgb(var(--text))]"
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => {
                          const current = new Set(
                            linkModal.data.openClassIds || []
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
                  setLinkModal({ open: false, loading: false, saving: false, data: null })
                }
                className="rounded-xl border border-[rgb(var(--border))] px-4 py-2 text-sm font-medium text-[rgb(var(--text-muted))]"
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
                className="rounded-xl bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
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
        title={examModal.mode === "edit" ? "Edit entrance exam" : "Schedule entrance exam"}
        subtitle="Pending registrations for the selected class are linked automatically."
        width="max-w-2xl"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                setExamForm((prev) => ({ ...prev, examDate: event.target.value }))
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
                setExamForm((prev) => ({ ...prev, startTime: event.target.value }))
              }
              className={inputClass}
            />
          </Field>
          <Field label="End time">
            <input
              type="time"
              value={examForm.endTime}
              onChange={(event) =>
                setExamForm((prev) => ({ ...prev, endTime: event.target.value }))
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
                setExamForm((prev) => ({ ...prev, totalMarks: event.target.value }))
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
                setExamForm((prev) => ({ ...prev, passingMarks: event.target.value }))
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
                  setExamForm((prev) => ({ ...prev, instructions: event.target.value }))
                }
                className={inputClass}
                placeholder="Reporting time, documents, etc."
              />
            </Field>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setExamModal({ open: false, mode: "create", id: "" })}
            className="rounded-xl border border-[rgb(var(--border))] px-4 py-2 text-sm font-medium text-[rgb(var(--text-muted))]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submitExam}
            disabled={examSaving}
            className="rounded-xl bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {examSaving ? "Saving…" : examModal.mode === "edit" ? "Update exam" : "Schedule exam"}
          </button>
        </div>
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
            ? `${marksModal.exam.className} · ${formatDate(marksModal.exam.examDate)} · Passing ${marksModal.exam.passingMarks}/${marksModal.exam.totalMarks}`
            : ""
        }
        width="max-w-4xl"
      >
        {marksModal.loading ? (
          <p className="py-8 text-center text-sm text-[rgb(var(--text-muted))]">
            Loading candidates…
          </p>
        ) : marksModal.candidates.length === 0 ? (
          <p className="py-8 text-center text-sm text-[rgb(var(--text-muted))]">
            No candidates linked to this exam yet.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[rgb(var(--hover))] text-xs uppercase tracking-wide text-[rgb(var(--text-muted))]">
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
                        className="border-t border-[rgb(var(--border))]"
                      >
                        <td className="px-3 py-2">
                          <p className="font-medium text-[rgb(var(--text))]">
                            {candidate.studentName}
                          </p>
                          <p className="text-xs text-[rgb(var(--text-muted))]">
                            {candidate.parentMobile}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-xs text-[rgb(var(--text-muted))]">
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
                className="rounded-xl border border-[rgb(var(--border))] px-4 py-2 text-sm font-semibold text-[rgb(var(--text))] disabled:opacity-60"
              >
                {marksModal.saving ? "Saving…" : "Save marks"}
              </button>
              <button
                type="button"
                onClick={() => saveMarks(true)}
                disabled={marksModal.saving}
                className="rounded-xl bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Save &amp; complete exam
              </button>
            </div>
          </>
        )}
      </Modal>

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

      {/* Follow-up history */}
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
        title="Follow-up Feedback"
        subtitle={followUpHistory.studentName}
        width="max-w-2xl"
      >
        {followUpHistory.loading ? (
          <p className="py-6 text-center text-sm text-[rgb(var(--text-muted))]">
            Loading…
          </p>
        ) : followUpHistory.followUps.length === 0 ? (
          <p className="py-6 text-center text-sm text-[rgb(var(--text-muted))]">
            No follow-up feedback yet.
          </p>
        ) : (
          <div className="space-y-3">
            {followUpHistory.followUps.map((entry, index) => (
              <div
                key={`${entry.createdAt}-${index}`}
                className="rounded-xl border border-[rgb(var(--border))] p-4"
              >
                <p className="text-sm text-[rgb(var(--text))]">{entry.comment}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-[rgb(var(--text-muted))]">
                  <span>
                    By: {entry.addedBy?.name || "Unknown"}
                    {entry.addedBy?.role ? ` (${entry.addedBy.role})` : ""}
                  </span>
                  <span>
                    {entry.createdAt
                      ? new Date(entry.createdAt).toLocaleString()
                      : "—"}
                  </span>
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
        title="Registration Form"
        subtitle={
          viewModal.data?.registrationNumber
            ? `No. ${viewModal.data.registrationNumber}`
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
              className={btnGhost}
            >
              Close
            </button>
            <button
              type="button"
              onClick={printViewRegistration}
              disabled={!viewModal.data}
              className={btnPrimary}
            >
              <FiPrinter size={14} /> Print
            </button>
          </>
        }
      >
        {viewModal.loading || !viewModal.data ? (
          <p className="py-8 text-center text-sm text-[rgb(var(--text-muted))]">
            Loading…
          </p>
        ) : (
          <div id="registration-print-area" className="space-y-4 text-sm">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                ["Student Name", viewModal.data.studentName],
                ["Registration No.", viewModal.data.registrationNumber],
                ["Status", viewModal.data.status],
                ["Source", sourceText(viewModal.data)],
                ["Class", viewModal.data.className],
                ["Section", viewModal.data.sectionName],
                ["Stream", viewModal.data.stream],
                ["DOB", formatDate(viewModal.data.dob)],
                ["Gender", viewModal.data.gender],
                ["Blood Group", viewModal.data.bloodGroup],
                ["Parent Name", viewModal.data.parentName],
                ["Parent Mobile", viewModal.data.parentMobile],
                ["Parent Email", viewModal.data.parentEmail],
                ["Previous School", viewModal.data.previousSchoolName],
                ["Address", viewModal.data.address],
                ["City", viewModal.data.city],
                ["Pincode", viewModal.data.pincode],
                ["Academic Year", viewModal.data.academicYear],
                ["Notes", viewModal.data.notes],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-[rgb(var(--border))] px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">
                    {label}
                  </p>
                  <p className="mt-0.5 font-medium text-[rgb(var(--text))]">
                    {value || "—"}
                  </p>
                </div>
              ))}
            </div>
            {Array.isArray(viewModal.data.customFields) &&
            viewModal.data.customFields.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">
                  Additional fields
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {viewModal.data.customFields.map((field) => (
                    <div
                      key={field.key}
                      className="rounded-lg border border-[rgb(var(--border))] px-3 py-2"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">
                        {field.label || field.key}
                      </p>
                      <p className="mt-0.5 font-medium text-[rgb(var(--text))]">
                        {field.value || "—"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </Modal>

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
