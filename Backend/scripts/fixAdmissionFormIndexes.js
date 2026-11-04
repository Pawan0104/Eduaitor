/**
 * Drop legacy unique index on admissionforms.schoolId.
 *
 * Older schema allowed one form doc per school (unique schoolId).
 * Current schema allows admission + lead + registration per school
 * via compound unique { schoolId, formType }.
 *
 * Usage: node scripts/fixAdmissionFormIndexes.js
 */
import "dotenv/config";
import mongoose from "mongoose";

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error("MONGO_URI missing");
  process.exit(1);
}

await mongoose.connect(uri);
const col = mongoose.connection.collection("admissionforms");
const indexes = await col.indexes();
console.log(
  "Current admissionforms indexes:",
  indexes.map((i) => ({ name: i.name, key: i.key, unique: Boolean(i.unique) })),
);

const legacy = indexes.find((index) => {
  if (!index?.key || index.key.schoolId !== 1) return false;
  // schoolId-only index (no formType) that is unique
  const keys = Object.keys(index.key);
  return keys.length === 1 && keys[0] === "schoolId" && index.unique;
});

if (legacy) {
  await col.dropIndex(legacy.name);
  console.log(`Dropped legacy unique index: ${legacy.name}`);
} else {
  console.log("No legacy unique schoolId-only index found.");
}

// Ensure compound unique exists
const compound = indexes.find(
  (index) =>
    index?.key && index.key.schoolId === 1 && index.key.formType === 1,
);
if (!compound) {
  await col.createIndex({ schoolId: 1, formType: 1 }, { unique: true });
  console.log("Created compound unique index schoolId_1_formType_1");
} else if (!compound.unique) {
  await col.dropIndex(compound.name);
  await col.createIndex({ schoolId: 1, formType: 1 }, { unique: true });
  console.log(`Recreated ${compound.name} as unique`);
} else {
  console.log(`Compound unique index OK: ${compound.name}`);
}

// Backfill missing formType on legacy docs
const backfill = await col.updateMany(
  { $or: [{ formType: { $exists: false } }, { formType: null }, { formType: "" }] },
  { $set: { formType: "admission" } },
);
console.log(`Backfilled formType=admission on ${backfill.modifiedCount} doc(s)`);

console.log(
  "Indexes now:",
  (await col.indexes()).map((i) => ({
    name: i.name,
    key: i.key,
    unique: Boolean(i.unique),
  })),
);

await mongoose.disconnect();
process.exit(0);
