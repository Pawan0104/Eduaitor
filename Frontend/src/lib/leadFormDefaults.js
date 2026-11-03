/**
 * Default Lead Management create-form layout.
 * Same builder/merge rules as the admission form.
 */

import {
  ADMISSION_FIELD_TYPES,
  makeCustomFieldKey,
} from "./admissionFormDefaults";

export const LEAD_FIELD_TYPES = ADMISSION_FIELD_TYPES.filter(
  (type) => type.value !== "file",
);

export const LEAD_LOCKED_FIELD_KEYS = new Set([
  "studentName",
  "parentName",
  "parentMobile",
  "assigneeKey",
]);

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

export const LEAD_STEPS = [
  {
    key: "lead_main",
    title: "Lead Details",
    builtin: true,
    removedFieldKeys: [],
    fields: [
      f("studentName", "Student Name", "text", true),
      f("parentName", "Parent Name", "text", true),
      f("parentMobile", "Parent Mobile Number", "tel", true, {
        placeholder: "10-digit mobile number",
      }),
      f("parentEmail", "Parent Email ID", "email", false),
      f("previousSchoolName", "Previous School Name", "text", false),
      f("classId", "Interested Class", "select", false),
      f("streamId", "Stream", "select", false),
      f("assigneeKey", "Assign Lead To", "select", true),
    ],
  },
];

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
        .filter((key) => !LEAD_LOCKED_FIELD_KEYS.has(key)),
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
    defaultStep.fields.map((field) => [field.key, field]),
  );
  const removedFieldKeys = normalizeRemovedKeys(storedStep.removedFieldKeys);
  const removedSet = new Set(removedFieldKeys);
  const storedFields = (storedStep.fields || []).filter(
    (field) => field && field.key && !removedSet.has(field.key),
  );

  const mergedFields = storedFields.map((field) => {
    const defaultField = defaultByKey.get(field.key);
    if (defaultField) {
      defaultByKey.delete(field.key);
      return cloneField({
        ...defaultField,
        ...field,
        type: defaultField.type,
        builtin: true,
        visible: LEAD_LOCKED_FIELD_KEYS.has(field.key)
          ? true
          : field.visible !== false,
      });
    }
    return cloneField({ ...field, builtin: false });
  });

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

export const mergeLeadSteps = (storedSteps) => {
  if (!Array.isArray(storedSteps) || storedSteps.length === 0) {
    return LEAD_STEPS.map((step) => ({
      ...step,
      removedFieldKeys: [],
      fields: step.fields.map(cloneField),
    }));
  }

  const storedByKey = new Map(
    storedSteps.filter((s) => s?.key).map((s) => [s.key, s]),
  );

  const mergedBuiltin = LEAD_STEPS.map((step) =>
    mergeStep(step, storedByKey.get(step.key)),
  );

  const customSteps = storedSteps
    .filter((step) => step && !step.builtin)
    .map((step) => ({
      key: String(step.key),
      title: step.title?.trim() || "Additional Details",
      builtin: false,
      removedFieldKeys: normalizeRemovedKeys(step.removedFieldKeys),
      fields: (step.fields || [])
        .filter((field) => field && field.key)
        .map((field) => cloneField({ ...field, builtin: false })),
    }));

  return [...mergedBuiltin, ...customSteps];
};

export { makeCustomFieldKey };
