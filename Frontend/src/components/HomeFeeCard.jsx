import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../config/axios";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

const COLORS = {
  total: "#2563EB",
  paid: "#10B981",
  due: "#F43F5E",
  track: "#E2E8F0",
};

function fmtINR(n) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
}

/** Build SVG donut arcs for paid + due (of total). */
function buildSlices(paid, due) {
  const total = Math.max(0, Number(paid) + Number(due));
  if (total <= 0) {
    return [
      { key: "empty", color: COLORS.track, dash: 0, offset: 0, pct: 0 },
    ];
  }
  const C = 2 * Math.PI * 40; // r=40
  const paidLen = (paid / total) * C;
  const dueLen = (due / total) * C;
  return [
    {
      key: "paid",
      color: COLORS.paid,
      dash: paidLen,
      offset: 0,
      pct: Math.round((paid / total) * 100),
    },
    {
      key: "due",
      color: COLORS.due,
      dash: dueLen,
      offset: -paidLen,
      pct: Math.round((due / total) * 100),
    },
  ];
}

function FeePie({ paid, due, totalLabel }) {
  const slices = useMemo(() => buildSlices(paid, due), [paid, due]);
  const C = 2 * Math.PI * 40;
  const hasData = Number(paid) + Number(due) > 0;

  return (
    <div className="relative shrink-0" style={{ width: 128, height: 128 }}>
      <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
        <circle
          cx="64"
          cy="64"
          r="40"
          fill="none"
          stroke={COLORS.track}
          strokeWidth="18"
        />
        {hasData &&
          slices.map((s) => (
            <circle
              key={s.key}
              cx="64"
              cy="64"
              r="40"
              fill="none"
              stroke={s.color}
              strokeWidth="18"
              strokeDasharray={`${s.dash} ${Math.max(0, C - s.dash)}`}
              strokeDashoffset={s.offset}
              strokeLinecap="butt"
              style={{ transition: "stroke-dasharray 0.6s ease" }}
            />
          ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
        <span
          className="text-[10px] font-bold uppercase tracking-wide"
          style={{ color: "rgb(var(--text-muted))" }}
        >
          Total
        </span>
        <span
          className="max-w-[88px] truncate text-center text-[13px] font-extrabold leading-tight"
          style={{ color: COLORS.total }}
          title={totalLabel}
        >
          {totalLabel}
        </span>
      </div>
    </div>
  );
}

/**
 * Fee structure summary — total / paid / due pie — shown before BlogFeed.
 */
export default function HomeFeeCard({ className = "" }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const canShow = user?.role === "student_admin" && user?.loginAs === "parent";
  const feePath = "/parent/fees";

  useEffect(() => {
    if (!canShow) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get("/fees/parent/student/me");
        if (cancelled) return;
        setData(res.data || null);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canShow, user?._id, user?.student_id, user?.activeChildId]);

  if (!canShow) return null;

  const totalFee = Math.max(
    0,
    Number(data?.finalFee) || Number(data?.totalFee) || Number(data?.totalFees) || 0,
  );
  const paid = Math.max(0, Number(data?.totalPaid) || 0);
  const due = Math.max(
    0,
    Number(data?.balanceDue) ||
      Number(data?.totalDue) ||
      Math.max(0, totalFee - paid),
  );
  // Keep pie consistent: paid + due should reflect total owed
  const piePaid = Math.min(paid, totalFee || paid);
  const pieDue = totalFee > 0 ? Math.max(0, totalFee - piePaid) : due;

  const rows = [
    {
      key: "total",
      label: t("home.feeTotal", "Total fee"),
      value: fmtINR(totalFee),
      color: COLORS.total,
    },
    {
      key: "paid",
      label: t("home.feePaid", "Paid"),
      value: fmtINR(paid),
      color: COLORS.paid,
    },
    {
      key: "due",
      label: t("home.feeDue", "Due"),
      value: fmtINR(due),
      color: COLORS.due,
    },
  ];

  return (
    <section
      className={`rounded-[1.35rem] border overflow-hidden ${className}`}
      style={{
        background: "rgb(var(--surface))",
        borderColor: "rgb(var(--border))",
        boxShadow: "0 10px 28px rgba(15,23,42,0.06)",
      }}
    >
      <div
        className="flex items-center justify-between gap-2 border-b px-3.5 py-3"
        style={{ borderColor: "rgb(var(--border))" }}
      >
        <div>
          <h3
            className="text-[13px] font-extrabold"
            style={{ color: "rgb(var(--text))" }}
          >
            {t("home.feeTitle", "Fee structure")}
          </h3>
          <p
            className="text-[11px] font-semibold"
            style={{ color: "rgb(var(--text-muted))" }}
          >
            {t("home.feeHint", "Total, paid & due overview")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(feePath)}
          className="text-[11px] font-extrabold"
          style={{ color: COLORS.total }}
        >
          {t("common.viewAll", "View all")}
        </button>
      </div>

      <div className="p-3.5">
        {loading ? (
          <p
            className="py-8 text-center text-[12px] font-semibold"
            style={{ color: "rgb(var(--text-muted))" }}
          >
            {t("home.feeLoading", "Loading fees…")}
          </p>
        ) : !data ? (
          <p
            className="py-6 text-center text-[12px] font-semibold"
            style={{ color: "rgb(var(--text-muted))" }}
          >
            {t("home.feeEmpty", "Fee details not available yet.")}
          </p>
        ) : (
          <div className="flex items-center gap-4">
            <FeePie
              paid={piePaid}
              due={pieDue}
              totalLabel={fmtINR(totalFee)}
            />

            <div className="min-w-0 flex-1 space-y-2.5">
              {rows.map((r) => (
                <div
                  key={r.key}
                  className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2"
                  style={{
                    borderColor: "rgb(var(--border))",
                    background: "rgb(var(--bg))",
                  }}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: r.color }}
                    />
                    <span
                      className="truncate text-[12px] font-bold"
                      style={{ color: "rgb(var(--text))" }}
                    >
                      {r.label}
                    </span>
                  </span>
                  <span
                    className="shrink-0 text-[12px] font-extrabold tabular-nums"
                    style={{ color: r.color }}
                  >
                    {r.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Color legend under pie */}
        {!loading && data && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            {[
              { label: t("home.feePaid", "Paid"), color: COLORS.paid },
              { label: t("home.feeDue", "Due"), color: COLORS.due },
              { label: t("home.feeTotal", "Total"), color: COLORS.total },
            ].map((l) => (
              <span key={l.label} className="inline-flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ background: l.color }}
                />
                <span
                  className="text-[10px] font-bold"
                  style={{ color: "rgb(var(--text-muted))" }}
                >
                  {l.label}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
