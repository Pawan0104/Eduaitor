import { useEffect, useState } from "react";
import axios from "axios";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

const API = import.meta.env.VITE_API_URL;

const SchoolSubscription = () => {
  const emptyForm = {
    name: "",
    slug: "",
    price: "",
    currency: "INR",
    billing_cycle: "monthly",
    roles: [],
    status: "Active",
  };

  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  const [plans, setPlans] = useState([]);
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState(emptyForm);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [dirty, setDirty] = useState(false);

  const [confirmModal, setConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState("");

  /* ---------------- FETCH DATA ---------------- */

  const fetchPlans = async () => {
    try {
      const res = await axios.get(`${API}/subscriptions`);
      setPlans(res.data.data);
    } catch {
      toast.error("Failed to fetch subscriptions");
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await axios.get(`${API}/roles`);
      setRoles(res.data.data);
    } catch {
      toast.error("Failed to fetch roles");
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchRoles();
  }, []);

  /* ---------------- FORM CHANGE ---------------- */

  const handleChange = (e) => {
    setDirty(true);

    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  /* ---------------- ROLE TOGGLE ---------------- */

  const toggleRole = (roleId) => {
    setDirty(true);

    if (form.roles.includes(roleId)) {
      setForm({
        ...form,
        roles: form.roles.filter((r) => r !== roleId),
      });
    } else {
      setForm({
        ...form,
        roles: [...form.roles, roleId],
      });
    }
  };

  /* ---------------- SAVE ---------------- */

  const handleSave = () => {
    if (!form.name || !form.slug) {
      toast.error("Name and slug required");
      return;
    }

    setConfirmMessage(
      editingId
        ? "Confirm update subscription plan?"
        : "Create this subscription plan?",
    );

    setConfirmAction(() => async () => {
      try {
        if (editingId) {
          await axios.put(`${API}/subscriptions/${editingId}`, form);
          toast.success("Subscription updated");
        } else {
          await axios.post(`${API}/subscriptions`, form);
          toast.success("Subscription created");
        }

        setShowModal(false);
        setEditingId(null);
        setForm(emptyForm);
        setDirty(false);
        fetchPlans();
      } catch {
        toast.error("Error saving subscription");
      }
    });

    setConfirmModal(true);
  };

  /* ---------------- EDIT ---------------- */

  const editPlan = (plan) => {
    setForm({
      ...plan,
      roles: plan.roles.map((r) => r._id),
    });

    setEditingId(plan._id);
    setShowModal(true);
    setDirty(false);
  };

  /* ---------------- DELETE ---------------- */

  const deletePlan = (id) => {
    setConfirmMessage(
      "Are you sure you want to delete this subscription plan?",
    );

    setConfirmAction(() => async () => {
      try {
        await axios.delete(`${API}/subscriptions/${id}`);
        toast.success("Subscription deleted");

        fetchPlans();
      } catch {
        toast.error("Delete failed");
      }
    });

    setConfirmModal(true);
  };

  /* ---------------- CLOSE MODAL ---------------- */

  const closeModal = () => {
    if (dirty) {
      setConfirmMessage("Discard unsaved changes?");

      setConfirmAction(() => () => {
        setShowModal(false);
        setEditingId(null);
        setForm(emptyForm);
        setDirty(false);
      });

      setConfirmModal(true);
    } else {
      setShowModal(false);
      setForm(emptyForm);
    }
  };

  return (
    <div className="p-8 min-h-screen  text-[rgb(var(--text))]">
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
      {/* HEADER */}

      <div className="flex justify-between items-center mb-8 ">
        <h1 className="text-3xl font-bold ">School Subscription Plans</h1>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[rgb(var(--primary))] text-[rgb(var(--text))] px-5 py-2 rounded-lg"
        >
          <FaPlus />
          Add Plan
        </button>
      </div>

      {/* CARDS */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan._id}
            className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-xl shadow-md p-6 hover:shadow-xl transition"
          >
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold">{plan.name}</h2>

              <span
                className={`text-xs px-3 py-1 rounded-full
                ${
                  plan.status === "Active"
                    ? "bg-green-100 text-green-600"
                    : "bg-red-100 text-red-500"
                }
              `}
              >
                {plan.status}
              </span>
            </div>

            <p className="text-sm  mb-4">{plan.slug}</p>

            <div className="mb-4">
              <p className="text-3xl font-bold text-[rgb(var(--primary))]">
                {plan.currency} {plan.price}
              </p>

              <span className="text-xs bg-[rgb(var(--primary))] text-[rgb(var(--text))] px-2 py-1 rounded">
                {plan.billing_cycle}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {plan.roles?.map((role) => (
                <span
                  key={role._id}
                  className="text-xs bg-[rgb(var(--surface))] text-[rgb(var(--primary))] border px-2 py-1 rounded"
                >
                  {role.name}
                </span>
              ))}
            </div>

            <div className="flex justify-end gap-4">
              <button onClick={() => editPlan(plan)} className="text-blue-600">
                <FaEdit />
              </button>

              <button
                onClick={() => deletePlan(plan._id)}
                className="text-red-600"
              >
                <FaTrash />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* FORM MODAL */}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-semibold mb-6">
              {editingId ? "Edit Plan" : "Create Plan"}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm">Plan Name</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="border rounded-lg px-3 py-2 w-full"
                />
              </div>

              <div>
                <label className="text-sm">Slug</label>
                <input
                  name="slug"
                  value={form.slug}
                  onChange={handleChange}
                  className="border rounded-lg px-3 py-2 w-full"
                />
              </div>

              <div>
                <label className="text-sm">Price</label>
                <input
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  className="border rounded-lg px-3 py-2 w-full"
                />
              </div>

              <div>
                <label className="text-sm">Currency</label>
                <select
                  name="currency"
                  value={form.currency}
                  onChange={handleChange}
                  className="border rounded-lg px-3 py-2 w-full text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
                >
                  <option>INR</option>
                  <option>USD</option>
                </select>
              </div>

              <div>
                <label className="text-sm">Billing Cycle</label>
                <select
                  name="billing_cycle"
                  value={form.billing_cycle}
                  onChange={handleChange}
                  className="border rounded-lg px-3 py-2 w-full text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label className="text-sm">Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="border rounded-lg px-3 py-2 w-full text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
            </div>

            {/* ROLES */}

            <div className="mt-5">
              <label className="text-sm font-medium">Allowed Roles</label>

              <div className="grid grid-cols-2 gap-2 mt-2">
                {roles.map((role) => (
                  <label key={role._id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.roles.includes(role._id)}
                      onChange={() => toggleRole(role._id)}
                      className="bg-[rgb(var(--surface))]"
                    />

                    {role.name}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeModal}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={handleSave}
                className="px-5 py-2 bg-[rgb(var(--primary))] text-[rgb(var(--text))] rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION POPUP */}

      {confirmModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-lg p-6 w-100">
            <p className="text-lg mb-6">{confirmMessage}</p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmModal(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  confirmAction();
                  setConfirmModal(false);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolSubscription;
