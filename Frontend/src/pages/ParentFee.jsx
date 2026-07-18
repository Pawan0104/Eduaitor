import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { toast } from "react-toastify";

// ─── Mock data for development (replace with real API call) ───────────────────
const MOCK_DATA = {
  student: {
    name: "Aryan Kumar",
    className: "Class 9",
    section: "A",
    rollNo: "14",
    academicYear: "2024–25",
  },
  feeStructure: [
    { _id: "1", name: "Tuition Fee", amount: 36000, isOptional: false },
    { _id: "2", name: "Annual Charges", amount: 5000, isOptional: false },
    { _id: "3", name: "Exam Fee", amount: 3000, isOptional: false },
    { _id: "4", name: "Library Fee", amount: 1500, isOptional: false },
    { _id: "5", name: "Sports Fee", amount: 2000, isOptional: true },
    { _id: "6", name: "Computer Lab", amount: 2500, isOptional: true },
  ],
  totalFees: 50000,
  totalPaid: 40000,
  balanceDue: 10000,
  paidPercent: 80,
  payments: [
    {
      _id: "p1",
      receiptNo: "RCP-001",
      amountPaid: 15000,
      paymentMode: "UPI",
      paidDate: "2024-04-05",
      remarks: "Q1 installment",
    },
    {
      _id: "p2",
      receiptNo: "RCP-002",
      amountPaid: 10000,
      paymentMode: "Cash",
      paidDate: "2024-07-12",
      remarks: "Q2 installment",
    },
    {
      _id: "p3",
      receiptNo: "RCP-003",
      amountPaid: 10000,
      paymentMode: "Online",
      paidDate: "2024-10-03",
      remarks: "Q3 installment",
    },
    {
      _id: "p4",
      receiptNo: "RCP-004",
      amountPaid: 5000,
      paymentMode: "Cheque",
      paidDate: "2025-01-18",
      remarks: "",
    },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtINR = (v) =>
  "₹" + Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const fmtShortDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const initials = (name = "") =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

// ─── Sub-components ───────────────────────────────────────────────────────────

const ModeBadge = ({ mode }) => {
  const styles = {
    UPI: "bg-blue-50   text-blue-700   border-blue-200",
    Cash: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Online: "bg-violet-50 text-violet-700 border-violet-200",
    Cheque: "bg-amber-50  text-amber-700  border-amber-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[mode] || "bg-[rgb(var(--surface))] text-gray-600 border-gray-200"}`}
    >
      {mode}
    </span>
  );
};

const StatusChip = ({ pct }) => {
  if (pct >= 100)
    return (
      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
        Fully paid
      </span>
    );
  if (pct >= 50)
    return (
      <span className="text-xs font-medium text-amber-600  bg-amber-50  border border-amber-200  px-2 py-0.5 rounded-full">
        Partial
      </span>
    );
  return (
    <span className="text-xs font-medium text-red-600    bg-red-50    border border-red-200    px-2 py-0.5 rounded-full">
      Due
    </span>
  );
};

// Animated progress bar
const ProgressBar = ({ pct }) => {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 300);
    return () => clearTimeout(t);
  }, [pct]);
  const color =
    pct >= 100
      ? "bg-emerald-500"
      : pct >= 60
        ? "bg-indigo-500"
        : pct >= 30
          ? "bg-amber-500"
          : "bg-red-500";
  return (
    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
};

// Summary metric card
const MetricCard = ({ label, value, sub, valueClass = "" }) => (
  <div className="bg-[rgb(var(--surface))] rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1">
    <p className="text-xs font-medium text-[rgb(var(--text))] uppercase tracking-wider">
      {label}
    </p>
    <p className={`text-xl font-semibold leading-tight ${valueClass}`}>
      {value}
    </p>
    {sub && <p className="text-xs text-[rgb(var(--text))] mt-0.5">{sub}</p>}
  </div>
);

// Tab button
const Tab = ({ label, active, onClick, count }) => (
  <button
    onClick={onClick}
    className={`relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200
      ${
        active
          ? "bg-[rgb(var(--primary))] text-[rgb(var(--text))] shadow-sm"
          : "text-[rgb(var(--primary))] hover:text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
      }`}
  >
    {label}
    {count != null && (
      <span
        className={`text-xs px-1.5 py-0.5 rounded-full font-semibold
        ${active ? "bg-[rgb(var(--primary))] text-[rgb(var(--text))]" : "bg-[rgb(var(--surface))] text-[rgb(var(--text))]"}`}
      >
        {count}
      </span>
    )}
  </button>
);

// Skeleton loader
const Skeleton = () => (
  <div className="animate-pulse space-y-4 p-4">
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-full bg-gray-200" />
      <div className="space-y-2 flex-1">
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-20 bg-gray-200 rounded-2xl" />
      ))}
    </div>
    <div className="h-3 bg-gray-200 rounded" />
    <div className="space-y-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-12 bg-gray-200 rounded-xl" />
      ))}
    </div>
  </div>
);

// ─── Fee Structure Tab ────────────────────────────────────────────────────────
const FeeStructureTab = ({ feeStructure, totalFees }) => {
  const required = feeStructure.filter((f) => !f.isOptional);
  const optional = feeStructure.filter((f) => f.isOptional);

  const Section = ({ title, items }) => (
    <div className="mb-4 last:mb-0">
      <p className="text-xs font-semibold text-[rgb(var(--text))] uppercase tracking-wider mb-2 px-1">
        {title}
      </p>
      <div className="bg-[rgb(var(--surface))] rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {items.map((f, i) => (
          <div
            key={f._id}
            className={`flex items-center justify-between px-4 py-3 ${i < items.length - 1 ? "border-b border-gray-50" : ""}`}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-300 shrink-0" />
              <span className="text-sm text-[rgb(var(--text))]">{f.name}</span>
            </div>
            <span className="text-sm font-semibold text-[rgb(var(--text))]">
              {fmtINR(f.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      {required.length > 0 && (
        <Section title="Mandatory fees" items={required} />
      )}
      {optional.length > 0 && (
        <Section title="Optional fees" items={optional} />
      )}

      {/* Total row */}
      <div className="flex items-center justify-between bg-indigo-600 text-white rounded-2xl px-4 py-3.5 mt-2 shadow-sm shadow-indigo-200">
        <span className="text-sm font-semibold">Final annual fees</span>
        <span className="text-base font-bold">{fmtINR(totalFees)}</span>
      </div>
    </div>
  );
};

// ─── Payment History Tab ──────────────────────────────────────────────────────
const PaymentHistoryTab = ({ payments, onOpenReceipt }) => {
  if (!payments.length)
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[rgb(var(--text))] gap-3">
        <svg
          className="w-10 h-10 text-[rgb(var(--text))]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="text-sm">No payments recorded yet</p>
      </div>
    );

  const sorted = [...payments].sort(
    (a, b) => new Date(b.paidDate) - new Date(a.paidDate),
  );

  return (
    <div className="space-y-3">
      {sorted.map((p, i) => (
        <div
          key={p._id}
          className="bg-[rgb(var(--surface))] rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 flex items-center gap-3"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          {/* Icon circle */}
          <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
            <svg
              className="w-4 h-4 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-[rgb(var(--text))]">
                {fmtINR(p.amountPaid)}
              </span>
              <ModeBadge mode={p.paymentMode} />
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-[rgb(var(--text))]">
                {fmtShortDate(p.paidDate)}
              </span>
              {p.remarks && (
                <>
                  <span className="text-[rgb(var(--text))]">·</span>
                  <span className="text-xs text-[rgb(var(--text))] truncate max-w-30">
                    {p.remarks}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Receipt */}
          <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
            <span className="text-xs font-mono text-[rgb(var(--text))] bg-[rgb(var(--surface))] border border-gray-100 px-2 py-1 rounded-lg">
              {p.receiptNo}
            </span>
            <button
              type="button"
              onClick={() => onOpenReceipt?.(p._id)}
              className="text-[11px] font-bold text-emerald-700 hover:underline"
            >
              Download receipt
            </button>
          </div>
        </div>
      ))}

      {/* Running total */}
      <div className="flex justify-between items-center bg-[rgb(var(--surface))] rounded-2xl border border-gray-100 px-4 py-3 mt-1">
        <span className="text-xs font-medium text-[rgb(var(--text))]">
          {payments.length} payment{payments.length !== 1 ? "s" : ""} total
        </span>
        <span className="text-sm font-bold text-[rgb(var(--text))]">
          {fmtINR(payments.reduce((s, p) => s + p.amountPaid, 0))}
        </span>
      </div>
    </div>  
  );
};

// ─── Summary Tab (overview with mini chart) ───────────────────────────────────
const SummaryTab = ({ data }) => {
  const { finalFee, totalPaid, balanceDue, paidPercent, payments } = data;

  // build monthly bars from payments
  const monthly = {};
  (payments || []).forEach((p) => {
    const key = new Date(p.paidDate).toLocaleDateString("en-IN", {
      month: "short",
      year: "2-digit",
    });
    monthly[key] = (monthly[key] || 0) + p.amountPaid;
  });
  const monthKeys = Object.keys(monthly);
  const maxVal = Math.max(...Object.values(monthly), 1);

  return (
    <div className="space-y-4">
      {/* Donut summary */}
      <div className="bg-[rgb(var(--surface))] rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-5">
          {/* SVG donut */}
          <div className="relative shrink-0">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="32"
                fill="none"
                stroke="#f3f4f6"
                strokeWidth="10"
              />
              <circle
                cx="40"
                cy="40"
                r="32"
                fill="none"
                stroke={
                  paidPercent >= 100
                    ? "#10b981"
                    : paidPercent >= 60
                      ? "#6366f1"
                      : "#f59e0b"
                }
                strokeWidth="10"
                strokeDasharray={`${(paidPercent / 100) * 201} 201`}
                strokeLinecap="round"
                transform="rotate(-90 40 40)"
                style={{ transition: "stroke-dasharray 0.8s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-[rgb(var(--text))]">
                {paidPercent}%
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2.5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                <span className="text-xs text-[rgb(var(--text))]">Paid</span>
              </div>
              <span className="text-sm font-semibold text-[rgb(var(--text))]">
                {fmtINR(totalPaid)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400 shrink-0" />
                <span className="text-xs text-[rgb(var(--text))]">Due</span>
              </div>
              <span className="text-sm font-semibold text-red-500">
                {fmtINR(balanceDue)}
              </span>
            </div>
            <div className="border-t border-gray-50 pt-2 flex justify-between items-center">
              <span className="text-xs text-[rgb(var(--text))]">Total</span>
              <span className="text-sm font-bold text-[rgb(var(--text))]">
                {fmtINR(finalFee)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly payment bars */}
      {monthKeys.length > 0 && (
        <div className="bg-[rgb(var(--surface))] rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-[rgb(var(--text))] uppercase tracking-wider mb-4">
            Monthly payments
          </p>
          <div className="flex items-end gap-2 h-24">
            {monthKeys.map((k) => {
              const h = Math.round((monthly[k] / maxVal) * 96);
              return (
                <div
                  key={k}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <span className="text-[10px] text-[rgb(var(--text))] font-medium">
                    {(monthly[k] / 1000).toFixed(0)}k
                  </span>
                  <div
                    className="w-full rounded-t-md bg-[rgb(var(--primary))] transition-all duration-700"
                    style={{ height: `${h}px` }}
                  />
                  <span className="text-[9px] text-[rgb(var(--text))] text-center leading-tight">
                    {k}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Last payment info */}
      {payments?.length > 0 &&
        (() => {
          const last = [...payments].sort(
            (a, b) => new Date(b.paidDate) - new Date(a.paidDate),
          )[0];
          return (
            <div className="bg-[rgb(var(--surface))]  border border-emerald-100 rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <svg
                  className="w-4 h-4 text-emerald-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium ">
                  Last payment
                </p>
                <p className="text-sm font-semibold">
                  {fmtINR(last.amountPaid)} on {fmtDate(last.paidDate)}
                </p>
              </div>
              <ModeBadge mode={last.paymentMode} />
            </div>
          );
        })()}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ParentFee({ studentId, token }) {
  const [feeData, setFeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [payAmount, setPayAmount] = useState("");
  const [paying, setPaying] = useState(false);
  const [devCheckout, setDevCheckout] = useState(null); // { orderId, amountRupees }
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  const API = import.meta.env.VITE_API_URL;

  const fetchFeeDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API}/fees/parent/student/me`, {
        withCredentials: true,
      });
      setFeeData(res.data);
      const due = Math.max(
        0,
        Number(res.data?.balanceDue) ||
          Number(res.data?.totalDue) ||
          Number(res.data?.finalFee) - Number(res.data?.totalPaid) ||
          0,
      );
      setPayAmount(due > 0 ? String(due) : "");
    } catch (e) {
      setError(
        e?.response?.data?.message || e.message || "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeeDetails();
  }, []);

  const verifyPayment = async (payload, amount) => {
    const verifyRes = await axios.post(
      `${API}/fees/razorpay/verify`,
      {
        ...payload,
        studentId: feeData?.student?._id,
        amountPaid: amount,
      },
      { withCredentials: true },
    );

    if (verifyRes.data?.success) {
      toast.success("Payment successful");
      await fetchFeeDetails();
      return true;
    }
    toast.error(verifyRes.data?.message || "Payment verification failed");
    return false;
  };

  const completeDevPayment = async () => {
    if (!devCheckout) return;
    try {
      setPaying(true);
      await verifyPayment(
        {
          orderId: devCheckout.orderId,
          paymentId: `pay_local_${Date.now()}`,
          signature: "local_test_signature",
        },
        Number(devCheckout.amountRupees),
      );
      setDevCheckout(null);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Payment verification failed",
      );
    } finally {
      setPaying(false);
    }
  };

  const handleOnlinePay = async () => {
    const amount = Number(payAmount);
    const due = Math.max(
      0,
      Number(feeData?.balanceDue) ||
        Number(feeData?.totalDue) ||
        Number(feeData?.finalFee) - Number(feeData?.totalPaid) ||
        0,
    );

    if (!amount || amount <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }
    if (due > 0 && amount > due) {
      toast.error("Amount cannot be more than remaining fee");
      return;
    }

    try {
      setPaying(true);

      const { data } = await axios.post(
        `${API}/fees/razorpay/order`,
        {
          studentId: feeData?.student?._id,
          amount,
        },
        { withCredentials: true },
      );

      if (!data?.success) {
        toast.error(data?.message || "Could not start payment");
        setPaying(false);
        return;
      }

      // Development gateway: open mock Razorpay screen with OK button
      if (data.mock) {
        setDevCheckout({
          orderId: data.orderId,
          amountRupees: amount,
          studentName: feeData?.student?.name || "Student",
        });
        setPaying(false);
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        toast.error("Unable to load Razorpay checkout");
        setPaying(false);
        return;
      }

      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency || "INR",
        name: "School Fee Payment",
        description: `Fee payment for ${feeData?.student?.name || "student"}`,
        order_id: data.orderId,
        prefill: {
          name: feeData?.student?.name || "",
        },
        handler: async (response) => {
          try {
            await verifyPayment(
              {
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              },
              amount,
            );
          } catch (err) {
            toast.error(
              err?.response?.data?.message || "Payment verification failed",
            );
          } finally {
            setPaying(false);
          }
        },
        theme: { color: "#4f46e5" },
        modal: {
          ondismiss: () => setPaying(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp) => {
        toast.error(
          resp?.error?.description || "Payment failed. Please try again.",
        );
        setPaying(false);
      });
      rzp.open();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Could not start online payment",
      );
      setPaying(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[rgb(var(--surface))]">
        <Skeleton />
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen bg-[rgb(var(--bg))] flex items-center justify-center p-6">
        <div className="bg-[rgb(var(--surface))] rounded-2xl border border-red-100 shadow-sm p-6 max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-6 h-6 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-sm font-semibold text-[rgb(var(--text))] mb-1">
            Failed to load
          </p>
          <p className="text-xs text-[rgb(var(--text))] mb-4">{error}</p>
          <button
            onClick={() => fetchFeeDetails()}
            className="text-sm text-indigo-600 font-medium hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );

  const {
    student,
    feeStructure,
    totalFee,
    finalFee,
    discountType,
    discountValue,
    discountAmount,
    totalPaid,
    balanceDue,
    totalDue,
    paidPercent,
    payments,
  } = feeData;

  const remainingDue = Math.max(
    0,
    Number(balanceDue) ||
      Number(totalDue) ||
      Number(finalFee) - Number(totalPaid) ||
      0,
  );

  const discountSub =
    discountAmount > 0
      ? discountType === "Percentage"
        ? `${discountValue}% off`
        : discountType === "Rupees"
          ? `${fmtINR(discountValue)} off`
          : "Applied"
      : "No discount";

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))]">
      {/* ── Top header bar ──────────────────────────────────────────────────── */}

      {/* Back button (mobile) */}
      {isMobile && (
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-3 py-1.5 mb-4 rounded-xl
                     bg-[rgb(var(--surface))] shadow-sm border border-slate-100
                     text-sm font-bold text-slate-600 active:scale-95 transition-transform"
        >
          <FaArrowLeft size={14} /> Back
        </button>
      )}

      <div className="max-w-2xl mx-auto px-4 pb-8">
        {/* ── Student card ────────────────────────────────────────────────── */}
        <div className=" rounded-2xl mt-4 p-4 shadow-md text-[rgb(var(--text))] bg-[rgb(var(--surface))] flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[rgb(var(--primary))]  flex items-center justify-center text-[rgb(var(--text))] font-bold text-lg shrink-0 border-2">
            {initials(student.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[rgb(var(--primary))] font-semibold text-base truncate">
              {student.name}
            </p>
            <p className=" text-xs mt-0.5">
              {student.className} – Sec {student.section} &nbsp;·&nbsp; Roll No.{" "}
              {student.rollNo}
            </p>
          </div>
        </div>

        {/* ── Metric cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-4">
          <MetricCard
            label="Total fee"
            value={fmtINR(totalFee)}
            valueClass="text-[rgb(var(--text))]"
          />
          <MetricCard
            label="Discount"
            value={discountAmount > 0 ? fmtINR(discountAmount) : fmtINR(0)}
            valueClass={discountAmount > 0 ? "text-amber-600" : "text-[rgb(var(--text))]"}
            sub={discountSub}
          />
          <MetricCard
            label="Final fee"
            value={fmtINR(finalFee)}
            valueClass="text-indigo-600"
            sub={`${paidPercent}% paid`}
          />
          <MetricCard
            label="Remaining fee"
            value={fmtINR(remainingDue)}
            valueClass={remainingDue > 0 ? "text-red-500" : "text-emerald-600"}
            sub={remainingDue === 0 ? "Cleared" : "Pending"}
          />
        </div>

        {/* ── Online payment ──────────────────────────────────────────────── */}
        <div className="mt-4 bg-[rgb(var(--surface))] rounded-2xl border border-indigo-100 shadow-sm p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-semibold text-[rgb(var(--text))]">
                Pay Fee
              </p>
              <p className="text-xs text-[rgb(var(--text))] mt-0.5">
                {remainingDue > 0
                  ? "Pay remaining fees online via UPI / Card / NetBanking."
                  : "No pending dues right now. You can still open payment history below."}
              </p>
            </div>
            {remainingDue > 0 && (
              <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600">
                Due {fmtINR(remainingDue)}
              </span>
            )}
          </div>

          {remainingDue > 0 ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-[rgb(var(--text))] mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  max={remainingDue}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-[rgb(var(--surface))] text-[rgb(var(--text))]"
                  placeholder="Enter amount"
                />
              </div>
              <button
                type="button"
                onClick={handleOnlinePay}
                disabled={paying}
                className="sm:self-end px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
              >
                {paying ? "Processing…" : "Pay Fee"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-[rgb(var(--text))]"
            >
              View payment history
            </button>
          )}
        </div>

        {/* ── Progress bar ────────────────────────────────────────────────── */}
        <div className="mt-4 bg-[rgb(var(--surface))] rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5">
          <div className="flex justify-between text-xs text-[rgb(var(--text))] mb-2">
            <span>Payment progress</span>
            <span className="font-medium">
              {paidPercent}% of {fmtINR(finalFee)}
            </span>
          </div>
          <ProgressBar pct={paidPercent} />
          <div className="flex justify-between text-[11px] text-[rgb(var(--text))] mt-1.5">
            <span>{fmtINR(totalPaid)} paid</span>
            <span>{fmtINR(remainingDue)} remaining</span>
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div className="flex gap-2 mt-5 overflow-x-auto pb-1 no-scrollbar">
          <Tab
            label="Overview"
            active={activeTab === "summary"}
            onClick={() => setActiveTab("summary")}
          />
          <Tab
            label="Structure"
            active={activeTab === "structure"}
            onClick={() => setActiveTab("structure")}
            count={feeStructure.length}
          />
          <Tab
            label="History"
            active={activeTab === "history"}
            onClick={() => setActiveTab("history")}
            count={payments.length}
          />
        </div>

        {/* ── Tab panels ──────────────────────────────────────────────────── */}
        <div className="mt-4">
          {activeTab === "summary" && (
            <SummaryTab
              data={{
                finalFee,
                totalPaid,
                balanceDue: remainingDue,
                paidPercent,
                payments,
              }}
            />
          )}
          {activeTab === "structure" && (
            <FeeStructureTab
              feeStructure={feeStructure}
              totalFees={finalFee}
            />
          )}
          {activeTab === "history" && (
            <PaymentHistoryTab
              payments={payments}
              onOpenReceipt={(id) => navigate(`/parent/fees/receipt/${id}`)}
            />
          )}
        </div>
      </div>

      {/* Development Razorpay mock gateway */}
      {devCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="bg-[#072654] px-5 py-4 text-white">
              <p className="text-xs uppercase tracking-wider text-blue-200">
                Razorpay · Test Mode
              </p>
              <p className="mt-1 text-lg font-semibold">School Fee Payment</p>
            </div>
            <div className="space-y-4 p-5 text-slate-800">
              <p className="text-sm text-slate-500">
                Development gateway — click OK to simulate a successful payment.
              </p>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Student</span>
                  <span className="font-medium">{devCheckout.studentName}</span>
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-slate-500">Amount</span>
                  <span className="text-lg font-bold text-indigo-700">
                    {fmtINR(devCheckout.amountRupees)}
                  </span>
                </div>
                <div className="mt-2 flex justify-between text-xs text-slate-400">
                  <span>Order</span>
                  <span className="font-mono">{devCheckout.orderId}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDevCheckout(null)}
                  disabled={paying}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={completeDevPayment}
                  disabled={paying}
                  className="flex-1 rounded-xl bg-[#072654] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {paying ? "Confirming…" : "OK — Pay"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
