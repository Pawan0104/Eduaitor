import { useState, useEffect } from "react";
import axios from "axios";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

/* ---------------- ERP MODULES ---------------- */

const modules = [
  "dashboard",
  "dashboardSettings",
  "students",
  "teachers",
  "parents",
  "class",
  "attendance",
  "exams",
  "timetable",
  "diary",
  "course",
  "groups",
  "fee",
  "events",
  "notices",
  "reports",
  "finance",
  "calendar",
  "transport",
  "library",
  "inventory",
  "documents",
  "contact",
  "gatepass",
  "transaction",
  "help",
];

const actions = ["view", "create", "edit", "delete"];

const AccessControl = () => {
  const emptyForm = { role: "" };

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState({});

  const [form, setForm] = useState(emptyForm);
  const [originalForm, setOriginalForm] = useState(emptyForm);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [confirmUpdate, setConfirmUpdate] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [deleteId, setDeleteId] = useState(null);
  const isMobile = window.innerWidth <= 768;
  const navigate = useNavigate();

  /* ---------------- FETCH ACCESS ---------------- */

  const fetchAccess = async () => {
    try {
      const res = await axios.get(`${API}/access`);
      setUsers(res.data.data);
    } catch {
      toast.error("Failed to fetch access");
    }
  };

  /* ---------------- FETCH ROLES ---------------- */

  const fetchRoles = async () => {
    try {
      const res = await axios.get(`${API}/roles`);
      const activeRoles = res.data.data.filter(
        (role) => role.status === "Active",
      );
      setRoles(activeRoles);
    } catch {
      toast.error("Failed to fetch roles");
    }
  };

  useEffect(() => {
    fetchAccess();
    fetchRoles();
  }, []);

  /* ---------------- MODALS ---------------- */

  const openAddModal = () => {
    setForm(emptyForm);
    setPermissions({});
    setOriginalForm(emptyForm);
    setEditingId(null);
    setShowModal(true);
  };

  const openEditModal = (access) => {
    setForm({
      role: access.role?._id || access.role,
    });

    setPermissions(access.permissions || {});
    setOriginalForm(access);
    setEditingId(access._id);

    setShowModal(true);
  };

  /* ---------------- ROLE CHANGE ---------------- */

  const handleRoleChange = (e) => {
    const roleId = e.target.value;

    setForm({ role: roleId });

    const defaultPermissions = {};

    modules.forEach((module) => {
      defaultPermissions[module] = {
        view: true,
        create: false,
        edit: false,
        delete: false,
      };
    });

    setPermissions(defaultPermissions);
  };

  /* ---------------- TOGGLE PERMISSION ---------------- */

  const togglePermission = (module, action) => {
    setPermissions((prev) => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: !prev[module][action],
      },
    }));
  };

  /* ---------------- SAVE ---------------- */

  const handleSave = async () => {
    if (!form.role) {
      toast.error("Please select role");
      return;
    }

    const payload = {
      role: form.role,
      permissions,
    };

    if (editingId) {
      setConfirmUpdate(true);
      return;
    }

    try {
      await axios.post(`${API}/access`, payload);

      toast.success("Access created successfully");

      setShowModal(false);
      fetchAccess();
    } catch {
      toast.error("Error creating access");
    }
  };

  /* ---------------- UPDATE ---------------- */

  const confirmUpdateUser = async () => {
    try {
      await axios.put(`${API}/access/${editingId}`, {
        role: form.role,
        permissions,
      });

      toast.success("Access updated");

      setConfirmUpdate(false);
      setShowModal(false);

      fetchAccess();
    } catch {
      toast.error("Update failed");
    }
  };

  /* ---------------- CANCEL ---------------- */

  const cancelModal = () => {
    if (JSON.stringify(form) !== JSON.stringify(originalForm)) {
      setConfirmDiscard(true);
      return;
    }

    setShowModal(false);
  };

  const discardChanges = () => {
    setConfirmDiscard(false);
    setShowModal(false);
  };

  /* ---------------- DELETE ---------------- */

  const deleteUser = async () => {
    try {
      await axios.delete(`${API}/access/${deleteId}`);

      toast.success("Access deleted");

      setConfirmDelete(false);
      fetchAccess();
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="p-6">
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
        <h1 className="text-2xl font-semibold text-[rgb(var(--text))]">Access Control</h1>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-[rgb(var(--primary))] text-[rgb(var(--text))] px-4 py-2 rounded-lg"
        >
          <FaPlus />
          Add Access
        </button>
      </div>

      {/* TABLE */}

      <div className="bg-[rgb(var(--surface))] rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-[rgb(var(--surface))]">
            <tr>
              <th className="px-6 py-3 text-left text-sm">Role</th>
              <th className="px-6 py-3 text-left text-sm">Permissions</th>
              <th className="px-6 py-3 text-right text-sm">Actions</th>
            </tr>
          </thead>

          <tbody>
            {users.map((access) => (
              <tr key={access._id} className="border-t ">
                <td className="px-6 py-3 font-medium">{access.role?.name}</td>

                <td className="px-6 py-3 text-sm text-gray-600">
                  {Object.keys(access.permissions || {}).length} Modules
                </td>

                <td className="px-6 py-3 flex justify-end gap-4">
                  <button
                    onClick={() => openEditModal(access)}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    <FaEdit />
                  </button>

                  <button
                    onClick={() => {
                      setDeleteId(access._id);
                      setConfirmDelete(true);
                    }}
                    className="text-red-500 hover:text-red-700"
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
        <Modal title={editingId ? "Edit Access" : "Add Access"}>
          {/* ROLE */}

          <div className="mb-4">
            <label className="block text-sm mb-1">Select Role</label>

            <select
              value={form.role}
              onChange={handleRoleChange}
              className="input w-full bg-[rgb(var(--surface))] text-[rgb(var(--text))]"
            >
              <option value="">Select Role</option>

              {roles.map((role) => (
                <option key={role._id} value={role._id} className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]">
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          {/* PERMISSION MATRIX */}

          {form.role && (
            <div>
              <h3 className="font-semibold mb-3">Permission Matrix</h3>

              <div className="border rounded-lg overflow-auto max-h-100">
                <table className="w-full text-sm">
                  <thead className=" sticky top-0">
                    <tr>
                      <th className="p-3 text-left">Module</th>

                      {actions.map((action) => (
                        <th key={action} className="p-3 capitalize">
                          {action}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {modules.map((module) => (
                      <tr key={module} className="border-t">
                        <td className="p-3 capitalize font-medium">{module}</td>

                        {actions.map((action) => (
                          <td key={action} className="text-center">
                            <input
                              type="checkbox"
                              checked={permissions[module]?.[action] || false}
                              onChange={() => togglePermission(module, action)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* FOOTER */}

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={cancelModal}
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
        </Modal>
      )}

      {/* CONFIRM MODALS */}

      {confirmUpdate && (
        <ConfirmModal
          title="Update Access"
          text="Are you sure you want to update access?"
          confirm={confirmUpdateUser}
          cancel={() => setConfirmUpdate(false)}
        />
      )}

      {confirmDiscard && (
        <ConfirmModal
          title="Discard Changes"
          text="You have unsaved changes. Discard them?"
          confirm={discardChanges}
          cancel={() => setConfirmDiscard(false)}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete Access"
          text="Are you sure you want to delete this access?"
          confirm={deleteUser}
          cancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
};

export default AccessControl;

/* ---------------- UI COMPONENTS ---------------- */

const Modal = ({ title, children }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
    <div className="bg-[rgb(var(--surface))] rounded-xl p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>

      {children}
    </div>
  </div>
);

const ConfirmModal = ({ title, text, confirm, cancel }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
    <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-xl p-6 w-full max-w-sm">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>

      <p className="text-[rgb(var(--text))] mb-5 text-sm">{text}</p>

      <div className="flex justify-end gap-3">
        <button onClick={cancel} className="px-4 py-2 border rounded-lg">
          Cancel
        </button>

        <button
          onClick={confirm}
          className="px-4 py-2 bg-[rgb(var(--primary))] text-[rgb(var(--text))] rounded-lg"
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
);
