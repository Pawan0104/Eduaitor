/**
 * Default Registration / public registration form layout.
 */

import {
  ADMISSION_FIELD_TYPES,
  makeCustomFieldKey,
} from "./admissionFormDefaults";
import { DEFAULT_STATE, INDIA_STATES, districtsForState } from "./indiaLocations";

export const REGISTRATION_FIELD_TYPES = ADMISSION_FIELD_TYPES.filter(
  (type) => type.value !== "file",
);

export const REGISTRATION_LOCKED_FIELD_KEYS = new Set([
  "studentName",
  "parentName",
  "parentMobile",
  "classId",
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

export const REGISTRATION_STEPS = [
  {
    key: "student_details",
    title: "1. Student Details",
    builtin: true,
    removedFieldKeys: [],
    fields: [
      f("studentName", "Student Name", "text", true),
      f("dob", "Date of Birth", "date", true),
      f("gender", "Gender", "select", false, {
        options: ["Male", "Female", "Other"],
      }),
      f("bloodGroup", "Blood Group", "text", false),
      f("category", "Category", "select", false, {
        options: ["General", "OBC", "SC", "ST", "EWS"],
      }),
    ],
  },
  {
    key: "parent_details",
    title: "2. Parent / Guardian Details",
    builtin: true,
    removedFieldKeys: [],
    fields: [
      f("parentName", "Father's Name", "text", true),
      f("motherName", "Mother's Name", "text", false),
    ],
  },
  {
    key: "contact_info",
    title: "3. Contact Information",
    builtin: true,
    removedFieldKeys: [],
    fields: [
      f("parentMobile", "Primary Mobile", "tel", true, {
        placeholder: "10-digit mobile number",
      }),
      f("alternateMobile", "Alternate Mobile", "tel", false),
      f("parentEmail", "Email Address", "email", false),
    ],
  },
  {
    key: "academic_interest",
    title: "4. Academic Interest",
    builtin: true,
    removedFieldKeys: [],
    fields: [
      f("classId", "Class Applied", "select", true),
      f("streamId", "Stream", "select", false),
      f("previousSchoolName", "Previous School / Institution", "text", false),
    ],
  },
  {
    key: "address",
    title: "5. Residential Address",
    builtin: true,
    removedFieldKeys: [],
    fields: [
      f("address", "Street / Locality", "textarea", false),
      f("city", "City / District", "text", false),
      f("state", "State", "select", false, {
        options: INDIA_STATES,
      }),
      f("district", "District", "select", false, {
        options: districtsForState(DEFAULT_STATE),
      }),
      f("pincode", "Pin Code", "text", false),
    ],
  },
  {
    key: "additional_info",
    title: "6. Additional Information & Initial Follow-up",
    builtin: true,
    removedFieldKeys: [],
    fields: [
      f("nextFollowUpDate", "Next Follow-up Date", "date", false),
      f("notes", "Counselor Notes", "textarea", false),
    ],
  },
];

const cloneField = (field) => ({
  ...field,
  options: Array.isArray(field.options) ? [...field.options] : [],
});

/**
 * Older saved configs kept the default labels from before the address block
 * was reworked. Rename only exact legacy defaults so genuine custom labels
 * chosen by a school admin are left untouched.
 */
const LEGACY_FIELD_LABELS = {
  city: "City",
  pincode: "Pincode",
};

const normalizeRemovedKeys = (raw) => {
  if (!Array.isArray(raw)) return [];
  return [
    ...new Set(
      raw
        .map((key) => String(key || "").trim())
        .filter(Boolean)
        .filter((key) => !REGISTRATION_LOCKED_FIELD_KEYS.has(key)),
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
        label:
          LEGACY_FIELD_LABELS[field.key] === String(field.label || "").trim()
            ? defaultField.label
            : field.label,
        type: defaultField.type,
        builtin: true,
        visible: REGISTRATION_LOCKED_FIELD_KEYS.has(field.key)
          ? true
          : field.visible !== false,
      });
    }
    return cloneField({ ...field, builtin: false });
  });

  defaultByKey.forEach((field) => {
    if (removedSet.has(field.key)) return;

    // Insert newly added defaults next to their neighbouring default fields
    // (rather than always appending them) so saved configs keep the intended
    // layout, e.g. State/District between City and Pin Code.
    const defaultIndex = defaultStep.fields.findIndex(
      (item) => item.key === field.key,
    );
    let insertAt = mergedFields.length;
    for (let i = defaultIndex - 1; i >= 0; i -= 1) {
      const prevKey = defaultStep.fields[i]?.key;
      const prevIndex = mergedFields.findIndex((item) => item.key === prevKey);
      if (prevIndex !== -1) {
        insertAt = prevIndex + 1;
        break;
      }
    }
    if (insertAt === mergedFields.length) {
      for (let i = defaultIndex + 1; i < defaultStep.fields.length; i += 1) {
        const nextKey = defaultStep.fields[i]?.key;
        const nextIndex = mergedFields.findIndex((item) => item.key === nextKey);
        if (nextIndex !== -1) {
          insertAt = nextIndex;
          break;
        }
      }
    }
    mergedFields.splice(insertAt, 0, cloneField(field));
  });

  return {
    key: defaultStep.key,
    title: storedStep.title?.trim() || defaultStep.title,
    builtin: true,
    removedFieldKeys,
    fields: mergedFields,
  };
};

export const mergeRegistrationSteps = (storedSteps) => {
  if (!Array.isArray(storedSteps) || storedSteps.length === 0) {
    return REGISTRATION_STEPS.map((step) => ({
      ...step,
      removedFieldKeys: [],
      fields: step.fields.map(cloneField),
    }));
  }

  // Migrate legacy single-step configs ("reg_main") into the new segmented
  // layout so existing school customizations are preserved.
  const legacy = storedSteps.find((s) => s?.key === "reg_main");
  let workingSteps = storedSteps;
  if (legacy) {
    const fieldsByKey = new Map(
      (legacy.fields || []).map((field) => [field?.key, field]),
    );
    const migrated = REGISTRATION_STEPS.map((step) => ({
      key: step.key,
      title: step.title,
      builtin: true,
      removedFieldKeys: legacy.removedFieldKeys || [],
      fields: (legacy.fields || []).filter((field) =>
        step.fields.some((defaultField) => defaultField.key === field?.key),
      ),
    }));
    // Preserve any fields that no longer exist as defaults as a trailing custom step.
    const knownKeys = new Set(
      REGISTRATION_STEPS.flatMap((step) => step.fields.map((f) => f.key)),
    );
    const leftover = (legacy.fields || []).filter(
      (field) => field?.key && !knownKeys.has(field.key),
    );
    if (leftover.length) {
      migrated.push({
        key: "reg_legacy_extra",
        title: "Additional Details",
        builtin: false,
        removedFieldKeys: [],
        fields: leftover,
      });
    }
    workingSteps = [...migrated, ...storedSteps.filter((s) => s?.key !== "reg_main")];
  }

  const storedByKey = new Map(
    workingSteps.filter((s) => s?.key).map((s) => [s.key, s]),
  );

  const mergedBuiltin = REGISTRATION_STEPS.map((step) =>
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
