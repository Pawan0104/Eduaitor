/**
 * Raise Demo school Class 4 capacities above current enrollment.
 * Usage: node scripts/setClass4Capacity.js
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import Class from "../models/class.js";
import School from "../models/school.js";
import Student from "../models/student.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const school = await School.findOne({ school_name: /^Demo school$/i });
  if (!school) throw new Error("Demo school not found");

  const cls = await Class.findOne({
    schoolId: school._id,
    name: { $regex: /^class\s*4$/i },
  });
  if (!cls) throw new Error("Class 4 not found");

  console.log("School:", school.school_name, String(school._id));
  console.log("Class:", cls.name, String(cls._id));

  for (const d of cls.details || []) {
    const count = await Student.countDocuments({
      schoolId: school._id,
      classId: cls._id,
      ...(d.sectionId ? { sectionId: d.sectionId } : {}),
    });
    const next = Math.max(100, count + 30);
    console.log(
      `section ${d.sectionId}: ${count} students, capacity ${d.capacity} → ${next}`,
    );
    d.capacity = next;
  }

  await cls.save();
  console.log(
    "Saved:",
    (cls.details || []).map((d) => ({
      sectionId: String(d.sectionId),
      capacity: d.capacity,
    })),
  );
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
