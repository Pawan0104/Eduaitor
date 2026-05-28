import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const TARGET_TYPES = [
  { value: "all",   label: "🌐 Everyone" },
  { value: "role",  label: "👥 By Role"  },
  { value: "class", label: "🏫 By Class" },
];

const ROLES = [
  { value: "teacher_admin", label: "Teachers"          },
  { value: "student_admin", label: "Students / Parents" },
  { value: "school_admin",  label: "School Admins"     },
];

const NOTIF_TYPES = [
  { value: "general",    label: "📢 General"    },
  { value: "exam",       label: "📝 Exam"       },
  { value: "result",     label: "🏆 Result"     },
  { value: "attendance", label: "📋 Attendance" },
  { value: "fee",        label: "💰 Fee"        },
];

/* ─── shared class strings ─── */
const inputCls = [
  "w-full rounded-xl border px-4 py-3 text-sm outline-none transition",
  "border-[rgb(var(--border))]",
  "bg-[rgb(var(--bg))]",
  "text-[rgb(var(--text))]",
  "placeholder:text-[rgb(var(--text-muted))]",
  "focus:border-[rgb(var(--border-strong))]",
  "focus:ring-2 focus:ring-[rgb(var(--border-strong))]/30",
].join(" ");

const chipBase =
  "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all";

const chipActive = [
  chipBase,
  "bg-[rgb(var(--primary))]",
  "text-white",
  "border-[rgb(var(--primary))]",
  "shadow-sm",
].join(" ");

const chipIdle = [
  chipBase,
  "bg-[rgb(var(--surface))]",
  "text-[rgb(var(--text-muted))]",
  "border-[rgb(var(--border))]",
  "hover:border-[rgb(var(--border-strong))]",
  "hover:text-[rgb(var(--text))]",
].join(" ");

/* ─── component ─── */
const CreateNotification = () => {
  const API = import.meta.env.VITE_API_URL;

  const [form, setForm] = useState({
    title: "",
    message: "",
    startingDate:"",
    endingDate:"",
    notificationType: "general",
    targetType: "all",
    selectedRoles: [],
    classId: "",
  });

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios
      .get(`${API}/classes/all`, { withCredentials: true })
      .then((r) => setClasses(r.data.classes))
      .catch(() => {});
  }, []);

  const toggleRole = (role) =>
    setForm((prev) => ({
      ...prev,
      selectedRoles: prev.selectedRoles.includes(role)
        ? prev.selectedRoles.filter((r) => r !== role)
        : [...prev.selectedRoles, role],
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let target = { type: form.targetType };
    if (form.targetType === "role")  target.roles   = form.selectedRoles;
    if (form.targetType === "class") target.classId = form.classId;

    try {
      await axios.post(
        `${API}/notifications`,
        {
          title: form.title,
          message: form.message,
          notificationType: form.notificationType,
          startingDate:form.startingDate,
          endingDate:form.endingDate,
          target,
        },
        { withCredentials: true },
      );
      toast.success("Notification sent!");
      setForm({
        title: "", message: "", notificationType: "general",
        targetType: "all", selectedRoles: [], classId: "", startingDate:"",endingDate:"",
      });
    } catch {
      toast.error("Failed to send notification");
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Card */
    <div
      className="mx-auto max-w-lg rounded-2xl border p-6 shadow-sm"
      style={{
        background: "rgb(var(--surface))",
        borderColor: "rgb(var(--border))",
      }}
    >
      {/* Header */}
      <h2 className="text-xl font-bold text-[rgb(var(--text))]">
        📣 Send Notification
      </h2>
      <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
        Target specific roles, classes, or send to everyone
      </p>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">

        {/* Title */}
        <input
          className={inputCls}
          placeholder="Title  (e.g. Holiday Announcement)"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />


        {/* Message */}
        <textarea
          rows={3}
          className={`${inputCls} resize-none`}
          placeholder="Write your message here..."
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          required
        />
        {/* Date*/}
        <div className="flex flex-col">
       <label className="mb-2 block text-xs font-semibold text-[rgb(var(--text-muted))]">
           Starting Date
          </label>
         <input
          className={inputCls}
          type="date"
          placeholder="starting date"
          value={form.startingDate}
          onChange={(e) => setForm({ ...form, startingDate: e.target.value })}
          required
        />
<label className="mb-2 block text-xs font-semibold text-[rgb(var(--text-muted))]">
            ending Date
          </label>
         <input
          className={inputCls}
          type="date"
          placeholder="ending date"
          value={form.endingDate}
          onChange={(e) => setForm({ ...form, endingDate: e.target.value })}
          required
        />
</div>


        {/* Notification Type */}
        <div>
          <label className="mb-2 block text-xs font-semibold text-[rgb(var(--text-muted))]">
            Notification Type
          </label>
          <div className="flex flex-wrap gap-2">
            {NOTIF_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm({ ...form, notificationType: t.value })}
                className={
                  form.notificationType === t.value ? chipActive : chipIdle
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Target Type */}
        <div>
          <label className="mb-2 block text-xs font-semibold text-[rgb(var(--text-muted))]">
            Send To
          </label>
          <div className="flex flex-wrap gap-2">
            {TARGET_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    targetType: t.value,
                    selectedRoles: [],
                    classId: "",
                  })
                }
                className={
                  form.targetType === t.value ? chipActive : chipIdle
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conditional: Role selector */}
        {form.targetType === "role" && (
          <div
            className="rounded-xl border p-3"
            style={{
              background: "rgb(var(--bg))",
              borderColor: "rgb(var(--border))",
            }}
          >
            <label className="mb-2 block text-xs font-semibold text-[rgb(var(--text-muted))]">
              Select Roles
            </label>
            <div className="flex flex-wrap gap-3">
              {ROLES.map((r) => (
                <label
                  key={r.value}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="checkbox"
                    checked={form.selectedRoles.includes(r.value)}
                    onChange={() => toggleRole(r.value)}
                    className="accent-[rgb(var(--primary))] h-4 w-4 rounded"
                  />
                  <span className="text-xs font-medium text-[rgb(var(--text))]">
                    {r.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Conditional: Class selector */}
        {form.targetType === "class" && (
          <select
            className={inputCls}
            value={form.classId}
            onChange={(e) => setForm({ ...form, classId: e.target.value })}
            required
          >
            <option value="">— Select Class —</option>
            {classes.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} {c.section}
              </option>
            ))}
          </select>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="mt-1 w-full rounded-xl py-3 text-sm font-bold text-white transition
                     hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          style={{ background: "rgb(var(--primary))" }}
        >
          {loading ? "Sending…" : "Send Notification"}
        </button>
      </form>
    </div>
  );
};

export default CreateNotification;