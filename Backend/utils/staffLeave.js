/** Staff leave credit-period helpers. */

export const CREDIT_FREQUENCIES = [
  "monthly",
  "quarterly",
  "half-yearly",
  "yearly",
];

export function normalizeCreditFrequency(value) {
  const raw = String(value || "yearly")
    .toLowerCase()
    .trim()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");
  if (raw === "halfyearly" || raw === "half-year") return "half-yearly";
  if (raw === "annual" || raw === "annually") return "yearly";
  if (CREDIT_FREQUENCIES.includes(raw)) return raw;
  return "yearly";
}

const roundHalf = (n) => Math.round(Number(n) * 2) / 2;

/** Inclusive calendar days between from/to (min 0.5). */
export function countLeaveDays(fromDate, toDate) {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  from.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return 0;
  }
  const ms = to.getTime() - from.getTime();
  const days = Math.floor(ms / 86400000) + 1;
  return Math.max(0.5, days);
}

/**
 * Period key for a date under the given credit frequency.
 * monthly → 2025-M04, quarterly → 2025-Q2, half-yearly → 2025-H1, yearly → 2025
 */
export function getPeriodKey(date = new Date(), frequency = "yearly") {
  const freq = normalizeCreditFrequency(frequency);
  const d = new Date(date);
  const y = d.getFullYear();
  const m = d.getMonth() + 1; // 1-12

  if (freq === "monthly") {
    return `${y}-M${String(m).padStart(2, "0")}`;
  }
  if (freq === "quarterly") {
    const q = Math.ceil(m / 3);
    return `${y}-Q${q}`;
  }
  if (freq === "half-yearly") {
    return `${y}-H${m <= 6 ? 1 : 2}`;
  }
  return String(y);
}

export function periodLabel(periodKey = "") {
  const key = String(periodKey);
  const m = key.match(/^(\d{4})-M(\d{2})$/);
  if (m) {
    const month = new Date(Number(m[1]), Number(m[2]) - 1, 1).toLocaleString(
      "en-IN",
      { month: "short", year: "numeric" },
    );
    return month;
  }
  const q = key.match(/^(\d{4})-Q([1-4])$/);
  if (q) return `Q${q[2]} ${q[1]}`;
  const h = key.match(/^(\d{4})-H([12])$/);
  if (h) return `H${h[2]} ${h[1]}`;
  if (/^\d{4}$/.test(key)) return key;
  return key || "—";
}

export { roundHalf };
