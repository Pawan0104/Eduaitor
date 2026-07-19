import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

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
  const [razorpayStatus, setRazorpayStatus] = useState(""); // idle | ready | error

  const API = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;
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

  //   fetch student
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
      // optional settings panel; ignore if unavailable
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
      toast.error(err?.response?.data?.message || "Failed to save Razorpay settings");
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

  const handleClassChange = (e) => {
    const classId = e.target.value;
    setSelectedClass(classId);

    const query = inputValue.toLowerCase();

    const filtered = students.filter((s) => {
      // Check Class
      const isClassMatch = !classId
        ? true
        : s.classId === classId || s.classId?._id === classId;

      // Check Search
      const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
      const isSearchMatch =
        fullName.includes(query) || s.studentId.toLowerCase().includes(query);

      return isClassMatch && isSearchMatch;
    });

    setFilteredStudents(filtered);
  };

  const handleinput = (e) => {
    const query = e.target.value.toLowerCase();
    setInputValue(query); // Update the search box state

    const filtered = students.filter((s) => {
      // 1. Search Match (Name or ID)
      const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
      const isSearchMatch =
        fullName.includes(query) || s.studentId.toLowerCase().includes(query);

      // 2. Class Match
      // If selectedClass is empty (""), it's 'All Classes', so always true.
      // Otherwise, check if the student's classId matches.
      const isClassMatch = !selectedClass
        ? true
        : s.classId === selectedClass || s.classId?._id === selectedClass;

      return isSearchMatch && isClassMatch;
    });

    setFilteredStudents(filtered);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [amountToPay, setAmountToPay] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [utr, setUtr] = useState("");
  const [transactionId, setTransactionId] = useState("");

  // This function triggers when you click the "Collect Fee" button in your table
  const handleCollectFee = (student) => {
    setSelectedStudent(student);
    setAmountToPay(student.totalDue); // Default to total due amount
    setPaymentMode("Cash");
    setUtr("");
    setTransactionId("");
    setIsModalOpen(true);
  };

  const confirmPayment = async () => {
    if (!amountToPay || Number(amountToPay) <= 0) {
      toast.error("Please enter a valid amount");
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

    const payload = {
      studentId: selectedStudent._id,
      amountPaid: Number(amountToPay),
      paymentMode: paymentMode,
      remarks: "Fee collection via Accountant",
      ...(paymentMode === "UPI" ? { utr: utr.trim() } : {}),
      ...(paymentMode === "Online"
        ? { transactionId: transactionId.trim() }
        : {}),
    };

    const loadingToast = toast.loading("Processing payment...");
    let isSuccess = false; // 👈 flag to track what happened

    try {
      const response = await axios.post(`${API}/fee-collect`, payload, {
        withCredentials: true,
      });
      toast.dismiss(loadingToast);

      if (response.data.success) {
        isSuccess = true; // 👈 mark success
        toast.success(`₹${amountToPay} collected successfully! 🎉`);
      } else {
        toast.error(response.data.message || "Payment failed");
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(error.response?.data?.message || "Something went wrong");
    }

    // ✅ Runs AFTER try/catch — errors here won't trigger error toast
    if (isSuccess) {
      setIsModalOpen(false);
      setSelectedStudent(null);
      setAmountToPay("");
      setPaymentMode("Cash");

      try {
        // 1. Fetch the fresh data from the server
        const res = await axios.get(`${API}/students`, {
          withCredentials: true,
        });
        const freshStudents = res.data.data;

        if (freshStudents) {
          // 2. Update the master list
          setStudents(freshStudents);

          // 3. Re-apply the current filters to the fresh data
          const query = inputValue.toLowerCase();

          const refreshedFilteredList = freshStudents.filter((s) => {
            const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();

            // Check if matches current search query
            const matchesSearch =
              fullName.includes(query) ||
              s.studentId.toLowerCase().includes(query);

            /* ─────────────────────────────────────────────────────────────
               CHANGE HERE: We match based on ID now, not className string
               ───────────────────────────────────────────────────────────── */
            const matchesClass = selectedClass
              ? s.classId === selectedClass || s.classId?._id === selectedClass
              : true;

            return matchesSearch && matchesClass;
          });

          // 4. Finally, update the UI list
          setFilteredStudents(refreshedFilteredList);
        }
      } catch (error) {
        console.error("Error refreshing student list:", error);
        toast.error(
          "Payment successful, but failed to refresh the list. Please reload.",
        );
      }
    }
  };

  return (
    <div className="p-8 text-[rgb(var(--text))]">
      {/* 🔙 BACK BUTTON */}
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

      <div className="mb-6 rounded-xl border border-indigo-200 bg-[rgb(var(--surface))] p-5 max-w-2xl shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-base font-semibold">Razorpay key setup</h2>
            <p className="text-xs text-[rgb(var(--text))] mt-1">
              Optional for now. Without keys, parents use a development checkout
              (OK button → payment success). Add real keys later for live Razorpay.
            </p>
          </div>
          {razorpayStatus === "ready" && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
              Verified
            </span>
          )}
          {razorpayStatus === "saved" && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
              Saved — test next
            </span>
          )}
          {razorpayStatus === "error" && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600">
              Needs real keys
            </span>
          )}
        </div>

        <ol className="text-xs text-[rgb(var(--text))] space-y-1.5 mb-4 list-decimal list-inside">
          <li>
            Open{" "}
            <a
              href="https://dashboard.razorpay.com/app/keys"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 font-medium underline"
            >
              Razorpay Dashboard → API Keys
            </a>
          </li>
          <li>Switch to <strong>Test Mode</strong> (toggle in left sidebar)</li>
          <li>Copy <strong>Key ID</strong> and generate/copy <strong>Key Secret</strong></li>
          <li>Paste below → Save → Test connection</li>
        </ol>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium mb-1">Key ID</label>
            <input
              type="text"
              value={razorpayKeyId}
              onChange={(e) => {
                setRazorpayKeyId(e.target.value);
                setRazorpayStatus("");
              }}
              placeholder="rzp_test_xxxxxxxxxxxx"
              className="w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))]"
            />
          </div>
          <div>
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
              className="w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))]"
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={saveRazorpaySettings}
            disabled={savingRazorpay}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium disabled:opacity-60"
          >
            {savingRazorpay ? "Saving…" : "1. Save keys"}
          </button>
          <button
            type="button"
            onClick={testRazorpaySettings}
            disabled={testingRazorpay || !hasRazorpaySecret}
            className="px-4 py-2 rounded-lg border border-indigo-200 text-indigo-700 text-sm font-medium disabled:opacity-60"
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
              className="block w-full px-4 py-2 text-[rgb(var(--text))] bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer appearance-none"
            >
              <option value="" className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]">All Classes</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id} className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
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
                      Fee Deu
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium  uppercase tracking-wider">
                      action
                    </th>
                  </tr>
                </thead>
                <tbody className=" divide-y divide-gray-100">
                  {filteredStudents.map((student) => (
                    <tr
                      key={student._id}
                      className=""
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-[rgb(var(--primary))]">
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
                          ₹{student.totalDue}
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
                          className="inline-flex items-center px-4 py-2 border border-transparent 
                    text-sm font-medium rounded-md shadow-sm text-[rgb(var(--text))] bg-[rgb(var(--primary))]
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                          <svg
                            className="mr-2 h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://w3.org"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 8.5H9m6 3H9m3 1.5H9L15 17M9 5.5c4.833 0 4.833 6 0 6"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M21.5 12a9.5 9.5 0 11-19 0 9.5 10.5 0 0119 0z"
                            />
                          </svg>
                          Collect Fee
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>{" "}
      {/* end of container div */}
      {/* popup modal for collect payemnt - */}
      {isModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-999 flex items-center justify-center p-3 sm:p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0  backdrop-blur-[3px]"
            onClick={() => setIsModalOpen(false)}
          ></div>

          {/* Modal Container */}
          <div className="relative bg-[rgb(var(--surface))] text-[rgb(var(--text))] w-full max-w-sm sm:max-w-lg md:max-w-xl max-h-[90vh] sm:max-h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-200">
            {/* 1. FIXED HEADER */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-50 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-lg font-black ">
                  Collect Fee
                </h2>
                <p className="text-[10px] text-[rgb(var(--primary))] font-bold uppercase tracking-widest">
                  Payment Portal
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2  rounded-fulltransition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* 2. SCROLLABLE CONTENT AREA */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 custom-scrollbar">
              {/* Student Info Card */}
              <div className="bg-[rgb(var(--surface))] p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-3 sm:gap-4 border border-blue-100/50">
                <div className="h-12 w-12 bg-[rgb(var(--primary))] rounded-xl flex items-center justify-center text-[rgb(var(--text))] text-xl font-bold shrink-0">
                  {selectedStudent?.firstName?.charAt(0) || "S"}
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="font-bold  leading-none">
                    {selectedStudent?.firstName} {selectedStudent?.lastName}
                  </h3>
                  <p className="text-[11px] mt-1">
                    Roll No: {selectedStudent?.rollNo} •{" "}
                    {selectedStudent?.studentId}
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3  rounded-xl border border-slate-100 text-center">
                  <p className="text-[9px] font-bold  uppercase">
                    Total
                  </p>
                  <p className="text-sm font-bold ">
                    ₹{selectedStudent?.finalFee}
                  </p>
                </div>
                <div className="p-3  rounded-xl border border-green-100 text-center">
                  <p className="text-[9px] font-bold text-green-500 uppercase">
                    Paid
                  </p>
                  <p className="text-sm font-bold text-green-700">
                    ₹{selectedStudent?.totalPaid || 0}
                  </p>
                </div>
                <div className="p-3  rounded-xl border border-red-100 text-center">
                  <p className="text-[9px] font-bold text-red-400 uppercase">
                    Due
                  </p>
                  <p className="text-sm font-bold text-red-600">
                    ₹{selectedStudent?.totalDue}
                  </p>
                </div>
              </div>

              {/* Payment Form */}
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase ml-1">
                    Amount to Collect
                  </label>
                  <div className="relative mt-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={amountToPay}
                      onChange={(e) => setAmountToPay(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 border-2  focus:border-blue-500 focus:bg-[rgb(var(--surface))] rounded-xl outline-none font-bold text-[rgb(var(--primary))] transition-all"
                      placeholder="0.00"
                    />
                  </div>
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
                            ? "border-blue-600  text-[rgb(var(--primary))]"
                            : "border-slate-50   text-[rgb(var(--text))]"
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
                      className="w-full mt-1 px-4 py-3 border-2 focus:border-blue-500 rounded-xl outline-none font-medium text-sm transition-all"
                      placeholder="Enter 12-digit UTR / UPI reference"
                      autoComplete="off"
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
                      className="w-full mt-1 px-4 py-3 border-2 focus:border-blue-500 rounded-xl outline-none font-medium text-sm transition-all"
                      placeholder="Enter bank / gateway transaction ID"
                      autoComplete="off"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 3. FIXED FOOTER ACTIONS */}
            <div className="px-4 sm:px-6 py-4 sm:py-6  border-t border-slate-50 flex gap-3 shrink-0">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3.5 text-sm font-bold border-1 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmPayment}
                className="flex-2 py-3.5 bg-[rgb(var(--primary))]   text-[rgb(var(--text))]rounded-2xl font-bold shadow-lg  rounded-2xl  active:scale-95 transition-all"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FeeCollection;
