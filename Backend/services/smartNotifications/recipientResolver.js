import mongoose from "mongoose";
import Student from "../../models/student.js";
import Teacher from "../../models/teacher.js";
import Staff from "../../models/staff.js";
import Class from "../../models/class.js";
import School from "../../models/school.js";

function oid(id) {
  if (!id) return null;
  try {
    return new mongoose.Types.ObjectId(String(id));
  } catch {
    return null;
  }
}

function uniqByKey(list, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const k = keyFn(item);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

function studentDisplayName(student) {
  if (!student) return "Student";
  if (student.name) return student.name;
  return [student.firstName, student.lastName].filter(Boolean).join(" ") || "Student";
}

/** Parents are embedded on Student (father/mother/guardian + parentCredentials). */
function resolveParentsForStudent(student) {
  if (!student) return [];
  const recipients = [];
  const studentName = studentDisplayName(student);

  const guardians = [
    {
      key: "father",
      name: student.fatherName || "Father",
      mobile: student.fatherMobile || "",
      email: student.fatherEmail || "",
      active: Boolean(student.fatherName || student.fatherMobile || student.fatherEmail),
    },
    {
      key: "mother",
      name: student.motherName || "Mother",
      mobile: student.motherMobile || "",
      email: student.motherEmail || "",
      active: Boolean(student.motherName || student.motherMobile || student.motherEmail),
    },
    {
      key: "guardian",
      name: student.guardianName || "Guardian",
      mobile: student.guardianMobile || "",
      email: student.guardianEmail || "",
      active: Boolean(student.guardianName || student.guardianMobile),
    },
  ].filter((g) => g.active);

  // Always include at least the primary parent login identity so in-app inbox works
  if (!guardians.length) {
    guardians.push({
      key: "parent",
      name: "Parent",
      mobile: student.parentCredentials?.username || "",
      email: "",
      active: true,
    });
  }

  for (const g of guardians) {
    recipients.push({
      userId: `${g.key}:${student._id}`,
      role: "parent",
      name: g.name,
      email: g.email,
      mobile: g.mobile,
      studentId: student._id,
      studentName,
      teacherId: null,
      staffId: null,
      // In-app targets the student record (parents see via student linkage)
      inboxTarget: { type: "student", studentId: student._id },
    });
  }

  return recipients;
}

function resolveStudentSelf(student) {
  if (!student) return [];
  return [
    {
      userId: String(student._id),
      role: "student",
      name: studentDisplayName(student),
      email: student.email || "",
      mobile: student.mobile || student.phone || "",
      studentId: student._id,
      studentName: studentDisplayName(student),
      teacherId: null,
      staffId: null,
      inboxTarget: { type: "student", studentId: student._id },
    },
  ];
}

async function resolveClassTeacher(schoolId, classId, sectionId) {
  if (!classId && !sectionId) return [];

  let teacherId = null;
  if (classId) {
    const cls = await Class.findOne({ _id: classId, schoolId }).lean();
    if (cls) {
      if (sectionId && Array.isArray(cls.details)) {
        const detail = cls.details.find(
          (d) => String(d.sectionId) === String(sectionId) || String(d._id) === String(sectionId),
        );
        teacherId = detail?.classTeacherId || detail?.teacherId || null;
      }
      teacherId =
        teacherId ||
        cls.classTeacherId ||
        cls.teacherId ||
        cls.details?.[0]?.classTeacherId ||
        null;
    }
  }

  if (!teacherId && sectionId) {
    const cls = await Class.findOne({
      schoolId,
      "details.sectionId": sectionId,
    }).lean();
    const detail = cls?.details?.find((d) => String(d.sectionId) === String(sectionId));
    teacherId = detail?.classTeacherId || detail?.teacherId || null;
  }

  if (!teacherId) return [];
  const teacher = await Teacher.findById(teacherId).lean();
  if (!teacher) return [];
  return [
    {
      userId: String(teacher._id),
      role: "class_teacher",
      name: teacher.name || "Class Teacher",
      email: teacher.email || "",
      mobile: teacher.mobile || teacher.phone || "",
      studentId: null,
      teacherId: teacher._id,
      staffId: null,
      inboxTarget: { type: "teacher", teacherId: teacher._id },
    },
  ];
}

async function resolveTeachers(schoolId, teacherIds = []) {
  const ids = teacherIds.map(oid).filter(Boolean);
  const q = { schoolId };
  if (ids.length) q._id = { $in: ids };
  const teachers = await Teacher.find(q).select("name email mobile phone").lean();
  return teachers.map((t) => ({
    userId: String(t._id),
    role: "teacher",
    name: t.name || "Teacher",
    email: t.email || "",
    mobile: t.mobile || t.phone || "",
    studentId: null,
    teacherId: t._id,
    staffId: null,
    inboxTarget: { type: "teacher", teacherId: t._id },
  }));
}

async function resolveStaff(schoolId, { roles = [], staffIds = [] } = {}) {
  const q = { schoolId };
  if (staffIds.length) q._id = { $in: staffIds.map(oid).filter(Boolean) };
  if (roles.length) {
    q.$or = [
      { role: { $in: roles } },
      { designation: { $in: roles } },
      { staffType: { $in: roles } },
    ];
  }
  const staff = await Staff.find(q).select("name email mobile phone role designation").lean();
  return staff.map((s) => ({
    userId: String(s._id),
    role: "staff",
    name: s.name || "Staff",
    email: s.email || "",
    mobile: s.mobile || s.phone || "",
    studentId: null,
    teacherId: null,
    staffId: s._id,
    inboxTarget: { type: "role", roles: ["staff_admin"], staffId: s._id },
  }));
}

async function resolveSchoolAdmins(schoolId) {
  const school = await School.findById(schoolId).select("adminEmail name email").lean();
  const fromStaff = await resolveStaff(schoolId, {
    roles: ["admin", "school_admin", "principal", "Admin", "Principal"],
  });
  const list = fromStaff.map((s) => ({ ...s, role: "school_admin" }));
  if (school) {
    list.push({
      userId: String(schoolId),
      role: "school_admin",
      name: school.name || "School Admin",
      email: school.adminEmail || school.email || "",
      mobile: "",
      studentId: null,
      teacherId: null,
      staffId: null,
      inboxTarget: { type: "role", roles: ["school_admin"] },
    });
  }
  return uniqByKey(list, (r) => `${r.role}:${r.email || r.userId}`);
}

async function resolveTransportManagers(schoolId) {
  const staff = await resolveStaff(schoolId, {
    roles: ["transport", "transport_manager", "Transport Manager", "Transport"],
  });
  return staff.map((s) => ({ ...s, role: "transport_manager" }));
}

/**
 * Resolve recipients for an event.
 * payload may include: studentId, studentIds, classId, sectionId, teacherIds,
 * staffIds, audience (manual), routeStudentIds, inboxTargets (legacy targets)
 */
export async function resolveRecipients({
  schoolId,
  recipientRoles = ["parent"],
  payload = {},
}) {
  const roles = new Set(recipientRoles || []);
  let recipients = [];

  // Explicit audience from manual broadcast / legacy targets bridge
  if (Array.isArray(payload.audience) && payload.audience.length) {
    return uniqByKey(
      payload.audience.map((a) => ({
        userId: String(a.userId || a.id || a._id || a.email || a.mobile || a.studentId || Math.random()),
        role: a.role || "custom",
        name: a.name || "",
        email: a.email || "",
        mobile: a.mobile || a.phone || "",
        studentId: a.studentId || null,
        teacherId: a.teacherId || null,
        staffId: a.staffId || null,
        inboxTarget: a.inboxTarget || null,
      })),
      (r) => `${r.role}:${r.userId}:${r.email}:${r.mobile}`,
    );
  }

  // Legacy inbox targets passthrough (used when migrating createNotificationHelper)
  if (Array.isArray(payload.inboxTargets) && payload.inboxTargets.length && roles.has("custom")) {
    return [
      {
        userId: `legacy:${Date.now()}`,
        role: "custom",
        name: "Audience",
        email: "",
        mobile: "",
        studentId: null,
        teacherId: null,
        staffId: null,
        inboxTarget: null,
        legacyTargets: payload.inboxTargets,
      },
    ];
  }

  const studentIds = [
    payload.studentId,
    ...(Array.isArray(payload.studentIds) ? payload.studentIds : []),
    ...(Array.isArray(payload.routeStudentIds) ? payload.routeStudentIds : []),
  ]
    .map(oid)
    .filter(Boolean);

  let students = [];
  if (studentIds.length) {
    students = await Student.find({ _id: { $in: studentIds }, schoolId }).lean();
  } else if (payload.classId && (roles.has("parent") || roles.has("student"))) {
    students = await Student.find({
      schoolId,
      $or: [
        { classId: payload.classId },
        { class: payload.classId },
        { "academic.classId": payload.classId },
      ],
    }).lean();
  }

  if (roles.has("parent") || roles.has("guardian")) {
    for (const student of students) {
      recipients.push(...resolveParentsForStudent(student));
    }
  }

  if (roles.has("student")) {
    for (const student of students) {
      recipients.push(...resolveStudentSelf(student));
    }
  }

  if (roles.has("class_teacher")) {
    const classId = payload.classId || students[0]?.classId || students[0]?.class;
    const sectionId = payload.sectionId || students[0]?.sectionId || students[0]?.section;
    recipients.push(...(await resolveClassTeacher(schoolId, classId, sectionId)));
  }

  if (roles.has("teacher")) {
    recipients.push(...(await resolveTeachers(schoolId, payload.teacherIds || [])));
  }

  if (roles.has("staff")) {
    recipients.push(...(await resolveStaff(schoolId, { staffIds: payload.staffIds || [] })));
  }

  if (roles.has("school_admin")) {
    recipients.push(...(await resolveSchoolAdmins(schoolId)));
  }

  if (roles.has("transport_manager")) {
    recipients.push(...(await resolveTransportManagers(schoolId)));
  }

  return uniqByKey(recipients, (r) => `${r.role}:${r.userId}:${r.email}:${r.mobile}`);
}
