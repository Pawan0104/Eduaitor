import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiChevronLeft,
  FiLoader,
  FiSend,
} from "react-icons/fi";
import { API } from "../config/api";
import ConfigurableFormFields, {
  buildCustomFieldsPayload,
  emptyCustomValues,
  validateConfigurableFields,
} from "../components/ConfigurableFormFields";
import { mergeRegistrationSteps } from "../lib/registrationFormDefaults";
import { INDIA_STATES, districtsForState } from "../lib/indiaLocations";

const emptyForm = () => ({
  studentName: "",
  dob: "",
  gender: "",
  bloodGroup: "",
  classId: "",
  sectionId: "",
  streamId: "",
  parentName: "",
  parentMobile: "",
  parentEmail: "",
  address: "",
  city: "",
  state: "",
  district: "",
  pincode: "",
  previousSchoolName: "",
  notes: "",
});

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

const Field = ({ label, required, children, hint }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
      {label}
      {required ? <span className="text-rose-500"> *</span> : null}
    </span>
    {children}
    {hint ? <span className="mt-1 block text-[11px] text-slate-400">{hint}</span> : null}
  </label>
);

const PublicRegistration = () => {
  const { token } = useParams();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm());
  const [formSteps, setFormSteps] = useState(() => mergeRegistrationSteps(null));
  const [customValues, setCustomValues] = useState(() =>
    emptyCustomValues(mergeRegistrationSteps(null)),
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await axios.get(`${API}/public/registration/${token}`);
        const payload = data?.data || null;
        setConfig(payload);
        const steps = mergeRegistrationSteps(payload?.formSteps);
        setFormSteps(steps);
        setCustomValues(emptyCustomValues(steps));
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "This registration link is not available.",
        );
      } finally {
        setLoading(false);
      }
    };
    if (token) load();
  }, [token]);

  const sections = useMemo(() => {
    if (!config || !form.classId) return [];
    const cls = (config.classes || []).find((item) => item._id === form.classId);
    return cls?.sections || [];
  }, [config, form.classId]);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitError("");

    const configError = validateConfigurableFields(
      formSteps,
      form,
      customValues,
    );
    if (configError) return setSubmitError(configError);
    if (String(form.parentMobile || "").replace(/\D/g, "").length !== 10)
      return setSubmitError("Please enter a valid 10-digit mobile number.");

    setSubmitting(true);
    try {
      const { data } = await axios.post(`${API}/public/registration/${token}`, {
        ...form,
        sectionId: form.sectionId || null,
        dob: form.dob || null,
        customFields: buildCustomFieldsPayload(formSteps, customValues),
      });
      setResult(data);
    } catch (err) {
      setSubmitError(
        err.response?.data?.message ||
          "Could not submit the application. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <FiLoader className="animate-spin" /> Loading registration form…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <FiAlertCircle size={28} className="mx-auto text-rose-500" />
          <h1 className="mt-3 text-lg font-bold text-slate-900">
            Link unavailable
          </h1>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
          <p className="mt-4 text-xs text-slate-400">
            Please contact the school office for a new link.
          </p>
        </div>
      </div>
    );
  }

  const school = config?.school || {};

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-5 text-white sm:px-7">
            <div className="flex items-center gap-3">
              {school.logo ? (
                <img
                  src={school.logo}
                  alt=""
                  className="h-12 w-12 rounded-xl bg-white object-contain p-1"
                />
              ) : null}
              <div>
                <h1 className="text-xl font-bold">
                  {school.name || "School admission"}
                </h1>
                <p className="text-sm text-indigo-100">
                  Registration form
                  {config?.academicYear ? ` · ${config.academicYear}` : ""}
                </p>
              </div>
            </div>
            {config?.instructions ? (
              <p className="mt-3 whitespace-pre-line text-sm text-indigo-50">
                {config.instructions}
              </p>
            ) : null}
          </div>

          {result ? (
            <div className="px-5 py-10 text-center sm:px-8">
              <FiCheckCircle size={42} className="mx-auto text-emerald-500" />
              <h2 className="mt-3 text-xl font-bold text-slate-900">
                Application received
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
                {result.message}
              </p>
              <div className="mx-auto mt-5 max-w-sm rounded-xl bg-slate-50 p-4 text-left text-sm">
                <p className="flex justify-between gap-3 py-1">
                  <span className="text-slate-500">Registration no.</span>
                  <span className="font-semibold text-slate-900">
                    {result.data?.registrationNumber || "—"}
                  </span>
                </p>
                <p className="flex justify-between gap-3 py-1">
                  <span className="text-slate-500">Student</span>
                  <span className="font-semibold text-slate-900">
                    {result.data?.studentName || form.studentName}
                  </span>
                </p>
                <p className="flex justify-between gap-3 py-1">
                  <span className="text-slate-500">Class</span>
                  <span className="font-semibold text-slate-900">
                    {result.data?.className || "—"}
                  </span>
                </p>
                {result.data?.entrance?.examName ? (
                  <>
                    <p className="flex justify-between gap-3 py-1">
                      <span className="text-slate-500">Entrance exam</span>
                      <span className="font-semibold text-slate-900">
                        {result.data.entrance.examName}
                      </span>
                    </p>
                    <p className="flex justify-between gap-3 py-1">
                      <span className="text-slate-500">Exam date</span>
                      <span className="font-semibold text-slate-900">
                        {result.data.entrance.examDate
                          ? new Date(
                              result.data.entrance.examDate,
                            ).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                        {result.data.entrance.startTime
                          ? ` · ${result.data.entrance.startTime}`
                          : ""}
                      </span>
                    </p>
                  </>
                ) : null}
              </div>
              <p className="mt-5 text-xs text-slate-400">
                Please keep the registration number for future reference.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="px-5 py-6 sm:px-7">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Application details
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ConfigurableFormFields
                  steps={formSteps}
                  values={form}
                  customValues={customValues}
                  inputClass={inputClass}
                  onChangeBuiltin={(key, value) =>
                    setForm((prev) => ({
                      ...prev,
                      [key]: value,
                      ...(key === "classId" ? { sectionId: "" } : {}),
                    }))
                  }
                  onChangeCustom={(key, value) =>
                    setCustomValues((prev) => ({ ...prev, [key]: value }))
                  }
                  renderBuiltin={{
                    classId: (field) => (
                      <Field label={field.label} required={field.required}>
                        <select
                          value={form.classId}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              classId: event.target.value,
                              sectionId: "",
                            }))
                          }
                          className={inputClass}
                        >
                          <option value="">Select class</option>
                          {(config?.classes || []).map((cls) => (
                            <option key={cls._id} value={cls._id}>
                              {cls.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    ),
                    streamId: (field) => (
                      <Field label={field.label} required={field.required}>
                        <select
                          value={form.streamId}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              streamId: event.target.value,
                            }))
                          }
                          className={inputClass}
                        >
                          <option value="">Select stream (optional)</option>
                          {(config?.streams || []).map((item) => (
                            <option key={item._id} value={item._id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    ),
                    sectionId: (field) => (
                      <Field label={field.label} required={field.required}>
                        <select
                          value={form.sectionId}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              sectionId: event.target.value,
                            }))
                          }
                          className={inputClass}
                          disabled={!sections.length}
                        >
                          <option value="">
                            {sections.length ? "Select section" : "No sections"}
                          </option>
                          {sections.map((section) => (
                            <option key={section._id} value={section._id}>
                              {section.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    ),
                    state: (field) => (
                      <Field label={field.label} required={field.required}>
                        <select
                          value={form.state}
                          onChange={(event) => {
                            const nextState = event.target.value;
                            setForm((prev) => ({
                              ...prev,
                              state: nextState,
                              district:
                                prev.state === nextState ? prev.district : "",
                            }));
                          }}
                          className={inputClass}
                        >
                          <option value="">Select state</option>
                          {INDIA_STATES.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </Field>
                    ),
                    district: (field) => (
                      <Field label={field.label} required={field.required}>
                        <select
                          value={form.district}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              district: event.target.value,
                            }))
                          }
                          className={inputClass}
                          disabled={!form.state}
                        >
                          <option value="">
                            {form.state
                              ? "Select district"
                              : "Select state first"}
                          </option>
                          {districtsForState(form.state).map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </Field>
                    ),
                  }}
                />
              </div>

              {submitError ? (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                  <FiAlertCircle className="mt-0.5 shrink-0" size={15} />
                  <span>{submitError}</span>
                </div>
              ) : null}

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-400">
                  The school office will contact you after reviewing the
                  application.
                </p>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <FiLoader className="animate-spin" size={14} /> Submitting…
                    </>
                  ) : (
                    <>
                      <FiSend size={14} /> Submit application
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <span>
            {school.phone ? `School office: ${school.phone}` : ""}
          </span>
          <span className="inline-flex items-center gap-1">
            <FiChevronLeft size={11} /> Powered by Eduaitor
          </span>
        </div>
      </div>
    </div>
  );
};

export default PublicRegistration;
