/** Default templates + placeholder docs for printable school documents. */

export const PLACEHOLDERS = [
  { key: "studentName", label: "Student full name" },
  { key: "studentId", label: "Admission / student ID" },
  { key: "fatherName", label: "Father's name" },
  { key: "motherName", label: "Mother's name" },
  { key: "dob", label: "Date of birth" },
  { key: "className", label: "Class" },
  { key: "sectionName", label: "Section" },
  { key: "rollNo", label: "Roll number" },
  { key: "admissionDate", label: "Admission date" },
  { key: "leavingDate", label: "Leaving / issue date" },
  { key: "issueDate", label: "Certificate issue date" },
  { key: "reason", label: "Reason for leaving" },
  { key: "conduct", label: "Conduct / character" },
  { key: "remarks", label: "Remarks" },
  { key: "schoolName", label: "School name" },
  { key: "schoolAddress", label: "School address" },
  { key: "certificateNo", label: "Certificate number" },
];

const sharedVisual = {
  showLogo: true,
  showBorder: true,
  borderStyle: "classic",
  primaryColor: "#1e3a5f",
  accentColor: "#c9a227",
  backgroundColor: "#ffffff",
  borderColor: "",
  textColor: "#0f172a",
  logoUrl: "",
};

const TRANSFER_BODY_FORMAL = `This is to certify that {{studentName}} (Student ID: {{studentId}}), son/daughter of {{fatherName}}, was a bonafide student of {{schoolName}}.

He/She was studying in Class {{className}}{{sectionName}} and was admitted to this school on {{admissionDate}}.

The student is leaving the school on {{leavingDate}} for the following reason: {{reason}}.

His/Her conduct during the stay in the school was {{conduct}}.

{{remarks}}

We wish him/her success in future endeavours.`;

const TRANSFER_BODY_BRIEF = `Certified that {{studentName}} (ID: {{studentId}}), child of {{fatherName}}, studied in Class {{className}}{{sectionName}} at {{schoolName}} from {{admissionDate}} and is leaving on {{leavingDate}} due to {{reason}}.

Conduct: {{conduct}}.
{{remarks}}`;

const CHARACTER_BODY_FORMAL = `This is to certify that {{studentName}} (Student ID: {{studentId}}), son/daughter of {{fatherName}}, is/was a student of {{schoolName}} studying in Class {{className}}{{sectionName}}.

During his/her stay in this institution, his/her conduct and character have been found to be {{conduct}}.

{{remarks}}

This certificate is issued on {{issueDate}} for whatever purpose it may serve.`;

const CHARACTER_BODY_BRIEF = `{{schoolName}} certifies that {{studentName}} ({{studentId}}), Class {{className}}{{sectionName}}, has maintained {{conduct}} conduct and character.

Issued on {{issueDate}}.
{{remarks}}`;

export const DEFAULT_TEMPLATES = {
  transfer: {
    title: "TRANSFER CERTIFICATE",
    subtitle: "To Whom It May Concern",
    bodyTemplate: TRANSFER_BODY_FORMAL,
    footerText:
      "This certificate is issued on request of the parent/guardian for school transfer purposes.",
    signatoryName: "Principal",
    signatoryDesignation: "Principal",
    ...sharedVisual,
  },
  character: {
    title: "CHARACTER CERTIFICATE",
    subtitle: "Certificate of Character & Conduct",
    bodyTemplate: CHARACTER_BODY_FORMAL,
    footerText: "Issued by the school administration on official letterhead.",
    signatoryName: "Principal",
    signatoryDesignation: "Principal",
    ...sharedVisual,
  },
  id_card: {
    title: "Student Identity Card",
    subtitle: "Staff Identity Card",
    bodyTemplate: "",
    footerText: "Property of the school — if found, please return.",
    signatoryName: "",
    signatoryDesignation: "",
    ...sharedVisual,
    primaryColor: "#4f46e5",
    accentColor: "#0f766e",
    backgroundColor: "#ffffff",
    borderStyle: "modern",
  },
  report_card: {
    title: "PROGRESS REPORT",
    subtitle: "Academic Report Card",
    bodyTemplate: "",
    footerText:
      "This is a computer-generated report. Verify with the school office if required.",
    signatoryName: "Principal",
    signatoryDesignation: "Principal",
    ...sharedVisual,
    primaryColor: "#1e3a5f",
    accentColor: "#4f46e5",
  },
};

/**
 * Five predefined design themes available for every document type.
 * Applying a preset updates colors/border/text; logoUrl is preserved separately.
 */
export const PRESET_TEMPLATES = [
  {
    id: "classic_navy",
    name: "Classic Navy",
    description: "Traditional navy & gold — formal school look",
    visual: {
      showLogo: true,
      showBorder: true,
      borderStyle: "classic",
      primaryColor: "#1e3a5f",
      accentColor: "#c9a227",
      backgroundColor: "#fffef8",
      borderColor: "#1e3a5f",
      textColor: "#0f172a",
    },
    content: {
      transfer: {
        title: "TRANSFER CERTIFICATE",
        subtitle: "To Whom It May Concern",
        bodyTemplate: TRANSFER_BODY_FORMAL,
        footerText:
          "This certificate is issued on request of the parent/guardian for school transfer purposes.",
        signatoryName: "Principal",
        signatoryDesignation: "Principal",
      },
      character: {
        title: "CHARACTER CERTIFICATE",
        subtitle: "Certificate of Character & Conduct",
        bodyTemplate: CHARACTER_BODY_FORMAL,
        footerText: "Issued by the school administration on official letterhead.",
        signatoryName: "Principal",
        signatoryDesignation: "Principal",
      },
      id_card: {
        title: "Student Identity Card",
        subtitle: "Staff Identity Card",
        footerText: "Official school identity — please return if found.",
      },
      report_card: {
        title: "PROGRESS REPORT",
        subtitle: "Academic Report Card",
        footerText: "Official academic record of the school.",
        signatoryName: "Principal",
        signatoryDesignation: "Principal",
      },
    },
  },
  {
    id: "modern_teal",
    name: "Modern Teal",
    description: "Clean teal accents — contemporary & clear",
    visual: {
      showLogo: true,
      showBorder: true,
      borderStyle: "modern",
      primaryColor: "#0f766e",
      accentColor: "#14b8a6",
      backgroundColor: "#ffffff",
      borderColor: "#0f766e",
      textColor: "#134e4a",
    },
    content: {
      transfer: {
        title: "SCHOOL LEAVING CERTIFICATE",
        subtitle: "Transfer / Migration",
        bodyTemplate: TRANSFER_BODY_BRIEF,
        footerText: "Generated digitally by the school office.",
        signatoryName: "Principal",
        signatoryDesignation: "Head of Institution",
      },
      character: {
        title: "CONDUCT CERTIFICATE",
        subtitle: "Character & Behaviour",
        bodyTemplate: CHARACTER_BODY_BRIEF,
        footerText: "Valid for official use as required.",
        signatoryName: "Principal",
        signatoryDesignation: "Head of Institution",
      },
      id_card: {
        title: "Student ID",
        subtitle: "Staff ID",
        footerText: "Valid for the current academic session.",
      },
      report_card: {
        title: "TERM REPORT",
        subtitle: "Student Performance Summary",
        footerText: "Marks as published by subject teachers.",
        signatoryName: "Principal",
        signatoryDesignation: "Head of Institution",
      },
    },
  },
  {
    id: "royal_maroon",
    name: "Royal Maroon",
    description: "Ceremonial maroon & gold — award style",
    visual: {
      showLogo: true,
      showBorder: true,
      borderStyle: "classic",
      primaryColor: "#7f1d1d",
      accentColor: "#b45309",
      backgroundColor: "#fffbeb",
      borderColor: "#7f1d1d",
      textColor: "#1c1917",
    },
    content: {
      transfer: {
        title: "TRANSFER CERTIFICATE",
        subtitle: "Issued under school seal",
        bodyTemplate: TRANSFER_BODY_FORMAL,
        footerText:
          "This document bears the authority of the school administration.",
        signatoryName: "Principal",
        signatoryDesignation: "Principal",
      },
      character: {
        title: "CERTIFICATE OF CHARACTER",
        subtitle: "With compliments of the school",
        bodyTemplate: CHARACTER_BODY_FORMAL,
        footerText: "Presented with the best wishes of the institution.",
        signatoryName: "Principal",
        signatoryDesignation: "Principal",
      },
      id_card: {
        title: "Student Identity Card",
        subtitle: "Staff Identity Card",
        footerText: "Carry this card at all times on campus.",
      },
      report_card: {
        title: "ANNUAL PROGRESS REPORT",
        subtitle: "Scholastic Achievement Record",
        footerText: "Congratulations on another year of learning.",
        signatoryName: "Principal",
        signatoryDesignation: "Principal",
      },
    },
  },
  {
    id: "emerald_green",
    name: "Emerald Green",
    description: "Fresh green palette — growth & learning",
    visual: {
      showLogo: true,
      showBorder: true,
      borderStyle: "modern",
      primaryColor: "#166534",
      accentColor: "#65a30d",
      backgroundColor: "#f7fee7",
      borderColor: "#166534",
      textColor: "#14532d",
    },
    content: {
      transfer: {
        title: "LEAVING CERTIFICATE",
        subtitle: "Student Transfer Record",
        bodyTemplate: TRANSFER_BODY_BRIEF,
        footerText: "Best wishes for the student's next chapter.",
        signatoryName: "Principal",
        signatoryDesignation: "Principal",
      },
      character: {
        title: "GOOD CONDUCT CERTIFICATE",
        subtitle: "Behaviour & Values",
        bodyTemplate: CHARACTER_BODY_BRIEF,
        footerText: "Issued for academic and personal purposes.",
        signatoryName: "Principal",
        signatoryDesignation: "Principal",
      },
      id_card: {
        title: "Learner ID Card",
        subtitle: "Staff ID Card",
        footerText: "Property of the school community.",
      },
      report_card: {
        title: "LEARNING REPORT",
        subtitle: "Growth & Achievement Overview",
        footerText: "Keep growing — every mark is a step forward.",
        signatoryName: "Principal",
        signatoryDesignation: "Principal",
      },
    },
  },
  {
    id: "minimal_slate",
    name: "Minimal Slate",
    description: "Simple slate lines — clean & distraction-free",
    visual: {
      showLogo: true,
      showBorder: true,
      borderStyle: "minimal",
      primaryColor: "#334155",
      accentColor: "#64748b",
      backgroundColor: "#ffffff",
      borderColor: "#cbd5e1",
      textColor: "#0f172a",
    },
    content: {
      transfer: {
        title: "TRANSFER CERTIFICATE",
        subtitle: "",
        bodyTemplate: TRANSFER_BODY_BRIEF,
        footerText: "",
        signatoryName: "Principal",
        signatoryDesignation: "Principal",
      },
      character: {
        title: "CHARACTER CERTIFICATE",
        subtitle: "",
        bodyTemplate: CHARACTER_BODY_BRIEF,
        footerText: "",
        signatoryName: "Principal",
        signatoryDesignation: "Principal",
      },
      id_card: {
        title: "Student Card",
        subtitle: "Staff Card",
        footerText: "",
      },
      report_card: {
        title: "REPORT CARD",
        subtitle: "",
        footerText: "",
        signatoryName: "Principal",
        signatoryDesignation: "Principal",
      },
    },
  },
];

/** Merge a preset into a document type (keeps logoUrl if provided). */
export function applyPresetToType(type, presetId, { keepLogoUrl = "" } = {}) {
  const preset = PRESET_TEMPLATES.find((p) => p.id === presetId);
  if (!preset) return null;
  const base = DEFAULT_TEMPLATES[type];
  if (!base) return null;
  const content = preset.content?.[type] || {};
  return {
    ...base,
    ...preset.visual,
    ...content,
    logoUrl: keepLogoUrl || "",
    bodyTemplate:
      content.bodyTemplate !== undefined
        ? content.bodyTemplate
        : base.bodyTemplate,
  };
}

export function formatDisplayDate(value) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function renderTemplate(template, vars) {
  let out = String(template || "");
  for (const [key, raw] of Object.entries(vars || {})) {
    const value = raw == null || raw === "" ? "—" : String(raw);
    out = out.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi"), value);
  }
  out = out.replace(/\{\{\s*[\w.]+\s*\}\}/g, "—");
  return out;
}
