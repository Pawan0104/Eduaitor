import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaArrowLeft } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

const StudentView = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [randomImg, setRandomImg] = useState(null);

  const fetchStudent = async () => {
    try {
      const res = await axios.get(`${API}/students/${id}`, {
        withCredentials: true,
      });
      setStudent(res.data.data);
    } catch {
      toast.error("Failed to load student");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudent();
  }, [id]);

  const getRandomStudentImage = (gender) => {
    const randomIndex = Math.floor(Math.random() * 100);

    if (gender?.toLowerCase() === "female") {
      return `https://randomuser.me/api/portraits/women/${randomIndex}.jpg`;
    }

    return `https://randomuser.me/api/portraits/men/${randomIndex}.jpg`;
  };
  useEffect(() => {
    if (student?.gender) {
      setRandomImg(getRandomStudentImage(student.gender));
    }
  }, [student]);

  if (loading) return <Loader />;
  if (!student) return <Empty />;

  const docs = student.documents || {};

  return (
    <div className=" min-h-screen">
      {/* /*HEADER */}
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
      {/* TOP BANNER */}
      <div className="bg-[rgb(var(--surface))] px-6 py-5 sm:px-8 border-b-[rgb(var(--border))]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[rgb(var(--text))] text-base sm:text-2xl mb-0.5">
              Student Profile
            </p>
          </div>
          {user?.role === "school_admin" && (
            <button
              onClick={() => navigate(`/school/student-manage/${student._id}`)}
              className="px-4 py-2 bg-[rgb(var(--primary))] text-[rgb(var(--text))] rounded-lg text-sm font-medium  transition"
            >
              Edit Student
            </button>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
        {/* PROFILE CARD */}
        <div className="bg-[rgb(var(--surface))] rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 flex flex-col sm:flex-row gap-6 items-center sm:items-start text-[rgb(var(--text))]">
          <img
            src={docs.studentPhoto?.url || randomImg || undefined}
            onError={(e) => {
              e.target.src = getRandomStudentImage(student?.gender);
            }}
            alt="student"
            className="w-24 h-24 rounded-full object-cover ring-4 ring-indigo-100 shrink-0"
          />
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

          {/* Quick stats */}
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

        {/* FEE SUMMARY STRIP */}
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

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-4 ">
          {/* Student Details */}
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

          {/* Class Details */}
          {user?.role === "school_admin" && (
            <Section title="Class Details" icon="🏫">
              <Row label="Class" value={student.classId?.name} />
              <Row label="Section" value={student.sectionId?.name} />
              <Row label="Roll Number" value={student.rollNo} />
              <Row label="Student Type" value={student.studentType} />
            </Section>
          )}

          {/* Documents */}
          {user?.role === "school_admin" && (
            <Section title="Documents" icon="📄">
              <DocRow label="Birth Certificate" file={docs.birthCertificate} />
              <DocRow
                label="Transfer Certificate"
                file={docs.transferCertificate}
              />
              <DocRow label="Student Aadhar" file={docs.studentAadhar} />
              <DocRow label="Father Aadhar" file={docs.fatherAadhar} />
              <DocRow label="Mother Aadhar" file={docs.motherAadhar} />
            </Section>
          )}

          {/* Father Details */}
          <Section title="Father Details" icon="👨">
            <Row label="Name" value={student.fatherName} />
            <Row label="Mobile" value={student.fatherMobile} />
            <Row label="Email" value={student.fatherEmail} />
            {docs.fatherPhoto?.url && (
              <div className="pt-2">
                <img
                  src={docs.fatherPhoto.url}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100"
                />
              </div>
            )}
          </Section>

          {/* Mother Details */}
          <Section title="Mother Details" icon="👩">
            <Row label="Name" value={student.motherName} />
            <Row label="Mobile" value={student.motherMobile} />
            <Row label="Email" value={student.motherEmail} />
            {docs.motherPhoto?.url && (
              <div className="pt-2">
                <img
                  src={docs.motherPhoto.url}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100"
                />
              </div>
            )}
          </Section>

          {/* Guardian Details */}
          {user?.role === "school_admin" && (
            <Section title="Guardian Details" icon="🧑">
              <Row label="Guardian Name" value={student.guardianName} />
              <Row label="Mobile" value={student.guardianMobile} />
              <Row label="Relation" value={student.guardianRelation} />
              <Row label="Address" value={student.address} />
            </Section>
          )}
        </div>

        {/* PARENT LOGIN — full width */}
        {user?.role === "school_admin" && (
          <div className="bg-[rgb(var(--surface))] rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-base">🔐</span>
              <h3 className="text-base font-semibold text-[rgb(var(--text))]">
                Parent Login
              </h3>
              <span className="ml-auto text-xs text-[rgb(var(--text-muted))] bg-[rgb(var(--surface))] px-2 py-0.5 rounded-full">
                Dev visible
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 bg-[rgb(var(--primary))] border border-indigo-100 rounded-xl p-4">
                <p className="text-xs text-[rgb(var(--text))] uppercase tracking-wide mb-1">
                  Username
                </p>
                <p className="text-base font-semibold text-[rgb(var(--text))]">
                  {student.username || "—"}
                </p>
              </div>
              <div className="flex-1 bg-[rgb(var(--primary))] border border-purple-100 rounded-xl p-4">
                <p className="text-xs text-[rgb(var(--text))] uppercase tracking-wide mb-1">
                  Password (temp)
                </p>
                <p className="text-base font-semibold text-[rgb(var(--text))] tracking-widest">
                  {student.temp_password || "—"}
                </p>
              </div>
            </div>
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
      <h3 className="text-base font-semibold text-[rgb(var(--text))]">{title}</h3>
    </div>
    <div className="space-y-2.5 text-sm">{children}</div>
  </div>
);

const Row = ({ label, value }) => (
  <div className="flex justify-between gap-3 py-0.5">
    <span className="text-[rgb(var(--text-muted))] shrink-0">{label}</span>
    <span className="font-medium text-[rgb(var(--text))] text-right">{value || "—"}</span>
  </div>
);

const DocRow = ({ label, file }) => (
  <div className="flex justify-between gap-3 py-0.5">
    <span className="text-[rgb(var(--text-muted))]">{label}</span>
    {file?.url ? (
      <a
        href={file.url}
        target="_blank"
        rel="noreferrer"
        className="text-indigo-600 font-medium hover:underline text-sm"
      >
        View ↗
      </a>
    ) : (
      <span className="text-gray-300 text-sm">Not uploaded</span>
    )}
  </div>
);

const StatCard = ({ label, value, color }) => (
  <div className={`rounded-xl p-4 ${color}`}>
    <p className="text-xs uppercase tracking-wide opacity-70 mb-1">{label}</p>
    <p className="text-lg font-semibold">{value}</p>
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
