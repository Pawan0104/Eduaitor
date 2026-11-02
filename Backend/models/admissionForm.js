import mongoose from "mongoose";

/**
 * Per-school customization of the admission (new student) wizard.
 *
 * `steps` is stored as flexible JSON because the school admin can invent
 * custom steps and fields at runtime. Shape (validated in the controller):
 *
 *   [
 *     {
 *       key: "builtin_1",        // stable id; "builtin_N" for core steps
 *       title: "Student Details",
 *       builtin: true,
 *       fields: [
 *         {
 *           key: "firstName",    // built-in field name or "cf_<random>"
 *           label: "First Name",
 *           type: "text",
 *           required: true,
 *           visible: true,
 *           placeholder: "",
 *           help: "",
 *           options: [],
 *           builtin: true,
 *         },
 *       ],
 *     },
 *     {
 *       key: "cs_ab12cd",        // custom step
 *       title: "Medical Details",
 *       builtin: false,
 *       fields: [ ...custom fields... ],
 *     },
 *   ]
 */
const admissionFormSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      unique: true,
      index: true,
    },
    steps: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model("AdmissionForm", admissionFormSchema);
