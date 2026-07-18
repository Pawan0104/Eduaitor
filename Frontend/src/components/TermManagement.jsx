import { useEffect, useState } from "react";
import axios from "axios";
import {
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiAlertTriangle,
  FiX,
} from "react-icons/fi";
import { toast } from "react-toastify";

const EMPTY = {
  name: "",
  academicYear: "",
  termType: "other",
  startDate: "",
  endDate: "",
  order: "",
};

function TermManagement({ onDataChange }) {
  const API = import.meta.env.VITE_API_URL;

  const [terms, setTerms] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [formData, setFormData] = useState(EMPTY);
  const [editId, setEditId] = useState(null);

  const fetchTerms = async () => {
    try {
      const res = await axios.get(`${API}/terms`, { withCredentials: true });
      setTerms(res.data.terms || []);
      if (onDataChange) onDataChange();
    } catch {
      toast.error("Failed to fetch terms");
    }
  };

  useEffect(() => {
    fetchTerms();
  }, []);

  const confirmDelete = async () => {
    try {
      await axios.delete(`${API}/terms/${deleteId}`, { withCredentials: true });
      toast.success("Term deleted successfully");
      setDeleteId(null);
      if (onDataChange) onDataChange();
      fetchTerms();
    } catch {
      toast.error("Could not delete term");
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.academicYear.trim()) {
      return toast.error("Name and academic year are required");
    }
    try {
      const payload = {
        name: formData.name.trim(),
        academicYear: formData.academicYear.trim(),
        termType: formData.termType,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        order: formData.order !== "" ? Number(formData.order) : undefined,
      };
      if (editId) {
        await axios.put(`${API}/terms/${editId}`, payload, {
          withCredentials: true,
        });
        toast.success("Term updated");
      } else {
        await axios.post(`${API}/terms`, payload, { withCredentials: true });
        toast.success("New term added");
      }
      if (onDataChange) onDataChange();
      setShowModal(false);
      setFormData(EMPTY);
      setEditId(null);
      fetchTerms();
    } catch {
      toast.error("Save failed. Please try again.");
    }
  };

  const typeLabel = (t) => {
    if (t === "half_yearly") return "Half Yearly";
    if (t === "yearly") return "Yearly";
    return "Other";
  };

  return (
    <div className="p-4 md:p-8 text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">Academic Terms</h1>
            <p className="text-sm">
              Create any terms (Term 1, Term 2, Half Yearly, etc.) for exams and
              cumulative report cards
            </p>
          </div>
          <button
            onClick={() => {
              setEditId(null);
              setFormData(EMPTY);
              setShowModal(true);
            }}
            className="w-full sm:w-auto bg-[rgb(var(--primary))] px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
          >
            <FiPlus /> Add New Term
          </button>
        </div>

        <div className="flex flex-wrap gap-4">
          {terms.map((term) => (
            <div
              key={term._id}
              className="text-[rgb(var(--text))] bg-[rgb(var(--surface))] p-5 border border-slate-200 rounded-2xl shadow-sm min-w-70 flex-1 sm:flex-none"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg">{term.name}</h3>
                  <span className="text-xs font-bold px-2 py-1 rounded-md mt-1 inline-block uppercase">
                    {term.academicYear}
                  </span>
                  <p className="text-xs mt-2 text-[rgb(var(--text-light))]">
                    {typeLabel(term.termType)}
                    {term.startDate
                      ? ` · ${new Date(term.startDate).toLocaleDateString()}`
                      : ""}
                    {term.endDate
                      ? ` – ${new Date(term.endDate).toLocaleDateString()}`
                      : ""}
                  </p>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-50">
                <button
                  onClick={() => {
                    setFormData({
                      name: term.name,
                      academicYear: term.academicYear,
                      termType: term.termType || "other",
                      startDate: term.startDate
                        ? new Date(term.startDate).toISOString().slice(0, 10)
                        : "",
                      endDate: term.endDate
                        ? new Date(term.endDate).toISOString().slice(0, 10)
                        : "",
                      order: term.order != null ? String(term.order) : "",
                    });
                    setEditId(term._id);
                    setShowModal(true);
                  }}
                  className="text-cyan-600 hover:text-cyan-700 text-sm font-bold flex items-center gap-1.5"
                >
                  <FiEdit2 size={16} /> Edit
                </button>
                <button
                  onClick={() => setDeleteId(term._id)}
                  className="text-red-400 hover:text-red-600 text-sm font-bold flex items-center gap-1.5"
                >
                  <FiTrash2 size={16} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {deleteId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-100 p-4">
          <div className="text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-3xl p-6 w-full max-w-[320px] shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiAlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-bold">Confirm Delete</h2>
            <p className="text-sm mt-2 leading-relaxed">
              Are you sure you want to remove this term? This cannot be undone.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-8">
              <button
                onClick={() => setDeleteId(null)}
                className="py-3 bg-slate-100 hover:bg-slate-200 text-[rgb(var(--primary))] font-bold rounded-2xl"
              >
                Go Back
              </button>
              <button
                onClick={confirmDelete}
                className="py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex justify-center items-center z-50 p-4">
          <div className="text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-3xl p-8 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-6 top-6"
            >
              <FiX size={20} />
            </button>
            <h2 className="text-2xl font-bold mb-6">
              {editId ? "Update" : "Create"} Term
            </h2>

            <div className="space-y-4">
              <Field
                label="Term Name"
                value={formData.name}
                onChange={(v) => setFormData({ ...formData, name: v })}
                placeholder="e.g. Half Yearly"
              />
              <Field
                label="Academic Year"
                value={formData.academicYear}
                onChange={(v) => setFormData({ ...formData, academicYear: v })}
                placeholder="e.g. 2026-27"
              />
              <div>
                <label className="block text-xs font-bold uppercase mb-2 ml-1">
                  Term label (optional)
                </label>
                <select
                  className="w-full rounded-2xl p-4 outline-none bg-[rgb(var(--bg))]"
                  value={formData.termType}
                  onChange={(e) =>
                    setFormData({ ...formData, termType: e.target.value })
                  }
                >
                  <option value="other">General term</option>
                  <option value="half_yearly">Half Yearly</option>
                  <option value="yearly">Yearly / Annual</option>
                </select>
              </div>
              <Field
                label="Order (1 = first term, 2 = second…)"
                type="number"
                value={formData.order}
                onChange={(v) => setFormData({ ...formData, order: v })}
                placeholder="e.g. 1"
              />
              <Field
                label="Start date"
                type="date"
                value={formData.startDate}
                onChange={(v) => setFormData({ ...formData, startDate: v })}
              />
              <Field
                label="End date"
                type="date"
                value={formData.endDate}
                onChange={(v) => setFormData({ ...formData, endDate: v })}
              />
            </div>

            <button
              onClick={handleSubmit}
              className="w-full text-[rgb(var(--text))] bg-[rgb(var(--primary))] font-bold py-4 rounded-2xl mt-8"
            >
              {editId ? "Update Term" : "Save Term"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const Field = ({ label, value, onChange, placeholder, type = "text" }) => (
  <div>
    <label className="block text-xs font-bold uppercase mb-2 ml-1">{label}</label>
    <input
      type={type}
      className="w-full border-none rounded-2xl p-4 focus:ring-2 focus:ring-cyan-500 outline-none bg-[rgb(var(--bg))]"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  </div>
);

export default TermManagement;
