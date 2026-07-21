/**
 * Merge QA JSON result files into Docs/Eduaitor_Complete_QA_Test_Plan.md
 * Priority (later overrides earlier): qa-results.json -> qa-ui-deep-results.json -> qa-fix-recheck.json
 * Also applies manual UI-confirmed overrides and appends new defects.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..", "..");

const mdPath = path.join(root, "Docs", "Eduaitor_Complete_QA_Test_Plan.md");

function loadResults(file) {
  const p = path.join(__dirname, file);
  if (!fs.existsSync(p)) {
    console.log(`[WARN] missing ${file}`);
    return [];
  }
  const text = fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "");
  const json = JSON.parse(text);
  return Array.isArray(json) ? json : json.results || [];
}

const sources = ["qa-results.json", "qa-ui-deep-results.json", "qa-fix-recheck.json"];
const merged = new Map(); // id -> { status, notes, source }

for (const file of sources) {
  const entries = loadResults(file);
  for (const r of entries) {
    if (!r || !r.id) continue;
    merged.set(r.id, { status: r.status, notes: r.notes, source: file });
  }
  console.log(`Loaded ${entries.length} result(s) from ${file}`);
}

// ---- Manual UI-confirmed overrides ----
const manualOverrides = {
  "SC-01": { status: "Pass", notes: "UI-confirmed: dashboard loaded in browser", source: "manual-ui" },
  "G-01": { status: "Pass", notes: "UI-confirmed: login page loads", source: "manual-ui" },
  "G-04": { status: "Pass", notes: "API logout confirmed (POST /auth/logout HTTP 200); logout button visible in UI, not yet click-tested", source: "manual-ui" },
};
for (const [id, val] of Object.entries(manualOverrides)) {
  merged.set(id, val);
}

console.log(`Merged map has ${merged.size} unique id(s)`);

// ---- Read markdown ----
let raw = fs.readFileSync(mdPath, "utf8");
const lines = raw.split(/\r?\n/);

const idRe = /^[A-Za-z]{1,4}-\d+[a-z]?$/;
let totalRows = 0;
const statusCounts = { Pass: 0, Fail: 0, Blocked: 0, "Not run": 0 };
const changes = [];
const failRows = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.startsWith("|")) continue;
  const parts = line.split("|");
  if (parts.length !== 7) continue; // "" | ID | c2 | c3 | c4 | Result | ""
  const idCell = parts[1].trim();
  if (!idRe.test(idCell)) continue; // skip header/separator/non-case rows
  totalRows++;

  const currentResult = parts[5].trim();
  const override = merged.get(idCell);
  let newResult = currentResult;
  if (override && override.status) {
    newResult = override.status;
    if (newResult !== currentResult) {
      changes.push({ id: idCell, from: currentResult, to: newResult, source: override.source });
    }
  }

  parts[5] = ` ${newResult} `;
  lines[i] = parts.join("|");

  const key = statusCounts[newResult] !== undefined ? newResult : "Not run";
  statusCounts[key] = (statusCounts[key] || 0) + 1;
  if (newResult === "Fail") {
    failRows.push({ id: idCell, feature: parts[2].trim() });
  }
}

console.log(`\nScanned ${totalRows} test-case rows.`);
console.log(`Changed ${changes.length} row(s):`);
for (const c of changes) console.log(`  ${c.id}: ${c.from} -> ${c.to} (from ${c.source})`);
console.log(`\nFinal counts:`, statusCounts);
if (failRows.length) {
  console.log(`\nRemaining FAIL rows:`);
  for (const f of failRows) console.log(`  ${f.id} - ${f.feature}`);
} else {
  console.log(`\nNo remaining FAIL rows.`);
}

raw = lines.join("\n");

// ---- Add new defects to Section 16 defect log table ----
const newDefects = [
  "| DEF-005 | High | School Admin | SC-112 | Bus route null unique-index collision | Create 2nd bus without a route | Bus created | E11000 dup key `route:null` (500) | Fixed - removed `default:null` on Bus.route/driver so sparse unique index skips unset fields |",
  "| DEF-006 | Critical | Super Admin | SA-06 | `razorpayKeyId` ReferenceError on school create | Super Admin creates a school | School created (201) | 500 ReferenceError: razorpayKeyId is not defined | Fixed - `razorpayKeyId`/`razorpayKeySecret` now destructured from req.body in createSchool |",
  "| DEF-007 | High | Librarian | L-05 | Librarian could read fee history (access-control gap) | Librarian GET /api/fees | 403 denied | 200 fee data returned | Fixed - feeRoute now uses checkModuleAccess(\"fees\") guard |",
];

{
  const defectLines = raw.split("\n");
  const headerIdx = defectLines.findIndex((l) => l.startsWith("| Defect ID | Severity | Role | Case ID |"));
  const alreadyPresent = raw.includes("DEF-005") && raw.includes("DEF-006") && raw.includes("DEF-007");
  if (headerIdx === -1) {
    console.log("[WARN] Could not find defect table header; skipping defect insertion.");
  } else if (alreadyPresent) {
    console.log("Defects DEF-005/006/007 already present; skipping duplicate insert.");
  } else {
    // header line, then separator line, then zero or more "| DEF-..." rows
    let lastDefRow = headerIdx + 1; // separator line index
    for (let j = headerIdx + 2; j < defectLines.length; j++) {
      if (defectLines[j].startsWith("| DEF-")) {
        lastDefRow = j;
      } else {
        break;
      }
    }
    defectLines.splice(lastDefRow + 1, 0, ...newDefects);
    raw = defectLines.join("\n");
  }
}

// ---- Update Execution summary block ----
const notRun = totalRows - statusCounts.Pass - statusCounts.Fail - statusCounts.Blocked;
const countsLine = `- **Counts:** Pass **${statusCounts.Pass}** \u2022 Blocked **${statusCounts.Blocked}** \u2022 Fail **${statusCounts.Fail}** \u2022 Not run **${notRun}** (of ${totalRows} total test-case rows)`;

raw = raw.replace(
  /^- \*\*Counts:\*\*.*$/m,
  countsLine,
);

const defectsLine = `- **Defects found & fixed during this pass:** DEF-001 (duplicate \`generateStudentId\` crashed server), DEF-002 (lead create \`leadNumber\` E11000), DEF-003 (teacher could access fee-structure/\`/schools\`), DEF-004 (parent attendance role-check order), DEF-005 (Bus route null unique-index collision), DEF-006 (\`razorpayKeyId\` ReferenceError on school create), DEF-007 (librarian could read fee history) \u2014 see Section 16.`;
raw = raw.replace(
  /^- \*\*Defects found & fixed during this pass:\*\*.*$/m,
  defectsLine,
);

const dateLine = "## Execution summary (21 July 2026 - fix re-check pass)";
raw = raw.replace(/^## Execution summary \(21 July 2026\)$/m, dateLine);

const scopeLine = "- **Scope:** this pass covered backend API contracts (auth, RBAC, CRUD list/read endpoints), the login-page UI smoke, targeted UI-deep API flows per role, and a final fix-verification re-check (SA-06, SC-112, L-05, T-25) after restarting the Backend with the DEF-005/006/007 fixes applied. Full click-through UI regression per role (forms, uploads, payment flows, hostel/visitor lifecycle, etc.) remains **Not run** for the remaining cases \u2014 see Section 17 notes.";
raw = raw.replace(
  /^- \*\*Scope:\*\*.*$/m,
  scopeLine,
);

fs.writeFileSync(mdPath, raw, "utf8");
console.log(`\nWrote updated markdown to ${mdPath}`);

// Save a small summary json for downstream use (docx sync / final report)
const summary = {
  totalRows,
  counts: { Pass: statusCounts.Pass, Fail: statusCounts.Fail, Blocked: statusCounts.Blocked, "Not run": notRun },
  changes,
  failRows,
};
fs.writeFileSync(path.join(__dirname, "qa-merge-summary.json"), JSON.stringify(summary, null, 2));
console.log(`Wrote merge summary to ${path.join(__dirname, "qa-merge-summary.json")}`);


