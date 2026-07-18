import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import {
  FaArrowLeft,
  FaClipboardList,
  FaCommentDots,
  FaEnvelope,
  FaEye,
  FaPhone,
  FaPlus,
  FaSchool,
  FaTimes,
  FaTrash,
  FaUserTie,
} from "react-icons/fa";

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
  assigneeKey: "",
};

const LeadManagement = () => {
  const { user } = useAuth();
  const isMobile = window.innerWidth <= 768;
  const isStaffLogin = user?.role === "staff_admin";

  const [leads, setLeads] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
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

  const fetchPageData = async () => {
    try {
      setLoading(true);
      const requestList = [axios.get(`${API}/leads`, { withCredentials: true })];
      if (!isStaffLogin) {
        requestList.push(
          axios.get(`${API}/leads/assignable-users`, { withCredentials: true }),
        );
      }

      const [leadRes, assigneeRes] = await Promise.all(requestList);

      setLeads(leadRes.data.data || []);
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

  const assigneeOptions = useMemo(
    () =>
      assignees.map((assignee) => ({
        value: `${assignee.userType}:${assignee.userId}`,
        label: `${assignee.name} (${assignee.roleLabel})`,
      })),
    [assignees],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setShowModal(false);
  };

  const validate = () => {
    if (!form.studentName.trim()) return "Student name is required";
    if (!form.parentName.trim()) return "Parent name is required";
    if (!form.parentMobile.trim()) return "Parent mobile number is required";
    if (!/^\d{10}$/.test(form.parentMobile.trim())) {
      return "Parent mobile number must be 10 digits";
    }
    if (form.parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.parentEmail)) {
      return "Enter a valid parent email";
    }
    if (!form.assigneeKey) return "Please assign the lead";
    return null;
  };

  const handleCreateLead = async () => {
    const validationError = validate();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const [assignedToUserType, assignedToUserId] = form.assigneeKey.split(":");

    try {
      setSaving(true);
      const { data } = await axios.post(
        `${API}/leads`,
        {
          studentName: form.studentName.trim(),
          parentName: form.parentName.trim(),
          parentMobile: form.parentMobile.trim(),
          parentEmail: form.parentEmail.trim(),
          previousSchoolName: form.previousSchoolName.trim(),
          assignedToUserType,
          assignedToUserId,
        },
        { withCredentials: true },
      );

      toast.success(data.message || "Lead created successfully");
      await fetchPageData();
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create lead");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLead = async (leadId) => {
    try {
      await axios.delete(`${API}/leads/${leadId}`, { withCredentials: true });
      toast.success("Lead deleted successfully");
      setLeads((prev) => prev.filter((lead) => lead._id !== leadId));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete lead");
    }
  };

  const handleStatusChange = async (leadId, nextStatus) => {
    const normalized = String(nextStatus || "").toLowerCase();
    if (!leadStatusOptions.includes(normalized)) return;

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

        {!isStaffLogin && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-[rgb(var(--primary))] text-white px-4 py-2.5 rounded-xl shadow text-sm font-medium hover:opacity-90 transition self-start sm:self-auto"
          >
            <FaPlus size={12} /> Add New Lead
          </button>
        )}
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
                    <p className="text-lg font-semibold text-[rgb(var(--text))]">{lead.studentName}</p>
                    <p className="text-sm text-[rgb(var(--text-muted))]">Parent: {lead.parentName}</p>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-[rgb(var(--text-muted))]">
                    <span className="flex items-center gap-1"><FaPhone size={11} /> {lead.parentMobile}</span>
                    {lead.parentEmail && (
                      <span className="flex items-center gap-1"><FaEnvelope size={11} /> {lead.parentEmail}</span>
                    )}
                    {lead.previousSchoolName && (
                      <span className="flex items-center gap-1"><FaSchool size={11} /> {lead.previousSchoolName}</span>
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
                        <FaEye size={11} /> View
                      </button>
                    </div>
                  </div>

                  {!isStaffLogin && (
                    <button
                      onClick={() => handleDeleteLead(lead._id)}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition text-sm font-medium"
                    >
                      <FaTrash size={12} /> Delete
                    </button>
                  )}
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
                <h2 className="text-lg font-semibold">Add New Lead</h2>
                <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">
                  Capture enquiry details and assign the lead to an admin group member.
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
              <label className="flex flex-col gap-2 text-sm font-medium">
                Student Name
                <input
                  name="studentName"
                  value={form.studentName}
                  onChange={handleChange}
                  className="px-3 py-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))]"
                  placeholder="Enter student name"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium">
                Parent Name
                <input
                  name="parentName"
                  value={form.parentName}
                  onChange={handleChange}
                  className="px-3 py-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))]"
                  placeholder="Enter parent name"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium">
                Parent Mobile Number
                <input
                  name="parentMobile"
                  value={form.parentMobile}
                  onChange={handleChange}
                  className="px-3 py-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))]"
                  placeholder="10-digit mobile number"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium">
                Parent Email ID
                <input
                  name="parentEmail"
                  value={form.parentEmail}
                  onChange={handleChange}
                  className="px-3 py-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))]"
                  placeholder="Enter parent email"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium">
                Previous School Name
                <input
                  name="previousSchoolName"
                  value={form.previousSchoolName}
                  onChange={handleChange}
                  className="px-3 py-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))]"
                  placeholder="Enter previous school"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium">
                Assign Lead To
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
            </div>

            <div className="px-6 py-4 border-t border-[rgb(var(--border))] flex justify-end gap-3 shrink-0">
              <button
                onClick={resetForm}
                className="px-4 py-2.5 rounded-xl border border-[rgb(var(--border))] text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateLead}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl bg-[rgb(var(--primary))] text-white text-sm font-medium disabled:opacity-60"
              >
                {saving ? "Saving..." : "Create Lead"}
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
    </div>
  );
};

export default LeadManagement;