import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import AdmissionFormBuilder from "../components/AdmissionFormBuilder";

/**
 * Standalone page wrapper around the Admission Form Builder so admins can
 * reach it from the menu, not just from the Add Admission wizard.
 */
const AdmissionFormSettings = () => {
  const navigate = useNavigate();

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen text-[rgb(var(--text))]">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))] mb-4"
      >
        <FaArrowLeft size={12} /> Back
      </button>

      <div className="mb-4">
        <h1 className="text-2xl font-bold">Admission Form</h1>
        <p className="text-sm text-[rgb(var(--text-muted))]">
          Control what the Add Student wizard asks for. Changes apply to your
          school only.
        </p>
      </div>

      <AdmissionFormBuilder
        inline
        onSaved={(steps) => {
          // Keep the wizard in sync without a full reload.
          window.dispatchEvent(
            new CustomEvent("admission-form-updated", { detail: steps })
          );
        }}
      />
    </div>
  );
};

export default AdmissionFormSettings;
