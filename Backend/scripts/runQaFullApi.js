/**
 * QA Full API test suite - Eduaitor Backend
 * Run: node Backend/scripts/runQaFullApi.js
 * Requires: server at http://localhost:5000
 * Writes results to Backend/scripts/qa-results.json
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE = process.env.API_BASE || "http://localhost:5000/api";
const ROOT = process.env.API_ROOT || "http://localhost:5000";

const results = [];

function record(id, status, notes) {
  results.push({ id, status, notes: String(notes || "") });
  const tag = status === "Pass" ? "PASS" : status === "Fail" ? "FAIL" : "BLOCK";
  console.log(`[${tag}] ${id}: ${notes}`);
}

async function request(method, url, { token, body, headers } = {}) {
  const h = { ...(headers || {}) };
  if (token) h.Authorization = `Bearer ${token}`;
  if (body !== undefined) h["Content-Type"] = "application/json";
  const res = await fetch(url, {
    method,
    headers: h,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { _raw: text.slice(0, 500) };
  }
  return { status: res.status, ok: res.ok, data };
}

async function login(email, password) {
  return request("POST", `${BASE}/auth/login`, { body: { email, password } });
}

function countHint(data) {
  const candidates = [
    data?.data,
    data?.students,
    data?.teachers,
    data?.staff,
    data?.classes,
    data?.sections,
    data?.subjects,
    data?.leads,
    data?.notices,
    data?.events,
    data?.routes,
    data?.drivers,
    data?.buses,
    data?.hostels,
    data?.books,
    data?.diaries,
    data?.homeworks,
    data?.groups,
    data?.blogs,
    data?.roles,
    data?.schools,
    data?.subscriptions,
    data?.access,
    data?.records,
    data,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) return ` items=${c.length}`;
  }
  return "";
}

function isOk(res) {
  return res.ok && res.data?.success !== false;
}

async function authedGet(id, label, path, token) {
  try {
    const res = await request("GET", `${BASE}${path}`, { token });
    if (isOk(res)) {
      record(id, "Pass", `${label} HTTP ${res.status}${countHint(res.data)}`);
    } else {
      record(
        id,
        "Fail",
        `${label} HTTP ${res.status}: ${res.data?.message || JSON.stringify(res.data).slice(0, 250)}`,
      );
    }
    return res;
  } catch (e) {
    record(id, "Fail", `${label} error: ${e.message}`);
    return null;
  }
}

async function expectDenied(id, label, method, path, token, body) {
  try {
    const res = await request(method, `${BASE}${path}`, { token, body });
    if (res.status === 401 || res.status === 403 || res.data?.success === false) {
      record(id, "Pass", `${label} correctly denied HTTP ${res.status}: ${res.data?.message || ""}`);
    } else {
      record(
        id,
        "Fail",
        `${label} NOT denied (security gap?) HTTP ${res.status}: ${JSON.stringify(res.data).slice(0, 250)}`,
      );
    }
  } catch (e) {
    record(id, "Fail", `${label} error: ${e.message}`);
  }
}

const roles = [
  { id: "SA-01", label: "Super Admin", email: "super@admin.com", password: "super@admin123" },
  { id: "SC-01", label: "School Admin", email: "school@admin.com", password: "#admin@school123" },
  { id: "T-01", label: "Teacher", email: "teacher@admin.com", password: "#teacher@school123" },
  { id: "ST-01", label: "Student", email: "qa.student@default.com", password: "#qa@student123" },
  { id: "P-01", label: "Parent", email: "9876543299", password: "#qa@parent123" },
  { id: "AC-01", label: "Accountant", email: "qa.accountant@default.com", password: "#staff@school123" },
  { id: "R-01", label: "Reception", email: "qa.reception@default.com", password: "#staff@school123" },
  { id: "GD-01", label: "Guard", email: "qa.guard@default.com", password: "#staff@school123" },
  { id: "W-01", label: "Warden", email: "qa.warden@default.com", password: "#staff@school123" },
  { id: "L-01", label: "Librarian", email: "qa.library@default.com", password: "#staff@school123" },
];

const tokens = {};

async function main() {
  console.log(`API full QA suite against ${BASE}`);
  console.log("---");

  // ---- Health ----
  try {
    const root = await request("GET", ROOT + "/");
    if (root.status === 200) {
      record("G-00", "Pass", `Root health ${root.status}`);
    } else {
      record("G-00", "Fail", `Unexpected root response ${root.status}`);
    }
  } catch (e) {
    record("G-00", "Fail", `Root unreachable: ${e.message}`);
    finish(1);
    return;
  }

  // ---- Logins ----
  for (const role of roles) {
    try {
      const res = await login(role.email, role.password);
      const token = res.data?.token;
      if (res.ok && res.data?.success !== false && token) {
        tokens[role.id] = { token, user: res.data };
        record(role.id, "Pass", `${role.label} login OK (${res.status}) - ${res.data?.message || "token received"}`);
      } else {
        record(role.id, "Fail", `${role.label} login failed HTTP ${res.status}: ${res.data?.message || JSON.stringify(res.data).slice(0, 200)}`);
      }
    } catch (e) {
      record(role.id, "Fail", `${role.label} login error: ${e.message}`);
    }
  }

  // ---- Negative: bad credentials ----
  try {
    const res = await login("school@admin.com", "wrong-password-xyz");
    if (!res.ok || res.data?.success === false) {
      record("G-02", "Pass", `Wrong password rejected HTTP ${res.status}: ${res.data?.message || "ok"}`);
    } else {
      record("G-02", "Fail", `Wrong password unexpectedly succeeded HTTP ${res.status}`);
    }
  } catch (e) {
    record("G-02", "Fail", `Wrong password test error: ${e.message}`);
  }

  try {
    const res = await login("", "");
    if (!res.ok || res.data?.success === false) {
      record("G-03", "Pass", `Empty login rejected HTTP ${res.status}: ${res.data?.message || "ok"}`);
    } else {
      record("G-03", "Fail", `Empty login unexpectedly succeeded HTTP ${res.status}`);
    }
  } catch (e) {
    record("G-03", "Fail", `Empty login test error: ${e.message}`);
  }

  try {
    const res = await login("9999999999", "#qa@parent123");
    if (!res.ok || res.data?.success === false) {
      record("P-19", "Pass", `Wrong parent mobile rejected HTTP ${res.status}: ${res.data?.message || "ok"}`);
    } else {
      record("P-19", "Fail", `Wrong parent mobile unexpectedly succeeded HTTP ${res.status}`);
    }
  } catch (e) {
    record("P-19", "Fail", `Wrong parent mobile test error: ${e.message}`);
  }

  const scToken = tokens["SC-01"]?.token;
  const saToken = tokens["SA-01"]?.token;
  const tToken = tokens["T-01"]?.token;
  const pToken = tokens["P-01"]?.token;
  const acToken = tokens["AC-01"]?.token;

  // ---- School Admin GETs ----
  if (!scToken) {
    const blockedIds = [
      "SC-02", "SC-03", "SC-04", "SC-05", "SC-06", "SC-10", "SC-16", "SC-19",
      "SC-30", "SC-40", "SC-42", "SC-43", "SC-52", "SC-60", "SC-65", "SC-70",
      "SC-80", "SC-81", "SC-86", "SC-87", "SC-88", "SC-100", "SC-101", "SC-102",
      "SC-110", "SC-111", "SC-113", "SC-120", "SC-130", "SC-135", "DR-02",
    ];
    for (const id of blockedIds) record(id, "Blocked", "No school admin token");
  } else {
    await authedGet("SC-02", "GET notifications/topbar", "/notifications/topbar", scToken);
    await authedGet("SC-05", "GET calendar", "/calendar", scToken);
    await authedGet("SC-06", "GET gatepass/manage", "/gatepass/manage", scToken);
    await authedGet("SC-10", "GET students", "/students", scToken);
    await authedGet("SC-16", "GET house", "/house", scToken);
    await authedGet("SC-30", "GET teachers", "/teachers", scToken);
    const classesRes = await authedGet("SC-40", "GET classes/all", "/classes/all", scToken);
    await authedGet("SC-42", "GET sections/all", "/sections/all", scToken);
    await authedGet("SC-43", "GET subjects/all", "/subjects/all", scToken);
    await authedGet("SC-52", "GET staff-attendance/meta", "/staff-attendance/meta", scToken);
    await authedGet("SC-60", "GET staff", "/staff", scToken);
    await authedGet("SC-65", "GET school-staff-roles", "/school-staff-roles", scToken);
    await authedGet("SC-70", "GET exam/list", "/exam/list", scToken);
    await authedGet("SC-86", "GET fees (history)", "/fees", scToken);
    await authedGet("SC-87", "GET fees/defaulters", "/fees/defaulters", scToken);
    await authedGet("SC-88", "GET fees/financial-report", "/fees/financial-report", scToken);
    await authedGet("SC-100", "GET diary", "/diary", scToken);
    await authedGet("SC-101", "GET homework/school", "/homework/school", scToken);
    await authedGet("SC-102", "GET groups/my-groups", "/groups/my-groups", scToken);
    await authedGet("SC-110", "GET transport/summary", "/transport/summary", scToken);
    await authedGet("SC-111", "GET transport/routes", "/transport/routes", scToken);
    const driversRes = await authedGet("SC-113", "GET transport/drivers", "/transport/drivers", scToken);
    await authedGet("SC-120", "GET hostel", "/hostel", scToken);
    await authedGet("SC-130", "GET library/books", "/library/books", scToken);
    await authedGet("SC-135", "GET blogs", "/blogs", scToken);

    // SC-80: fee structure for first class
    try {
      const classes = classesRes?.data?.classes || [];
      const firstClassId = classes[0]?._id;
      if (!firstClassId) {
        record("SC-80", "Blocked", "No class available to fetch fee structure");
      } else {
        const res = await request("GET", `${BASE}/fee-structure/${firstClassId}`, { token: scToken });
        if (isOk(res)) {
          record("SC-80", "Pass", `GET fee-structure/:classId HTTP ${res.status}${countHint(res.data)}`);
        } else {
          record("SC-80", "Fail", `GET fee-structure/:classId HTTP ${res.status}: ${res.data?.message || ""}`);
        }
      }
    } catch (e) {
      record("SC-80", "Fail", `Fee structure error: ${e.message}`);
    }

    // SC-81: Fee collect - intentionally not executed to avoid writing real financial/receipt data
    record("SC-81", "Blocked", "Fee collect skipped intentionally to avoid mutating financial/receipt data in shared DB; verified read-only fee endpoints (SC-86/87/88) instead");

    // DR-02: verify seeded QA driver appears with correct phone
    try {
      const drivers = driversRes?.data?.data || [];
      const found = Array.isArray(drivers)
        ? drivers.find((d) => String(d.phone) === "9876500999" || /QA Transport Driver/i.test(d.name || ""))
        : null;
      if (found) {
        record("DR-02", "Pass", `Driver found: name="${found.name}" phone=${found.phone}`);
      } else {
        record("DR-02", "Fail", `QA Transport Driver / 9876500999 not found among ${Array.isArray(drivers) ? drivers.length : 0} drivers`);
      }
    } catch (e) {
      record("DR-02", "Fail", `Driver verify error: ${e.message}`);
    }

    // SC-19: leads assignable users + create dummy lead
    try {
      const assigneesRes = await request("GET", `${BASE}/leads/assignable-users`, { token: scToken });
      if (!assigneesRes.ok) {
        record("SC-19", "Fail", `Could not load assignees HTTP ${assigneesRes.status}: ${assigneesRes.data?.message || ""}`);
      } else {
        const list = assigneesRes.data?.data || [];
        const assignee = Array.isArray(list) ? list[0] : null;
        if (!assignee) {
          record("SC-19", "Blocked", "No assignable users for lead create");
        } else {
          const stamp = Date.now();
          const createRes = await request("POST", `${BASE}/leads`, {
            token: scToken,
            body: {
              studentName: `QA Script Student ${stamp}`,
              parentName: `QA Script Parent ${stamp}`,
              parentMobile: "9998887770",
              parentEmail: `qa.script.${stamp}@example.com`,
              previousSchoolName: "QA Previous School",
              assignedToUserId: assignee.userId || assignee._id || assignee.id,
              assignedToUserType: assignee.userType || assignee.type || "staff",
            },
          });
          if (createRes.status === 201 || (createRes.ok && createRes.data?.success)) {
            record("SC-19", "Pass", `Lead created HTTP ${createRes.status} id=${createRes.data?.data?._id || "n/a"}`);
          } else {
            record("SC-19", "Fail", `Lead create HTTP ${createRes.status}: ${createRes.data?.message || JSON.stringify(createRes.data).slice(0, 300)}`);
          }
        }
      }
    } catch (e) {
      record("SC-19", "Fail", `Lead create error: ${e.message}`);
    }

    // SC-03: create dummy event + list
    try {
      const stamp = Date.now();
      const createRes = await request("POST", `${BASE}/events/create`, {
        token: scToken,
        body: {
          title: `QA Script Event ${stamp}`,
          type: "Administrative",
          organizer: "QA Script",
          startDate: new Date().toISOString(),
          time: "10:00",
          location: "QA Test Location",
          description: "Created by automated QA script",
        },
      });
      if (createRes.status === 201 || (createRes.ok && createRes.data?.success)) {
        const listRes = await request("GET", `${BASE}/events`, { token: scToken });
        record("SC-03", "Pass", `Event created HTTP ${createRes.status}; list HTTP ${listRes.status}${countHint(listRes.data)}`);
      } else {
        record("SC-03", "Fail", `Event create HTTP ${createRes.status}: ${createRes.data?.message || JSON.stringify(createRes.data).slice(0, 250)}`);
      }
    } catch (e) {
      record("SC-03", "Fail", `Event create error: ${e.message}`);
    }

    // SC-04: create dummy notice + list
    try {
      const stamp = Date.now();
      const createRes = await request("POST", `${BASE}/notices/create`, {
        token: scToken,
        body: {
          title: `QA Script Notice ${stamp}`,
          content: "Created by automated QA script",
          category: "General",
          audience: "All",
          publishDate: new Date().toISOString(),
          createdBy: "QA Script",
        },
      });
      if (createRes.status === 201 || (createRes.ok && createRes.data?.success)) {
        const listRes = await request("GET", `${BASE}/notices`, { token: scToken });
        record("SC-04", "Pass", `Notice created HTTP ${createRes.status}; list HTTP ${listRes.status}${countHint(listRes.data)}`);
      } else {
        record("SC-04", "Fail", `Notice create HTTP ${createRes.status}: ${createRes.data?.message || JSON.stringify(createRes.data).slice(0, 250)}`);
      }
    } catch (e) {
      record("SC-04", "Fail", `Notice create error: ${e.message}`);
    }
  }

  // ---- Super Admin GETs ----
  if (!saToken) {
    for (const id of ["SA-03", "SA-04", "SA-05", "SA-10"]) record(id, "Blocked", "No super admin token");
  } else {
    await authedGet("SA-05", "GET schools", "/schools", saToken);
    await authedGet("SA-10", "GET subscriptions", "/subscriptions", saToken);
    await authedGet("SA-04", "GET roles", "/roles", saToken);
    await authedGet("SA-03", "GET access", "/access", saToken);
  }

  // ---- Negative: role isolation ----
  if (!tToken) {
    record("T-25", "Blocked", "No teacher token");
    record("T-26", "Blocked", "No teacher token");
  } else {
    await expectDenied("T-26", "Teacher GET /schools (super admin route)", "GET", "/schools", tToken);
    // Fee structure needs a classId; probe with a placeholder id to check access gate behavior
    await expectDenied("T-25", "Teacher GET /fee-structure/:classId (school-admin fee setup)", "GET", "/fee-structure/000000000000000000000000", tToken);
  }

  if (!pToken) {
    record("P-18", "Blocked", "No parent token");
  } else {
    await expectDenied("P-18", "Parent POST /attendance/save (mark attendance)", "POST", "/attendance/save", pToken, {
      classId: "000000000000000000000000",
      sectionId: "000000000000000000000000",
      date: new Date().toISOString().slice(0, 10),
      records: [],
    });
  }

  if (!acToken) {
    record("AC-13", "Blocked", "No accountant token");
  } else {
    await expectDenied("AC-13", "Accountant GET /hostel/visitors (no hostel perm)", "GET", "/hostel/visitors", acToken);
  }

  finish();
}

function finish(forceExitCode) {
  const summary = {
    passed: results.filter((r) => r.status === "Pass").length,
    failed: results.filter((r) => r.status === "Fail").length,
    blocked: results.filter((r) => r.status === "Blocked").length,
    total: results.length,
    results,
  };

  const outPath = path.join(__dirname, "qa-results.json");
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));

  console.log("---");
  console.log(`Passed: ${summary.passed}  Failed: ${summary.failed}  Blocked: ${summary.blocked}  Total: ${summary.total}`);
  console.log(`Results written to ${outPath}`);
  process.exit(forceExitCode !== undefined ? forceExitCode : (summary.failed > 0 ? 1 : 0));
}

main().catch((e) => {
  console.error("FATAL", e);
  record("FATAL", "Fail", e.stack || e.message);
  finish(1);
});

