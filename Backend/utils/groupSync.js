import Group from "../models/group.js";
import Class from "../models/class.js";

// ADD student to correct groups
export const syncStudentGroups = async (student) => {
  const { _id, schoolId, classId, sectionId } = student;

  // Class group
  const classGroup = await Group.findOne({
    schoolId,
    type: "class",
    classId,
    status: "Active",
  });

  if (classGroup) {
    const existingMember = classGroup.members.find(
      (m) => m.userId.toString() === _id.toString(),
    );

    if (!existingMember) {
      classGroup.members.push({
        userId: _id,
        userType: "student",
      });
      await classGroup.save();
    } else if (existingMember.isManuallyRemoved) {
      existingMember.isManuallyRemoved = false;
      await classGroup.save();
    }
  }

  // Section group
  if (sectionId) {
    const sectionGroup = await Group.findOne({
      schoolId,
      type: "section",
      classId,
      sectionId,
      status: "Active",
    });

    if (sectionGroup) {
      const existingMember = sectionGroup.members.find(
        (m) => m.userId.toString() === _id.toString(),
      );

      if (!existingMember) {
        sectionGroup.members.push({
          userId: _id,
          userType: "student",
        });
        await sectionGroup.save();
      } else if (existingMember.isManuallyRemoved) {
        existingMember.isManuallyRemoved = false;
        await sectionGroup.save();
      }
    }
  }

  // Subject groups
  const subjectGroups = await Group.find({
    schoolId,
    type: "subject",
    classId,
    sectionId,
    status: "Active",
  });

  for (const group of subjectGroups) {
    const existingMember = group.members.find(
      (m) => m.userId.toString() === _id.toString(),
    );

    if (!existingMember) {
      group.members.push({
        userId: _id,
        userType: "student",
      });
      await group.save();
    } else if (existingMember.isManuallyRemoved) {
      existingMember.isManuallyRemoved = false;
      await group.save();
    }
  }
};

// REMOVE student from old groups
export const removeStudentFromOldGroups = async (oldStudent) => {
  const { _id, schoolId } = oldStudent;

  await Group.updateMany(
    {
      schoolId,
      isAutoCreated: true,
      "members.userId": _id,
    },
    {
      $set: {
        "members.$[elem].isManuallyRemoved": true,
      },
    },
    {
      arrayFilters: [{ "elem.userId": _id }],
    },
  );
};

export const syncTeacherGroups = async (teacher) => {
  const { _id, schoolId, assignedClasses = [] } = teacher;

  // ─── CLASS GROUPS ─────────────────────────
  const classGroups = await Group.find({
    schoolId,
    type: "class",
    classId: { $in: assignedClasses },
    status: "Active",
  });

  for (const group of classGroups) {
    const existingMember = group.members.find(
      (m) => m.userId.toString() === _id.toString(),
    );

    if (!existingMember) {
      group.members.push({
        userId: _id,
        userType: "teacher",
      });
      await group.save();
    } else if (existingMember.isManuallyRemoved) {
      existingMember.isManuallyRemoved = false;
      await group.save();
    }
  }

  // ─── SUBJECT GROUPS ───────────────────────
  const subjectGroups = await Group.find({
    schoolId,
    type: "subject",
    status: "Active",
  });

  const classIds = [...new Set(subjectGroups.map((g) => g.classId.toString()))];

  const classes = await Class.find({ _id: { $in: classIds } });

  const classMap = new Map(classes.map((c) => [c._id.toString(), c]));

  for (const group of subjectGroups) {
    const { classId, sectionId, subjectId } = group;

    // get class data
    const classData = classMap.get(classId.toString());
    if (!classData) continue;

    const section = classData.details.find(
      (d) => d.sectionId?.toString() === sectionId?.toString(),
    );

    if (!section) continue;

    const teachesSubject = section.subjectTeachers.some(
      (st) =>
        st.teacherId?.toString() === _id.toString() &&
        st.subjectId?.toString() === subjectId?.toString(),
    );

    if (!teachesSubject) continue;

    const existingMember = group.members.find(
      (m) => m.userId.toString() === _id.toString(),
    );

    if (!existingMember) {
      group.members.push({
        userId: _id,
        userType: "teacher",
      });
      await group.save();
    } else if (existingMember.isManuallyRemoved) {
      existingMember.isManuallyRemoved = false;
      await group.save();
    }
  }
};

export const removeTeacherFromOldGroups = async (oldTeacher) => {
  const { _id, schoolId } = oldTeacher;

  await Group.updateMany(
    {
      schoolId,
      isAutoCreated: true,
      "members.userId": _id,
    },
    {
      $set: {
        "members.$[elem].isManuallyRemoved": true,
      },
    },
    {
      arrayFilters: [{ "elem.userId": _id }],
    },
  );
};
