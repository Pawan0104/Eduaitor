// QA helper: a banner with a "Fill dummy data" button shown at the top of
// people add/edit forms. Test-only — never auto-applied.

const DummyFillBar = ({ hint, onFill, className = "" }) => (
  <div
    className={`mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-amber-400 bg-amber-50 px-4 py-3 ${className}`}
  >
    <div className="min-w-0">
      <p className="text-sm font-semibold text-amber-900">Test data</p>
      {hint ? <p className="text-xs text-amber-800">{hint}</p> : null}
    </div>
    <button
      type="button"
      onClick={onFill}
      className="shrink-0 rounded-lg border border-amber-500 bg-white px-4 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1"
    >
      Fill dummy data
    </button>
  </div>
);

export default DummyFillBar;