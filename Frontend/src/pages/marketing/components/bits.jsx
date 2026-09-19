import { CHANNEL_LABELS, CHANNEL_COLORS } from "../marketingApi";

export function ChannelBadge({ channel, size = "sm" }) {
  const c = CHANNEL_COLORS[channel] || { bg: "#F3F4F6", icon: "#6B7280" };
  const icon = channel === "whatsapp" ? "💬" : channel === "blog" ? "✍️" : "📣";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-extrabold"
      style={{ background: c.bg, color: c.icon }}
    >
      <span className="text-[10px]">{icon}</span>
      {CHANNEL_LABELS[channel] || channel}
    </span>
  );
}

const STATUS_STYLE = {
  DRAFT: { bg: "#F8FAFC", color: "#64748B" },
  PENDING: { bg: "#FFFBEB", color: "#D97706" },
  APPROVED: { bg: "#F0FDF4", color: "#16A34A" },
  SCHEDULED: { bg: "#EFF6FF", color: "#2563EB" },
  PUBLISHING: { bg: "#EEF2FF", color: "#4F46E5" },
  PUBLISHED: { bg: "#ECFDF5", color: "#059669" },
  REJECTED: { bg: "#FFF1F2", color: "#E11D48" },
  FAILED: { bg: "#FDF2F8", color: "#DB2777" },
  RETRY_EXHAUSTED: { bg: "#FEE2E2", color: "#DC2626" },
};

export function StatusChip({ status }) {
  const s = STATUS_STYLE[status] || { bg: "#F3F4F6", color: "#6B7280" };
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide"
      style={{ background: s.bg, color: s.color }}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function ActionButton({ children, onClick, tone = "primary", disabled }) {
  const tones = {
    primary: {
      background:
        "linear-gradient(135deg, rgb(var(--sidebar)) 0%, rgb(var(--primary)) 100%)",
      color: "#fff",
    },
    soft: { background: "rgb(var(--surface))", color: "rgb(var(--text))", border: "1px solid rgb(var(--border))" },
    danger: { background: "#FEE2E2", color: "#B91C1C" },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl px-3.5 py-2 text-[12.5px] font-extrabold active:scale-95 transition-transform disabled:opacity-40"
      style={tones[tone]}
    >
      {children}
    </button>
  );
}