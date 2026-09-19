/**
 * Audit + fix multi-tenant unique indexes.
 * School-scoped entities must NOT have global unique on name/code/ids.
 *
 * Usage: node scripts/fixSchoolScopedUniqueIndexes.js
 */
import "dotenv/config";
import mongoose from "mongoose";

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error("MONGO_URI missing");
  process.exit(1);
}

/** Collections that are school-scoped (have schoolId). */
const SCHOOL_SCOPED = new Set([
  "subjects",
  "classes",
  "sections",
  "houses",
  "hostels",
  "hostelrooms",
  "hostelresidents",
  "teachers",
  "staffs",
  "students",
  "leads",
  "terms",
  "academicyears",
  "feestructures",
  "payments",
  "books",
  "groups",
  "events",
  "notices",
  "exams",
  "results",
  "timetables",
  "drivers",
  "buses",
  "routes",
  "commerceproducts",
  "commerceorders",
  "schoolstaffroles",
  "certificatetemplates",
  "syllabuspdfs",
  "chapters",
  "topics",
  "homeworks",
  "assignments",
  "gatepasses",
  "calendars",
  "diaries",
  "attendances",
  "classattendances",
  "staffattendances",
]);

/** Global catalogs — never drop their unique name/code indexes. */
const GLOBAL_CATALOG = new Set(["syllabusboards", "subscriptions", "schools"]);

/** Single-field unique keys that should never be global on school-scoped collections. */
const BAD_GLOBAL_KEYS = new Set([
  "name",
  "code",
  "title",
  "studentId",
  "teacherId",
  "staffId",
  "email",
  "phone",
  "username",
  "isbn",
  "busId",
  "roomNumber",
  "sku",
  "orderNumber",
  "leadNumber",
  "receiptNo",
  "slug",
]);

/** Compound indexes we want to ensure exist after dropping globals. */
const ENSURE_COMPOUND = [
  { collection: "subjects", keys: { schoolId: 1, name: 1 } },
  { collection: "classes", keys: { schoolId: 1, name: 1 } },
  { collection: "sections", keys: { schoolId: 1, name: 1 } },
  { collection: "houses", keys: { schoolId: 1, name: 1 } },
  { collection: "hostels", keys: { schoolId: 1, name: 1 } },
  { collection: "students", keys: { schoolId: 1, studentId: 1 } },
  { collection: "teachers", keys: { schoolId: 1, teacherId: 1 } },
  { collection: "staffs", keys: { schoolId: 1, staffId: 1 } },
  { collection: "staffs", keys: { schoolId: 1, email: 1 } },
  { collection: "terms", keys: { schoolId: 1, academicYear: 1, name: 1 } },
  { collection: "academicyears", keys: { schoolId: 1, name: 1 } },
];

function isBadGlobalUnique(index) {
  if (!index.unique) return false;
  const keys = Object.keys(index.key || {});
  if (keys.length !== 1) return false;
  const field = keys[0];
  if (field === "_id") return false;
  return BAD_GLOBAL_KEYS.has(field);
}

await mongoose.connect(uri);
const db = mongoose.connection.db;
const cols = await db.listCollections().toArray();

const report = [];
let dropped = 0;

for (const { name: colName } of cols) {
  const lower = colName.toLowerCase();
  if (GLOBAL_CATALOG.has(lower)) continue;
  if (!SCHOOL_SCOPED.has(lower) && !SCHOOL_SCOPED.has(colName)) {
    // also check if collection has schoolId field by sampling indexes / name heuristics
    const looksScoped =
      /subject|class|section|house|hostel|teacher|staff|student|term|fee|book|group|event|notice|exam|bus|route|driver|lead|payment|commerce|chapter|topic|homework|assignment|gatepass|calendar|diary|attendance/i.test(
        colName,
      );
    // Exclude global syllabus catalog collections
    if (/syllabusboard/i.test(colName)) continue;
    if (!looksScoped) continue;
  }

  const col = db.collection(colName);
  let indexes;
  try {
    indexes = await col.indexes();
  } catch {
    continue;
  }

  for (const idx of indexes) {
    if (!isBadGlobalUnique(idx)) continue;
    report.push({ collection: colName, index: idx.name, key: idx.key });
    try {
      await col.dropIndex(idx.name);
      dropped += 1;
      console.log(`DROPPED ${colName}.${idx.name}  key=${JSON.stringify(idx.key)}`);
    } catch (err) {
      console.error(`FAILED drop ${colName}.${idx.name}:`, err.message);
    }
  }
}

console.log("\n--- Ensure compound school-scoped unique indexes ---");
for (const spec of ENSURE_COMPOUND) {
  const exists = cols.some((c) => c.name === spec.collection);
  if (!exists) {
    // try case variants
    const match = cols.find((c) => c.name.toLowerCase() === spec.collection.toLowerCase());
    if (!match) {
      console.log(`SKIP missing collection ${spec.collection}`);
      continue;
    }
    spec.collection = match.name;
  }
  const col = db.collection(spec.collection);
  const indexes = await col.indexes();
  const already = indexes.some((i) => {
    const a = Object.entries(i.key || {});
    const b = Object.entries(spec.keys);
    return (
      a.length === b.length &&
      a.every(([k, v], idx) => b[idx] && b[idx][0] === k && b[idx][1] === v)
    );
  });
  if (already) {
    console.log(`OK ${spec.collection} ${JSON.stringify(spec.keys)}`);
    continue;
  }
  try {
    await col.createIndex(spec.keys, { unique: true });
    console.log(`CREATED ${spec.collection} ${JSON.stringify(spec.keys)}`);
  } catch (err) {
    console.error(
      `FAILED create ${spec.collection} ${JSON.stringify(spec.keys)}:`,
      err.message,
    );
  }
}

console.log("\n=== SUMMARY ===");
console.log(`Bad global unique indexes found: ${report.length}`);
console.log(`Dropped: ${dropped}`);
if (report.length) {
  console.table(report);
} else {
  console.log("No bad global name/id unique indexes remaining on school-scoped collections.");
}

await mongoose.disconnect();
process.exit(0);
