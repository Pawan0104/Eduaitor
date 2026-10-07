/**
 * ID card field configuration. Which data fields appear in the header,
 * body and footer of each card type is customizable by the school admin
 * from Document Designs → ID Card.
 *
 * `options` — the pickable fields for a card type.
 * `default` — the layout used when the school has not customized it.
 */
export const ID_CARD_FIELD_CONFIG = {
  student: {
    label: "Student",
    options: [
      { key: "idNumber", label: "Student ID" },
      { key: "className", label: "Class & Section" },
      { key: "rollNo", label: "Roll No." },
      { key: "bloodGroup", label: "Blood Group" },
      { key: "dob", label: "Date of Birth" },
      { key: "gender", label: "Gender" },
      { key: "house", label: "House" },
      { key: "fatherName", label: "Father / Guardian" },
      { key: "motherName", label: "Mother" },
      { key: "address", label: "Address" },
    ],
    default: {
      header: [],
      body: ["idNumber", "className", "rollNo", "bloodGroup", "dob", "house"],
      footer: ["fatherName"],
    },
  },
  staff: {
    label: "Staff",
    options: [
      { key: "idNumber", label: "Staff ID" },
      { key: "roleLabel", label: "Role / Designation" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "dob", label: "Date of Birth" },
      { key: "gender", label: "Gender" },
      { key: "address", label: "Address" },
      { key: "employmentType", label: "Employment Type" },
      { key: "joiningDate", label: "Joining Date" },
    ],
    default: {
      header: [],
      body: ["idNumber", "roleLabel", "phone", "email", "joiningDate"],
      footer: [],
    },
  },
  teacher: {
    label: "Teacher",
    options: [
      { key: "idNumber", label: "Teacher ID" },
      { key: "roleLabel", label: "Role / Designation" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "dob", label: "Date of Birth" },
      { key: "gender", label: "Gender" },
      { key: "address", label: "Address" },
      { key: "employmentType", label: "Employment Type" },
      { key: "joiningDate", label: "Joining Date" },
    ],
    default: {
      header: [],
      body: ["idNumber", "roleLabel", "phone", "email", "joiningDate"],
      footer: [],
    },
  },
  driver: {
    label: "Driver",
    options: [
      { key: "idNumber", label: "Driver ID" },
      { key: "roleLabel", label: "Role" },
      { key: "phone", label: "Phone" },
      { key: "gender", label: "Gender" },
      { key: "address", label: "Address" },
      { key: "joiningDate", label: "Joining Date" },
    ],
    default: {
      header: [],
      body: ["idNumber", "roleLabel", "phone", "joiningDate"],
      footer: [],
    },
  },
};

export const ID_CARD_ZONES = [
  { id: "header", label: "Header" },
  { id: "body", label: "Body" },
  { id: "footer", label: "Footer" },
];

/** Fill a saved layout with per-zone defaults so rendering never breaks. */
export function mergeCardFields(saved) {
  const out = {};
  for (const key of Object.keys(ID_CARD_FIELD_CONFIG)) {
    const src =
      saved && saved[key] && typeof saved[key] === "object" ? saved[key] : {};
    const def = ID_CARD_FIELD_CONFIG[key].default;
    out[key] = {
      header: Array.isArray(src.header) ? src.header : def.header,
      body: Array.isArray(src.body) ? src.body : def.body,
      footer: Array.isArray(src.footer) ? src.footer : def.footer,
    };
  }
  return out;
}

export function formatCardDate(value) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-IN");
}

/** Resolve a field key → display label for the card renderer + picker. */
export function cardFieldLabel(cardKey, fieldKey) {
  const cfg = ID_CARD_FIELD_CONFIG[cardKey];
  return cfg?.options.find((o) => o.key === fieldKey)?.label || fieldKey;
}

/** Resolve a field key → display value for a person payload. */
export function cardFieldValue(person, cardKey, fieldKey) {
  switch (fieldKey) {
    case "className": {
      const section =
        person.sectionName && person.sectionName !== "—"
          ? ` – ${person.sectionName}`
          : "";
      return `${person.className || "—"}${section}`;
    }
    case "dob":
      return formatCardDate(person.dob);
    case "joiningDate":
      return formatCardDate(person.joiningDate);
    default: {
      const value = person[fieldKey];
      return value == null || value === "" ? "—" : value;
    }
  }
}