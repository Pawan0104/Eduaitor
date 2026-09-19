/**
 * One-time: drop legacy global unique index on subjects.name (name_1).
 * Subjects must be unique per school only (schoolId + name).
 *
 * Usage: node scripts/fixSubjectNameIndex.js
 */
import "dotenv/config";
import mongoose from "mongoose";

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error("MONGO_URI missing");
  process.exit(1);
}

await mongoose.connect(uri);
const col = mongoose.connection.collection("subjects");
const indexes = await col.indexes();
console.log(
  "Current subject indexes:",
  indexes.map((i) => i.name),
);

const legacy = indexes.find(
  (i) => i.name === "name_1" || (i.key && i.key.name === 1 && !i.key.schoolId),
);

if (legacy) {
  await col.dropIndex(legacy.name);
  console.log(`Dropped legacy index: ${legacy.name}`);
} else {
  console.log("No legacy name-only unique index found (already fixed).");
}

// Ensure compound unique exists
const compound = indexes.find(
  (i) => i.key && i.key.schoolId === 1 && i.key.name === 1,
);
if (!compound) {
  await col.createIndex({ schoolId: 1, name: 1 }, { unique: true });
  console.log("Created compound unique index schoolId_1_name_1");
} else {
  console.log(`Compound index OK: ${compound.name}`);
}

console.log(
  "Indexes now:",
  (await col.indexes()).map((i) => i.name),
);
await mongoose.disconnect();
process.exit(0);
