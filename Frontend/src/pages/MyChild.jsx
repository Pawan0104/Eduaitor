import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";

const API = import.meta.env.VITE_API_URL;

/* ─────────────────────────────────────────────
   DOCUMENT CONFIG
───────────────────────────────────────────── */
const DOCUMENT_FIELDS = [
  {
    key: "studentPhoto",
    label: "Student Photo",
    category: "photos",
    icon: "👤",
    accept: "image/*",
    hint: "JPG / PNG",
  },
  {
    key: "fatherPhoto",
    label: "Father Photo",
    category: "photos",
    icon: "👨",
    accept: "image/*",
    hint: "JPG / PNG",
  },
  {
    key: "motherPhoto",
    label: "Mother Photo",
    category: "photos",
    icon: "👩",
    accept: "image/*",
    hint: "JPG / PNG",
  },
  {
    key: "guardianPhoto",
    label: "Guardian Photo",
    category: "photos",
    icon: "🧑",
    accept: "image/*",
    hint: "JPG / PNG",
  },
  {
    key: "studentAadhar",
    label: "Student Aadhar",
    category: "ids",
    icon: "🪪",
    accept: "image/*,application/pdf",
    hint: "Image / PDF",
  },
  {
    key: "fatherAadhar",
    label: "Father Aadhar",
    category: "ids",
    icon: "🪪",
    accept: "image/*,application/pdf",
    hint: "Image / PDF",
  },
  {
    key: "motherAadhar",
    label: "Mother Aadhar",
    category: "ids",
    icon: "🪪",
    accept: "image/*,application/pdf",
    hint: "Image / PDF",
  },
  {
    key: "birthCertificate",
    label: "Birth Certificate",
    category: "certificates",
    icon: "📄",
    accept: "image/*,application/pdf",
    hint: "Image / PDF",
  },
  {
    key: "transferCertificate",
    label: "Transfer Certificate",
    category: "certificates",
    icon: "📋",
    accept: "image/*,application/pdf",
    hint: "Image / PDF",
  },
];

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const fmt = (val) => val || "—";

const age = (dob) => {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—";

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */

/* Info row */
const InfoRow = ({ label, value }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] font-semibold uppercase tracking-widest text-[rgb(var(--text))]">
      {label}
    </span>
    <span className="text-sm font-medium text-[rgb(var(--text))]">{fmt(value)}</span>
  </div>
);

/* Section card */
const Card = ({ title, accent = "#6366f1", children }) => (
  <div className="bg-[rgb(var(--surface))] rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
    <div
      className="px-5 py-3 flex items-center gap-2"
      style={{ borderLeft: `4px solid ${accent}` }}
    >
      <h3 className="text-xs font-bold uppercase tracking-widest text-[rgb(var(--text))]">
        {title}
      </h3>
    </div>
    <div className="px-5 pb-5 pt-2">{children}</div>
  </div>
);

/* Document tile */
const DocTile = ({ field, doc, onUpload, uploading }) => {
  const fileRef = useRef();
  const hasDoc = !!doc?.url;
  const isPdf = doc?.type === "application/pdf" || doc?.url?.endsWith(".pdf");

  return (
    <div
      className={`relative rounded-xl border-2 transition-all duration-200 overflow-hidden
        ${hasDoc ? "border-emerald-200 " : "border-dashed border-slate-200"}`}
    >
      {/* Top row */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-1">
        <span className="text-xl">{field.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[rgb(var(--text))] truncate">
            {field.label}
          </p>
          <p className="text-[10px] text-[rgb(var(--text))]">{field.hint}</p>
        </div>
        {hasDoc && (
          <span className="shrink-0 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path
                d="M1 4l2 2 4-4"
                stroke="#fff"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}
      </div>

      {/* Preview / placeholder */}
      <div className="px-3 pb-3">
        {hasDoc ? (
          <div className="mt-1">
            {isPdf ? (
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-[11px] text-indigo-600 font-medium hover:underline"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                View PDF
              </a>
            ) : (
              <a href={doc.url} target="_blank" rel="noreferrer">
                <img
                  src={doc.url}
                  alt={field.label}
                  className="w-full h-30 object-cover rounded-lg border border-slate-200"
                />
              </a>
            )}
          </div>
        ) : (
          <div className="mt-1 text-center py-2">
            <p className="text-[10px] text-[rgb(var(--text))] mb-2">Not uploaded</p>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading === field.key}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading === field.key ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Upload
                </>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept={field.accept}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(field.key, file);
                e.target.value = "";
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

/* Badge */
const Badge = ({ children, color = "indigo" }) => {
  const map = {
    indigo: "bg-indigo-100 text-indigo-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${map[color]}`}
    >
      {children}
    </span>
  );
};

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
const MyChild = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const studentId = user?.student_id;

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null); // field key being uploaded
  const [activeTab, setActiveTab] = useState("profile");

  /* ── Fetch student ── */
  const fetchStudent = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API}/students/${studentId}`, {
        withCredentials: true,
      });
      if (data.success) setStudent(data.data);
      else toast.error("Failed to load student data");
    } catch {
      toast.error("Error fetching student details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studentId) fetchStudent();
  }, [studentId]);

  /* ── Upload document ── */
  const handleUpload = async (fieldKey, file) => {
    // Guard: don't allow re-upload if already present
    if (student?.documents?.[fieldKey]?.url) {
      toast.warning(
        "Document already uploaded. Contact school admin to remove it.",
      );
      return;
    }

    setUploading(fieldKey);
    try {
      const formData = new FormData();
      formData.append(fieldKey, file);

      const { data } = await axios.put(
        `${API}/students/${studentId}`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      if (data.success) {
        toast.success(
          `${fieldKey.replace(/([A-Z])/g, " $1")} uploaded successfully`,
        );
        setStudent(data.data);
      } else {
        toast.error(data.message || "Upload failed");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  /* ── Stats ── */
  const totalDocs = DOCUMENT_FIELDS.length;
  const uploadedDocs = DOCUMENT_FIELDS.filter(
    (f) => !!student?.documents?.[f.key]?.url,
  ).length;
  const docPercent = Math.round((uploadedDocs / totalDocs) * 100);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm text-[rgb(var(--text))] font-medium">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-5xl mb-3">🎒</p>
          <p className="text-slate-600 font-semibold">No student data found.</p>
          <p className="text-[rgb(var(--text))] text-sm mt-1">
            Please contact your school admin.
          </p>
        </div>
      </div>
    );
  }

  const s = student;
  const docs = s.documents || {};

  /* ─── TABS ─── */
  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "parents", label: "Family" },
    { id: "documents", label: `Documents (${uploadedDocs}/${totalDocs})` },
    { id: "fees", label: "Fees" },
  ];

  return (
    <div className="min-h-screen text-[rgb(var(--text))] ">
      {/* ── HERO HEADER ── */}
      <div className="bg-[rgb(var(--surface))] border-b border-slate-100 px-4 pt-6 pb-0">
        <div className="sm:px-5 mx-auto">
          {/* Avatar + name row */}
          <div className="flex items-end gap-4 pb-4">
            <div className="relative shrink-0">
              {docs.studentPhoto?.url ? (
                <img
                  src={docs.studentPhoto.url}
                  alt="Student"
                  className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-md border-4 border-white">
                  <span className="text-3xl font-bold">
                    {s.firstName?.[0]?.toUpperCase()}
                  </span>
                </div>
              )}
              {/* Online dot */}
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-[rgb(var(--primary))] rounded-full border-2 border-white" />
            </div>

            <div className="flex-1 min-w-0 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-[rgb(var(--text))] truncate">
                  {s.firstName} {s.lastName}
                </h1>
                <Badge color="indigo">{s.studentId}</Badge>
                <button
                  type="button"
                  onClick={() => navigate("/parent/id-card")}
                  className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-600 text-white"
                >
                  Download ID Card
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {s.classId?.name && (
                  <Badge color="slate">
                    Class {s.classId.name}
                    {s.sectionId?.name && ` – ${s.sectionId.name}`}
                  </Badge>
                )}
                {s.rollNo && <Badge color="amber">Roll #{s.rollNo}</Badge>}
                {s.gender && (
                  <Badge color={s.gender === "Male" ? "indigo" : "rose"}>
                    {s.gender}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 border-t border-slate-100 -mx-4">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors relative
                  ${activeTab === t.id ? "text-[rgb(var(--primary))]" : "text-[rgb(var(--text))] "}`}
              >
                {t.label}
                {activeTab === t.id && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-[rgb(var(--primary))]" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="sm:px-5 mx-auto px-4 py-5 space-y-4">
        {/* ══ PROFILE TAB ══ */}
        {activeTab === "profile" && (
          <>
            <Card title="Personal Information">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <InfoRow label="First Name" value={s.firstName} />
                <InfoRow label="Last Name" value={s.lastName} />
                <InfoRow
                  label="Date of Birth"
                  value={s.dob ? `${fmtDate(s.dob)} (${age(s.dob)} yrs)` : null}
                />
                <InfoRow label="Blood Group" value={s.bloodGroup} />
                <InfoRow label="Gender" value={s.gender} />
                <InfoRow
                  label="Admission Date"
                  value={fmtDate(s.admissionDate)}
                />
                <InfoRow label="Student Type" value={s.studentType} />
                <InfoRow label="Username" value={s.username} />
              </div>
            </Card>

            <Card title="Academic Info" accent="#10b981">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <InfoRow
                  label="Class"
                  value={s.classId?.name || s.classId?.className}
                />
                <InfoRow
                  label="Section"
                  value={s.sectionId?.name || s.sectionId?.sectionName}
                />
                <InfoRow label="Roll Number" value={s.rollNo} />
                <InfoRow label="Student ID" value={s.studentId} />
              </div>
            </Card>

            <Card title="Address" accent="#f59e0b">
              <p className="text-sm text-[rgb(var(--text))] leading-relaxed">
                {fmt(s.address)}
              </p>
            </Card>
          </>
        )}

        {/* ══ FAMILY TAB ══ */}
        {activeTab === "parents" && (
          <>
            {/* Father */}
            <Card title="Father's Details">
              <div className="flex gap-4">
                {docs.fatherPhoto?.url ? (
                  <img
                    src={docs.fatherPhoto.url}
                    alt="Father"
                    className="w-14 h-14 rounded-xl object-cover border-2 border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl  flex items-center justify-center shrink-0">
                    <span className="text-2xl">👨</span>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-y-3 flex-1">
                  <InfoRow label="Name" value={s.fatherName} />
                  <InfoRow label="Mobile" value={s.fatherMobile} />
                  <InfoRow label="Email" value={s.fatherEmail} />
                </div>
              </div>
            </Card>

            {/* Mother */}
            <Card title="Mother's Details" accent="#ec4899">
              <div className="flex gap-4">
                {docs.motherPhoto?.url ? (
                  <img
                    src={docs.motherPhoto.url}
                    alt="Mother"
                    className="w-14 h-14 rounded-xl object-cover border-2 border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-pink-100 flex items-center justify-center shrink-0">
                    <span className="text-2xl">👩</span>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-y-3 flex-1">
                  <InfoRow label="Name" value={s.motherName} />
                  <InfoRow label="Mobile" value={s.motherMobile} />
                  <InfoRow label="Email" value={s.motherEmail} />
                </div>
              </div>
            </Card>

            {/* Guardian */}
            {(s.guardianName || s.guardianMobile) && (
              <Card title="Guardian's Details" accent="#8b5cf6">
                <div className="flex gap-4">
                  {docs.guardianPhoto?.url ? (
                    <img
                      src={docs.guardianPhoto.url}
                      alt="Guardian"
                      className="w-14 h-14 rounded-xl object-cover border-2 border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                      <span className="text-2xl">🧑</span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-y-3 flex-1">
                    <InfoRow label="Name" value={s.guardianName} />
                    <InfoRow label="Mobile" value={s.guardianMobile} />
                    <InfoRow label="Relation" value={s.guardianRelation} />
                  </div>
                </div>
              </Card>
            )}
          </>
        )}

        {/* ══ DOCUMENTS TAB ══ */}
        {activeTab === "documents" && (
          <>
            {/* Progress bar */}
            <div className="bg-[rgb(var(--surface))] rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[rgb(var(--text))] uppercase tracking-widest">
                  Upload Progress
                </span>
                <span className="text-sm font-bold text-[rgb(var(--text))]">
                  {uploadedDocs}/{totalDocs}
                </span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-700"
                  style={{ width: `${docPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-[rgb(var(--text))] mt-1.5">
                {docPercent === 100
                  ? "✅ All documents uploaded!"
                  : `${totalDocs - uploadedDocs} document${totalDocs - uploadedDocs > 1 ? "s" : ""} pending — tap Upload to add`}
              </p>
              <p className="text-[10px] text-[rgb(var(--text))] mt-0.5">
                ⚠️ Uploaded documents cannot be removed by you. Contact school
                admin if needed.
              </p>
            </div>

            {/* Photos */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--text))] mb-2 px-0.5">
                Photos
              </p>
              <div className="grid grid-cols-2 gap-3">
                {DOCUMENT_FIELDS.filter((f) => f.category === "photos").map(
                  (f) => (
                    <DocTile
                      key={f.key}
                      field={f}
                      doc={docs[f.key]}
                      onUpload={handleUpload}
                      uploading={uploading}
                    />
                  ),
                )}
              </div>
            </div>

            {/* ID Documents */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--text))] mb-2 px-0.5">
                Aadhar Cards
              </p>
              <div className="grid grid-cols-2 gap-3">
                {DOCUMENT_FIELDS.filter((f) => f.category === "ids").map(
                  (f) => (
                    <DocTile
                      key={f.key}
                      field={f}
                      doc={docs[f.key]}
                      onUpload={handleUpload}
                      uploading={uploading}
                    />
                  ),
                )}
              </div>
            </div>

            {/* Certificates */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--text))] mb-2 px-0.5">
                Certificates
              </p>
              <div className="grid grid-cols-2 gap-3">
                {DOCUMENT_FIELDS.filter(
                  (f) => f.category === "certificates",
                ).map((f) => (
                  <DocTile
                    key={f.key}
                    field={f}
                    doc={docs[f.key]}
                    onUpload={handleUpload}
                    uploading={uploading}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {/* ══ FEES TAB ══ */}
        {activeTab === "fees" && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: "Total Fee",
                  value: s.finalFee ?? s.totalFee,
                  color: "bg-indigo-50 text-indigo-700 border-indigo-100",
                  icon: "💰",
                },
                {
                  label: "Paid",
                  value: s.totalPaid,
                  color: "bg-emerald-50 text-emerald-700 border-emerald-100",
                  icon: "✅",
                },
                {
                  label: "Due",
                  value: s.totalDue,
                  color:
                    s.totalDue > 0
                      ? "bg-rose-50 text-rose-700 border-rose-100"
                      : "bg-slate-50 text-slate-600 border-slate-100",
                  icon: s.totalDue > 0 ? "⚠️" : "🎉",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`rounded-2xl border p-3 flex flex-col items-center gap-1 ${item.color}`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                    {item.label}
                  </span>
                  <span className="text-base font-bold">
                    ₹{(item.value ?? 0).toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>

            {/* Fee details */}
            <Card title="Fee Breakdown" accent="#f59e0b">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <InfoRow
                  label="Total Fee"
                  value={
                    s.totalFee ? `₹${s.totalFee.toLocaleString("en-IN")}` : null
                  }
                />
                <InfoRow
                  label="Discount"
                  value={
                    s.discountValue
                      ? `${s.discountValue}${s.discountType === "percent" ? "%" : " ₹"}`
                      : "No discount"
                  }
                />
                <InfoRow
                  label="Final Fee"
                  value={
                    s.finalFee ? `₹${s.finalFee.toLocaleString("en-IN")}` : null
                  }
                />
                <InfoRow label="Frequency" value={s.feeFrequency} />
                <InfoRow
                  label="Amount Paid"
                  value={
                    s.totalPaid
                      ? `₹${s.totalPaid.toLocaleString("en-IN")}`
                      : "₹0"
                  }
                />
                <InfoRow
                  label="Amount Due"
                  value={
                    s.totalDue != null
                      ? `₹${s.totalDue.toLocaleString("en-IN")}`
                      : "₹0"
                  }
                />
              </div>

              {/* Due bar */}
              {s.finalFee > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-[10px] text-[rgb(var(--text))] mb-1">
                    <span>Paid</span>
                    <span>
                      {Math.round(((s.totalPaid ?? 0) / s.finalFee) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(
                          Math.round(((s.totalPaid ?? 0) / s.finalFee) * 100),
                          100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default MyChild;
