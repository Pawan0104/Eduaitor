/**
 * QA API smoke tests — Eduaitor Backend
 * Run: node Backend/scripts/runQaSmokeApi.js
 * Requires: server at http://localhost:5000
 */
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
  return { status: res.status, ok: res.ok, data, headers: res.headers };
}

async function login(email, password) {
  return request("POST", `${BASE}/auth/login`, {
    body: { email, password },
  });
}

const roles = [
  { id: "G-01", label: "School Admin", email: "school@admin.com", password: "#admin@school123" },
  { id: "G-02", label: "Teacher", email: "teacher@admin.com", password: "#teacher@school123" },
  { id: "G-03", label: "Student", email: "qa.student@default.com", password: "#qa@student123" },
  { id: "G-04", label: "Parent", email: "9876543299", password: "#qa@parent123" },
  { id: "G-05", label: "Accountant", email: "qa.accountant@default.com", password: "#staff@school123" },
  { id: "G-06", label: "Guard", email: "qa.guard@default.com", password: "#staff@school123" },
  { id: "G-07", label: "Warden", email: "qa.warden@default.com", password: "#staff@school123" },
  { id: "G-08", label: "Reception", email: "qa.reception@default.com", password: "#staff@school123" },
  { id: "G-09", label: "Library", email: "qa.library@default.com", password: "#staff@school123" },
  { id: "G-10", label: "Super Admin", email: "super@admin.com", password: "super@admin123" },
];

async function main() {
  console.log(`API smoke against ${BASE}`);
  console.log("---");

  // Health
  try {
    const root = await request("GET", ROOT + "/");
    if (root.status === 200 && (root.data?.success || root.data?.message)) {
      record("G-00", "Pass", `Root health ${root.status}: ${root.data?.message || "ok"}`);
    } else {
      record("G-00", "Fail", `Unexpected root response ${root.status}`);
    }
  } catch (e) {
    record("G-00", "Fail", `Root unreachable: ${e.message}`);
    console.log(JSON.stringify({ results }, null, 2));
    process.exit(1);
  }

  let schoolAdminToken = null;
  let schoolAdminUser = null;

  for (const role of roles) {
    try {
      const res = await login(role.email, role.password);
      const token = res.data?.token;
      const success = res.ok && res.data?.success && token;
      if (success) {
        record(role.id, "Pass", `${role.label} login OK (${res.status}) — ${res.data?.message || "token received"}`);
        if (role.id === "G-01") {
          schoolAdminToken = token;
          schoolAdminUser = res.data;
        }
      } else {
        record(
          role.id,
          "Fail",
          `${role.label} login failed HTTP ${res.status}: ${res.data?.message || JSON.stringify(res.data).slice(0, 200)}`,
        );
      }
    } catch (e) {
      record(role.id, "Fail", `${role.label} login error: ${e.message}`);
    }
  }

  // Wrong password
  try {
    const res = await login("school@admin.com", "wrong-password-xyz");
    if (!res.ok || res.data?.success === false) {
      record("G-11", "Pass", `Wrong password rejected HTTP ${res.status}: ${res.data?.message || "ok"}`);
    } else {
      record("G-11", "Fail", `Wrong password unexpectedly succeeded HTTP ${res.status}`);
    }
  } catch (e) {
    record("G-11", "Fail", `Wrong password test error: ${e.message}`);
  }

  // Empty login
  try {
    const res = await login("", "");
    if (!res.ok || res.data?.success === false) {
      record("G-12", "Pass", `Empty login rejected HTTP ${res.status}: ${res.data?.message || "ok"}`);
    } else {
      record("G-12", "Fail", `Empty login unexpectedly succeeded HTTP ${res.status}`);
    }
  } catch (e) {
    record("G-12", "Fail", `Empty login test error: ${e.message}`);
  }

  if (!schoolAdminToken) {
    record("SC-01", "Blocked", "No school admin token — skip authenticated GETs");
    record("SC-02", "Blocked", "No school admin token");
    record("SC-03", "Blocked", "No school admin token");
    record("SC-04", "Blocked", "No school admin token");
    record("SC-05", "Blocked", "No school admin token");
    record("LD-01", "Blocked", "No school admin token");
  } else {
    const authedGets = [
      { id: "SC-01", path: "/students", label: "GET students" },
      { id: "SC-02", path: "/teachers", label: "GET teachers" },
      { id: "SC-03", path: "/staff", label: "GET staff" },
      { id: "SC-04", path: "/classes/all", label: "GET classes" },
      { id: "SC-05", path: "/fees", label: "GET fees history" },
      { id: "SC-06", path: "/fee-structure", label: "GET fee-structure alias" },
      { id: "SC-07", path: "/leads", label: "GET leads" },
    ];

    for (const t of authedGets) {
      try {
        const res = await request("GET", `${BASE}${t.path}`, { token: schoolAdminToken });
        if (res.ok && (res.data?.success !== false)) {
          const countHint =
            Array.isArray(res.data?.data)
              ? ` items=${res.data.data.length}`
              : Array.isArray(res.data?.students)
                ? ` items=${res.data.students.length}`
                : Array.isArray(res.data)
                  ? ` items=${res.data.length}`
                  : "";
          record(t.id, "Pass", `${t.label} HTTP ${res.status}${countHint}`);
        } else {
          record(
            t.id,
            "Fail",
            `${t.label} HTTP ${res.status}: ${res.data?.message || JSON.stringify(res.data).slice(0, 250)}`,
          );
        }
      } catch (e) {
        record(t.id, "Fail", `${t.label} error: ${e.message}`);
      }
    }

    // Create dummy lead (LD-01)
    try {
      const assigneesRes = await request("GET", `${BASE}/leads/assignable-users`, {
        token: schoolAdminToken,
      });
      if (!assigneesRes.ok) {
        record(
          "LD-01",
          "Fail",
          `Could not load assignees HTTP ${assigneesRes.status}: ${assigneesRes.data?.message || ""}`,
        );
      } else {
        const users = assigneesRes.data?.data || assigneesRes.data?.users || assigneesRes.data || [];
        const list = Array.isArray(users) ? users : [];
        const assignee = list[0];
        if (!assignee) {
          record("LD-01", "Blocked", "No assignable users for lead create");
        } else {
          const stamp = Date.now();
          const createRes = await request("POST", `${BASE}/leads`, {
            token: schoolAdminToken,
            body: {
              studentName: `QA Smoke Student ${stamp}`,
              parentName: `QA Smoke Parent ${stamp}`,
              parentMobile: "9998887770",
              parentEmail: `qa.smoke.${stamp}@example.com`,
              previousSchoolName: "QA Previous School",
              assignedToUserId: assignee.userId || assignee._id || assignee.id,
              assignedToUserType: assignee.userType || assignee.type || "staff",
            },
          });
          if (createRes.status === 201 || (createRes.ok && createRes.data?.success)) {
            record(
              "LD-01",
              "Pass",
              `Lead created HTTP ${createRes.status} id=${createRes.data?.data?._id || "n/a"}`,
            );
          } else {
            record(
              "LD-01",
              "Fail",
              `Lead create HTTP ${createRes.status}: ${createRes.data?.message || JSON.stringify(createRes.data).slice(0, 300)}`,
            );
          }
        }
      }
    } catch (e) {
      record("LD-01", "Fail", `Lead create error: ${e.message}`);
    }
  }

  const summary = {
    passed: results.filter((r) => r.status === "Pass").length,
    failed: results.filter((r) => r.status === "Fail").length,
    blocked: results.filter((r) => r.status === "Blocked").length,
    total: results.length,
    schoolAdminMessage: schoolAdminUser?.message || null,
    results,
  };

  console.log("---");
  console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("FATAL", e);
  record("FATAL", "Fail", e.stack || e.message);
  console.log(JSON.stringify({ results }, null, 2));
  process.exit(1);
});
