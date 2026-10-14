import Class from "../models/class.js";

const toId = (value) => {
  if (value && typeof value === "object" && value._id) return String(value._id);
  if (value == null) return "";
  return String(value);
};

const isClassTeacher = (teacher) => {
  const hasFlag = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .includes("class teacher");
  // "Class Teacher" comes from the Job Title select (role) or may be typed
  // into the free-text Designation field.
  return hasFlag(teacher?.role) || hasFlag(teacher?.designation);
};

/**
 * Replicate a teacher's class/subject assignments into the class-side records
 * (Class.details) that attendance, timetable, subject pages, etc. read.
 *
 * Rules:
 *  - For every assigned class a { subjectId, teacherId } row is ensured for
 *    each of the teacher's subjects, in every section. An existing subject
 *    teacher is never overwritten — only empty slots are filled.
 *  - A teacher whose job title is "Class Teacher" becomes the class teacher of
 *    the uniquely vacant section of each assigned class (skips when the class
 *    has several vacant sections or none — those stay managed from the Class
 *    page).
 *  - A class that is no longer assigned drops every link this teacher held on
 *    it. Removing a subject drops the rows this teacher held for that subject
 *    (rows assigned from the Class page for subjects never managed here are
 *    preserved).
 *
 * `options.previousSubjects` is the teacher's subject list before the current
 * save, used to know which rows this form is allowed to remove. Safe to call
 * on both create and update.
 */
export async function syncTeacherToClasses(teacher, options = {}) {
  if (!teacher) return 0;

  const teacherId = toId(teacher._id);
  const schoolId = toId(teacher.schoolId);
  if (!teacherId || !schoolId) return 0;

  const assigned = (teacher.assignedClasses || []).map(toId).filter(Boolean);
  const subjectIds = (teacher.subjects || []).map(toId).filter(Boolean);
  const newSubjects = new Set(subjectIds);
  const previousSubjects = new Set(
    (options.previousSubjects || []).map(toId).filter(Boolean),
  );
  const asClassTeacher = isClassTeacher(teacher);

  const classes = await Class.find({
    schoolId,
    $or: [
      { _id: { $in: assigned } },
      { "details.teacherId": teacherId },
      { "details.subjectTeachers.teacherId": teacherId },
    ],
  });

  let changed = 0;

  for (const cls of classes) {
    const isAssigned = assigned.includes(String(cls._id));
    let dirty = false;

    if (!isAssigned) {
      // Class no longer assigned → drop every link this teacher held on it.
      for (const detail of cls.details || []) {
        if (toId(detail.teacherId) === teacherId) {
          detail.teacherId = null;
          dirty = true;
        }

        const kept = (detail.subjectTeachers || []).filter(
          (row) => toId(row.teacherId) !== teacherId,
        );
        if (kept.length !== (detail.subjectTeachers || []).length) {
          detail.subjectTeachers = kept;
          dirty = true;
        }
      }

      if (dirty) {
        await cls.save();
        changed += 1;
      }
      continue;
    }

    // Assigned class → remove only the subject rows this form just removed,
    // leaving rows created from the Class page untouched.
    for (const detail of cls.details || []) {
      const rows = detail.subjectTeachers || [];
      const kept = rows.filter(
        (row) =>
          !(
            toId(row.teacherId) === teacherId &&
            previousSubjects.has(toId(row.subjectId)) &&
            !newSubjects.has(toId(row.subjectId))
          ),
      );
      if (kept.length !== rows.length) {
        detail.subjectTeachers = kept;
        dirty = true;
      }
    }

    // Class-teacher slot for a uniquely vacant section.
    if (asClassTeacher) {
      const vacant = (cls.details || []).filter((d) => !d.teacherId);
      if (vacant.length === 1) {
        vacant[0].teacherId = teacherId;
        dirty = true;
      }
    }

    // Ensure a subject-teacher row for every selected subject.
    for (const detail of cls.details || []) {
      if (!detail.subjectTeachers) detail.subjectTeachers = [];

      for (const subjectId of subjectIds) {
        const row = detail.subjectTeachers.find(
          (st) => toId(st.subjectId) === subjectId,
        );

        if (!row) {
          detail.subjectTeachers.push({ subjectId, teacherId });
          dirty = true;
        } else if (!row.teacherId) {
          row.teacherId = teacherId;
          dirty = true;
        }
      }
    }

    if (dirty) {
      await cls.save();
      changed += 1;
    }
  }

  return changed;
}

/** Remove every class/subject link belonging to a teacher (used on delete). */
export async function removeTeacherFromClasses(teacherId, schoolId) {
  const tid = toId(teacherId);
  const sid = toId(schoolId);
  if (!tid || !sid) return 0;

  const classes = await Class.find({
    schoolId: sid,
    $or: [
      { "details.teacherId": tid },
      { "details.subjectTeachers.teacherId": tid },
    ],
  });

  let changed = 0;

  for (const cls of classes) {
    let dirty = false;

    for (const detail of cls.details || []) {
      if (toId(detail.teacherId) === tid) {
        detail.teacherId = null;
        dirty = true;
      }

      const kept = (detail.subjectTeachers || []).filter(
        (row) => toId(row.teacherId) !== tid,
      );
      if (kept.length !== (detail.subjectTeachers || []).length) {
        detail.subjectTeachers = kept;
        dirty = true;
      }
    }

    if (dirty) {
      await cls.save();
      changed += 1;
    }
  }

  return changed;
}
