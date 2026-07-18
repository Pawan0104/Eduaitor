// import { useState, useEffect, useRef } from "react";
// import axios from "axios";
// import { toast } from "react-toastify";

// const TARGET_TYPES = [
//   { value: "all",   label: "🌐 Everyone" },
//   { value: "role",  label: "👥 By Role"  },
//   { value: "class", label: "🏫 By Class" },
// ];

// const ROLES = [
//   { value: "teacher_admin", label: "Teachers"           },
//   { value: "student_admin", label: "Students / Parents" },
//   { value: "school_admin",  label: "School Admins"      },
// ];

// const NOTIF_TYPES = [
//   { value: "general",    label: "📢 General"    },
//   { value: "exam",       label: "📝 Exam"       },
//   { value: "result",     label: "🏆 Result"     },
//   { value: "attendance", label: "📋 Attendance" },
//   { value: "fee",        label: "💰 Fee"        },
// ];

// const inputCls = [
//   "w-full rounded-xl border px-4 py-3 text-sm outline-none transition",
//   "border-[rgb(var(--border))]",
//   "bg-[rgb(var(--bg))]",
//   "text-[rgb(var(--text))]",
//   "placeholder:text-[rgb(var(--text-muted))]",
//   "focus:border-[rgb(var(--border-strong))]",
//   "focus:ring-2 focus:ring-[rgb(var(--border-strong))]/30",
// ].join(" ");

// const chipBase   = "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all";
// const chipActive = `${chipBase} bg-[rgb(var(--primary))] text-white border-[rgb(var(--primary))] shadow-sm`;
// const chipIdle   = `${chipBase} bg-[rgb(var(--surface))] text-[rgb(var(--text-muted))] border-[rgb(var(--border))] hover:border-[rgb(var(--border-strong))] hover:text-[rgb(var(--text))]`;

// const SEND_MODES = [
//   { value: "now",       label: "⚡ Send Now"       },
//   { value: "scheduled", label: "🕐 Schedule Later" },
// ];

// const CreateNotification = () => {
//   const API     = import.meta.env.VITE_API_URL;
//   const fileRef = useRef();

//   const [form, setForm] = useState({
//     title:            "",
//     message:          "",
//     startingDate:     "",
//     notificationType: "general",
//     targetType:       "all",
//     selectedRoles:    [],
//     classId:          "",
//     sendMode:         "now",      // "now" | "scheduled" | "draft"
//     scheduledAt:      "",         // datetime-local value
//   });

//   const [pdfs,    setPdfs]    = useState([]);   // File[] selected by user
//   const [classes, setClasses] = useState([]);
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     axios
//       .get(`${API}/classes/all`, { withCredentials: true })
//       .then((r) => setClasses(r.data.classes))
//       .catch(() => {});
//   }, []);

//   const toggleRole = (role) =>
//     setForm((prev) => ({
//       ...prev,
//       selectedRoles: prev.selectedRoles.includes(role)
//         ? prev.selectedRoles.filter((r) => r !== role)
//         : [...prev.selectedRoles, role],
//     }));

//   const handleFileChange = (e) => {
//     const files = Array.from(e.target.files);
//     const pdfsOnly = files.filter((f) => f.type === "application/pdf");
//     if (pdfsOnly.length !== files.length) toast.warn("Only PDF files are allowed");
//     setPdfs((prev) => {
//       const combined = [...prev, ...pdfsOnly];
//       if (combined.length > 5) {
//         toast.warn("Maximum 5 PDFs allowed");
//         return combined.slice(0, 5);
//       }
//       return combined;
//     });
//     // reset input so same file can be re-added after removal
//     e.target.value = "";
//   };

//   const removePdf = (index) =>
//     setPdfs((prev) => prev.filter((_, i) => i !== index));

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (form.sendMode === "scheduled" && !form.scheduledAt) {
//       toast.error("Please pick a date & time to schedule");
//       return;
//     }

//     setLoading(true);

//     // build FormData — needed for file upload
//     const fd = new FormData();
//     fd.append("title",            form.title);
//     fd.append("message",          form.message);
//     fd.append("notificationType", form.notificationType);
//     fd.append("startingDate",     form.startingDate);

//     if (form.sendMode === "scheduled") {
//       fd.append("scheduledAt", new Date(form.scheduledAt).toISOString());
//     }
//     let target = { type: form.targetType };
//     if (form.targetType === "role")  target.roles   = form.selectedRoles;
//     if (form.targetType === "class") target.classId = form.classId;
//     fd.append("target", JSON.stringify(target));

//     pdfs.forEach((file) => fd.append("pdfs", file));

//     try {
//       const { data } = await axios.post(`${API}/notifications`, fd, {
//         withCredentials: true,
//         headers: { "Content-Type": "multipart/form-data" },
//       });

//       toast.success(data.message);

//       // reset
//       setForm({
//         title: "", message: "", startingDate: "",
//         notificationType: "general", targetType: "all",
//         selectedRoles: [], classId: "",
//         sendMode: "now", scheduledAt: "",
//       });
//       setPdfs([]);
//     } catch {
//       toast.error("Failed to send notification");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // min datetime for schedule picker = now + 5 min
//   const minSchedule = new Date(Date.now() + 5 * 60 * 1000)
//     .toISOString().slice(0, 16);

//   return (
//     <div className="mx-auto max-w-lg rounded-2xl border p-6 shadow-sm
//       bg-[rgb(var(--surface))] border-[rgb(var(--border))]">

//       <h2 className="text-xl font-bold text-[rgb(var(--text))]">📣 Send Notification</h2>
//       <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
//         Target specific roles, classes, or send to everyone
//       </p>

//       <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">

//         {/* Title */}
//         <input
//           className={inputCls}
//           placeholder="Title (e.g. Holiday Announcement)"
//           value={form.title}
//           onChange={(e) => setForm({ ...form, title: e.target.value })}
//           required
//         />

//         {/* Message */}
//         <textarea
//           rows={3}
//           className={`${inputCls} resize-none`}
//           placeholder="Write your message here..."
//           value={form.message}
//           onChange={(e) => setForm({ ...form, message: e.target.value })}
//           required
//         />

//         {/* Starting Date */}
//         <div>
//           <label className="mb-2 block text-xs font-semibold text-[rgb(var(--text-muted))]">
//             Event Date
//           </label>
//           <input
//             className={inputCls}
//             type="date"
//             value={form.startingDate}
//             onChange={(e) => setForm({ ...form, startingDate: e.target.value })}
//             min={new Date().toISOString().split("T")[0]}
//           />
//         </div>

//         {/* PDF Upload */}
//         <div>
//           <label className="mb-2 block text-xs font-semibold text-[rgb(var(--text-muted))]">
//             Attach PDFs <span className="font-normal">(max 5, 10 MB each)</span>
//           </label>

//           {/* Drop zone */}
//           <div
//             onClick={() => fileRef.current.click()}
//             className="flex flex-col items-center justify-center gap-1 rounded-xl border-2
//               border-dashed border-[rgb(var(--border))] py-5 cursor-pointer
//               hover:border-[rgb(var(--border-strong))] hover:bg-[rgb(var(--bg))] transition"
//           >
//             <span className="text-2xl">📄</span>
//             <p className="text-xs text-[rgb(var(--text-muted))]">
//               Click to browse PDFs
//             </p>
//           </div>
//           <input
//             ref={fileRef}
//             type="file"
//             accept="application/pdf"
//             multiple
//             className="hidden"
//             onChange={handleFileChange}
//           />

//           {/* Selected PDF list */}
//           {pdfs.length > 0 && (
//             <ul className="mt-2 flex flex-col gap-1.5">
//               {pdfs.map((f, i) => (
//                 <li
//                   key={i}
//                   className="flex items-center justify-between rounded-lg border
//                     border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2"
//                 >
//                   <span className="text-xs text-[rgb(var(--text))] truncate max-w-[80%]">
//                     📄 {f.name}
//                   </span>
//                   <button
//                     type="button"
//                     onClick={() => removePdf(i)}
//                     className="text-rose-500 text-xs font-bold ml-2 hover:text-rose-700"
//                   >
//                     ✕
//                   </button>
//                 </li>
//               ))}
//             </ul>
//           )}
//         </div>

//         {/* Notification Type */}
//         <div>
//           <label className="mb-2 block text-xs font-semibold text-[rgb(var(--text-muted))]">
//             Notification Type
//           </label>
//           <div className="flex flex-wrap gap-2">
//             {NOTIF_TYPES.map((t) => (
//               <button key={t.value} type="button"
//                 onClick={() => setForm({ ...form, notificationType: t.value })}
//                 className={form.notificationType === t.value ? chipActive : chipIdle}
//               >
//                 {t.label}
//               </button>
//             ))}
//           </div>
//         </div>

//         {/* Send To */}
//         <div>
//           <label className="mb-2 block text-xs font-semibold text-[rgb(var(--text-muted))]">
//             Send To
//           </label>
//           <div className="flex flex-wrap gap-2">
//             {TARGET_TYPES.map((t) => (
//               <button key={t.value} type="button"
//                 onClick={() => setForm({ ...form, targetType: t.value, selectedRoles: [], classId: "" })}
//                 className={form.targetType === t.value ? chipActive : chipIdle}
//               >
//                 {t.label}
//               </button>
//             ))}
//           </div>
//         </div>

//         {/* Role selector */}
//         {form.targetType === "role" && (
//           <div className="rounded-xl border p-3 bg-[rgb(var(--bg))] border-[rgb(var(--border))]">
//             <label className="mb-2 block text-xs font-semibold text-[rgb(var(--text-muted))]">
//               Select Roles
//             </label>
//             <div className="flex flex-wrap gap-3">
//               {ROLES.map((r) => (
//                 <label key={r.value} className="flex cursor-pointer items-center gap-2">
//                   <input
//                     type="checkbox"
//                     checked={form.selectedRoles.includes(r.value)}
//                     onChange={() => toggleRole(r.value)}
//                     className="accent-[rgb(var(--primary))] h-4 w-4 rounded"
//                   />
//                   <span className="text-xs font-medium text-[rgb(var(--text))]">{r.label}</span>
//                 </label>
//               ))}
//             </div>
//           </div>
//         )}

//         {/* Class selector */}
//         {form.targetType === "class" && (
//           <select
//             className={inputCls}
//             value={form.classId}
//             onChange={(e) => setForm({ ...form, classId: e.target.value })}
//             required
//           >
//             <option value="">— Select Class —</option>
//             {classes.map((c) => (
//               <option key={c._id} value={c._id}>{c.name} {c.section}</option>
//             ))}
//           </select>
//         )}

//         {/* Send Mode */}
//         <div>
//           <label className="mb-2 block text-xs font-semibold text-[rgb(var(--text-muted))]">
//             When to Send
//           </label>
//           <div className="flex flex-wrap gap-2">
//             {SEND_MODES.map((m) => (
//               <button key={m.value} type="button"
//                 onClick={() => setForm({ ...form, sendMode: m.value, scheduledAt: "" })}
//                 className={form.sendMode === m.value ? chipActive : chipIdle}
//               >
//                 {m.label}
//               </button>
//             ))}
//           </div>
//         </div>

//         {/* Schedule picker — only when scheduled */}
//         {form.sendMode === "scheduled" && (
//           <div>
//             <label className="mb-2 block text-xs font-semibold text-[rgb(var(--text-muted))]">
//               Schedule Date & Time
//             </label>
//             <input
//               className={inputCls}
//               type="datetime-local"
//               value={form.scheduledAt}
//               min={minSchedule}
//               onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
//               required
//             />
//           </div>
//         )}

//         {/* Submit */}
//         <button
//           type="submit"
//           disabled={loading}
//           className="mt-1 w-full rounded-xl py-3 text-sm font-bold text-white transition
//             bg-[rgb(var(--primary))] hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
//         >
//           {loading ? "Sending…" : (
//             form.sendMode === "scheduled" ? "⏰ Schedule Notification" :
//             form.sendMode === "draft"     ? "💾 Save Draft" :
//                                             "📣 Send Now"
//           )}
//         </button>

//       </form>
//     </div>
//   );
// };

// export default CreateNotification;
import { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const TARGET_TYPES = [
  { value: "all",   label: "🌐 Everyone" },
  { value: "role",  label: "👥 By Role"  },
  { value: "class", label: "🏫 By Class" },
];

const ROLES = [
  { value: "teacher_admin", label: "Teachers"           },
  { value: "student_admin", label: "Students / Parents" },
  { value: "school_admin",  label: "School Admins"      },
];

const NOTIF_TYPES = [
  { value: "general",    label: "📢 General"    },
  { value: "exam",       label: "📝 Exam"       },
  { value: "result",     label: "🏆 Result"     },
  { value: "attendance", label: "📋 Attendance" },
  { value: "fee",        label: "💰 Fee"        },
  { value: "transport",  label: "🚌 Transport"  },
];

const inputCls = [
  "w-full rounded-xl border px-4 py-3 text-sm outline-none transition",
  "border-[rgb(var(--border))]",
  "bg-[rgb(var(--bg))]",
  "text-[rgb(var(--text))]",
  "placeholder:text-[rgb(var(--text-muted))]",
  "focus:border-[rgb(var(--border-strong))]",
  "focus:ring-2 focus:ring-[rgb(var(--border-strong))]/30",
].join(" ");

const chipBase   = "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all";
const chipActive = `${chipBase} bg-[rgb(var(--primary))] text-white border-[rgb(var(--primary))] shadow-sm`;
const chipIdle   = `${chipBase} bg-[rgb(var(--surface))] text-[rgb(var(--text-muted))] border-[rgb(var(--border))] hover:border-[rgb(var(--border-strong))] hover:text-[rgb(var(--text))]`;

// smaller chip used for section pills inside a class group
const sectionChipBase   = "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all";
const sectionChipActive = `${sectionChipBase} bg-[rgb(var(--primary))] text-white border-[rgb(var(--primary))] shadow-sm`;
const sectionChipIdle   = `${sectionChipBase} bg-[rgb(var(--bg))] text-[rgb(var(--text-muted))] border-[rgb(var(--border))] hover:border-[rgb(var(--border-strong))] hover:text-[rgb(var(--text))]`;

const SEND_MODES = [
  { value: "now",       label: "⚡ Send Now"       },
  { value: "scheduled", label: "🕐 Schedule Later" },
];

// builds the form's initial state — blank for create, prefilled when editing
const buildInitialForm = (n) => {
  if (!n) {
    return {
      title: "", message: "", startingDate: "",
      notificationType: "general", targetType: "all",
      selectedRoles: [], selectedClassDetails: [],
      sendMode: "now", scheduledAt: "",
    };
  }
  const t = (n.targets && n.targets[0]) || { type: "all" };
  return {
    title: n.title || "",
    message: n.message || "",
    startingDate: n.startingDate ? new Date(n.startingDate).toISOString().slice(0, 10) : "",
    notificationType: n.notificationType || "general",
    targetType: t.type === "role" || t.type === "class" ? t.type : "all",
    selectedRoles: t.roles || [],
    selectedClassDetails: (t.classes || []).map((c) => c.detailId),
    sendMode: n.status === "scheduled" ? "scheduled" : "now",
    scheduledAt: n.scheduledAt ? new Date(n.scheduledAt).toISOString().slice(0, 16) : "",
  };
};

const CreateNotification = ({ initialData = null, onSuccess = () => {}, onCancel = null }) => {
  const API       = import.meta.env.VITE_API_URL;
  const fileRef   = useRef();
  const isEditMode = Boolean(initialData?._id);

  const [form, setForm] = useState(() => buildInitialForm(initialData));

  // PDFs already saved on the notification (edit mode only) — user can remove these
  const [existingAttachments, setExistingAttachments] = useState(initialData?.attachments || []);

  const [pdfs,        setPdfs]        = useState([]);   // newly added File[]
  const [classesFlat, setClassesFlat] = useState([]);   // flat class+section list from API
  const [loading,     setLoading]     = useState(false);

  useEffect(() => {
    axios
      .get(`${API}/classes/flat`, { withCredentials: true })
      .then((r) => setClassesFlat(r.data.classes))
      .catch(() => {});
  }, []);

  // group the flat "Class 1 - A" / "Class 1 - B" entries back under their class
  const groupedClasses = useMemo(() => {
    const map = {};
    classesFlat.forEach((c) => {
      if (!map[c.classId]) {
        map[c.classId] = { classId: c.classId, className: c.className, sections: [] };
      }
      map[c.classId].sections.push(c);
    });
    return Object.values(map).sort((a, b) =>
      a.className.localeCompare(b.className, undefined, { numeric: true })
    );
  }, [classesFlat]);

  const toggleRole = (role) =>
    setForm((prev) => ({
      ...prev,
      selectedRoles: prev.selectedRoles.includes(role)
        ? prev.selectedRoles.filter((r) => r !== role)
        : [...prev.selectedRoles, role],
    }));

  const toggleSection = (detailId) =>
    setForm((prev) => ({
      ...prev,
      selectedClassDetails: prev.selectedClassDetails.includes(detailId)
        ? prev.selectedClassDetails.filter((id) => id !== detailId)
        : [...prev.selectedClassDetails, detailId],
    }));

  // toggle every section under one class at once (clicking the class name)
  const toggleClassGroup = (detailIds, allSelected) =>
    setForm((prev) => ({
      ...prev,
      selectedClassDetails: allSelected
        ? prev.selectedClassDetails.filter((id) => !detailIds.includes(id))
        : [...new Set([...prev.selectedClassDetails, ...detailIds])],
    }));

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const pdfsOnly = files.filter((f) => f.type === "application/pdf");
    if (pdfsOnly.length !== files.length) toast.warn("Only PDF files are allowed");
    setPdfs((prev) => {
      const combined  = [...prev, ...pdfsOnly];
      const allowedNew = Math.max(0, 5 - existingAttachments.length);
      if (combined.length > allowedNew) {
        toast.warn("Maximum 5 PDFs allowed");
        return combined.slice(0, allowedNew);
      }
      return combined;
    });
    // reset input so same file can be re-added after removal
    e.target.value = "";
  };

  const removePdf = (index) =>
    setPdfs((prev) => prev.filter((_, i) => i !== index));

  const removeExistingAttachment = (publicId) =>
    setExistingAttachments((prev) => prev.filter((a) => a.public_id !== publicId));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.sendMode === "scheduled" && !form.scheduledAt) {
      toast.error("Please pick a date & time to schedule");
      return;
    }

    if (form.targetType === "class" && form.selectedClassDetails.length === 0) {
      toast.error("Please select at least one class / section");
      return;
    }

    setLoading(true);

    // build FormData — needed for file upload
    const fd = new FormData();
    fd.append("title",            form.title);
    fd.append("message",          form.message);
    fd.append("notificationType", form.notificationType);
    fd.append("startingDate",     form.startingDate);

    if (form.sendMode === "scheduled") {
      fd.append("scheduledAt", new Date(form.scheduledAt).toISOString());
    }

    let target = { type: form.targetType };
    if (form.targetType === "role") {
      target.roles = form.selectedRoles;
    }
    if (form.targetType === "class") {
      // send full context per selected class+section so the backend doesn't
      // need to re-look-up the class doc just to resolve sectionId/className
      target.classes = classesFlat
        .filter((c) => form.selectedClassDetails.includes(c.detailId))
        .map((c) => ({
          classId:     c.classId,
          detailId:    c.detailId,
          sectionId:   c.sectionId,
          className:   c.className,
          sectionName: c.sectionName,
        }));
    }
    fd.append("target", JSON.stringify(target));

    if (isEditMode) {
      fd.append("keepAttachments", JSON.stringify(existingAttachments.map((a) => a.public_id)));
    }

    pdfs.forEach((file) => fd.append("pdfs", file));

    try {
      const url    = isEditMode ? `${API}/notifications/${initialData._id}` : `${API}/notifications`;
      const method = isEditMode ? "put" : "post";

      const { data } = await axios[method](url, fd, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(data.message);

      if (isEditMode) {
        onSuccess(data.notification);
      } else {
        // reset — stay on the create form so another notification can be sent
        setForm(buildInitialForm(null));
        setPdfs([]);
        setExistingAttachments([]);
        onSuccess(data.notification);
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || `Failed to ${isEditMode ? "update" : "send"} notification`);
    } finally {
      setLoading(false);
    }
  };

  // min datetime for schedule picker = now + 5 min
  const minSchedule = new Date(Date.now() + 5 * 60 * 1000)
    .toISOString().slice(0, 16);

  return (
    <div className="mx-auto max-w-lg rounded-2xl border p-6 shadow-sm
      bg-[rgb(var(--surface))] border-[rgb(var(--border))]">

      <h2 className="text-xl font-bold text-[rgb(var(--text))]">
        {isEditMode ? "✏️ Edit Notification" : "📣 Send Notification"}
      </h2>
      <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
        {isEditMode ? "Update the details below" : "Target specific roles, classes, or send to everyone"}
      </p>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">

        {/* Title */}
        <input
          className={inputCls}
          placeholder="Title (e.g. Holiday Announcement)"
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

        {/* Starting Date */}
        <div>
          <label className="mb-2 block text-xs font-semibold text-[rgb(var(--text-muted))]">
            Event Date
          </label>
          <input
            className={inputCls}
            type="date"
            value={form.startingDate}
            onChange={(e) => setForm({ ...form, startingDate: e.target.value })}
            min={new Date().toISOString().split("T")[0]}
          />
        </div>

        {/* PDF Upload */}
        <div>
          <label className="mb-2 block text-xs font-semibold text-[rgb(var(--text-muted))]">
            Attach PDFs <span className="font-normal">(max 5, 10 MB each)</span>
          </label>

          {/* Existing attachments — edit mode only, removable */}
          {isEditMode && existingAttachments.length > 0 && (
            <ul className="mb-2 flex flex-col gap-1.5">
              {existingAttachments.map((att) => (
                <li
                  key={att.public_id}
                  className="flex items-center justify-between rounded-lg border
                    border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2"
                >
                  <span className="text-xs text-[rgb(var(--text))] truncate max-w-[80%]">
                    📄 {att.name || "document.pdf"}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeExistingAttachment(att.public_id)}
                    className="text-rose-500 text-xs font-bold ml-2 hover:text-rose-700"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Drop zone */}
          <div
            onClick={() => fileRef.current.click()}
            className="flex flex-col items-center justify-center gap-1 rounded-xl border-2
              border-dashed border-[rgb(var(--border))] py-5 cursor-pointer
              hover:border-[rgb(var(--border-strong))] hover:bg-[rgb(var(--bg))] transition"
          >
            <span className="text-2xl">📄</span>
            <p className="text-xs text-[rgb(var(--text-muted))]">
              Click to browse PDFs
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Selected PDF list */}
          {pdfs.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1.5">
              {pdfs.map((f, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-lg border
                    border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2"
                >
                  <span className="text-xs text-[rgb(var(--text))] truncate max-w-[80%]">
                    📄 {f.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePdf(i)}
                    className="text-rose-500 text-xs font-bold ml-2 hover:text-rose-700"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Notification Type */}
        <div>
          <label className="mb-2 block text-xs font-semibold text-[rgb(var(--text-muted))]">
            Notification Type
          </label>
          <div className="flex flex-wrap gap-2">
            {NOTIF_TYPES.map((t) => (
              <button key={t.value} type="button"
                onClick={() => setForm({ ...form, notificationType: t.value })}
                className={form.notificationType === t.value ? chipActive : chipIdle}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Send To */}
        <div>
          <label className="mb-2 block text-xs font-semibold text-[rgb(var(--text-muted))]">
            Send To
          </label>
          <div className="flex flex-wrap gap-2">
            {TARGET_TYPES.map((t) => (
              <button key={t.value} type="button"
                onClick={() => setForm({
                  ...form,
                  targetType: t.value,
                  selectedRoles: [],
                  selectedClassDetails: [],
                })}
                className={form.targetType === t.value ? chipActive : chipIdle}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Role selector */}
        {form.targetType === "role" && (
          <div className="rounded-xl border p-3 bg-[rgb(var(--bg))] border-[rgb(var(--border))]">
            <label className="mb-2 block text-xs font-semibold text-[rgb(var(--text-muted))]">
              Select Roles
            </label>
            <div className="flex flex-wrap gap-3">
              {ROLES.map((r) => (
                <label key={r.value} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.selectedRoles.includes(r.value)}
                    onChange={() => toggleRole(r.value)}
                    className="accent-[rgb(var(--primary))] h-4 w-4 rounded"
                  />
                  <span className="text-xs font-medium text-[rgb(var(--text))]">{r.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Class + section selector — multi-select, grouped by class */}
        {form.targetType === "class" && (
          <div className="rounded-xl border p-3 bg-[rgb(var(--bg))] border-[rgb(var(--border))]">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold text-[rgb(var(--text-muted))]">
                Select Classes & Sections
              </label>
              {form.selectedClassDetails.length > 0 && (
                <span className="text-xs font-bold text-[rgb(var(--primary))]">
                  {form.selectedClassDetails.length} selected
                </span>
              )}
            </div>

            {groupedClasses.length === 0 && (
              <p className="text-xs text-[rgb(var(--text-muted))]">No classes found</p>
            )}

            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
              {groupedClasses.map((grp) => {
                const ids           = grp.sections.map((s) => s.detailId);
                const allSelected   = ids.every((id) => form.selectedClassDetails.includes(id));
                const someSelected  = ids.some((id) => form.selectedClassDetails.includes(id));
                // only show section pills when there's an actual section to pick (sectionId set)
                const hasSections   = grp.sections.some((s) => s.sectionId);

                return (
                  <div
                    key={grp.classId}
                    className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-2.5"
                  >
                    <button
                      type="button"
                      onClick={() => toggleClassGroup(ids, allSelected)}
                      className="flex w-full items-center gap-2 text-left"
                    >
                      <span
                        className={[
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] leading-none",
                          allSelected
                            ? "bg-[rgb(var(--primary))] border-[rgb(var(--primary))] text-white"
                            : someSelected
                            ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary))]/20"
                            : "border-[rgb(var(--border-strong))]",
                        ].join(" ")}
                      >
                        {allSelected ? "✓" : someSelected ? "–" : ""}
                      </span>
                      <span className="text-xs font-bold text-[rgb(var(--text))]">
                        {grp.className}
                      </span>
                    </button>

                    {hasSections && (
                      <div className="mt-2 flex flex-wrap gap-1.5 pl-6">
                        {grp.sections.map((s) => {
                          const checked = form.selectedClassDetails.includes(s.detailId);
                          return (
                            <button
                              key={s.detailId}
                              type="button"
                              onClick={() => toggleSection(s.detailId)}
                              className={checked ? sectionChipActive : sectionChipIdle}
                            >
                              {s.sectionName || "—"}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Send Mode */}
        <div>
          <label className="mb-2 block text-xs font-semibold text-[rgb(var(--text-muted))]">
            When to Send
          </label>
          <div className="flex flex-wrap gap-2">
            {SEND_MODES.map((m) => (
              <button key={m.value} type="button"
                onClick={() => setForm({ ...form, sendMode: m.value, scheduledAt: "" })}
                className={form.sendMode === m.value ? chipActive : chipIdle}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule picker — only when scheduled */}
        {form.sendMode === "scheduled" && (
          <div>
            <label className="mb-2 block text-xs font-semibold text-[rgb(var(--text-muted))]">
              Schedule Date & Time
            </label>
            <input
              className={inputCls}
              type="datetime-local"
              value={form.scheduledAt}
              min={minSchedule}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              required
            />
          </div>
        )}

        {/* Submit */}
        <div className="mt-1 flex gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-xl py-3 text-sm font-semibold border transition
                border-[rgb(var(--border))] text-[rgb(var(--text-muted))]
                hover:bg-[rgb(var(--bg))] hover:text-[rgb(var(--text))]"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className={`${onCancel ? "flex-1" : "w-full"} rounded-xl py-3 text-sm font-bold text-white transition
              bg-[rgb(var(--primary))] hover:opacity-90 active:scale-[0.98] disabled:opacity-50`}
          >
            {loading ? (isEditMode ? "Saving…" : "Sending…") : isEditMode ? "💾 Save Changes" : (
              form.sendMode === "scheduled" ? "⏰ Schedule Notification" :
              form.sendMode === "draft"     ? "💾 Save Draft" :
                                              "📣 Send Now"
            )}
          </button>
        </div>

      </form>
    </div>
  );
};

export default CreateNotification;