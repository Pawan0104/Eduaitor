import Homework from "../models/homework.js";
import Student from "../models/student.js";
import { createNotificationHelper } from "./notificationController.js";

const populateHomework = (query) =>
  query
    .populate("teacherId", "fullName name email")
    .populate("subjectId", "name code")
    .populate("classId", "name")
    .populate("sectionId", "name")
    .populate("students.studentId", "firstName lastName rollNo studentId");

function pickStudentEntry(homework, studentId) {
  return homework.students.find(
    (s) => s.studentId?._id?.toString() === studentId.toString() ||
      s.studentId?.toString() === studentId.toString(),
  );
}

function myStatusView(homework, studentId) {
  const entry = pickStudentEntry(homework, studentId);
  return {
    _id: homework._id,
    title: homework.title,
    description: homework.description,
    dueDate: homework.dueDate,
    date: homework.date,
    createdAt: homework.createdAt,
    teacherId: homework.teacherId,
    subjectId: homework.subjectId,
    classId: homework.classId,
    sectionId: homework.sectionId,
    myStatus: entry
      ? {
          status: entry.status,
          markedDoneBy: entry.markedDoneBy,
          markedDoneAt: entry.markedDoneAt,
          teacherRemark: entry.teacherRemark || "",
          completedAt: entry.completedAt,
        }
      : null,
  };
}

/* ── Teacher: assign homework ─────────────────────────────── */
export const createHomework = async (req, res) => {
  try {
    if (req.user.role !== "teacher_admin") {
      return res.status(403).json({ error: "Only teachers can assign homework" });
    }

    const { classId, sectionId, subjectId, title, description, dueDate } = req.body;
    if (!classId || !sectionId || !title?.trim() || !description?.trim() || !dueDate) {
      return res.status(400).json({
        error: "classId, sectionId, title, description and dueDate are required",
      });
    }

    const schoolId = req.user.school_id;
    const teacherId = req.user.teacher_id;

    const students = await Student.find({ schoolId, classId, sectionId })
      .select("_id")
      .lean();

    if (!students.length) {
      return res.status(400).json({
        error: "No students found in this class/section",
      });
    }

    const homework = await Homework.create({
      schoolId,
      teacherId,
      classId,
      sectionId,
      subjectId: subjectId || undefined,
      title: title.trim(),
      description: description.trim(),
      dueDate,
      students: students.map((s) => ({
        studentId: s._id,
        status: "assigned",
      })),
    });

    try {
      await createNotificationHelper({
        title: "New Homework Assigned",
        message: `${title.trim()}${
          dueDate
            ? ` — Due: ${new Date(dueDate).toLocaleDateString("en-IN")}`
            : ""
        }`,
        notificationType: "homework",
        createdBy: req.user._id,
        schoolId,
        targets: [{ type: "class", classId, sectionId }],
      });
    } catch (notifErr) {
      console.error("Homework assign notification error:", notifErr);
    }

    const populated = await populateHomework(Homework.findById(homework._id));
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ── Teacher: list own homework ───────────────────────────── */
export const getTeacherHomework = async (req, res) => {
  try {
    const list = await populateHomework(
      Homework.find({
        schoolId: req.user.school_id,
        teacherId: req.user.teacher_id,
      }).sort({ createdAt: -1 }),
    );
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ── School/staff: list school homework ───────────────────── */
export const getSchoolHomework = async (req, res) => {
  try {
    const { classId, sectionId, teacherId } = req.query;
    const filter = { schoolId: req.user.school_id };
    if (classId) filter.classId = classId;
    if (sectionId) filter.sectionId = sectionId;
    if (teacherId) filter.teacherId = teacherId;

    const list = await populateHomework(
      Homework.find(filter).sort({ createdAt: -1 }).limit(200),
    );
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ── Teacher: single homework with student statuses ───────── */
export const getHomeworkById = async (req, res) => {
  try {
    const homework = await populateHomework(Homework.findById(req.params.id));
    if (!homework) {
      return res.status(404).json({ error: "Homework not found" });
    }
    if (String(homework.schoolId) !== String(req.user.school_id)) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json(homework);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ── Parent/student: list homework for linked student ─────── */
export const getMyHomework = async (req, res) => {
  try {
    const studentId = req.user.student_id;
    if (!studentId) {
      return res.status(400).json({ error: "Student not linked to account" });
    }

    const list = await populateHomework(
      Homework.find({
        schoolId: req.user.school_id,
        "students.studentId": studentId,
      }).sort({ createdAt: -1 }),
    );

    res.json(list.map((hw) => myStatusView(hw, studentId)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ── Parent/student: mark homework done ───────────────────── */
export const markHomeworkDone = async (req, res) => {
  try {
    const studentId = req.user.student_id;
    if (!studentId) {
      return res.status(400).json({ error: "Student not linked to account" });
    }

    const homework = await Homework.findOne({
      _id: req.params.id,
      schoolId: req.user.school_id,
      "students.studentId": studentId,
    });

    if (!homework) {
      return res.status(404).json({ error: "Homework not found" });
    }

    const entry = pickStudentEntry(homework, studentId);
    if (!entry) {
      return res.status(404).json({ error: "Student not on this homework" });
    }
    if (entry.status === "completed") {
      return res.status(400).json({
        error: "Homework already completed by teacher",
      });
    }
    if (entry.status === "marked_done") {
      return res.status(400).json({ error: "Already marked as done" });
    }

    const markedBy = req.user.loginAs === "parent" ? "parent" : "student";
    entry.status = "marked_done";
    entry.markedDoneBy = markedBy;
    entry.markedDoneAt = new Date();
    await homework.save();

    const student = await Student.findById(studentId)
      .select("firstName lastName")
      .lean();
    const studentName = student
      ? `${student.firstName} ${student.lastName}`
      : "Student";

    try {
      await createNotificationHelper({
        title: "Homework Marked Done",
        message: `${studentName} marked "${homework.title}" as done. Please review.`,
        notificationType: "homework",
        createdBy: req.user._id,
        schoolId: req.user.school_id,
        targets: [
          {
            type: "teacher",
            teacherId: homework.teacherId,
          },
        ],
      });
    } catch (notifErr) {
      console.error("Homework mark-done notification error:", notifErr);
    }

    const populated = await populateHomework(Homework.findById(homework._id));
    res.json(myStatusView(populated, studentId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ── Teacher: remark and/or approve ───────────────────────── */
export const reviewHomework = async (req, res) => {
  try {
    if (req.user.role !== "teacher_admin") {
      return res.status(403).json({ error: "Only teachers can review homework" });
    }

    const { studentId, remark, approve } = req.body;
    if (!studentId) {
      return res.status(400).json({ error: "studentId is required" });
    }

    const homework = await Homework.findOne({
      _id: req.params.id,
      schoolId: req.user.school_id,
      teacherId: req.user.teacher_id,
    });

    if (!homework) {
      return res.status(404).json({ error: "Homework not found" });
    }

    const entry = pickStudentEntry(homework, studentId);
    if (!entry) {
      return res.status(404).json({ error: "Student not on this homework" });
    }

    if (typeof remark === "string") {
      entry.teacherRemark = remark.trim();
    }

    const shouldApprove = approve === true || approve === "true";
    if (shouldApprove) {
      if (entry.status !== "marked_done" && entry.status !== "completed") {
        return res.status(400).json({
          error: "Student must mark homework as done before you can approve",
        });
      }
      entry.status = "completed";
      entry.completedAt = new Date();
      entry.completedBy = req.user._id;
    }

    await homework.save();

    const student = await Student.findById(studentId)
      .select("firstName lastName")
      .lean();
    const studentName = student
      ? `${student.firstName} ${student.lastName}`
      : "Student";

    try {
      let title = "Homework Remark";
      let message = `Teacher added a remark on "${homework.title}" for ${studentName}.`;
      if (shouldApprove) {
        title = "Homework Completed";
        message = `"${homework.title}" has been approved by the teacher${
          entry.teacherRemark ? `: ${entry.teacherRemark}` : "."
        }`;
      } else if (entry.teacherRemark) {
        message = `Teacher remark on "${homework.title}": ${entry.teacherRemark}`;
      }

      await createNotificationHelper({
        title,
        message,
        notificationType: "homework",
        createdBy: req.user._id,
        schoolId: req.user.school_id,
        targets: [{ type: "student", studentId }],
      });
    } catch (notifErr) {
      console.error("Homework review notification error:", notifErr);
    }

    const populated = await populateHomework(Homework.findById(homework._id));
    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ── Teacher: update homework details ─────────────────────── */
export const updateHomework = async (req, res) => {
  try {
    if (req.user.role !== "teacher_admin") {
      return res.status(403).json({ error: "Only teachers can update homework" });
    }

    const allowed = ["title", "description", "dueDate", "subjectId"];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const homework = await Homework.findOneAndUpdate(
      {
        _id: req.params.id,
        schoolId: req.user.school_id,
        teacherId: req.user.teacher_id,
      },
      updates,
      { new: true },
    );

    if (!homework) {
      return res.status(404).json({ error: "Homework not found" });
    }

    const populated = await populateHomework(Homework.findById(homework._id));
    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ── Teacher: delete homework ─────────────────────────────── */
export const deleteHomework = async (req, res) => {
  try {
    if (req.user.role !== "teacher_admin") {
      return res.status(403).json({ error: "Only teachers can delete homework" });
    }

    const deleted = await Homework.findOneAndDelete({
      _id: req.params.id,
      schoolId: req.user.school_id,
      teacherId: req.user.teacher_id,
    });

    if (!deleted) {
      return res.status(404).json({ error: "Homework not found" });
    }

    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
