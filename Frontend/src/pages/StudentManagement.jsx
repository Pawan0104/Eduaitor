import { useState, useEffect, createContext, useContext, useMemo } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { FaArrowLeft, FaSlidersH } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";
import AdmissionFormBuilder from "../components/AdmissionFormBuilder";
import {
  buildFieldIndex,
  mergeAdmissionSteps,
  REVIEW_STEP_KEY,
  ADMISSION_DEFAULTS_VERSION,
} from "../lib/admissionFormDefaults";
import { INDIA_STATES } from "../lib/indiaLocations";

const API = import.meta.env.VITE_API_URL;

/**
 * Field-level overrides from the school's Admission Form Builder.
 * `Input`, `Select` and `File` read this to hide fields or swap the label.
 * `enforceRequired` is false when Confirmation Status is Non-Confirmed.
 */
const AdmissionFieldsContext = createContext({
  fields: new Map(),
  enforceRequired: true,
});

const useAdmissionField = (name) => {
  const { fields } = useContext(AdmissionFieldsContext);
  return name ? fields.get(name) : undefined;
};

const useEnforceRequired = () =>
  useContext(AdmissionFieldsContext).enforceRequired !== false;

/** Labels in the wizard carry " *" for required fields; keep that in sync. */
const applyFieldMetaToLabel = (label, meta, enforceRequired = true) => {
  if (!meta) {
    if (!enforceRequired) return String(label || "").replace(/\s*\*$/, "");
    return label;
  }
  const base = String(label || "").replace(/\s*\*$/, "");
  const text = meta.label || base;
  return enforceRequired && meta.required ? `${text} *` : text;
};

/** Map a validation message back to the field it belongs to. */
const errorFieldKey = (error) => {
  const text = String(error || "").toLowerCase();
  if (!text) return null;
  if (text.includes("first name")) return "firstName";
  if (text.includes("last name")) return "lastName";
  if (text.includes("date of birth") || text.includes("age must be"))
    return "dob";
  if (text.includes("admission date")) return "admissionDate";
  if (text.includes("blood group")) return "bloodGroup";
  if (text.includes("community")) return "community";
  if (text.includes("category")) return "category";
  if (text.includes("gender")) return "gender";
  if (text.includes("father name")) return "fatherName";
  if (text.includes("father mobile")) return "fatherMobile";
  if (text.includes("father email")) return "fatherEmail";
  if (text.includes("mother name")) return "motherName";
  if (text.includes("mother mobile")) return "motherMobile";
  if (text.includes("mother email")) return "motherEmail";
  if (text.includes("guardian mobile")) return "guardianMobile";
  if (text.includes("guardian relation")) return "guardianRelation";
  if (text.includes("guardian email")) return "guardianEmail";
  if (text.includes("guardian")) return "guardianName";
  if (text.includes("aadhaar") || text.includes("aadhar")) return "aadhaarNumber";
  if (text.includes("pin code")) return "pincode";
  if (text.includes("udise")) return "previousSchoolUdise";
  if (text.includes("address")) return "address";
  if (text.includes("student photo")) return "studentPhoto";
  if (text.includes("father aadhar")) return "fatherAadhar";
  if (text.includes("mother aadhar")) return "motherAadhar";
  if (text.includes("class")) return "classId";
  if (text.includes("section")) return "sectionId";
  if (text.includes("roll number")) return "rollNo";
  if (text.includes("total fee")) return "totalFee";
  if (text.includes("transport route")) return "transport";
  if (text.includes("bus fee quarter")) return "busFeeQuarter";
  if (text.includes("username")) return "username";
  if (text.includes("password")) return "password";
  return null;
};

const CUSTOM_ERROR_PREFIX = "CF::";

const isEmptyCustomValue = (value) =>
  value === undefined || value === null || value === "" || value === false;

/** Built-in steps that render the prototype admission-form sections. */
const PROTOTYPE_SECTION_KEYS = new Set([
  "builtin_1",
  "builtin_2",
  "builtin_address",
  "builtin_5",
  "builtin_3",
  "builtin_4",
  "builtin_6",
  "builtin_medical",
  "builtin_7",
  "builtin_notes",
]);

/** "Age: 12 Yrs, 3 Mos" style badge used next to Date of Birth. */
const formatAge = (dobStr) => {
  if (!dobStr) return "-- Yrs";
  const birth = new Date(dobStr);
  if (Number.isNaN(birth.getTime())) return "-- Yrs";
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return "-- Yrs";
  return `${years} Yrs${months ? `, ${months} Mos` : ""}`;
};



const splitStudentName = (fullName = "") => {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "-" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
};

const busFeeQuarterOptions = [
  { label: "April-July", value: "april-july" },
  { label: "Aug-Nov", value: "august-november" },
  { label: "Dec-March", value: "december-march" },
];

// Reservation category (Indian school admission forms).
const CATEGORY_OPTIONS = ["General", "OBC", "SC", "ST", "EWS"];

const GUARDIAN_RELATION_OPTIONS = [
  "Grandfather",
  "Grandmother",
  "Paternal Uncle (Tau / Chacha)",
  "Maternal Uncle (Mama)",
  "Aunt (Bua / Mausi)",
  "Elder Brother",
  "Elder Sister",
  "Legal Guardian",
  "Other Relative",
];

const emptyForm = {
  firstName: "",
  lastName: "",
  dob: "",
  gender: "",
  bloodGroup: "",
  nationality: "",
  placeOfBirth: "",
  religion: "",
  nicNumber: "",
  srNo: "",
  apaarId: "",
  caste: "",
  category: "",
  community: "",
  aadhaarNumber: "",
  penNumber: "",
  admissionSource: "",
  confirmationStatus: "Non-Confirmed",
  isActive: true,
  isSpecialChild: false,
  isEws: false,
  isPhysicallyDisabled: false,
  medicalConditionRemarks: "",
  admissionNotes: "",
  admissionDate: "",
  studentId: "",

  fatherName: "",
  fatherMobile: "",
  fatherEmail: "",

  motherName: "",
  motherMobile: "",
  motherEmail: "",

  guardianName: "",
  guardianMobile: "",
  guardianRelation: "",
  guardianEmail: "",

  address: "",
  city: "",
  district: "",
  state: "",
  pincode: "",

  previousSchoolName: "",
  previousSchoolUdise: "",
  previousSchoolClass: "",
  previousSchoolResult: "",
  previousSchoolTcNumber: "",
  schoolLeavingDate: "",
  prevSchoolAddress: "",

  classId: "",
  sectionId: "",
  streamId: "",
  stream: "",
  optionalSubjectIds: [],
  rollNo: "",
  studentType: "Day Scholar",
  feeBatch: "New",
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
  characterCertificate: null,
  lastMarksheet: null,

  studentAadhar: null,
  fatherAadhar: null,
  motherAadhar: null,

  username: "",
  password: "",
  studentUsername: "",
  studentPassword: "",
  extraDocuments: [],
  custom: {},
};

const normFieldLabel = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "");

const ADMISSION_LABEL_ALIASES = {
  mothername: "motherName",
  mothersname: "motherName",
  mother: "motherName",
  mothermobile: "motherMobile",
  mothersmobile: "motherMobile",
  motherphone: "motherMobile",
  motheremail: "motherEmail",
  fathername: "fatherName",
  fathersname: "fatherName",
  parentname: "fatherName",
  parentguardianname: "fatherName",
  fathermobile: "fatherMobile",
  parentmobile: "fatherMobile",
  fatheremail: "fatherEmail",
  parentemail: "fatherEmail",
  previousschool: "previousSchoolName",
  previousschoolname: "previousSchoolName",
  lastclassattended: "previousSchoolClass",
  previousschoolclass: "previousSchoolClass",
  lastclass: "previousSchoolClass",
  lastresult: "previousSchoolResult",
  previousschoolresult: "previousSchoolResult",
  tcnumber: "previousSchoolTcNumber",
  address: "address",
  aadhaarnumber: "aadhaarNumber",
  aadhaar: "aadhaarNumber",
  aadhaarid: "aadhaarNumber",
  aadhar: "aadhaarNumber",
  aadharnumber: "aadhaarNumber",
  dateofbirth: "dob",
  dob: "dob",
  gender: "gender",
  bloodgroup: "bloodGroup",
  aadhaarnumber: "aadhaarNumber",
  aadhaar: "aadhaarNumber",
  aadhaarid: "aadhaarNumber",
  pennumber: "penNumber",
  nationality: "nationality",
  placeofbirth: "placeOfBirth",
  caste: "caste",
  category: "category",
  community: "community",
  stream: "stream",
};

const pushSourceField = (items, key, label, value, type = "text") => {
  if (value === undefined || value === null) return;
  const text = String(value).trim();
  if (!text) return;
  items.push({
    key: String(key),
    label: label || key,
    value: text,
    type: type || "text",
  });
};

const collectFunnelFields = (lead, registration) => {
  const items = [];
  if (lead) {
    pushSourceField(items, "parentName", "Parent Name", lead.parentName);
    pushSourceField(items, "parentMobile", "Parent Mobile", lead.parentMobile, "tel");
    pushSourceField(items, "parentEmail", "Parent Email", lead.parentEmail, "email");
    pushSourceField(
      items,
      "previousSchoolName",
      "Previous School Name",
      lead.previousSchoolName,
    );
    pushSourceField(items, "stream", "Stream", lead.stream);
    for (const field of lead.customFields || []) {
      pushSourceField(
        items,
        field.key,
        field.label || field.key,
        field.value,
        field.type || "text",
      );
    }
  }
  if (registration) {
    pushSourceField(
      items,
      "dob",
      "Date of Birth",
      registration.dob ? String(registration.dob).slice(0, 10) : "",
      "date",
    );
    pushSourceField(items, "gender", "Gender", registration.gender, "select");
    pushSourceField(items, "bloodGroup", "Blood Group", registration.bloodGroup);
    pushSourceField(
      items,
      "parentName",
      "Parent / Guardian Name",
      registration.parentName,
    );
    pushSourceField(
      items,
      "parentMobile",
      "Parent Mobile",
      registration.parentMobile,
      "tel",
    );
    pushSourceField(
      items,
      "parentEmail",
      "Parent Email",
      registration.parentEmail,
      "email",
    );
    pushSourceField(items, "address", "Address", registration.address, "textarea");
    pushSourceField(items, "city", "City", registration.city);
    pushSourceField(items, "district", "District", registration.district);
    pushSourceField(items, "state", "State", registration.state);
    pushSourceField(items, "pincode", "Pincode", registration.pincode);
    pushSourceField(
      items,
      "previousSchoolName",
      "Previous School",
      registration.previousSchoolName,
    );
    pushSourceField(items, "notes", "Notes", registration.notes, "textarea");
    pushSourceField(items, "stream", "Stream", registration.stream);
    for (const field of registration.customFields || []) {
      pushSourceField(
        items,
        field.key,
        field.label || field.key,
        field.value,
        field.type || "text",
      );
    }
  }

  const byIdentity = new Map();
  for (const item of items) {
    byIdentity.set(normFieldLabel(item.label) || item.key, item);
  }
  return [...byIdentity.values()];
};

const applyFunnelToAdmission = (lead, registration, steps) => {
  const formPatch = {};
  const customPatch = {};
  const admissionFields = (steps || []).flatMap((step) => step.fields || []);
  const builtinByLabel = new Map();
  const customByKey = new Map();
  const customByLabel = new Map();

  for (const field of admissionFields) {
    if (!field?.key || field.key === "carried_from_funnel") continue;
    const labelKey = normFieldLabel(field.label || field.key);
    if (field.builtin && Object.prototype.hasOwnProperty.call(emptyForm, field.key)) {
      if (labelKey) builtinByLabel.set(labelKey, field.key);
    } else if (!field.builtin) {
      customByKey.set(field.key, field);
      if (labelKey && !customByLabel.has(labelKey)) customByLabel.set(labelKey, field);
    }
  }

  const carried = [];
  const seen = new Set();
  const allowedTypes = new Set([
    "text",
    "textarea",
    "number",
    "date",
    "email",
    "tel",
    "select",
    "checkbox",
  ]);

  for (const item of collectFunnelFields(lead, registration)) {
    const labelKey = normFieldLabel(item.label || item.key);
    const alias =
      ADMISSION_LABEL_ALIASES[labelKey] ||
      ADMISSION_LABEL_ALIASES[normFieldLabel(item.key)] ||
      (labelKey.includes("aadhaar") || labelKey.includes("aadhar") || normFieldLabel(item.key).includes("aadhaar") || normFieldLabel(item.key).includes("aadhar")
        ? "aadhaarNumber"
        : undefined);
    if (alias && Object.prototype.hasOwnProperty.call(emptyForm, alias)) {
      formPatch[alias] = alias === "dob" ? String(item.value).slice(0, 10) : item.value;
      continue;
    }

    const direct = customByKey.get(item.key);
    if (direct) {
      customPatch[direct.key] = item.value;
      continue;
    }
    const byLabel = labelKey ? customByLabel.get(labelKey) : null;
    if (byLabel) {
      customPatch[byLabel.key] = item.value;
      continue;
    }
    const builtinKey = labelKey ? builtinByLabel.get(labelKey) : "";
    if (builtinKey) {
      formPatch[builtinKey] = item.value;
      continue;
    }

    const rawKey = String(item.key).startsWith("cf_")
      ? item.key
      : `cf_${labelKey || item.key}`;
    const carryKey = rawKey.slice(0, 60);
    if (seen.has(carryKey)) {
      customPatch[carryKey] = item.value;
      continue;
    }
    seen.add(carryKey);
    carried.push({
      key: carryKey,
      label: item.label || item.key,
      type: allowedTypes.has(item.type) ? item.type : "text",
      required: false,
      visible: true,
      placeholder: "",
      help: "",
      options: [],
      builtin: false,
    });
    customPatch[carryKey] = item.value;
  }

  return { formPatch, customPatch, carried };
};

const toDateInputValue = (date) => date.toISOString().slice(0, 10);

// QA helper: fills the currently visible step with sample data so the wizard can
// be walked end-to-end without typing. Test-only — never auto-applied.
const DUMMY_DATA_BY_SECTION = {
  builtin_1: () => ({
    firstName: "Test",
    lastName: "Student",
    dob: "2015-06-15",
    gender: "Male",
    religion: "Hindu",
    category: "General",
    aadhaarNumber: "123412341234",
    nicNumber: "NIC123456",
    srNo: "SR/2026/001",
    penNumber: "PEN123456",
    apaarId: "123456789012",
    admissionDate: toDateInputValue(new Date()),
  }),
  builtin_2: () => ({
    fatherName: "Ramesh Test",
    fatherMobile: "9876543210",
    fatherEmail: "ramesh.test@example.com",
    motherName: "Sunita Test",
    motherMobile: "9876543211",
    motherEmail: "sunita.test@example.com",
    guardianName: "Anita Guardian",
    guardianRelation: "Aunt (Bua / Mausi)",
    guardianEmail: "anita.guardian@example.com",
  }),
  builtin_address: () => ({
    address: "12 Test Park Lane",
    city: "Test City",
    district: "Test District",
    state: "Rajasthan",
    pincode: "500001",
  }),
  builtin_5: (classes) => ({
    classId: classes?.[0]?._id || classes?.[0]?.id || "",
    rollNo: "1",
    studentType: "Day Scholar",
    feeBatch: "New",
  }),
  builtin_3: () => ({
    previousSchoolName: "Test Public School",
    previousSchoolUdise: "12345678901",
    previousSchoolClass: "Class 4",
    previousSchoolResult: "Pass",
    previousSchoolTcNumber: "TC/2024/001",
    schoolLeavingDate: "2026-03-31",
    prevSchoolAddress: "Test Town, Test District, Rajasthan",
  }),
  builtin_6: () => ({
    discountType: "Percentage",
    discountValue: "10",
  }),
  builtin_7: () => ({
    username: "9876543210",
    password: "Test@1234",
  }),
};

// 1x1 transparent PNG — lets QA clear the required-document step without
// hunting for real files. Uploads are disposable test artefacts.
const createDummyImageFile = (label) => {
  const pngBytes = [
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
    0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06,
    0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44,
    0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00, 0x03, 0x01, 0x01,
    0x00, 0x18, 0xdd, 0x8d, 0xb0, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
    0xae, 0x42, 0x60, 0x82,
  ];
  // NOTE: this file declares a `File` upload component further down, which
  // shadows the global File constructor — so qualify as window.File.
  return new window.File([new Uint8Array(pngBytes)], label, {
    type: "image/png",
  });
};

const DUMMY_DOCUMENT_FIELDS = [
  "studentPhoto",
  "transferCertificate",
  "studentAadhar",
  "characterCertificate",
  "lastMarksheet",
];

const createExtraDocument = () => {
  const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `extra-${uniqueSuffix}`,
    fieldName: `extraDocument_${uniqueSuffix}`,
    label: "",
    file: null,
    existingUrl: null,
  };
};

const DUMMY_SECTION_HINTS = {
  builtin_1:
    "name, date of birth, gender, religion, category and admission date",
  builtin_2: "parent, guardian and contact details",
  builtin_address: "address, city, district, state and PIN code",
  builtin_5: "class, section, residence mode and transport route",
  builtin_3: "previous school details",
  builtin_4: "sample photo and certificate files",
  builtin_6: "discount settings — fee totals recalculate automatically",
  builtin_medical: "a sample medical note",
  builtin_7: "parent and student login credentials",
  builtin_notes: "a sample office remark",
};

const SectionHeading = ({ title }) => {
  if (!title) return null;
  return (
    <h3 className="mb-5 border-b border-[rgb(var(--border))] pb-2 text-lg font-semibold tracking-tight text-[rgb(var(--text))]">
      {title}
    </h3>
  );
};

const DummyFillBar = ({ onFill, sectionKey }) => (
  <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-amber-400 bg-amber-50 px-4 py-3">
    <div className="min-w-0">
      <p className="text-sm font-semibold text-amber-900">Test data</p>
      <p className="text-xs text-amber-800">
        Fills{" "}
        {DUMMY_SECTION_HINTS[sectionKey] || "every field on all sections"} with
        sample values.
      </p>
    </div>
    <button
      type="button"
      onClick={onFill}
      className="shrink-0 rounded-lg border border-amber-500 bg-white px-4 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1"
    >
      Fill dummy data
    </button>
  </div>
);

const StudentManagement = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isEdit = Boolean(id);
  const leadIdParam = !isEdit ? searchParams.get("leadId") || "" : "";
  const registrationIdParam = !isEdit
    ? searchParams.get("registrationId") || ""
    : "";
  const basePath = user?.role === "staff_admin" ? "/staff" : "/school";

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [sourceLead, setSourceLead] = useState(null);
  const [sourceRegistration, setSourceRegistration] = useState(null);
  const [leadId, setLeadId] = useState("");
  const [registrationId, setRegistrationId] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [classes, setClasses] = useState([]);
  const [streams, setStreams] = useState([]);
  const [sections, setSections] = useState([]);

  const [feeStructure, setFeeStructure] = useState([]);
  const [transportRoutes, setTransportRoutes] = useState([]);
  const [freqFilter, setFreqFilter] = useState("annually");

  // Admin-customisable admission form (Admission Form Builder).
  const [formStepDefs, setFormStepDefs] = useState(() =>
    mergeAdmissionSteps(null)
  );
  const [funnelSource, setFunnelSource] = useState(null);
  const [carriedFields, setCarriedFields] = useState([]);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState("steps"); // steps | single
  const [layoutSaving, setLayoutSaving] = useState(false);

  const isSinglePage = layoutMode === "single";
  const canChangeLayout = ["school_admin", "super_admin"].includes(user?.role);

  const activeStepDefs = useMemo(() => {
    const all = (formStepDefs || []).filter(
      (step) => step?.key !== "carried_from_funnel",
    );
    const review = all.find((step) => step?.key === REVIEW_STEP_KEY) || {
      key: REVIEW_STEP_KEY,
      title: "Review",
      builtin: true,
      fields: [],
    };
    const body = all.filter((step) => step?.key !== REVIEW_STEP_KEY);
    if (!carriedFields.length) return [...body, review];
    return [
      ...body,
      {
        key: "carried_from_funnel",
        title: "From Lead / Registration",
        builtin: false,
        fields: carriedFields,
      },
      review,
    ];
  }, [formStepDefs, carriedFields]);

  // Review is always the last step now that sections are data-driven.
  const reviewStep = activeStepDefs.length;
  const wizardSteps = activeStepDefs.map((s) => s.title);
  const fieldIndex = useMemo(
    () => buildFieldIndex(activeStepDefs),
    [activeStepDefs],
  );

  const customFieldsForStep = (stepNumber, stepDefs = activeStepDefs) => {
    const def = stepDefs[stepNumber - 1];
    return (def?.fields || []).filter((field) => !field.builtin);
  };

  const setCustomValue = (key, value) =>
    setForm((prev) => ({ ...prev, custom: { ...prev.custom, [key]: value } }));

  useEffect(() => {
    let cancelled = false;
    let loadGen = 0;

    (async () => {
      const gen = ++loadGen;
      try {
        const res = await axios.get(`${API}/admission-form`, {
          withCredentials: true,
        });
        if (cancelled || gen !== loadGen) return;
        setFormStepDefs(
          mergeAdmissionSteps(
            res.data?.data?.steps,
            res.data?.data?.defaultsVersion,
          ),
        );
        setLayoutMode(
          res.data?.data?.layoutMode === "single" ? "single" : "steps",
        );
      } catch {
        /* keep the built-in layout */
      }
    })();

    // The standalone builder page fires this after saving.
    const handleUpdate = (event) => {
      // Invalidate any in-flight GET so it cannot overwrite a fresh save.
      loadGen += 1;
      setFormStepDefs(
        mergeAdmissionSteps(event.detail, ADMISSION_DEFAULTS_VERSION),
      );
    };
    window.addEventListener("admission-form-updated", handleUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener("admission-form-updated", handleUpdate);
    };
  }, []);

  const saveLayoutMode = async (nextMode) => {
    const layout = nextMode === "single" ? "single" : "steps";
    setLayoutSaving(true);
    try {
      const { data } = await axios.patch(
        `${API}/admission-form/layout`,
        { layoutMode: layout },
        { withCredentials: true },
      );
      setLayoutMode(data?.data?.layoutMode === "single" ? "single" : "steps");
      if (layout === "single") setStep(1);
      toast.success(
        layout === "single"
          ? "Admission form is now a single page"
          : "Admission form is now step-by-step",
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not update form layout",
      );
    } finally {
      setLayoutSaving(false);
    }
  };


  const isMobile = window.innerWidth <= 768;

  const addExtraDocument = () => {
    setForm((prev) => ({
      ...prev,
      extraDocuments: [...prev.extraDocuments, createExtraDocument()],
    }));
  };

  const updateExtraDocument = (id, updates) => {
    setForm((prev) => ({
      ...prev,
      extraDocuments: prev.extraDocuments.map((doc) =>
        doc.id === id ? { ...doc, ...updates } : doc,
      ),
    }));
  };

  const removeExtraDocument = (id) => {
    setForm((prev) => ({
      ...prev,
      extraDocuments: prev.extraDocuments.filter((doc) => doc.id !== id),
    }));
  };

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

    return (form.selectedOptionalFees || []).includes(String(fee._id));
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

  const normalizeFeeFrequency = (value) =>
    ["monthly", "quarterly", "half-yearly", "annually"].includes(value)
      ? value
      : "annually";

  const optionalFees = feeStructure.filter((fee) => fee?.isOptional);

  const toggleOptionalFee = (feeId) => {
    const normalizedId = String(feeId);

    setForm((prev) => {
      const current = Array.isArray(prev.selectedOptionalFees)
        ? prev.selectedOptionalFees
        : [];
      return {
        ...prev,
        selectedOptionalFees: current.includes(normalizedId)
          ? current.filter((id) => id !== normalizedId)
          : [...current, normalizedId],
      };
    });
  };

  const progress = (step / wizardSteps.length) * 100;

  /* NEXT ROLL NUMBER (per class + section) */
  const fetchNextRollNo = async (classId, sectionId) => {
    if (!classId) return 1;

    try {
      const params = { classId };
      if (sectionId) params.sectionId = sectionId;

      const res = await axios.get(`${API}/students/next-roll-no`, {
        params,
        withCredentials: true,
      });

      const next = Number(res.data?.data);
      return Number.isFinite(next) && next > 0 ? next : 1;
    } catch (err) {
      console.error("Failed to resolve next roll number:", err);
      return 1;
    }
  };

  // Auto-fill the roll number whenever the class/section changes (create only —
  // never overwrite an existing roll number while editing).
  useEffect(() => {
    if (isEdit) return;
    if (!isSinglePage && step !== 5) return;
    if (!form.classId) return;

    let cancelled = false;

    fetchNextRollNo(form.classId, form.sectionId).then((next) => {
      if (cancelled) return;
      setForm((prev) => {
        // Respect a roll number the user already typed for this class.
        if (prev.rollNo && String(prev.rollNo).trim()) return prev;
        return { ...prev, rollNo: String(next) };
      });
    });

    return () => {
      cancelled = true;
    };
  }, [form.classId, form.sectionId, step, isEdit, isSinglePage]);

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

    const fetchStreams = async () => {
      try {
        const res = await axios.get(`${API}/streams/all`, {
          params: { status: "Active" },
          withCredentials: true,
        });
        setStreams(res.data?.streams || res.data?.data || []);
      } catch (err) {
        console.error(err);
        setStreams([]);
      }
    };

    fetchClasses();
    fetchStreams();
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
      selectedClass.details
        ?.map((d) => {
          const raw = d.sectionId;
          const id =
            raw && typeof raw === "object"
              ? raw._id || raw.id
              : raw;
          if (!id) return null;
          const idStr = String(id);
          if (!/^[a-f\d]{24}$/i.test(idStr)) return null;
          return {
            label:
              (typeof raw === "object" &&
                (raw.name || raw.sectionName)) ||
              "Section",
            value: idStr,
          };
        })
        .filter(Boolean) || [];

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

  /* PREFILL FROM REGISTRATION (middle layer after lead) */
  useEffect(() => {
    if (isEdit || !registrationIdParam) return;

    const fetchRegistration = async () => {
      try {
        const res = await axios.get(`${API}/registrations/${registrationIdParam}`, {
          withCredentials: true,
        });
        const registration = res.data?.data;
        if (!registration) {
          toast.error("Registration not found");
          return;
        }
        if (registration.studentId || registration.status === "admitted") {
          toast.info("This registration is already admitted");
          if (registration.studentId) {
            navigate(`${basePath}/student-view/${registration.studentId}`, {
              replace: true,
            });
          } else {
            navigate(`${basePath}/registrations`, { replace: true });
          }
          return;
        }
        if (registration.status === "cancelled") {
          toast.error("Cancelled registrations cannot be admitted");
          navigate(`${basePath}/registrations`, { replace: true });
          return;
        }
        if (
          registration.entranceExamEnabled !== false &&
          registration.entranceExamId &&
          registration.entrance?.result !== "pass"
        ) {
          toast.error(
            registration.entrance?.result === "fail"
              ? "This candidate did not pass the entrance exam"
              : "Entrance exam result is still pending. Add the marks first.",
          );
          navigate(
            `${basePath}/registrations?registrationId=${registration._id}`,
            { replace: true },
          );
          return;
        }

        let linkedLead = null;
        if (registration.leadId) {
          try {
            const leadRes = await axios.get(
              `${API}/leads/${registration.leadId}`,
              { withCredentials: true },
            );
            linkedLead = leadRes.data?.data || null;
          } catch {
            linkedLead = null;
          }
        }
        setSourceRegistration(registration);
        setRegistrationId(registration._id);
        if (registration.leadId) setLeadId(String(registration.leadId));
        if (linkedLead) setSourceLead(linkedLead);
        setFunnelSource({ lead: linkedLead, registration });
      } catch (err) {
        toast.error(
          err?.response?.data?.message || "Failed to load registration",
        );
        navigate(`${basePath}/registrations`, { replace: true });
      }
    };

    fetchRegistration();
  }, [isEdit, registrationIdParam, basePath, navigate]);

  /* Prefetch next admission number for create mode (locked field). */
  useEffect(() => {
    if (isEdit) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`${API}/students/next-admission-number`, {
          withCredentials: true,
        });
        const nextId = res.data?.data;
        if (cancelled || !nextId) return;
        setForm((prev) =>
          prev.studentId ? prev : { ...prev, studentId: String(nextId) },
        );
      } catch {
        /* server still auto-generates on save if this fails */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit]);

  /* PREFILL FROM LEAD (legacy/direct — prefer registration when present) */
  useEffect(() => {
    if (isEdit || !leadIdParam || registrationIdParam) return;

    const fetchLead = async () => {
      try {
        const res = await axios.get(`${API}/leads/${leadIdParam}`, {
          withCredentials: true,
        });
        const lead = res.data?.data;
        if (!lead) {
          toast.error("Lead not found");
          return;
        }
        if (lead.studentId) {
          toast.info("This lead is already converted");
          navigate(`${basePath}/student-view/${lead.studentId}`, { replace: true });
          return;
        }
        if (String(lead.status || "").toLowerCase() === "cancelled") {
          toast.error("Cancelled leads cannot be admitted");
          navigate(`${basePath}/leads`, { replace: true });
          return;
        }
        // Route through the registration middle layer when one already exists.
        if (lead.registrationId) {
          navigate(
            `${basePath}/student-manage?registrationId=${lead.registrationId}`,
            { replace: true },
          );
          return;
        }

        setSourceLead(lead);
        setLeadId(lead._id);
        setFunnelSource({ lead, registration: null });
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load lead");
        navigate(`${basePath}/leads`, { replace: true });
      }
    };

    fetchLead();
  }, [isEdit, leadIdParam, registrationIdParam, basePath, navigate]);

  useEffect(() => {
    if (isEdit || !funnelSource) return;
    const { lead, registration } = funnelSource;
    const mapped = applyFunnelToAdmission(lead, registration, formStepDefs);
    const studentName = registration?.studentName || lead?.studentName || "";
    const { firstName, lastName } = splitStudentName(studentName);
    const latestRemark = [...(lead?.followUps || [])]
      .reverse()
      .find((entry) => String(entry?.comment || "").trim())?.comment;

    setCarriedFields(mapped.carried);
    setForm((prev) => ({
      ...prev,
      ...mapped.formPatch,
      firstName: firstName || prev.firstName,
      lastName: lastName || prev.lastName,
      dob: registration?.dob
        ? String(registration.dob).slice(0, 10)
        : findCustomValue(registration, (label) =>
            label.includes("dob") || label.includes("date of birth"),
          ) ||
          findCustomValue(lead, (label) =>
            label.includes("dob") || label.includes("date of birth"),
          ) ||
          mapped.formPatch.dob ||
          prev.dob,
      gender: registration?.gender || mapped.formPatch.gender || prev.gender,
      bloodGroup:
        registration?.bloodGroup || mapped.formPatch.bloodGroup || prev.bloodGroup,
      fatherName:
        registration?.parentName ||
        lead?.parentName ||
        mapped.formPatch.fatherName ||
        prev.fatherName,
      motherName:
        findCustomValue(registration, (label) => label.includes("mother")) ||
        findCustomValue(lead, (label) => label.includes("mother")) ||
        mapped.formPatch.motherName ||
        prev.motherName,
      aadhaarNumber:
        findCustomValue(registration, (label) =>
          label.includes("aadhaar") || label.includes("aadhar"),
        ) ||
        findCustomValue(lead, (label) =>
          label.includes("aadhaar") || label.includes("aadhar"),
        ) ||
        mapped.formPatch.aadhaarNumber ||
        prev.aadhaarNumber,
      fatherMobile:
        registration?.parentMobile ||
        lead?.parentMobile ||
        mapped.formPatch.fatherMobile ||
        prev.fatherMobile,
      fatherEmail:
        registration?.parentEmail ||
        lead?.parentEmail ||
        mapped.formPatch.fatherEmail ||
        prev.fatherEmail,
      address:
        [
          registration?.address,
          registration?.city,
          registration?.district,
          registration?.state,
          registration?.pincode,
        ]
          .filter(Boolean)
          .join(", ") ||
        mapped.formPatch.address ||
        prev.address,
      city: registration?.city || mapped.formPatch.city || prev.city,
      district: registration?.district || mapped.formPatch.district || prev.district,
      state: registration?.state || mapped.formPatch.state || prev.state,
      pincode: registration?.pincode || mapped.formPatch.pincode || prev.pincode,
      previousSchoolName:
        registration?.previousSchoolName ||
        lead?.previousSchoolName ||
        mapped.formPatch.previousSchoolName ||
        prev.previousSchoolName,
      medicalConditionRemarks:
        prev.medicalConditionRemarks || latestRemark || "",
      classId: registration?.classId
        ? String(registration.classId)
        : lead?.classId
          ? String(lead.classId)
          : prev.classId,
      sectionId: registration?.sectionId
        ? String(registration.sectionId)
        : prev.sectionId,
      streamId: registration?.streamId
        ? String(registration.streamId)
        : lead?.streamId
          ? String(lead.streamId)
          : prev.streamId,
      stream:
        registration?.stream ||
        lead?.stream ||
        mapped.formPatch.stream ||
        prev.stream,
      username:
        registration?.parentMobile || lead?.parentMobile || prev.username,
      confirmationStatus: prev.confirmationStatus || "Non-Confirmed",
      custom: { ...prev.custom, ...mapped.customPatch },
    }));
  }, [isEdit, funnelSource, formStepDefs]);

  /* FETCH STUDENT */
  useEffect(() => {
    if (!id) return;

    const fetchStudent = async () => {
      try {
        const res = await axios.get(`${API}/students/${id}`, {
          withCredentials: true,
        });
        const student = res.data.data;
        if (!student) {
          toast.error("Student not found");
          return;
        }

        const knownDocumentFields = new Set([
          "studentPhoto",
          "fatherPhoto",
          "motherPhoto",
          "guardianPhoto",
          "birthCertificate",
          "transferCertificate",
          "characterCertificate",
          "lastMarksheet",
          "studentAadhar",
          "fatherAadhar",
          "motherAadhar",
        ]);

        const extraDocumentsFromDocuments = Object.entries(student.documents || {})
          .filter(([key]) => !knownDocumentFields.has(key))
          .map(([key, value]) => ({
            id: key,
            fieldName: key,
            label: value?.label || "",
            file: null,
            existingUrl: value?.url || null,
          }));

        const extraDocumentsFromArray = (student.extraDocuments || []).map(
          (doc) => ({
            id: doc.fieldName || doc.label || `extra-${Math.random()}`,
            fieldName: doc.fieldName,
            label: doc.label || "",
            file: null,
            existingUrl: doc.url || null,
          }),
        );

        const extraDocuments = [
          ...extraDocumentsFromDocuments,
          ...extraDocumentsFromArray,
        ];

        const toDateInput = (value) => {
          if (!value) return "";
          if (typeof value === "string") return value.split("T")[0];
          try {
            return new Date(value).toISOString().split("T")[0];
          } catch {
            return "";
          }
        };

        // Merge onto emptyForm so every controlled input keeps a defined value.
        // Spreading the raw student object drops defaults and can blank the page.
        setForm({
          ...emptyForm,
          firstName: student.firstName || "",
          lastName: student.lastName || "",
          dob: toDateInput(student.dob),
          gender: student.gender || "",
          bloodGroup: student.bloodGroup || "",
          nationality: student.nationality || "",
          placeOfBirth: student.placeOfBirth || "",
          religion: student.religion || "",
          nicNumber: student.nicNumber || "",
          srNo: student.srNo || "",
          apaarId: student.apaarId || "",
          caste: student.caste || "",
          category: student.category || "",
          community: student.community || "",
          aadhaarNumber: student.aadhaarNumber || "",
          penNumber: student.penNumber || "",
          admissionSource: student.admissionSource || "",
          confirmationStatus:
            student.confirmationStatus === "Confirmed"
              ? "Confirmed"
              : "Non-Confirmed",
          isActive: student.isActive !== false,
          isSpecialChild: Boolean(student.isSpecialChild),
          isEws: Boolean(student.isEws),
          isPhysicallyDisabled: Boolean(student.isPhysicallyDisabled),
          medicalConditionRemarks: student.medicalConditionRemarks || "",
          admissionNotes: student.admissionNotes || "",
          admissionDate: toDateInput(student.admissionDate),
          studentId: student.studentId || "",
          fatherName: student.fatherName || "",
          fatherMobile: student.fatherMobile || "",
          fatherEmail: student.fatherEmail || "",
          motherName: student.motherName || "",
          motherMobile: student.motherMobile || "",
          motherEmail: student.motherEmail || "",
          guardianName: student.guardianName || "",
          guardianMobile: student.guardianMobile || "",
          guardianRelation: student.guardianRelation || "",
          guardianEmail: student.guardianEmail || "",
          address: student.address || "",
          city: student.city || "",
          district: student.district || "",
          state: student.state || "",
          pincode: student.pincode || "",
          previousSchoolName: student.previousSchoolName || "",
          previousSchoolClass: student.previousSchoolClass || "",
          previousSchoolResult: student.previousSchoolResult || "",
          previousSchoolTcNumber: student.previousSchoolTcNumber || "",
          previousSchoolUdise: student.previousSchoolUdise || "",
          schoolLeavingDate: toDateInput(student.schoolLeavingDate),
          prevSchoolAddress: student.prevSchoolAddress || "",
          classId: student.classId?._id || student.classId || "",
          sectionId: student.sectionId?._id || student.sectionId || "",
          streamId: student.streamId?._id || student.streamId || "",
          stream: student.stream || "",
          optionalSubjectIds: Array.isArray(student.optionalSubjectIds)
            ? student.optionalSubjectIds.map((sid) =>
                String(sid?._id || sid),
              )
            : [],
          rollNo: student.rollNo || "",
          studentType: student.studentType || "",
          feeBatch: student.feeBatch === "Old" ? "Old" : "New",
          transport: student.transport?._id || student.transport || "",
          useTransport: Boolean(student.transport),
          selectedOptionalFees: Array.isArray(student.selectedOptionalFees)
            ? student.selectedOptionalFees.map(String)
            : [],
          busFeeFrequency:
            student.busFeeFrequency === "quarterly" ? "quarterly" : "annually",
          busFeeQuarter: student.busFeeQuarter || "",
          totalFee: student.totalFee ?? "",
          discountType: student.discountType || "",
          discountValue: student.discountValue ?? "",
          finalFee: student.finalFee ?? "",
          username:
            student.parentCredentials?.username || student.fatherMobile || "",
          password: "",
          studentUsername: student.studentCredentials?.username || "",
          studentPassword: "",
          documents: student.documents || {},
          extraDocuments,
          custom: Object.fromEntries(
            (student.customFields || []).map((field) => [
              field.key,
              field.value || "",
            ])
          ),
        });
        setFreqFilter(normalizeFeeFrequency(student.feeFrequency));
      } catch {
        toast.error("Failed to load student");
      }
    };

    fetchStudent();
  }, [id]);

  /* CHANGE */
  const fillDummyData = () => {
    if (isEdit) return;

    const dummyDocuments = Object.fromEntries(
      DUMMY_DOCUMENT_FIELDS.map((field) => [
        field,
        createDummyImageFile(`${field}-test.png`),
      ]),
    );

    // Review step has no inputs of its own — fill everything so the whole
    // wizard can be checked in one click.
    if (step === reviewStep) {
      setForm((prev) => ({
        ...prev,
        ...Object.values(DUMMY_DATA_BY_SECTION).reduce(
          (acc, builder) => ({ ...acc, ...builder(classes) }),
          {},
        ),
        ...dummyDocuments,
      }));
      setErrors({});
      return;
    }

    const sectionKey = activeStepDefs[step - 1]?.key;

    if (sectionKey === "builtin_4") {
      setForm((prev) => ({ ...prev, ...dummyDocuments }));
      setErrors({});
      return;
    }

    const builder = DUMMY_DATA_BY_SECTION[sectionKey];
    if (!builder) return;

    setForm((prev) => ({ ...prev, ...builder(classes) }));
    // Stale per-field errors would otherwise stay on screen next to filled inputs.
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Keep mobile numbers as digits only (type=tel) so 10-digit regex works reliably
    const mobileFields = ["fatherMobile", "motherMobile", "guardianMobile"];
    let nextValue = value;
    if (mobileFields.includes(name)) {
      nextValue = String(value || "")
        .replace(/\D/g, "")
        .slice(0, 10);
    }
    if (name === "aadhaarNumber") {
      nextValue = String(value || "")
        .replace(/\D/g, "")
        .slice(0, 12);
    }
    if (name === "pincode") {
      nextValue = String(value || "")
        .replace(/\D/g, "")
        .slice(0, 6);
    }
    if (name === "previousSchoolUdise") {
      nextValue = String(value || "")
        .replace(/\D/g, "")
        .slice(0, 11);
    }

    if (name === "discountValue") {
      // Allow empty or a non-negative number (including decimals)
      if (value !== "" && Number.isNaN(Number(value))) return;
      if (value !== "" && Number(value) < 0) return;
      nextValue = value;
    }
    if (name === "dob") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDob = new Date(value);
      const minAgeDate = new Date(
        today.getFullYear() - 3,
        today.getMonth(),
        today.getDate(),
      );

      if (!value) {
        setErrors((prevErrors) => ({
          ...prevErrors,
          dob: "Date of Birth required",
        }));
      } else if (selectedDob >= today) {
        setErrors((prevErrors) => ({
          ...prevErrors,
          dob: "Date of Birth must be a past date",
        }));
      } else if (selectedDob > minAgeDate) {
        setErrors((prevErrors) => ({
          ...prevErrors,
          dob: "Age must be above 3 years",
        }));
      } else {
        setErrors((prevErrors) => {
          const updatedErrors = { ...prevErrors };
          delete updatedErrors.dob;
          return updatedErrors;
        });
      }
    }

    setForm((prev) => ({
      ...prev,
      [name]: nextValue,
      // Clearing the guardian name hides the dependent fields, so drop their
      // values too — otherwise a half-filled guardian gets submitted silently.
      ...(name === "guardianName" && !String(nextValue || "").trim() && {
        guardianMobile: "",
        guardianRelation: "",
      }),
      ...(name === "classId" && {
        sectionId: "",
        streamId: (() => {
          const linkedOk = (streams || []).some((s) => {
            if (String(s._id) !== String(prev.streamId)) return false;
            const linked = (s.classIds || []).map(String);
            if (!linked.length) return true;
            return linked.includes(String(nextValue));
          });
          return linkedOk ? prev.streamId : "";
        })(),
        stream: (() => {
          const linkedOk = (streams || []).some((s) => {
            if (String(s._id) !== String(prev.streamId)) return false;
            const linked = (s.classIds || []).map(String);
            if (!linked.length) return true;
            return linked.includes(String(nextValue));
          });
          return linkedOk ? prev.stream : "";
        })(),
        optionalSubjectIds: [],
        transport: "",
        useTransport: false,
        selectedOptionalFees: [],
        busFeeFrequency: "annually",
        busFeeQuarter: "",
        discountType: "",
        discountValue: "",
        totalFee: "",
        finalFee: "",
        // Regenerate for the newly picked class on create.
        ...(isEdit ? {} : { rollNo: "" }),
      }),
      ...(name === "busFeeFrequency" && {
        busFeeQuarter: value === "quarterly" ? form.busFeeQuarter : "",
      }),
      ...(name === "transport" && {
        useTransport: Boolean(nextValue),
        busFeeFrequency: nextValue
          ? prev.busFeeFrequency || "annually"
          : "annually",
        busFeeQuarter: nextValue ? prev.busFeeQuarter : "",
      }),
      ...(name === "streamId" && {
        stream:
          (streams || []).find((s) => String(s._id) === String(nextValue))
            ?.name || "",
        optionalSubjectIds: [],
      }),
      ...(name === "sectionId" && {
        optionalSubjectIds: [],
      }),
    }));

    if (name !== "dob" && errors[name]) {
      setErrors((prevErrors) => {
        const updatedErrors = { ...prevErrors };
        delete updatedErrors[name]; // Remove only this field's error
        return updatedErrors;
      });
    }
  };

  const selectedStream = (streams || []).find(
    (s) => String(s._id) === String(form.streamId),
  );
  const streamCompulsoryIds = new Set(
    (selectedStream?.compulsorySubjectIds || []).map(String),
  );
  const streamCompulsorySubjects = (
    selectedStream?.compulsorySubjects ||
    selectedStream?.compulsorySubjectNames?.map((name, i) => ({
      _id: selectedStream.compulsorySubjectIds?.[i],
      name,
    })) ||
    []
  ).filter((sub) => sub?._id || sub?.name);

  const classSubjectsForStudent = (() => {
    const selectedClass = (classes || []).find(
      (c) => String(c._id) === String(form.classId),
    );
    if (!selectedClass) return [];
    const details = Array.isArray(selectedClass.details)
      ? selectedClass.details
      : [];
    const relevant = form.sectionId
      ? details.filter(
          (d) =>
            String(d.sectionId?._id || d.sectionId) === String(form.sectionId),
        )
      : details;
    const byId = new Map();
    for (const detail of relevant.length ? relevant : details) {
      for (const st of detail.subjectTeachers || []) {
        const sid = String(st.subjectId?._id || st.subjectId || "");
        if (!sid) continue;
        if (!byId.has(sid)) {
          byId.set(sid, {
            _id: sid,
            name: st.subjectId?.name || st.name || "Subject",
          });
        }
      }
    }
    return [...byId.values()];
  })();

  const optionalSubjectsForStudent = classSubjectsForStudent.filter(
    (sub) => !streamCompulsoryIds.has(String(sub._id)),
  );

  const toggleOptionalSubject = (subjectId) => {
    const sid = String(subjectId);
    setForm((prev) => {
      const has = (prev.optionalSubjectIds || []).includes(sid);
      return {
        ...prev,
        optionalSubjectIds: has
          ? prev.optionalSubjectIds.filter((id) => id !== sid)
          : [...(prev.optionalSubjectIds || []), sid],
      };
    });
  };

  /* FILE */
  const handleFileChange = (e) => {
    const { name, files } = e.target;
    const file = files[0];

    if (!file) return;

    const photoFields = new Set([
      "studentPhoto",
      "fatherPhoto",
      "motherPhoto",
      "guardianPhoto",
    ]);
    const isPhoto =
      photoFields.has(name) ||
      (name.startsWith("extraDocument_") && file.type.startsWith("image/"));
    const allowedPhoto = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const allowedDoc = [...allowedPhoto, "application/pdf"];
    const allowed = photoFields.has(name) ? allowedPhoto : allowedDoc;
    const extOk = photoFields.has(name)
      ? /\.(jpe?g|png|webp)$/i.test(file.name)
      : /\.(jpe?g|png|webp|pdf)$/i.test(file.name);

    if (!allowed.includes(file.type) && !extOk) {
      toast.error(
        photoFields.has(name)
          ? "Invalid file type. Profile photos must be JPG, PNG, or WEBP."
          : "Invalid file type. Use JPG, PNG, WEBP, or PDF only.",
      );
      e.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File must be less than 2MB");
      e.target.value = "";
      return;
    }
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    if (name === "studentPhoto") {
      toast.success("Profile photo selected. Save the form to update.");
    } else if (isPhoto || name.includes("Photo")) {
      toast.success("Photo selected. Save the form to update.");
    } else {
      toast.success("Document selected. Save the form to update.");
    }

    if (name.startsWith("extraDocument_")) {
      setForm((prev) => ({
        ...prev,
        extraDocuments: prev.extraDocuments.map((doc) =>
          doc.fieldName === name ? { ...doc, file } : doc,
        ),
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: file,
    }));
  };

  useEffect(() => {
    const annual = getIncludedAnnualTotal();
    const rawDiscount = Number(form.discountValue) || 0;

    // Clamp the discount to something that can never wipe the whole fee:
    // percentage to 0–100%, rupees to 0–annual total. Without this an
    // over-typed value silently produced finalFee = 0.
    const discount =
      form.discountType === "Percentage"
        ? Math.min(Math.max(rawDiscount, 0), 100)
        : Math.min(Math.max(rawDiscount, 0), annual);

    let final = annual;

    if (form.discountType === "Percentage") {
      final = annual - (annual * discount) / 100;
    }

    if (form.discountType === "Rupees") {
      final = annual - discount;
    }

    setForm((prev) => ({
      ...prev,
      totalFee: Number(annual.toFixed(2)),
      finalFee: Number(Math.max(0, final).toFixed(2)),
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
    Object.entries(form).some(([key, value]) => {
      // `custom` is always an object (admin-defined fields); only count it
      // once the admin has actually entered something.
      if (key === "custom") {
        return (
          value && typeof value === "object" && Object.keys(value).length > 0
        );
      }
      if (Array.isArray(value)) return value.length > 0;
      if (value && typeof value === "object") {
        return Object.keys(value).length > 0;
      }
      return value !== "" && value !== null && value !== undefined;
    });

  const enforceRequiredFields =
    String(form.confirmationStatus || "").trim() === "Confirmed";

  const validateStep = (targetStep = step) => {
    const errors = [];
    // Non-Confirmed admissions skip every mandatory check; format checks still
    // run when a value is present.
    const require = enforceRequiredFields;

    const stepKey = activeStepDefs[targetStep - 1]?.key;

    if (stepKey === "builtin_1") {
      if (require && !form.firstName?.trim()) errors.push("First Name required");
      if (require && !form.lastName?.trim()) errors.push("Last Name required");
      if (require && !form.dob) {
        errors.push("Date of Birth required");
      } else if (form.dob) {
        const selectedDob = new Date(form.dob);
        const today = new Date();

        // Remove time portion for accurate comparison
        today.setHours(0, 0, 0, 0);

        if (selectedDob >= today) {
          errors.push("Date of Birth must be a past date");
        }

        const minAgeDate = new Date(
          today.getFullYear() - 3,
          today.getMonth(),
          today.getDate(),
        );

        if (selectedDob > minAgeDate) {
          errors.push("Age must be above 3 years");
        }
      }
      if (require && !form.gender) errors.push("Gender required");

      if (
        form.aadhaarNumber?.trim() &&
        !/^\d{12}$/.test(String(form.aadhaarNumber).trim())
      ) {
        errors.push("Invalid Aadhaar number");
      }
    }

    if (stepKey === "builtin_2") {
      if (require && !form.fatherName?.trim()) errors.push("Father name required");
      if (require && !form.fatherMobile?.trim())
        errors.push("Father mobile required");
      // Mother and guardian details are optional in the prototype.
      if (form.fatherMobile && !/^\d{10}$/.test(String(form.fatherMobile)))
        errors.push("Invalid Father Mobile Number");
      if (form.motherMobile && !/^\d{10}$/.test(String(form.motherMobile)))
        errors.push("Invalid Mother Mobile Number");
      if (
        form.guardianMobile?.trim() &&
        !/^\d{10}$/.test(String(form.guardianMobile).trim())
      )
        errors.push("Invalid Guardian Mobile Number");
      // Emails are optional — validate format only when filled
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
      if (form.fatherEmail?.trim() && !emailRegex.test(form.fatherEmail.trim()))
        errors.push("Invalid Father Email");
      if (form.motherEmail?.trim() && !emailRegex.test(form.motherEmail.trim()))
        errors.push("Invalid Mother Email");
      if (
        form.guardianEmail?.trim() &&
        !emailRegex.test(form.guardianEmail.trim())
      )
        errors.push("Invalid Guardian Email");
    }

    if (stepKey === "builtin_address") {
      if (form.pincode?.trim() && !/^\d{6}$/.test(String(form.pincode).trim())) {
        errors.push("Invalid PIN Code");
      }
    }

    if (stepKey === "builtin_3") {
      if (
        form.previousSchoolUdise?.trim() &&
        !/^\d{11}$/.test(String(form.previousSchoolUdise).trim())
      ) {
        errors.push("Invalid Previous School UDISE Code");
      }
    }

    if (stepKey === "builtin_4") {
      // Documents are optional on the prototype form.
    }

    if (stepKey === "builtin_5") {
      if (require && !form.classId) errors.push("Class required");
    }

    if (stepKey === "builtin_6") {
      if (
        require &&
        feeStructure.length > 0 &&
        (form.totalFee === "" || form.totalFee === null)
      ) {
        errors.push("Total fee required");
      }

      if (require && form.useTransport && !form.transport) {
        errors.push("Transport route required when bus service is selected");
      }

      if (
        require &&
        form.useTransport &&
        form.busFeeFrequency === "quarterly" &&
        !form.busFeeQuarter
      ) {
        errors.push("Select the bus fee quarter");
      }
    }

    if (stepKey === "builtin_7") {
      const resolvedUsername = (form.username || form.fatherMobile || "").trim();
      const resolvedPassword = (form.password || "").trim();
      const studentPassword = (form.studentPassword || "").trim();

      if (require && !resolvedUsername) errors.push("Username is required");
      if (require && !isEdit && !resolvedPassword)
        errors.push("Password is required");
      if (resolvedPassword && resolvedPassword.length < 5)
        errors.push("Password must be at least 5 characters");
      if (studentPassword && studentPassword.length < 5)
        errors.push("Student password must be at least 5 characters");
    }

    // ── Admin-defined fields on this step ──
    const stepCustomFields = customFieldsForStep(targetStep);
    stepCustomFields.forEach((field) => {
      if (field.visible === false) return;
      const value = form.custom?.[field.key];
      const label = field.label || "This field";

      if (require && field.required && isEmptyCustomValue(value)) {
        errors.push(`${CUSTOM_ERROR_PREFIX}${field.key}::${label} is required`);
        return;
      }
      if (!isEmptyCustomValue(value) && field.type === "email") {
        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(
          String(value).trim()
        );
        if (!emailOk) {
          errors.push(
            `${CUSTOM_ERROR_PREFIX}${field.key}::Enter a valid email for ${label}`
          );
        }
      }
    });

    // Respect the admin's choices for built-in fields: a hidden/removed field
    // never blocks the wizard, and an optional field ignores "required" errors.
    return errors.filter((error) => {
      const text = String(error);
      if (!require && /required/i.test(text)) return false;
      if (text.startsWith(CUSTOM_ERROR_PREFIX)) return true;
      const key = errorFieldKey(error);
      if (!key) return true;
      const meta = fieldIndex.get(key);
      if (!meta) return true;
      if (meta.visible === false || meta.removed) return false;
      if (!meta.required && /required/i.test(text)) return false;
      return true;
    });
  };

  const validateAllSteps = () => {
    const allErrors = [];
    for (let i = 1; i < reviewStep; i += 1) {
      allErrors.push(...validateStep(i));
    }
    return allErrors;
  };

  const applyValidationErrors = (stepErrorsArray) => {
    const errorMap = {};

    stepErrorsArray.forEach((err) => {
      // Admin-defined field: "CF::<key>::<message>"
      if (String(err).startsWith(CUSTOM_ERROR_PREFIX)) {
        const [, key, ...rest] = String(err).split("::");
        if (key) errorMap[key] = rest.join("::");
        return;
      }

      const lowerErr = err.toLowerCase();

      if (lowerErr.includes("first name")) errorMap.firstName = err;
      if (lowerErr.includes("last name")) errorMap.lastName = err;
      if (lowerErr.includes("date of birth")) errorMap.dob = err;
      if (lowerErr.includes("age must be above 3 years")) errorMap.dob = err;
      if (lowerErr.includes("gender")) errorMap.gender = err;
      if (lowerErr.includes("blood group")) errorMap.bloodGroup = err;
      if (lowerErr.includes("category")) errorMap.category = err;
      if (lowerErr.includes("community")) errorMap.community = err;
      if (lowerErr.includes("admission date")) errorMap.admissionDate = err;
      if (lowerErr.includes("father name")) errorMap.fatherName = err;
      if (
        lowerErr.includes("father mobile") ||
        lowerErr.includes("invalid father mobile")
      )
        errorMap.fatherMobile = err;
      if (lowerErr.includes("mother name")) errorMap.motherName = err;
      if (
        lowerErr.includes("mother mobile") ||
        lowerErr.includes("invalid mother mobile")
      )
        errorMap.motherMobile = err;
      if (lowerErr.includes("father email")) errorMap.fatherEmail = err;
      if (lowerErr.includes("mother email")) errorMap.motherEmail = err;
      if (lowerErr.includes("guardian email")) errorMap.guardianEmail = err;
      if (lowerErr.includes("aadhaar") || lowerErr.includes("aadhar"))
        errorMap.aadhaarNumber = err;
      if (lowerErr.includes("pin code")) errorMap.pincode = err;
      if (lowerErr.includes("udise")) errorMap.previousSchoolUdise = err;
      if (lowerErr.includes("address")) errorMap.address = err;
      if (lowerErr.includes("student photo")) errorMap.studentPhoto = err;
      if (lowerErr.includes("father aadhar")) errorMap.fatherAadhar = err;
      if (lowerErr.includes("mother aadhar")) errorMap.motherAadhar = err;
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
  };

  const next = () => {
    const stepErrorsArray = validateStep();

    if (stepErrorsArray.length > 0) {
      applyValidationErrors(stepErrorsArray);
      toast.error("Please fill in the required fields.");
      return;
    }

    // Keep parent username aligned with father mobile for next step/review.
    if (activeStepDefs[step - 1]?.key === "builtin_7") {
      setForm((prev) => ({
        ...prev,
        username: prev.username || prev.fatherMobile,
      }));
    }

    setErrors({});
    setStep((s) => s + 1);
  };

  const prev = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const findCustomValue = (source, matcher) => {
    const fields = Array.isArray(source?.customFields)
      ? source.customFields
      : [];
    for (const field of fields) {
      const label = String(field?.label || field?.key || "").toLowerCase();
      if (matcher(label) && String(field?.value || "").trim()) {
        return String(field.value).trim();
      }
    }
    return "";
  };

  const applySourcePrefill = (base = emptyForm) => {
    if (sourceRegistration) {
      const { firstName, lastName } = splitStudentName(
        sourceRegistration.studentName,
      );
      const carriedCustom = Object.fromEntries(
        (sourceRegistration.customFields || [])
          .filter((field) => field?.key)
          .map((field) => [field.key, field.value || ""]),
      );
      return {
        ...base,
        firstName,
        lastName,
        dob: sourceRegistration.dob
          ? String(sourceRegistration.dob).slice(0, 10)
          : "",
        gender: sourceRegistration.gender || "",
        bloodGroup: sourceRegistration.bloodGroup || "",
        fatherName: sourceRegistration.parentName || "",
        fatherMobile: sourceRegistration.parentMobile || "",
        fatherEmail: sourceRegistration.parentEmail || "",
        address: [
          sourceRegistration.address,
          sourceRegistration.city,
          sourceRegistration.district,
          sourceRegistration.state,
          sourceRegistration.pincode,
        ]
          .filter(Boolean)
          .join(", "),
        previousSchoolName: sourceRegistration.previousSchoolName || "",
        medicalConditionRemarks: sourceRegistration.notes || "",
        classId: sourceRegistration.classId
          ? String(sourceRegistration.classId)
          : "",
        sectionId: sourceRegistration.sectionId
          ? String(sourceRegistration.sectionId)
          : "",
        streamId: sourceRegistration.streamId
          ? String(sourceRegistration.streamId)
          : "",
        stream: sourceRegistration.stream || "",
        username: sourceRegistration.parentMobile || "",
        custom: { ...(base.custom || {}), ...carriedCustom },
      };
    }
    if (sourceLead) {
      const { firstName, lastName } = splitStudentName(sourceLead.studentName);
      const carriedCustom = Object.fromEntries(
        (sourceLead.customFields || [])
          .filter((field) => field?.key)
          .map((field) => [field.key, field.value || ""]),
      );
      const latestRemark = [...(sourceLead.followUps || [])]
        .reverse()
        .find((entry) => String(entry?.comment || "").trim())?.comment;
      return {
        ...base,
        firstName,
        lastName,
        fatherName: sourceLead.parentName || "",
        fatherMobile: sourceLead.parentMobile || "",
        fatherEmail: sourceLead.parentEmail || "",
        previousSchoolName: sourceLead.previousSchoolName || "",
        medicalConditionRemarks: latestRemark || "",
        classId: sourceLead.classId ? String(sourceLead.classId) : "",
        streamId: sourceLead.streamId ? String(sourceLead.streamId) : "",
        stream: sourceLead.stream || "",
        username: sourceLead.parentMobile || "",
        custom: { ...(base.custom || {}), ...carriedCustom },
      };
    }
    return { ...base };
  };

  const resetForm = () => {
    const doReset = async () => {
      const next = applySourcePrefill({
        ...emptyForm,
        confirmationStatus: "Non-Confirmed",
      });
      setForm(next);
      setStep(1);
      setErrors({});
      if (!isEdit) {
        try {
          const res = await axios.get(`${API}/students/next-admission-number`, {
            withCredentials: true,
          });
          const nextId = res.data?.data;
          if (nextId) {
            setForm((prev) => ({ ...prev, studentId: String(nextId) }));
          }
        } catch {
          /* ignore */
        }
      }
    };

    if (!isDirty()) {
      doReset();
      return;
    }

    setConfirmMessage("Are you sure you want to reset the form?");
    setConfirmAction(() => doReset);
    setConfirmOpen(true);
  };

  const handleSubmit = () => {
    if (isSinglePage) {
      setForm((prev) => ({
        ...prev,
        username: prev.username || prev.fatherMobile,
      }));
      const allErrors = validateAllSteps();
      if (allErrors.length > 0) {
        applyValidationErrors(allErrors);
        toast.error("Please fill in the required fields.");
        return;
      }
      setErrors({});
    }

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
      if (!isEdit && form.classId) {
        const selectedClass = classes.find((c) => c._id === form.classId);
        const detail = selectedClass?.details?.find(
          (d) => String(d.sectionId?._id || d.sectionId) === String(form.sectionId),
        );
        const capacity = Number(detail?.capacity || 0);
        const occupied = Number(detail?.studentCount || 0);
        if (capacity > 0 && occupied >= capacity) {
          toast.error(
            `Class/section capacity reached (${occupied}/${capacity}). Cannot admit more students.`,
          );
          return;
        }
      }

      const data = new FormData();
      const forbidden = [
        "_id",
        "__v",
        "createdAt",
        "updatedAt",
        "documents",
        "useTransport",
        "studentCredentials",
        "parentCredentials",
        // System-assigned on the server — never send a stale preview value.
        "studentId",
      ];

      Object.entries(form).forEach(([key, value]) => {
        if (forbidden.includes(key)) return;
        // Admin-defined fields are sent separately below.
        if (key === "custom") return;

        if (key === "extraDocuments") {
          const extraDocsMeta = [];

          value.forEach((doc) => {
            if (!doc) return;
            if (doc.file) {
              data.append(doc.fieldName, doc.file);
            }
            extraDocsMeta.push({
              fieldName: doc.fieldName,
              label: doc.label || "",
            });
          });

          if (extraDocsMeta.length > 0) {
            data.append("extraDocumentsMeta", JSON.stringify(extraDocsMeta));
          }

          return;
        }

        // Active/Inactive is managed from the student list, not this form.
        if (key === "isActive") return;
        if (value === null || value === "") return;

        if (
          value instanceof Blob ||
          (typeof value === "object" &&
            value?.name &&
            value?.size !== undefined)
        ) {
          data.append(key, value);
        } else if (typeof value === "boolean") {
          data.append(key, value ? "true" : "false");
        } else if (typeof value === "object") {
          data.append(key, JSON.stringify(value));
        } else {
          data.append(key, value);
        }
      });

      data.set("feeFrequency", freqFilter);
      if (!isEdit) {
        data.set("isActive", "true");
      }
      if (!isEdit && registrationId) {
        data.set("registrationId", registrationId);
      } else if (!isEdit && leadId) {
        data.set("leadId", leadId);
      }

      // Admin-defined fields → JSON metadata (+ files with a customField_ prefix).
      const customFieldDefs = activeStepDefs
        .flatMap((stepDef) => stepDef.fields || [])
        .filter((field) => !field.builtin);
      const customMeta = [];
      customFieldDefs.forEach((field) => {
        const value = form.custom?.[field.key];

        if (field.type === "file") {
          if (typeof File !== "undefined" && value instanceof File) {
            data.append(`customField_${field.key}`, value);
            customMeta.push({
              key: field.key,
              label: field.label || "",
              type: field.type,
              value: "",
            });
          } else if (value) {
            customMeta.push({
              key: field.key,
              label: field.label || "",
              type: field.type,
              value: String(value),
            });
          }
          return;
        }

        if (value === undefined || value === null || value === "") return;
        customMeta.push({
          key: field.key,
          label: field.label || "",
          type: field.type,
          value:
            typeof value === "boolean" ? (value ? "Yes" : "No") : String(value),
        });
      });
      if (customMeta.length > 0) {
        data.append("customFieldsMeta", JSON.stringify(customMeta));
      }

      if (isEdit) {
        await axios.put(`${API}/students/${id}`, data, {
          withCredentials: true,
        });
        toast.success("Student updated successfully. Profile refreshed.");
        navigate(`${basePath}/student-view/${id}`, { replace: true });
      } else {
        const res = await axios.post(`${API}/students`, data, {
          withCredentials: true,
        });
        toast.success(
          registrationId
            ? "Student admitted from registration."
            : leadId
              ? "Student admitted from lead."
              : "Student admitted successfully.",
        );
        const newId = res.data?.data?._id;
        if (newId) {
          navigate(`${basePath}/students`, { state: { refresh: true } });
        } else if (registrationId) {
          navigate(`${basePath}/registrations`, { state: { refresh: true } });
        } else {
          navigate(leadId ? `${basePath}/leads` : `${basePath}/students`, {
            state: { refresh: true },
          });
        }
      }
    } catch (err) {
      console.error("Submit error:", err);
      console.error("Response data:", err?.response?.data);

      // Surface the real reason when we have one. A network/abort failure has no
      // response at all, so fall back to an explicit, actionable message rather
      // than a vague "Operation failed".
      const serverMessage = err?.response?.data?.message;
      if (serverMessage) {
        toast.error(serverMessage);
      } else if (err?.response) {
        toast.error(
          `Save failed (HTTP ${err.response.status}). Please try again.`,
        );
      } else if (err?.message) {
        toast.error(`Save failed: ${err.message}`);
      } else {
        toast.error("Save failed. Please check your connection and try again.");
      }
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
    <AdmissionFieldsContext.Provider
      value={{
        fields: fieldIndex,
        enforceRequired: enforceRequiredFields,
      }}
    >
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
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">
            {isEdit ? "Edit Student Details" : "Student Admission"}
          </h1>
          {sourceRegistration && (
            <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">
              Prefilled from registration:{" "}
              <span className="font-semibold text-[rgb(var(--text))]">
                {sourceRegistration.studentName}
              </span>
              {sourceRegistration.registrationNumber
                ? ` (${sourceRegistration.registrationNumber})`
                : ""}
              {" · "}
              <button
                type="button"
                onClick={() => navigate(`${basePath}/registrations`)}
                className="text-[rgb(var(--primary))] underline underline-offset-2"
              >
                Back to registrations
              </button>
            </p>
          )}
          {!sourceRegistration && sourceLead && (
            <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">
              Prefilled from lead:{" "}
              <span className="font-semibold text-[rgb(var(--text))]">
                {sourceLead.studentName}
              </span>
              {" · "}
              <button
                type="button"
                onClick={() => navigate(`${basePath}/leads`)}
                className="text-[rgb(var(--primary))] underline underline-offset-2"
              >
                Back to leads
              </button>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canChangeLayout && (
            <div className="inline-flex items-center rounded-lg border border-[rgb(var(--border))] p-0.5 text-sm">
              <button
                type="button"
                disabled={layoutSaving}
                onClick={() => saveLayoutMode("steps")}
                className={`rounded-md px-3 py-1.5 font-semibold transition ${
                  !isSinglePage
                    ? "bg-[rgb(var(--primary))] text-white"
                    : "text-[rgb(var(--text))] hover:bg-[rgb(var(--bg))]"
                } disabled:opacity-60`}
                title="Require each step to be completed before moving on"
              >
                Step-wise
              </button>
              <button
                type="button"
                disabled={layoutSaving}
                onClick={() => saveLayoutMode("single")}
                className={`rounded-md px-3 py-1.5 font-semibold transition ${
                  isSinglePage
                    ? "bg-[rgb(var(--primary))] text-white"
                    : "text-[rgb(var(--text))] hover:bg-[rgb(var(--bg))]"
                } disabled:opacity-60`}
                title="Show the full admission form on one page"
              >
                Single page
              </button>
            </div>
          )}
          {["school_admin", "staff_admin", "super_admin"].includes(
            user?.role
          ) && (
            <button
              type="button"
              onClick={() => setBuilderOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[rgb(var(--border))] text-sm font-semibold"
              title="Add, hide or reorder admission fields and steps"
            >
              <FaSlidersH size={12} />
              Customize Form
            </button>
          )}
          <button
            onClick={resetForm}
            className="px-4 py-2 bg-red-500 text-white rounded-lg"
          >
            Reset
          </button>
        </div>
      </div>

      {sourceRegistration && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Registration details transferred
          {sourceRegistration.registrationNumber
            ? ` (${sourceRegistration.registrationNumber})`
            : ""}
          . Complete remaining admission steps, then save to admit the student.
        </div>
      )}
      {!sourceRegistration && sourceLead && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Lead details transferred. Prefer Registering the lead first so entrance
          exams stay in the funnel — complete class, fees, and documents to admit.
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* STEP SIDEBAR */}

        {!isSinglePage && (
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-[rgb(var(--surface))] rounded-xl  border border-[rgb(var(--border))] shadow p-4 sticky top-6">
              {wizardSteps.map((s, i) => {
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
        )}

        {/* FORM AREA */}

        <div
          className={`col-span-12 ${isSinglePage ? "" : "lg:col-span-9"}`}
        >
          <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]  border border-[rgb(var(--border))] rounded-xl shadow p-6 lg:p-8">
            {/* PROGRESS */}

            {!isSinglePage && (
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span>
                    Step {step} of {wizardSteps.length}
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
            )}

            {isSinglePage && (
              <div className="mb-6 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-4 py-3 text-sm text-[rgb(var(--text-muted))]">
                Single-page admission — all sections are visible below. Required
                fields are checked when you submit.
              </div>
            )}

            {/* Locked system fields — always visible at the top */}
            <div className="mb-6 grid gap-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4 md:grid-cols-2 lg:grid-cols-3">
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                <span>Admission Number</span>
                <input
                  value={form.studentId || (isEdit ? "" : "Loading…")}
                  readOnly
                  disabled
                  className="w-full cursor-not-allowed rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2.5 text-sm opacity-90"
                />
                <span className="text-[11px] font-normal text-[rgb(var(--text-muted))]">
                  Preview only — the final unique number is assigned when you
                  save. Cannot be edited on this form.
                </span>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                <span>Confirmation Status</span>
                <select
                  name="confirmationStatus"
                  value={form.confirmationStatus || "Non-Confirmed"}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2.5 text-sm outline-none focus:border-[rgb(var(--primary))]"
                >
                  <option value="Non-Confirmed">Non-Confirmed</option>
                  <option value="Confirmed">Confirmed</option>
                </select>
                <span className="text-[11px] font-normal text-[rgb(var(--text-muted))]">
                  Non-Confirmed: no fields are mandatory. Confirmed: required
                  fields must be filled.
                </span>
              </label>
            </div>

            {/* ADMISSION SECTIONS — rendered in the configured step order */}

            {activeStepDefs.map((stepDef, stepIndex) => {
              const stepNumber = stepIndex + 1;
              if (!isSinglePage && step !== stepNumber) return null;

              const sectionKey = stepDef.key;
              const isReview = sectionKey === REVIEW_STEP_KEY;
              const isPrototypeSection = PROTOTYPE_SECTION_KEYS.has(sectionKey);
              const customFields = (stepDef.fields || []).filter(
                (field) => field && field.visible !== false && !field.builtin,
              );
              const isHosteller =
                form.studentType === "Hosteller" ||
                form.studentType === "Boarder";

              const renderCustomFields = () =>
                customFields.map((field) => (
                  <CustomField
                    key={field.key}
                    field={field}
                    value={form.custom?.[field.key]}
                    error={errors[field.key]}
                    onChange={(value) => setCustomValue(field.key, value)}
                  />
                ));

              return (
                <div
                  key={sectionKey}
                  className={isSinglePage ? "mb-10" : undefined}
                >
                  {isSinglePage ? (
                    <SectionHeading title={stepDef.title} />
                  ) : (
                    <DummyFillBar onFill={fillDummyData} sectionKey={sectionKey} />
                  )}

                  {sectionKey === "builtin_1" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <Input
                          label="First Name *"
                          placeholder="First name"
                          name="firstName"
                          value={form.firstName}
                          onChange={handleChange}
                          error={errors.firstName}
                        />
                        <Input
                          label="Last Name *"
                          placeholder="Last name"
                          name="lastName"
                          value={form.lastName}
                          onChange={handleChange}
                          error={errors.lastName}
                        />
                        <div>
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <label className="block text-sm font-medium text-[rgb(var(--text))]">
                              Date of Birth *
                            </label>
                            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-500">
                              Age: {formatAge(form.dob)}
                            </span>
                          </div>
                          <input
                            type="date"
                            name="dob"
                            value={form.dob}
                            onChange={handleChange}
                            max={new Date().toISOString().split("T")[0]}
                            className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 font-mono text-sm text-[rgb(var(--text))] outline-none focus:border-[rgb(var(--primary))]"
                          />
                          {errors.dob && (
                            <span className="text-xs font-medium text-red-500">
                              {errors.dob}
                            </span>
                          )}
                        </div>
                        <Select
                          label="Gender *"
                          name="gender"
                          value={form.gender}
                          options={["Male", "Female", "Other"]}
                          onChange={handleChange}
                          error={errors.gender}
                        />
                        <Select
                          label="Religion"
                          name="religion"
                          value={form.religion}
                          options={[
                            "Hindu",
                            "Jain",
                            "Sikh",
                            "Muslim",
                            "Christian",
                            "Buddhism",
                          ]}
                          onChange={handleChange}
                        />
                        <Select
                          label="Caste Category"
                          name="category"
                          value={form.category}
                          options={CATEGORY_OPTIONS}
                          onChange={handleChange}
                          error={errors.category}
                        />
                        <Input
                          label="Student Aadhaar Number (12 Digits)"
                          placeholder="XXXX XXXX XXXX"
                          name="aadhaarNumber"
                          value={form.aadhaarNumber}
                          onChange={handleChange}
                          maxLength={12}
                          inputMode="numeric"
                        />
                        <Input
                          type="date"
                          label="Admission Date"
                          name="admissionDate"
                          value={form.admissionDate}
                          onChange={handleChange}
                          error={errors.admissionDate}
                          max={new Date().toISOString().split("T")[0]}
                        />
                        <Input
                          label="NIC Number"
                          placeholder="Enter NIC Number"
                          name="nicNumber"
                          value={form.nicNumber}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-3">
                        <Input
                          label="SR. No."
                          placeholder="Scholar Register No."
                          name="srNo"
                          value={form.srNo}
                          onChange={handleChange}
                        />
                        <Input
                          label="PEN Number"
                          placeholder="Permanent Education No."
                          name="penNumber"
                          value={form.penNumber}
                          onChange={handleChange}
                        />
                        <Input
                          label="APAAR ID"
                          placeholder="12-digit APAAR ID"
                          name="apaarId"
                          value={form.apaarId}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  )}

                  {sectionKey === "builtin_2" && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <Input
                        label="Father Full Name *"
                        placeholder="Father full name"
                        name="fatherName"
                        value={form.fatherName}
                        onChange={handleChange}
                        error={errors.fatherName}
                      />
                      <Input
                        label="Father Mobile (10 Digits) *"
                        placeholder="10-digit mobile"
                        name="fatherMobile"
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={form.fatherMobile}
                        onChange={handleChange}
                        error={errors.fatherMobile}
                      />
                      <Input
                        label="Father Email Address (Contact Email)"
                        placeholder="father.email@example.com"
                        name="fatherEmail"
                        type="email"
                        value={form.fatherEmail}
                        onChange={handleChange}
                        error={errors.fatherEmail}
                      />
                      <Input
                        label="Mother Full Name"
                        placeholder="Mother full name"
                        name="motherName"
                        value={form.motherName}
                        onChange={handleChange}
                        error={errors.motherName}
                      />
                      <Input
                        label="Mother Mobile (10 Digits)"
                        placeholder="10-digit mobile"
                        name="motherMobile"
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={form.motherMobile}
                        onChange={handleChange}
                        error={errors.motherMobile}
                      />
                      <Input
                        label="Mother Email Address (Contact Email)"
                        placeholder="mother.email@example.com"
                        name="motherEmail"
                        type="email"
                        value={form.motherEmail}
                        onChange={handleChange}
                        error={errors.motherEmail}
                      />
                      <Input
                        label="Local Guardian Name"
                        placeholder="Local guardian name"
                        name="guardianName"
                        value={form.guardianName}
                        onChange={handleChange}
                        error={errors.guardianName}
                      />
                      <Select
                        label="Local Guardian Relation"
                        name="guardianRelation"
                        value={form.guardianRelation}
                        options={GUARDIAN_RELATION_OPTIONS}
                        onChange={handleChange}
                        error={errors.guardianRelation}
                      />
                      <Input
                        label="Local Guardian Email Address (Contact Email)"
                        placeholder="guardian.email@example.com"
                        name="guardianEmail"
                        type="email"
                        value={form.guardianEmail}
                        onChange={handleChange}
                        error={errors.guardianEmail}
                      />
                    </div>
                  )}

                  {sectionKey === "builtin_address" && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                      <div className="sm:col-span-4">
                        <Input
                          label="Address Line (House No. / Flat / Ward / Street)"
                          placeholder="House / Plot No., Ward No., Street Name"
                          name="address"
                          value={form.address}
                          onChange={handleChange}
                          error={errors.address}
                        />
                      </div>
                      <Input
                        label="City / Town / Tehsil"
                        placeholder="City / Town / Tehsil"
                        name="city"
                        value={form.city}
                        onChange={handleChange}
                      />
                      <Input
                        label="District"
                        placeholder="District"
                        name="district"
                        value={form.district}
                        onChange={handleChange}
                      />
                      <Select
                        label="State"
                        name="state"
                        value={form.state}
                        options={INDIA_STATES}
                        onChange={handleChange}
                      />
                      <Input
                        label="PIN Code"
                        placeholder="6-digit PIN"
                        name="pincode"
                        value={form.pincode}
                        onChange={handleChange}
                        maxLength={6}
                        inputMode="numeric"
                        error={errors.pincode}
                      />
                    </div>
                  )}

                  {sectionKey === "builtin_5" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Select
                          label="Admitting Class *"
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
                            label="Allocated Section"
                            name="sectionId"
                            value={form.sectionId}
                            options={sections}
                            onChange={handleChange}
                            error={errors.sectionId}
                          />
                        )}

                        {(streams || []).length > 0 && (
                          <Select
                            label="Academic Stream"
                            name="streamId"
                            value={form.streamId}
                            options={(streams || [])
                              .filter((s) => {
                                const linked = (s.classIds || []).map(String);
                                if (!linked.length) return true;
                                if (!form.classId) return false;
                                return linked.includes(String(form.classId));
                              })
                              .map((s) => ({
                                label: s.name,
                                value: s._id,
                              }))}
                            onChange={handleChange}
                            error={errors.streamId}
                          />
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-[rgb(var(--text))]">
                            Student Residence Mode
                          </label>
                          <div className="grid grid-cols-2 gap-2.5">
                            {["Day Scholar", "Hosteller"].map((mode) => {
                              const active =
                                mode === "Hosteller"
                                  ? isHosteller
                                  : form.studentType === "Day Scholar" ||
                                    form.studentType === "Day Boarder";
                              return (
                                <button
                                  key={mode}
                                  type="button"
                                  onClick={() =>
                                    setForm((prev) => ({
                                      ...prev,
                                      studentType: mode,
                                      ...(mode === "Hosteller"
                                        ? { transport: "", useTransport: false }
                                        : {}),
                                    }))
                                  }
                                  className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                                    active
                                      ? "border-slate-900 bg-slate-900 text-white"
                                      : "border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--text))] hover:bg-[rgb(var(--bg))]"
                                  }`}
                                >
                                  {mode}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <Select
                            label="Transport Bus Route"
                            name="transport"
                            value={isHosteller ? "" : form.transport}
                            disabled={isHosteller}
                            options={transportRoutes.map((route) => ({
                              label: route.code
                                ? `${route.code}: ${route.name}`
                                : route.name,
                              value: route._id,
                            }))}
                            onChange={handleChange}
                          />
                          {isHosteller && (
                            <p className="mt-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                              Transport not applicable for hostellers.
                            </p>
                          )}
                        </div>
                      </div>

                      {form.streamId ? (
                        <div className="grid gap-3">
                          <div>
                            <p className="mb-1.5 text-xs font-semibold text-[rgb(var(--text))]">
                              Compulsory subjects
                            </p>
                            <p className="mb-2 text-[11px] text-[rgb(var(--text-muted))]">
                              Applied automatically from the selected stream.
                            </p>
                            {streamCompulsorySubjects.length === 0 &&
                            streamCompulsoryIds.size === 0 ? (
                              <p className="rounded-xl border border-dashed border-[rgb(var(--border))] px-3 py-3 text-xs text-[rgb(var(--text-muted))]">
                                No compulsory subjects configured for this
                                stream.
                              </p>
                            ) : (
                              <div className="grid grid-cols-2 gap-2 rounded-xl border border-[rgba(var(--primary),0.25)] bg-[rgba(var(--primary),0.04)] p-3 sm:grid-cols-3">
                                {(streamCompulsorySubjects.length
                                  ? streamCompulsorySubjects
                                  : [...streamCompulsoryIds].map((id) => ({
                                      _id: id,
                                      name:
                                        classSubjectsForStudent.find(
                                          (s) => String(s._id) === id,
                                        )?.name || id,
                                    }))
                                ).map((sub) => (
                                  <label
                                    key={String(sub._id || sub.name)}
                                    className="flex cursor-default items-center gap-2 text-xs opacity-90"
                                  >
                                    <input
                                      type="checkbox"
                                      checked
                                      disabled
                                      className="accent-[rgb(var(--primary))]"
                                    />
                                    <span className="font-medium">
                                      {sub.name || "Subject"}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>

                          <div>
                            <p className="mb-1.5 text-xs font-semibold text-[rgb(var(--text))]">
                              Optional subjects
                            </p>
                            <p className="mb-2 text-[11px] text-[rgb(var(--text-muted))]">
                              Select the optional subjects this student will
                              take.
                            </p>
                            {!form.classId ? (
                              <p className="rounded-xl border border-dashed border-[rgb(var(--border))] px-3 py-3 text-xs text-[rgb(var(--text-muted))]">
                                Select a class to see optional subjects.
                              </p>
                            ) : optionalSubjectsForStudent.length === 0 ? (
                              <p className="rounded-xl border border-dashed border-[rgb(var(--border))] px-3 py-3 text-xs text-[rgb(var(--text-muted))]">
                                No optional subjects on this class. Add optional
                                subjects when creating the class.
                              </p>
                            ) : (
                              <div className="grid max-h-40 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3 sm:grid-cols-3">
                                {optionalSubjectsForStudent.map((sub) => {
                                  const sid = String(sub._id);
                                  const checked = (
                                    form.optionalSubjectIds || []
                                  ).includes(sid);
                                  return (
                                    <label
                                      key={sid}
                                      className="flex cursor-pointer items-center gap-2 text-xs text-[rgb(var(--text))]"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() =>
                                          toggleOptionalSubject(sid)
                                        }
                                        className="accent-[rgb(var(--primary))]"
                                      />
                                      <span>{sub.name}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                            {errors.optionalSubjectIds ? (
                              <p className="mt-1 text-xs text-red-500">
                                {errors.optionalSubjectIds}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {sectionKey === "builtin_3" && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="sm:col-span-2">
                        <Input
                          label="Previous School Name"
                          placeholder="Previous school name"
                          name="previousSchoolName"
                          value={form.previousSchoolName}
                          onChange={handleChange}
                        />
                      </div>
                      <Input
                        label="Previous School UDISE Code (11 Digits)"
                        placeholder="11-digit UDISE code"
                        name="previousSchoolUdise"
                        value={form.previousSchoolUdise}
                        onChange={handleChange}
                        maxLength={11}
                        inputMode="numeric"
                        error={errors.previousSchoolUdise}
                      />
                      <Input
                        label="Transfer Certificate (TC) No."
                        placeholder="TC number"
                        name="previousSchoolTcNumber"
                        value={form.previousSchoolTcNumber}
                        onChange={handleChange}
                      />
                      <Input
                        type="date"
                        label="School Leaving Date"
                        name="schoolLeavingDate"
                        value={form.schoolLeavingDate}
                        onChange={handleChange}
                        error={errors.schoolLeavingDate}
                      />
                      <Input
                        label="Previous School Address"
                        placeholder="Town / City, District, State"
                        name="prevSchoolAddress"
                        value={form.prevSchoolAddress}
                        onChange={handleChange}
                      />
                    </div>
                  )}

                  {sectionKey === "builtin_4" && (
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                      <File
                        label="Student Passport Photo"
                        name="studentPhoto"
                        existingUrl={form?.documents?.studentPhoto?.url}
                        onChange={handleFileChange}
                        error={errors.studentPhoto}
                      />
                      <File
                        label="Transfer Certificate (TC)"
                        name="transferCertificate"
                        existingUrl={form?.documents?.transferCertificate?.url}
                        onChange={handleFileChange}
                        error={errors.transferCertificate}
                      />
                      <File
                        label="Student Aadhaar Card"
                        name="studentAadhar"
                        existingUrl={form?.documents?.studentAadhar?.url}
                        onChange={handleFileChange}
                      />
                      <File
                        label="Character Certificate"
                        name="characterCertificate"
                        existingUrl={form?.documents?.characterCertificate?.url}
                        onChange={handleFileChange}
                      />
                      <File
                        label="Last Qualifying Marksheet"
                        name="lastMarksheet"
                        existingUrl={form?.documents?.lastMarksheet?.url}
                        onChange={handleFileChange}
                      />
                    </div>
                  )}

                  {sectionKey === "builtin_6" && (
                    <div className="grid gap-4">
                      {feeStructure.length === 0 && form.classId && (
                        <div className="text-sm text-[rgb(var(--text))]">
                          No fee structure found for this class
                        </div>
                      )}

                      <div className="mb-4">
                        <label className="mb-1 block text-xs font-semibold">
                          View As
                        </label>

                        <select
                          value={freqFilter}
                          onChange={(e) => setFreqFilter(e.target.value)}
                          className="w-full rounded-lg border bg-[rgb(var(--surface))] px-3 py-2 text-[rgb(var(--text))]"
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
                                className="rounded-lg border border-[rgb(var(--border))] p-4 text-[rgb(var(--text))]"
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
                                      Include this fee only when the student
                                      uses transport.
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
                                        {
                                          label: "Quarterly",
                                          value: "quarterly",
                                        },
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
                                  checked={(
                                    form.selectedOptionalFees || []
                                  ).includes(String(fee._id))}
                                  onChange={() => toggleOptionalFee(fee._id)}
                                  className="h-4 w-4"
                                />
                                <div>
                                  <div className="text-sm font-medium text-gray-800">
                                    Add {fee.name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Include this optional fee in the final
                                    annual total.
                                  </div>
                                </div>
                              </label>
                            ),
                          )}
                        </div>
                      )}

                      {feeStructure.length > 0 && (
                        <div className="mb-4 rounded-lg border p-4">
                          <h3 className="mb-2 font-semibold">Fee Heads</h3>

                          {feeStructure.map((f, i) => (
                            <div
                              key={i}
                              className="flex justify-between py-1 text-sm text-[rgb(var(--text))]"
                            >
                              <span>
                                {f.name}
                                {f.isOptional && (
                                  <span className="ml-2 text-xs">
                                    {isOptionalFeeSelected(f)
                                      ? "(Selected)"
                                      : "(Optional)"}
                                  </span>
                                )}
                              </span>

                              <span>₹{getDisplayAmount(f)}</span>
                            </div>
                          ))}

                          <div className="mt-2 flex justify-between border-t pt-2 font-bold">
                            <span>Annual Total</span>
                            <span>
                              ₹{Number(getIncludedAnnualTotal()).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}

                      {form.useTransport &&
                        form.busFeeFrequency === "quarterly" && (
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
                        onChange={handleChange}
                        readOnly
                        error={errors.totalFee}
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
                        placeholder="Enter amount or %"
                        name="discountValue"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max={
                          form.discountType === "Percentage" ? 100 : undefined
                        }
                        step="any"
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

                  {sectionKey === "builtin_medical" && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[rgb(var(--text))]">
                        Medical Condition / Health History
                      </label>
                      <textarea
                        name="medicalConditionRemarks"
                        rows={2}
                        placeholder="Enter any medical condition, allergies, or health history"
                        value={form.medicalConditionRemarks}
                        onChange={handleChange}
                        className="w-full resize-none rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm text-[rgb(var(--text))] outline-none focus:border-[rgb(var(--primary))]"
                      />
                    </div>
                  )}

                  {sectionKey === "builtin_7" && (
                    <ParentLoginStep
                      form={form}
                      handleChange={handleChange}
                      isEdit={isEdit}
                    />
                  )}

                  {sectionKey === "builtin_notes" && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[rgb(var(--text))]">
                        Admission Notes / Office Remarks
                      </label>
                      <textarea
                        name="admissionNotes"
                        rows={2}
                        placeholder="Enter any special admission notes, scholarship reference, or office remarks"
                        value={form.admissionNotes}
                        onChange={handleChange}
                        className="w-full resize-none rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm text-[rgb(var(--text))] outline-none focus:border-[rgb(var(--primary))]"
                      />
                    </div>
                  )}

                  {isPrototypeSection && customFields.length > 0 && (
                    <div className="mt-6 grid gap-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">
                        Additional Details
                        {isSinglePage && stepDef.title
                          ? ` · ${stepDef.title}`
                          : ""}
                      </h3>
                      {renderCustomFields()}
                    </div>
                  )}

                  {!isPrototypeSection && !isReview && (
                    <>
                      {customFields.length === 0 ? (
                        <p className="text-sm text-[rgb(var(--text-muted))]">
                          This step has no fields yet.
                        </p>
                      ) : (
                        <div className="grid gap-4">
                          {renderCustomFields()}
                        </div>
                      )}
                    </>
                  )}

                  {isReview && (
                    <ReviewStep
                      form={form}
                      classes={classes}
                      sections={sections}
                      streams={streams}
                      transportRoutes={transportRoutes}
                      feeStructure={feeStructure}
                      freqFilter={freqFilter}
                      customFields={activeStepDefs.flatMap((stepDef) =>
                        (stepDef.fields || []).filter(
                          (field) => !field.builtin,
                        ),
                      )}
                    />
                  )}
                </div>
              );
            })}

            {/* NAV */}

            <div
              className={`flex mt-8 ${
                isSinglePage ? "justify-end" : "justify-between"
              }`}
            >
              {!isSinglePage && step > 1 && (
                <button
                  onClick={prev}
                  className="px-6 py-2 bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-lg cursor-pointer border border-[rgb(var(--border))]"
                >
                  Back
                </button>
              )}

              {!isSinglePage && step < wizardSteps.length ? (
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
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50 min-h-11"
                >
                  {submitting ? (
                    <>
                      <LoadingSpinner size="sm" label="" inline />
                      {isEdit ? "Updating…" : "Submitting…"}
                    </>
                  ) : isEdit ? (
                    "Update Student"
                  ) : (
                    "Submit"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL */}

      {confirmOpen && (
        <div className="app-modal-backdrop">
          <div className="app-modal max-w-md p-6">
            <h3 className="text-lg font-semibold mb-2">Confirmation</h3>

            <p className="mb-6">{confirmMessage}</p>

            <div className="app-modal-footer !px-0 !py-0 !border-0">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={submitting}
                className="app-btn app-btn-secondary w-full sm:w-auto"
              >
                Cancel
              </button>

              <button
                disabled={submitting}
                onClick={async () => {
                  if (submitting) return;
                  setSubmitting(true);
                  try {
                    await confirmAction?.();
                    setConfirmOpen(false);
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="app-btn app-btn-primary w-full sm:w-auto"
              >
                {submitting ? (
                  <>
                    <LoadingSpinner size="sm" label="" inline />
                    Confirming…
                  </>
                ) : (
                  "Confirm"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {builderOpen && (
        <AdmissionFormBuilder
          onClose={() => setBuilderOpen(false)}
          onSaved={(steps) => {
            setFormStepDefs(
              mergeAdmissionSteps(steps, ADMISSION_DEFAULTS_VERSION),
            );
            window.dispatchEvent(
              new CustomEvent("admission-form-updated", { detail: steps }),
            );
          }}
        />
      )}
      </div>
    </AdmissionFieldsContext.Provider>
  );
};

export default StudentManagement;

/* INPUT */

const Input = ({ label, error, ...props }) => {
  const meta = useAdmissionField(props.name);
  const enforceRequired = useEnforceRequired();
  if (meta?.visible === false) return null;

  return (
    <div>
      <label className="block text-sm font-medium text-[rgb(var(--text))] mb-1">
        {applyFieldMetaToLabel(label, meta, enforceRequired)}
      </label>

      <input
        {...props}
        className="w-full border px-3 py-2 rounded-lg  bg-[rgb(var(--surface))]"
      />
      {error && (
        <span className="text-xs text-red-500 font-medium">{error}</span>
      )}
    </div>
  );
};

/* SELECT */

const Select = ({ label, error, options, ...props }) => {
  const meta = useAdmissionField(props.name);
  const enforceRequired = useEnforceRequired();
  if (meta?.visible === false) return null;

  return (
    <div>
      <label className="block text-sm font-medium text-[rgb(var(--text))] mb-1">
        {applyFieldMetaToLabel(label, meta, enforceRequired)}
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
            <option key={i} value={String(o.value ?? "")} disabled={!o.value}>
              {o.label}
            </option>
          );
        })}
      </select>
      {error && (
        <span className="text-xs text-red-500 font-medium">{error}</span>
      )}
    </div>
  );
};

/* FILE */

const PHOTO_FIELD_NAMES = new Set([
  "studentPhoto",
  "fatherPhoto",
  "motherPhoto",
  "guardianPhoto",
]);

const File = ({ label, name, onChange, existingUrl, error }) => {
  const meta = useAdmissionField(name);
  const enforceRequired = useEnforceRequired();
  const [preview, setPreview] = useState(existingUrl || null);
  const [localFile, setLocalFile] = useState(false);
  const isPhotoField = PHOTO_FIELD_NAMES.has(name);
  const accept = isPhotoField
    ? "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
    : "image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf";

  useEffect(() => {
    // When edit form loads docs async, show existing URL (unless user picked a new file)
    if (!localFile) {
      setPreview(existingUrl || null);
    }
  }, [existingUrl, localFile]);

  const handlePreview = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowed = isPhotoField
      ? ["image/jpeg", "image/jpg", "image/png", "image/webp"]
      : [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/webp",
          "application/pdf",
        ];
    const extOk = isPhotoField
      ? /\.(jpe?g|png|webp)$/i.test(file.name)
      : /\.(jpe?g|png|webp|pdf)$/i.test(file.name);

    if (!allowed.includes(file.type) && !extOk) {
      toast.error(
        isPhotoField
          ? "Invalid file type. Profile photos must be JPG, PNG, or WEBP."
          : "Invalid file type. Use JPG, PNG, WEBP, or PDF only.",
      );
      e.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File must be less than 2MB");
      e.target.value = "";
      return;
    }

    if (preview && preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }

    const objectUrl = URL.createObjectURL(file);
    setLocalFile(true);
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

  const isImage =
    preview &&
    (preview.startsWith("blob:") ||
      /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(preview) ||
      /\/image\/upload\//i.test(preview));

  if (meta?.visible === false) return null;

  return (
    <div className="border rounded-xl p-4 text-[rgb(var(--text))]">
      <label
        className={`block text-sm font-medium mb-2 ${error ? "text-red-600" : "text-[rgb(var(--text))]"}`}
      >
        {applyFieldMetaToLabel(label, meta, enforceRequired)}
      </label>

      <input
        type="file"
        name={name}
        accept={accept}
        onChange={handlePreview}
        className="w-full border px-3 py-2 rounded-lg"
      />
      <p className="text-[10px] text-slate-500 mt-1">
        {isPhotoField
          ? "Accepted: JPG, PNG, WEBP (max 2MB)"
          : "Accepted: JPG, PNG, WEBP, PDF (max 2MB)"}
      </p>

      {error && (
        <span className="text-xs text-red-500 font-medium">{error}</span>
      )}

      {preview && isImage && (
        <img
          key={preview}
          src={preview}
          alt="preview"
          className="mt-3 h-24 rounded-lg object-cover border border-[rgb(var(--border))]"
        />
      )}

      {preview && !isImage && (
        <a
          href={preview}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex text-sm font-semibold text-[rgb(var(--primary))] underline"
        >
          View uploaded document
        </a>
      )}
    </div>
  );
};

/* CUSTOM FIELD (admin-defined) */

const CustomField = ({ field, value, error, onChange }) => {
  const enforceRequired = useEnforceRequired();
  const label =
    enforceRequired && field.required ? `${field.label} *` : field.label;
  const inputClass =
    "w-full border px-3 py-2 rounded-lg bg-[rgb(var(--surface))] text-[rgb(var(--text))]";
  const help = field.help ? (
    <p className="text-xs text-[rgb(var(--text-muted))] mt-1">{field.help}</p>
  ) : null;
  const errorNode = error ? (
    <span className="text-xs text-red-500 font-medium">{error}</span>
  ) : null;

  const labelNode = (
    <label className="block text-sm font-medium text-[rgb(var(--text))] mb-1">
      {label}
    </label>
  );

  if (field.type === "textarea") {
    return (
      <div>
        {labelNode}
        <textarea
          rows={3}
          value={value ?? ""}
          placeholder={field.placeholder || ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
        {help}
        {errorNode}
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div>
        {labelNode}
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          <option value="">Select</option>
          {(field.options || []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {help}
        {errorNode}
      </div>
    );
  }

  if (field.type === "radio") {
    return (
      <div>
        {labelNode}
        <div className="flex flex-wrap gap-4">
          {(field.options || []).map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`cf-${field.key}`}
                checked={value === option}
                onChange={() => onChange(option)}
              />
              {option}
            </label>
          ))}
        </div>
        {help}
        {errorNode}
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          {label}
        </label>
        {help}
        {errorNode}
      </div>
    );
  }

  if (field.type === "file") {
    return (
      <div className="border rounded-xl p-4">
        {labelNode}
        <input
          type="file"
          onChange={(e) => onChange(e.target.files?.[0] || "")}
          className="w-full border px-3 py-2 rounded-lg"
        />
        {value && typeof value === "string" && (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex text-sm font-semibold text-[rgb(var(--primary))] underline"
          >
            View uploaded file
          </a>
        )}
        {value && typeof value !== "string" && (
          <p className="mt-2 text-xs text-[rgb(var(--text-muted))]">
            Selected: {value.name}
          </p>
        )}
        {help}
        {errorNode}
      </div>
    );
  }

  return (
    <div>
      {labelNode}
      <input
        type={
          ["number", "date", "email", "tel"].includes(field.type)
            ? field.type
            : "text"
        }
        value={value ?? ""}
        placeholder={field.placeholder || ""}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
      {help}
      {errorNode}
    </div>
  );
};

/* PARENT & STUDENT LOGIN STEP */
const ParentLoginStep = ({ form, handleChange, isEdit }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const usernameMeta = useAdmissionField("username");
  const passwordMeta = useAdmissionField("password");
  const studentUsernameMeta = useAdmissionField("studentUsername");
  const studentPasswordMeta = useAdmissionField("studentPassword");
  const enforceRequired = useEnforceRequired();

  const inputClass =
    "w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 font-mono text-sm text-[rgb(var(--text))] outline-none focus:border-[rgb(var(--primary))]";
  const labelClass = "mb-1 block text-sm font-medium text-[rgb(var(--text))]";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {usernameMeta?.visible !== false && passwordMeta?.visible !== false && (
        <div className="space-y-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4">
          <div className="border-b border-[rgb(var(--border))] pb-1.5 font-bold text-[rgb(var(--text))]">
            Parent Portal Credentials
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                {applyFieldMetaToLabel(
                  "Parent Username",
                  usernameMeta,
                  enforceRequired,
                )}
              </label>
              <input
                name="username"
                value={form.fatherMobile || ""}
                readOnly
                disabled
                placeholder="parent.stu0003"
                className={`${inputClass} cursor-not-allowed opacity-90`}
              />
            </div>

            <div>
              <label className={labelClass}>
                {isEdit
                  ? "New Password (leave blank to keep current)"
                  : applyFieldMetaToLabel(
                      "Parent Initial Password",
                      passwordMeta,
                      enforceRequired,
                    )}
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password || ""}
                  onChange={handleChange}
                  placeholder={
                    isEdit
                      ? "Leave blank to keep current"
                      : "Default: father mobile number"
                  }
                  className={`${inputClass} pr-14`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded px-1.5 py-0.5 text-[11px] font-semibold text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          </div>
          {form.temp_password && isEdit && (
            <div className="text-xs text-[rgb(var(--text-muted))]">
              Current saved password (dev only):{" "}
              <code>{form.temp_password}</code>
            </div>
          )}
        </div>
      )}

      {studentUsernameMeta?.visible !== false &&
        studentPasswordMeta?.visible !== false && (
          <div className="space-y-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4">
            <div className="border-b border-[rgb(var(--border))] pb-1.5 font-bold text-[rgb(var(--text))]">
              Student Portal Credentials
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>
                  {applyFieldMetaToLabel(
                    "Student Username",
                    studentUsernameMeta,
                    enforceRequired,
                  )}
                </label>
                <input
                  name="studentUsername"
                  value={form.studentUsername || form.studentId || ""}
                  readOnly
                  disabled
                  placeholder="Auto-generated on save"
                  className={`${inputClass} cursor-not-allowed opacity-90`}
                />
              </div>

              <div>
                <label className={labelClass}>
                  {isEdit
                    ? "New Password (leave blank to keep current)"
                    : applyFieldMetaToLabel(
                        "Student Initial Password",
                        studentPasswordMeta,
                        enforceRequired,
                      )}
                </label>
                <div className="relative">
                  <input
                    name="studentPassword"
                    type={showStudentPassword ? "text" : "password"}
                    value={form.studentPassword || ""}
                    onChange={handleChange}
                    placeholder={
                      isEdit
                        ? "Leave blank to keep current"
                        : "Default: same as parent password"
                    }
                    className={`${inputClass} pr-14`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowStudentPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded px-1.5 py-0.5 text-[11px] font-semibold text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
                  >
                    {showStudentPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </div>
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
  streams = [],
  transportRoutes,
  feeStructure,
  freqFilter,
  customFields = [],
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
  const streamName =
    streams.find((s) => String(s._id) === String(form.streamId))?.name ||
    form.stream ||
    "";
  const yesNo = (value) => (value ? "Yes" : "No");
  const formatDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-IN");
  };

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

  const Section = ({ title, headerClass, show = true, children }) => {
    if (!show) return null;
    return (
      <div className="border border-gray-200 rounded-xl overflow-hidden mb-3 bg-[rgb(var(--surface))]">
        <div className={`px-4 py-2.5 border-b border-gray-200 ${headerClass}`}>
          <span className="text-sm font-medium ">{title}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 bg-white">{children}</div>
      </div>
    );
  };

  const Field = ({ label, value, name }) => {
    const meta = useAdmissionField(name);
    const enforceRequired = useEnforceRequired();
    if (meta?.visible === false) return null;
    if (!value && value !== 0) return null;
    return (
      <div className="px-4 py-2.5 border-b border-r text-[rgb(var(--text))] bg-[rgb(var(--surface))] border border-[rgb(var(--border))]">
        <div className="text-[11px] uppercase tracking-wide  mb-0.5">
          {applyFieldMetaToLabel(label, meta, enforceRequired)}
        </div>
        <div className="text-sm font-medium min-w-0 break-words">{value}</div>
      </div>
    );
  };

  return (
    <div className=" border border-[rgb(var(--border))] text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
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

      <Section title="Student identity" headerClass="">
        <Field name="studentId" label="Admission number" value={form.studentId || "—"} />
        <Field
          label="Confirmation status"
          value={form.confirmationStatus || "Non-Confirmed"}
        />
        <Field name="firstName" label="First name" value={form.firstName} />
        <Field name="lastName" label="Last name" value={form.lastName} />
        <Field name="dob" label="Date of birth" value={formatDate(form.dob)} />
        <Field name="gender" label="Gender" value={form.gender} />
        <Field name="religion" label="Religion" value={form.religion} />
        <Field name="category" label="Caste category" value={form.category} />
        <Field
          name="aadhaarNumber"
          label="Student Aadhaar number"
          value={form.aadhaarNumber}
        />
        <Field
          name="admissionDate"
          label="Admission date"
          value={formatDate(form.admissionDate)}
        />
        <Field name="nicNumber" label="NIC number" value={form.nicNumber} />
        <Field name="srNo" label="SR. No." value={form.srNo} />
        <Field name="penNumber" label="PEN number" value={form.penNumber} />
        <Field name="apaarId" label="APAAR ID" value={form.apaarId} />
        <Field name="bloodGroup" label="Blood group" value={form.bloodGroup} />
        <Field name="nationality" label="Nationality" value={form.nationality} />
        <Field name="caste" label="Caste" value={form.caste} />
        <Field
          name="admissionSource"
          label="Admission source"
          value={form.admissionSource}
        />
        <Field
          name="isSpecialChild"
          label="Special child"
          value={yesNo(form.isSpecialChild)}
        />
        <Field name="isEws" label="EWS" value={yesNo(form.isEws)} />
        <Field
          name="isPhysicallyDisabled"
          label="Physically disabled"
          value={yesNo(form.isPhysicallyDisabled)}
        />
      </Section>

      <Section title="Parent &amp; contact details" headerClass="">
        <Field name="fatherName" label="Father full name" value={form.fatherName} />
        <Field name="fatherMobile" label="Father mobile" value={form.fatherMobile} />
        <Field name="fatherEmail" label="Father email" value={form.fatherEmail} />
        <Field name="motherName" label="Mother full name" value={form.motherName} />
        <Field name="motherMobile" label="Mother mobile" value={form.motherMobile} />
        <Field name="motherEmail" label="Mother email" value={form.motherEmail} />
        {form.guardianName?.trim() && (
          <>
            <Field name="guardianName" label="Local guardian name" value={form.guardianName} />
            <Field
              name="guardianRelation"
              label="Local guardian relation"
              value={form.guardianRelation}
            />
            <Field
              name="guardianEmail"
              label="Local guardian email"
              value={form.guardianEmail}
            />
          </>
        )}
      </Section>

      <Section
        title="Residential address"
        headerClass=""
        show={Boolean(
          form.address ||
            form.city ||
            form.district ||
            form.state ||
            form.pincode,
        )}
      >
        <Field name="address" label="Address line" value={form.address} />
        <Field name="city" label="City / town / tehsil" value={form.city} />
        <Field name="district" label="District" value={form.district} />
        <Field name="state" label="State" value={form.state} />
        <Field name="pincode" label="PIN code" value={form.pincode} />
      </Section>

      <Section
        title="Previous school details"
        headerClass=""
        show={Boolean(
          form.previousSchoolName ||
            form.previousSchoolUdise ||
            form.previousSchoolTcNumber ||
            form.schoolLeavingDate ||
            form.prevSchoolAddress ||
            form.previousSchoolClass ||
            form.previousSchoolResult,
        )}
      >
        <Field
          name="previousSchoolName"
          label="Previous school name"
          value={form.previousSchoolName}
        />
        <Field
          name="previousSchoolUdise"
          label="Previous school UDISE code"
          value={form.previousSchoolUdise}
        />
        <Field
          name="previousSchoolTcNumber"
          label="Transfer certificate (TC) no."
          value={form.previousSchoolTcNumber}
        />
        <Field
          name="schoolLeavingDate"
          label="School leaving date"
          value={formatDate(form.schoolLeavingDate)}
        />
        <Field
          name="prevSchoolAddress"
          label="Previous school address"
          value={form.prevSchoolAddress}
        />
        <Field
          name="previousSchoolClass"
          label="Last class attended"
          value={form.previousSchoolClass}
        />
        <Field
          name="previousSchoolResult"
          label="Last result"
          value={form.previousSchoolResult}
        />
      </Section>

      <Section title="Class placement, hostel &amp; transport" headerClass="">
        <Field name="classId" label="Admitting class" value={className} />
        <Field name="sectionId" label="Allocated section" value={sectionName} />
        <Field name="streamId" label="Academic stream" value={streamName} />
        <Field
          name="studentType"
          label="Student residence mode"
          value={form.studentType}
        />
        <Field name="transport" label="Transport bus route" value={transportName} />
        <Field name="rollNo" label="Roll number" value={form.rollNo} />
        <Field name="relative" label="Relative / sibling" value={form.relative} />
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

      <Section
        title="Medical condition / history"
        headerClass=""
        show={Boolean(form.medicalConditionRemarks)}
      >
        <Field
          name="medicalConditionRemarks"
          label="Medical condition / health history"
          value={form.medicalConditionRemarks}
        />
      </Section>

      <Section
        title="Notes / remarks"
        headerClass=""
        show={Boolean(form.admissionNotes)}
      >
        <Field
          name="admissionNotes"
          label="Admission notes / office remarks"
          value={form.admissionNotes}
        />
      </Section>

      <Section title="Parent &amp; student portal credentials" headerClass="">
        <Field name="username" label="Parent username" value={form.username || form.fatherMobile} />
        <Field label="Parent password" value={form.password ? "••••••••" : null} />
        <Field
          name="studentUsername"
          label="Student username"
          value={form.studentUsername || form.studentId}
        />
        <Field
          name="studentPassword"
          label="Student password"
          value={form.studentPassword ? "••••••••" : null}
        />
      </Section>

      {customFields.some(
        (field) => form.custom?.[field.key] !== undefined && form.custom?.[field.key] !== ""
      ) && (
        <Section title="Additional details" headerClass="">
          {customFields.map((field) => {
            const value = form.custom?.[field.key];
            if (value === undefined || value === null || value === "") {
              return null;
            }
            return (
              <Field
                key={field.key}
                label={field.label}
                value={
                  typeof value === "boolean"
                    ? value
                      ? "Yes"
                      : "No"
                    : typeof value === "string"
                      ? value
                      : value?.name || "Uploaded"
                }
              />
            );
          })}
        </Section>
      )}

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