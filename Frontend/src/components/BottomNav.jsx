import { useNavigate, useLocation } from "react-router-dom";

/**
 * Reusable bottom navigation bar.
 *
 * Props:
 * - items: Array<{
 *     label: string,
 *     icon: ReactNode,
 *     path?: string,        // navigates here on click + used for active highlight
 *     onClick?: () => void, // custom handler (takes priority over navigate)
 *     match?: (pathname: string) => boolean, // custom active-state check
 *   }>
 * - className: extra classes for the <nav> wrapper (e.g. responsive visibility)
 */
const BottomNav = ({ items = [], className = "" }) => {
  const navigate = useNavigate();
  const location = useLocation();

  if (!items.length) return null;

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-40 flex items-stretch justify-between border-t ${className}`}
      style={{
        background: "rgb(var(--bg))",
        borderColor: "rgb(var(--border))",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
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
              className="text-[18px]"
              style={{
                color: isActive
                  ? "rgb(var(--primary))"
                  : "rgb(var(--text-muted))",
              }}
            >
              {item.icon}
            </span>
            <span
              className="text-[10.5px] font-bold"
              style={{
                color: isActive
                  ? "rgb(var(--primary))"
                  : "rgb(var(--text-muted))",
              }}
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
