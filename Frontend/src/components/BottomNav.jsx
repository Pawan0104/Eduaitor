import { useNavigate, useLocation } from "react-router-dom";

/**
 * Mobile app bottom dock (Capacitor / phone viewport).
 */
const BottomNav = ({ items = [], className = "" }) => {
  const navigate = useNavigate();
  const location = useLocation();

  if (!items.length) return null;

  return (
    <nav
      className={`app-bottom-dock fixed bottom-0 left-0 right-0 z-40 px-3 pointer-events-none ${className}`}
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      aria-label="Primary"
    >
      <div
        className="pointer-events-auto mx-auto flex max-w-lg items-stretch justify-between gap-0.5
          rounded-[1.35rem] border border-[rgb(var(--border))]
          bg-[rgb(var(--surface))]/92 px-1.5 py-1.5 shadow-[0_-8px_32px_rgba(15,23,42,0.12)]
          backdrop-blur-xl"
      >
        {items.map((item) => {
          const isActive = item.match
            ? item.match(location.pathname)
            : item.path &&
              (location.pathname === item.path ||
                location.pathname.startsWith(`${item.path}/`));

          return (
            <button
              key={item.label}
              type="button"
              onClick={() =>
                item.onClick ? item.onClick() : item.path && navigate(item.path)
              }
              className={`relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5
                rounded-2xl px-1 py-1 transition active:scale-95
                ${isActive ? "bg-[rgba(var(--primary),0.1)]" : ""}`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-xl text-[16px] transition-all
                  ${
                    isActive
                      ? "bg-[rgb(var(--primary))] text-[rgb(var(--on-primary,255_255_255))] shadow-md"
                      : "text-[rgb(var(--text-muted))]"
                  }`}
              >
                {item.icon}
              </span>
              <span
                className={`max-w-full truncate text-[10px] font-bold leading-tight
                  ${
                    isActive
                      ? "text-[rgb(var(--primary))]"
                      : "text-[rgb(var(--text-muted))]"
                  }`}
              >
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-[rgb(var(--primary))]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
