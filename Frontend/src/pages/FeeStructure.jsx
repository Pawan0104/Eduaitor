import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaArrowLeft, FaEdit, FaTrash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const FeeStructure = () => {
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  /* ── state ── */
  const [classes, setClasses] = useState([]);
  const [feeData, setFeeData] = useState(null); // null = not loaded yet
  const [selectedClass, setSelectedClass] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingFee, setEditingFee] = useState(null); // null = add mode, object = edit mode
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    isOptional: false,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  // calculate amount for monthly wise drop down
  const [freqFilter, setFreqFilter] = useState("annually");

  // for delete coinfirmation dialog state
  const [confirmId, setConfirmId] = useState(null); // which fee is pending deletion
  const [confirmVisible, setConfirmVisible] = useState(false);

  // divide for change months
  const FREQ_DIVISOR = {
    annually: 1, // 1 payment of the full amount
    "half-yearly": 2, // 2 payments (Total / 2)
    quarterly: 4, // 4 payments (Total / 4)
    monthly: 12, // 12 payments (Total / 12)
  };
  const calcAmount = (annualAmount) => {
    if (!annualAmount) return 0;
    const result = annualAmount / FREQ_DIVISOR[freqFilter];
    return Math.round(result);
  };
  const API = import.meta.env.VITE_API_URL;

  /* Fetch all classes for the dropdown */
  const fetchClasses = async () => {
    try {
      const { data } = await axios.get(`${API}/classes/all`, {
        withCredentials: true,
      });
      setClasses(data.classes);
    } catch {
      console.error("Failed to load classes");
    }
  };

  /* Fetch fee components for a given class (or re-uses selectedClass) */
  const refreshFees = async (classId) => {
    const id = classId || selectedClass;
    if (!id) return;
    try {
      const { data } = await axios.get(`${API}/fee-structure/${id}`, {
        withCredentials: true,
      });
      setFeeData(data);
    } catch {
      setFeeData({ fees: [] }); // graceful fallback — show empty state
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  /* ────────────────────────────────────────
     CLASS DROPDOWN HANDLER
  ──────────────────────────────────────── */
  const handleClassChange = async (e) => {
    const id = e.target.value;
    setSelectedClass(id);
    setFeeData(null); // reset so loading state shows
    if (!id) return;
    await refreshFees(id);
  };

  /* ────────────────────────────────────────
     MODAL HELPERS
  ──────────────────────────────────────── */

  /* Open modal in ADD mode */
  const openAdd = () => {
    setEditingFee(null);
    setFormData({ name: "", amount: "", isOptional: false });
    setShowModal(true);
  };

  /* Open modal in EDIT mode — prefill form with existing fee data */
  const openEdit = (fee) => {
    setEditingFee(fee);
    setFormData({
      name: fee.name,
      amount: fee.amount,
      isOptional: fee.isOptional,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingFee(null);
    setErrors({});
  };

  /* ────────────────────────────────────────
     SAVE — handles both ADD and EDIT
  ──────────────────────────────────────── */
  const handleSave = async () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Component name is required";
    if (!formData.amount) newErrors.amount = "Amount is required";
    if (Number(formData.amount) <= 0)
      newErrors.amount = "Amount must be greater than 0";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors); // show errors, stop here
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const payload = {
        ...formData,
        amount: Number(formData.amount),
      };
      if (editingFee) {
        /* PUT — update existing fee component */
        await axios.put(
          `${API}/fee-structure/${selectedClass}/fee/${editingFee._id}`,
          payload,
          { withCredentials: true },
        );
        toast.success("Fee component updated successfully");
      } else {
        /* POST — add new fee component */
        await axios.post(`${API}/fee-structure/${selectedClass}/fee`, payload, {
          withCredentials: true,
        });
        toast.success("Fee component added successfully");
      }
      await refreshFees(); // re-fetch to show latest data
      closeModal();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save fee component");
    }
    setSaving(false);
  };

  //  DELETE a single fee component
  const handleDelete = async (feeId) => {
    setConfirmId(feeId);
    setConfirmVisible(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(
        `${API}/fee-structure/${selectedClass}/fee/${confirmId}`,
        { withCredentials: true },
      );

      await refreshFees();
      toast.success("Fee component removed successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove fee component");
    } finally {
      // 3. Cleanup state
      setConfirmVisible(false);
      setConfirmId(null);
    }
  };

  // calculate totals for cards

  const feeCount = feeData?.fees?.length ?? 0;
  const totalAll =
    feeData?.fees?.reduce((sum, f) => sum + calcAmount(f.amount), 0) ?? 0;
  const totalOptional =
    feeData?.fees
      ?.filter((f) => f.isOptional)
      .reduce((sum, f) => sum + calcAmount(f.amount), 0) ?? 0;
  const totalMandatory =
    feeData?.fees
      ?.filter((f) => !f.isOptional)
      .reduce((sum, f) => sum + calcAmount(f.amount), 0) ?? 0;

  /* INR currency formatter */
  const fmt = (n) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);

  /* ─────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────── */
  return (
    <>
      {/* ── Google Fonts + minimal global overrides ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap');
        .fee-row:hover td { background: #faf9fd; }
        .fs-select:focus  { border-color: #5b3faf; outline: none; }
        .fs-input:focus   { border-color: #5b3faf; outline: none; }
      `}</style>

      {/* ══════════════════════════════════════════
          PAGE WRAPPER — full width, small padding
          No max-width so it fills the right panel
      ══════════════════════════════════════════ */}
      <div className="w-full text-[rgb(var(--text))] bg-[rgb(var(--bg))] min-h-screen p-8">
        {/* 🔙 BACK BUTTON */}
        {isMobile && (
          <div className="px-4 pt-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl
                 shadow-sm border border-slate-100
                 text-sm font-bold active:scale-95 transition-transform mb-2.5"
            >
              <FaArrowLeft size={16} />
              Back
            </button>
          </div>
        )}
        {/* ── TOP BAR : class dropdown + add button ── */}
        <div className="flex flex-wrap items-end gap-3 mb-4">
          {/* Class selector */}
          <div className="flex flex-col gap-1 flex-1 min-w-45">
            <label className="text-[10px] font-bold tracking-widest uppercase ">
              Select Class
            </label>
            <div className="relative">
              <select
                className="fs-select w-full appearance-none  rounded-lg px-3 py-2 text-sm  border-1 cursor-pointer text-[rgb(var(--text))] bg-[rgb(var(--surface))] "
                onChange={handleClassChange}
                value={selectedClass}
              >
                <option value="" className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]">— Choose a class —</option>
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id} className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]">
                    {cls.name}
                  </option>
                ))}
              </select>
              {/* dropdown chevron icon */}
              <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none  text-xs">
                ▾
              </span>
            </div>
          </div>

          {/* Add Component button — only visible when a class is selected */}
          {selectedClass && (
            <button
              type="button"
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 text-white bg-[rgb(var(--primary))] text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap hover:opacity-90"
            >
              <span className="text-base leading-none">+</span> Add Component
            </button>
          )}
        </div>

        {/* Frequency selector — shown once a class is selected */}
        {selectedClass && (
          <div className="flex flex-col gap-1 mt-4 mb-3 ">
            <label className="text-[10px] font-bold tracking-widest uppercase ">
              View As
            </label>
            <select
              value={freqFilter}
              onChange={(e) => setFreqFilter(e.target.value)}
              className="fs-select  rounded-lg px-3 py-2 text-sm  text-[rgb(var(--text))] bg-[rgb(var(--surface))] border cursor-pointer"
            >
              <option value="annually">Annually</option>
              <option value="half-yearly">Half Yearly</option>
              <option value="quarterly">Quarterly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        )}

        {/* ── SUMMARY CHIPS — shown only when fees exist ── */}
        {feeData && feeCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {/* Total component count */}
            <div className="px-3 py-2 text-[rgb(var(--text))] bg-[rgb(var(--surface))]  border rounded-lg">
              <p className="text-[9px] font-bold tracking-widest uppercase  mb-0.5">
                Components
              </p>
              <p
                className="font-bold text-[15px]"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {feeCount}
              </p>
            </div>

            {/* Sum of mandatory fees only */}
            <div className="px-3 py-2  border rounded-lg">
              <p className="text-[9px] font-bold tracking-widest uppercase  mb-0.5">
                Mandatory Total
              </p>
              <p
                className="font-bold text-[15px] text-[#1a1625]"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {fmt(totalMandatory)}
              </p>
            </div>
            {/* Sum of optional  fees only */}
            <div className="px-3 py-2  border rounded-lg">
              <p className="text-[9px] font-bold tracking-widest uppercase mb-0.5">
                Optional Total
              </p>
              <p
                className="font-bold text-[15px]"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {fmt(totalOptional)}
              </p>
            </div>

            {/* Sum of ALL fees (mandatory + optional) — accent colour */}
            <div className="px-3 py-2 bg-[rgb(var(--primary))] rounded-lg text-[rgb(var(--text))]">
              <p className="text-[9px] font-bold tracking-widest uppercase  mb-0.5">
                Grand Total
              </p>
              <p
                className="font-bold text-[15px]"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {fmt(totalAll)}
              </p>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            FEE TABLE CARD
        ══════════════════════════════════════════ */}
        <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-xl border overflow-hidden">
          {/* ── State 1: No class selected yet ── */}
          {!selectedClass && (
            <div className="py-12 text-center">
              <div className="text-3xl opacity-30 mb-2">🏫</div>
              <p className="text-sm font-medium ">
                Select a class to view its fee structure
              </p>
            </div>
          )}

          {/* ── State 2: Loading (class selected but API not yet returned) ── */}
          {selectedClass && feeData === null && (
            <div className="py-10 text-center text-sm text-[rgb(var(--text))]">
              Loading…
            </div>
          )}

          {/* ── State 3: Empty (class exists but has no fee components) ── */}
          {selectedClass && feeData && feeCount === 0 && (
            <div className="py-12 text-center">
              <div className="text-3xl opacity-30 mb-2">📋</div>
              <p className="text-sm font-medium text-[rgb(var(--text))]">
                No fee components yet
              </p>
              <p className="text-xs text-[rgb(var(--text))] mt-1">
                Click "Add Component" to get started
              </p>
            </div>
          )}

          {/* ── State 4: Populated fee table ── */}
          {feeData && feeCount > 0 && (
            <table className="w-full border-collapse">
              {/* Table header */}
              <thead>
                <tr className="text-[rgb(var(--text))] bg-[rgb(var(--surface))] border-b">
                  <th className="px-4 py-2.5 text-left text-[9px] font-bold  uppercase  w-10">
                    #
                  </th>
                  <th className="px-4 py-2.5 text-left text-[9px] font-bold  uppercase ">
                    Component
                  </th>
                  <th className="px-4 py-2.5 text-left text-[9px] font-bold  uppercase ">
                    Type
                  </th>
                  <th className="px-4 py-2.5 text-right text-[9px] font-bold  uppercase ">
                    Amount
                  </th>
                  <th className="px-4 py-2.5 text-right text-[9px] font-bold  uppercase ">
                    Actions
                  </th>
                </tr>
              </thead>

              {/* Fee rows — each fee component gets its own row */}
              <tbody>
                {feeData.fees.map((fee, i) => (
                  <tr
                    key={fee._id}
                    className="border text-[rgb(var(--text))]"
                  >
                    {/* Serial number */}
                    <td
                      className="px-4 py-3 text-[rgb(var(--text))] text-xs font-semibold"
    
                    >
                      {String(i + 1).padStart(2, "0")}
                    </td>

                    {/* Fee component name */}
                    <td className="px-4 py-3 text-sm font-semibold text-[rgb(var(--text))]">
                      {fee.name}
                    </td>

                    {/* Mandatory / Optional badge */}
                    <td className="px-4 py-3">
                      {fee.isOptional ? (
                        <span className="inline-block text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-[#e8f5e9] text-[#2e7d32]">
                          Optional
                        </span>
                      ) : (
                        <span className="inline-block text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-[#fde8e8] text-[#c0392b]">
                          Mandatory
                        </span>
                      )}
                    </td>

                    {/* Formatted INR amount */}
                    <td
                      className="px-4 py-3 text-right font-semibold  text-sm"
                    >
                      {fmt(fee.amount)}
                    </td>

                    {/* Row actions: Edit and Delete */}
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => openEdit(fee)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-sky-700"
                        >
                          <FaEdit size={11} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(fee._id)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-rose-700"
                        >
                          <FaTrash size={11} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Grand total footer — always shown when table has rows */}
              <tfoot>
                <tr className="bg-[rgb(var(--surface))]">
                  <td
                    colSpan={3}
                    className="px-4 py-3 text-[11px] font-bold tracking-widest uppercase  text-[rgb(var(--primary))]"
                  >
                    Total Fees
                  </td>
                  <td
                    colSpan={2}
                    className="px-4 py-3 text-right text-lg font-bold text-[rgb(var(--primary))]"
                  >
                    {fmt(totalAll)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
        {/* end fee card */}
      </div>
      {/* end page wrapper */}
      {/* ── Custom delete confirmation ── */}
      {confirmVisible && (
        <div
          className="fixed inset-0 bg-[#1a1625]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setConfirmVisible(false)} // click backdrop to cancel
        >
          <div
            className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-2xl p-6 w-full max-w-xs shadow-2xl"
            onClick={(e) => e.stopPropagation()} // prevent backdrop click closing when clicking card
          >
            <div className="text-2xl mb-3">🗑</div>
            <h3
              className="text-base font-bold text-[rgb(var(--text))] mb-1"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Remove this component?
            </h3>
            <p className="text-sm  mb-5">This can't be undone.</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmVisible(false)}
                className="px-4 py-2 bg-[rgb(var(--primary))] text-sm font-semibold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg cursor-pointer"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL — Add / Edit a fee component
          Clicking the dim backdrop closes the modal
      ══════════════════════════════════════════ */}
      {showModal && (
        <div
          className="fixed inset-0 bg-[#1a1625]/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]  rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            {/* Title changes depending on add vs edit mode */}
            <h2
              className="text-lg font-bold mb-5"
            >
              {editingFee ? "Edit Component" : "Add Fee Component"}
            </h2>

            {/* Fee component name */}
            <label className="block text-[10px] font-bold tracking-widest uppercase  mb-1.5">
              Component Name
            </label>
            <input
              className="fs-input w-full border rounded-lg px-3 py-2 text-sm mb-4 transition-colors"
              placeholder="e.g. Tuition Fee"
              value={formData.name}
              onChange={(e) =>
                setFormData((p) => ({ ...p, name: e.target.value }))
              }
            />
            {errors.name && (
              <p className="text-[11px] text-red-500 -mt-3 mb-3">
                {errors.name}
              </p>
            )}

            {/* Amount in rupees */}
            <label className="block text-[10px] font-bold tracking-widest uppercase  mb-1.5">
              Amount (₹)
            </label>
            <input
              className="fs-input w-full border  rounded-lg px-3 py-2 text-sm  mb-4 transition-colors"
              type="number"
              placeholder="e.g. 5000"
              min={0}
              value={formData.amount}
              onChange={(e) =>
                setFormData((p) => ({ ...p, amount: e.target.value }))
              }
            />
            {errors.amount && (
              <p className="text-[11px] text-red-500 -mt-3 mb-3">
                {errors.amount}
              </p>
            )}

            {/* isOptional toggle */}
            <label className="flex items-center gap-2 mb-5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isOptional}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, isOptional: e.target.checked }))
                }
                className=" w-3.5 h-3.5"
              />
              <span className="text-sm text-[rgb(var(--text))] font-medium">
                Mark as Optional
              </span>
            </label>

            {/* Cancel / Save actions */}
            <div className="flex gap-2 justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-[rgb(var(--text))] bg-[rgb(var(--primary))] text-sm font-semibold rounded-lg  transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={`px-5 py-2 text-[rgb(var(--text))] bg-[rgb(var(--primary))] text-sm font-semibold rounded-lg  cursor-pointer ${saving ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {saving
                  ? "Saving…"
                  : editingFee
                    ? "Save Changes"
                    : "Add Component"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FeeStructure;
