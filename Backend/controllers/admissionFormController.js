import AdmissionForm, { SCHOOL_FORM_TYPES } from "../models/admissionForm.js";
import { ensureAdmissionFormIndexes } from "../config/db.js";

const getSchoolId = (req) => req.user?.school_id;

/**
 * Bump whenever the built-in admission layout changes in a way that must
 * override previously saved steps (labels, field set, section order).
 */
const ADMISSION_DEFAULTS_VERSION = 2;

/**
 * Prefer findOneAndUpdate($set) over document.save().
 * `steps` is Mixed JSON — Object.assign + save often skipped writing nested
 * changes, so Customize Form looked saved in the API response but the live
 * admission / lead / registration forms never picked up the new layout.
 *
 * Admission resolves typed docs first, then legacy docs with no formType, so
 * GET and PUT always touch the same record.
 */
const upsertFormConfig = async (schoolId, formType, setFields) => {
  const $set = { ...setFields, formType, schoolId };

  const tryUpdate = (filter) =>
    AdmissionForm.findOneAndUpdate(filter, { $set }, {
      new: true,
      runValidators: true,
    }).lean();

  let updated =
    formType === "admission"
      ? (await tryUpdate({ schoolId, formType: "admission" })) ||
        (await tryUpdate({ schoolId, formType: { $exists: false } }))
      : await tryUpdate({ schoolId, formType });

  if (updated) return updated;

  try {
    const created = await AdmissionForm.create({
      schoolId,
      formType,
      ...setFields,
    });
    return created.toObject();
  } catch (error) {
    // Concurrent create for the same school+formType — update the winner.
    if (error?.code !== 11000) throw error;
    updated =
      formType === "admission"
        ? (await tryUpdate({ schoolId, formType: "admission" })) ||
          (await tryUpdate({ schoolId, formType: { $exists: false } }))
        : await tryUpdate({ schoolId, formType });
    if (updated) return updated;
    throw error;
  }
};

const FIELD_TYPES = new Set([
  "text",
  "textarea",
  "number",
  "date",
  "email",
  "tel",
  "select",
  "radio",
  "checkbox",
  "file",
]);

const MAX_STEPS = 40;
const MAX_FIELDS_PER_STEP = 120;
const MAX_OPTIONS = 100;

const cleanString = (value, max = 160) =>
  String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .slice(0, max)
    .trim();

const cleanKey = (value) =>
  String(value ?? "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 60);

const resolveFormType = (req) => {
  const raw =
    req.formType ||
    req.params?.formType ||
    req.query?.formType ||
    req.body?.formType ||
    "admission";
  const formType = String(raw || "admission").trim().toLowerCase();
  return SCHOOL_FORM_TYPES.includes(formType) ? formType : "admission";
};

const sanitizeField = (raw = {}) => {
  const key = cleanKey(raw.key);
  if (!key) return null;

  const type = FIELD_TYPES.has(raw.type) ? raw.type : "text";
  const options = Array.isArray(raw.options)
    ? raw.options
        .map((opt) => cleanString(opt, 80))
        .filter(Boolean)
        .slice(0, MAX_OPTIONS)
    : [];

  return {
    key,
    label: cleanString(raw.label, 120) || key,
    type,
    required: Boolean(raw.required),
    visible: raw.visible === undefined ? true : Boolean(raw.visible),
    placeholder: cleanString(raw.placeholder, 160),
    help: cleanString(raw.help, 240),
    options,
    builtin: Boolean(raw.builtin),
  };
};

const sanitizeSteps = (input) => {
  if (!Array.isArray(input)) return [];

  return input
    .slice(0, MAX_STEPS)
    .map((rawStep, stepIndex) => {
      if (!rawStep) return null;
      const key = cleanKey(rawStep.key) || `step_${stepIndex + 1}`;
      const fields = Array.isArray(rawStep.fields)
        ? rawStep.fields
            .slice(0, MAX_FIELDS_PER_STEP)
            .map(sanitizeField)
            .filter(Boolean)
        : [];

      // Two fields may not share a key inside the same step.
      const seen = new Set();
      const uniqueFields = fields.filter((field) => {
        if (seen.has(field.key)) return false;
        seen.add(field.key);
        return true;
      });

      const removedFieldKeys = Array.isArray(rawStep.removedFieldKeys)
        ? [
            ...new Set(
              rawStep.removedFieldKeys
                .map((item) => cleanKey(item))
                .filter(Boolean),
            ),
          ].slice(0, MAX_FIELDS_PER_STEP)
        : [];

      return {
        key,
        title: cleanString(rawStep.title, 80) || `Step ${stepIndex + 1}`,
        builtin: Boolean(rawStep.builtin),
        removedFieldKeys,
        fields: uniqueFields,
      };
    })
    .filter(Boolean);
};

const findFormConfig = async (schoolId, formType) => {
  if (formType === "admission") {
    // Prefer typed docs; fall back to legacy unique(schoolId) rows.
    const typed = await AdmissionForm.findOne({
      schoolId,
      formType: "admission",
    }).lean();
    if (typed) return typed;
    return AdmissionForm.findOne({
      schoolId,
      formType: { $exists: false },
    }).lean();
  }
  return AdmissionForm.findOne({ schoolId, formType }).lean();
};

/* ---------------- GET CONFIG ---------------- */
export const getAdmissionForm = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "School not identified.",
      });
    }

    const formType = resolveFormType(req);
    const config = await findFormConfig(schoolId, formType);

    return res.json({
      success: true,
      data: {
        formType,
        // null means "no customization yet - use the built-in form".
        steps: config?.steps?.length ? config.steps : null,
        layoutMode:
          config?.layoutMode === "single" ? "single" : "steps",
        defaultsVersion: Number(config?.defaultsVersion) || 0,
        updatedAt: config?.updatedAt || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* ---------------- SAVE LAYOUT MODE ---------------- */
export const saveAdmissionFormLayout = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "School not identified.",
      });
    }

    const formType = resolveFormType(req);
    if (formType !== "admission") {
      return res.status(400).json({
        success: false,
        message: "Layout mode is only available for the admission form.",
      });
    }

    const layoutMode =
      String(req.body?.layoutMode || "").trim().toLowerCase() === "single"
        ? "single"
        : "steps";

    let config;
    try {
      config = await upsertFormConfig(schoolId, "admission", { layoutMode });
    } catch (error) {
      if (error?.code !== 11000) throw error;
      await ensureAdmissionFormIndexes();
      config = await upsertFormConfig(schoolId, "admission", { layoutMode });
    }

    return res.json({
      success: true,
      message:
        layoutMode === "single"
          ? "Admission form set to single page."
          : "Admission form set to step-by-step.",
      data: {
        formType: "admission",
        layoutMode: config?.layoutMode === "single" ? "single" : "steps",
        steps: config?.steps?.length ? config.steps : null,
        updatedAt: config?.updatedAt || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* ---------------- SAVE CONFIG ---------------- */
export const saveAdmissionForm = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "School not identified.",
      });
    }

    const formType = resolveFormType(req);
    const steps = sanitizeSteps(req.body?.steps);
    const versionPatch =
      formType === "admission"
        ? { defaultsVersion: ADMISSION_DEFAULTS_VERSION }
        : {};

    if (steps.length === 0) {
      return res.status(400).json({
        success: false,
        message: "The form needs at least one step.",
      });
    }

    let config;
    try {
      config = await upsertFormConfig(schoolId, formType, {
        steps,
        ...versionPatch,
      });
    } catch (error) {
      if (error?.code !== 11000) throw error;
      // Drop legacy unique(schoolId) then retry once.
      await ensureAdmissionFormIndexes();
      config = await upsertFormConfig(schoolId, formType, {
        steps,
        ...versionPatch,
      });
    }

    return res.json({
      success: true,
      message: "Form saved.",
      data: {
        formType,
        steps: config.steps,
        defaultsVersion: Number(config?.defaultsVersion) || 0,
        updatedAt: config.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* ---------------- RESET TO DEFAULT ---------------- */
export const resetAdmissionForm = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "School not identified.",
      });
    }

    const formType = resolveFormType(req);
    if (formType === "admission") {
      await AdmissionForm.deleteMany({
        schoolId,
        $or: [{ formType: "admission" }, { formType: { $exists: false } }],
      });
    } else {
      await AdmissionForm.deleteOne({ schoolId, formType });
    }

    return res.json({
      success: true,
      message: "Form reset to the default layout.",
      data: { formType, steps: null },
    });
  } catch (error) {
    next(error);
  }
};

/** Express middleware: bind a fixed formType onto the request. */
export const withFormType = (formType) => (req, _res, next) => {
  req.formType = formType;
  next();
};
