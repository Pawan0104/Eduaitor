import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FaArrowLeft,
  FaBan,
  FaClipboardList,
  FaCommentDots,
  FaEdit,
  FaEnvelope,
  FaEye,
  FaPhone,
  FaPlus,
  FaSchool,
  FaSlidersH,
  FaTimes,
  FaUserGraduate,
  FaUserTie,
} from "react-icons/fa";
import AdmissionFormBuilder from "../components/AdmissionFormBuilder";
import ConfigurableFormFields, {
  buildCustomFieldsPayload,
  emptyCustomValues,
  hydrateCustomValues,
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

  const streamsForClass = (classId) => {
    const selected = String(classId || "");
    return (streams || []).filter((item) => {
      const linked = (item.classIds || []).map(String);
      if (!linked.length) return true;
      if (!selected) return true;
      return linked.includes(selected);
    });
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
    if (
      lead.registrationId ||
      String(lead.status || "").toLowerCase() === "processing"
    ) {
      toast.error("Cancel from Registration instead — this lead is already registered");
      return;
    }
    if (String(lead.status || "").toLowerCase() === "cancelled") {
      toast.info("Lead is already cancelled");
      return;
    }
    if (
      !window.confirm(
        `Cancel lead for “${lead.studentName || "this student"}”? They will no longer be available for registration.`,
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
      toast.success("Lead cancelled");
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

  const handleStatusChange = async (leadId, nextStatus) => {
    const normalized = String(nextStatus || "").toLowerCase();
    if (!leadStatusOptions.includes(normalized)) return;

    if (normalized === "admitted") {
      const lead = leads.find((item) => item._id === leadId);
      if (!lead?.studentId) {
        toast.info(
          lead?.registrationId
            ? "Open Registration and use Admit after the candidate passes"
            : "Register this lead first, then Admit from Registration",
        );
        handleStartRegistration(lead || { _id: leadId });
        return;
      }
    }

    try {
      setStatusUpdatingId(leadId);
      await axios.patch(
        `${API}/leads/${leadId}/status`,
        { status: normalized },
        { withCredentials: true },
      );

      setLeads((prev) =>
        prev.map((lead) =>
          lead._id === leadId
            ? {
                ...lead,
                status: normalized,
              }
            : lead,
        ),
      );
      toast.success("Lead status updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update lead status");
    } finally {
      setStatusUpdatingId("");
    }
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
      toast.success("Feedback added");
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
              ? "View your assigned leads and log follow-up feedback."
              : "Track admission enquiries and assign them to your admin group."}
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-[rgba(var(--primary),0.1)] text-[rgb(var(--primary))] flex items-center justify-center">
              <FaClipboardList size={18} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[rgb(var(--text-muted))]">
                Total Leads
              </p>
              <p className="text-2xl font-bold text-[rgb(var(--text))]">{leads.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-[rgba(var(--primary),0.1)] text-[rgb(var(--primary))] flex items-center justify-center">
              <FaUserTie size={18} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[rgb(var(--text-muted))]">
                Assignable Admins
              </p>
              <p className="text-2xl font-bold text-[rgb(var(--text))]">{assignees.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-[rgba(var(--primary),0.1)] text-[rgb(var(--primary))] flex items-center justify-center">
              <FaSchool size={18} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[rgb(var(--text-muted))]">
                Recent Enquiries
              </p>
              <p className="text-sm font-semibold text-[rgb(var(--text))]">
                {leads[0]?.studentName || "No leads yet"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[rgb(var(--border))]">
          <h2 className="text-lg font-semibold text-[rgb(var(--text))]">Previous Leads</h2>
        </div>

        {loading ? (
          <p className="px-5 py-10 text-center text-[rgb(var(--text-muted))]">Loading leads...</p>
        ) : leads.length === 0 ? (
          <p className="px-5 py-10 text-center text-[rgb(var(--text-muted))]">
            {isStaffLogin
              ? "No leads are assigned to your account yet."
              : "No admission leads have been added yet."}
          </p>
        ) : (
          <div className="divide-y divide-[rgb(var(--border))]">
            {leads.map((lead) => (
              <div
                key={lead._id}
                className="px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
              >
                <div className="space-y-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-[rgb(var(--text))]">{lead.studentName}</p>
                      {(lead.studentId || String(lead.status || "").toLowerCase() === "admitted") && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          Converted
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[rgb(var(--text-muted))]">Parent: {lead.parentName}</p>
                    <p className="text-sm text-[rgb(var(--text-muted))]">
                      Source:{" "}
                      <span className="font-medium text-[rgb(var(--text))]">
                        {lead.source === "website"
                          ? "Website"
                          : lead.createdByName || "Office"}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-[rgb(var(--text-muted))]">
                    <span className="flex items-center gap-1"><FaPhone size={11} /> {lead.parentMobile}</span>
                    {lead.parentEmail && (
                      <span className="flex items-center gap-1"><FaEnvelope size={11} /> {lead.parentEmail}</span>
                    )}
                    {lead.previousSchoolName && (
                      <span className="flex items-center gap-1"><FaSchool size={11} /> {lead.previousSchoolName}</span>
                    )}
                    {(lead.className || lead.stream) && (
                      <span className="flex items-center gap-1">
                        <FaUserGraduate size={11} />
                        {[lead.className, lead.stream].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-5">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[rgb(var(--text-muted))]">Status</p>
                    <select
                      value={String(lead.status || "active").toLowerCase()}
                      onChange={(event) => handleStatusChange(lead._id, event.target.value)}
                      disabled={statusUpdatingId === lead._id}
                      className="mt-1 px-2.5 py-1.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--bg))] text-sm"
                    >
                      {leadStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {formatLeadStatus(status)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-[rgb(var(--text-muted))]">Assigned To</p>
                    {!isStaffLogin && editingAssigneeLeadId === lead._id ? (
                      <div className="mt-1 space-y-2">
                        <select
                          value={assigneeDrafts[lead._id] || ""}
                          onChange={(event) => handleAssigneeDraftChange(lead._id, event.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--bg))] text-sm"
                        >
                          <option value="">Select assignee</option>
                          {assigneeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveAssignee(lead._id)}
                            disabled={assigneeUpdatingId === lead._id}
                            className="px-2.5 py-1 text-xs rounded-lg bg-[rgb(var(--primary))] text-white"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingAssigneeLeadId("")}
                            className="px-2.5 py-1 text-xs rounded-lg border border-[rgb(var(--border))]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {isStaffLogin ? (
                          <p className="text-sm font-semibold text-[rgb(var(--text))]">
                            {lead.assignedTo?.name || "Unassigned"}
                          </p>
                        ) : (
                          <button
                            onClick={() => handleStartAssigneeEdit(lead)}
                            className="text-sm font-semibold text-[rgb(var(--text))] underline underline-offset-2 decoration-dotted"
                          >
                            {lead.assignedTo?.name || "Unassigned"}
                          </button>
                        )}
                        <p className="text-xs text-[rgb(var(--text-muted))]">{lead.assignedTo?.roleLabel || ""}</p>
                      </>
                    )}
                  </div>

                  <div className="min-w-[270px]">
                    <p className="text-xs uppercase tracking-wide text-[rgb(var(--text-muted))] mb-1">Feedback</p>
                    <div className="flex gap-2">
                      <textarea
                        value={feedbackDrafts[lead._id] || ""}
                        onChange={(event) => handleFeedbackInputChange(lead._id, event.target.value)}
                        placeholder="Add follow-up comment"
                        rows={2}
                        className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] text-sm resize-none"
                      />
                      <button
                        onClick={() => handleAddFeedback(lead._id)}
                        disabled={feedbackSavingId === lead._id}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-[rgb(var(--border))] text-sm font-medium hover:bg-[rgb(var(--bg))]"
                      >
                        <FaCommentDots size={12} /> Add
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-xs text-[rgb(var(--text-muted))]">
                        Follow-ups: {lead.followUps?.length || 0}
                      </p>
                      <button
                        onClick={() => handleOpenHistory(lead)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[rgb(var(--primary))]"
                      >
                        <FaEye size={11} /> History
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => openViewModal(lead)}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-[rgb(var(--border))] text-[rgb(var(--text))] hover:bg-[rgb(var(--bg))] transition text-sm font-medium"
                    >
                      <FaEye size={12} /> View
                    </button>
                    {lead.studentId || String(lead.status || "").toLowerCase() === "admitted" ? (
                      <button
                        type="button"
                        onClick={() =>
                          lead.studentId
                            ? navigate(`${basePath}/student-view/${lead.studentId}`)
                            : toast.info("Student linked — open from Students list")
                        }
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition text-sm font-medium"
                      >
                        <FaUserGraduate size={12} /> View Student
                      </button>
                    ) : String(lead.status || "").toLowerCase() !== "cancelled" ? (
                      <button
                        type="button"
                        onClick={() => handleStartRegistration(lead)}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[rgb(var(--primary))] text-white hover:opacity-90 transition text-sm font-medium"
                      >
                        <FaUserGraduate size={12} />{" "}
                        {lead.registrationId ? "Open Registration" : "Register"}
                      </button>
                    ) : null}

                    {!isStaffLogin &&
                      !lead.studentId &&
                      !lead.registrationId &&
                      String(lead.status || "").toLowerCase() !== "admitted" &&
                      String(lead.status || "").toLowerCase() !== "processing" &&
                      String(lead.status || "").toLowerCase() !== "cancelled" && (
                        <button
                          type="button"
                          onClick={() => handleCancelLead(lead)}
                          disabled={statusUpdatingId === lead._id}
                          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 transition text-sm font-medium disabled:opacity-60"
                        >
                          <FaBan size={12} /> Cancel
                        </button>
                      )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!isStaffLogin && showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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

            <div className="p-6 overflow-y-auto space-y-4 text-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  ["Student Name", viewModal.lead.studentName],
                  ["Parent Name", viewModal.lead.parentName],
                  ["Parent Mobile", viewModal.lead.parentMobile],
                  ["Parent Email", viewModal.lead.parentEmail],
                  ["Previous School", viewModal.lead.previousSchoolName],
                  ["Class", viewModal.lead.className],
                  ["Stream", viewModal.lead.stream],
                  [
                    "Status",
                    formatLeadStatus(
                      String(viewModal.lead.status || "active").toLowerCase(),
                    ),
                  ],
                  ["Assigned To", viewModal.lead.assignedTo?.name],
                  [
                    "Assignee Role",
                    viewModal.lead.assignedTo?.roleLabel,
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
                      ? new Date(viewModal.lead.createdAt).toLocaleString()
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

              {Array.isArray(viewModal.lead.customFields) &&
              viewModal.lead.customFields.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">
                    Additional fields
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {viewModal.lead.customFields.map((field) => (
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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