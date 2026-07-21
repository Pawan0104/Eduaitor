import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaArrowLeft, FaIdCard } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

const DOCUMENT_ENTRIES = [
  { key: "studentPhoto", label: "Student Photo" },
  { key: "fatherPhoto", label: "Father Photo" },
  { key: "motherPhoto", label: "Mother Photo" },
  { key: "guardianPhoto", label: "Guardian Photo" },
  { key: "birthCertificate", label: "Birth Certificate" },
  { key: "transferCertificate", label: "Transfer Certificate" },
  { key: "studentAadhar", label: "Student Aadhar" },
  { key: "fatherAadhar", label: "Father Aadhar" },
  { key: "motherAadhar", label: "Mother Aadhar" },
];

const StudentView = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photoBroken, setPhotoBroken] = useState(false);

  const fetchStudent = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/students/${id}`, {
        withCredentials: true,
      });
      setStudent(res.data.data);
      setPhotoBroken(false);
    } catch {
      toast.error("Failed to load student");
      setStudent(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    fetchStudent();
  }, [fetchStudent]);

  // Refetch when returning from Edit so changes show immediately
  useEffect(() => {
    const onFocus = () => fetchStudent();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchStudent]);

  if (loading) return <Loader />;
  if (!student) return <Empty />;

  const docsRaw = student.documents;
  const docs =
    docsRaw && typeof docsRaw.toObject === "function"
      ? docsRaw.toObject()
      : docsRaw || {};
  const extraDocs = Array.isArray(student.extraDocuments)
    ? student.extraDocuments
    : [];
  const studentCreds = student.studentCredentials || {};
  const parentCreds = student.parentCredentials || {};
  const canViewDocuments = [
    "school_admin",
    "staff_admin",
    "teacher_admin",
  ].includes(user?.role);

  const photoUrl = docs.studentPhoto?.url || "";
  const initials =
    `${student.firstName?.[0] || ""}${student.lastName?.[0] || ""}`.toUpperCase() ||
    "?";

  const uploadedCount =
    DOCUMENT_ENTRIES.filter((d) => docs[d.key]?.url).length +
    extraDocs.filter((d) => d?.url).length;

  return (
    <div className=" min-h-screen">
      <button
        onClick={() => {
          if (!user?.role) return;
          navigate(
            user.role === "teacher_admin"
              ? "/teacher/students"
              : "/school/students",
          );
        }}
        className="flex items-center gap-2 text-[rgb(var(--text))]  bg-[rgb(var(--primary))] mb-4 cursor-pointer m-4 p-2 rounded-xl"
      >
        <FaArrowLeft />
        Back to Students
      </button>

      <div className="bg-[rgb(var(--surface))] px-6 py-5 sm:px-8 border-b-[rgb(var(--border))]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[rgb(var(--text))] text-base sm:text-2xl mb-0.5">
              Student Profile
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                navigate(
                  user?.role === "teacher_admin"
                    ? `/teacher/id-card/student/${student._id}`
                    : user?.role === "staff_admin"
                      ? `/staff/id-card/student/${student._id}`
                      : `/school/id-card/student/${student._id}`,
                )
              }
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <FaIdCard /> Download ID Card
            </button>
            {user?.role === "school_admin" && (
              <button
                onClick={() =>
                  navigate(`/school/student-manage/${student._id}`)
                }
                className="px-4 py-2 bg-[rgb(var(--primary))] text-[rgb(var(--text))] rounded-lg text-sm font-medium  transition"
              >
                Edit Student
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
        <div className="bg-[rgb(var(--surface))] rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 flex flex-col sm:flex-row gap-6 items-center sm:items-start text-[rgb(var(--text))]">
          {photoUrl && !photoBroken ? (
            <img
              key={photoUrl}
              src={photoUrl}
              onError={() => setPhotoBroken(true)}
              alt="student"
              className="w-24 h-24 rounded-full object-cover ring-4 ring-indigo-100 shrink-0"
            />
          ) : (
            <div className="w-24 h-24 rounded-full ring-4 ring-indigo-100 shrink-0 flex items-center justify-center bg-indigo-100 text-indigo-700 text-2xl font-bold">
              {initials}
            </div>
          )}
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-semibold">
              {student.firstName} {student.lastName}
            </h2>
            <p className="text-[rgb(var(--text))] text-sm mt-1">
              {student.classId?.name || "—"}
              {student.sectionId?.name
                ? ` · Section ${student.sectionId.name}`
                : ""}
              {student.rollNo ? ` · Roll No. ${student.rollNo}` : ""}
            </p>
            <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
              {student.studentType && (
                <span className="px-3 py-1 text-xs rounded-full bg-indigo-100 text-indigo-700 font-medium">
                  {student.studentType}
                </span>
              )}
              {student.gender && (
                <span className="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-600 font-medium">
                  {student.gender}
                </span>
              )}
              {student.bloodGroup && (
                <span className="px-3 py-1 text-xs rounded-full bg-red-50 text-red-600 font-medium">
                  {student.bloodGroup}
                </span>
              )}
            </div>
          </div>

          <div className="flex sm:flex-col gap-4 sm:gap-3 text-center sm:text-right shrink-0">
            <div>
              <p className="text-xs text-[rgb(var(--text))] uppercase tracking-wide">
                Admission
              </p>
              <p className="text-sm font-medium text-[rgb(var(--text))]">
                {formatDate(student.admissionDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[rgb(var(--text))] uppercase tracking-wide">
                Student ID
              </p>
              <p className="text-sm font-medium text-[rgb(var(--text))]">
                {student.studentId || "—"}
              </p>
            </div>
          </div>
        </div>

        {user?.role === "school_admin" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard
              label="Total Fee"
              value={`₹${Number(student.totalFee || 0).toLocaleString("en-IN")}`}
              color="bg-blue-100 text-blue-900"
            />
            <StatCard
              label="Discount"
              value={
                student.discountValue
                  ? student.discountType === "Percentage"
                    ? `${student.discountValue}%`
                    : `₹${student.discountValue}`
                  : "—"
              }
              color="bg-amber-100 text-amber-900"
            />
            <StatCard
              label="Final Fee"
              value={`₹${Number(student.finalFee || 0).toLocaleString("en-IN")}`}
              color="bg-green-100 text-green-900"
            />
            <StatCard
              label="Total Paid"
              value={`₹${Number(student.totalPaid || 0).toLocaleString("en-IN")}`}
              color="bg-indigo-100 text-indigo-900"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-4 ">
          <Section title="Student Details" icon="👤">
            <Row label="First Name" value={student.firstName} />
            <Row label="Last Name" value={student.lastName} />
            <Row label="Date of Birth" value={formatDate(student.dob)} />
            <Row label="Gender" value={student.gender} />
            <Row label="Blood Group" value={student.bloodGroup} />
            <Row
              label="Admission Date"
              value={formatDate(student.admissionDate)}
            />
          </Section>

          {(user?.role === "school_admin" ||
            user?.role === "staff_admin" ||
            user?.role === "teacher_admin") && (
            <Section title="Class Details" icon="🏫">
              <Row label="Class" value={student.classId?.name} />
              <Row label="Section" value={student.sectionId?.name} />
              <Row label="Roll Number" value={student.rollNo} />
              <Row label="Student Type" value={student.studentType} />
            </Section>
          )}

          <Section title="Previous School" icon="📚">
            <Row label="School Name" value={student.previousSchoolName} />
            <Row label="Class" value={student.previousSchoolClass} />
            <Row label="Result" value={student.previousSchoolResult} />
          </Section>

          <Section title="Father Details" icon="👨">
            <Row label="Name" value={student.fatherName} />
            <Row label="Mobile" value={student.fatherMobile} />
            <Row label="Email" value={student.fatherEmail} />
            {docs.fatherPhoto?.url && (
              <div className="pt-2">
                <img
                  src={docs.fatherPhoto.url}
                  alt="Father"
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100"
                />
              </div>
            )}
          </Section>

          <Section title="Mother Details" icon="👩">
            <Row label="Name" value={student.motherName} />
            <Row label="Mobile" value={student.motherMobile} />
            <Row label="Email" value={student.motherEmail} />
            {docs.motherPhoto?.url && (
              <div className="pt-2">
                <img
                  src={docs.motherPhoto.url}
                  alt="Mother"
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100"
                />
              </div>
            )}
          </Section>

          {user?.role === "school_admin" && (
            <Section title="Guardian Details" icon="🧑">
              <Row label="Guardian Name" value={student.guardianName} />
              <Row label="Mobile" value={student.guardianMobile} />
              <Row label="Relation" value={student.guardianRelation} />
              <Row label="Address" value={student.address} />
            </Section>
          )}
        </div>

        {/* Documents — full width so TC / PDF / downloads are obvious */}
        {canViewDocuments && (
          <div className="mb-4">
            <Section
              title={`Documents${uploadedCount ? ` (${uploadedCount})` : ""}`}
              icon="📄"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DOCUMENT_ENTRIES.map((item) => (
                  <DocRow
                    key={item.key}
                    label={item.label}
                    file={docs[item.key]}
                  />
                ))}
                {extraDocs.map((doc, idx) => (
                  <DocRow
                    key={doc.fieldName || doc.label || idx}
                    label={
                      doc.label ||
                      doc.fieldName ||
                      `Extra document ${idx + 1}`
                    }
                    file={doc}
                  />
                ))}
              </div>
              {uploadedCount === 0 && (
                <p className="text-xs text-[rgb(var(--text-muted))] pt-2">
                  No documents uploaded yet. Use Edit Student → Documents to
                  upload photos, TC, Aadhaar, and certificates.
                </p>
              )}
            </Section>
          </div>
        )}

        {user?.role === "school_admin" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CredentialsCard
              title="Student Login"
              icon="🎓"
              creds={studentCreds}
            />
            <CredentialsCard
              title="Parent Login"
              icon="🔐"
              creds={parentCreds}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentView;

/* ================= SUB-COMPONENTS ================= */

const Section = ({ title, icon, children }) => (
  <div className="bg-[rgb(var(--surface))] rounded-2xl border border-[rgb(var(--border))] shadow-sm p-5">
    <div className="flex items-center gap-2 mb-4">
      <span className="text-base">{icon}</span>
      <h3 className="text-base font-semibold text-[rgb(var(--text))]">
        {title}
      </h3>
    </div>
    <div className="space-y-2.5 text-sm">{children}</div>
  </div>
);

const Row = ({ label, value }) => (
  <div className="flex justify-between gap-3 py-0.5">
    <span className="text-[rgb(var(--text-muted))] shrink-0">{label}</span>
    <span className="font-medium text-[rgb(var(--text))] text-right">
      {value || "—"}
    </span>
  </div>
);

const DocRow = ({ label, file }) => {
  const url = file?.url || "";
  const type = (file?.type || "").toLowerCase();
  const isPdf =
    type === "application/pdf" || /\.pdf(\?|$)/i.test(url);
  const isImage =
    url &&
    !isPdf &&
    (/\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url) ||
      /\/image\/upload\//i.test(url) ||
      type.startsWith("image/"));

  return (
    <div className="flex items-start justify-between gap-3 p-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))]/30">
      <div className="min-w-0 flex-1">
        <p className="text-[rgb(var(--text-muted))] text-xs mb-1">{label}</p>
        {url ? (
          <div className="flex flex-wrap gap-2 mt-0.5">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 font-medium hover:underline text-sm"
            >
              {isPdf ? "Preview PDF" : "View"} ↗
            </a>
            <a
              href={url}
              download
              target="_blank"
              rel="noreferrer"
              className="text-emerald-700 font-medium hover:underline text-sm"
            >
              Download
            </a>
          </div>
        ) : (
          <span className="text-[rgb(var(--text-muted))] text-sm opacity-60">
            Not uploaded
          </span>
        )}
      </div>
      {url && isImage && (
        <a href={url} target="_blank" rel="noreferrer" className="shrink-0">
          <img
            src={url}
            alt={label}
            className="w-14 h-14 rounded-lg object-cover border border-[rgb(var(--border))]"
          />
        </a>
      )}
      {url && isPdf && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 w-14 h-14 rounded-lg border border-[rgb(var(--border))] bg-rose-50 text-rose-700 flex flex-col items-center justify-center text-[10px] font-bold"
        >
          PDF
        </a>
      )}
    </div>
  );
};

const StatCard = ({ label, value, color }) => (
  <div className={`rounded-xl p-4 ${color}`}>
    <p className="text-xs uppercase tracking-wide opacity-70 mb-1">{label}</p>
    <p className="text-lg font-semibold">{value}</p>
  </div>
);

const CredentialsCard = ({ title, icon, creds }) => (
  <div className="bg-[rgb(var(--surface))] rounded-2xl border border-gray-100 shadow-sm p-5">
    <div className="flex items-center gap-2 mb-4">
      <span className="text-base">{icon}</span>
      <h3 className="text-base font-semibold text-[rgb(var(--text))]">
        {title}
      </h3>
      <span className="ml-auto text-xs text-[rgb(var(--text-muted))] bg-[rgb(var(--surface))] border border-[rgb(var(--border))] px-2 py-0.5 rounded-full">
        Dev visible
      </span>
    </div>

    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex-1 bg-[rgb(var(--primary))] border border-indigo-100 rounded-xl p-4">
        <p className="text-xs text-[rgb(var(--text))] uppercase tracking-wide mb-1">
          Username
        </p>
        <p className="text-base font-semibold text-[rgb(var(--text))]">
          {creds.username || "—"}
        </p>
      </div>
      <div className="flex-1 bg-[rgb(var(--primary))] border border-purple-100 rounded-xl p-4">
        <p className="text-xs text-[rgb(var(--text))] uppercase tracking-wide mb-1">
          Password (temp)
        </p>
        <p className="text-base font-semibold text-[rgb(var(--text))] tracking-widest">
          {creds.temp_password || "—"}
        </p>
      </div>
    </div>

    <div className="flex justify-between gap-3 mt-3 pt-3 border-t border-[rgb(var(--border))] text-sm">
      <span className="text-[rgb(var(--text-muted))]">First-time login</span>
      <span className="font-medium text-[rgb(var(--text))]">
        {creds.firstTimeLogin === false ? "No — password changed" : "Yes"}
      </span>
    </div>
  </div>
);

const Loader = () => (
  <div className="min-h-screen flex items-center justify-center text-[rgb(var(--text-muted))]">
    Loading...
  </div>
);

const Empty = () => (
  <div className="min-h-screen flex items-center justify-center text-[rgb(var(--text))]">
    Student not found
  </div>
);

const formatDate = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};
