import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function FeeCollection() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");
  const [hasRazorpaySecret, setHasRazorpaySecret] = useState(false);
  const [savingRazorpay, setSavingRazorpay] = useState(false);
  const [testingRazorpay, setTestingRazorpay] = useState(false);
  const [razorpayStatus, setRazorpayStatus] = useState("");

  const API = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = window.innerWidth <= 768;
  const basePath =
    user?.role === "staff_admin"
      ? "/staff"
      : user?.role === "school_admin"
        ? "/school"
        : "";

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

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${API}/students`, {
        withCredentials: true,
      });
      setStudents(res.data.data);
      setFilteredStudents(res.data.data);
    } catch {
      toast.error("Failed to load students");
    }
  };

  const fetchRazorpaySettings = async () => {
    try {
      const { data } = await axios.get(`${API}/schools/me/razorpay`, {
        withCredentials: true,
      });
      if (data?.success) {
        const keyId = data.data.razorpayKeyId || "";
        setRazorpayKeyId(keyId);
        setHasRazorpaySecret(Boolean(data.data.hasSecret));
        if (
          keyId &&
          data.data.hasSecret &&
          !keyId.includes("local") &&
          !keyId.includes("eduaitor")
        ) {
          setRazorpayStatus("saved");
        } else if (keyId.includes("local") || keyId.includes("eduaitor")) {
          setRazorpayStatus("error");
        } else {
          setRazorpayStatus("");
        }
      }
    } catch {
      // optional
    }
  };

  const saveRazorpaySettings = async () => {
    const keyId = razorpayKeyId.trim();
    if (!keyId) {
      toast.error("Enter Razorpay Key ID");
      return;
    }
    if (!hasRazorpaySecret && !razorpayKeySecret.trim()) {
      toast.error("Enter Razorpay Key Secret");
      return;
    }

    try {
      setSavingRazorpay(true);
      const payload = { razorpayKeyId: keyId };
      if (razorpayKeySecret.trim()) {
        payload.razorpayKeySecret = razorpayKeySecret.trim();
      }
      const { data } = await axios.put(`${API}/schools/me/razorpay`, payload, {
        withCredentials: true,
      });
      if (data?.success) {
        toast.success("Razorpay keys saved");
        setHasRazorpaySecret(Boolean(data.data.hasSecret));
        setRazorpayKeySecret("");
        setRazorpayStatus("saved");
      } else {
        toast.error(data?.message || "Failed to save Razorpay settings");
        setRazorpayStatus("error");
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to save Razorpay settings",
      );
      setRazorpayStatus("error");
    } finally {
      setSavingRazorpay(false);
    }
  };

  const testRazorpaySettings = async () => {
    try {
      setTestingRazorpay(true);
      const { data } = await axios.post(
        `${API}/schools/me/razorpay/test`,
        {},
        { withCredentials: true },
      );
      if (data?.success) {
        toast.success(data.message || "Razorpay keys verified");
        setRazorpayStatus("ready");
      } else {
        toast.error(data?.message || "Razorpay test failed");
        setRazorpayStatus("error");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Razorpay test failed");
      setRazorpayStatus("error");
    } finally {
      setTestingRazorpay(false);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchStudents();
    fetchRazorpaySettings();
  }, []);

  const applyFilters = (list, classId, queryRaw) => {
    const query = (queryRaw || "").toLowerCase();
    return list.filter((s) => {
      const isClassMatch = !classId
        ? true
        : s.classId === classId || s.classId?._id === classId;
      const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
      const isSearchMatch =
        !query ||
        fullName.includes(query) ||
        String(s.studentId || "")
          .toLowerCase()
          .includes(query);
      return isClassMatch && isSearchMatch;
    });
  };

  const handleClassChange = (e) => {
    const classId = e.target.value;
    setSelectedClass(classId);
    setFilteredStudents(applyFilters(students, classId, inputValue));
  };

  const handleinput = (e) => {
    const query = e.target.value;
    setInputValue(query);
    setFilteredStudents(applyFilters(students, selectedClass, query));
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("collect"); // collect | refund
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [heads, setHeads] = useState([]);
  const [selectedHeadIds, setSelectedHeadIds] = useState([]);
  const [headsLoading, setHeadsLoading] = useState(false);
  const [openVouchers, setOpenVouchers] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [refundPaymentId, setRefundPaymentId] = useState("");
  const [amountToPay, setAmountToPay] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [utr, setUtr] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feeSummary, setFeeSummary] = useState({
    finalFee: 0,
    totalPaid: 0,
    totalDue: 0,
  });

  const selectedHeads = useMemo(
    () => heads.filter((h) => selectedHeadIds.includes(String(h._id))),
    [heads, selectedHeadIds],
  );

  const selectedTotal = useMemo(
    () =>
      Math.round(
        selectedHeads.reduce(
          (sum, h) => sum + Number(h.due || h.amount || 0),
          0,
        ) * 100,
      ) / 100,
    [selectedHeads],
  );

  const remainingDue = Math.max(0, Number(feeSummary.totalDue) || 0);
  const collectCap =
    Math.round(Math.min(selectedTotal, remainingDue) * 100) / 100;

  const loadStudentHeads = async (student) => {
    setHeadsLoading(true);
    try {
      const { data } = await axios.get(
        `${API}/fees/student/${student._id}/heads`,
        { withCredentials: true },
      );
      const list = (data.heads || []).filter((h) => Number(h.amount) > 0);
      const dueBalance = Math.max(
        0,
        Number(
          data.totalDue ??
            Math.round(
              ((Number(data.finalFee ?? student.finalFee) || 0) -
                (Number(data.totalPaid ?? student.totalPaid) || 0)) *
                100,
            ) / 100,
        ) || 0,
      );
      setHeads(list);
      setOpenVouchers(data.openVouchers || []);
      setRecentPayments(data.recentPayments || []);
      setFeeSummary({
        finalFee: data.finalFee ?? student.finalFee ?? 0,
        totalPaid: data.totalPaid ?? student.totalPaid ?? 0,
        totalDue: dueBalance,
      });
      const dueIds = list
        .filter((h) => Number(h.due) > 0)
        .map((h) => String(h._id));
      setSelectedHeadIds(dueIds);
      const headsDue =
        Math.round(
          list
            .filter((h) => dueIds.includes(String(h._id)))
            .reduce((s, h) => s + Number(h.due || 0), 0) * 100,
        ) / 100;
      setAmountToPay(String(Math.min(headsDue, dueBalance)));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load fee heads");
      setHeads([]);
      setSelectedHeadIds([]);
      const fallbackDue = Math.max(
        0,
        Math.round(
          ((Number(student.finalFee) || 0) - (Number(student.totalPaid) || 0)) *
            100,
        ) / 100,
      );
      setAmountToPay(String(fallbackDue));
      setFeeSummary({
        finalFee: student.finalFee || 0,
        totalPaid: student.totalPaid || 0,
        totalDue: fallbackDue,
      });
    } finally {
      setHeadsLoading(false);
    }
  };

  const handleCollectFee = async (student) => {
    setSelectedStudent(student);
    setModalMode("collect");
    setPaymentMode("Cash");
    setUtr("");
    setTransactionId("");
    setRemarks("");
    setRefundPaymentId("");
    setIsModalOpen(true);
    await loadStudentHeads(student);
  };

  const toggleHead = (headId) => {
    const id = String(headId);
    setSelectedHeadIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      const total =
        Math.round(
          heads
            .filter((h) => next.includes(String(h._id)))
            .reduce((s, h) => s + Number(h.due || 0), 0) * 100,
        ) / 100;
      const dueCap = Math.max(0, Number(feeSummary.totalDue) || 0);
      setAmountToPay(String(Math.min(total, dueCap)));
      return next;
    });
  };

  const selectAllDue = () => {
    const dueIds = heads
      .filter((h) => Number(h.due) > 0)
      .map((h) => String(h._id));
    setSelectedHeadIds(dueIds);
    const total =
      Math.round(
        heads
          .filter((h) => dueIds.includes(String(h._id)))
          .reduce((s, h) => s + Number(h.due || 0), 0) * 100,
      ) / 100;
    const dueCap = Math.max(0, Number(feeSummary.totalDue) || 0);
    setAmountToPay(String(Math.min(total, dueCap)));
  };

  const clearHeads = () => {
    setSelectedHeadIds([]);
    setAmountToPay("0");
  };

  const refreshStudentsAfterAction = async () => {
    try {
      const res = await axios.get(`${API}/students`, {
        withCredentials: true,
      });
      const freshStudents = res.data.data;
      if (freshStudents) {
        setStudents(freshStudents);
        setFilteredStudents(
          applyFilters(freshStudents, selectedClass, inputValue),
        );
      }
    } catch {
      toast.error(
        "Action saved, but failed to refresh the list. Please reload.",
      );
    }
  };

  const buildSelectedFeeHeadsPayload = (payAmount) => {
    const full = selectedHeads.map((h) => ({
      feeId: h._id,
      name: h.name,
      amount: Number(h.due || 0),
    }));
    const max =
      Math.round(full.reduce((s, h) => s + Number(h.amount), 0) * 100) / 100;
    const target =
      payAmount != null && Number(payAmount) > 0
        ? Math.min(Number(payAmount), max)
        : max;
    let left = Math.round(target * 100) / 100;
    const allocated = [];
    for (const h of full) {
      if (left <= 0) break;
      const take = Math.min(Number(h.amount) || 0, left);
      if (take <= 0) continue;
      allocated.push({ ...h, amount: Math.round(take * 100) / 100 });
      left = Math.round((left - take) * 100) / 100;
    }
    return allocated;
  };

  const isPartialPay =
    selectedTotal > 0 &&
    Number(amountToPay) > 0 &&
    Number(amountToPay) < selectedTotal - 0.009;

  const confirmPayment = async () => {
    if (!selectedHeads.length) {
      toast.error("Select at least one fee head");
      return;
    }
    if (remainingDue <= 0) {
      toast.error("No remaining fee due for this student");
      return;
    }
    const payAmt = Number(amountToPay);
    if (!payAmt || payAmt <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (payAmt > collectCap + 0.009) {
      toast.error(
        `Amount cannot exceed remaining due ₹${collectCap}${
          selectedTotal > remainingDue
            ? ` (student balance ₹${remainingDue})`
            : ""
        }`,
      );
      return;
    }
    if (paymentMode === "UPI" && !utr.trim()) {
      toast.error("Please enter the UTR number for UPI payment");
      return;
    }
    if (paymentMode === "Online" && !transactionId.trim()) {
      toast.error("Please enter the transaction ID for online payment");
      return;
    }

    const feeHeads = buildSelectedFeeHeadsPayload(payAmt);
    const payload = {
      studentId: selectedStudent._id,
      amountPaid: payAmt,
      paymentMode,
      remarks:
        remarks.trim() ||
        `Fee collection — ${feeHeads.map((h) => h.name).join(", ")}${
          isPartialPay ? " (partial)" : ""
        }`,
      feeHeads,
      ...(paymentMode === "UPI" ? { utr: utr.trim() } : {}),
      ...(paymentMode === "Online"
        ? { transactionId: transactionId.trim() }
        : {}),
    };

    const loadingToast = toast.loading("Processing payment...");
    setSubmitting(true);
    try {
      const response = await axios.post(`${API}/fee-collect`, payload, {
        withCredentials: true,
      });
      toast.dismiss(loadingToast);
      if (response.data.success) {
        toast.success(`₹${amountToPay} collected successfully`);
        const receiptId = response.data?.data?.receipt?._id;
        setIsModalOpen(false);
        await refreshStudentsAfterAction();
        if (receiptId && basePath) {
          navigate(`${basePath}/fees/receipt/${receiptId}`);
        }
      } else {
        toast.error(response.data.message || "Payment failed");
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const createVoucher = async () => {
    if (!selectedHeads.length) {
      toast.error("Select fee heads for the voucher");
      return;
    }
    setSubmitting(true);
    const loadingToast = toast.loading("Creating voucher...");
    try {
      const { data } = await axios.post(
        `${API}/fees/voucher`,
        {
          studentId: selectedStudent._id,
          feeHeads: buildSelectedFeeHeadsPayload(selectedTotal),
          remarks:
            remarks.trim() ||
            `Fee voucher — ${selectedHeads.map((h) => h.name).join(", ")}`,
        },
        { withCredentials: true },
      );
      toast.dismiss(loadingToast);
      if (data.success) {
        toast.success(`Voucher ${data.data.receiptNo} created`);
        const voucherId = data.data?._id;
        setIsModalOpen(false);
        if (voucherId && basePath) {
          navigate(`${basePath}/fees/receipt/${voucherId}`);
        }
      } else {
        toast.error(data.message || "Failed to create voucher");
      }
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.message || "Failed to create voucher");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmRefund = async () => {
    if (!refundPaymentId && (!selectedHeads.length || !amountToPay)) {
      toast.error("Select a payment to refund, or select heads / amount");
      return;
    }
    setSubmitting(true);
    const loadingToast = toast.loading("Processing refund...");
    try {
      const payload = {
        studentId: selectedStudent._id,
        remarks: remarks.trim() || "Fee refund",
      };
      if (refundPaymentId) {
        payload.paymentId = refundPaymentId;
      } else {
        payload.feeHeads = buildSelectedFeeHeadsPayload(Number(amountToPay));
        payload.amount = Number(amountToPay);
      }
      const { data } = await axios.post(`${API}/fees/refund`, payload, {
        withCredentials: true,
      });
      toast.dismiss(loadingToast);
      if (data.success) {
        toast.success("Refund processed");
        const refundId = data.data?.refund?._id;
        setIsModalOpen(false);
        await refreshStudentsAfterAction();
        if (refundId && basePath) {
          navigate(`${basePath}/fees/receipt/${refundId}`);
        }
      } else {
        toast.error(data.message || "Refund failed");
      }
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.message || "Refund failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 text-[rgb(var(--text))]">
      {isMobile && (
        <div className="pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl
                  shadow-sm border border-slate-100
                 text-sm font-bold text-[rgb(var(--text))] bg-[rgb(var(--surface))] active:scale-95 transition-transform mb-2.5"
          >
            <FaArrowLeft size={16} />
            Back
          </button>
        </div>
      )}
      <h1 className="text-2xl font-bold mb-4">Fee Collection</h1>

      <div className="mb-6 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 max-w-2xl shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 text-left">
            <h2 className="text-base font-semibold">Razorpay key setup</h2>
            <p className="text-xs text-[rgb(var(--text-muted))] mt-1">
              Optional for now. Without keys, parents use a development checkout
              (OK button → payment success). Add real keys later for live
              Razorpay.
            </p>
          </div>
          {razorpayStatus === "ready" && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 shrink-0">
              Verified
            </span>
          )}
          {razorpayStatus === "saved" && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 shrink-0">
              Saved — test next
            </span>
          )}
          {razorpayStatus === "error" && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600 shrink-0">
              Needs real keys
            </span>
          )}
        </div>

        <ol className="text-xs text-[rgb(var(--text))] space-y-1.5 mb-4 list-decimal list-inside text-left">
          <li>
            Open{" "}
            <a
              href="https://dashboard.razorpay.com/app/keys"
              target="_blank"
              rel="noreferrer"
              className="text-[rgb(var(--primary))] font-medium underline"
            >
              Razorpay Dashboard → API Keys
            </a>
          </li>
          <li>
            Switch to <strong>Test Mode</strong> (toggle in left sidebar)
          </li>
          <li>
            Copy <strong>Key ID</strong> and generate/copy{" "}
            <strong>Key Secret</strong>
          </li>
          <li>Paste below → Save → Test connection</li>
        </ol>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="text-left">
            <label className="block text-xs font-medium mb-1">Key ID</label>
            <input
              type="text"
              value={razorpayKeyId}
              onChange={(e) => {
                setRazorpayKeyId(e.target.value);
                setRazorpayStatus("");
              }}
              placeholder="rzp_test_xxxxxxxxxxxx"
              className="w-full border border-[rgb(var(--border))] rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))]"
            />
          </div>
          <div className="text-left">
            <label className="block text-xs font-medium mb-1">
              Key Secret {hasRazorpaySecret ? "(leave blank to keep)" : ""}
            </label>
            <input
              type="password"
              value={razorpayKeySecret}
              onChange={(e) => {
                setRazorpayKeySecret(e.target.value);
                setRazorpayStatus("");
              }}
              placeholder={hasRazorpaySecret ? "••••••••" : "Enter secret"}
              className="w-full border border-[rgb(var(--border))] rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))]"
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={saveRazorpaySettings}
            disabled={savingRazorpay}
            className="app-btn-primary px-4 py-2 rounded-lg text-sm disabled:opacity-60"
          >
            {savingRazorpay ? "Saving…" : "1. Save keys"}
          </button>
          <button
            type="button"
            onClick={testRazorpaySettings}
            disabled={testingRazorpay || !hasRazorpaySecret}
            className="app-btn-secondary px-4 py-2 rounded-lg text-sm disabled:opacity-60"
          >
            {testingRazorpay ? "Testing…" : "2. Test connection"}
          </button>
        </div>
      </div>

      <div className="fc-container">
        <div className="fc-search">
          <input
            type="text"
            placeholder="Search by student name or ID"
            value={inputValue}
            className="fc-input w-2xs border-2 rounded-md px-4 py-1 mb-2.5"
            onInput={handleinput}
          />
        </div>

        {classes.length === 0 ? (
          <div> Classs not found</div>
        ) : (
          <div className="flex flex-col gap-2 max-w-xs">
            <label className="text-sm font-semibold text-[rgb(var(--text))]">
              Select class
            </label>
            <select
              onChange={handleClassChange}
              value={selectedClass}
              className="block w-full px-4 py-2 text-[rgb(var(--text))] bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[rgba(var(--primary),0.25)] focus:border-[rgb(var(--primary))] cursor-pointer appearance-none"
            >
              <option
                value=""
                className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
              >
                All Classes
              </option>
              {classes.map((c) => (
                <option
                  key={c._id}
                  value={c._id}
                  className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
                >
                  Class {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mt-6">
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-lg ">
              No students found for this class.
            </div>
          ) : (
            <div className="overflow-x-auto bg-[rgb(var(--surface))] rounded-lg shadow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[rgb(var(--surface))]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium  uppercase tracking-wider">
                      ID / Roll No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium  uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium  uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium  uppercase tracking-wider">
                      Fee Due
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium  uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className=" divide-y divide-gray-100">
                  {filteredStudents.map((student) => {
                    const isSelected =
                      !!selectedStudent?._id &&
                      String(selectedStudent._id) === String(student._id);
                    return (
                      <tr
                        key={student._id}
                        className={`transition-colors ${
                          isSelected
                            ? "bg-[rgba(var(--primary),0.12)]"
                            : "hover:bg-[rgba(var(--primary),0.05)]"
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div
                            className={`text-sm ${
                              isSelected
                                ? "font-extrabold text-[rgb(var(--primary))]"
                                : "font-bold text-[rgb(var(--primary))]"
                            }`}
                          >
                            {student.studentId}
                          </div>
                          <div className="text-xs text-[rgb(var(--text))]">
                            Roll: {student.rollNo}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium ">
                            {student.firstName} {student.lastName}
                          </div>
                          <div className="text-xs ">
                            {student.gender} | {student.bloodGroup}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {student.studentType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm ">
                          <div className="font-medium ">
                            ₹
                            {Math.max(
                              0,
                              Math.round(
                                ((Number(student.finalFee) || 0) -
                                  (Number(student.totalPaid) || 0)) *
                                  100,
                              ) / 100,
                            )}
                          </div>
                          {student.discountValue > 0 && (
                            <div className="text-xs text-red-500">
                              -{student.discountValue} Off
                            </div>
                          )}
                        </td>
                        <td className=" whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleCollectFee(student)}
                            disabled={
                              Math.max(
                                0,
                                (Number(student.finalFee) || 0) -
                                  (Number(student.totalPaid) || 0),
                              ) <= 0
                            }
                            className="inline-flex items-center px-4 py-2 border border-transparent 
                    text-sm font-medium rounded-md shadow-sm text-white bg-[rgb(var(--primary))]
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgb(var(--primary))] transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Collect Fee
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-999 flex items-center justify-center p-3 sm:p-4">
          <div
            className="absolute inset-0 backdrop-blur-[3px] bg-black/20"
            onClick={() => setIsModalOpen(false)}
          ></div>

          <div className="relative bg-[rgb(var(--surface))] text-[rgb(var(--text))] w-full max-w-sm sm:max-w-lg md:max-w-2xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-lg font-black">
                  {modalMode === "refund" ? "Fee Refund" : "Collect Fee"}
                </h2>
                <p className="text-[10px] text-[rgb(var(--primary))] font-bold uppercase tracking-widest">
                  Head-wise payment
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
              <div className="bg-[rgb(var(--surface))] p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-3 sm:gap-4 border border-[rgb(var(--border))]">
                <div className="h-12 w-12 bg-[rgb(var(--primary))] rounded-xl flex items-center justify-center text-white text-xl font-bold shrink-0">
                  {selectedStudent?.firstName?.charAt(0) || "S"}
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="font-bold leading-none">
                    {selectedStudent?.firstName} {selectedStudent?.lastName}
                  </h3>
                  <p className="text-[11px] mt-1">
                    Roll No: {selectedStudent?.rollNo} •{" "}
                    {selectedStudent?.studentId}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-xl border border-slate-100 text-center">
                  <p className="text-[9px] font-bold uppercase">Total</p>
                  <p className="text-sm font-bold">₹{feeSummary.finalFee}</p>
                </div>
                <div className="p-3 rounded-xl border border-green-100 text-center">
                  <p className="text-[9px] font-bold text-green-500 uppercase">
                    Paid
                  </p>
                  <p className="text-sm font-bold text-green-700">
                    ₹{feeSummary.totalPaid || 0}
                  </p>
                </div>
                <div className="p-3 rounded-xl border border-red-100 text-center">
                  <p className="text-[9px] font-bold text-red-400 uppercase">
                    Due
                  </p>
                  <p className="text-sm font-bold text-red-600">
                    ₹{remainingDue}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 p-1 rounded-xl bg-[rgb(var(--bg))] border border-[rgb(var(--border))]">
                <button
                  type="button"
                  onClick={() => setModalMode("collect")}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold ${
                    modalMode === "collect"
                      ? "bg-[rgb(var(--primary))] text-white"
                      : ""
                  }`}
                >
                  Collect / Voucher
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode("refund")}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold ${
                    modalMode === "refund"
                      ? "bg-[rgb(var(--primary))] text-white"
                      : ""
                  }`}
                >
                  Refund
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-bold uppercase">
                    Fee heads
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllDue}
                      className="text-[10px] font-semibold text-[rgb(var(--primary))]"
                    >
                      Select due
                    </button>
                    <button
                      type="button"
                      onClick={clearHeads}
                      className="text-[10px] font-semibold text-slate-500"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {headsLoading ? (
                  <p className="text-sm text-[rgb(var(--text-muted))]">
                    Loading fee heads…
                  </p>
                ) : heads.length === 0 ? (
                  <p className="text-sm text-[rgb(var(--text-muted))] border border-dashed rounded-xl p-4 text-center">
                    No fee structure heads found for this student&apos;s class.
                    Add heads in Fee Structure (Tuition, Hostel, Transport…).
                  </p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {heads.map((head) => {
                      const id = String(head._id);
                      const checked = selectedHeadIds.includes(id);
                      const due = Number(head.due || 0);
                      const disabled =
                        modalMode === "collect" ? due <= 0 : false;
                      return (
                        <label
                          key={id}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                            checked
                              ? "border-[rgb(var(--primary))] bg-[rgba(var(--primary),0.06)]"
                              : "border-[rgb(var(--border))]"
                          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggleHead(id)}
                            className="h-4 w-4 accent-[rgb(var(--primary))]"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">
                              {head.name}
                              {head.isOptional ? (
                                <span className="ml-2 text-[10px] font-medium text-amber-600">
                                  Optional
                                </span>
                              ) : null}
                            </p>
                            <p className="text-[11px] text-[rgb(var(--text-muted))]">
                              Amount ₹{head.amount} · Paid ₹{head.paid} · Due ₹
                              {due}
                            </p>
                          </div>
                          <div className="text-sm font-bold shrink-0">
                            ₹{due}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-[rgb(var(--border))] p-4 bg-[rgb(var(--bg))]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[rgb(var(--text-muted))]">
                      Selected total
                    </p>
                    <p className="text-2xl font-black text-[rgb(var(--primary))]">
                      ₹{selectedTotal}
                    </p>
                    <p className="text-[11px] text-[rgb(var(--text-muted))] mt-0.5">
                      {selectedHeads.length
                        ? selectedHeads.map((h) => h.name).join(", ")
                        : "No heads selected"}
                    </p>
                  </div>
                  {isPartialPay && (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      Partial
                    </span>
                  )}
                </div>
              </div>

              {modalMode === "refund" && (
                <div>
                  <label className="text-[10px] font-bold uppercase ml-1">
                    Refund against payment (optional)
                  </label>
                  <select
                    value={refundPaymentId}
                    onChange={(e) => setRefundPaymentId(e.target.value)}
                    className="w-full mt-1 px-3 py-2.5 border rounded-xl text-sm bg-[rgb(var(--surface))]"
                  >
                    <option value="">Use selected heads / amount</option>
                    {recentPayments.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.receiptNo} · ₹{p.amountPaid} ·{" "}
                        {new Date(p.paidDate).toLocaleDateString("en-IN")}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {modalMode === "collect" && (
                <>
                  <div>
                    <div className="flex items-center justify-between gap-2 ml-1">
                      <label className="text-[10px] font-bold uppercase">
                        Amount to collect
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setAmountToPay(String(collectCap))}
                          className="text-[10px] font-semibold text-[rgb(var(--primary))]"
                        >
                          Full due
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const half =
                              Math.round((collectCap / 2) * 100) / 100;
                            setAmountToPay(half > 0 ? String(half) : "0");
                          }}
                          className="text-[10px] font-semibold text-amber-700"
                        >
                          Half
                        </button>
                      </div>
                    </div>
                    <div className="relative mt-1">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="1"
                        max={collectCap || undefined}
                        step="0.01"
                        value={amountToPay}
                        onChange={(e) => setAmountToPay(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 border-2 focus:border-[rgb(var(--primary))] rounded-xl outline-none font-bold text-[rgb(var(--primary))]"
                        placeholder="Enter partial or full amount"
                      />
                    </div>
                    <p className="text-[11px] text-[rgb(var(--text-muted))] mt-1.5 ml-1">
                      Partial payment allowed — enter any amount up to ₹
                      {collectCap} (student due ₹{remainingDue}).
                    </p>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[rgb(var(--primary))] uppercase ml-1">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {["Cash", "UPI", "Cheque", "Online"].map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            setPaymentMode(mode);
                            if (mode !== "UPI") setUtr("");
                            if (mode !== "Online") setTransactionId("");
                          }}
                          className={`py-3 px-2 rounded-xl border-2 text-xs font-bold transition-all ${
                            paymentMode === mode
                              ? "border-[rgb(var(--primary))] text-[rgb(var(--primary))]"
                              : "border-slate-50 text-[rgb(var(--text))]"
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {paymentMode === "UPI" && (
                    <div>
                      <label className="text-[10px] font-bold text-[rgb(var(--primary))] uppercase ml-1">
                        UTR Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={utr}
                        onChange={(e) => setUtr(e.target.value)}
                        className="w-full mt-1 px-4 py-3 border-2 focus:border-[rgb(var(--primary))] rounded-xl outline-none font-medium text-sm"
                        placeholder="Enter 12-digit UTR / UPI reference"
                      />
                    </div>
                  )}

                  {paymentMode === "Online" && (
                    <div>
                      <label className="text-[10px] font-bold text-[rgb(var(--primary))] uppercase ml-1">
                        Transaction ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        className="w-full mt-1 px-4 py-3 border-2 focus:border-[rgb(var(--primary))] rounded-xl outline-none font-medium text-sm"
                        placeholder="Enter bank / gateway transaction ID"
                      />
                    </div>
                  )}

                  {openVouchers.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      Open vouchers:{" "}
                      {openVouchers
                        .map((v) => `${v.receiptNo} (₹${v.amountPaid})`)
                        .join(", ")}
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="text-[10px] font-bold uppercase ml-1">
                  Remarks
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full mt-1 px-4 py-2.5 border rounded-xl text-sm"
                  placeholder="Optional note"
                />
              </div>
            </div>

            <div className="px-4 sm:px-6 py-4 border-t border-slate-100 flex flex-wrap gap-2 shrink-0">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 min-w-[90px] py-3 text-sm font-bold border rounded-xl"
                disabled={submitting}
              >
                Cancel
              </button>
              {modalMode === "collect" ? (
                <>
                  <button
                    onClick={createVoucher}
                    disabled={submitting || !selectedHeads.length}
                    className="flex-1 min-w-[110px] py-3 border-2 border-[rgb(var(--primary))] text-[rgb(var(--primary))] rounded-xl font-bold text-sm disabled:opacity-50"
                  >
                    Cut Voucher
                  </button>
                  <button
                    onClick={confirmPayment}
                    disabled={
                      submitting ||
                      !selectedHeads.length ||
                      remainingDue <= 0 ||
                      collectCap <= 0
                    }
                    className="flex-[1.4] min-w-[120px] py-3 bg-[rgb(var(--primary))] text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all disabled:opacity-50"
                  >
                    Pay Now
                  </button>
                </>
              ) : (
                <button
                  onClick={confirmRefund}
                  disabled={submitting}
                  className="flex-[2] py-3 bg-red-600 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  Process Refund
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FeeCollection;
