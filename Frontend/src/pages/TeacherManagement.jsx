import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

const API = import.meta.env.VITE_API_URL;

const steps = [
  "Basic Information",
  "Professional Details",
  "Employment Details",
  "ERP Mapping",
  "Review",
];

const emptyForm = {
  fullName: "",
  dob: "",
  gender: "",
  phone: "",
  email: "",
  address: "",
  governmentId: "",
  photo: null,

  qualification: "",
  experience: "",
  subjects: [],
  department: "",

  designation: "",
  joiningDate: "",
  employmentType: "",
  salary: "",

  assignedClasses: [],
  role: "",
  username: "",
  password: "",
};

const TeacherManagement = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const isEdit = Boolean(id);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState("");

  // Dropdowns
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const isMobile = window.innerWidth <= 768;
  const progress = (step / steps.length) * 100;

  /* FETCH DROPDOWN DATA */

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        setLoading(true);

        const [subjectsRes, classesRes] = await Promise.all([
          axios.get(`${API}/subjects/all`, { withCredentials: true }),
          axios.get(`${API}/classes/all`, { withCredentials: true }),
        ]);

        setSubjects(subjectsRes.data.subjects || []);
        setClasses(classesRes.data.classes || []);
      } catch (error) {
        toast.error("Failed to load dropdown data");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchDropdownData();
  }, []);

  /* FETCH TEACHER */

  useEffect(() => {
    if (!id) return;

    const fetchTeacher = async () => {
      try {
        const res = await axios.get(`${API}/teachers/${id}`, {
          withCredentials: true,
        });

        const t = res.data.data;

        setForm({
          ...t,
          dob: t.dob ? t.dob.split("T")[0] : "",
          joiningDate: t.joiningDate ? t.joiningDate.split("T")[0] : "",
          // Normalize to plain IDs in case they come back as populated objects
          assignedClasses: (t.assignedClasses || []).map((c) =>
            typeof c === "object" ? c._id : c,
          ),
          subjects: (t.subjects || []).map((s) =>
            typeof s === "object" ? s._id : s,
          ),
        });
      } catch {
        toast.error("Failed to load teacher");
      }
    };

    fetchTeacher();
  }, [id]);

  /* FORM CHANGE */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* MULTI SELECT FOR CLASSES */

  const handleClassChange = (e) => {
    const options = Array.from(e.target.selectedOptions);
    const values = options.map((opt) => opt.value);

    setForm((prev) => ({
      ...prev,
      assignedClasses: values,
    }));
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

    setForm((prev) => ({
      ...prev,
      [name]: file,
    }));
  };

  /* DIRTY CHECK */

  const isDirty = () => Object.values(form).some((v) => v !== "" && v !== null);

  /* VALIDATION */

  const validateStep = () => {
    const errors = [];

    if (step === 1) {
      if (!form.fullName.trim()) errors.push("Full Name required");
      if (!form.phone.trim()) errors.push("Phone required");
      if (!form.email.trim()) errors.push("Email required");

      if (form.phone && !/^\d{10}$/.test(form.phone))
        errors.push("Invalid phone number");

      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        errors.push("Invalid email format");
    }

    if (step === 2) {
      if (!form.qualification) errors.push("Qualification required");
      if (!form.subjects) errors.push("Subject required");
    }

    if (step === 3) {
      if (!form.designation) errors.push("Designation required");
      if (!form.joiningDate) errors.push("Joining Date required");
    }

    if (step === 4) {
      if (!form.username) errors.push("Username required");
      if (!isEdit && !form.password) errors.push("Password required");
      if (!form.role) errors.push("Role required");
    }

    return errors;
  };

  const next = () => {
    const errors = validateStep();

    if (errors.length) {
      errors.forEach((e) => toast.error(e));
      return;
    }

    setStep((s) => s + 1);
  };

  const prev = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  /* RESET */

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
    });

    setConfirmOpen(true);
  };

  /* SUBMIT */

  const handleSubmit = () => {
    setConfirmMessage(
      isEdit
        ? "Are you sure you want to update this teacher?"
        : "Are you sure you want to save this teacher?",
    );

    setConfirmAction(() => submitTeacher);

    setConfirmOpen(true);
  };

  const submitTeacher = async () => {
    try {
      const data = new FormData();

      Object.keys(form).forEach((key) => {
        const value = form[key];

        // skip these always
        const forbidden = [
          "_id",
          "__v",
          "createdAt",
          "updatedAt",
          "teacherId",
          "photo",
        ];
        if (forbidden.includes(key)) return;

        if (key === "subjects" || key === "assignedClasses") {
          data.append(key, JSON.stringify(value));
          return;
        }

        if (value === null || value === "" || value === undefined) return;

        data.append(key, value);
      });

      // Only append photo if user picked a NEW file
      if (
        form.photo &&
        typeof form.photo === "object" &&
        form.photo instanceof Blob
      ) {
        data.append("photo", form.photo);
      }
      // if form.photo is the existing {url, public_id, type} object → don't send it at all
      // backend will keep the existing photo as-is

      if (isEdit) {
        await axios.put(`${API}/teachers/${id}`, data, {
          withCredentials: true,
        });
        toast.success("Teacher updated successfully");
      } else {
        await axios.post(`${API}/teachers`, data, { withCredentials: true });
        toast.success("Teacher added successfully");
      }

      navigate("/school/teachers");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Operation failed");
    }
  };

  /* REFRESH WARNING */

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

  /* RESOLVE SUBJECT NAMES for Review */

  const resolvedSubjectNames = subjects
    .filter((s) => (form.subjects || []).includes(s._id))
    .map((s) => s.name)
    .join(", ");

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[rgb(var(--bg))] min-h-screen">
      {/* HEADER */}
      {/* 🔙 BACK BUTTON */}
      {isMobile && (
        <div className="pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl
                 bg-[rgb(var(--surface))] shadow-sm border border-slate-100
                 text-sm font-bold text-[rgb(var(--text))] active:scale-95 transition-transform mb-2.5"
          >
            <FaArrowLeft size={16} />
            Back
          </button>
        </div>
      )}{" "}
      <div className="flex flex-col sm:flex-row sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">
          {isEdit ? "Edit Teacher Details" : "Add Teacher"}
        </h1>

        <button
          onClick={resetForm}
          className="px-4 py-2 bg-[rgb(var(--primary))] 0 text-[rgb(var(--text))]  rounded-lg transition"
        >
          Reset
        </button>
      </div>
      <div className="grid grid-cols-12 gap-6">
        {/* STEP SIDEBAR */}

        <div className="col-span-12 lg:col-span-3">
          <div className="bg-[rgb(var(--surface))] rounded-xl shadow p-4 sticky top-6">
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

                    if (index > step && errors.length) {
                      toast.error("Complete this step first");
                      return;
                    }

                    setStep(index);
                  }}
                  className={`flex items-center gap-3 p-3 rounded-lg mb-2 cursor-pointer transition
                  ${
                    status === "active"
                      ? "bg-[rgb(var(--primary))] text-[rgb(var(--text))]"
                      : "bg-[rgb(var(--surface))] hover:bg-[rgb(var(--surface-hover))]"
                  }`}
                >
                  <div
                    className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold
                    ${
                      status === "complete"
                        ? "bg-[rgb(var(--surface))] text-[rgb(var(--text))]"
                        : status === "active"
                          ? "text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
                          : "bg-gray-300"
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

        {/* FORM */}

        <div className="col-span-12 lg:col-span-9">
          <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-xl shadow p-6 lg:p-8">
            {/* PROGRESS */}

            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">
                  Step {step} of {steps.length}
                </span>

                <span className="text-gray-600">{Math.round(progress)}%</span>
              </div>

              <div className="w-full bg-gray-200 h-2 rounded-full">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* STEP CONTENT */}

            {step === 1 && (
              <div className="grid md:grid-cols-2 gap-6">
                <Input
                  label="Full Name *"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Enter full name"
                />
                <Input
                  type="date"
                  label="Date of Birth"
                  name="dob"
                  value={form.dob}
                  onChange={handleChange}
                />
                <Select
                  label="Gender"
                  name="gender"
                  value={form.gender}
                  options={["Male", "Female", "Other"]}
                  onChange={handleChange}
                />
                <Input
                  label="Phone *"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="10-digit mobile number"
                />
                <Input
                  type="email"
                  label="Email *"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="teacher@example.com"
                />
                <Input
                  label="Government ID"
                  name="governmentId"
                  value={form.governmentId}
                  onChange={handleChange}
                  placeholder="Aadhaar/PAN/etc"
                />
                <Input
                  label="Address"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Full address"
                  className="md:col-span-2"
                />
                <File
                  label="Teacher Photo"
                  name="photo"
                  onChange={handleFileChange}
                />
              </div>
            )}

            {step === 2 && (
              <div className="grid md:grid-cols-2 gap-6">
                <Input
                  label="Qualification *"
                  name="qualification"
                  value={form.qualification}
                  onChange={handleChange}
                  placeholder="B.Ed, M.A, etc"
                />
                <Input
                  type="number"
                  label="Experience (Years)"
                  name="experience"
                  value={form.experience}
                  onChange={handleChange}
                  placeholder="Years of teaching"
                />
                <Select
                  label="Subjects *"
                  name="subjects"
                  multiple
                  value={form.subjects}
                  options={subjects.map((s) => ({
                    label: s.name,
                    value: s._id,
                  }))}
                  onChange={handleChange}
                />
                <Input
                  label="Department"
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  placeholder="e.g., Science, Arts"
                />
              </div>
            )}

            {step === 3 && (
              <div className="grid md:grid-cols-2 gap-6">
                <Input
                  label="Designation *"
                  name="designation"
                  value={form.designation}
                  onChange={handleChange}
                  placeholder="e.g., Senior Teacher, HOD"
                />
                <Input
                  type="date"
                  label="Joining Date *"
                  name="joiningDate"
                  value={form.joiningDate}
                  onChange={handleChange}
                />
                <Select
                  label="Employment Type"
                  name="employmentType"
                  value={form.employmentType}
                  options={["Full Time", "Part Time", "Contract"]}
                  onChange={handleChange}
                />
                <Input
                  type="number"
                  label="Salary"
                  name="salary"
                  value={form.salary}
                  onChange={handleChange}
                  placeholder="Monthly salary"
                />
              </div>
            )}

            {step === 4 && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm mb-1 text-gray-600">
                    Assigned Classes
                  </label>
                  <select
                    multiple
                    value={form.assignedClasses}
                    onChange={handleClassChange}
                    className="w-full border px-3 py-2 rounded-lg h-32"
                  >
                    {classes.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name || c.className}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Hold Ctrl/Cmd to select multiple classes
                  </p>
                </div>

                <Select
                  label="Role *"
                  name="role"
                  value={form.role}
                  options={["Teacher", "Class Teacher", "HOD", "Coordinator"]}
                  onChange={handleChange}
                />

                <Input
                  label="Username *"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Login username"
                />

                <Input
                  type="password"
                  label={
                    isEdit
                      ? "Password (leave blank to keep current)"
                      : "Password *"
                  }
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Create password"
                />
              </div>
            )}

            {step === 5 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Review Details</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <ReviewField label="Full Name" value={form.fullName} />
                  <ReviewField label="Email" value={form.email} />
                  <ReviewField label="Phone" value={form.phone} />
                  <ReviewField label="Gender" value={form.gender} />
                  <ReviewField
                    label="Qualification"
                    value={form.qualification}
                  />
                  <ReviewField
                    label="Subjects"
                    value={resolvedSubjectNames || "Not provided"}
                  />
                  <ReviewField label="Designation" value={form.designation} />
                  <ReviewField
                    label="Employment Type"
                    value={form.employmentType}
                  />
                  <ReviewField label="Role" value={form.role} />
                  <ReviewField label="Username" value={form.username} />
                  <ReviewField
                    label="Assigned Classes"
                    value={`${form.assignedClasses.length} class(es) selected`}
                  />
                </div>
              </div>
            )}

            {/* NAVIGATION */}

            <div className="flex justify-between mt-8">
              {step > 1 && (
                <button
                  onClick={prev}
                  className="px-6 py-2 bg-[rgb(var(--primary))]  rounded-lg  text-[rgb(var(--text))] transition"
                >
                  Back
                </button>
              )}

              {step < steps.length ? (
                <button
                  onClick={next}
                  disabled={validateStep().length > 0}
                  className={`px-6 py-2 rounded-lg text-white ml-auto transition
                  ${
                    validateStep().length
                      ? "bg-[rgb(var(--primary))] cursor-not-allowed"
                      : "bg-[rgb(var(--primary))] "
                  }`}
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition ml-auto"
                >
                  {isEdit ? "Update Teacher" : "Save Teacher"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {confirmOpen && (
        <ConfirmModal
          message={confirmMessage}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            confirmAction?.();
            setConfirmOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default TeacherManagement;

const Input = ({ label, className = "", ...props }) => (
  <div className={className}>
    <label className="block text-sm mb-1 text-[rgb(var(--text))]">{label}</label>
    <input
      {...props}
      className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
    />
  </div>
);

const Select = ({
  label,
  options,
  multiple = false,
  value,
  name,
  onChange,
  ...props
}) => {
  const handleChange = (e) => {
    if (!multiple) return onChange(e);

    const values = Array.from(e.target.selectedOptions).map((opt) => opt.value);

    onChange({
      target: {
        name,
        value: values,
      },
    });
  };

  return (
    <div>
      <label className="block text-sm mb-1 text-[rgb(var(--text))]">{label}</label>

      <select
        {...props}
        name={name}
        value={value}
        multiple={multiple}
        onChange={handleChange}
        className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-[rgb(var(--surface))]"
      >
        {!multiple && <option value="">Select</option>}

        {options.map((o, i) => {
          const val = typeof o === "object" ? o.value : o;
          const label = typeof o === "object" ? o.label : o;

          return (
            <option key={i} value={val}>
              {label}
            </option>
          );
        })}
      </select>

      {multiple && (
        <p className="text-xs text-gray-500 mt-1">
          Hold Ctrl/Cmd to select multiple
        </p>
      )}
    </div>
  );
};

const File = ({ label, name, onChange }) => (
  <div>
    <label className="block text-sm mb-1 text-gray-600">{label}</label>
    <input
      type="file"
      name={name}
      onChange={onChange}
      accept="image/*"
      className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
    />
    <p className="text-xs text-gray-500 mt-1">Max size: 2MB</p>
  </div>
);

const ReviewField = ({ label, value }) => (
  <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] p-3 rounded-lg border-black/10">
    <p className="text-xs  mb-1">{label}</p>
    <p className="text-sm font-medium">{value || "Not provided"}</p>
  </div>
);

const ConfirmModal = ({ message, onCancel, onConfirm }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-[rgb(var(--surface))] rounded-xl p-6 w-96 max-w-full mx-4">
      <h3 className="text-lg font-semibold mb-3">Confirmation</h3>
      <p className="mb-6 text-[rgb(var(--text))]">{message}</p>

      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-[rgb(var(--primary))]  rounded-lg transition"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 text-[rgb(var(--text))] bg-[rgb(var(--primary))]  rounded-lg transition"
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
);
