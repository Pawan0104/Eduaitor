/**
 * Quiet hours helpers. Default 21:00–07:00 in school timezone.
 * Urgent events bypass quiet hours.
 */

function parseHm(hm) {
  const [h, m] = String(hm || "00:00").split(":").map((n) => Number(n) || 0);
  return h * 60 + m;
}

/** Returns true if `date` falls inside quiet hours window (may wrap midnight). */
export function isInQuietHours(date, startHm = "21:00", endHm = "07:00") {
  const d = date instanceof Date ? date : new Date(date);
  const mins = d.getHours() * 60 + d.getMinutes();
  const start = parseHm(startHm);
  const end = parseHm(endHm);
  if (start === end) return false;
  if (start < end) return mins >= start && mins < end;
  // wraps midnight e.g. 21:00–07:00
  return mins >= start || mins < end;
}

/** Next Date when quiet hours end after `from`. */
export function nextQuietHoursEnd(from, startHm = "21:00", endHm = "07:00") {
  const d = new Date(from);
  const end = parseHm(endHm);
  const endH = Math.floor(end / 60);
  const endM = end % 60;

  if (!isInQuietHours(d, startHm, endHm)) return d;

  const candidate = new Date(d);
  candidate.setHours(endH, endM, 0, 0);
  if (candidate <= d) candidate.setDate(candidate.getDate() + 1);
  return candidate;
}
