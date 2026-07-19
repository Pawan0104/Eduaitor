import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { FaArrowLeft, FaPrint, FaDownload } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

const fmtINR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";

export default function FeeReceipt() {
  const { paymentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const basePath = (() => {
    if (user?.role === "super_admin") return "/admin";
    if (user?.role === "school_admin") return "/school";
    if (user?.role === "staff_admin") return "/staff";
    if (user?.role === "student_admin")
      return user.loginAs === "parent" ? "/parent" : "/student";
    return "";
  })();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data: res } = await axios.get(
          `${API}/fees/receipt/${paymentId}`,
          { withCredentials: true },
        );
        setData(res);
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load receipt");
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    if (paymentId) load();
  }, [paymentId]);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="p-10 text-center text-[rgb(var(--text-light))]">
        Loading receipt…
      </div>
    );
  }

  if (!data?.receipt) {
    return (
      <div className="p-10 text-center">
        <p className="mb-4 text-[rgb(var(--text-light))]">Receipt not found.</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-lg border text-sm"
        >
          Go back
        </button>
      </div>
    );
  }

  const { receipt, student, school } = data;

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen text-[rgb(var(--text))]">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
        <div>
          <button
            type="button"
            onClick={() =>
              navigate(
                user?.role === "student_admin"
                  ? `${basePath}/fees`
                  : `${basePath}/fee-history`,
              )
            }
            className="flex items-center gap-2 px-3 py-1.5 mb-3 rounded-xl bg-[rgb(var(--surface))] border text-sm font-bold"
          >
            <FaArrowLeft /> Back
          </button>
          <h1 className="text-2xl font-bold">Fee Receipt</h1>
          <p className="text-sm text-[rgb(var(--text-light))] mt-1">
            {receipt.receiptNo} · Print or save as PDF
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium flex items-center gap-2"
          >
            <FaPrint /> Print / Download PDF
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 rounded-lg bg-[rgb(var(--primary))] text-sm font-medium flex items-center gap-2"
          >
            <FaDownload /> Save
          </button>
        </div>
      </div>

      <div className="flex justify-center">
        <div
          id="fee-receipt-print"
          className="w-full max-w-[720px] bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-lg overflow-hidden"
        >
          <div className="px-6 py-5 bg-slate-900 text-white flex items-start gap-4">
            {school?.logo ? (
              <img
                src={school.logo}
                alt=""
                className="w-14 h-14 rounded-lg object-contain bg-white p-1"
              />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-white/15 flex items-center justify-center text-xl font-black">
                {(school?.name || "S").charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-lg font-black leading-tight">
                {school?.name || "School"}
              </p>
              {school?.address && (
                <p className="text-xs opacity-80 mt-1">{school.address}</p>
              )}
              <p className="text-xs opacity-80 mt-0.5">
                {[school?.phone, school?.email].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] uppercase tracking-wider opacity-70">
                Fee Receipt
              </p>
              <p className="text-sm font-mono font-bold mt-1">
                {receipt.receiptNo}
              </p>
            </div>
          </div>

          <div className="px-6 py-5 grid sm:grid-cols-2 gap-4 text-sm border-b border-slate-100">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                Student
              </p>
              <p className="font-bold text-base mt-1">{student.name}</p>
              <p className="text-slate-600 text-xs mt-1">
                ID: {student.studentId || "—"}
                {student.rollNo ? ` · Roll ${student.rollNo}` : ""}
              </p>
              <p className="text-slate-600 text-xs">
                Class {student.className || "—"}
                {student.sectionName ? ` – ${student.sectionName}` : ""}
              </p>
              {student.fatherName && (
                <p className="text-slate-600 text-xs">
                  Father: {student.fatherName}
                </p>
              )}
            </div>
            <div className="sm:text-right">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                Payment details
              </p>
              <p className="font-bold text-base mt-1">{fmtDate(receipt.paidDate)}</p>
              <p className="text-slate-600 text-xs mt-1">
                Mode: {receipt.paymentMode}
              </p>
              {receipt.paymentMode === "UPI" && receipt.utr && (
                <p className="text-slate-600 text-xs mt-1">
                  UTR:{" "}
                  <span className="font-mono font-semibold text-slate-800">
                    {receipt.utr}
                  </span>
                </p>
              )}
              {receipt.paymentMode === "Online" && (
                <div className="mt-1 space-y-0.5 text-[11px] text-slate-500 font-mono">
                  {(receipt.transactionId || receipt.razorpayPaymentId) && (
                    <p>
                      Txn ID:{" "}
                      <span className="font-semibold text-slate-700">
                        {receipt.transactionId || receipt.razorpayPaymentId}
                      </span>
                    </p>
                  )}
                  {receipt.razorpayOrderId && (
                    <p>
                      Order ID:{" "}
                      <span className="font-semibold text-slate-700">
                        {receipt.razorpayOrderId}
                      </span>
                    </p>
                  )}
                  {receipt.razorpayPaymentId &&
                    receipt.transactionId &&
                    receipt.transactionId !== receipt.razorpayPaymentId && (
                      <p>
                        Payment ID:{" "}
                        <span className="font-semibold text-slate-700">
                          {receipt.razorpayPaymentId}
                        </span>
                      </p>
                    )}
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="pb-2 font-bold">Description</th>
                  <th className="pb-2 font-bold text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-3">
                    School fee payment
                    {receipt.remarks ? (
                      <span className="block text-xs text-slate-500 mt-0.5">
                        {receipt.remarks}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-3 text-right font-semibold">
                    {fmtINR(receipt.amountPaid)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td className="pt-4 font-black text-base">Amount received</td>
                  <td className="pt-4 text-right font-black text-lg text-emerald-700">
                    {fmtINR(receipt.amountPaid)}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs bg-slate-50 rounded-xl p-3">
              <div>
                <p className="text-slate-500">Final fee</p>
                <p className="font-bold mt-0.5">{fmtINR(student.finalFee)}</p>
              </div>
              <div>
                <p className="text-slate-500">Total paid</p>
                <p className="font-bold mt-0.5">{fmtINR(student.totalPaid)}</p>
              </div>
              <div>
                <p className="text-slate-500">Balance due</p>
                <p className="font-bold mt-0.5">{fmtINR(student.totalDue)}</p>
              </div>
            </div>

            <p className="mt-6 text-[11px] text-slate-500 text-center">
              This is a computer-generated receipt. No signature required.
            </p>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-[rgb(var(--text-light))] mt-4 print:hidden">
        Tip: In the print dialog, choose “Save as PDF” to download the receipt.
      </p>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #fee-receipt-print, #fee-receipt-print * { visibility: visible !important; }
          #fee-receipt-print {
            position: absolute;
            left: 50%;
            top: 0;
            transform: translateX(-50%);
            width: 100%;
            max-width: 720px;
            box-shadow: none !important;
            border: none !important;
          }
          @page { size: auto; margin: 12mm; }
        }
      `}</style>
    </div>
  );
}
