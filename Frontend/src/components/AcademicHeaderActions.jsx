const ArrowRight = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14"></path>
    <path d="m12 5 7 7-7 7"></path>
  </svg>
);

export default function AcademicHeaderActions() {
  return (
    <div className="flex items-center gap-2 shrink-0 flex-wrap">
      <button
        type="button"
        onClick={() => (window.location.href = "/school/reports")}
        className="px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold whitespace-nowrap cursor-pointer"
      >
        Student subject report
      </button>
      <button
        type="button"
        onClick={() => (window.location.href = "/school/registrations")}
        className="px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold whitespace-nowrap cursor-pointer"
      >
        Registration Sync
      </button>
      <button
        type="button"
        onClick={() => (window.location.href = "/school/admission-form")}
        className="px-3.5 py-2 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
      >
        <span>test in Admission form</span>
        <ArrowRight />
      </button>
      <button
        type="button"
        onClick={() => (window.location.href = "/school/menu")}
        className="px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold whitespace-nowrap cursor-pointer"
      >
        Dashboard
      </button>
    </div>
  );
}
