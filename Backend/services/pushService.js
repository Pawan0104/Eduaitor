import admin from "firebase-admin";
import School from "../../models/school.js";
import Teacher from "../../models/teacher.js";
import Staff from "../../models/staff.js";
import Student from "../../models/student.js";
import Section from "../../models/section.js";
import Class from "../../models/class.js";
import DeviceToken from "../../models/deviceToken.js";

// ── Lazy firebase-admin (one global instance; safe no-op when unconfigured) ────
let app = null;
let appKey = null;

function getApp() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT || "";
  // Turn a plain JSON string (Render secret may strip nothing) or a base64 string
  // into a real service-account object. Admin-SDK supports either project_id form.
  if (!raw) return null; // push not configured → backend behaves exactly as before
  if (app && appKey === raw) return app === "UNCONFIGURED" ? null : app;

  try {
    const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const svc = JSON.parse(json);
    app = admin.initializeApp(
      { credential: admin.credential.cert(svc), projectId: svc.project_id },
      "eduaitor-push",
    );
    appKey = raw;
    return app;
  } catch (err) {
    console.error("[push] FCM init failed (keeping app push-disabled):", err.message);
    app = "UNCONFIGURED";
    appKey = raw;
    return null;
  }
}

/**
 * ── resolvePushRecipients(targets, schoolId) ──────────────────────────────────
 * Given the notification's `targets` (already scoped with schoolId, exactly the
 * same array the in-app bell uses), work out WHICH account documents should
 * receive it. This mirrors `buildTargetQuery` in reverse, so a device push and
 * the in-app bell reach identical audiences.
 *
 * Returns distinct account ids + their role label (the same identity key the
 * DeviceToken model stores), grouped as { accountId, role }.
 */
export const resolvePushRecipients = async (targets, schoolId) => {
  const accounts = new Map(); // key `${role}:${accountId}` → { accountId, role }

  const addRoleIds = (role, ids) => {
    for (const id of ids) {
      if (id) accounts.set(`${role}:${String(id)}`, { accountId: id, role });
    }
  };

  const targetList = Array.isArray(targets) ? targets : [];
  for (const t of targetList) {
    const tSchool = t?.schoolId || schoolId;
    const type = t?.type;

    if (type === "all") {
      // Everyone in the school.
      const [school, teachers, staff, students] = await Promise.all([
        School.find({ _id: tSchool }).select("_id").lean(),
        Teacher.find({ schoolId: tSchool }).select("_id").lean(),
        Staff.find({ schoolId: tSchool }).select("_id").lean(),
        Student.find({ schoolId: tSchool }).select("_id").lean(),
      ]);
      addRoleIds("school_admin", school.map((x) => x._id));
      addRoleIds("teacher_admin", teachers.map((x) => x._id));
      addRoleIds("staff_admin", staff.map((x) => x._id));
      addRoleIds("student_admin", students.map((x) => x._id));
      continue;
    }

    if (type === "role") {
      const roles = t?.roles || [];
      if (roles.includes("school_admin"))
        addRoleIds("school_admin", (await School.find({ _id: tSchool }).select("_id").lean()).map((x) => x._id));
      if (roles.includes("teacher_admin"))
        addRoleIds("teacher_admin", (await Teacher.find({ schoolId: tSchool }).select("_id").lean()).map((x) => x._id));
      if (roles.includes("staff_admin"))
        addRoleIds("staff_admin", (await Staff.find({ schoolId: tSchool }).select("_id").lean()).map((x) => x._id));
      if (roles.includes("student_admin"))
        addRoleIds("student_admin", (await Student.find({ schoolId: tSchool }).select("_id").lean()).map((x) => x._id));
      continue;
    }

    // Class-targeted (both the legacy single `classId` field AND the newer
    // multi-class `classes: [{classId, sectionId}]` arrays).
    const classRefs = [];
    if (type === "class") {
      if (t?.classId) classRefs.push({ classId: t.classId, sectionId: t.sectionId || null });
      if (Array.isArray(t?.classes)) classRefs.push(...t.classes);
    } else if (type === "classes") {
      if (Array.isArray(t?.classes)) classRefs.push(...t.classes);
    }

    if (classRefs.length) {
      const classIds = [...new Set(classRefs.map((c) => String(c.classId)).filter(Boolean))];
      if (classIds.length) {
        const students = await Student.find({
          schoolId: tSchool,
          classId: { $in: classIds },
        })
          .select("_id")
          .lean();
        addRoleIds("student_admin", students.map((x) => x._id));
      }
      continue;
    }

    // Direct/single account targets (same shape buildTargetQuery honours).
    if (type === "student" && t?.studentId) addRoleIds("student_admin", [t.studentId]);
    if (type === "teacher" && t?.teacherId) addRoleIds("teacher_admin", [t.teacherId]);
    if (type === "staff" && t?.staffId) addRoleIds("staff_admin", [t.staffId]);
    if (type === "school" && t?.schoolId) addRoleIds("school_admin", [t.schoolId]);
  }

  return [...accounts.values()];
};

/** Pull every (unique) device token for a set of recipients. */
export const getDeviceTokensForRecipients = async (recipients, schoolId) => {
  const tokens = new Set();
  for (const r of recipients) {
    const rows = await DeviceToken.find({
      accountId: r.accountId,
      role: r.role,
      ...(schoolId ? { schoolId } : {}),
    })
      .select("token platform")
      .lean();
    rows.forEach((x) => tokens.add(x.token));
  }
  return [...tokens];
};

/** Send one notification payload to an FCM token list (chunked @500). Never throws. */
export const sendPushPayload = async ({ tokens, title, body, data = {}, screen }) => {
  if (!tokens || tokens.length === 0) return;
  const fcm = getApp();
  if (!fcm) return; // not configured — skip silently
  const messaging = fcm.messaging();

  const payloadData = {
    ...data,
    ...(screen ? { screen } : {}),
    click_action: "FLUTTER_NOTIFICATION_CLICK", // legacy-safe; modern apps use screens
  };
  void Object.entries(payloadData).forEach(([k, v]) => {
    if (typeof v !== "string") payloadData[k] = String(v ?? "");
  });

  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);
    try {
      await messaging.sendEachForMulticast({
        tokens: batch,
        notification: { title, body },
        data: payloadData,
        android: { priority: "high" },
        webpush: { headers: { TTL: "86400" } },
      });
    } catch (err) {
      console.error("[push] FCM multicast failed:", err.message);
    }
  }
};
