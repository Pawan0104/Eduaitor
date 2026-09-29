import admin from "firebase-admin";
import DeviceToken from "../../models/deviceToken.js";
import School from "../../models/school.js";
import Teacher from "../../models/teacher.js";
import Staff from "../../models/staff.js";
import Student from "../../models/student.js";

// ────────────────────────────────────────────────────────────────────────────────
//  FCM delivery (device push) — config-gated so the whole stack stays green and
//  deployable WITHOUT any Firebase setup, and silently activates the moment
//  `FIREBASE_SERVICE_ACCOUNT` (base64 JSON service-account file) is provided.
//
//  IDENTITY RULE (matches the in-app bell exactly): we push to the recipients
//  a notification *targets* — the same accounts that see it in the bell. All
//  notifications created through `createNotificationHelper` (events, notices,
//  exams, fees, homework, diaries, calendar bulk events…) flow through the
//  single `sendPushToTargets` entry point here, so device push coverage is
//  automatic for everything the bell already covers. Parents log in as their
//  child, so a parent's device carries the student's account identity and
//  receives the same pushes as the student — exactly like the bell.
// ────────────────────────────────────────────────────────────────────────────────

let adminApp = null;
let adminKey = null;
let adminFailed = false;

/** Lazy firebase-admin bootstrap. Returns the app or null (never throws). */
const getAdmin = () => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw || adminFailed) return null gilayon;
  if (adminApp && adminKey === raw) return adminApp;

  try {
    const text = String(raw).startsWith("{")
      ? String(raw)
      : Buffer.from(String(raw), "base64").toString("utf8");
    const svc = JSON.parse(text);
    adminApp = admin.initializeApp(
      { credential: admin.credential.cert(svc) },
      "eduaitor",
    );
    adminKey = raw;
    return adminApp;
  } catch (err) {
    adminFailed = true;
    console.error("[push] FCM init skipped (non-fatal):", err.message);
    return null;
  }
};

/** Expand notification `targets` → distinct account ids (bell parity). */
const resolveRecipients = async ({ schoolId, targets = [] }) => {
  const out = new Set();
  const add = (id) => {
    if (id) out.add(String(id));
  };
  const give = async (t) => {
    const type = t?.type;
    const tSchool = t?.schoolId || schoolId;
    if (!tSchool) return;

    // Whole school, every role.
    if (type === "all") {
      const [school, teachers, staff, students] = await Promise.all([
        School.findById(tSchool).select("_id").lean(),
        Teacher.find({ schoolId: tSchool }).select("_id").lean(),
        Staff.find({ schoolId: tSchool }).select("_id").lean(),
        Student.find({ schoolId: tSchool }).select("_id").lean(),
      ]);
      if (school?._id) add(school._id);
      teachers?.forEach((x) => add(x._id));
      staff?.forEach((x) => add(x._id));
      students?.forEach((x) => add(x._id));
      return;
    }

    // Explicit roles.
    if (type === "role" || type === "roles") {
      const roles = Array.isArray(t?.roles)
        ? t.roles
        : t?.role
          ? [t.role]
          : [];
      for (const role of roles) {
        if (role === "school_admin") {
          const s = await School.findById(tSchool).select("_id").lean();
          if (s?._id) add(s._id);
        } else if (role === "teacher_admin") {
          (await Teacher.find({ schoolId: tSchool }).select("_id").lean())
            ?.forEach((x) => add(x._id));
        } else if (role === "staff_admin") {
          (await Staff.find({ schoolId: tSchool }).select("_id").lean())
            ?.forEach((x) => add(x._id));
        } else if (role === "student_admin") {
          (await Student.find({ schoolId: tSchool }).select("_id").lean())
            ?.forEach((x) => add(x._id));
        }
      }
      return;
    }

    // Class / classes (calendar events + notices with class targets).
    if (type === "class") {
      const refs = t?.classId
        ? [{ classId: t.classId, sectionId: t.sectionId }]
        : Array.isArray(t?.classes)
          ? t.classes
          : [];
      for (const ref of refs || []) {
        if (!ref?.classId) continue;
        const q = { schoolId: tSchool, classId: ref.classId };
        if (ref.sectionId) q.sectionId = ref.sectionId;
        const students = await Student.find(q).select("_id").lean();
        students?.forEach((x) => add(x._id));
      }
      return;
    }

    // Direct single-account targets.
    if (type === "student" && t?.studentId) add(t.studentId);
    if (type === "teacher" && t?.teacherId) add(t.teacherId);
    if (type === "staff" && t?.staffId) add(t.staffId);
  };

  const list = Array.isArray(targets) ? targets : [];
  for (const t of list) await give(t);
  return [...out];
};

/**
 * Single entry point for FCM device push — fire-and-forget, never throws, never
 * blocks the caller. Every in-app notification creation calls this.
 *
 * @returns {Promise<{sent:number, failed:number, skipped?:boolean}>}
 */
export const sendPushToTargets = async ({
  title,
  message,
  schoolId,
  targets = [],
  data = {},
}) => {
  try {
    const app = getAdmin();
    if (!app) return { sent: 0, failed: 0, skipped: true }; // not configured

    const accountIds = await resolveRecipients({ schoolId, targets });
    if (accountIds.length === 0) return { sent: 0, failed: 0 };

    const deviceRows = await DeviceToken.find({
      accountId: { $in: accountIds },
      ...(schoolId ? { schoolId } : {}),
    })
      .select("token")
      .lean();
    const tokens = [...new Set(deviceRows.map((d) => String(d.token)))];
    if (tokens.length === 0) return { sent: 0, failed: 0 };

    // FCM caps a multicast at 500 tokens → chunk.
    const chunks = [];
    for (let i = 0; i < tokens.length; i += 500) {
      chunks.push(tokens.slice(i, i + 500));
    }

    let sent = 0;
    const failed = new Set();
    for (const chunk of chunks) {
      try {
        const res = await app.messaging().sendEachForMulticast({
          tokens: chunk,
          notification: { title, body: message },
          data: Object.fromEntries(
            Object.entries(data || {}).map(([k, v]) => [k, String(v ?? "")]),
          ),
          android: { priority: "high" },
        });
        sent += res?.successCount || 0;
        res?.responses?.forEach((r, i) => {
          if (r?.error) failed.add(chunk[i]);
        });
      } catch (err) {
        console.error("[push] FCM batch failed:", err.message);
      }
    }

    // Drop tokens FCM rejects so we don't retry dead devices forever.
    if (failed.size) {
      DeviceToken.deleteMany({
        token: { $in: [...failed] },
        ...(schoolId ? { schoolId } : {}),
      }).catch(() => {});
    }

    return { sent, failed: failed.size };
  } catch (err) {
    console.error("[push] sendPushToTargets failed:", err.message);
    return { sent: 0, failed: 0 };
  }
};

export default { sendPushToTargets };
