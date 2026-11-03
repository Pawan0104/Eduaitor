import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaPlus, FaTrash, FaArrowUp, FaArrowDown, FaTimes } from "react-icons/fa";
import {
  ADMISSION_FIELD_TYPES,
  LOCKED_VISIBLE_FIELD_KEYS,
  makeCustomFieldKey,
  mergeAdmissionSteps,
} from "../lib/admissionFormDefaults";

const API = import.meta.env.VITE_API_URL;

const TYPES_WITH_OPTIONS = new Set(["select", "radio"]);

const emptyCustomField = () => ({
  key: makeCustomFieldKey(),
  label: "New field",
  type: "text",
  required: false,
  visible: true,
  placeholder: "",
  help: "",
  options: [],
  builtin: false,
});

const Toggle = ({ checked, onChange, label, hint, disabled = false }) => (
  <label
    className={`flex items-start gap-2 select-none ${
      disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
    }`}
  >
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 h-4 w-4"
    />
    <span className="text-xs leading-tight">
      <span className="font-semibold">{label}</span>
      {hint ? (
        <span className="block text-[rgb(var(--text-muted))]">{hint}</span>
      ) : null}
    </span>
  </label>
);

/**
 * Shared form builder for Admission / Lead / Registration.
 *
 * `inline` renders as a page section; otherwise a full-screen modal.
 */
const AdmissionFormBuilder = ({
  inline = false,
  onClose,
  onSaved,
  initialSteps = null,
  apiPath = "/admission-form",
  mergeSteps = mergeAdmissionSteps,
  fieldTypes = ADMISSION_FIELD_TYPES,
  lockedFieldKeys = LOCKED_VISIBLE_FIELD_KEYS,
  title = "Customize Admission Form",
  description = "Add your own fields, choose which step they belong to, and mark them mandatory or optional.",
  lockedDeleteHint = "Required to create a student record",
  reviewStepKey = "builtin_8",
  allowCustomSteps = true,
}) => {
  const lockedKeys =
    lockedFieldKeys instanceof Set
      ? lockedFieldKeys
      : new Set(lockedFieldKeys || []);

  const [steps, setSteps] = useState(() => mergeSteps(initialSteps));
  const [activeKey, setActiveKey] = useState(() => {
    const merged = mergeSteps(initialSteps);
    return merged[0]?.key || "";
  });
  const [newStepTitle, setNewStepTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!initialSteps);

  // If the caller did not pass a config, load the saved one.
  useEffect(() => {
    let cancelled = false;
    if (initialSteps) return undefined;

    (async () => {
      try {
        const res = await axios.get(`${API}${apiPath}`, {
          withCredentials: true,
        });
        if (cancelled) return;
        const loaded = mergeSteps(res.data?.data?.steps);
        setSteps(loaded);
        setActiveKey(loaded[0]?.key || "");
      } catch {
        if (!cancelled) {
          const loaded = mergeSteps(null);
          setSteps(loaded);
          setActiveKey(loaded[0]?.key || "");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialSteps, apiPath, mergeSteps]);

  const activeStep = useMemo(
    () => steps.find((step) => step.key === activeKey) || steps[0],
    [steps, activeKey]
  );

  const updateStep = (key, updater) =>
    setSteps((prev) =>
      prev.map((step) => (step.key === key ? updater(step) : step))
    );

  const updateField = (stepKey, fieldKey, patch) =>
    updateStep(stepKey, (step) => ({
      ...step,
      fields: step.fields.map((field) =>
        field.key === fieldKey ? { ...field, ...patch } : field
      ),
    }));

  const addField = () => {
    if (!activeStep) return;
    const field = emptyCustomField();
    updateStep(activeStep.key, (step) => ({
      ...step,
      fields: [...step.fields, field],
    }));
  };

  const removeField = (stepKey, fieldKey) => {
    if (lockedKeys.has(fieldKey)) {
      toast.error(lockedDeleteHint);
      return;
    }
    const target = steps
      .find((step) => step.key === stepKey)
      ?.fields?.find((field) => field.key === fieldKey);
    const label = target?.label || fieldKey;
    if (
      !window.confirm(
        `Remove “${label}” from this form? You can restore defaults with Reset.`,
      )
    ) {
      return;
    }
    updateStep(stepKey, (step) => {
      const nextRemoved = [
        ...new Set([
          ...(Array.isArray(step.removedFieldKeys) ? step.removedFieldKeys : []),
          ...(target?.builtin ? [fieldKey] : []),
        ]),
      ].filter((key) => !lockedKeys.has(key));
      return {
        ...step,
        removedFieldKeys: nextRemoved,
        fields: step.fields.filter((field) => field.key !== fieldKey),
      };
    });
  };

  const moveField = (stepKey, index, direction) =>
    updateStep(stepKey, (step) => {
      const next = [...step.fields];
      const target = index + direction;
      if (target < 0 || target >= next.length) return step;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...step, fields: next };
    });

  const addStep = () => {
    if (!allowCustomSteps) return;
    const titleText = newStepTitle.trim();
    if (!titleText) return toast.error("Enter a step name first");
    const key = `cs_${Date.now().toString(36)}${Math.random()
      .toString(36)
      .slice(2, 5)}`;
    const step = {
      key,
      title: titleText,
      builtin: false,
      removedFieldKeys: [],
      fields: [],
    };
    setSteps((prev) => {
      const reviewIndex = reviewStepKey
        ? prev.findIndex((s) => s.key === reviewStepKey)
        : -1;
      if (reviewIndex === -1) return [...prev, step];
      const next = [...prev];
      next.splice(reviewIndex, 0, step);
      return next;
    });
    setActiveKey(key);
    setNewStepTitle("");
  };

  const removeStep = (key) => {
    if (!window.confirm("Delete this step and all of its fields?")) return;
    setSteps((prev) => {
      const next = prev.filter((step) => step.key !== key);
      return next;
    });
    if (activeKey === key) {
      const remaining = steps.filter((step) => step.key !== key);
      setActiveKey(remaining[0]?.key || "");
    }
  };

  const moveStep = (key, direction) => {
    setSteps((prev) => {
      const index = prev.findIndex((step) => step.key === key);
      const target = index + direction;
      // Built-in steps stay in place; only custom steps can move, and never
      // past the Review step (when present).
      if (index === -1 || prev[index].builtin) return prev;
      const reviewIndex = reviewStepKey
        ? prev.findIndex((s) => s.key === reviewStepKey)
        : prev.length;
      if (target < 0 || target >= reviewIndex || target >= prev.length) {
        return prev;
      }
      if (prev[target]?.builtin) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const save = async () => {
    try {
      setSaving(true);
      const res = await axios.put(
        `${API}${apiPath}`,
        { steps },
        { withCredentials: true }
      );
      const saved = res.data?.data?.steps || steps;
      toast.success("Form saved");
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save the form");
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (
      !window.confirm(
        "Reset this form to the default layout? Custom fields and steps will be removed."
      )
    ) {
      return;
    }
    try {
      setSaving(true);
      await axios.delete(`${API}${apiPath}`, { withCredentials: true });
      const defaults = mergeSteps(null);
      setSteps(defaults);
      setActiveKey(defaults[0]?.key || "");
      toast.success("Form reset");
      onSaved?.(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not reset the form");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 text-center text-sm text-[rgb(var(--text-muted))]">
        Loading the form…
      </div>
    );
  }

  const body = (
    <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] w-full max-w-5xl rounded-xl shadow-xl border border-[rgb(var(--border))] flex flex-col max-h-[90vh]">
      <div className="flex items-start justify-between gap-3 p-4 border-b border-[rgb(var(--border))]">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-xs text-[rgb(var(--text-muted))]">{description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={reset}
            disabled={saving}
            className="px-3 py-2 rounded-lg border text-sm font-medium disabled:opacity-50"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
              aria-label="Close"
            >
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-[240px_1fr]">
        {/* STEPS */}
        <div className="border-b md:border-b-0 md:border-r border-[rgb(var(--border))] p-3 overflow-y-auto">
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-[rgb(var(--text-muted))]">
            Steps
          </p>
          <div className="space-y-1">
            {steps.map((step, index) => (
              <div
                key={step.key}
                className={`group rounded-lg px-2 py-2 flex items-center gap-1 ${
                  step.key === activeStep?.key
                    ? "bg-indigo-50 text-indigo-700"
                    : "hover:bg-black/5"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveKey(step.key)}
                  className="flex-1 text-left text-sm truncate"
                >
                  {index + 1}. {step.title}
                  <span className="block text-[10px] font-normal text-[rgb(var(--text-muted))]">
                    {step.fields.length} field
                    {step.fields.length === 1 ? "" : "s"}
                    {step.builtin ? " · built-in" : ""}
                  </span>
                </button>
                {!step.builtin && (
                  <span className="flex flex-col text-[rgb(var(--text-muted))]">
                    <button
                      type="button"
                      onClick={() => moveStep(step.key, -1)}
                      className="hover:text-indigo-600"
                      title="Move up"
                    >
                      <FaArrowUp size={10} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStep(step.key, 1)}
                      className="hover:text-indigo-600"
                      title="Move down"
                    >
                      <FaArrowDown size={10} />
                    </button>
                  </span>
                )}
                {!step.builtin && (
                  <button
                    type="button"
                    onClick={() => removeStep(step.key)}
                    className="text-red-400 hover:text-red-600"
                    title="Delete step"
                  >
                    <FaTrash size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {allowCustomSteps && (
            <div className="mt-4 border-t border-[rgb(var(--border))] pt-3">
              <input
                value={newStepTitle}
                onChange={(e) => setNewStepTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addStep();
                  }
                }}
                placeholder="New step name"
                className="w-full border rounded-lg px-2 py-1.5 text-sm bg-[rgb(var(--surface))]"
              />
              <button
                type="button"
                onClick={addStep}
                className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed py-1.5 text-xs font-semibold hover:bg-black/5"
              >
                <FaPlus size={10} /> Add step
              </button>
            </div>
          )}
        </div>

        {/* FIELDS */}
        <div className="overflow-y-auto p-4">
          {activeStep && (
            <>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <input
                    value={activeStep.title}
                    onChange={(e) =>
                      updateStep(activeStep.key, (step) => ({
                        ...step,
                        title: e.target.value,
                      }))
                    }
                    className="w-full border rounded-lg px-2 py-1 text-base font-semibold bg-[rgb(var(--surface))]"
                    placeholder="Step name"
                  />
                  <p className="text-xs text-[rgb(var(--text-muted))] mt-1">
                    {activeStep.builtin
                      ? "Hide, rename, make optional, or delete fields. Locked fields cannot be removed."
                      : "Fields below belong to this step."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addField}
                  className="shrink-0 flex items-center gap-1.5 rounded-lg bg-indigo-600 text-white px-3 py-1.5 text-xs font-semibold"
                >
                  <FaPlus size={10} /> Add field
                </button>
              </div>

              {activeStep.fields.length === 0 && (
                <p className="text-sm text-[rgb(var(--text-muted))] border border-dashed rounded-lg p-6 text-center">
                  No fields yet. Click “Add field” to create one.
                </p>
              )}

              <div className="space-y-3">
                {activeStep.fields.map((field, index) => {
                  const isBuiltin = field.builtin;
                  return (
                    <div
                      key={field.key}
                      className="rounded-lg border border-[rgb(var(--border))] p-3"
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            value={field.label}
                            onChange={(e) =>
                              updateField(activeStep.key, field.key, {
                                label: e.target.value,
                              })
                            }
                            className="w-full border rounded-lg px-2 py-1.5 text-sm bg-[rgb(var(--surface))]"
                            placeholder="Field label"
                          />
                          <select
                            value={field.type}
                            disabled={isBuiltin}
                            onChange={(e) =>
                              updateField(activeStep.key, field.key, {
                                type: e.target.value,
                              })
                            }
                            className="w-full border rounded-lg px-2 py-1.5 text-sm bg-[rgb(var(--surface))] disabled:opacity-60"
                            title={
                              isBuiltin
                                ? "Built-in fields keep their original input type."
                                : "Field type"
                            }
                          >
                            {fieldTypes.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col items-center gap-1 pt-1 text-[rgb(var(--text-muted))]">
                          <button
                            type="button"
                            onClick={() => moveField(activeStep.key, index, -1)}
                            disabled={index === 0}
                            className="hover:text-indigo-600 disabled:opacity-30"
                            title="Move up"
                          >
                            <FaArrowUp size={10} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveField(activeStep.key, index, 1)}
                            disabled={index === activeStep.fields.length - 1}
                            className="hover:text-indigo-600 disabled:opacity-30"
                            title="Move down"
                          >
                            <FaArrowDown size={10} />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeField(activeStep.key, field.key)}
                          disabled={lockedKeys.has(field.key)}
                          className="pt-1.5 text-red-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-red-400"
                          title={
                            lockedKeys.has(field.key)
                              ? lockedDeleteHint
                              : "Delete field"
                          }
                        >
                          <FaTrash size={11} />
                        </button>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-4">
                        <Toggle
                          checked={field.visible !== false}
                          disabled={lockedKeys.has(field.key)}
                          onChange={(value) =>
                            updateField(activeStep.key, field.key, {
                              visible: value,
                            })
                          }
                          label="Show this field"
                          hint={
                            lockedKeys.has(field.key)
                              ? lockedDeleteHint
                              : undefined
                          }
                        />
                        <Toggle
                          checked={Boolean(field.required)}
                          onChange={(value) =>
                            updateField(activeStep.key, field.key, {
                              required: value,
                            })
                          }
                          label="Mandatory"
                          hint="Must be filled to continue."
                        />
                        <span className="text-[10px] uppercase tracking-wide text-[rgb(var(--text-muted))] self-center">
                          key: {field.key}
                        </span>
                      </div>

                      {!isBuiltin && (
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            value={field.placeholder || ""}
                            onChange={(e) =>
                              updateField(activeStep.key, field.key, {
                                placeholder: e.target.value,
                              })
                            }
                            className="w-full border rounded-lg px-2 py-1.5 text-xs bg-[rgb(var(--surface))]"
                            placeholder="Placeholder (optional)"
                          />
                          <input
                            value={field.help || ""}
                            onChange={(e) =>
                              updateField(activeStep.key, field.key, {
                                help: e.target.value,
                              })
                            }
                            className="w-full border rounded-lg px-2 py-1.5 text-xs bg-[rgb(var(--surface))]"
                            placeholder="Helper text (optional)"
                          />
                          {TYPES_WITH_OPTIONS.has(field.type) && (
                            <div className="sm:col-span-2">
                              <textarea
                                rows={3}
                                value={(field.options || []).join("\n")}
                                onChange={(e) =>
                                  updateField(activeStep.key, field.key, {
                                    options: e.target.value
                                      .split("\n")
                                      .map((option) => option.trim())
                                      .filter(Boolean),
                                  })
                                }
                                className="w-full border rounded-lg px-2 py-1.5 text-xs bg-[rgb(var(--surface))]"
                                placeholder="One option per line"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (inline) return body;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3">
      {body}
    </div>
  );
};

export default AdmissionFormBuilder;
