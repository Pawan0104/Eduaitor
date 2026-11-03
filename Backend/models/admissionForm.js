import mongoose from "mongoose";

/**
 * Per-school customization of ERP data-entry forms.
 *
 * `formType` selects which surface the steps configure:
 *   - admission     → Add Student wizard
 *   - lead          → Lead Management create form
 *   - registration  → Registration + public registration forms
 *
 * `steps` is stored as flexible JSON because the school admin can invent
 * custom steps and fields at runtime. Shape (validated in the controller):
 *
 *   [
 *     {
 *       key: "builtin_1",
 *       title: "Student Details",
 *       builtin: true,
 *       removedFieldKeys: ["bloodGroup"], // default fields the admin deleted
 *       fields: [
 *         {
 *           key: "firstName",
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
 *   ]
 */
const FORM_TYPES = ["admission", "lead", "registration"];

const admissionFormSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    formType: {
      type: String,
      enum: FORM_TYPES,
      default: "admission",
      index: true,
    },
    steps: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    /**
     * How the Add Student admission form is presented for this school:
     * - steps  → classic wizard (must complete current step to continue)
     * - single → all sections on one scrollable page
     */
    layoutMode: {
      type: String,
      enum: ["steps", "single"],
      default: "steps",
    },
  },
  { timestamps: true }
);

admissionFormSchema.index({ schoolId: 1, formType: 1 }, { unique: true });

export const SCHOOL_FORM_TYPES = FORM_TYPES;
export default mongoose.model("AdmissionForm", admissionFormSchema);
