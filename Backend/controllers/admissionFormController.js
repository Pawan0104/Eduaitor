import AdmissionForm from "../models/admissionForm.js";

const getSchoolId = (req) => req.user?.school_id;

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

      return {
        key,
        title: cleanString(rawStep.title, 80) || `Step ${stepIndex + 1}`,
        builtin: Boolean(rawStep.builtin),
        fields: uniqueFields,
      };
    })
    .filter(Boolean);
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

    const config = await AdmissionForm.findOne({ schoolId }).lean();

    return res.json({
      success: true,
      data: {
        // null means "no customization yet - use the built-in form".
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

    const steps = sanitizeSteps(req.body?.steps);

    if (steps.length === 0) {
      return res.status(400).json({
        success: false,
        message: "The admission form needs at least one step.",
      });
    }

    const config = await AdmissionForm.findOneAndUpdate(
      { schoolId },
      { $set: { steps } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json({
      success: true,
      message: "Admission form saved.",
      data: { steps: config.steps, updatedAt: config.updatedAt },
    });
  } catch (error) {
    if (error?.code === 11000) {
      // Two saves raced; retry as an update by re-running the query.
      try {
        const steps = sanitizeSteps(req.body?.steps);
        const config = await AdmissionForm.findOneAndUpdate(
          { schoolId: getSchoolId(req) },
          { $set: { steps } },
          { new: true }
        ).lean();
        return res.json({
          success: true,
          message: "Admission form saved.",
          data: { steps: config.steps, updatedAt: config.updatedAt },
        });
      } catch (retryError) {
        return next(retryError);
      }
    }
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

    await AdmissionForm.deleteOne({ schoolId });

    return res.json({
      success: true,
      message: "Admission form reset to the default layout.",
      data: { steps: null },
    });
  } catch (error) {
    next(error);
  }
};
