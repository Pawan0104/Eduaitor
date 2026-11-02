/**
 * One-time (idempotent) backfill for academic sessions.
 *
 * - Creates a default ACTIVE session for every school (current April-March year).
 * - Tags existing students/timetables/assignments with the active session.
 * - Tags date-based records with the session that contains their date
 *   (payments, attendance, exams, results, homework, diary, notices, events,
 *   class tests), falling back to the active session when no date exists.
 * - Creates an AcademicYear document for every derived label so admins can
 *   switch to historical sessions.
 * - Migrates the timetable unique index to include academicYear.
 *
 * Usage: node scripts/backfillAcademicSessions.js
 */
import "dotenv/config";
import mongoose from "mongoose";

import AcademicYear from "../models/academicYearSchema.js";
import Student from "../models/student.js";
import Payment from "../models/payment.js";
import Attendance from "../models/attendance.js";
import ClassAttendance from "../models/classAttendance.js";
import Exam from "../models/exam.js";
import Result from "../models/result.js";
import Timetable from "../models/timetable.js";
import Homework from "../models/homework.js";
import Assignment from "../models/assignment.js";
import Diary from "../models/diary.js";
import Notice from "../models/notice.js";
import Event from "../models/event.js";
import ClassTest from "../models/classTest.js";
import {
  currentSessionName,
  sessionDates,
  sessionNameFromDate,
  SESSION_NAME_RE,
} from "../utils/academicSession.js";

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error("MONGO_URI missing");
  process.exit(1);
}

const UNTAGGED = {
  $or: [
    { academicYear: { $exists: false } },
    { academicYear: null },
    { academicYear: "" },
  ],
};

/** Collections tagged by their own date field. */
const DATE_COLLECTIONS = [
  { key: "payments", model: Payment, fields: ["paidDate"] },
  { key: "attendance", model: Attendance, fields: ["date"] },
  { key: "classAttendance", model: ClassAttendance, fields: ["date"] },
  { key: "exams", model: Exam, fields: ["examDate"] },
  { key: "homework", model: Homework, fields: ["date", "dueDate", "createdAt"] },
  { key: "diary", model: Diary, fields: ["date", "createdAt"] },
  { key: "notices", model: Notice, fields: ["publishDate", "createdAt"] },
  { key: "events", model: Event, fields: ["startDate", "createdAt"] },
  { key: "classTests", model: ClassTest, fields: ["testDate", "createdAt"] },
];

/** Collections that belong to the active session until the next rollover. */
const ACTIVE_COLLECTIONS = [
  { key: "students", model: Student },
  { key: "timetables", model: Timetable },
  { key: "assignments", model: Assignment },
];

const firstDate = (doc, fields) => {
  for (const field of fields) {
    const value = doc[field];
    if (value) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date;
    }
  }
  return null;
};

const ensureLabel = async (schoolId, name, activeName, createdLabels) => {
  if (!name) return;
  const exists = await AcademicYear.findOne({ schoolId, name }).lean();
  if (!exists) {
        const { startDate, endDate } = sessionDates(name);
    try {
      await AcademicYear.create({
        schoolId,
        name,
        startDate,
        endDate,
        isActive: name === activeName,
      });
      createdLabels.add(name);
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }
  }
};

const tagByDate = async ({ schoolId, entry, activeName, createdLabels }) => {
  const docs = await entry.model
    .find({ schoolId, ...UNTAGGED })
    .select(["_id", ...entry.fields].join(" "))
    .setOptions({ skipSession: true })
    .lean();

  const bySession = new Map();
  for (const doc of docs) {
    const date = firstDate(doc, entry.fields);
    const name = date ? sessionNameFromDate(date) : activeName;
    if (!name) continue;
    if (!bySession.has(name)) bySession.set(name, []);
    bySession.get(name).push(doc._id);
  }

  let moved = 0;
  for (const [name, ids] of bySession.entries()) {
    await ensureLabel(schoolId, name, activeName, createdLabels);
    if (!ids.length) continue;
    const result = await entry.model
      .updateMany(
        { _id: { $in: ids }, ...UNTAGGED },
        { $set: { academicYear: name } }
      )
      .setOptions({ skipSession: true });
    moved += result.modifiedCount || 0;
  }
  return moved;
};

const tagActive = async ({ schoolId, entry, activeName }) => {
  const result = await entry.model
    .updateMany({ schoolId, ...UNTAGGED }, { $set: { academicYear: activeName } })
    .setOptions({ skipSession: true });
  return result.modifiedCount || 0;
};

const migrateTimetableIndex = async () => {
  const col = mongoose.connection.db.collection("timetables");
  const indexes = await col.indexes().catch(() => []);
  const legacy = indexes.find((idx) => {
    const keys = Object.keys(idx.key || {});
    return (
      idx.unique &&
      keys.length === 3 &&
      keys[0] === "schoolId" &&
      keys[1] === "classId" &&
      keys[2] === "detailId"
    );
  });
  if (legacy) {
    await col.dropIndex(legacy.name);
    console.log(`  dropped legacy timetable index ${legacy.name}`);
  }
  const wanted = {
    schoolId: 1,
    classId: 1,
    detailId: 1,
    academicYear: 1,
  };
  const already = await col
    .indexes()
    .then((list) =>
      list.some(
        (idx) =>
          idx.unique &&
          Object.keys(idx.key || {}).length === 4 &&
          Object.entries(wanted).every(([k, v]) => idx.key[k] === v)
      )
    )
    .catch(() => false);
  if (!already) {
    await col.createIndex(wanted, {
      unique: true,
      name: "one_timetable_per_class_detail_session",
    });
    console.log("  created session-scoped timetable index");
  }
};

const main = async () => {
  await mongoose.connect(uri);
  console.log("Connected to MongoDB\n");

  const schools = await mongoose.connection.db
    .collection("schools")
    .find({}, { projection: { _id: 1, name: 1 } })
    .toArray();

  console.log(`Schools: ${schools.length}`);
  const totals = {};

  for (const school of schools) {
    const schoolId = school._id;
    const activeName = currentSessionName();

    // Ensure the default active session exists.
    let active = await AcademicYear.findOne({
      schoolId,
      name: activeName,
    }).lean();
    if (!active) {
      const { startDate, endDate } = sessionDates(activeName);
      try {
        active = await AcademicYear.create({
          schoolId,
          name: activeName,
          startDate,
          endDate,
          isActive: true,
        });
      } catch (error) {
        if (error?.code !== 11000) throw error;
        active = await AcademicYear.findOne({ schoolId, name: activeName }).lean();
      }
    }
    await AcademicYear.updateMany(
      { schoolId, _id: { $ne: active._id } },
      { $set: { isActive: false } }
    );
    await AcademicYear.updateOne(
      { _id: active._id },
      { $set: { isActive: true } }
    );

    const createdLabels = new Set();
    const summary = {};

    // Active-session collections.
    for (const entry of ACTIVE_COLLECTIONS) {
      const moved = await tagActive({ schoolId, entry, activeName });
      if (moved) summary[entry.key] = moved;
      totals[entry.key] = (totals[entry.key] || 0) + moved;
    }

    // Date-based collections.
    for (const entry of DATE_COLLECTIONS) {
      const moved = await tagByDate({
        schoolId,
        entry,
        activeName,
        createdLabels,
      });
      if (moved) summary[entry.key] = moved;
      totals[entry.key] = (totals[entry.key] || 0) + moved;
    }

    // Results inherit the session of their exam.
    const resultDocs = await Result.find({ schoolId, ...UNTAGGED })
      .select("_id examId createdAt")
      .setOptions({ skipSession: true })
      .lean();
    if (resultDocs.length) {
      const examIds = [...new Set(resultDocs.map((r) => String(r.examId)))].filter(
        Boolean
      );
      const exams = await Exam.find({ _id: { $in: examIds } })
        .select("_id academicYear")
        .setOptions({ skipSession: true })
        .lean();
      const examSession = new Map(
        exams.map((e) => [String(e._id), e.academicYear || activeName])
      );
      let moved = 0;
      for (const doc of resultDocs) {
        const name =
          examSession.get(String(doc.examId)) ||
          (doc.createdAt ? sessionNameFromDate(doc.createdAt) : activeName);
        await ensureLabel(schoolId, name, activeName, createdLabels);
        const result = await Result.updateOne(
          { _id: doc._id, ...UNTAGGED },
          { $set: { academicYear: name } }
        ).setOptions({ skipSession: true });
        moved += result.modifiedCount || 0;
      }
      if (moved) summary.results = moved;
      totals.results = (totals.results || 0) + moved;
    }

    // Create session documents for every label already used by data (e.g.
    // attendance/payments recorded before this feature existed).
    const labelModels = [
      ...ACTIVE_COLLECTIONS.map((entry) => entry.model),
      ...DATE_COLLECTIONS.map((entry) => entry.model),
      Result,
    ];
    for (const model of labelModels) {
      const names = await model
        .distinct("academicYear", { schoolId })
        .setOptions({ skipSession: true });
      for (const name of names) {
        if (SESSION_NAME_RE.test(String(name || ""))) {
          await ensureLabel(schoolId, String(name), activeName, createdLabels);
        }
      }
    }

    // Create any missing session documents for labels we used.
    for (const label of createdLabels) {
      await ensureLabel(schoolId, label, activeName, new Set());
    }

    const label = school.name || String(schoolId);
    console.log(
      `${label}: active=${activeName} ${Object.entries(summary)
        .map(([k, v]) => `${k}=${v}`)
        .join(" ") || "nothing to tag"}`
    );
  }

  console.log("\nMigrating timetable index...");
  await migrateTimetableIndex();

  console.log("\n=== TOTALS ===");
  console.log(totals);
  console.log("\nDone.");

  await mongoose.disconnect();
  process.exit(0);
};

main().catch(async (error) => {
  console.error("Backfill failed:", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
