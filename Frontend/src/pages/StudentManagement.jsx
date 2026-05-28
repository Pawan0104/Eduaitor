import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

const API = import.meta.env.VITE_API_URL;

const steps = [
  "Student Details",
  "Parent / Guardian",
  "Documents",
  "Class Details",
  "Fee Structure",
  "Parent Login",
  "Review",
];

const busFeeQuarterOptions = [
  { label: "April-July", value: "april-july" },
  { label: "Aug-Nov", value: "august-november" },
  { label: "Dec-March", value: "december-march" },
];

const emptyForm = {
  firstName: "",
  lastName: "",
  dob: "",
  gender: "",
  bloodGroup: "",
  admissionDate: "",

  fatherName: "",
  fatherMobile: "",
  fatherEmail: "",

  motherName: "",
  motherMobile: "",
  motherEmail: "",

  guardianName: "",
  guardianMobile: "",
  guardianRelation: "",

  address: "",

  classId: "",
  sectionId: "",
  rollNo: "",
  studentType: "",
  transport: "",
  useTransport: false,
  selectedOptionalFees: [],
  busFeeFrequency: "annually",
  busFeeQuarter: "",

  totalFee: "",
  discountType: "",
  discountValue: "",
  finalFee: "",

  studentPhoto: null,
  fatherPhoto: null,
  motherPhoto: null,
  guardianPhoto: null,

  birthCertificate: null,
  transferCertificate: null,

  studentAadhar: null,
  fatherAadhar: null,
  motherAadhar: null,

  parentUsername: "",
  parentPassword: "",
};


const StudentManagement = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});


  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState("");

  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);

  const [feeStructure, setFeeStructure] = useState([]);
  const [transportRoutes, setTransportRoutes] = useState([]);
  const [freqFilter, setFreqFilter] = useState("annually");

  const isMobile = window.innerWidth <= 768;

  const calcAmount = (amount) => {
    let value;

    switch (freqFilter) {
      case "quarterly":
        value = amount / 3;
        break;

      case "annually":
        value = amount;
        break;

      default:
        value = amount;
    }

    return Number(value).toFixed(2);
  };
  const getFinalAnnualTotal = () =>
  feeStructure.reduce((sum, fee) => {
    // If it's mandatory, add it. 
    // If it's optional, only add it if isOptionalFeeSelected returns true.
    if (!fee.isOptional || isOptionalFeeSelected(fee)) {
      return sum + (Number(fee.amount) || 0);
    }
    return sum;
  }, 0);

  useEffect(() => {
  const annualTotal = getFinalAnnualTotal();
  let discountedTotal = annualTotal;

  // Calculate Discount
  const discountVal = Number(form.discountValue) || 0;
  if (form.discountType === "Percentage") {
    discountedTotal = annualTotal - (annualTotal * (discountVal / 100));
  } else if (form.discountType === "Rupees") {
    discountedTotal = annualTotal - discountVal;
  }

  setForm(prev => ({
    ...prev,
    totalFee: annualTotal.toFixed(2),
    finalFee: Math.max(0, discountedTotal).toFixed(2) // Max 0 to prevent negative fees
  }));
}, [
    form.selectedOptionalFees, 
    form.useTransport, 
    form.discountType, 
    form.discountValue, 
    feeStructure
]);

  const calcBusFeeAmount = (amount) =>
    Number(form.busFeeFrequency === "quarterly" ? amount / 3 : amount).toFixed(
      2,
    );

  const isBusFeeComponent = (fee) => {
    const feeName = fee?.name?.toLowerCase() || "";
    return feeName.includes("bus fee") || feeName.includes("transport fee");
  };

  const isOptionalFeeSelected = (fee) => {
    if (!fee?.isOptional) {
      return true;
    }

    if (isBusFeeComponent(fee)) {
      return form.useTransport;
    }

    return form.selectedOptionalFees.includes(String(fee._id));
  };

  const getDisplayAmount = (fee) => {
    const amount = Number(fee?.amount) || 0;

    if (isBusFeeComponent(fee) && form.useTransport) {
      return calcBusFeeAmount(amount);
    }

    return calcAmount(amount);
  };

  const getIncludedAnnualTotal = () =>
    feeStructure.reduce((sum, fee) => {
      if (isOptionalFeeSelected(fee)) {
        if (isBusFeeComponent(fee)) {
          if (form.busFeeFrequency === "quarterly" && !form.busFeeQuarter) {
            return sum;
          }

          return sum + Number(calcBusFeeAmount(fee.amount));
        }

        return sum + (Number(fee.amount) || 0);
      }

      return sum;
    }, 0);

  const getMandatoryAnnualTotal = () =>
    feeStructure.reduce((sum, fee) => {
      if (fee?.isOptional) {
        return sum;
      }

      return sum + (Number(fee.amount) || 0);
    }, 0);

  const normalizeFeeFrequency = (value) =>
    ["monthly", "quarterly", "half-yearly", "annually"].includes(value)
      ? value
      : "annually";

  const optionalFees = feeStructure.filter((fee) => fee?.isOptional);

  const toggleOptionalFee = (feeId) => {
    const normalizedId = String(feeId);

    setForm((prev) => ({
      ...prev,
      selectedOptionalFees: prev.selectedOptionalFees.includes(normalizedId)
        ? prev.selectedOptionalFees.filter((id) => id !== normalizedId)
        : [...prev.selectedOptionalFees, normalizedId],
    }));
  };

  const progress = (step / steps.length) * 100;

  /* FETCH CLASS */
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await axios.get(`${API}/classes/all`, {
          withCredentials: true,
        });

        setClasses(res.data.classes || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load classes");
      }
    };

    fetchClasses();
  }, []);

  useEffect(() => {
    const fetchTransportRoutes = async () => {
      try {
        const res = await axios.get(`${API}/transport/routes`, {
          withCredentials: true,
        });

        setTransportRoutes(res.data.data || []);
      } catch (err) {
        console.error(err);
        setTransportRoutes([]);
      }
    };

    fetchTransportRoutes();
  }, []);

  /* FETCH SECTION CLASS BASED*/
  useEffect(() => {
    if (!form.classId) {
      setSections([]);
      return;
    }

    const selectedClass = classes.find((c) => c._id === form.classId);
    if (!selectedClass) return;

    const derivedSections =
      selectedClass.details?.map((d) => ({
        label: d.sectionId?.name || d.sectionId?.sectionName || "Section",
        value: d.sectionId?._id,
      })) || [];

    setSections(derivedSections);
    if (
      form.sectionId &&
      !derivedSections.find((s) => s.value === form.sectionId)
    ) {
      setForm((prev) => ({ ...prev, sectionId: "" }));
    }
  }, [form.classId, classes]);

  /* FETCH FEE STRUCTURE */
  useEffect(() => {
    if (!form.classId) return;

    const fetchFeeStructure = async () => {
      try {
        const { data } = await axios.get(
          `${API}/fee-structure/${form.classId}`,
          { withCredentials: true },
        );

        if (data?.success) {
          setFeeStructure(data.fees || []);
        } else {
          toast.error(data.message || "Failed to load fee structure");
          setFeeStructure([]);
        }
      } catch (err) {
        console.error(err);
        toast.error(
          err?.response?.data?.message || "Failed to load fee structure",
        );
        setFeeStructure([]);
      }
    };

    fetchFeeStructure();
  }, [form.classId]);

  /* FETCH STUDENT */
  useEffect(() => {
    if (!id) return;

    const fetchStudent = async () => {
      try {
        const res = await axios.get(`${API}/students/${id}`, {
          withCredentials: true,
        });
        const student = res.data.data;

        setForm({
          ...student,
          classId: student.classId?._id || student.classId,
          sectionId: student.sectionId?._id || student.sectionId,
          transport: student.transport?._id || student.transport || "",
          useTransport: Boolean(student.transport),
          selectedOptionalFees: student.selectedOptionalFees || [],
          busFeeFrequency:
            student.busFeeFrequency === "quarterly" ? "quarterly" : "annually",
          busFeeQuarter: student.busFeeQuarter || "",
          dob: student.dob ? student.dob.split("T")[0] : "",
          admissionDate: student.admissionDate
            ? student.admissionDate.split("T")[0]
            : "",
        });
        setFreqFilter(normalizeFeeFrequency(student.feeFrequency));
      } catch {
        toast.error("Failed to load student");
      }
    };

    fetchStudent();
  }, [id]);

  /* CHANGE */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "classId" && {
        sectionId: "",
        transport: "",
        useTransport: false,
        selectedOptionalFees: [],
        busFeeFrequency: "annually",
        busFeeQuarter: "",
        discountType: "",
        discountValue: "",
        totalFee: "",
        finalFee: "",
      }),
      ...(name === "busFeeFrequency" && {
        busFeeQuarter: value === "quarterly" ? form.busFeeQuarter : "",
      }),
    }));
    if (errors[name]) {
    setErrors((prevErrors) => {
      const updatedErrors = { ...prevErrors };
      delete updatedErrors[name]; // Remove only this field's error
      return updatedErrors;
    });
  }
  };

  /* FILE */
  const handleFileChange = (e) => {
    const { name, files } = e.target;
    const file = files[0];

    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File must be less than 2MB");
      return;
    }
    if (errors[name]) {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  }

    setForm((prev) => ({
      ...prev,
      [name]: file,
    }));
  };

  useEffect(() => {
    const annual = getIncludedAnnualTotal();
    const discount = Number(form.discountValue) || 0;

    let final = annual;

    if (form.discountType === "Percentage") {
      final = annual - (annual * discount) / 100;
    }

    if (form.discountType === "Rupees") {
      final = annual - discount;
    }

    setForm((prev) => ({
      ...prev,
      totalFee: annual,
      finalFee: final >= 0 ? final : 0,
    }));
  }, [
    feeStructure,
    form.discountType,
    form.discountValue,
    form.useTransport,
    form.selectedOptionalFees,
    form.busFeeFrequency,
    form.busFeeQuarter,
  ]);

  const isDirty = () =>
    Object.values(form).some((v) => v !== "" && v !== null && v !== undefined);

  const validateStep = () => {
    const errors = [];

    if (step === 1) {
      if (!form.firstName.trim()) errors.push("First Name required");
      if (!form.lastName.trim()) errors.push("Last Name required");
      if (!form.dob) errors.push("Date of Birth required");
      if (!form.gender) errors.push("Gender required");
      if (!form.admissionDate) errors.push("Admission Date required");
    }

    if (step === 2) {
      if (!form.fatherName.trim()) errors.push("Father name required");
      if (!form.fatherMobile.trim()) errors.push("Father mobile required");
      if (!form.motherName?.trim()) errors.push("Mother name required"); 
    if (!form.motherMobile?.trim()) errors.push("Mother mobile required"); 
      if (!form.address.trim()) errors.push("Address required");
      if (form.fatherMobile && !/^\d{10}$/.test(form.fatherMobile))
        errors.push("Invalid Father Mobile Number");
    }

    if (step === 3) {
    // Check Student Photo
    if (!form.studentPhoto && !form?.documents?.studentPhoto?.url) {
      errors.push("Student Photo is required");
    }
    // Check Father Aadhar
    if (!form.fatherAadhar && !form?.documents?.fatherAadhar?.url) {
      errors.push("Father Aadhar is required");
    }
    // Check Mother Aadhar
    if (!form.motherAadhar && !form?.documents?.motherAadhar?.url) {
      errors.push("Mother Aadhar is required");
    }
  }

    if (step === 4) {
      if (!form.classId) errors.push("Class required");

      if (sections.length > 0 && !form.sectionId) {
        errors.push("Section required");
      }

      if (!form.rollNo) errors.push("Roll number required");
    }

    if (step === 5) {
      if (form.totalFee === "" || form.totalFee === null) {
        errors.push("Total fee required");
      }

      if (form.useTransport && !form.transport) {
        errors.push("Transport route required when bus service is selected");
      }

      if (
        form.useTransport &&
        form.busFeeFrequency === "quarterly" &&
        !form.busFeeQuarter
      ) {
        errors.push("Select the bus fee quarter");
      }
    }

    if (step === 6) {
      if (!form.username?.trim()) errors.push("Username is required");
      if (!isEdit && !form.password?.trim())
        errors.push("Password is required");
      if (form.password && form.password.length < 5)
        errors.push("Password must be at least 5 characters");
    }

    return errors;
  };

const next = () => {
  const stepErrorsArray = validateStep();

  if (stepErrorsArray.length > 0) {
    const errorMap = {};

    stepErrorsArray.forEach((err) => {
      // Create a lowercase version for matching
      const lowerErr = err.toLowerCase();

      // Step 1 & 2
      if (lowerErr.includes("first name")) errorMap.firstName = err;
      if (lowerErr.includes("last name")) errorMap.lastName = err;
      if (lowerErr.includes("date of birth")) errorMap.dob = err;
      if (lowerErr.includes("gender")) errorMap.gender = err;
      if (lowerErr.includes("admission date")) errorMap.admissionDate = err;
      if (lowerErr.includes("father name")) errorMap.fatherName = err;
      if (lowerErr.includes("father mobile") || lowerErr.includes("invalid father mobile")) errorMap.fatherMobile = err;
      if (lowerErr.includes("mother name")) errorMap.motherName = err;
      if (lowerErr.includes("mother mobile")) errorMap.motherMobile = err;
      if (lowerErr.includes("address")) errorMap.address = err;

      // Step 3 - FIXED CASE SENSITIVITY
      if (lowerErr.includes("student photo")) errorMap.studentPhoto = err;
      if (lowerErr.includes("father aadhar")) errorMap.fatherAadhar = err;
      if (lowerErr.includes("mother aadhar")) errorMap.motherAadhar = err;

      // Step 4, 5, 6
      if (lowerErr.includes("class")) errorMap.classId = err;
      if (lowerErr.includes("section")) errorMap.sectionId = err;
      if (lowerErr.includes("roll number")) errorMap.rollNo = err;
      if (lowerErr.includes("total fee")) errorMap.totalFee = err;
      if (lowerErr.includes("transport route")) errorMap.transport = err;
      if (lowerErr.includes("bus fee quarter")) errorMap.busFeeQuarter = err;
      if (lowerErr.includes("username")) errorMap.username = err;
      if (lowerErr.includes("password")) errorMap.password = err;
    });

    setErrors(errorMap);
    toast.error("Please fill in the required fields.");
    return;
  }

  // Handle Parent Login Auto-generation logic here (Step 5 to 6 transition)
  if (step === 5) {
    setForm(prev => ({
      ...prev,
      username: prev.username || prev.fatherMobile,
      password: prev.password || "123456"
    }));
  }

  setErrors({});
  setStep((s) => s + 1);
};


  const prev = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const resetForm = () => {
    if (!isDirty()) {
      setForm(emptyForm);
      setStep(1);
      return;
    }

    setConfirmMessage("Are you sure you want to reset the form?");
    setConfirmAction(() => () => {
      setForm(emptyForm);
      setStep(1);
        setErrors({})
    });

    setConfirmOpen(true);
  };

  const handleSubmit = () => {
    setConfirmMessage(
      isEdit
        ? "Are you sure you want to update this student?"
        : "Are you sure you want to save this student?",
    );

    setConfirmAction(() => submitStudent);
    setConfirmOpen(true);
  };

  const submitStudent = async () => {
    try {
      const data = new FormData();

      const forbidden = [
        "_id",
        "__v",
        "createdAt",
        "updatedAt",
        "studentId",
        "documents",
        "useTransport",
      ];

      Object.entries(form).forEach(([key, value]) => {
        if (forbidden.includes(key)) return;
        if (value === null || value === "") return;

        if (
          value instanceof Blob ||
          (typeof value === "object" &&
            value?.name &&
            value?.size !== undefined)
        ) {
          data.append(key, value);
        } else if (typeof value === "object") {
          data.append(key, JSON.stringify(value));
        } else {
          data.append(key, value);
        }
      });

      data.set("feeFrequency", freqFilter);

      if (isEdit) {
        await axios.put(`${API}/students/${id}`, data, {
          withCredentials: true,
        });
        toast.success("Student Updated Successfully");
      } else {
        await axios.post(`${API}/students`, data, { withCredentials: true });
        toast.success("Student Added Successfully");
      }

      navigate("/school/students");
    } catch (err) {
      console.error("Submit error:", err);
      console.error("Response data:", err?.response?.data);
      toast.error(err?.response?.data?.message || "Operation failed");
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [form]);

  return (
    <div className="p-4 lg:p-8  min-h-screen">
      {/* BACK BUTTON */}
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
      <div className="flex flex-col sm:flex-row justify-between mb-6 gap-4">
        <h1 className="text-2xl lg:text-3xl font-bold">
          {isEdit ? "Edit Student Details" : "Student Admission"}
        </h1>

        <button
          onClick={resetForm}
          className="px-4 py-2 bg-red-500 text-white rounded-lg"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* STEP SIDEBAR */}

        <div className="col-span-12 lg:col-span-3">
          <div className="bg-[rgb(var(--surface))] rounded-xl  border border-[rgb(var(--border))] shadow p-4 sticky top-6">
            {steps.map((s, i) => {
              const index = i + 1;
              const status =
                step === index
                  ? "active"
                  : step > index
                    ? "complete"
                    : "pending";

              return (
                <div
                  key={i}
                  onClick={() => {
                    const errors = validateStep();
                    if (index > step && errors.length > 0) {
                      toast.error("Complete this step first");
                      return;
                    }
                    setStep(index);
                  }}
                  className={`flex items-center gap-3 p-3 rounded-lg mb-2 cursor-pointer
                    ${
                      status === "active"
                        ? "bg-[rgb(var(--primary))] text-[rgb(var(--text))]"
                        : ""
                    }`}
                >
                  <div
                    className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold
                      ${
                        status === "complete"
                          ? "bg-green-500 text-white"
                          : status === "active"
                            ? "bg-white text-indigo-600"
                            : "bg-[rgb(var(--primary))]"
                      }`}
                  >
                    {status === "complete" ? "✓" : index}
                  </div>

                  <span className="text-sm font-medium">{s}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* FORM AREA */}

        <div className="col-span-12 lg:col-span-9">
          <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]  border border-[rgb(var(--border))] rounded-xl shadow p-6 lg:p-8">
            {/* PROGRESS */}

            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span>
                  Step {step} of {steps.length}
                </span>
                <span>{Math.round(progress)}%</span>
              </div>

              <div className="w-full bg-gray-200 h-2 rounded-full">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* STEP 1 */}

            {step === 1 && (
              <div className="grid md:grid-cols-2 gap-6">
                <Input
                  label="First Name *"
                  placeholder="Enter first name"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  error={errors.firstName}
                />
                <Input
                  label="Last Name *"
                  placeholder="Enter last name"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  error={errors.lastName}
                />
                <Input
                  type="date"
                  label="Date of Birth *"
                  name="dob"
                  value={form.dob}
                  onChange={handleChange}
                  error={errors.dob}
                />
                <Select
                  label="Gender *"
                  name="gender"
                  value={form.gender}
                  options={["Male", "Female"]}
                  onChange={handleChange}
                  error={errors.gender}
                />
                <Input
                  label="Blood Group *"
                  placeholder="Enter blood group (eg. O+, A-...)"
                  name="bloodGroup"
                  value={form.bloodGroup}
                  onChange={handleChange}
                  error={errors.bloodGroup}
                />
                <Input
                  type="date"
                  label="Admission Date *"
                  name="admissionDate"
                  value={form.admissionDate}
                  onChange={handleChange}
                  error={errors.admissionDate}
                />
              </div>
            )}
            {/* STEP 2 */}

            {step === 2 && (
              <div className="space-y-6">
                <Input
                  label="Father Name *"
                  placeholder="Enter full name"
                  name="fatherName"
                  value={form.fatherName}
                  onChange={handleChange}
                    error={errors.fatherName}
                />
                <Input
                  label="Father Mobile *"
                  placeholder="Enter mobile number"
                  name="fatherMobile"
                  type="number"
                  value={form.fatherMobile}
                  onChange={handleChange}
                    error={errors.fatherMobile}
                />
                <Input
                  label="Father Email *"
                  placeholder="Enter email"
                  name="fatherEmail"
                  value={form.fatherEmail}
                  onChange={handleChange}
                    error={errors.fatherEmail}
                />

                <Input
                  label="Mother Name *"
                  placeholder="Enter full name"
                  name="motherName"
                  value={form.motherName}
                  onChange={handleChange}
                    error={errors.motherName}
                />
                <Input
                  label="Mother Mobile *"
                  placeholder="Enter mobile number"
                  name="motherMobile"
                  type="number"
                  value={form.motherMobile}
                  onChange={handleChange}
                    error={errors.motherMobile}
                />
                <Input
                  label="Mother Email *"
                  placeholder="Enter email"
                  name="motherEmail"
                  value={form.motherEmail}
                  onChange={handleChange}
                    error={errors.motherEmail}
                />

                <Input
                  label="Guardian Name"
                  placeholder="Enter full name"
                  name="guardianName"
                  value={form.guardianName}
                  onChange={handleChange}
                />
                <Input
                  label="Guardian Mobile"
                  placeholder="Enter mobile number"
                  name="guardianMobile"
                  value={form.guardianMobile}
                  onChange={handleChange}
                />
                <Input
                  label="Relation"
                  placeholder="Enter relation with child"
                  name="guardianRelation"
                  value={form.guardianRelation}
                  onChange={handleChange}
                />

                <Input
                  label="Address *"
                  placeholder="Enter full address"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                    error={errors.address}
                />
              </div>
            )}

            {/* STEP 3 */}

            {step === 3 && (
              <div className="grid gap-4">
                <File
                  label="Student Photo"
                  name="studentPhoto"
                  existingUrl={form?.documents?.studentPhoto?.url}
                  onChange={handleFileChange}
                    error={errors.studentPhoto}
                />

                <File
                  label="Father Photo"
                  name="fatherPhoto"
                  existingUrl={form?.documents?.fatherPhoto?.url}
                  onChange={handleFileChange}
                  error={errors.fatherPhoto}
                />

                <File
                  label="Mother Photo"
                  name="motherPhoto"
                  existingUrl={form?.documents?.motherPhoto?.url}
                  onChange={handleFileChange}
                  error={errors.motherPhoto}
                />

                <File
                  label="Guardian Photo"
                  name="guardianPhoto"
                  existingUrl={form?.documents?.guardianPhoto?.url}
                  onChange={handleFileChange}
                />

                <File
                  label="Birth Certificate"
                  name="birthCertificate"
                  existingUrl={form?.documents?.birthCertificate?.url}
                  onChange={handleFileChange}
                />

                <File
                  label="Transfer Certificate"
                  name="transferCertificate"
                  existingUrl={form?.documents?.transferCertificate?.url}
                  onChange={handleFileChange}
                />

                <File
                  label="Student Aadhar"
                  name="studentAadhar"
                  existingUrl={form?.documents?.studentAadhar?.url}
                  onChange={handleFileChange}
                />

                <File
                  label="Father Aadhar"
                  name="fatherAadhar"
                  existingUrl={form?.documents?.fatherAadhar?.url}
                  onChange={handleFileChange}
                  error={errors.fatherAadhar}
                />

                <File
                  label="Mother Aadhar"
                  name="motherAadhar"
                  existingUrl={form?.documents?.motherAadhar?.url}
                  onChange={handleFileChange}
                  error={errors.motherAadhar}
                />
              </div>
            )}

            {/* STEP 4 */}

            {step === 4 && (
              <div className="grid gap-4">
                <Select
                  label="Class *"
                  name="classId"
                  value={form.classId}
                  options={classes.map((c) => ({
                    label: c.name || c.className,
                    value: c._id,
                  }))}
                  onChange={handleChange}
                    error={errors.classId}
                />

                {form.classId && sections.length > 0 && (
                  <Select
                    label="Section"
                    name="sectionId"
                    value={form.sectionId}
                    options={sections}
                    onChange={handleChange}
                      error={errors.sectionId}
                  />
                )}

                <Input
                  label="Roll Number"
                  name="rollNo"
                  value={form.rollNo}
                  onChange={handleChange}
                    error={errors.rollNo}
                />

                <Select
                  label="Student Type"
                  name="studentType"
                  value={form.studentType}
                  options={["Day Scholar", "Day Boarder", "Boarder"]}
                  onChange={handleChange}
                />
              </div>
            )}

            {/* STEP 5 */}

            {step === 5 && (
              <div className="grid gap-4">
                {feeStructure.length === 0 && form.classId && (
                  <div className="text-sm text-[rgb(var(--text))] ">
                    No fee structure found for this class
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-xs font-semibold mb-1">
                    View As
                  </label>

                  <select
                    value={freqFilter}
                    onChange={(e) => setFreqFilter(e.target.value)}
                    className="w-full border px-3 py-2 rounded-lg text-[rgb(var(--text))] bg-[rgb(var(--surface))] "
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="half-yearly">Half Yearly</option>
                    <option value="annually">Annually</option>
                  </select>
                </div>

                {optionalFees.length > 0 && (
                  <div className="grid gap-3">
                    {optionalFees.map((fee) =>
                      isBusFeeComponent(fee) ? (
                        <div
                          key={fee._id}
                          className="rounded-lg  text-[rgb(var(--text))]  border border-[rgb(var(--border))] p-4"
                        >
                          <label className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={form.useTransport}
                              onChange={(e) =>
                                setForm((prev) => ({
                                  ...prev,
                                  useTransport: e.target.checked,
                                  transport: e.target.checked
                                    ? prev.transport
                                    : "",
                                  busFeeFrequency: e.target.checked
                                    ? prev.busFeeFrequency || "annually"
                                    : "annually",
                                  busFeeQuarter:
                                    e.target.checked &&
                                    prev.busFeeFrequency === "quarterly"
                                      ? prev.busFeeQuarter || ""
                                      : "",
                                }))
                              }
                              className="h-4 w-4"
                            />
                            <div>
                              <div className="text-sm font-medium text-[rgb(var(--text))]">
                                Add {fee.name}
                              </div>
                              <div className="text-xs text-[rgb(var(--text))]">
                                Include this fee only when the student uses
                                transport.
                              </div>
                            </div>
                          </label>

                          {form.useTransport && (
                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                              <Select
                                label="Transport Route"
                                name="transport"
                                value={form.transport}
                                options={transportRoutes.map((route) => ({
                                  label: route.name,
                                  value: route._id,
                                }))}
                                onChange={handleChange}
                              />

                              <Select
                                label="Bus Fee Type"
                                name="busFeeFrequency"
                                value={form.busFeeFrequency}
                                options={[
                                  { label: "Annually", value: "annually" },
                                  { label: "Quarterly", value: "quarterly" },
                                ]}
                                onChange={handleChange}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <label
                          key={fee._id}
                          className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
                        >
                          <input
                            type="checkbox"
                            checked={form.selectedOptionalFees.includes(
                              String(fee._id),
                            )}
                            onChange={() => toggleOptionalFee(fee._id)}
                            className="h-4 w-4"
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-800">
                              Add {fee.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              Include this optional fee in the final annual
                              total.
                            </div>
                          </div>
                        </label>
                      ),
                    )}
                  </div>
                )}

                {feeStructure.length > 0 && (
                  <div className=" border rounded-lg p-4 mb-4">
                    <h3 className="font-semibold mb-2">Fee Breakdown</h3>

                    {feeStructure.map((f, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-sm py-1 text-[rgb(var(--text))]"
                      >
                        <span>
                          {f.name}
                          {f.isOptional && (
                            <span className="text-xs ml-2">
                              {isOptionalFeeSelected(f)
                                ? "(Selected)"
                                : "(Optional)"}
                            </span>
                          )}
                        </span>

                        <span>₹{getDisplayAmount(f)}</span>
                      </div>
                    ))}

                    <div className="flex justify-between font-bold border-t mt-2 pt-2">
                      <span>Annual Total</span>
                     <span>
    {/* Use the final total here instead of mandatory only */}
    ₹{Number(getFinalAnnualTotal()).toFixed(2)}
  </span>
                    </div>

                    {/* {freqFilter === "quarterly" && (
                      <div className="mt-3 rounded-lg bg-white p-3 text-sm text-gray-600">
                        {["April-July", "Aug-Nov", "Dec-March"].map(
                          (months) => (
                            <div
                              key={months}
                              className="flex justify-between py-1"
                            >
                              <span>{months}</span>
                              <span>
                                Rs. {calcAmount(getIncludedAnnualTotal())}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    )} */}
                  </div>
                )}

                {form.useTransport && form.busFeeFrequency === "quarterly" && (
                  <Select
                    label="Bus Fee Quarter"
                    name="busFeeQuarter"
                    value={form.busFeeQuarter}
                    options={busFeeQuarterOptions}
                    onChange={handleChange}
                  />
                )}

                <Input
                  label="Total Annual Fee"
                  name="totalFee"
                  value={form.totalFee}
                  readOnly
                />

                <Select
                  label="Discount Type"
                  name="discountType"
                  value={form.discountType}
                  options={["Rupees", "Percentage"]}
                  onChange={handleChange}
                />

                <Input
                  label="Discount Value"
                  placeholder="Enter here"
                  name="discountValue"
                  value={form.discountValue}
                  onChange={handleChange}
                  disabled={!form.discountType}
                />

                <Input
                  label="Final Fee"
                  name="finalFee"
                  value={form.finalFee}
                  readOnly
                />
              </div>
            )}

            {/* STEP 6 PARENT LOGIN */}
            {step === 6 && (
              <ParentLoginStep
                form={form}
                handleChange={handleChange}
                isEdit={isEdit}
              />
            )}

            {/* STEP 7 REVIEW */}
            {step === 7 && (
              <ReviewStep
                form={form}
                classes={classes}
                sections={sections}
                transportRoutes={transportRoutes}
                feeStructure={feeStructure}
                freqFilter={freqFilter}
              />
            )}

            {/* NAV */}

            <div className="flex justify-between mt-8">
              {step > 1 && (
                <button
                  onClick={prev}
                  className="px-6 py-2 bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-lg cursor-pointer border border-[rgb(var(--border))]"
                >
                  Back
                </button>
              )}

              {step < steps.length ? (
                <button
                  onClick={next}
                 
                  className={`px-6 py-2 rounded-lg text-[rgb(var(--text))]
                    ${
                      validateStep().length > 0
                        ? "bg-[rgb(var(--primary))]"
                        : "bg-[rgb(var(--primary))]  border border-[rgb(var(--border))] cursor-pointer"
                    }`}
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg"
                >
                  {isEdit ? "Update Student" : "Submit"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL */}

      {confirmOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-[rgb(var(--surface))]  border border-[rgb(var(--border))] text-[rgb(var(--text))] rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">Confirmation</h3>

            <p className=" mb-6">{confirmMessage}</p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2  rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  confirmAction?.();
                  setConfirmOpen(false);
                }}
                className="px-4 py-2 bg-[rgb(var(--primary))]  border border-[rgb(var(--border))] text-[rgb(var(--text))] rounded-lg"
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

export default StudentManagement;

/* INPUT */

const Input = ({ label,error, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-[rgb(var(--text))] mb-1">
      {label}
    </label>

    <input
      {...props}
      className="w-full border px-3 py-2 rounded-lg  bg-[rgb(var(--surface))]"
    />
    {error && (
        <span className="text-xs text-red-500 font-medium">
          {error}
        </span>
      )}
  </div>
);

/* SELECT */

const Select = ({ label, error,options, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-[rgb(var(--text))] mb-1">
      {label}
    </label>

    <select
      {...props}
      className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 text-[rgb(var(--text))] bg-[rgb(var(--surface))] "
    >
      <option value="">Select</option>

      {options.map((o, i) => {
        if (typeof o === "string") {
          return (
            <option key={i} value={o}>
              {o}
            </option>
          );
        }

        return (
          <option key={i} value={o.value}>
            {o.label}
          </option>
        );
      })}
    </select>
    {error && (
        <span className="text-xs text-red-500 font-medium">
          {error}
        </span>
      )}
  </div>
);
/* FILE */

const File = ({ label,  name, onChange, existingUrl ,error }) => {
  console.log(error)
  const [preview, setPreview] = useState(existingUrl || null);

  const handlePreview = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (preview && preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    onChange(e);
  };

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  return (
    <div className="border rounded-xl p-4 text-[rgb(var(--text))]">
      <label className={`block text-sm font-medium mb-2 ${error ? 'text-red-600' : 'text-[rgb(var(--text))]'}`}>
        {label}
      </label>

      <input
        type="file"
        name={name}
        onChange={handlePreview}
        className="w-full border px-3 py-2 rounded-lg"
      />

     {error && (
        <span className="text-xs text-red-500 font-medium">
          {error}
        </span>
      )}

      {preview && (
        <img
          src={preview}
          alt="preview"
          className="mt-3 h-24 rounded-lg object-cover"
        />
      )}
    </div>
  );
};

/* PARENT LOGIN STEP */
const ParentLoginStep = ({ form, handleChange, isEdit }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="grid gap-5">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        These credentials will be used by the parent to log into the portal.
      </div>

      <div>
        <label className="block text-sm font-medium text-[rgb(var(--text))] mb-1">
          Username *
        </label>
        <input
          name="username"
          value={form.fatherMobile || ""}
          onChange={handleChange}
          disabled
          placeholder="e.g. john.doe2024"
          className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[rgb(var(--text))] mb-1">
          {isEdit ? "New Password (leave blank to keep current)" : "Password *"}
        </label>
        <div className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
              defaultValue={"123456"}
            onChange={handleChange}

            placeholder="Min. 5 characters"
            className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 text-sm"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {form.temp_password && isEdit && (
        <div className="text-xs text-gray-400">
          Current saved password (dev only): <code>{form.temp_password}</code>
        </div>
      )}
    </div>
  );
};

/* REVIEW STEP */
const ReviewStep = ({
  form,
  classes,
  sections,
  transportRoutes,
  feeStructure,
  freqFilter,
}) => {
  const className =
    classes.find((c) => c._id === form.classId)?.name ||
    classes.find((c) => c._id === form.classId)?.className ||
    form.classId ||
    "—";
  const sectionName =
    sections.find((s) => s.value === form.sectionId)?.label ||
    form.sectionId ||
    "—";

  const transportName =
    transportRoutes.find((route) => route._id === form.transport)?.name ||
    form.transport?.name ||
    "";
  const selectedOptionalFeeNames = feeStructure
    .filter((fee) =>
      (form.selectedOptionalFees || []).includes(String(fee._id)),
    )
    .map((fee) => fee.name)
    .join(", ");
  const selectedBusQuarter =
    busFeeQuarterOptions.find((option) => option.value === form.busFeeQuarter)
      ?.label || "";

  const initials =
    `${form.firstName?.[0] || ""}${form.lastName?.[0] || ""}`.toUpperCase();

  const Section = ({ title, headerClass, children }) => (
    <div className="border border-gray-200 rounded-xl overflow-hidden mb-3 bg-[rgb(var(--surface))]">
      <div className={`px-4 py-2.5 border-b border-gray-200 ${headerClass}`}>
        <span className="text-sm font-medium ">{title}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 bg-white">{children}</div>
    </div>
  );

  const Field = ({ label, value }) => {
    if (!value && value !== 0) return null;
    return (
      <div className="px-4 py-2.5 border-b border-r text-[rgb(var(--text))] bg-[rgb(var(--surface))] border border-[rgb(var(--border))]">
        <div className="text-[11px] uppercase tracking-wide  mb-0.5">
          {label}
        </div>
        <div className="text-sm font-medium ">{value}</div>
      </div>
    );
  };

  return (
    <div className=" border border-[rgb(var(--border))] text-[rgb(var(--text))] bg-[rgb(var(--surface))]" >
      {/* Header card */}
      <div className="flex items-center gap-4 p-4 mb-4  rounded-xl  text-[rgb(var(--text))]  border border-[rgb(var(--border))]">
        <div
          className="w-13 h-13 rounded-full bg-blue-100 flex items-center justify-center text-lg font-medium text-blue-800 shrink-0 overflow-hidden"
          style={{ width: 52, height: 52 }}
        >
          {form.documents?.studentPhoto?.url ? (
            <img
              src={form.documents.studentPhoto.url}
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            initials
          )}
        </div>
        <div>
          <div className="text-base font-medium ">
            {form.firstName} {form.lastName}
          </div>
          <div className="text-sm mt-0.5">
            {className}
            {sectionName ? ` • ${sectionName}` : ""}
            {form.rollNo ? ` • Roll ${form.rollNo}` : ""}
          </div>
        </div>
        {form.studentType && (
          <span className="ml-auto text-xs font-medium px-2.5 py-1 bg-green-100 text-green-800 rounded-lg">
            {form.studentType}
          </span>
        )}
      </div>

      <Section title="Student details" headerClass="">
        <Field label="First name" value={form.firstName} />
        <Field label="Last name" value={form.lastName} />
        <Field label="Date of birth" value={form.dob} />
        <Field label="Gender" value={form.gender} />
        <Field label="Blood group" value={form.bloodGroup} />
        <Field label="Admission date" value={form.admissionDate} />
      </Section>

      <Section title="Parent / guardian" headerClass="">
        <Field label="Father name" value={form.fatherName} />
        <Field label="Father mobile" value={form.fatherMobile} />
        <Field label="Father email" value={form.fatherEmail} />
        <Field label="Mother name" value={form.motherName} />
        <Field label="Mother mobile" value={form.motherMobile} />
        <Field label="Mother email" value={form.motherEmail} />
        <Field label="Guardian name" value={form.guardianName} />
        <Field label="Guardian mobile" value={form.guardianMobile} />
        <Field label="Relation" value={form.guardianRelation} />
        <Field label="Address" value={form.address} />
      </Section>

      <Section title="Class details" headerClass="">
        <Field label="Class" value={className} />
        <Field label="Section" value={sectionName} />
        <Field label="Roll number" value={form.rollNo} />
        <Field label="Student type" value={form.studentType} />
        <Field label="Transport route" value={transportName} />
      </Section>

      <Section title="Fee structure" headerClass="">
        <Field
          label="Bus service"
          value={form.useTransport ? "Included" : "Not selected"}
        />
        <Field
          label="Bus fee type"
          value={form.useTransport ? form.busFeeFrequency : null}
        />
        <Field
          label="Bus fee quarter"
          value={
            form.useTransport && form.busFeeFrequency === "quarterly"
              ? selectedBusQuarter || null
              : null
          }
        />
        <Field
          label="Other optional fees"
          value={selectedOptionalFeeNames || null}
        />
        <Field label="Fee frequency" value={freqFilter || null} />
        <Field
          label="Total annual fee"
          value={
            form.totalFee
              ? `₹${Number(form.totalFee).toLocaleString("en-IN")}`
              : null
          }
        />
        <Field label="Discount type" value={form.discountType} />
        <Field
          label="Discount value"
          value={
            form.discountValue
              ? form.discountType === "Percentage"
                ? `${form.discountValue}%`
                : `₹${form.discountValue}`
              : null
          }
        />
        <Field
          label="Final fee"
          value={
            form.finalFee
              ? `₹${Number(form.finalFee).toLocaleString("en-IN")}`
              : null
          }
        />
      </Section>

      <Section title="Parent login" headerClass="">
        <Field label="Username" value={form.username} />
        <Field label="Password" value={form.password ? "••••••••" : null} />
      </Section>

      {/* Documents */}
      {form.documents &&
        Object.keys(form.documents).some((k) => form.documents[k]?.url) && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-pink-50 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-800">
                Documents uploaded
              </span>
            </div>
            <div className="flex flex-wrap gap-2 p-4 bg-white">
              {Object.entries(form.documents).map(([key, val]) =>
                val?.url ? (
                  <span
                    key={key}
                    className="px-3 py-1 text-xs font-medium bg-pink-50 text-pink-800 rounded-lg"
                  >
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                ) : null,
              )}
            </div>
          </div>
        )}
    </div>
  );
};
