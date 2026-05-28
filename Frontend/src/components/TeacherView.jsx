import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaArrowLeft } from "react-icons/fa";

const API = import.meta.env.VITE_API_URL;

const TeacherView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);

  const [messageOpen, setMessageOpen] = useState(false);

  const fetchTeacher = async () => {
    try {
      const res = await axios.get(`${API}/teachers/${id}`, {
        withCredentials: true,
      });

      setTeacher(res.data.data);
    } catch {
      toast.error("Failed to load teacher");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacher();
  }, []);

  if (loading) return <div className="p-6 sm:p-10">Loading...</div>;

  if (!teacher) return <div className="p-6 sm:p-10">Teacher not found</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[rgb(var(--bg))] min-h-screen">
      {/* HEADER */}
      <button
        onClick={() => navigate("/school/teachers")}
        className="flex items-center gap-2 text-[rgb(var(--text))] mb-4"
      >
        <FaArrowLeft />
        Back to Teachers
      </button>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Teacher Profile</h1>

        <button
          onClick={() => navigate(`/school/teacher-manage/${teacher._id}`)}
          className="px-4 py-2 bg-[rgb(var(--primary))]  rounded-lg  text-[rgb(var(--text))] transition"
        >
          Edit
        </button>
      </div>

      {/* PROFILE CARD */}

      <div className="bg-[rgb(var(--surface))]  text-[rgb(var(--text))]  rounded-xl shadow p-6 mb-6 flex flex-col sm:flex-row gap-6 items-center">
        <img
          src={teacher.photo?.url || "https://i.pravatar.cc"}
          className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border"
          alt="Profile"
        />

        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-xl sm:text-2xl font-semibold">
            {teacher.fullName}
          </h2>

          <p className="text-[rgb(var(--text))]">{teacher.designation}</p>

          <p className="text-[rgb(var(--text))]">{teacher.department}</p>
        </div>

        <button
          onClick={() => setMessageOpen(true)}
          className="px-4 py-2 bg-[rgb(var(--primary))]  rounded-lg  text-[rgb(var(--text))] transition"
        >
          Message
        </button>
      </div>

      {/* STATS */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        <Stat title="Teacher ID" value={teacher.teacherId} />
        <Stat title="Experience" value={`${teacher.experience} yrs`} />
        <Stat
          title="Subject"
          value={
            teacher.subjects?.length
              ? teacher.subjects.map((s) => s.name).join(", ")
              : "-"
          }
        />
        <Stat title="Status" value={teacher.status} />
      </div>

      {/* DETAILS */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Personal Information">
          <Info label="Full Name" value={teacher.fullName} />
          <Info label="DOB" value={teacher.dob?.slice(0, 10)} />
          <Info label="Gender" value={teacher.gender} />
          <Info label="Phone" value={teacher.phone} />
          <Info label="Email" value={teacher.email} />
          <Info label="Address" value={teacher.address} />
        </Card>

        <Card title="Professional Details">
          <Info label="Qualification" value={teacher.qualification} />
          <Info label="Experience" value={`${teacher.experience} years`} />
          <Info
            label="Subject"
            value={
              teacher.subjects?.length
                ? teacher.subjects.map((s) => s.name).join(", ")
                : "-"
            }
          />
          <Info label="Department" value={teacher.department} />
        </Card>

        <Card title="Employment Information">
          <Info label="Designation" value={teacher.designation} />
          <Info
            label="Joining Date"
            value={teacher.joiningDate?.slice(0, 10)}
          />
          <Info label="Employment Type" value={teacher.employmentType} />
          <Info label="Salary" value={`₹ ${teacher.salary}`} />
        </Card>

        <Card title="ERP Details">
          <Info
            label="Assigned Classes"
            value={
              teacher.assignedClasses?.length
                ? teacher.assignedClasses
                    .map((c) => c.name || c.className)
                    .join(", ")
                : "-"
            }
          />
          <Info label="Role" value={teacher.role} />
          <Info label="Username" value={teacher.username} />
        </Card>
      </div>

      {/* MESSAGE POPUP */}

      {messageOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-[rgb(var(--surface))]  text-[rgb(var(--text))]  rounded-xl p-6 w-full max-w-md sm:max-w-lg space-y-4">
            <h3 className="text-lg font-semibold">Send Message</h3>

            <p className="text-sm text-[rgb(var(--text))]">To: {teacher.fullName}</p>

            <textarea
              placeholder="Write your message..."
              className="w-full border rounded-lg p-3 h-32 bg-[rgb(var(--surface))]  text-[rgb(var(--text))]  border-gray-300"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setMessageOpen(false)}
                className="px-4 py-2 bg-[rgb(var(--surface))]  rounded-lg  text-[rgb(var(--text))] transition"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  toast.success("Message sent (UI only)");
                  setMessageOpen(false);
                }}
                className="px-4 py-2 bg-[rgb(var(--primary))]  rounded-lg  text-[rgb(var(--text))] transition"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherView;

/* COMPONENTS */

const Card = ({ title, children }) => (
  <div className="bg-[rgb(var(--surface))]  text-[rgb(var(--text))]  rounded-xl shadow p-6">
    <h3 className="text-lg font-semibold mb-4">{title}</h3>

    <div className="space-y-2">{children}</div>
  </div>
);

const Info = ({ label, value }) => (
  <div className="flex justify-between text-sm bg-[rgb(var(--surface))]" >
    <span className="text-[rgb(var(--text))]">{label}</span>

    <span className="font-medium">{value || "-"}</span>
  </div>
);

const Stat = ({ title, value }) => (
  <div className="bg-[rgb(var(--surface))]  rounded-xl shadow p-6 text-center">
    <p className="text-sm text-[rgb(var(--text))]">{title}</p>

    <p className="text-xl font-semibold">{value}</p>
  </div>
);
