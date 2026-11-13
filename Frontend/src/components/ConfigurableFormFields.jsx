/**
 * Renders fields from a school form-builder config.
 * Built-in keys map into `values`; custom (cf_*) keys map into `customValues`.
 */
const DEFAULT_INPUT =
  "w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2.5 text-sm text-[rgb(var(--text))] outline-none transition focus:border-[rgb(var(--primary))]";

export const isCustomFieldKey = (key) => String(key || "").startsWith("cf_");

export const visibleFieldsFromSteps = (steps = []) =>
  (steps || []).flatMap((step) =>
    (step.fields || []).filter((field) => field && field.visible !== false),
  );

export const emptyCustomValues = (steps = []) => {
  const values = {};
  visibleFieldsFromSteps(steps)
    .filter((field) => isCustomFieldKey(field.key))
    .forEach((field) => {
      values[field.key] = field.type === "checkbox" ? false : "";
    });
  return values;
};

export const buildCustomFieldsPayload = (steps = [], customValues = {}) =>
  visibleFieldsFromSteps(steps)
    .filter((field) => isCustomFieldKey(field.key))
    .map((field) => {
      const raw = customValues?.[field.key];
      let value = "";
      if (field.type === "checkbox") value = raw ? "true" : "false";
      else if (raw === null || raw === undefined) value = "";
      else value = String(raw);
      return {
        key: field.key,
        label: field.label || field.key,
        type: field.type || "text",
        value,
      };
    });

export const hydrateCustomValues = (steps = [], customFields = []) => {
  const values = emptyCustomValues(steps);
  const byKey = new Map(
    (customFields || [])
      .filter((field) => field?.key)
      .map((field) => [field.key, field]),
  );
  Object.keys(values).forEach((key) => {
    const saved = byKey.get(key);
    if (!saved) return;
    if (typeof values[key] === "boolean") {
      values[key] = saved.value === true || saved.value === "true";
    } else {
      values[key] = saved.value ?? "";
    }
  });
  return values;
};

export const validateConfigurableFields = (
  steps = [],
  values = {},
  customValues = {},
) => {
  for (const field of visibleFieldsFromSteps(steps)) {
    if (!field.required) continue;
    if (field.type === "checkbox") continue;
    const raw = isCustomFieldKey(field.key)
      ? customValues?.[field.key]
      : values?.[field.key];
    if (raw === null || raw === undefined || String(raw).trim() === "") {
      return `${field.label || field.key} is required`;
    }
  }
  return null;
};

const FieldShell = ({ field, children, className = "" }) => (
  <label className={`flex flex-col gap-2 text-sm font-medium ${className}`}>
    <span>
      {field.label}
      {field.required ? " *" : ""}
    </span>
    {children}
    {field.help ? (
      <span className="text-[11px] font-normal text-[rgb(var(--text-muted))]">
        {field.help}
      </span>
    ) : null}
  </label>
);

const renderField = (field, { values, customValues, onChangeBuiltin, onChangeCustom, renderBuiltin, inputClass }) => {
  if (typeof renderBuiltin[field.key] === "function") {
    return (
      <div key={field.key} className="contents">
        {renderBuiltin[field.key](field)}
      </div>
    );
  }

  const isCustom = isCustomFieldKey(field.key);
  const value = isCustom ? customValues?.[field.key] : values?.[field.key];
  const setValue = (next) =>
    isCustom
      ? onChangeCustom?.(field.key, next)
      : onChangeBuiltin?.(field.key, next);

  if (field.type === "textarea") {
    return (
      <FieldShell key={field.key} field={field} className="md:col-span-2">
        <textarea
          rows={3}
          value={value ?? ""}
          placeholder={field.placeholder || ""}
          onChange={(e) => setValue(e.target.value)}
          className={inputClass}
        />
      </FieldShell>
    );
  }

  if (field.type === "select") {
    return (
      <FieldShell key={field.key} field={field}>
        <select
          value={value ?? ""}
          onChange={(e) => setValue(e.target.value)}
          className={inputClass}
        >
          <option value="">Select</option>
          {(field.options || []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </FieldShell>
    );
  }

  if (field.type === "radio") {
    return (
      <FieldShell key={field.key} field={field} className="md:col-span-2">
        <div className="flex flex-wrap gap-4">
          {(field.options || []).map((option) => (
            <label
              key={option}
              className="flex items-center gap-2 text-sm font-normal"
            >
              <input
                type="radio"
                name={`cfg-${field.key}`}
                checked={value === option}
                onChange={() => setValue(option)}
              />
              {option}
            </label>
          ))}
        </div>
      </FieldShell>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label
        key={field.key}
        className="flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] px-3 py-2.5 text-sm font-medium md:col-span-2"
      >
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => setValue(e.target.checked)}
        />
        {field.label}
        {field.required ? " *" : ""}
      </label>
    );
  }

  return (
    <FieldShell key={field.key} field={field}>
      <input
        type={
          ["number", "date", "email", "tel"].includes(field.type)
            ? field.type
            : "text"
        }
        value={value ?? ""}
        placeholder={field.placeholder || ""}
        onChange={(e) => setValue(e.target.value)}
        className={inputClass}
      />
    </FieldShell>
  );
};

/**
 * @param {object} props
 * @param {Array} props.steps
 * @param {object} props.values
 * @param {object} props.customValues
 * @param {(key:string, value:any)=>void} props.onChangeBuiltin
 * @param {(key:string, value:any)=>void} props.onChangeCustom
 * @param {Record<string, function>} [props.renderBuiltin]
 * @param {string[]} [props.excludeKeys]
 * @param {string} [props.inputClass]
 */
const ConfigurableFormFields = ({
  steps = [],
  values = {},
  customValues = {},
  onChangeBuiltin,
  onChangeCustom,
  renderBuiltin = {},
  excludeKeys = [],
  inputClass = DEFAULT_INPUT,
}) => {
  const excluded = new Set(excludeKeys);
  const ctx = { values, customValues, onChangeBuiltin, onChangeCustom, renderBuiltin, inputClass };

  const elements = [];

  (steps || []).forEach((step, stepIndex) => {
    const stepFields = (step?.fields || []).filter(
      (field) => field && field.visible !== false && !excluded.has(field.key),
    );
    if (stepFields.length === 0 && !step?.title) return;

    const title = String(step?.title || "").replace(/^\d+\.\s*/, "").trim();

    elements.push(
      <div
        key={`section-${step.key || stepIndex}`}
        className="col-span-full rounded-xl border border-slate-200 bg-slate-50/30 p-4"
      >
        {title ? (
          <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[11px] text-blue-700">
              {stepIndex + 1}
            </span>
            {title}
          </h4>
        ) : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {stepFields.map((field) => renderField(field, ctx))}
        </div>
      </div>,
    );
  });

  return elements;
};

export default ConfigurableFormFields;