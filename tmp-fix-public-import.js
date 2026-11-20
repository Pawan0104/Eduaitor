const fs = require("fs");
const path = "D:/eduaitor/Backend/controllers/publicRegistrationController.js";
let t = fs.readFileSync(path, "utf8");

const bad = `import School from "../models/school.js";
import {
import Stream from "../models/stream.js";
import { resolveStream } from "../utils/resolveStream.js";
  activeSessionName,
  findExamForClass,
  linkExam,
  nextRegistrationNumber,
} from "../utils/registration.js";`;

const good = `import School from "../models/school.js";
import Stream from "../models/stream.js";
import { resolveStream } from "../utils/resolveStream.js";
import {
  activeSessionName,
  findExamForClass,
  linkExam,
  nextRegistrationNumber,
} from "../utils/registration.js";`;

if (!t.includes(bad)) {
  console.error("pattern not found");
  console.log(t.slice(0, 400));
  process.exit(1);
}

fs.writeFileSync(path, t.replace(bad, good));
console.log("fixed publicRegistrationController imports");
