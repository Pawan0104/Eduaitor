import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import Class from "../models/class.js";
import School from "../models/school.js";
import Student from "../models/student.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

await mongoose.connect(process.env.MONGO_URI);

for (const name of ["Demo school", "Bright Children Academy"]) {
  const school = await School.findOne({ school_name: name }).lean();
  if (!school) {
    console.log("missing", name);
    continue;
  }
  const classes = await Class.find({
    schoolId: school._id,
    name: { $regex: /4/i },
  }).lean();
  console.log("\n===", name, String(school._id), "===");
  console.log(
    "all classes:",
    (
      await Class.find({ schoolId: school._id }).select("name").lean()
    ).map((c) => c.name),
  );
  for (const c of classes) {
    console.log("class", c.name, String(c._id));
    const countClass = await Student.countDocuments({
      schoolId: school._id,
      classId: c._id,
    });
    console.log("  studentsInClass", countClass);
    for (const d of c.details || []) {
      const sid = d.sectionId;
      const count = await Student.countDocuments({
        schoolId: school._id,
        classId: c._id,
        sectionId: sid,
      });
      console.log(
        "  section",
        String(sid),
        "capacity",
        d.capacity,
        "studentsInSection",
        count,
      );
    }
  }
}

await mongoose.disconnect();
