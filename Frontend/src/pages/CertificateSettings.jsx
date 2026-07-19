import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FaArrowLeft, FaRedo, FaSave, FaUpload, FaTrash } from "react-icons/fa";
import CertificatePreview from "./CertificatePreview";
import { IdCardVisual } from "./IdCard";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

const TYPES = [
  { id: "transfer", label: "Transfer Certificate", kind: "certificate" },
  { id: "character", label: "Character Certificate", kind: "certificate" },
  { id: "id_card", label: "ID Card", kind: "id_card" },
  { id: "report_card", label: "Report Card", kind: "report_card" },
];

const EMPTY = {
  title: "",
  subtitle: "",
  bodyTemplate: "",
  footerText: "",
  signatoryName: "Principal",
  signatoryDesignation: "Principal",
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

export default function CertificateSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialType = TYPES.some((t) => t.id === searchParams.get("type"))
    ? searchParams.get("type")
    : "transfer";
  const [type, setType] = useState(initialType);
  const [form, setForm] = useState(EMPTY);
  const [placeholders, setPlaceholders] = useState([]);
  const [presets, setPresets] = useState([]);
  const [activePreset, setActivePreset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const school = {
    name: user?.school_name || user?.name || "Your School Name",
    address: user?.address || "",
    logo: user?.school_logo || "",
  };
  const fileRef = useRef(null);

  const kind = TYPES.find((t) => t.id === type)?.kind || "certificate";

  const load = async (t = type) => {
    try {
      setLoading(true);
      const [metaRes, tplRes] = await Promise.all([
        axios.get(`${API}/certificates/meta`, { withCredentials: true }),
        axios.get(`${API}/certificates/templates/${t}`, {
          withCredentials: true,
        }),
      ]);
      setPlaceholders(metaRes.data.placeholders || []);
      setPresets(metaRes.data.presets || []);
      setForm({ ...EMPTY, ...(tplRes.data.template || {}) });
      setActivePreset(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load template");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(type);
    setSearchParams({ type }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const insertPlaceholder = (key) => {
    const token = `{{${key}}}`;
    setForm((f) => ({
      ...f,
      bodyTemplate: `${f.bodyTemplate || ""}${
        f.bodyTemplate?.endsWith(" ") || !f.bodyTemplate ? "" : " "
      }${token}`,
    }));
  };

  const save = async () => {
    try {
      setSaving(true);
      await axios.put(`${API}/certificates/templates/${type}`, form, {
        withCredentials: true,
      });
      toast.success("Design saved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!window.confirm("Reset this template to the default design?")) return;
    try {
      setSaving(true);
      const { data } = await axios.post(
        `${API}/certificates/templates/${type}/reset`,
        {},
        { withCredentials: true },
      );
      setForm({ ...EMPTY, ...(data.template || {}) });
      setActivePreset(null);
      toast.success("Reset to default");
    } catch (err) {
      toast.error(err.response?.data?.message || "Reset failed");
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = async (presetId) => {
    try {
      setSaving(true);
      const { data } = await axios.post(
        `${API}/certificates/templates/${type}/apply-preset`,
        { presetId },
        { withCredentials: true },
      );
      setForm({ ...EMPTY, ...(data.template || {}) });
      setActivePreset(presetId);
      toast.success("Template applied — you can still tweak colors & text");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to apply template");
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file) => {
    if (!file) return;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("logo", file);
      const { data } = await axios.post(
        `${API}/certificates/templates/${type}/logo`,
        fd,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      setForm({ ...EMPTY, ...(data.template || {}) });
      toast.success("Logo uploaded");
    } catch (err) {
      toast.error(err.response?.data?.message || "Logo upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const clearLogo = async () => {
    try {
      setUploading(true);
      const { data } = await axios.delete(
        `${API}/certificates/templates/${type}/logo`,
        { withCredentials: true },
      );
      setForm({ ...EMPTY, ...(data.template || {}) });
      toast.success("Custom logo cleared");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to clear logo");
    } finally {
      setUploading(false);
    }
  };

  const previewSchool = useMemo(
    () => ({
      ...school,
      logo: form.logoUrl || school.logo || "",
    }),
    [school, form.logoUrl],
  );

  const previewCert = useMemo(() => {
    let body = form.bodyTemplate || "";
    const sample = {
      studentName: "Aarav Sharma",
      studentId: "STU001",
      fatherName: "Rakesh Sharma",
      motherName: "Neha Sharma",
      dob: "12 Jan 2012",
      className: "Class 8",
      sectionName: " (A)",
      rollNo: "12",
      admissionDate: "01 Apr 2020",
      leavingDate: "19 Jul 2026",
      issueDate: "19 Jul 2026",
      reason: "Parent's request",
      conduct: "Good",
      remarks: "",
      schoolName: previewSchool?.name || "Your School",
      schoolAddress: previewSchool?.address || "",
      certificateNo: "TC-SAMPLE-2026",
    };
    for (const [k, v] of Object.entries(sample)) {
      body = body.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, "gi"), v);
    }
    body = body.replace(/\{\{\s*[\w.]+\s*\}\}/g, "—");
    return {
      template: form,
      school: previewSchool,
      bodyText: body,
      vars: sample,
    };
  }, [form, previewSchool]);

  const samplePerson = {
    name: "Aarav Sharma",
    idNumber: "STU001",
    photo: "",
    roleLabel: "Student",
    className: "Class 8",
    sectionName: "A",
    rollNo: "12",
    bloodGroup: "B+",
    dob: "2012-01-12",
    fatherName: "Rakesh Sharma",
    address: previewSchool.address || "City, State",
    house: "Blue",
    issuedAt: new Date().toISOString(),
    validSession: new Date().getFullYear(),
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))]"
          >
            <FaArrowLeft />
          </button>
          <div>
            <h1 className="text-xl font-black text-[rgb(var(--text))]">
              Document Designs
            </h1>
            <p className="text-sm text-[rgb(var(--text-muted))]">
              Customize logo, text, colors, background, and border for
              certificates, ID cards, and report cards
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reset}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] px-4 py-2.5 text-sm font-bold"
          >
            <FaRedo size={12} /> Reset default
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[rgb(var(--primary))] px-4 py-2.5 text-sm font-bold text-white"
          >
            <FaSave size={12} /> {saving ? "Saving…" : "Save design"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-1">
        {TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setType(t.id)}
            className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
              type === t.id
                ? "bg-[rgb(var(--primary))] text-white"
                : "text-[rgb(var(--text))]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!loading && presets.length > 0 && (
        <div className="space-y-2">
          <div>
            <p className="text-sm font-bold text-[rgb(var(--text))]">
              Predefined templates
            </p>
            <p className="text-xs text-[rgb(var(--text-muted))]">
              Pick a ready-made look for this document — your uploaded logo is
              kept
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {presets.map((p) => {
              const v = p.visual || {};
              const selected = activePreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={saving}
                  onClick={() => applyPreset(p.id)}
                  className={`rounded-2xl border p-3 text-left transition hover:shadow-md ${
                    selected
                      ? "border-[rgb(var(--primary))] ring-2 ring-[rgba(var(--primary),0.25)]"
                      : "border-[rgb(var(--border))] bg-[rgb(var(--surface))]"
                  }`}
                >
                  <div
                    className="mb-2 h-12 rounded-xl border overflow-hidden"
                    style={{
                      background: v.backgroundColor || "#fff",
                      borderColor: v.borderColor || v.primaryColor || "#ccc",
                    }}
                  >
                    <div
                      className="h-4"
                      style={{ background: v.primaryColor || "#334155" }}
                    />
                    <div className="flex items-center gap-1.5 px-2 pt-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: v.accentColor || "#94a3b8" }}
                      />
                      <span
                        className="h-1.5 flex-1 rounded-full"
                        style={{ background: v.textColor || "#0f172a", opacity: 0.35 }}
                      />
                    </div>
                  </div>
                  <p className="text-sm font-bold text-[rgb(var(--text))]">
                    {p.name}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-[rgb(var(--text-muted))]">
                    {p.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[rgb(var(--text-muted))]">Loading…</p>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_1.05fr]">
          <div className="space-y-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 sm:p-5">
            <Field label="Title">
              <input
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                className="input"
                placeholder={
                  kind === "id_card"
                    ? "Student Identity Card"
                    : kind === "report_card"
                      ? "PROGRESS REPORT"
                      : "Certificate title"
                }
              />
            </Field>
            <Field
              label={
                kind === "id_card"
                  ? "Staff card title (subtitle field)"
                  : "Subtitle"
              }
            >
              <input
                value={form.subtitle}
                onChange={(e) => setField("subtitle", e.target.value)}
                className="input"
              />
            </Field>

            {kind === "certificate" && (
              <>
                <Field label="Body text (use placeholders below)">
                  <textarea
                    value={form.bodyTemplate}
                    onChange={(e) => setField("bodyTemplate", e.target.value)}
                    rows={12}
                    className="input font-mono text-[12.5px] leading-relaxed"
                  />
                </Field>
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[rgb(var(--text-muted))]">
                    Insert placeholder
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {placeholders.map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        title={p.label}
                        onClick={() => insertPlaceholder(p.key)}
                        className="rounded-lg border border-[rgb(var(--border))] px-2 py-1 text-[11px] font-semibold hover:bg-[rgba(var(--primary),0.08)]"
                      >
                        {`{{${p.key}}}`}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Field label="Footer note">
              <textarea
                value={form.footerText}
                onChange={(e) => setField("footerText", e.target.value)}
                rows={2}
                className="input"
              />
            </Field>

            {kind !== "id_card" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Signatory name">
                  <input
                    value={form.signatoryName}
                    onChange={(e) => setField("signatoryName", e.target.value)}
                    className="input"
                  />
                </Field>
                <Field label="Designation">
                  <input
                    value={form.signatoryDesignation}
                    onChange={(e) =>
                      setField("signatoryDesignation", e.target.value)
                    }
                    className="input"
                  />
                </Field>
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[rgb(var(--text-muted))]">
                Logo
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {(form.logoUrl || school.logo) && form.showLogo !== false ? (
                  <img
                    src={form.logoUrl || school.logo}
                    alt=""
                    className="h-14 w-14 rounded-lg border border-[rgb(var(--border))] object-contain bg-white"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-[rgb(var(--border))] text-[10px] text-[rgb(var(--text-muted))]">
                    No logo
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => uploadLogo(e.target.files?.[0])}
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-sm font-bold"
                >
                  <FaUpload size={12} />
                  {uploading ? "Uploading…" : "Upload logo"}
                </button>
                {form.logoUrl ? (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={clearLogo}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-3 py-2 text-sm font-bold text-red-600"
                  >
                    <FaTrash size={12} /> Use school logo
                  </button>
                ) : null}
              </div>
              <p className="mt-1.5 text-[11px] text-[rgb(var(--text-muted))]">
                Custom logo overrides the school profile logo on this document
                only.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Primary color">
                <input
                  type="color"
                  value={form.primaryColor || "#1e3a5f"}
                  onChange={(e) => setField("primaryColor", e.target.value)}
                  className="h-10 w-full cursor-pointer rounded-lg border border-[rgb(var(--border))] bg-transparent"
                />
              </Field>
              <Field label="Accent color">
                <input
                  type="color"
                  value={form.accentColor || "#c9a227"}
                  onChange={(e) => setField("accentColor", e.target.value)}
                  className="h-10 w-full cursor-pointer rounded-lg border border-[rgb(var(--border))] bg-transparent"
                />
              </Field>
              <Field label="Background">
                <input
                  type="color"
                  value={form.backgroundColor || "#ffffff"}
                  onChange={(e) => setField("backgroundColor", e.target.value)}
                  className="h-10 w-full cursor-pointer rounded-lg border border-[rgb(var(--border))] bg-transparent"
                />
              </Field>
              <Field label="Border color">
                <input
                  type="color"
                  value={
                    form.borderColor || form.primaryColor || "#1e3a5f"
                  }
                  onChange={(e) => setField("borderColor", e.target.value)}
                  className="h-10 w-full cursor-pointer rounded-lg border border-[rgb(var(--border))] bg-transparent"
                />
              </Field>
              <Field label="Text color">
                <input
                  type="color"
                  value={form.textColor || "#0f172a"}
                  onChange={(e) => setField("textColor", e.target.value)}
                  className="h-10 w-full cursor-pointer rounded-lg border border-[rgb(var(--border))] bg-transparent"
                />
              </Field>
              <Field label="Border style">
                <select
                  value={form.borderStyle}
                  onChange={(e) => setField("borderStyle", e.target.value)}
                  className="input"
                >
                  <option value="classic">Classic double</option>
                  <option value="modern">Modern thick</option>
                  <option value="minimal">Minimal</option>
                </select>
              </Field>
            </div>

            <div className="flex flex-wrap gap-4 text-sm font-semibold">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!form.showLogo}
                  onChange={(e) => setField("showLogo", e.target.checked)}
                />
                Show logo
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!form.showBorder}
                  onChange={(e) => setField("showBorder", e.target.checked)}
                />
                Show border
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-bold text-[rgb(var(--text))]">
              Live preview
            </p>
            <div className="overflow-auto rounded-2xl border border-[rgb(var(--border))] bg-slate-100 p-3">
              {kind === "certificate" && (
                <div className="origin-top scale-[0.72] sm:scale-90">
                  <CertificatePreview certificate={previewCert} />
                </div>
              )}
              {kind === "id_card" && (
                <div className="flex justify-center py-4">
                  <IdCardVisual
                    school={previewSchool}
                    person={samplePerson}
                    type="student"
                    design={form}
                  />
                </div>
              )}
              {kind === "report_card" && (
                <ReportCardDesignPreview
                  school={previewSchool}
                  design={form}
                />
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgb(var(--border));
          background: rgb(var(--bg));
          color: rgb(var(--text));
          padding: 0.65rem 0.85rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input:focus {
          border-color: rgba(var(--primary), 0.55);
          box-shadow: 0 0 0 3px rgba(var(--primary), 0.12);
        }
      `}</style>
    </div>
  );
}

function ReportCardDesignPreview({ school, design }) {
  const primary = design?.primaryColor || "#1e3a5f";
  const accent = design?.accentColor || "#4f46e5";
  const bg = design?.backgroundColor || "#ffffff";
  const border = design?.borderColor || primary;
  const text = design?.textColor || "#0f172a";
  const logo = design?.logoUrl || school?.logo;

  return (
    <div
      className="mx-auto max-w-md rounded-xl p-5 shadow-sm"
      style={{
        background: bg,
        color: text,
        border:
          design?.showBorder === false
            ? "none"
            : design?.borderStyle === "classic"
              ? `6px double ${border}`
              : design?.borderStyle === "modern"
                ? `3px solid ${border}`
                : `1px solid ${border}`,
      }}
    >
      <div className="text-center border-b pb-3 mb-3" style={{ borderColor: `${accent}55` }}>
        {design?.showLogo !== false && logo ? (
          <img src={logo} alt="" className="h-12 mx-auto mb-2 object-contain" />
        ) : null}
        <h3 className="font-black text-base" style={{ color: primary }}>
          {school?.name || "School"}
        </h3>
        <p className="text-[10px] opacity-70">{school?.address}</p>
        <p
          className="mt-2 text-xs font-bold uppercase tracking-widest"
          style={{ color: accent }}
        >
          {design?.title || "PROGRESS REPORT"}
        </p>
        {design?.subtitle ? (
          <p className="text-[11px] italic opacity-80 mt-0.5">{design.subtitle}</p>
        ) : null}
      </div>
      <p className="text-xs font-semibold mb-2">Sample student · Class 8-A</p>
      <div className="rounded border text-[11px] overflow-hidden" style={{ borderColor: `${border}66` }}>
        <div className="grid grid-cols-3 font-bold px-2 py-1.5" style={{ background: `${primary}12` }}>
          <span>Subject</span>
          <span className="text-center">Marks</span>
          <span className="text-center">Grade</span>
        </div>
        <div className="grid grid-cols-3 px-2 py-1.5 border-t" style={{ borderColor: `${border}33` }}>
          <span>Math</span>
          <span className="text-center">88/100</span>
          <span className="text-center font-bold">A</span>
        </div>
      </div>
      {design?.footerText ? (
        <p className="mt-3 text-[10px] opacity-60 text-center">{design.footerText}</p>
      ) : null}
      <div className="mt-4 grid grid-cols-2 gap-4 text-[10px] opacity-70 text-center">
        <div className="border-t pt-1" style={{ borderColor: `${text}44` }}>
          Class Teacher
        </div>
        <div className="border-t pt-1" style={{ borderColor: `${text}44` }}>
          {design?.signatoryDesignation || "Principal"}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold uppercase tracking-wide text-[rgb(var(--text-muted))]">
        {label}
      </span>
      {children}
    </label>
  );
}
