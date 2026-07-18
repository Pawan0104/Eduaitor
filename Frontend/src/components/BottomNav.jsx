import { useNavigate, useLocation } from "react-router-dom";

/**
 * Reusable bottom navigation bar.
 * Colors follow system theme tokens (same as Topbar / Sidebar).
 *
 * Props:
 * - items: Array<{
 *     label: string,
 *     icon: ReactNode,
 *     path?: string,
 *     onClick?: () => void,
 *     match?: (pathname: string) => boolean,
 *   }>
 * - className: extra classes for the <nav> wrapper
 */
const BottomNav = ({ items = [], className = "" }) => {
  const navigate = useNavigate();
  const location = useLocation();

  if (!items.length) return null;

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-40 flex items-stretch justify-between
        bg-[rgb(var(--sidebar))] border-t border-[rgb(var(--border-strong))]
        shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur ${className}`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map((item) => {
        const isActive = item.match
          ? item.match(location.pathname)
          : item.path && location.pathname === item.path;

        return (
          <button
            key={item.label}
            onClick={() =>
              item.onClick ? item.onClick() : item.path && navigate(item.path)
            }
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 active:scale-95 transition-transform"
          >
            <span
              className={`flex items-center justify-center w-9 h-9 rounded-xl text-[17px] transition-all duration-200
                ${
                  isActive
                    ? "bg-[rgb(var(--primary))] text-white shadow-sm"
                    : "bg-[rgba(var(--primary),0.08)] text-[rgb(var(--primary))]"
                }`}
            >
              {item.icon}
            </span>
            <span
              className={`text-[10.5px] font-bold transition-colors duration-200
                ${
                  isActive
                    ? "text-[rgb(var(--primary))]"
                    : "text-[rgb(var(--sidebar-text))]"
                }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
