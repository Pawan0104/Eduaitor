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
  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

  // Apply payments that name period keys — support partial amounts (FIFO on keys).
  for (const payment of payments) {
    const entryType = payment?.entryType || "payment";
    if (entryType === "voucher" || entryType === "refund") continue;
    const keys = Array.isArray(payment?.periodKeys)
      ? payment.periodKeys.map(String).filter(Boolean)
      : [];
    if (!keys.length) continue;
    let remaining = round2(payment.amountPaid);
    for (const key of keys) {
      if (remaining <= 0) break;
      const row = byKey[key];
      if (!row) continue;
      const space = round2(row.amount - row.paidAmount);
      if (space <= 0) continue;
      const apply = Math.min(space, remaining);
      row.paidAmount = round2(row.paidAmount + apply);
      row.dueAmount = round2(row.amount - row.paidAmount);
      remaining = round2(remaining - apply);
    }
  }

  for (const row of installments) {
    if (row.dueAmount <= 0.009) {
      row.paidAmount = row.amount;
      row.dueAmount = 0;
      row.status = "paid";
    } else if (row.paidAmount > 0) {
      row.status = "partial";
    }
  }

  const keyedCovered = installments.reduce(
    (sum, i) => sum + Number(i.paidAmount || 0),
    0,
  );

  let leftover = Math.max(0, Number(totalPaid) || 0) - keyedCovered;
  leftover = round2(leftover);

  for (const row of installments) {
    if (row.status === "paid" || leftover <= 0) continue;
    const space = round2(row.amount - row.paidAmount);
    if (space <= 0) continue;
    const apply = Math.min(space, leftover);
    row.paidAmount = round2(row.paidAmount + apply);
    row.dueAmount = round2(row.amount - row.paidAmount);
    leftover = round2(leftover - apply);
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

/**
 * Validate selected unpaid/partial period keys.
 * Optional requestedAmount allows partial payment (must be > 0 and ≤ total due).
 */
export function resolveSelectedInstallments(
  installments,
  periodKeys,
  requestedAmount,
) {
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

  const maxAmount =
    Math.round(
      selected.reduce((sum, row) => sum + Number(row.dueAmount || 0), 0) * 100,
    ) / 100;

  let amount = maxAmount;
  if (requestedAmount !== undefined && requestedAmount !== null && requestedAmount !== "") {
    const req = Math.round((Number(requestedAmount) || 0) * 100) / 100;
    if (req <= 0) {
      return { ok: false, message: "Enter a valid partial amount" };
    }
    if (req > maxAmount + 0.009) {
      return {
        ok: false,
        message: `Amount cannot exceed ₹${maxAmount} for selected periods`,
      };
    }
    amount = req;
  }

  return {
    ok: true,
    selected,
    amount,
    maxAmount,
    partial: amount < maxAmount - 0.009,
    periodKeys: selected.map((s) => s.key),
    labels: selected.map((s) => s.label),
  };
}

/** Spread a partial amount across fee heads in selection order (FIFO). */
export function allocateHeadsFifo(feeHeads, payAmount) {
  let left = Math.round((Number(payAmount) || 0) * 100) / 100;
  const out = [];
  for (const h of feeHeads || []) {
    if (left <= 0) break;
    const due = Math.round((Number(h.amount) || 0) * 100) / 100;
    if (due <= 0) continue;
    const take = Math.min(due, left);
    out.push({
      feeId: h.feeId || h._id || undefined,
      name: String(h.name || "").trim(),
      amount: take,
    });
    left = Math.round((left - take) * 100) / 100;
  }
  return out.filter((h) => h.name && h.amount > 0);
}
