import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FaArrowLeft,
  FaBan,
  FaCheck,
  FaCommentDots,
  FaEdit,
  FaEnvelope,
  FaEye,
  FaPhone,
  FaPlus,
  FaSlidersH,
  FaTimes,
  FaUserGraduate,
  FaUserPlus,
} from "react-icons/fa";
import AdmissionFormBuilder from "../components/AdmissionFormBuilder";
import ConfigurableFormFields, {
  buildCustomFieldsPayload,
  emptyCustomValues,
  hydrateCustomValues,
  isCustomFieldKey,
  validateConfigurableFields,
} from "../components/ConfigurableFormFields";
import {
  LEAD_FIELD_TYPES,
  LEAD_LOCKED_FIELD_KEYS,
  mergeLeadSteps,
} from "../lib/leadFormDefaults";

const API = import.meta.env.VITE_API_URL;
const leadStatusOptions = ["active", "processing", "admitted", "cancelled"];

const formatLeadStatus = (status = "") =>
  status ? status.charAt(0).toUpperCase() + status.slice(1) : "Active";

const leadStatusMeta = {
  active: {
    label: "Active",
    className: "bg-sky-100 text-sky-800 border-sky-200",
    hint: "New enquiry",
  },
  processing: {
    label: "Processing",
    className: "bg-amber-100 text-amber-800 border-amber-200",
    hint: "Follow-up or registration started",
  },
  admitted: {
    label: "Admitted",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
    hint: "Student created",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-slate-200 text-slate-700 border-slate-300",
    hint: "Closed without admission",
  },
};

const statusOf = (lead) => String(lead?.status || "active").toLowerCase();

const getInitials = (name = "", fallback = "?") => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
};

const IconAction = ({
  title,
  onClick,
  disabled,
  className = "",
  children,
}) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border text-sm transition disabled:opacity-50 ${className}`}
  >
    {children}
  </button>
);

const emptyForm = {
  studentName: "",
  parentName: "",
  parentMobile: "",
  parentEmail: "",
  previousSchoolName: "",
  classId: "",
  streamId: "",
  assigneeKey: "",
};

const LeadManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;
  const isStaffLogin = user?.role === "staff_admin";
  const basePath = isStaffLogin ? "/staff" : "/school";

  const [leads, setLeads] = useState([]);
  const [classes, setClasses] = useState([]);
  const [streams, setStreams] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState("");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [formSteps, setFormSteps] = useState(() => mergeLeadSteps(null));
  const [form, setForm] = useState(emptyForm);
  const [customValues, setCustomValues] = useState(() =>
    emptyCustomValues(mergeLeadSteps(null)),
  );
  const [statusUpdatingId, setStatusUpdatingId] = useState("");
  const [assigneeUpdatingId, setAssigneeUpdatingId] = useState("");
  const [editingAssigneeLeadId, setEditingAssigneeLeadId] = useState("");
  const [assigneeDrafts, setAssigneeDrafts] = useState({});
  const [feedbackSavingId, setFeedbackSavingId] = useState("");
  const [feedbackDrafts, setFeedbackDrafts] = useState({});
  const [historyModal, setHistoryModal] = useState({
    open: false,
    leadId: "",
    studentName: "",
    loading: false,
    followUps: [],
  });
  const [viewModal, setViewModal] = useState({
    open: false,
    lead: null,
  });
  const [filters, setFilters] = useState({
    name: "",
    status: "",
    assigneeKey: "",
  });

  const fetchPageData = async () => {
    try {
      setLoading(true);
      const requestList = [
        axios.get(`${API}/leads`, { withCredentials: true }),
        axios.get(`${API}/classes/all`, { withCredentials: true }),
        axios.get(`${API}/streams/all`, {
          params: { status: "Active" },
          withCredentials: true,
        }),
      ];
      if (!isStaffLogin) {
        requestList.push(
          axios.get(`${API}/leads/assignable-users`, { withCredentials: true }),
        );
      }

      const [leadRes, classRes, streamRes, assigneeRes] = await Promise.all(requestList);

      setLeads(leadRes.data.data || []);
      setClasses(classRes?.data?.classes || []);
      setStreams(streamRes?.data?.streams || streamRes?.data?.data || []);
      setAssignees(assigneeRes?.data?.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load lead data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPageData();
  }, [isStaffLogin]);

  useEffect(() => {
    let cancelled = false;
    let loadGen = 0;
    (async () => {
      const gen = ++loadGen;
      try {
        const res = await axios.get(`${API}/lead-form`, {
          withCredentials: true,
        });
        if (cancelled || gen !== loadGen) return;
        const steps = mergeLeadSteps(res.data?.data?.steps);
        setFormSteps(steps);
        setCustomValues(emptyCustomValues(steps));
      } catch {
        if (!cancelled && gen === loadGen) {
          const steps = mergeLeadSteps(null);
          setFormSteps(steps);
          setCustomValues(emptyCustomValues(steps));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const assigneeOptions = useMemo(
    () =>
      assignees.map((assignee) => ({
        value: `${assignee.userType}:${assignee.userId}`,
        label: `${assignee.name} (${assignee.roleLabel})`,
      })),
    [assignees],
  );

  const filteredLeads = useMemo(() => {
    const nameQuery = String(filters.name || "").trim().toLowerCase();
    const statusQuery = String(filters.status || "").trim().toLowerCase();
    const assigneeQuery = String(filters.assigneeKey || "").trim();

    return (leads || []).filter((lead) => {
      if (nameQuery) {
        const haystack = [
          lead.studentName,
          lead.parentName,
          lead.parentMobile,
          lead.parentEmail,
        ]
          .map((value) => String(value || "").toLowerCase())
          .join(" ");
        if (!haystack.includes(nameQuery)) return false;
      }

      if (statusQuery) {
        const leadStatus = String(lead.status || "active").toLowerCase();
        if (leadStatus !== statusQuery) return false;
      }

      if (assigneeQuery) {
        const leadAssignee =
          lead.assignedTo?.userType && lead.assignedTo?.userId
            ? `${lead.assignedTo.userType}:${lead.assignedTo.userId}`
            : "";
        if (leadAssignee !== assigneeQuery) return false;
      }

      return true;
    });
  }, [leads, filters]);

  const hasActiveFilters = Boolean(
    String(filters.name || "").trim() ||
      filters.status ||
      filters.assigneeKey,
  );

  const clearFilters = () =>
    setFilters({ name: "", status: "", assigneeKey: "" });

  const statusCounts = useMemo(() => {
    const counts = {
      active: 0,
      processing: 0,
      admitted: 0,
      cancelled: 0,
    };
    for (const lead of leads || []) {
      const key = statusOf(lead);
      if (counts[key] !== undefined) counts[key] += 1;
      else counts.active += 1;
    }
    return counts;
  }, [leads]);

  const streamsForClass = (classId) => {
    const selected = String(classId || "");
    return (streams || []).filter((item) => {
      const linked = (item.classIds || []).map(String);
      if (!linked.length) return true;
      if (!selected) return true;
      return linked.includes(selected);
    });
  };

  const viewCustomValues = useMemo(
    () =>
      hydrateCustomValues(formSteps, viewModal.lead?.customFields || []),
    [formSteps, viewModal.lead],
  );

  // Read-only value for a form field, using the same labels as the Add form.
  const viewFieldValue = (field) => {
    if (!field?.key) return "";
    const lead = viewModal.lead || {};

    if (isCustomFieldKey(field.key)) {
      const raw = viewCustomValues?.[field.key];
      if (field.type === "checkbox") return raw ? "Yes" : "No";
      if (raw === null || raw === undefined) return "";
      return String(raw).trim();
    }

    if (field.key === "classId") {
      if (lead.className) return lead.className;
      const found = (classes || []).find(
        (item) => String(item._id) === String(lead.classId),
      );
      return found?.name || "";
    }

    if (field.key === "streamId") {
      if (lead.stream) return lead.stream;
      const found = (streams || []).find(
        (item) => String(item._id) === String(lead.streamId),
      );
      return found?.name || "";
    }

    if (field.key === "assigneeKey") {
      const assigned = lead.assignedTo;
      if (!assigned?.name) return "";
      return assigned.roleLabel
        ? `${assigned.name} (${assigned.roleLabel})`
        : assigned.name;
    }

    const raw = lead[field.key];
    if (raw === null || raw === undefined) return "";
    return String(raw).trim();
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => {
      if (name === "classId") {
        const nextStreams = streamsForClass(value);
        const keepStream = nextStreams.some(
          (item) => String(item._id) === String(prev.streamId),
        );
        return {
          ...prev,
          classId: value,
          streamId: keepStream ? prev.streamId : "",
        };
      }
      return { ...prev, [name]: value };
    });
  };

  const resetForm = () => {
    setForm(emptyForm);
    setCustomValues(emptyCustomValues(formSteps));
    setEditingLeadId("");
    setShowModal(false);
  };

  const openCreateModal = () => {
    setEditingLeadId("");
    setForm(emptyForm);
    setCustomValues(emptyCustomValues(formSteps));
    setShowModal(true);
  };

  const openViewModal = (lead) => {
    if (!lead?._id) return;
    setViewModal({ open: true, lead });
  };

  const openEditModal = (lead) => {
    if (!lead?._id) return;
    if (lead.studentId || String(lead.status || "").toLowerCase() === "admitted") {
      toast.error("Admitted leads cannot be edited");
      return;
    }
    setEditingLeadId(lead._id);
    setForm({
      studentName: lead.studentName || "",
      parentName: lead.parentName || "",
      parentMobile: lead.parentMobile || "",
      parentEmail: lead.parentEmail || "",
      previousSchoolName: lead.previousSchoolName || "",
      classId: lead.classId ? String(lead.classId) : "",
      streamId: lead.streamId ? String(lead.streamId) : "",
      assigneeKey:
        lead.assignedTo?.userType && lead.assignedTo?.userId
          ? `${lead.assignedTo.userType}:${lead.assignedTo.userId}`
          : "",
    });
    setCustomValues(hydrateCustomValues(formSteps, lead.customFields || []));
    setShowModal(true);
  };

  const validate = () => {
    const configError = validateConfigurableFields(
      formSteps,
      form,
      customValues,
    );
    if (configError) return configError;
    if (form.parentMobile?.trim() && !/^\d{10}$/.test(form.parentMobile.trim())) {
      return "Parent mobile number must be 10 digits";
    }
    if (form.parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.parentEmail)) {
      return "Enter a valid parent email";
    }
    return null;
  };

  const handleSaveLead = async () => {
    const validationError = validate();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const [assignedToUserType, assignedToUserId] = String(form.assigneeKey || "")
      .split(":");

    const payload = {
      studentName: form.studentName.trim(),
      parentName: form.parentName.trim(),
      parentMobile: form.parentMobile.trim(),
      parentEmail: form.parentEmail.trim(),
      previousSchoolName: form.previousSchoolName.trim(),
      classId: form.classId || undefined,
      streamId: form.streamId || undefined,
      assignedToUserType,
      assignedToUserId,
      customFields: buildCustomFieldsPayload(formSteps, customValues),
    };

    try {
      setSaving(true);
      if (editingLeadId) {
        const { data } = await axios.put(
          `${API}/leads/${editingLeadId}`,
          payload,
          { withCredentials: true },
        );
        toast.success(data.message || "Lead updated successfully");
      } else {
        const { data } = await axios.post(`${API}/leads`, payload, {
          withCredentials: true,
        });
        toast.success(data.message || "Lead created successfully");
      }
      await fetchPageData();
      resetForm();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          (editingLeadId ? "Failed to update lead" : "Failed to create lead"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancelLead = async (lead) => {
    if (!lead?._id) return;
    if (lead.studentId || String(lead.status || "").toLowerCase() === "admitted") {
      toast.error("Admitted leads cannot be cancelled");
      return;
    }
    if (String(lead.status || "").toLowerCase() === "cancelled") {
      toast.info("Lead is already cancelled");
      return;
    }
    if (
      !window.confirm(
        lead.registrationId
          ? `Cancel lead for “${lead.studentName || "this student"}”? The linked registration will also be cancelled.`
          : `Cancel lead for “${lead.studentName || "this student"}”? They will no longer be available for registration.`,
      )
    ) {
      return;
    }

    try {
      setStatusUpdatingId(lead._id);
      await axios.patch(
        `${API}/leads/${lead._id}/status`,
        { status: "cancelled" },
        { withCredentials: true },
      );
      setLeads((prev) =>
        prev.map((item) =>
          item._id === lead._id ? { ...item, status: "cancelled" } : item,
        ),
      );
      toast.success(
        lead.registrationId
          ? "Lead and linked registration cancelled"
          : "Lead cancelled",
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to cancel lead");
    } finally {
      setStatusUpdatingId("");
    }
  };

  const handleStartRegistration = async (lead) => {
    if (!lead?._id) return;
    if (lead.studentId || String(lead.status || "").toLowerCase() === "admitted") {
      toast.info("This lead is already converted. Open the student record from Students.");
      return;
    }
    if (String(lead.status || "").toLowerCase() === "cancelled") {
      toast.error("Cancelled leads cannot be registered");
      return;
    }

    // Mark as processing so the pipeline reflects registration in progress
    if (String(lead.status || "").toLowerCase() === "active") {
      try {
        await axios.patch(
          `${API}/leads/${lead._id}/status`,
          { status: "processing" },
          { withCredentials: true },
        );
        setLeads((prev) =>
          prev.map((item) =>
            item._id === lead._id ? { ...item, status: "processing" } : item,
          ),
        );
      } catch {
        /* still open registration form */
      }
    }

    // Middle layer: Lead → Registration → (exam if needed) → Admit
    if (lead.registrationId) {
      navigate(`${basePath}/registrations?registrationId=${lead.registrationId}`);
      return;
    }
    navigate(`${basePath}/registrations?leadId=${lead._id}`);
  };

  const handleFeedbackInputChange = (leadId, value) => {
    setFeedbackDrafts((prev) => ({ ...prev, [leadId]: value }));
  };

  const handleStartAssigneeEdit = (lead) => {
    const currentValue = `${lead.assignedTo?.userType || ""}:${lead.assignedTo?.userId || ""}`;
    setEditingAssigneeLeadId(lead._id);
    setAssigneeDrafts((prev) => ({
      ...prev,
      [lead._id]: currentValue,
    }));
  };

  const handleAssigneeDraftChange = (leadId, value) => {
    setAssigneeDrafts((prev) => ({
      ...prev,
      [leadId]: value,
    }));
  };

  const handleSaveAssignee = async (leadId) => {
    const selected = assigneeDrafts[leadId] || "";
    const [assignedToUserType, assignedToUserId] = selected.split(":");

    if (!assignedToUserType || !assignedToUserId) {
      toast.error("Please select assignee");
      return;
    }

    try {
      setAssigneeUpdatingId(leadId);
      const { data } = await axios.patch(
        `${API}/leads/${leadId}/assignee`,
        { assignedToUserType, assignedToUserId },
        { withCredentials: true },
      );

      setLeads((prev) =>
        prev.map((lead) => (lead._id === leadId ? data.data : lead)),
      );
      setEditingAssigneeLeadId("");
      toast.success("Assigned staff updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update assignee");
    } finally {
      setAssigneeUpdatingId("");
    }
  };

  const handleAddFeedback = async (leadId) => {
    const comment = (feedbackDrafts[leadId] || "").trim();
    if (!comment) {
      toast.error("Please enter feedback before adding");
      return;
    }

    try {
      setFeedbackSavingId(leadId);
      const { data } = await axios.post(
        `${API}/leads/${leadId}/followups`,
        { comment },
        { withCredentials: true },
      );

      setLeads((prev) =>
        prev.map((lead) => (lead._id === leadId ? data.data : lead)),
      );

      setFeedbackDrafts((prev) => ({ ...prev, [leadId]: "" }));
      toast.success(
        data?.message ||
          (String(data?.data?.status || "").toLowerCase() === "processing"
            ? "Feedback added. Lead moved to Processing."
            : "Feedback added"),
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add feedback");
    } finally {
      setFeedbackSavingId("");
    }
  };

  const handleOpenHistory = async (lead) => {
    try {
      setHistoryModal({
        open: true,
        leadId: lead._id,
        studentName: lead.studentName,
        loading: true,
        followUps: [],
      });

      const { data } = await axios.get(`${API}/leads/${lead._id}/followups`, {
        withCredentials: true,
      });

      setHistoryModal((prev) => ({
        ...prev,
        loading: false,
        followUps: data.data?.followUps || [],
      }));
    } catch (error) {
      setHistoryModal((prev) => ({ ...prev, loading: false, followUps: [] }));
      toast.error(error.response?.data?.message || "Failed to load feedback history");
    }
  };

  return (
    <div className="p-4 md:p-6 min-h-screen bg-[rgb(var(--bg))]">
      {isMobile && (
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl mb-4 bg-[rgb(var(--surface))] border border-[rgb(var(--border))] text-sm font-bold text-[rgb(var(--text))] active:scale-95 transition-transform"
        >
          <FaArrowLeft size={13} /> Back
        </button>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[rgb(var(--text))]">
            Lead Management
          </h1>
          <p className="text-sm text-[rgb(var(--text-muted))] mt-0.5">
            {isStaffLogin
              ? "View assigned leads, add comments, and move them toward registration."
              : "Capture enquiries, assign owners, follow up, then register and admit."}
          </p>
          <p className="mt-2 text-[11px] text-[rgb(var(--text-muted))]">
            Status flow: Active → comment moves to Processing → Admit sets
            Admitted. Cancel closes the lead.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          {["school_admin", "staff_admin", "super_admin"].includes(
            user?.role,
          ) && (
            <button
              type="button"
              onClick={() => setBuilderOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 py-2.5 text-sm font-semibold text-[rgb(var(--text))]"
              title="Add, hide or reorder lead form fields"
            >
              <FaSlidersH size={12} /> Customize Form
            </button>
          )}
          {!isStaffLogin && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 bg-[rgb(var(--primary))] text-white px-4 py-2.5 rounded-xl shadow text-sm font-medium hover:opacity-90 transition"
            >
              <FaPlus size={12} /> Add New Lead
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <button
          type="button"
          onClick={() => setFilters((prev) => ({ ...prev, status: "" }))}
          className={`rounded-2xl border p-4 text-left transition ${
            !filters.status
              ? "border-[rgb(var(--primary))] bg-[rgba(var(--primary),0.06)]"
              : "border-[rgb(var(--border))] bg-[rgb(var(--surface))]"
          }`}
        >
          <p className="text-[11px] uppercase tracking-wide text-[rgb(var(--text-muted))]">
            Total
          </p>
          <p className="mt-1 text-2xl font-bold text-[rgb(var(--text))]">
            {leads.length}
          </p>
        </button>
        {leadStatusOptions.map((status) => {
          const meta = leadStatusMeta[status];
          const active = filters.status === status;
          return (
            <button
              key={status}
              type="button"
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  status: prev.status === status ? "" : status,
                }))
              }
              className={`rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-[rgb(var(--primary))] bg-[rgba(var(--primary),0.06)]"
                  : "border-[rgb(var(--border))] bg-[rgb(var(--surface))]"
              }`}
              title={meta.hint}
            >
              <p className="text-[11px] uppercase tracking-wide text-[rgb(var(--text-muted))]">
                {meta.label}
              </p>
              <p className="mt-1 text-2xl font-bold text-[rgb(var(--text))]">
                {statusCounts[status] || 0}
              </p>
            </button>
          );
        })}
      </div>

      <div className="mb-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[rgb(var(--text))]">
            Filter leads
          </h2>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-[rgb(var(--primary))]"
            >
              Clear filters
            </button>
          ) : null}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-[rgb(var(--text-muted))]">
            Name
            <input
              type="search"
              value={filters.name}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Student or parent name"
              className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2.5 text-sm text-[rgb(var(--text))]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-[rgb(var(--text-muted))]">
            Status
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, status: event.target.value }))
              }
              className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2.5 text-sm text-[rgb(var(--text))]"
            >
              <option value="">All statuses</option>
              {leadStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {formatLeadStatus(status)}
                </option>
              ))}
            </select>
          </label>
          {!isStaffLogin ? (
            <label className="flex flex-col gap-1.5 text-xs font-medium text-[rgb(var(--text-muted))]">
              Assign to
              <select
                value={filters.assigneeKey}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    assigneeKey: event.target.value,
                  }))
                }
                className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2.5 text-sm text-[rgb(var(--text))]"
              >
                <option value="">All assignees</option>
                {assigneeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </div>

      <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[rgb(var(--border))] flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-[rgb(var(--text))]">Leads</h2>
          <p className="text-xs text-[rgb(var(--text-muted))]">
            Showing {filteredLeads.length}
            {hasActiveFilters ? ` of ${leads.length}` : ""}
          </p>
        </div>

        {loading ? (
          <p className="px-5 py-10 text-center text-[rgb(var(--text-muted))]">Loading leads...</p>
        ) : leads.length === 0 ? (
          <p className="px-5 py-10 text-center text-[rgb(var(--text-muted))]">
            {isStaffLogin
              ? "No leads are assigned to your account yet."
              : "No admission leads have been added yet."}
          </p>
        ) : filteredLeads.length === 0 ? (
          <p className="px-5 py-10 text-center text-[rgb(var(--text-muted))]">
            No leads match the selected filters.
          </p>
        ) : (
          <div className="divide-y divide-[rgb(var(--border))]">
            {filteredLeads.map((lead) => {
              const currentStatus = statusOf(lead);
              const meta = leadStatusMeta[currentStatus] || leadStatusMeta.active;
              const isAdmitted =
                Boolean(lead.studentId) || currentStatus === "admitted";
              const isCancelled = currentStatus === "cancelled";
              const canComment = !isAdmitted && !isCancelled;
              const canCancel =
                !isStaffLogin &&
                !isAdmitted &&
                !isCancelled;

              const sourceFull =
                lead.source === "website"
                  ? "Website"
                  : lead.createdByName || "Office";
              const sourceInitials = getInitials(
                sourceFull,
                lead.source === "website" ? "WW" : "OF",
              );
              const assigneeFull = lead.assignedTo?.name
                ? `${lead.assignedTo.name}${
                    lead.assignedTo.roleLabel
                      ? ` (${lead.assignedTo.roleLabel})`
                      : ""
                  }`
                : "Unassigned";
              const assigneeInitials = getInitials(
                lead.assignedTo?.name || "",
                "NA",
              );

              return (
                <div key={lead._id} className="px-5 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-semibold text-[rgb(var(--text))] sm:text-lg">
                          {lead.studentName}
                        </p>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.className}`}
                          title={meta.hint}
                        >
                          {meta.label}
                        </span>
                        {isAdmitted ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                            Student linked
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[rgb(var(--text-muted))]">
                        <span>
                          <span className="font-medium text-[rgb(var(--text))]">
                            Parent:
                          </span>{" "}
                          {lead.parentName || "—"}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="font-medium text-[rgb(var(--text))]">
                            Source:
                          </span>
                          <span
                            title={sourceFull}
                            className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[rgb(var(--surface))] border border-[rgb(var(--border))] px-1.5 text-[10px] font-bold tracking-wide text-[rgb(var(--text))]"
                          >
                            {sourceInitials}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="font-medium text-[rgb(var(--text))]">
                            Assign:
                          </span>
                          {!isStaffLogin &&
                          editingAssigneeLeadId === lead._id ? (
                            <span className="inline-flex flex-wrap items-center gap-1.5">
                              <select
                                value={assigneeDrafts[lead._id] || ""}
                                onChange={(event) =>
                                  handleAssigneeDraftChange(
                                    lead._id,
                                    event.target.value,
                                  )
                                }
                                className="max-w-[160px] rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-2 py-1 text-xs text-[rgb(var(--text))]"
                              >
                                <option value="">Select</option>
                                {assigneeOptions.map((option) => (
                                  <option
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <IconAction
                                title="Save assignee"
                                onClick={() => handleSaveAssignee(lead._id)}
                                disabled={assigneeUpdatingId === lead._id}
                                className="border-transparent bg-[rgb(var(--primary))] text-white"
                              >
                                <FaCheck size={11} />
                              </IconAction>
                              <IconAction
                                title="Cancel"
                                onClick={() => setEditingAssigneeLeadId("")}
                                className="border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--text-muted))]"
                              >
                                <FaTimes size={11} />
                              </IconAction>
                            </span>
                          ) : (
                            <button
                              type="button"
                              title={assigneeFull}
                              aria-label={assigneeFull}
                              onClick={
                                isStaffLogin
                                  ? undefined
                                  : () => handleStartAssigneeEdit(lead)
                              }
                              className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full border px-1.5 text-[10px] font-bold tracking-wide ${
                                lead.assignedTo?.name
                                  ? "border-[rgba(var(--primary),0.35)] bg-[rgba(var(--primary),0.08)] text-[rgb(var(--primary))]"
                                  : "border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--text-muted))]"
                              } ${isStaffLogin ? "cursor-default" : "hover:opacity-90"}`}
                            >
                              {assigneeInitials}
                            </button>
                          )}
                        </span>
                        <span>
                          <span className="font-medium text-[rgb(var(--text))]">
                            Class:
                          </span>{" "}
                          {[lead.className, lead.stream]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <FaPhone size={11} /> {lead.parentMobile || "—"}
                        </span>
                        {lead.parentEmail ? (
                          <span
                            className="inline-flex items-center gap-1"
                            title={lead.parentEmail}
                          >
                            <FaEnvelope size={11} />
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      {isAdmitted ? (
                        <IconAction
                          title="View student"
                          onClick={() =>
                            lead.studentId
                              ? navigate(
                                  `${basePath}/student-view/${lead.studentId}`,
                                )
                              : toast.info(
                                  "Student linked — open from Students list",
                                )
                          }
                          className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        >
                          <FaUserGraduate size={13} />
                        </IconAction>
                      ) : !isCancelled ? (
                        <IconAction
                          title={
                            lead.registrationId
                              ? "Open registration"
                              : "Register / Admit"
                          }
                          onClick={() => handleStartRegistration(lead)}
                          className="border-transparent bg-[rgb(var(--primary))] text-white hover:opacity-90"
                        >
                          <FaUserPlus size={13} />
                        </IconAction>
                      ) : null}

                      <IconAction
                        title="View lead"
                        onClick={() => openViewModal(lead)}
                        className="border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--text))] hover:bg-[rgb(var(--bg))]"
                      >
                        <FaEye size={13} />
                      </IconAction>

                      <IconAction
                        title="Comment history"
                        onClick={() => handleOpenHistory(lead)}
                        className="border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--text))] hover:bg-[rgb(var(--bg))]"
                      >
                        <FaCommentDots size={13} />
                      </IconAction>

                      {!isStaffLogin &&
                      !isAdmitted &&
                      !isCancelled &&
                      currentStatus !== "processing" ? (
                        <IconAction
                          title="Edit lead"
                          onClick={() => openEditModal(lead)}
                          className="border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--text))] hover:bg-[rgb(var(--bg))]"
                        >
                          <FaEdit size={13} />
                        </IconAction>
                      ) : null}

                      {canCancel ? (
                        <IconAction
                          title="Cancel lead"
                          onClick={() => handleCancelLead(lead)}
                          disabled={statusUpdatingId === lead._id}
                          className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                        >
                          <FaBan size={13} />
                        </IconAction>
                      ) : null}
                    </div>
                  </div>

                  {canComment ? (
                    <div className="mt-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">
                            Add comment
                          </p>
                          <p className="text-[11px] text-[rgb(var(--text-muted))]">
                            {currentStatus === "active"
                              ? "Saving a comment moves this lead to Processing."
                              : "Log follow-up notes for this lead."}
                          </p>
                        </div>
                        <p className="text-[11px] text-[rgb(var(--text-muted))]">
                          {lead.followUps?.length || 0} follow-up
                          {(lead.followUps?.length || 0) === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <textarea
                          value={feedbackDrafts[lead._id] || ""}
                          onChange={(event) =>
                            handleFeedbackInputChange(
                              lead._id,
                              event.target.value,
                            )
                          }
                          placeholder="Write follow-up comment…"
                          rows={2}
                          className="w-full resize-none rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddFeedback(lead._id)}
                          disabled={feedbackSavingId === lead._id}
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[rgb(var(--primary))] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                        >
                          <FaCommentDots size={12} />
                          {feedbackSavingId === lead._id ? "Saving…" : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!isStaffLogin && showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[94vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[rgb(var(--border))] shrink-0">
              <div>
                <h2 className="text-lg font-semibold">
                  {editingLeadId ? "Edit Lead" : "Add New Lead"}
                </h2>
                <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">
                  {editingLeadId
                    ? "Update enquiry details and assignee for this lead."
                    : "Capture enquiry details and assign the lead to an admin group member."}
                </p>
              </div>
              <button
                onClick={resetForm}
                className="text-[rgb(var(--text-muted))] hover:text-red-400 transition"
              >
                <FaTimes size={18} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
              <ConfigurableFormFields
                steps={formSteps}
                values={form}
                customValues={customValues}
                onChangeBuiltin={(key, value) =>
                  setForm((prev) => ({ ...prev, [key]: value }))
                }
                onChangeCustom={(key, value) =>
                  setCustomValues((prev) => ({ ...prev, [key]: value }))
                }
                renderBuiltin={{
                  classId: (field) => (
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      <span>
                        {field.label}
                        {field.required ? " *" : ""}
                      </span>
                      <select
                        name="classId"
                        value={form.classId}
                        onChange={handleChange}
                        className="px-3 py-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))]"
                      >
                        <option value="">Select class</option>
                        {classes.map((cls) => (
                          <option key={cls._id} value={cls._id}>
                            {cls.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ),
                  streamId: (field) => (
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      <span>
                        {field.label}
                        {field.required ? " *" : ""}
                      </span>
                      <select
                        name="streamId"
                        value={form.streamId}
                        onChange={handleChange}
                        className="px-3 py-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))]"
                      >
                        <option value="">
                          {form.classId
                            ? "Select stream (optional)"
                            : "Select class first"}
                        </option>
                        {streamsForClass(form.classId).map((item) => (
                          <option key={item._id} value={item._id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ),
                  assigneeKey: (field) => (
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      <span>
                        {field.label}
                        {field.required ? " *" : ""}
                      </span>
                      <select
                        name="assigneeKey"
                        value={form.assigneeKey}
                        onChange={handleChange}
                        className="px-3 py-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))]"
                      >
                        <option value="">Select assignee</option>
                        {assigneeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ),
                }}
              />
            </div>

            <div className="px-6 py-4 border-t border-[rgb(var(--border))] flex justify-end gap-3 shrink-0">
              <button
                onClick={resetForm}
                className="px-4 py-2.5 rounded-xl border border-[rgb(var(--border))] text-sm font-medium"
              >
                Close
              </button>
              <button
                onClick={handleSaveLead}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl bg-[rgb(var(--primary))] text-white text-sm font-medium disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingLeadId
                    ? "Update Lead"
                    : "Create Lead"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewModal.open && viewModal.lead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[rgb(var(--border))]">
              <div>
                <h3 className="text-lg font-semibold">Lead Details</h3>
                <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">
                  {viewModal.lead.leadNumber
                    ? `Lead No. ${viewModal.lead.leadNumber}`
                    : "Enquiry details"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewModal({ open: false, lead: null })}
                className="text-[rgb(var(--text-muted))] hover:text-red-400 transition"
              >
                <FaTimes size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  [
                    "Status",
                    formatLeadStatus(
                      String(viewModal.lead.status || "active").toLowerCase(),
                    ),
                  ],
                  [
                    "Source",
                    viewModal.lead.source === "website"
                      ? "Website"
                      : viewModal.lead.createdByName || "Office",
                  ],
                  [
                    "Created",
                    viewModal.lead.createdAt
                      ? new Date(viewModal.lead.createdAt).toLocaleDateString()
                      : "",
                  ],
                  [
                    "Follow-ups",
                    String(viewModal.lead.followUps?.length || 0),
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-[rgb(var(--border))] px-3 py-2"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">
                      {label}
                    </p>
                    <p className="mt-0.5 font-medium text-[rgb(var(--text))]">
                      {value || "—"}
                    </p>
                  </div>
                ))}
              </div>

              {formSteps.map((step) => {
                const fields = (step.fields || []).filter(
                  (field) => field && field.visible !== false,
                );
                if (!fields.length) return null;
                return (
                  <div key={step.key}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">
                      {step.title || "Details"}
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {fields.map((field) => {
                        const value = viewFieldValue(field);
                        const wide = ["textarea", "radio", "checkbox"].includes(
                          field.type,
                        );
                        return (
                          <div
                            key={field.key}
                            className={`rounded-lg border border-[rgb(var(--border))] px-3 py-2 ${
                              wide ? "sm:col-span-2" : ""
                            }`}
                          >
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">
                              {field.label || field.key}
                            </p>
                            <p
                              className={`mt-0.5 font-medium text-[rgb(var(--text))] ${
                                wide ? "whitespace-pre-wrap" : ""
                              }`}
                            >
                              {value === "" ? "—" : value}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-[rgb(var(--border))] px-6 py-4">
              {!isStaffLogin &&
                !viewModal.lead.studentId &&
                String(viewModal.lead.status || "").toLowerCase() !==
                  "admitted" &&
                String(viewModal.lead.status || "").toLowerCase() !==
                  "cancelled" && (
                  <button
                    type="button"
                    onClick={() => {
                      const lead = viewModal.lead;
                      setViewModal({ open: false, lead: null });
                      openEditModal(lead);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] px-4 py-2 text-sm font-medium"
                  >
                    <FaEdit size={12} /> Edit
                  </button>
                )}
              <button
                type="button"
                onClick={() => setViewModal({ open: false, lead: null })}
                className="rounded-xl bg-[rgb(var(--primary))] px-4 py-2 text-sm font-medium text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {historyModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[rgb(var(--border))]">
              <div>
                <h3 className="text-lg font-semibold">Follow-up Feedback</h3>
                <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">
                  {historyModal.studentName}
                </p>
              </div>
              <button
                onClick={() =>
                  setHistoryModal({
                    open: false,
                    leadId: "",
                    studentName: "",
                    loading: false,
                    followUps: [],
                  })
                }
                className="text-[rgb(var(--text-muted))] hover:text-red-400 transition"
              >
                <FaTimes size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {historyModal.loading ? (
                <p className="text-sm text-[rgb(var(--text-muted))]">Loading feedback history...</p>
              ) : historyModal.followUps.length === 0 ? (
                <p className="text-sm text-[rgb(var(--text-muted))]">No follow-up feedback yet.</p>
              ) : (
                <div className="space-y-3">
                  {historyModal.followUps.map((entry, index) => (
                    <div key={`${entry.createdAt}-${index}`} className="rounded-xl border border-[rgb(var(--border))] p-4">
                      <p className="text-sm text-[rgb(var(--text))]">{entry.comment}</p>
                      <div className="mt-2 text-xs text-[rgb(var(--text-muted))] flex flex-wrap gap-3">
                        <span>
                          By: {entry.addedBy?.name || "Unknown"}
                          {entry.addedBy?.role ? ` (${entry.addedBy.role})` : ""}
                        </span>
                        <span>
                          Date: {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "-"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {builderOpen && (
        <AdmissionFormBuilder
          apiPath="/lead-form"
          mergeSteps={mergeLeadSteps}
          fieldTypes={LEAD_FIELD_TYPES}
          lockedFieldKeys={LEAD_LOCKED_FIELD_KEYS}
          title="Customize Lead Form"
          description="Add, hide, rename, or delete fields on the Add Lead form. Changes apply to your school only."
          lockedDeleteHint="Required to create a lead"
          reviewStepKey=""
          allowCustomSteps={false}
          onClose={() => setBuilderOpen(false)}
          onSaved={(steps) => {
            const merged = mergeLeadSteps(steps);
            setFormSteps(merged);
            setCustomValues(emptyCustomValues(merged));
          }}
        />
      )}
    </div>
  );
};

export default LeadManagement;