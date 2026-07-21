import { useNavigate } from "react-router-dom";
import { FiUser } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";

const toneStyles = {
  blue: "border-blue-200 bg-blue-600 text-white",
  orange: "border-orange-200 bg-orange-500 text-white",
  green: "border-emerald-200 bg-emerald-600 text-white",
  red: "border-rose-200 bg-rose-600 text-white",
  yellow: "border-amber-200 bg-amber-400 text-slate-900",
  violet: "border-violet-200 bg-violet-600 text-white",
  sky: "border-sky-200 bg-sky-600 text-white",
};

/**
 * Shared Campus shell for every role.
 *
 * @param {object} props
 * @param {string} props.roleLabel
 * @param {string} [props.subtitle]
 * @param {string} [props.profilePath]
 * @param {Array<{title,tone,rows,path?,actions?}>} props.summaries
 * @param {Array<{label,path,icon: Component}>} props.modules
 * @param {Array<{label,value,color}>} [props.statBars]
 * @param {string} [props.statBarsTitle]
 * @param {Array<{key,label,height,value?}>} [props.feeTrend]
 * @param {function} [props.formatMoney]
 * @param {Array<{id,title,meta}>} [props.notices]
 * @param {Array<{id,title,meta}>} [props.events]
 * @param {boolean} [props.showModules]
 * @param {boolean} [props.showStatBars]
 * @param {boolean} [props.showFeeTrend]
 * @param {boolean} [props.showNotices]
 * @param {boolean} [props.showEvents]
 * @param {React.ReactNode} [props.banner]
 * @param {string} [props.menuPath]
 */
export default function RoleCampusDashboard({
  roleLabel = "User",
  subtitle = "",
  profilePath,
  summaries = [],
  modules = [],
  statBars = [],
  statBarsTitle = "Statistics",
  feeTrend = [],
  formatMoney = (v) => String(v ?? 0),
  notices = [],
  events = [],
  showModules = true,
  showStatBars = true,
  showFeeTrend = false,
  showNotices = true,
  showEvents = true,
  banner = null,
  menuPath,
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const displayName = user?.name || user?.email || user?.username || roleLabel;
  const initials =
    String(displayName)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "U";

  const resolvedProfile = profilePath || menuPath || "/";
  const resolvedMenu = menuPath || profilePath || "/";
  const statMax = Math.max(...statBars.map((b) => Number(b.value) || 0), 1);

  return (
    <div className="space-y-5">
      <section className="grid gap-4 xl:grid-cols-[260px_1fr]">
        <article className="flex flex-col items-center rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 text-center shadow-sm">
          {user?.school_logo ? (
            <img
              src={user.school_logo}
              alt=""
              className="h-24 w-24 rounded-full object-cover ring-4 ring-slate-100"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-800 text-2xl font-black text-white ring-4 ring-slate-100">
              {initials}
            </div>
          )}
          <h2 className="mt-4 text-xl font-black text-[rgb(var(--text))]">
            {displayName}
          </h2>
          <p className="text-sm font-semibold text-[rgb(var(--text-muted))]">
            {roleLabel}
          </p>
          {(subtitle || user?.school_name) && (
            <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
              {subtitle || user?.school_name}
            </p>
          )}
          <button
            type="button"
            onClick={() => navigate(resolvedProfile)}
            className="mt-4 rounded-full bg-sky-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-sky-700"
          >
            View Profile
          </button>
        </article>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {summaries.map((card) => (
            <SummaryCard key={card.title} {...card} navigate={navigate} />
          ))}
          {banner}
        </div>
      </section>

      <section
        className={`grid gap-5 ${
          showStatBars || showFeeTrend
            ? "xl:grid-cols-[1.05fr_0.95fr]"
            : "grid-cols-1"
        }`}
      >
        {showModules && modules.length > 0 && (
          <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-base font-black text-[rgb(var(--text))]">
                Modules
              </h3>
              <button
                type="button"
                onClick={() => navigate(resolvedMenu)}
                className="text-xs font-bold text-sky-600 hover:underline"
              >
                All menus
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {modules.map((tile) => {
                const Icon = tile.icon;
                return (
                  <button
                    key={tile.label}
                    type="button"
                    onClick={() => navigate(tile.path)}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-4 text-center transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-xl text-sky-600 dark:bg-sky-950/50 dark:text-sky-300">
                      {Icon ? <Icon /> : null}
                    </span>
                    <span className="text-xs font-bold text-[rgb(var(--text))]">
                      {tile.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {(showStatBars || showFeeTrend) && (
          <div className="space-y-5">
            {showStatBars && statBars.length > 0 && (
              <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 shadow-sm sm:p-5">
                <h3 className="text-base font-black text-[rgb(var(--text))]">
                  {statBarsTitle}
                </h3>
                <div className="mt-5 flex h-40 items-end gap-3">
                  {statBars.map((bar) => (
                    <div
                      key={bar.label}
                      className="flex flex-1 flex-col items-center gap-2"
                    >
                      <span className="text-[11px] font-bold text-[rgb(var(--text))]">
                        {bar.value}
                      </span>
                      <div className="flex h-28 w-full items-end justify-center rounded-t-lg bg-[rgb(var(--bg))]">
                        <div
                          className={`w-full max-w-10 rounded-t-md ${bar.color || "bg-emerald-500"}`}
                          style={{
                            height: `${Math.max(
                              (Number(bar.value) / statMax) * 100,
                              bar.value > 0 ? 12 : 4,
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">
                        {bar.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showFeeTrend && feeTrend.length > 0 && (
              <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 shadow-sm sm:p-5">
                <h3 className="text-base font-black text-[rgb(var(--text))]">
                  Fees Collected
                </h3>
                <div className="mt-5 flex h-40 items-end gap-2">
                  {feeTrend.map((month) => (
                    <div
                      key={month.key}
                      className="flex flex-1 flex-col items-center gap-2"
                    >
                      <div className="flex h-28 w-full items-end justify-center rounded-t-lg bg-[rgb(var(--bg))]">
                        <div
                          className="w-full max-w-9 rounded-t-md bg-violet-500"
                          style={{ height: `${month.height}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-[rgb(var(--text-muted))]">
                        {month.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {(showNotices || showEvents) && (notices.length > 0 || events.length > 0 || showNotices || showEvents) && (
        <section className="grid gap-4 md:grid-cols-2">
          {showNotices && (
            <MiniList
              title="Latest Notices"
              empty="No notices yet"
              items={notices.slice(0, 3)}
            />
          )}
          {showEvents && (
            <MiniList
              title="Upcoming Events"
              empty="No upcoming events"
              items={events.slice(0, 3)}
            />
          )}
        </section>
      )}
    </div>
  );
}

function SummaryCard({ title, tone = "blue", rows = [], path, actions, navigate }) {
  return (
    <button
      type="button"
      onClick={() => path && navigate(path)}
      className={`rounded-3xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${toneStyles[tone] || toneStyles.blue}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-black tracking-wide">{title}</h3>
        <FiUser className="opacity-70" />
      </div>
      <dl className="space-y-1.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <dt className="opacity-90">{label}</dt>
            <dd className="font-black">{value}</dd>
          </div>
        ))}
      </dl>
      {actions?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-black/10 pt-3">
          {actions.map((a) => (
            <span
              key={a.label}
              className="rounded-full bg-black/10 px-2.5 py-1 text-[11px] font-bold"
            >
              {a.label}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

function MiniList({ title, items, empty }) {
  return (
    <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-black text-[rgb(var(--text))]">{title}</h3>
      {!items?.length ? (
        <p className="text-sm text-[rgb(var(--text-muted))]">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2"
            >
              <p className="text-sm font-bold text-[rgb(var(--text))]">
                {item.title}
              </p>
              {item.meta && (
                <p className="text-xs text-[rgb(var(--text-muted))]">{item.meta}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
