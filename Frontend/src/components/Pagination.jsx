const PAGE_SIZES = [10, 25, 50, 100];

const buildPages = (currentPage, totalPages) => {
  const delta = 2;
  const pages = [];
  const left = Math.max(1, currentPage - delta);
  const right = Math.min(totalPages, currentPage + delta);

  if (left > 1) {
    pages.push(1);
    if (left > 2) pages.push("…");
  }
  for (let p = left; p <= right; p += 1) pages.push(p);
  if (right < totalPages) {
    if (right < totalPages - 1) pages.push("…");
    pages.push(totalPages);
  }
  return pages;
};

const btn =
  "min-w-[36px] h-9 px-2 text-sm rounded-lg font-sans transition flex items-center justify-center";

const Chevron = ({ dir }) => (
  <svg
    className={`w-4 h-4 ${dir === "right" ? "rotate-180" : ""}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 19l-7-7 7-7"
    />
  </svg>
);

const Pagination = ({
  page = 1,
  totalPages = 1,
  total = 0,
  limit = 10,
  onPageChange,
  onLimitChange,
  className = "",
}) => {
  if (total === 0) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const showPages = totalPages > 1;

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 ${className}`}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-xs text-[rgb(var(--text-muted))]">
          Showing <span className="font-semibold">{from}</span>–
          <span className="font-semibold">{to}</span> of{" "}
          <span className="font-semibold">{total}</span>
        </p>

        {onLimitChange && (
          <label className="flex items-center gap-1.5 text-xs text-[rgb(var(--text-muted))]">
            <span>Rows</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              aria-label="Records per page"
              className="border border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-md px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-[rgb(var(--primary))]"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {showPages && (
        <div className="flex items-center justify-center gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className={`${btn} border border-stone-200 text-stone-500 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed`}
            aria-label="Previous page"
          >
            <Chevron dir="left" />
          </button>

          {buildPages(page, totalPages).map((p, i) =>
            p === "…" ? (
              <span
                key={`dots-${i}`}
                className="text-stone-400 px-1 font-sans text-sm select-none"
              >
                …
              </span>
            ) : (
              <button
                type="button"
                key={p}
                onClick={() => onPageChange(p)}
                className={`${btn} border font-medium ${
                  p === page
                    ? "bg-[rgb(var(--primary))] text-white border-[rgb(var(--primary))]"
                    : "border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                {p}
              </button>
            ),
          )}

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className={`${btn} border border-stone-200 text-stone-500 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed`}
            aria-label="Next page"
          >
            <Chevron dir="right" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Pagination;
