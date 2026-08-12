/** Shared loading spinner — use across pages for consistent feedback. */
export default function LoadingSpinner({
  size = "md",
  label = "Loading…",
  className = "",
  inline = false,
}) {
  const sizeClass =
    size === "sm"
      ? "h-4 w-4 border-2"
      : size === "lg"
        ? "h-10 w-10 border-4"
        : "h-8 w-8 border-[3px]";

  const spinner = (
    <div
      className={`${sizeClass} rounded-full border-[rgb(var(--primary))] border-t-transparent animate-spin shrink-0 ${className}`}
      role="status"
      aria-label={label}
    />
  );

  if (inline) return spinner;

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-[rgb(var(--text-muted))]">
      {spinner}
      {label ? <p className="text-sm">{label}</p> : null}
    </div>
  );
}
