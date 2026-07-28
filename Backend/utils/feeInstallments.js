/** Fee installment helpers — monthly / quarterly / half-yearly / annually. */

export const FEE_FREQUENCIES = [
  "annually",
  "half-yearly",
  "quarterly",
  "monthly",
];

const CONFIG = {
  annually: {
    count: 1,
    labels: ["Annual fee"],
  },
  "half-yearly": {
    count: 2,
    labels: ["Half 1 (Apr–Sep)", "Half 2 (Oct–Mar)"],
  },
  quarterly: {
    count: 4,
    labels: [
      "Q1 (Apr–Jun)",
      "Q2 (Jul–Sep)",
      "Q3 (Oct–Dec)",
      "Q4 (Jan–Mar)",
    ],
  },
  monthly: {
    count: 12,
    labels: [
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
      "January",
      "February",
      "March",
    ],
  },
};

export function normalizeFeeFrequency(value) {
  const raw = String(value || "annually")
    .toLowerCase()
    .trim()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");
  if (raw === "halfyearly" || raw === "half-year") return "half-yearly";
  if (raw === "annual" || raw === "yearly") return "annually";
  if (FEE_FREQUENCIES.includes(raw)) return raw;
  return "annually";
}

export function feeFrequencyMeta(frequency) {
  const freq = normalizeFeeFrequency(frequency);
  return { frequency: freq, ...CONFIG[freq] };
}

/** Split total into N amounts (paise-safe); remainder cents go to earliest periods. */
export function splitInstallmentAmounts(total, count) {
  const n = Math.max(1, Number(count) || 1);
  const cents = Math.round(Math.max(0, Number(total) || 0) * 100);
  const base = Math.floor(cents / n);
  const rem = cents - base * n;
  return Array.from({ length: n }, (_, i) => (base + (i < rem ? 1 : 0)) / 100);
}

function periodKey(frequency, index) {
  const freq = normalizeFeeFrequency(frequency);
  const prefix =
    freq === "monthly"
      ? "M"
      : freq === "quarterly"
        ? "Q"
        : freq === "half-yearly"
          ? "H"
          : "Y";
  return `${prefix}${index + 1}`;
}

/**
 * Build installment rows for a student.
 * Payments with periodKeys mark those periods paid; leftover totalPaid fills the rest in order.
 */
export function buildInstallments({
  finalFee,
  frequency,
  payments = [],
  totalPaid = 0,
}) {
  const freq = normalizeFeeFrequency(frequency);
  const { count, labels } = CONFIG[freq];
  const amounts = splitInstallmentAmounts(finalFee, count);

  const installments = amounts.map((amount, index) => ({
    key: periodKey(freq, index),
    index,
    label: labels[index] || `Period ${index + 1}`,
    amount,
    paidAmount: 0,
    dueAmount: amount,
    status: "unpaid", // unpaid | partial | paid
  }));

  const byKey = Object.fromEntries(installments.map((i) => [i.key, i]));
  const keyedPaid = new Set();

  for (const payment of payments) {
    const keys = Array.isArray(payment?.periodKeys)
      ? payment.periodKeys.map(String).filter(Boolean)
      : [];
    if (!keys.length) continue;
    for (const key of keys) {
      const row = byKey[key];
      if (!row || keyedPaid.has(key)) continue;
      row.paidAmount = row.amount;
      row.dueAmount = 0;
      row.status = "paid";
      keyedPaid.add(key);
    }
  }

  const keyedCovered = installments
    .filter((i) => keyedPaid.has(i.key))
    .reduce((sum, i) => sum + i.amount, 0);

  let leftover = Math.max(0, Number(totalPaid) || 0) - keyedCovered;
  leftover = Math.round(leftover * 100) / 100;

  for (const row of installments) {
    if (keyedPaid.has(row.key)) continue;
    if (leftover <= 0) break;
    const apply = Math.min(row.amount, leftover);
    row.paidAmount = Math.round(apply * 100) / 100;
    row.dueAmount = Math.round((row.amount - row.paidAmount) * 100) / 100;
    leftover = Math.round((leftover - apply) * 100) / 100;
    if (row.dueAmount <= 0.009) {
      row.paidAmount = row.amount;
      row.dueAmount = 0;
      row.status = "paid";
    } else if (row.paidAmount > 0) {
      row.status = "partial";
    }
  }

  return {
    frequency: freq,
    installmentCount: count,
    installments,
  };
}

/** Validate selected unpaid/partial period keys and return expected pay amount. */
export function resolveSelectedInstallments(installments, periodKeys) {
  const keys = [...new Set((periodKeys || []).map(String).filter(Boolean))];
  if (!keys.length) {
    return { ok: false, message: "Select at least one fee period" };
  }

  const byKey = Object.fromEntries(
    (installments || []).map((i) => [i.key, i]),
  );
  const selected = [];
  for (const key of keys) {
    const row = byKey[key];
    if (!row) {
      return { ok: false, message: `Unknown fee period: ${key}` };
    }
    if (row.status === "paid" || row.dueAmount <= 0) {
      return { ok: false, message: `${row.label} is already paid` };
    }
    selected.push(row);
  }

  const amount = Math.round(
    selected.reduce((sum, row) => sum + Number(row.dueAmount || 0), 0) * 100,
  ) / 100;

  return {
    ok: true,
    selected,
    amount,
    periodKeys: selected.map((s) => s.key),
    labels: selected.map((s) => s.label),
  };
}
