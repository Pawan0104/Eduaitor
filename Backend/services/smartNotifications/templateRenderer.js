/**
 * Lightweight {{placeholder}} + optional {{#key}}...{{/key}} renderer.
 * Required placeholders missing → { ok: false, missing: [...] }
 */

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isPresent(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  return true;
}

export function renderTemplate(template, payload = {}, placeholders = []) {
  const subjectTpl = template?.subject || "";
  const bodyTpl = template?.body || "";
  const required = (placeholders || [])
    .filter((p) => p.required)
    .map((p) => p.key);

  const missing = required.filter((key) => !isPresent(payload[key]));
  if (missing.length) {
    return {
      ok: false,
      missing,
      subject: "",
      body: "",
      reason: `Missing required placeholders: ${missing.join(", ")}`,
    };
  }

  const render = (text) => {
    let out = String(text || "");
    // Optional blocks: {{#key}}...{{/key}}
    out = out.replace(
      /\{\{#([\w.]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
      (_, key, inner) => (isPresent(payload[key]) ? inner : ""),
    );
    // Simple placeholders
    Object.entries(payload || {}).forEach(([key, value]) => {
      const re = new RegExp(`\\{\\{\\s*${escapeRegExp(key)}\\s*\\}\\}`, "g");
      out = out.replace(re, isPresent(value) ? String(value) : "");
    });
    // Strip any leftover placeholders
    out = out.replace(/\{\{[^}]+\}\}/g, "");
    return out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  };

  return {
    ok: true,
    missing: [],
    subject: render(subjectTpl),
    body: render(bodyTpl),
    reason: "",
  };
}
