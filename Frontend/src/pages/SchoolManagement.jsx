import { useEffect, useState } from "react";
import axios from "axios";
import { FaPlus, FaEye, FaEdit, FaTrash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import {FaArrowLeft} from "react-icons/fa";

import { toast } from "react-toastify";

const API = import.meta.env.VITE_API_URL;

const SchoolManagement = () => {
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;
  const emptyForm = {
    school_name: "",
    slug: "",
    subscription_plan: "",
    start_date: "",
    end_date: "",
    address: "",
    contact_email: "",
    contact_phone: "",
    status: "Active",
  };

  const [schools, setSchools] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [form, setForm] = useState(emptyForm);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [dirty, setDirty] = useState(false);

  const [confirmModal, setConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);

  /* ---------------- FETCH DATA ---------------- */

  const fetchSchools = async () => {
    try {
      const res = await axios.get(`${API}/schools`);
      setSchools(res.data.data);
    } catch {
      toast.error("Failed to load schools");
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const res = await axios.get(`${API}/subscriptions`);
      setSubscriptions(res.data.data);
    } catch {
      toast.error("Failed to load subscriptions");
    }
  };

  useEffect(() => {
    fetchSchools();
    fetchSubscriptions();
  }, []);

  /* ---------------- FORM CHANGE ---------------- */

  const handleChange = (e) => {
    setDirty(true);

    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  /* ---------------- SAVE ---------------- */

  const handleSave = () => {
    setConfirmMessage(
      editingId ? "Update this school?" : "Create this school?",
    );

    setConfirmAction(() => async () => {
      try {
        let res;

        if (editingId) {
          res = await axios.put(`${API}/schools/${editingId}`, form);

          toast.success("School updated");

          navigate(`/admin/school-view/${editingId}`);
        } else {
          res = await axios.post(`${API}/schools`, form);

          toast.success("School created");

          const newSchoolId = res.data.data._id;

          navigate(`/admin/school-view/${newSchoolId}`);
        }

        setShowModal(false);
        setForm(emptyForm);
        setEditingId(null);
        setDirty(false);

        fetchSchools();
      } catch {
        toast.error("Error saving school");
      }
    });

    setConfirmModal(true);
  };

  /* ---------------- EDIT ---------------- */

  const editSchool = (school) => {
    setForm({
      ...school,

      subscription_plan: school.subscription_plan?._id,

      start_date: school.start_date?.slice(0, 10) || "",
      end_date: school.end_date?.slice(0, 10) || "",
    });

    setEditingId(school._id);
    setShowModal(true);
    setDirty(false);
  };

  /* ---------------- DELETE ---------------- */

  const deleteSchool = (id) => {
    setConfirmMessage("Delete this school permanently?");

    setConfirmAction(() => async () => {
      await axios.delete(`${API}/schools/${id}`);

      toast.success("School deleted");
      fetchSchools();
    });

    setConfirmModal(true);
  };

  /* ---------------- CLOSE MODAL ---------------- */

  const closeModal = () => {
    if (dirty) {
      setConfirmMessage("Discard unsaved changes?");

      setConfirmAction(() => () => {
        setShowModal(false);
        setForm(emptyForm);
        setEditingId(null);
        setDirty(false);
      });

      setConfirmModal(true);
    } else {
      setForm(emptyForm);
      setShowModal(false);
    }
  };

  return (
    <div className="p-6 min-h-screen">
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

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold ">School Management</h1>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[rgb(var(--primary))] text-[rgb(var(--text))] px-5 py-2 rounded-lg shadow"
        >
          <FaPlus />
          Add School
        </button>
      </div>

      {/* TABLE */}

      <div className="shadow-lg rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]">
            <tr>
              <th className="p-4 text-left">School</th>
              <th className="p-4 text-left">Subscription</th>
              <th className="p-4 text-left">Start Date</th>
              <th className="p-4 text-left">End Date</th>
              <th className="p-4 text-left">Email</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {schools.map((school) => (
              <tr
                key={school._id}
                className="border-t bg-[rgb(var(--surface))] text-[rgb(var(--text))] transition"
              >
                <td className="p-4 font-medium">{school.school_name}</td>

                <td className="p-4">
                  <span className="bg-indigo-100 text-indigo-600 px-2 py-1 rounded text-xs">
                    {school.subscription_plan?.name}
                  </span>
                </td>

                <td className="p-4">{school.start_date?.slice(0, 10)}</td>

                <td className="p-4">{school.end_date?.slice(0, 10)}</td>

                <td className="p-4">{school.contact_email}</td>

                <td className="p-4">
                  <span
                    className={`px-2 py-1 text-xs rounded-full
                      ${
                        school.status === "Active"
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-500"
                      }
                    `}
                  >
                    {school.status}
                  </span>
                </td>

                <td className="p-4 flex justify-end gap-4">
                  <button
                    onClick={() => navigate(`/admin/school-view/${school._id}`)}
                    className="text-indigo-600 hover:scale-110"
                  >
                    <FaEye />
                  </button>

                  <button
                    onClick={() => editSchool(school)}
                    className="text-blue-600 hover:scale-110"
                  >
                    <FaEdit />
                  </button>

                  <button
                    onClick={() => deleteSchool(school._id)}
                    className="text-red-600 hover:scale-110"
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-xl shadow-lg w-full max-w-xl max-h-[90vh] flex flex-col">
            {/* HEADER */}
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingId ? "Edit School" : "Create School"}
              </h2>
            </div>

            {/* SCROLLABLE CONTENT */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                {/* School Name */}
                <div>
                  <label className="text-sm font-medium">School Name</label>
                  <input
                    name="school_name"
                    value={form.school_name}
                    onChange={handleChange}
                    className="border px-3 py-2 rounded-lg w-full"
                  />
                </div>

                {/* Slug */}
                <div>
                  <label className="text-sm font-medium">Slug</label>
                  <input
                    name="slug"
                    value={form.slug}
                    onChange={handleChange}
                    className="border px-3 py-2 rounded-lg w-full"
                  />
                </div>

                {/* Subscription */}
                <div className="col-span-2">
                  <label className="text-sm font-medium">
                    Subscription Plan
                  </label>

                  <select
                    name="subscription_plan"
                    value={form.subscription_plan}
                    onChange={handleChange}
                    className="border px-3 py-2 rounded-lg w-full bg-[rgb(var(--surface))] text-[rgb(var(--text))]"
                  >
                    <option value="">Select Plan</option>

                    {subscriptions.map((plan) => (
                      <option key={plan._id} value={plan._id}>
                        {plan.name} — {plan.currency} {plan.price} /{" "}
                        {plan.billing_cycle}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="text-sm font-medium">Start Date</label>

                  <input
                    type="date"
                    name="start_date"
                    value={form.start_date}
                    onChange={handleChange}
                    className="border px-3 py-2 rounded-lg w-full"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="text-sm font-medium">End Date</label>

                  <input
                    type="date"
                    name="end_date"
                    value={form.end_date}
                    onChange={handleChange}
                    className="border px-3 py-2 rounded-lg w-full"
                  />
                </div>

                {/* Contact Email */}
                <div>
                  <label className="text-sm font-medium">Contact Email</label>

                  <input
                    name="contact_email"
                    value={form.contact_email}
                    onChange={handleChange}
                    className="border px-3 py-2 rounded-lg w-full"
                  />
                </div>

                {/* Contact Phone */}
                <div>
                  <label className="text-sm font-medium">Contact Phone</label>

                  <input
                    name="contact_phone"
                    value={form.contact_phone}
                    onChange={handleChange}
                    className="border px-3 py-2 rounded-lg w-full"
                  />
                </div>

                {/* Address */}
                <div className="col-span-2">
                  <label className="text-sm font-medium">Address</label>

                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    className="border px-3 py-2 rounded-lg w-full"
                  />
                </div>

                {/* Admin Credentials */}
                <div className="col-span-2 mt-4">
                  <h3 className="font-semibold border-b pb-2 mb-3">
                    School Admin Login
                  </h3>
                </div>

                <div>
                  <label className="text-sm font-medium">Admin Name</label>
                  <input
                    name="admin_name"
                    value={form.admin_name}
                    onChange={handleChange}
                    className="border px-3 py-2 rounded-lg w-full"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Admin Email</label>
                  <input
                    name="admin_email"
                    value={form.admin_email}
                    onChange={handleChange}
                    className="border px-3 py-2 rounded-lg w-full"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Admin Password</label>
                  <input
                    name="admin_password"
                    value={form.admin_password}
                    onChange={handleChange}
                    className="border px-3 py-2 rounded-lg w-full"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="text-sm font-medium">Status</label>

                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="border px-3 py-2 rounded-lg w-full bg-[rgb(var(--surface))] text-[rgb(var(--text))]"
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex justify-end gap-3 p-6 border-t">
              <button
                onClick={closeModal}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={handleSave}
                className="px-4 py-2 bg-[rgb(var(--primary))] text-[rgb(var(--text))] rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM POPUP */}

      {confirmModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-lg p-6 w-87.5 shadow-lg">
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

export default SchoolManagement;
