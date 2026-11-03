import Registration from "../models/registration.js";
import EntranceExam from "../models/entranceExam.js";
import AcademicYear from "../models/academicYearSchema.js";
import { currentSessionName } from "./academicSession.js";

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

/** Next "REG0001"-style number for a school. */
export const nextRegistrationNumber = async (schoolId) => {
  const rows = await Registration.find({ schoolId })
    .select("registrationNumber")
    .lean();
  let max = 0;
  for (const row of rows) {
    const match = /^REG(\d+)$/i.exec(String(row.registrationNumber || ""));
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `REG${String(max + 1).padStart(4, "0")}`;
};

export const activeSessionName = async (schoolId) => {
  const active = await AcademicYear.findOne({ schoolId, isActive: true })
    .select("name")
    .lean();
  return active?.name || currentSessionName();
};

/** Nearest upcoming entrance exam scheduled for a class. */
export const findExamForClass = async (schoolId, classId) =>
  EntranceExam.findOne({
    schoolId,
    classId,
    status: "scheduled",
    examDate: { $gte: startOfToday() },
  })
    .sort({ examDate: 1, startTime: 1 })
    .lean();

export const examSnapshot = (exam) => ({
  examName: exam.name || "",
  examDate: exam.examDate || null,
  startTime: exam.startTime || "",
  endTime: exam.endTime || "",
  venue: exam.venue || "",
  totalMarks: Number(exam.totalMarks || 0),
  passingMarks: Number(exam.passingMarks || 0),
  obtainedMarks: null,
  result: "pending",
  remarks: "",
  updatedAt: new Date(),
});

export const emptyEntrance = () => ({
  examName: "",
  examDate: null,
  startTime: "",
  endTime: "",
  venue: "",
  totalMarks: 0,
  passingMarks: 0,
  obtainedMarks: null,
  result: "pending",
  remarks: "",
  updatedAt: null,
});

export const linkExam = (registration, exam) => {
  registration.entranceExamId = exam._id;
  registration.entrance = examSnapshot(exam);
  if (["registered", "cancelled"].includes(registration.status)) {
    registration.status = "exam_scheduled";
  }
  return registration;
};

export const unlinkExam = (registration) => {
  registration.entranceExamId = null;
  registration.entrance = emptyEntrance();
  if (["exam_scheduled", "passed", "failed"].includes(registration.status)) {
    registration.status = "registered";
  }
  return registration;
};
