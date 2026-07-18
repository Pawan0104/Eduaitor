/**
 * Seeds global syllabus boards (NCERT, CBSE, RBSE) with books + chapters
 * for classes 1–12.
 *
 * Usage (from Backend):
 *   node scripts/seedSyllabusCatalog.js
 *   node scripts/seedSyllabusCatalog.js --chapters-only
 *   node scripts/seedSyllabusCatalog.js --links-only
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

import SyllabusBoard from "../models/syllabusBoard.js";
import SyllabusBook from "../models/syllabusBook.js";
import SyllabusTemplateChapter from "../models/syllabusTemplateChapter.js";
import SyllabusTemplateTopic from "../models/syllabusTemplateTopic.js";
import {
  NCERT_BOOKS,
  CBSE_BOOKS,
  RBSE_BOOKS,
} from "./data/syllabusCatalogBooks.js";
import { getChaptersForBook } from "./data/syllabusCatalogChapters.js";
import {
  resolveNcertBook,
  ncertPortalBookUrl,
  buildNcertChapterLinks,
} from "./data/ncertLinkResolver.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const CHAPTERS_ONLY = process.argv.includes("--chapters-only");
const LINKS_ONLY = process.argv.includes("--links-only");

const BOARDS = [
  {
    name: "NCERT",
    code: "NCERT",
    description: "National Council of Educational Research and Training",
    order: 1,
    books: NCERT_BOOKS,
  },
  {
    name: "CBSE",
    code: "CBSE",
    description:
      "Central Board of Secondary Education — NCERT-prescribed textbooks",
    order: 2,
    books: CBSE_BOOKS,
  },
  {
    name: "RBSE",
    code: "RBSE",
    description: "Rajasthan Board of Secondary Education textbooks",
    order: 3,
    books: RBSE_BOOKS,
  },
];

const upsertBook = async (board, entry, orderIndex) => {
  const title = entry.title.trim();
  const subjectName = entry.subjectName.trim();
  const className = String(entry.className).trim();

  let book = await SyllabusBook.findOne({
    boardId: board._id,
    className,
    subjectName,
    title,
  });

  const medium = entry.medium || "English";
  const ncert = resolveNcertBook({
    className,
    subjectName,
    title,
    medium,
  });

  const ncertFields = ncert
    ? {
        ncertBookCode: ncert.code,
        ncertChapterCount: ncert.chapterCount,
        ncertPortalUrl: ncertPortalBookUrl(ncert.code, ncert.chapterCount),
      }
    : {
        ncertBookCode: "",
        ncertChapterCount: 0,
        ncertPortalUrl: "https://ncert.nic.in/textbook.php",
      };

  if (!book) {
    book = await SyllabusBook.create({
      boardId: board._id,
      className,
      subjectName,
      title,
      description:
        entry.description ||
        `${board.code} · Class ${className} · ${subjectName}`,
      medium,
      ...ncertFields,
      order: orderIndex,
      status: "active",
    });
    return { book, created: true };
  }

  book.medium = medium || book.medium || "English";
  book.description =
    entry.description ||
    book.description ||
    `${board.code} · Class ${className} · ${subjectName}`;
  book.ncertBookCode = ncertFields.ncertBookCode;
  book.ncertChapterCount = ncertFields.ncertChapterCount;
  book.ncertPortalUrl = ncertFields.ncertPortalUrl;
  book.order = orderIndex;
  book.status = "active";
  await book.save();
  return { book, created: false };
};

/** Replace all chapters/topics for a book from the chapter catalog */
const syncChaptersForBook = async (book) => {
  const chapterDefs = getChaptersForBook({
    className: book.className,
    subjectName: book.subjectName,
    title: book.title,
  });

  if (!chapterDefs.length) return { chapters: 0, topics: 0 };

  const oldChapters = await SyllabusTemplateChapter.find({
    bookId: book._id,
  }).select("_id");
  const oldIds = oldChapters.map((c) => c._id);
  if (oldIds.length) {
    await SyllabusTemplateTopic.deleteMany({
      templateChapterId: { $in: oldIds },
    });
    await SyllabusTemplateChapter.deleteMany({ _id: { $in: oldIds } });
  }

  const ncertCode = book.ncertBookCode || "";
  const ncertTotal =
    book.ncertChapterCount ||
    chapterDefs.length ||
    1;

  const chapterDocs = chapterDefs.map((c, i) => {
    const topicNames = (c.topics || []).map((t) =>
      typeof t === "string" ? t : t.name,
    );
    const chapterNumber = i + 1;
    const links = buildNcertChapterLinks(ncertCode, chapterNumber, ncertTotal);
    const portalHint = links.ncertPortalUrl
      ? `Open official NCERT chapter: ${links.ncertPortalUrl}`
      : "Open official textbook on https://ncert.nic.in/textbook.php";

    const fallbackContent = [
      `Chapter: ${c.name}`,
      ``,
      `Official textbook content is provided by NCERT on their website (not copied here).`,
      portalHint,
      links.ncertPdfUrl ? `Chapter PDF (if available): ${links.ncertPdfUrl}` : "",
      ``,
      `Study outline (Eduaitor):`,
      topicNames.length
        ? topicNames.map((n, idx) => `${idx + 1}. ${n}`).join("\n")
        : "1. Introduction\n2. Key concepts\n3. Exercises",
      ``,
      `Tip: Use the "Open NCERT chapter" button to read the full textbook text/PDF.`,
    ]
      .filter(Boolean)
      .join("\n");

    const baseContent = c.content || c.description || fallbackContent;
    const linkBlock = [
      "",
      "── Official NCERT textbook ──",
      "Full chapter text/PDF is on the NCERT website (copyright NCERT).",
      links.ncertPortalUrl
        ? `Read on NCERT: ${links.ncertPortalUrl}`
        : "Read on NCERT: https://ncert.nic.in/textbook.php",
      links.ncertPdfUrl ? `PDF link: ${links.ncertPdfUrl}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const mainContent = /ncert\.nic\.in/i.test(baseContent)
      ? baseContent
      : `${baseContent}\n${linkBlock}`;

    return {
      bookId: book._id,
      name: c.name,
      description: c.description || `Chapter: ${c.name}`,
      content: mainContent,
      ncertPortalUrl: links.ncertPortalUrl,
      ncertPdfUrl: links.ncertPdfUrl,
      learningOutcomes: topicNames.slice(0, 5).map(
        (n) => `Understand and practise: ${n}`,
      ),
      order: chapterNumber,
      status: "active",
    };
  });

  const insertedChapters =
    await SyllabusTemplateChapter.insertMany(chapterDocs);

  const topicDocs = [];
  insertedChapters.forEach((chapter, i) => {
    const topics = chapterDefs[i].topics || [];
    const normalized = topics.length
      ? topics
      : ["Introduction", "Key concepts", "Exercises"];

    normalized.forEach((t, j) => {
      const topicName = typeof t === "string" ? t : t.name;
      const topicContent =
        typeof t === "object" && t.content
          ? t.content
          : [
              `Main content: ${topicName}`,
              ``,
              `This topic is part of the prescribed textbook syllabus.`,
              ``,
              `What to study:`,
              `• Read the textbook section titled "${topicName}"`,
              `• Note important definitions, formulas, facts and examples`,
              `• Solve in-text questions and end exercises for this topic`,
              `• Revise key points before class tests / exams`,
            ].join("\n");

      topicDocs.push({
        templateChapterId: chapter._id,
        bookId: book._id,
        name: topicName,
        content: topicContent,
        order: j + 1,
        difficultyLevel: "medium",
        status: "active",
      });
    });
  });

  if (topicDocs.length) {
    await SyllabusTemplateTopic.insertMany(topicDocs);
  }

  return { chapters: insertedChapters.length, topics: topicDocs.length };
};

const run = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI missing in Backend/.env");

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 25000 });
  console.log("MongoDB connected");
  const modeLabel = LINKS_ONLY
    ? "Mode: links-only (attach NCERT portal/PDF URLs)\n"
    : CHAPTERS_ONLY
      ? "Mode: chapters-only (sync chapters on existing books)\n"
      : "Mode: full seed (books + chapters)\n";
  console.log(modeLabel);

  let totalBooksCreated = 0;
  let totalBooksExisting = 0;
  let totalChapters = 0;
  let totalTopics = 0;
  let booksSynced = 0;
  let booksLinked = 0;

  for (const boardDef of BOARDS) {
    const board = await SyllabusBoard.findOneAndUpdate(
      { code: boardDef.code },
      {
        $set: {
          name: boardDef.name,
          code: boardDef.code,
          description: boardDef.description,
          order: boardDef.order,
          status: "active",
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    console.log(`── ${board.name} ──`);

    // Always refresh book metadata + NCERT codes (cheap)
    for (let i = 0; i < boardDef.books.length; i++) {
      const { created, book } = await upsertBook(
        board,
        boardDef.books[i],
        i + 1,
      );
      if (created) totalBooksCreated += 1;
      else totalBooksExisting += 1;
      if (book?.ncertBookCode) booksLinked += 1;
    }

    if (LINKS_ONLY) {
      const books = await SyllabusBook.find({ boardId: board._id });
      let linkedChapters = 0;
      for (const book of books) {
        if (!book.ncertBookCode) continue;
        const chapters = await SyllabusTemplateChapter.find({
          bookId: book._id,
        }).sort({ order: 1 });
        const total = book.ncertChapterCount || chapters.length || 1;
        for (let i = 0; i < chapters.length; i++) {
          const links = buildNcertChapterLinks(
            book.ncertBookCode,
            chapters[i].order || i + 1,
            total,
          );
          chapters[i].ncertPortalUrl = links.ncertPortalUrl;
          chapters[i].ncertPdfUrl = links.ncertPdfUrl;
          await chapters[i].save();
          linkedChapters += 1;
        }
      }
      console.log(
        `   books linked: ${books.filter((b) => b.ncertBookCode).length}/${books.length} | chapters linked: ${linkedChapters}\n`,
      );
      continue;
    }

    const books = await SyllabusBook.find({ boardId: board._id });
    let boardChapters = 0;
    let boardTopics = 0;

    for (let i = 0; i < books.length; i++) {
      const book = books[i];
      const { chapters, topics } = await syncChaptersForBook(book);
      boardChapters += chapters;
      boardTopics += topics;
      booksSynced += 1;

      if ((i + 1) % 50 === 0 || i === books.length - 1) {
        process.stdout.write(
          `   synced ${i + 1}/${books.length} books…\r`,
        );
      }
    }

    totalChapters += boardChapters;
    totalTopics += boardTopics;
    console.log(
      `\n   books: ${books.length} | chapters: ${boardChapters} | topics: ${boardTopics}\n`,
    );
  }

  console.log("Totals:");
  if (!CHAPTERS_ONLY) {
    console.log(`  books created: ${totalBooksCreated}`);
    console.log(`  books already present: ${totalBooksExisting}`);
  }
  console.log(`  books chapter-synced: ${booksSynced}`);
  console.log(`  chapters written: ${totalChapters}`);
  console.log(`  topics written: ${totalTopics}`);
  console.log("\nDone. Super Admin → Syllabus Catalog");

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
