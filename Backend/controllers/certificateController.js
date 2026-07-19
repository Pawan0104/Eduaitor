import CertificateTemplate, {
  CERTIFICATE_TYPES,
  DOCUMENT_DESIGN_TYPES,
} from "../models/certificateTemplate.js";
import Student from "../models/student.js";
import School from "../models/school.js";
import {
  DEFAULT_TEMPLATES,
  PRESET_TEMPLATES,
  PLACEHOLDERS,
  applyPresetToType,
  formatDisplayDate,
  renderTemplate,
} from "../utils/certificateDefaults.js";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";

const schoolOnly = (req, res) => {
  if (req.user?.role !== "school_admin") {
    res.status(403).json({ success: false, message: "School admin only" });
    return false;
  }
  if (!req.user?.school_id) {
    res.status(403).json({ success: false, message: "School not identified" });
    return false;
  }
  return true;
};

export const getOrCreateTemplate = async (schoolId, type) => {
  let doc = await CertificateTemplate.findOne({ schoolId, type });
  if (doc) return doc;
  const defaults = DEFAULT_TEMPLATES[type];
  if (!defaults) throw new Error(`Unknown design type: ${type}`);
  doc = await CertificateTemplate.create({
    schoolId,
    type,
    ...defaults,
  });
  return doc;
};

export const templateToJson = (doc) => ({
  type: doc.type,
  title: doc.title,
  subtitle: doc.subtitle,
  bodyTemplate: doc.bodyTemplate,
  footerText: doc.footerText,
  signatoryName: doc.signatoryName,
  signatoryDesignation: doc.signatoryDesignation,
  showLogo: doc.showLogo,
  showBorder: doc.showBorder,
  borderStyle: doc.borderStyle,
  primaryColor: doc.primaryColor,
  accentColor: doc.accentColor,
  backgroundColor: doc.backgroundColor || "#ffffff",
  borderColor: doc.borderColor || "",
  textColor: doc.textColor || "#0f172a",
  logoUrl: doc.logoUrl || "",
  updatedAt: doc.updatedAt,
});

/** Resolve design for any school (used by id-card / report-card APIs). */
export const getDocumentDesign = async (schoolId, type) => {
  if (!DOCUMENT_DESIGN_TYPES.includes(type)) return null;
  const doc = await getOrCreateTemplate(schoolId, type);
  return templateToJson(doc);
};

const ALLOWED_FIELDS = [
  "title",
  "subtitle",
  "bodyTemplate",
  "footerText",
  "signatoryName",
  "signatoryDesignation",
  "showLogo",
  "showBorder",
  "borderStyle",
  "primaryColor",
  "accentColor",
  "backgroundColor",
  "borderColor",
  "textColor",
  "logoUrl",
];

/** GET /certificates/meta — placeholders + types + presets */
export const getCertificateMeta = async (req, res) => {
  if (!schoolOnly(req, res)) return;
  res.json({
    success: true,
    types: DOCUMENT_DESIGN_TYPES,
    certificateTypes: CERTIFICATE_TYPES,
    placeholders: PLACEHOLDERS,
    defaults: DEFAULT_TEMPLATES,
    presets: PRESET_TEMPLATES.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      visual: p.visual,
    })),
  });
};

/** GET /certificates/templates */
export const listTemplates = async (req, res) => {
  try {
    if (!schoolOnly(req, res)) return;
    const schoolId = req.user.school_id;
    const items = [];
    for (const type of DOCUMENT_DESIGN_TYPES) {
      const doc = await getOrCreateTemplate(schoolId, type);
      items.push(templateToJson(doc));
    }
    res.json({ success: true, templates: items });
  } catch (error) {
    console.error("listTemplates:", error);
    res.status(500).json({ success: false, message: "Failed to load templates" });
  }
};

/** GET /certificates/templates/:type */
export const getTemplate = async (req, res) => {
  try {
    if (!schoolOnly(req, res)) return;
    const type = req.params.type;
    if (!DOCUMENT_DESIGN_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid type" });
    }
    const doc = await getOrCreateTemplate(req.user.school_id, type);
    res.json({ success: true, template: templateToJson(doc) });
  } catch (error) {
    console.error("getTemplate:", error);
    res.status(500).json({ success: false, message: "Failed to load template" });
  }
};

/** PUT /certificates/templates/:type */
export const updateTemplate = async (req, res) => {
  try {
    if (!schoolOnly(req, res)) return;
    const type = req.params.type;
    if (!DOCUMENT_DESIGN_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid type" });
    }

    const updates = {};
    for (const key of ALLOWED_FIELDS) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    let doc = await CertificateTemplate.findOneAndUpdate(
      { schoolId: req.user.school_id, type },
      { $set: updates },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    const d = DEFAULT_TEMPLATES[type];
    if (CERTIFICATE_TYPES.includes(type) && !doc.bodyTemplate && d?.bodyTemplate) {
      Object.assign(doc, {
        title: doc.title || d.title,
        subtitle: doc.subtitle || d.subtitle,
        bodyTemplate: d.bodyTemplate,
        footerText: doc.footerText || d.footerText,
      });
      await doc.save();
    }

    res.json({
      success: true,
      message: "Template saved",
      template: templateToJson(doc),
    });
  } catch (error) {
    console.error("updateTemplate:", error);
    res.status(500).json({ success: false, message: "Failed to save template" });
  }
};

/** POST /certificates/templates/:type/reset */
export const resetTemplate = async (req, res) => {
  try {
    if (!schoolOnly(req, res)) return;
    const type = req.params.type;
    if (!DOCUMENT_DESIGN_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid type" });
    }
    const defaults = DEFAULT_TEMPLATES[type];
    const existing = await CertificateTemplate.findOne({
      schoolId: req.user.school_id,
      type,
    });
    const keepLogo = existing?.logoUrl || "";
    const doc = await CertificateTemplate.findOneAndUpdate(
      { schoolId: req.user.school_id, type },
      { $set: { ...defaults, logoUrl: keepLogo } },
      { new: true, upsert: true },
    );
    res.json({
      success: true,
      message: "Template reset to default",
      template: templateToJson(doc),
    });
  } catch (error) {
    console.error("resetTemplate:", error);
    res.status(500).json({ success: false, message: "Failed to reset template" });
  }
};

/** POST /certificates/templates/:type/apply-preset — body: { presetId } */
export const applyPreset = async (req, res) => {
  try {
    if (!schoolOnly(req, res)) return;
    const type = req.params.type;
    const presetId = req.body?.presetId;
    if (!DOCUMENT_DESIGN_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid type" });
    }
    const existing = await getOrCreateTemplate(req.user.school_id, type);
    const merged = applyPresetToType(type, presetId, {
      keepLogoUrl: existing.logoUrl || "",
    });
    if (!merged) {
      return res.status(400).json({ success: false, message: "Invalid preset" });
    }

    Object.assign(existing, merged);
    await existing.save();

    res.json({
      success: true,
      message: "Preset applied",
      presetId,
      template: templateToJson(existing),
    });
  } catch (error) {
    console.error("applyPreset:", error);
    res.status(500).json({ success: false, message: "Failed to apply preset" });
  }
};

/** POST /certificates/templates/:type/logo — multipart field "logo" */
export const uploadTemplateLogo = async (req, res) => {
  try {
    if (!schoolOnly(req, res)) return;
    const type = req.params.type;
    if (!DOCUMENT_DESIGN_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid type" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Logo file required" });
    }
    if (!req.file.mimetype?.startsWith("image/")) {
      return res.status(400).json({ success: false, message: "Only image files allowed" });
    }

    const uploaded = await uploadToCloudinary(
      req.file,
      `document-designs/${req.user.school_id}`,
    );

    const doc = await getOrCreateTemplate(req.user.school_id, type);
    doc.logoUrl = uploaded.url;
    doc.showLogo = true;
    await doc.save();

    res.json({
      success: true,
      message: "Logo uploaded",
      template: templateToJson(doc),
    });
  } catch (error) {
    console.error("uploadTemplateLogo:", error);
    res.status(500).json({ success: false, message: "Failed to upload logo" });
  }
};

/** DELETE /certificates/templates/:type/logo */
export const clearTemplateLogo = async (req, res) => {
  try {
    if (!schoolOnly(req, res)) return;
    const type = req.params.type;
    if (!DOCUMENT_DESIGN_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid type" });
    }
    const doc = await getOrCreateTemplate(req.user.school_id, type);
    doc.logoUrl = "";
    await doc.save();
    res.json({
      success: true,
      message: "Custom logo cleared — school logo will be used",
      template: templateToJson(doc),
    });
  } catch (error) {
    console.error("clearTemplateLogo:", error);
    res.status(500).json({ success: false, message: "Failed to clear logo" });
  }
};

/** GET /certificates/generate/:type/:studentId */
export const generateCertificate = async (req, res) => {
  try {
    if (!schoolOnly(req, res)) return;
    const { type, studentId } = req.params;
    if (!CERTIFICATE_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid type" });
    }

    const schoolId = req.user.school_id;
    const student = await Student.findOne({ _id: studentId, schoolId })
      .populate("classId", "name")
      .populate("sectionId", "name")
      .lean();

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const school = await School.findById(schoolId)
      .select("school_name school_logo address contact_phone contact_email")
      .lean();

    const template = await getOrCreateTemplate(schoolId, type);

    const issueDate = req.query.issueDate || new Date().toISOString();
    const leavingDate = req.query.leavingDate || issueDate;
    const reason = req.query.reason || "Parent's request";
    const conduct = req.query.conduct || "Good";
    const remarks = req.query.remarks || "";
    const certificateNo =
      req.query.certificateNo ||
      `${type === "transfer" ? "TC" : "CC"}-${String(student.studentId || student._id)
        .slice(-6)
        .toUpperCase()}-${new Date(issueDate).getFullYear()}`;

    const sectionLabel = student.sectionId?.name
      ? ` (${student.sectionId.name})`
      : "";

    const vars = {
      studentName: `${student.firstName || ""} ${student.lastName || ""}`.trim(),
      studentId: student.studentId || "",
      fatherName: student.fatherName || "—",
      motherName: student.motherName || "—",
      dob: formatDisplayDate(student.dob),
      className: student.classId?.name || "—",
      sectionName: sectionLabel,
      rollNo: student.rollNo || "—",
      admissionDate: formatDisplayDate(student.admissionDate),
      leavingDate: formatDisplayDate(leavingDate),
      issueDate: formatDisplayDate(issueDate),
      reason,
      conduct,
      remarks,
      schoolName: school?.school_name || "",
      schoolAddress: school?.address || "",
      certificateNo,
    };

    const bodyText = renderTemplate(template.bodyTemplate, vars);
    const logo = template.logoUrl || school?.school_logo || "";

    res.json({
      success: true,
      certificate: {
        type,
        vars,
        bodyText,
        template: templateToJson(template),
        school: {
          name: school?.school_name || "",
          logo,
          address: school?.address || "",
          phone: school?.contact_phone || "",
          email: school?.contact_email || "",
        },
        student: {
          _id: student._id,
          name: vars.studentName,
          studentId: vars.studentId,
          photo: student.documents?.studentPhoto || "",
        },
      },
    });
  } catch (error) {
    console.error("generateCertificate:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to generate certificate" });
  }
};
