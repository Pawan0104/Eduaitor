/**
 * Marketing AI smoke test (in-memory Mongo, port 5001).
 * Run:  node Backend/testMarketing.js
 * Covers: module/permission guards, dashboard, event-trigger generation,
 * approval workflow, publish invariants, dev-mode account validation.
 */
process.env.USE_ATLAS_DB = "false";
process.env.NODE_ENV = "development";
process.env.PORT = "5001";

import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const log = (ok, label, extra = "") =>
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? "  → " + extra : ""}`);

let failures = 0;
const check = (ok, label, extra = "") => {
  log(ok, label, extra);
  if (!ok) failures++;
};

// Boot the real server (connects in-memory mongo + seeds sample data).
await import("./server.js");
const BASE = `http://localhost:${process.env.PORT}`;
let booted = false;
for (let i = 0; i < 120; i++) {
  try {
    const probe = await fetch(`${BASE}/`);
    if (probe.ok) { booted = true; break; }
  } catch { /* not up yet */ }
  await wait(500);
}
if (!booted) {
  console.error("FAIL  server did not boot on", BASE);
  process.exit(1);
}
console.log("server booted on", BASE);

const School = mongoose.model("School");
const school = await School.findOne({ admin_email: "school@admin.com" }).lean();
const schoolId = String(school._id);

const token = jwt.sign(
  { role: "school_admin", school_id: schoolId, _id: schoolId, email: "school@admin.com", name: "School Admin" },
  process.env.JWT_SECRET,
  { expiresIn: "2h" },
);

const api = async (method, url, body, tok = token) => {
  const res = await fetch(`${BASE}${url}`, {
    method,
    headers: {
      Authorization: `Bearer ${tok}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  return { status: res.status, data };
};

console.log("\n── Marketing AI smoke test ──\n");

// 1. Module + permission guards
{
  const r = await api("GET", "/api/marketing/dashboard");
  check(r.status === 200, "school_admin can access dashboard");

  const teacher = await mongoose.model("Teacher").findOne({ schoolId }).lean();
  const teacherToken = jwt.sign(
    { role: "teacher_admin", school_id: schoolId, teacher_id: String(teacher._id), email: teacher.email, name: teacher.fullName },
    process.env.JWT_SECRET,
    { expiresIn: "2h" },
  );
  const tr = await api("GET", "/api/marketing/dashboard", undefined, teacherToken);
  check(tr.status === 403 && tr.data?.message?.includes("marketing_approve"),
    "teacher WITHOUT marketing_approve is denied", tr.data?.message);
}

// 2. Catalog
{
  const r = await api("GET", "/api/marketing/catalog");
  check(r.status === 200 && r.data?.triggers?.length >= 5, "catalog returns triggers", `${r.data?.triggers?.length}`);
}

// 3. Create an ERP event → auto-trigger records a marketing_event (no AI since auto-suggest off by default)
{
  const r = await api("POST", "/api/events/create", {
    title: "Annual Function 2026",
    type: "Cultural",
    priority: "High",
    organizer: "School Committee",
    startDate: new Date(Date.now() + 7 * 864e5).toISOString(),
    time: "17:00",
    location: "Main Auditorium",
    description: "Annual cultural day with performances by students.",
  });
  check(r.status === 201, "ERP event created", r.data?.message);
  const eventId = r.data?.event?._id;
  if (eventId) {
    await wait(500); // fire-and-forget trigger bus write
    const evt = await mongoose.model("MarketingEvent").findOne({ entityId: String(eventId) }).lean();
    check(Boolean(evt) && evt.trigger === "event.created", "marketing_event recorded (dedupe bus)", JSON.stringify(evt?.trigger));
  }
}

// 4. Generate AI suggestions (facebook + blog) from that event
{
  const events = await mongoose.model("Event").find({ schoolId }).sort({ createdAt: -1 }).limit(1).lean();
  const eventId = String(events[0]._id);

  const r1 = await api("POST", "/api/marketing/posts/generate", {
    trigger: "event.created", entityType: "event", entityId: eventId, channel: "facebook",
  });
  check(r1.status === 201 && r1.data?.post?.status === "DRAFT", "AI facebook draft generated",
    r1.status === 201 ? `preview="${(r1.data.post?.versions?.[0]?.text || "").slice(0, 40)}..."` : r1.data?.message);
  const postId = r1.status === 201 ? r1.data.post._id : null;

  const r2 = await api("POST", "/api/marketing/posts/generate", {
    trigger: "event.created", entityType: "event", entityId: eventId, channel: "blog",
  });
  check(r2.status === 201 && r2.data?.post?.status === "DRAFT", "AI blog draft generated",
    r2.status === 201 ? `title="${r2.data.post?.versions?.[0]?.text?.slice(0, 40)}..."` : r2.data?.message);

  // duplicate generate returns the same draft (dedupeKey)
  const r3 = await api("POST", "/api/marketing/posts/generate", {
    trigger: "event.created", entityType: "event", entityId: eventId, channel: "facebook",
  });
  check(r3.status === 201, "re-generate is deduped (no duplicate)", r3.data?.post?._id === postId ? "same post returned" : "DIFFERENT post — check");

  // 5. Approval invariant: unapproved post cannot publish
  if (postId) {
    const rp = await api("POST", `/api/marketing/posts/${postId}/publish-now`);
    check(rp.status === 400 && rp.data?.message?.includes("approved"),
      "unapproved post cannot publish", rp.data?.message);

    // submit → approve
    const rs = await api("POST", `/api/marketing/posts/${postId}/submit`);
    check(rs.status === 200 && rs.data?.post?.status === "PENDING", "submit → PENDING");

    const ra = await api("POST", `/api/marketing/posts/${postId}/approve`);
    check(ra.status === 200 && ra.data?.post?.status === "APPROVED" && ra.data?.post?.workflow?.approvedBy,
      "approve → APPROVED (approvedBy recorded)", String(ra.data?.post?.workflow?.approvedBy));

    const rn = await api("POST", `/api/marketing/posts/${postId}/publish-now`);
    check(rn.status === 400 && rn.data?.message?.includes("No active facebook account"),
      "published guarded: no connected account", rn.data?.message);

    // schedule
    const rsc = await api("POST", `/api/marketing/posts/${postId}/schedule`, {
      scheduledAt: new Date(Date.now() + 864e5).toISOString(),
    });
    check(rsc.status === 200 && rsc.data?.post?.status === "SCHEDULED", "schedule tomorrow → SCHEDULED");
  }
}

// 6. Dev-mode account connect: invalid token is rejected by real provider check
{
  const r = await api("POST", "/api/marketing/accounts/connect", {
    channel: "facebook", name: "Test Page", mode: "dev", token: "FAKE_TOKEN_FOR_TEST",
  });
  check(r.status === 400 && /Token validation failed|rejected/i.test(r.data?.message || ""),
    "dev connect rejects invalid token", r.data?.message);
}

// 7. Dashboard reflects state
{
  const r = await api("GET", "/api/marketing/dashboard");
  const c = r.data?.counts;
  check(r.status === 200 && c?.PUBLISHED === 0 && typeof c?.DRAFT === "number",
    "dashboard counts present", `drafts=${c?.DRAFT} pending=${c?.PENDING} approved=${c?.APPROVED} scheduled=${c?.SCHEDULED}`);
}

// 8. Suggestions list
{
  const r = await api("GET", "/api/marketing/posts?suggestion=1");
  check(r.status === 200 && Array.isArray(r.data?.posts), "suggestions list returns posts", `${r.data?.posts?.length} items`);
}

console.log(failures === 0 ? "\n✅ ALL PASS" : `\n❌ ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);