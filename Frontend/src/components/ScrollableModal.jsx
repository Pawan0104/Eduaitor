/**
 * Shared modal shell: keeps header/footer visible and scrolls tall form bodies.
 */
export default function ScrollableModal({
  open = true,
  onClose,
  title,
  children,
  footer,
  wide = false,
  zClass = "z-50",
}) {
  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 ${zClass} flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm`}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`my-auto flex max-h-[min(92vh,880px)] w-full ${
          wide ? "max-w-3xl" : "max-w-md"
        } flex-col overflow-hidden rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--text))] shadow-xl`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {(title || onClose) && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[rgb(var(--border))] px-4 py-3 sm:px-6 sm:py-4">
            <h2 className="truncate text-lg font-semibold">{title}</h2>
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-2 py-1 text-xl leading-none text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--bg))]"
                aria-label="Close"
              >
                ×
              </button>
            ) : null}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-[rgb(var(--border))] px-4 py-3 sm:px-6 sm:py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Class helpers for pages that keep their own markup. */
export const modalOverlayCls =
  "fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm";

export const modalPanelCls =
  "my-auto flex max-h-[min(92vh,880px)] w-full max-w-md flex-col overflow-hidden rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--text))] shadow-xl";

export const modalBodyCls =
  "min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-6";

export const modalFooterCls =
  "flex shrink-0 gap-3 border-t border-[rgb(var(--border))] p-4 sm:p-6";
