/**
 * Re-import global syllabus catalog books into Default School
 * for Grade 1 / Grade 5 (replace mode) so chapters get NCERT PDF
 * URLs, uploaded PDF metadata, and topic page ranges.
 *
 * Usage: node scripts/reimportCatalogDefaultSchool.js
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

import School from "../models/school.js";
import Class from "../models/class.js";
import Term from "../models/Term.js";
import Subject from "../models/subject.js";
import Chapter from "../models/chapter.js";
import Topic from "../models/topic.js";
import SyllabusBoard from "../models/syllabusBoard.js";
import SyllabusBook from "../models/syllabusBook.js";
import SyllabusTemplateChapter from "../models/syllabusTemplateChapter.js";
import SyllabusTemplateTopic from "../models/syllabusTemplateTopic.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const CLASS_MAP = [
  { schoolClassName: "Grade 1", catalogClass: "1" },
  { schoolClassName: "Grade 5", catalogClass: "5" },
];

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const ensureSubject = async (schoolId, subjectName) => {
  let subject = await Subject.findOne({
    schoolId,
    name: new RegExp(`^${escapeRegex(subjectName)}$`, "i"),
  });
  if (subject) return subject;
  try {
    subject = await Subject.create({
      schoolId,
      name: subjectName.trim(),
      status: "Active",
    });
  } catch {
    subject = await Subject.findOne({
      schoolId,
      name: subjectName.trim(),
    });
    if (!subject) throw new Error(`Could not create subject ${subjectName}`);
  }
  return subject;
};

const ensureSubjectOnClass = async (classId, subject) => {
  const cls = await Class.findById(classId);
  if (!cls?.details?.length) return;
  let changed = false;
  for (const detail of cls.details) {
    const has = (detail.subjectTeachers || []).some(
      (st) => String(st.subjectId) === String(subject._id),
    );
    if (!has) {
      detail.subjectTeachers = detail.subjectTeachers || [];
      detail.subjectTeachers.push({
        subjectId: subject._id,
        teacherId: detail.teacherId || null,
      });
      changed = true;
    }
  }
  if (changed) await cls.save();
};

const importBook = async ({ schoolId, classId, termId, book }) => {
  const subject = await ensureSubject(schoolId, book.subjectName);
  await ensureSubjectOnClass(classId, subject);

  const existingChapters = await Chapter.find({
    schoolId,
    classId,
    subjectId: subject._id,
    termId,
  }).select("_id");
  const existingIds = existingChapters.map((c) => c._id);
  if (existingIds.length) {
    await Topic.deleteMany({ chapterId: { $in: existingIds } });
    await Chapter.deleteMany({ _id: { $in: existingIds } });
  }

  const templateChapters = await SyllabusTemplateChapter.find({
    bookId: book._id,
    status: "active",
  }).sort({ order: 1, createdAt: 1 });

  let chaptersCreated = 0;
  let topicsCreated = 0;

  for (const tc of templateChapters) {
    const chapter = await Chapter.create({
      schoolId,
      classId,
      subjectId: subject._id,
      termId,
      name: tc.name,
      description: tc.description || "",
      content: tc.content || tc.description || "",
      ncertPortalUrl: tc.ncertPortalUrl || "",
      ncertPdfUrl: tc.ncertPdfUrl || "",
      pdf: tc.pdf?.url
        ? {
            url: tc.pdf.url,
            public_id: tc.pdf.public_id || "",
            name: tc.pdf.name || "",
            type: tc.pdf.type || "application/pdf",
          }
        : undefined,
      learningOutcomes: tc.learningOutcomes || [],
      order: tc.order ?? 0,
      status: "active",
    });
    chaptersCreated += 1;

    const templateTopics = await SyllabusTemplateTopic.find({
      templateChapterId: tc._id,
      status: "active",
    }).sort({ order: 1, createdAt: 1 });

    for (const tt of templateTopics) {
      await Topic.create({
        schoolId,
        chapterId: chapter._id,
        subjectId: subject._id,
        classId,
        name: tt.name,
        content: tt.content || "",
        pageFrom: tt.pageFrom ?? null,
        pageTo: tt.pageTo ?? null,
        order: tt.order ?? 0,
        difficultyLevel: tt.difficultyLevel || "medium",
        keywords: tt.keywords || [],
        status: "active",
      });
      topicsCreated += 1;
    }
  }

  return { chaptersCreated, topicsCreated, subjectName: subject.name };
};

const run = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI missing");

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 25000 });
  console.log("MongoDB connected");

  const school = await School.findOne({
    $or: [
      { school_name: "Default School" },
      { admin_email: "school@admin.com" },
    ],
  });
  if (!school) throw new Error("Default School not found");

  const board =
    (await SyllabusBoard.findOne({ code: "NCERT", status: "active" })) ||
    (await SyllabusBoard.findOne({ code: "CBSE", status: "active" }));
  if (!board) throw new Error("No NCERT/CBSE board in catalog");

  const term =
    (await Term.findOne({ schoolId: school._id, name: "Term 1" })) ||
    (await Term.findOne({ schoolId: school._id }).sort({ createdAt: 1 }));
  if (!term) throw new Error("No term found for Default School");

  console.log(`School: ${school.school_name}`);
  console.log(`Board: ${board.name} (${board.code})`);
  console.log(`Term: ${term.name}`);
  console.log("Mode: replace (per class + subject)\n");

  let totalChapters = 0;
  let totalTopics = 0;
  let totalBooks = 0;

  for (const map of CLASS_MAP) {
    const schoolClass = await Class.findOne({
      schoolId: school._id,
      name: map.schoolClassName,
    });
    if (!schoolClass) {
      console.log(`⚠ Skip ${map.schoolClassName} — class not found`);
      continue;
    }

    const books = await SyllabusBook.find({
      boardId: board._id,
      className: map.catalogClass,
      status: "active",
    }).sort({ subjectName: 1, order: 1 });

    console.log(
      `── ${map.schoolClassName} (catalog class ${map.catalogClass}) · ${books.length} books ──`,
    );

    for (const book of books) {
      const { chaptersCreated, topicsCreated } = await importBook({
        schoolId: school._id,
        classId: schoolClass._id,
        termId: term._id,
        book,
      });
      totalBooks += 1;
      totalChapters += chaptersCreated;
      totalTopics += topicsCreated;
      const pdfLinked = await SyllabusTemplateChapter.countDocuments({
        bookId: book._id,
        ncertPdfUrl: { $ne: "" },
      });
      console.log(
        `   ✓ ${book.subjectName} — ${book.title} · ${chaptersCreated} ch · ${topicsCreated} topics · ${pdfLinked} NCERT PDF links`,
      );
    }
    console.log("");
  }

  console.log("Done.");
  console.log(`  books imported: ${totalBooks}`);
  console.log(`  chapters: ${totalChapters}`);
  console.log(`  topics: ${totalTopics}`);

  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
