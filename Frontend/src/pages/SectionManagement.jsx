import React from "react";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaLayerGroup,
  FaProjectDiagram,
  FaArrowLeft,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

export default function SectionManagement() {
  const navigate = useNavigate();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);

  const [editingSection, setEditingSection] = useState(null);
  const [editingSub, setEditingSub] = useState(null);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [discardConfirm, setDiscardConfirm] = useState(null);

  const [initialData, setInitialData] = useState(null);

  const [sectionForm, setSectionForm] = useState({
    name: "",
    status: "Active",
  });

  const [subForm, setSubForm] = useState({
    sectionId: "",
    name: "",
    status: "Active",
  });

  const isMobile = window.innerWidth <= 768;

  const hasChanges = (data, initial) =>
    JSON.stringify(data) !== JSON.stringify(initial);

  /* FETCH */

  const fetchSections = async () => {
    try {
      setLoading(true);

      const { data } = await axios.get(`${API}/sections/all`, {
        withCredentials: true,
      });

      if (data.success) setSections(data.sections);
    } catch {
      toast.error("Failed to load sections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  /* SECTION CRUD */

  const saveSection = async () => {
    if (!sectionForm.name.trim()) {
      toast.error("Section name required");
      return;
    }

    try {
      if (editingSection) {
        await axios.put(
          `${API}/sections/update/${editingSection._id}`,
          {
            ...sectionForm,
          },
          { withCredentials: true },
        );

        toast.success("Section updated");
      } else {
        await axios.post(
          `${API}/sections/create`,
          {
            ...sectionForm,
          },
          { withCredentials: true },
        );

        toast.success("Section created");
      }

      resetSection();

      fetchSections();
    } catch {
      toast.error("Something went wrong");
    }
  };

  const deleteSection = async (id) => {
    try {
      await axios.delete(`${API}/sections/delete/${id}`, {
        withCredentials: true,
      });

      toast.success("Section deleted");

      fetchSections();
    } catch {
      toast.error("Delete failed");
    }
  };

  const openSectionEdit = (sec) => {
    setEditingSection(sec);

    setSectionForm({ name: sec.name, status: sec.status });

    setInitialData({ name: sec.name, status: sec.status });

    setShowSectionModal(true);
  };

  const resetSection = () => {
    setShowSectionModal(false);

    setEditingSection(null);

    setSectionForm({ name: "", status: "Active" });
  };

  /* SUB CRUD */

  const saveSub = async () => {
    if (!subForm.sectionId) {
      toast.error("Select section first");
      return;
    }

    if (!subForm.name.trim()) {
      toast.error("Subsection name required");
      return;
    }

    try {
      if (editingSub) {
        await axios.put(
          `${API}/sections/sub/update/${subForm.sectionId}/${editingSub._id}`,
          {
            ...subForm,
          },
          { withCredentials: true },
        );

        toast.success("Subsection updated");
      } else {
        await axios.post(
          `${API}/sections/sub/create/${subForm.sectionId}`,
          {
            ...subForm,
          },
          { withCredentials: true },
        );

        toast.success("Subsection created");
      }

      resetSub();

      fetchSections();
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  };

  const deleteSub = async (sectionId, subId) => {
    try {
      await axios.delete(`${API}/sections/sub/delete/${sectionId}/${subId}`, {
        withCredentials: true,
      });

      toast.success("Subsection deleted");

      fetchSections();
    } catch {
      toast.error("Delete failed");
    }
  };

  const openSubEdit = (sectionId, sub) => {
    setEditingSub(sub);

    setSubForm({
      sectionId,
      name: sub.name,
      status: sub.status,
    });

    setInitialData({
      sectionId,
      name: sub.name,
      status: sub.status,
    });

    setShowSubModal(true);
  };

  const resetSub = () => {
    setShowSubModal(false);

    setEditingSub(null);

    setSubForm({ sectionId: "", name: "", status: "Active" });
  };

  /* DISCARD */

  const handleCloseSection = () => {
    if (editingSection && hasChanges(sectionForm, initialData)) {
      setDiscardConfirm("section");
    } else {
      resetSection();
    }
  };

  const handleCloseSub = () => {
    if (editingSub && hasChanges(subForm, initialData)) {
      setDiscardConfirm("sub");
    } else {
      resetSub();
    }
  };

  /* UI */

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* HEADER */}
      {/* 🔙 BACK BUTTON */}
      {isMobile && (
          <div className="pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl
                bg-[rgb(var(--primary))]  text-[rgb(var(--text))]  shadow-sm border 
                 text-sm font-bold active:scale-95 transition-transform mb-2.5"
          >
            <FaArrowLeft size={16} />
            Back
          </button>
        </div>
      )}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl sm:text-2xl font-bold flex gap-2 items-center">
          <FaLayerGroup /> Section Management
        </h2>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowSectionModal(true)}
            className="bg-[rgb(var(--primary))] text-[rgb(var(--text))] px-4 py-2 rounded-lg flex items-center justify-center gap-2"
          >
            <FaPlus /> Section
          </button>

          <button
            onClick={() => {
              if (!sections.length) {
                toast.error("Add section first");
                return;
              }
              setShowSubModal(true);
            }}
            className="text-[rgb(var(--text))] bg-[rgb(var(--primary))]   px-4 py-2 rounded-lg flex items-center justify-center gap-2"
          >
            <FaProjectDiagram /> Sub Section
          </button>
        </div>
      </div>

      {/* TABLE */}

      <div className="bg-[rgb(var(--surface))] shadow rounded-xl overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]  font-medium">
            <tr>
              <th className="p-3 text-left">Section</th>
              <th>Status</th>
              <th>Subsections</th>
              <th>Student Count</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="text-center p-6">
                  Loading...
                </td>
              </tr>
            ) : sections.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center p-6 text-[rgb(var(--text))]">
                  No sections created
                </td>
              </tr>
            ) : (
              sections.map((sec) => (
                <React.Fragment key={sec._id}>
                  <tr className="border-t text-center text-[rgb(var(--text))]">
                    <td className="p-3 font-medium text-left">{sec.name}</td>

                    <td>{sec.status}</td>

                    <td>{sec.subsections.length}</td>

                    <td>0</td>

                    <td className="flex justify-center gap-3 p-3">
                      <button
                        onClick={() => openSectionEdit(sec)}
                        className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]  px-2 py-1 rounded"
                      >
                        <FaEdit />
                      </button>

                      <button
                        onClick={() =>
                          setConfirmDelete({
                            type: "section",
                            sectionId: sec._id,
                          })
                        }
                        className="text-red-600"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>

                  {sec.subsections.map((sub) => (
                    <tr key={sub._id} className="bg-[rgb(var(--surface))] text-center text-[rgb(var(--text))]">
                      <td className="pl-10 text-left">↳ {sub.name}</td>

                      <td>{sub.status}</td>

                      <td>-</td>

                      <td></td>

                      <td className="flex justify-center gap-3 p-3">
                        <button
                          onClick={() => openSubEdit(sec._id, sub)}
                          className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]  px-2 py-1 rounded"
                        >
                          <FaEdit />
                        </button>

                        <button
                          onClick={() =>
                            setConfirmDelete({
                              type: "sub",
                              sectionId: sec._id,
                              subId: sub._id,
                            })
                          }
                          className="text-red-600"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODALS */}

      {showSectionModal && (
        <Modal title={editingSection ? "Edit Section" : "Add Section"}>
          <input
            type="text"
            placeholder="Section Name"
            value={sectionForm.name}
            onChange={(e) =>
              setSectionForm({ ...sectionForm, name: e.target.value })
            }
            className="input"
          />

          <select
            value={sectionForm.status}
            onChange={(e) =>
              setSectionForm({ ...sectionForm, status: e.target.value })
            }
            className="input bg-[rgb(var(--surface))] text-[rgb(var(--text))] "
          >
            <option>Active</option>
            <option>Inactive</option>
          </select>

          <ModalActions cancel={handleCloseSection} save={saveSection} />
        </Modal>
      )}

      {showSubModal && (
        <Modal title={editingSub ? "Edit Sub Section" : "Add Sub Section"}>
          {!editingSub && (
            <select
              value={subForm.sectionId}
              onChange={(e) =>
                setSubForm({ ...subForm, sectionId: e.target.value })
              }
              className="input"
            >
              <option value="">Select Section</option>

              {sections.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          <input
            type="text"
            placeholder="Sub Section Name"
            value={subForm.name}
            onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
            className="input"
          />

          <select
            value={subForm.status}
            onChange={(e) => setSubForm({ ...subForm, status: e.target.value })}
            className="input"
          >
            <option>Active</option>
            <option>Inactive</option>
          </select>

          <ModalActions cancel={handleCloseSub} save={saveSub} />
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmModal
          confirm={() => {
            confirmDelete.type === "section"
              ? deleteSection(confirmDelete.sectionId)
              : deleteSub(confirmDelete.sectionId, confirmDelete.subId);

            setConfirmDelete(null);
          }}
          cancel={() => setConfirmDelete(null)}
        />
      )}

      {discardConfirm && (
        <ConfirmModal
          title="Discard changes?"
          confirm={() => {
            discardConfirm === "section" ? resetSection() : resetSub();
            setDiscardConfirm(null);
          }}
          cancel={() => setDiscardConfirm(null)}
        />
      )}
    </div>
  );
}

/* MODALS */

const Modal = ({ title, children }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 text-[rgb(var(--text))] overflow-y-auto">
    <div className="bg-[rgb(var(--surface))] p-6 rounded-xl w-full max-w-md space-y-4 my-auto max-h-[min(92vh,880px)] overflow-y-auto">
      <h3 className="text-lg font-semibold">{title}</h3>
      {children}
    </div>
  </div>
);

const ModalActions = ({ cancel, save }) => (
  <div className="flex justify-end gap-3">
    <button onClick={cancel} className="border px-4 py-2 rounded">
      Cancel
    </button>
    <button onClick={save} className="bg-[rgb(var(--primary))] text-[rgb(var(--text))] px-4 py-2 rounded">
      Save
    </button>
  </div>
);

const ConfirmModal = ({ title = "Delete this item?", confirm, cancel }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 text-[rgb(var(--text))] overflow-y-auto">
    <div className="bg-[rgb(var(--surface))] p-6 rounded-xl space-y-4 text-center w-full max-w-sm my-auto max-h-[min(92vh,880px)] overflow-y-auto">
      <h3>{title}</h3>

      <div className="flex gap-4 justify-center">
        <button onClick={cancel} className="border px-4 py-2 rounded">
          Cancel
        </button>

        <button
          onClick={confirm}
          className="bg-red-600 text-[rgb(var(--text))] px-4 py-2 rounded"
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
);
