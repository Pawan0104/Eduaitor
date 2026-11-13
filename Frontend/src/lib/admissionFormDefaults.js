import { INDIA_STATES } from "./indiaLocations";

/**
 * Built-in admission wizard layout.
 *
 * The school admin can customise this through the Admission Form Builder
 * (add/edit/hide fields, mark them optional, add extra steps). The saved config
 * only stores deltas; this file is the source of truth for the default layout
 * and field keys, so the wizard keeps working even with no saved config.
 */

const CATEGORY_OPTIONS = ["General", "OBC", "SC", "ST", "Minority"];

const COMMUNITY_OPTIONS = [
  "Muslim",
  "Christian",
  "Sikh",
  "Jain",
  "Buddhist",
  "Parsi",
  "Other",
];

const GUARDIAN_RELATION_OPTIONS = [
  "Father",
  "Mother",
  "Step Father",
  "Step Mother",
  "Grand Father",
  "Grand Mother",
  "Uncle",
  "Aunt",
  "Brother",
  "Sister",
  "Legal Guardian",
  "Other",
];

const ADMISSION_SOURCE_OPTIONS = [
  "Newspaper",
  "Advertisement",
  "Vendor / Partner",
  "Website / Online",
  "Social Media",
  "Friend / Relative",
  "Alumni",
  "Walk-in",
  "School Camp / Event",
  "Other",
];

/** Field shapes the builder offers. */
export const ADMISSION_FIELD_TYPES = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Phone" },
  { value: "select", label: "Dropdown" },
  { value: "radio", label: "Radio buttons" },
  { value: "checkbox", label: "Checkbox (yes/no)" },
  { value: "file", label: "File upload" },
];

const f = (key, label, type, required, extra = {}) => ({
  key,
  label,
  type,
  required,
  visible: true,
  placeholder: "",
  help: "",
  options: [],
  builtin: true,
  ...extra,
});

/** Steps 1-8, in the exact order the wizard renders them. */
export const ADMISSION_STEPS = [
  {
    key: "builtin_1",
    title: "01. Student Identity",
    builtin: true,
    fields: [
      f("studentId", "Admission Number", "text", false, {
        placeholder: "Leave blank to auto-generate (e.g. STU0001)",
      }),
      f("firstName", "First Name", "text", true),
      f("lastName", "Last Name", "text", true),
      f("dob", "Date of Birth", "date", true),
      f("gender", "Gender", "select", true, {
        options: ["Male", "Female", "Other"],
      }),
      f("bloodGroup", "Blood Group", "text", false),
      f("nationality", "Nationality", "text", false, {
        placeholder: "e.g. Indian",
      }),
      f("placeOfBirth", "Place of Birth", "text", false),
      f("caste", "Caste", "text", false),
      f("category", "Category", "select", true, {
        options: CATEGORY_OPTIONS,
      }),
      f("religion", "Religion", "select", false, {
        options: ["Hindu", "Jain", "Sikh", "Muslim", "Christian", "Buddhism"],
      }),
      f("nicNumber", "NIC Number", "text", false),
      f("srNo", "SR. No.", "text", false),
      f("apaarId", "APAAR ID", "text", false),
      f("community", "Community", "select", false, {
        options: COMMUNITY_OPTIONS,
        help: "Only shown when Category is Minority.",
      }),
      f("aadhaarNumber", "Aadhaar Number / Aadhaar ID", "text", false, {
        placeholder: "12-digit Aadhaar number",
      }),
      f("penNumber", "PEN Number", "text", false, {
        placeholder: "Permanent Education Number",
        help: "APAAR / PEN as issued by the education board.",
      }),
      f("admissionSource", "Admission Source", "select", false, {
        options: ADMISSION_SOURCE_OPTIONS,
        help: "How did you come to know about the school?",
      }),
      f("isSpecialChild", "Is special child?", "checkbox", false),
      f("isEws", "EWS (Economically Weaker Section)", "checkbox", false),
      f(
        "isPhysicallyDisabled",
        "Is physically disabled?",
        "checkbox",
        false,
      ),
      f("admissionDate", "Admission Date", "date", true),
    ],
  },
  {
    key: "builtin_2",
    title: "02. Parent & Contact Details",
    builtin: true,
    fields: [
      f("fatherName", "Father Name", "text", true),
      f("fatherMobile", "Father Mobile", "tel", true),
      f("fatherEmail", "Father Email", "email", false),
      f("motherName", "Mother Name", "text", true),
      f("motherMobile", "Mother Mobile", "tel", true),
      f("motherEmail", "Mother Email", "email", false),
      f("guardianName", "Guardian Name", "text", false),
      f("guardianMobile", "Guardian Mobile", "tel", false),
      f("guardianRelation", "Guardian Relation", "select", false, {
        options: GUARDIAN_RELATION_OPTIONS,
      }),
      f("guardianEmail", "Guardian Email", "email", false),
    ],
  },
  {
    key: "builtin_address",
    title: "03. Residential Address",
    builtin: true,
    fields: [
      f("address", "Address Line", "textarea", true),
      f("city", "City / Town / Tehsil", "text", false),
      f("district", "District", "text", false),
      f("state", "State", "select", false, {
        options: INDIA_STATES,
      }),
      f("pincode", "PIN Code", "text", false),
    ],
  },
  {
    key: "builtin_5",
    title: "04. Class Placement, Hostel & Transport Assignment",
    builtin: true,
    fields: [
      f("classId", "Class", "select", true),
      f("sectionId", "Section", "select", false),
      f("rollNo", "Roll Number", "text", true),
      f("studentType", "Student Type", "select", false, {
        options: ["Day Scholar", "Day Boarder", "Boarder"],
      }),
      f("transport", "Transport Route", "select", false),
      f("relative", "Relative / Sibling", "text", false),
    ],
  },
  {
    key: "builtin_3",
    title: "05. Previous School Details",
    builtin: true,
    fields: [
      f("previousSchoolName", "Previous School Name", "text", false),
      f("previousSchoolUdise", "Previous School UDISE Code", "text", false),
      f("previousSchoolClass", "Last Class Attended", "text", false),
      f("previousSchoolResult", "Last Result", "text", false),
      f("previousSchoolTcNumber", "TC Number", "text", false, {
        placeholder: "Transfer Certificate number",
      }),
      f("schoolLeavingDate", "School Leaving Date", "date", false),
      f("prevSchoolAddress", "Previous School Address", "text", false),
    ],
  },
  {
    key: "builtin_4",
    title: "06. Original Student Documents",
    builtin: true,
    fields: [
      f("studentPhoto", "Student Photo", "file", true),
      f("fatherPhoto", "Father Photo", "file", false),
      f("motherPhoto", "Mother Photo", "file", false),
      f("guardianPhoto", "Guardian Photo", "file", false),
      f("birthCertificate", "Birth Certificate", "file", false),
      f("transferCertificate", "Transfer Certificate", "file", false),
      f("studentAadhar", "Student Aadhar", "file", false),
      f("fatherAadhar", "Father Aadhar", "file", true),
      f("motherAadhar", "Mother Aadhar", "file", true),
    ],
  },
  {
    key: "builtin_6",
    title: "07. Fee Breakdown",
    builtin: true,
    fields: [
      f("totalFee", "Total Annual Fee", "number", true),
      f("discountType", "Discount Type", "select", false),
      f("discountValue", "Discount Value", "number", false),
      f("finalFee", "Final Fee", "number", false),
      f("busFeeFrequency", "Bus Fee Type", "select", false, {
        options: [
          { label: "Annually", value: "annually" },
          { label: "Quarterly", value: "quarterly" },
        ],
      }),
      f("busFeeQuarter", "Bus Fee Quarter", "select", false),
    ],
  },
  {
    key: "builtin_medical",
    title: "Medical Condition / History",
    builtin: true,
    fields: [
      f("medicalConditionRemarks", "Medical Condition / Health History", "textarea", false, {
        placeholder: "Enter any medical condition, allergies, or health history",
      }),
    ],
  },
  {
    key: "builtin_7",
    title: "Parent & Student Portal Credentials",
    builtin: true,
    fields: [
      f("username", "Parent Username", "text", true),
      f("password", "Password", "text", true),
    ],
  },
  {
    key: "builtin_notes",
    title: "Notes / Remarks",
    builtin: true,
    fields: [
      f("admissionNotes", "Admission Notes / Office Remarks", "textarea", false, {
        placeholder: "Enter any special admission notes, scholarship reference, or office remarks",
      }),
    ],
  },
  {
    key: "builtin_8",
    title: "Review",
    builtin: true,
    fields: [],
  },
];

export const REVIEW_STEP_KEY = "builtin_8";

/** Structural fields the wizard/backend cannot create a student without. */
export const LOCKED_VISIBLE_FIELD_KEYS = new Set(["firstName", "lastName"]);

const cloneField = (field) => ({
  ...field,
  options: Array.isArray(field.options) ? [...field.options] : [],
});

const normalizeRemovedKeys = (raw) => {
  if (!Array.isArray(raw)) return [];
  return [
    ...new Set(
      raw
        .map((key) => String(key || "").trim())
        .filter(Boolean)
        .filter((key) => !LOCKED_VISIBLE_FIELD_KEYS.has(key)),
    ),
  ];
};

const mergeStep = (defaultStep, storedStep) => {
  if (!storedStep) {
    return {
      ...defaultStep,
      removedFieldKeys: [],
      fields: defaultStep.fields.map(cloneField),
    };
  }

  const defaultByKey = new Map(
    defaultStep.fields.map((field) => [field.key, field])
  );
  const removedFieldKeys = normalizeRemovedKeys(storedStep.removedFieldKeys);
  const removedSet = new Set(removedFieldKeys);
  const storedFields = (storedStep.fields || []).filter(
    (field) => field && field.key && !removedSet.has(field.key)
  );

  // Respect the order the admin saved (they can move fields around). Built-in
  // fields keep their original input type; only label/visibility/required/
  // placeholder/help are overridable, so unknown types can't break the wizard.
  const mergedFields = storedFields.map((field) => {
    const defaultField = defaultByKey.get(field.key);
    if (defaultField) {
      defaultByKey.delete(field.key);
      return cloneField({
        ...defaultField,
        ...field,
        type: defaultField.type,
        builtin: true,
        visible: LOCKED_VISIBLE_FIELD_KEYS.has(field.key)
          ? true
          : field.visible !== false,
      });
    }
    return cloneField({ ...field, builtin: false });
  });

  // New product defaults still appear unless the admin explicitly deleted them.
  defaultByKey.forEach((field) => {
    if (removedSet.has(field.key)) return;
    mergedFields.push(cloneField(field));
  });

  return {
    key: defaultStep.key,
    title: storedStep.title?.trim() || defaultStep.title,
    builtin: true,
    removedFieldKeys,
    fields: mergedFields,
  };
};

/**
 * Merge a saved config with the built-in layout.
 * Custom steps are placed after "Parent Login" and before "Review".
 */
export const mergeAdmissionSteps = (storedSteps) => {
  if (!Array.isArray(storedSteps) || storedSteps.length === 0) {
    return ADMISSION_STEPS.map((step) => ({
      ...step,
      removedFieldKeys: [],
      fields: step.fields.map(cloneField),
    }));
  }

  const storedByKey = new Map(
    storedSteps.filter((s) => s?.key).map((s) => [s.key, s])
  );

  const builtinBody = ADMISSION_STEPS.filter((s) => s.key !== REVIEW_STEP_KEY);
  const reviewDefault = ADMISSION_STEPS.find(
    (s) => s.key === REVIEW_STEP_KEY
  );

  const mergedBuiltin = builtinBody.map((step) =>
    mergeStep(step, storedByKey.get(step.key))
  );

  const customSteps = storedSteps
    .filter((step) => step && !step.builtin && step.key !== REVIEW_STEP_KEY)
    .map((step) => ({
      key: String(step.key),
      title: step.title?.trim() || "Additional Details",
      builtin: false,
      removedFieldKeys: normalizeRemovedKeys(step.removedFieldKeys),
      fields: (step.fields || [])
        .filter((field) => field && field.key)
        .map((field) => cloneField({ ...field, builtin: false })),
    }));

  const review = mergeStep(reviewDefault, storedByKey.get(REVIEW_STEP_KEY));

  return [...mergedBuiltin, ...customSteps, review];
};

/** key -> field metadata (including which step it lives in). */
export const buildFieldIndex = (steps) => {
  const index = new Map();
  for (const step of steps) {
    // Deleted built-ins must stay addressable so the hardcoded wizard can hide
    // them (Input/Select only skip when meta.visible === false).
    for (const key of step.removedFieldKeys || []) {
      if (!key || index.has(key)) continue;
      index.set(key, {
        key,
        visible: false,
        required: false,
        removed: true,
        stepKey: step.key,
      });
    }
    for (const field of step.fields) {
      index.set(field.key, { ...field, stepKey: step.key });
    }
  }
  return index;
};

/** Is this a field the admin added (as opposed to a built-in one)? */
export const isCustomField = (field) =>
  !field.builtin && String(field.key).startsWith("cf_");

export const makeCustomFieldKey = () =>
  `cf_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
