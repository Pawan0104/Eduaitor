import Student from "../models/student.js";

/** Normalize parent login username (father mobile). */
export function normalizeParentUsername(value) {
  return String(value || "").trim();
}

/** Lightweight child card for parent UI / JWT payloads. */
export function toChildSummary(student) {
  if (!student) return null;
  return {
    _id: student._id,
    name: `${student.firstName || ""} ${student.lastName || ""}`.trim(),
    className: student.classId?.name || student.classId?.className || "",
    sectionName: student.sectionId?.name || student.sectionId?.sectionName || "",
    rollNo: student.rollNo || "",
    studentId: student.studentId || "",
    username:
      student.studentCredentials?.username || student.studentId || "",
    photo_url: student.documents?.studentPhoto?.url || null,
  };
}

/**
 * All students in a school sharing the same parent username (father mobile).
 */
export async function findChildrenByParentUsername(parentUsername, schoolId) {
  const username = normalizeParentUsername(parentUsername);
  if (!username || !schoolId) return [];

  const list = await Student.find({
    schoolId,
    "parentCredentials.username": username,
  })
    .populate("classId", "name className")
    .populate("sectionId", "name sectionName")
    .select(
      "firstName lastName rollNo studentId classId sectionId documents.studentPhoto parentCredentials studentCredentials.username schoolId",
    )
    .sort({ firstName: 1, lastName: 1 })
    .lean();

  return list;
}

/** Reuse sibling parent credentials when admitting another child. */
export async function resolveParentCredentialsForCreate({
  schoolId,
  fatherMobile,
  hashedPassword,
  rawPassword,
}) {
  const username = normalizeParentUsername(fatherMobile);
  if (!username) {
    return {
      username: "",
      password: hashedPassword,
      temp_password: rawPassword || undefined,
      firstTimeLogin: true,
    };
  }

  const sibling = await Student.findOne({
    schoolId,
    "parentCredentials.username": username,
    "parentCredentials.password": { $exists: true, $ne: null },
  })
    .select("parentCredentials")
    .lean();

  if (sibling?.parentCredentials?.password) {
    return {
      username,
      password: sibling.parentCredentials.password,
      temp_password: sibling.parentCredentials.temp_password,
      firstTimeLogin: sibling.parentCredentials.firstTimeLogin ?? false,
    };
  }

  return {
    username,
    password: hashedPassword,
    temp_password: rawPassword || undefined,
    firstTimeLogin: true,
  };
}
