/**
 * Resend parent login emails for specific BCA students that failed SMTP earlier.
 * Usage: node scripts/resendBcaParentEmails.js
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { resolveSrv, resolveTxt } from "dns/promises";
import { URL } from "url";
import mongoose from "mongoose";
import School from "../models/school.js";
import Student from "../models/student.js";
import { notifyCredentials } from "../services/credentials/notifyCredentials.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

// Prefer cPanel relay (avoids SMTP 421 / timeout from this machine)
process.env.MAIL_RELAY_URL =
  process.env.MAIL_RELAY_URL || "https://www.eduaitor.com/mail-relay/send.php";
process.env.MAIL_RELAY_SECRET =
  process.env.MAIL_RELAY_SECRET || "L9lcMJayX8GfQ7tbiSeYDOKTw5BrmZ4xFpVP3WEu";

const TARGET_EMAILS = [
  "aryaeduhub@gmail.com",
  "basant181442@gmail.com",
  "coolpawant09@gmail.com",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const expandSrvUri = async (uri) => {
  const parsed = new URL(uri);
  const srvRecords = await resolveSrv(`_mongodb._tcp.${parsed.hostname}`);
  const txtRecords = await resolveTxt(parsed.hostname);
  const hosts = srvRecords.map((r) => `${r.name}:${r.port}`).join(",");
  const params = new URLSearchParams(parsed.search);
  for (const txtEntry of txtRecords.flat()) {
    for (const pair of txtEntry.split("&")) {
      const i = pair.indexOf("=");
      if (i > 0 && !params.has(pair.slice(0, i))) {
        params.set(pair.slice(0, i), pair.slice(i + 1));
      }
    }
  }
  const auth = `${encodeURIComponent(parsed.username)}:${encodeURIComponent(parsed.password)}@`;
  const db = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : "";
  const query = params.toString();
  return `mongodb://${auth}${hosts}${db}${query ? `?${query}` : ""}`;
};

const connectMongo = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI missing");
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 25000,
      tlsAllowInvalidHostnames: true,
    });
  } catch (err) {
    const expanded = await expandSrvUri(uri);
    await mongoose.connect(expanded, {
      serverSelectionTimeoutMS: 25000,
      tlsAllowInvalidHostnames: true,
    });
  }
  console.log("MongoDB connected");
};

const run = async () => {
  await connectMongo();

  const school =
    (await School.findOne({ school_name: { $regex: /^BCA$/i } })) ||
    (await School.findOne({ school_name: { $regex: /Bright Children Academy/i } })) ||
    (await School.findOne({ school_name: { $regex: /BCA/i } }));

  if (!school) {
    console.error("BCA school not found");
    process.exit(1);
  }

  for (const email of TARGET_EMAILS) {
    const student = await Student.findOne({
      schoolId: school._id,
      fatherEmail: email,
    }).sort({ createdAt: -1 });

    if (!student) {
      console.log("MISSING student for", email);
      continue;
    }

    const parentUser = student.parentCredentials?.username || student.fatherMobile;
    const parentPass = student.parentCredentials?.temp_password || "#Parent@2026";
    const studentUser = student.studentCredentials?.username || student.studentId;
    const studentPass = student.studentCredentials?.temp_password || parentPass;

    const mail = await notifyCredentials({
      role: "parent",
      name: student.fatherName || "Parent",
      username: parentUser,
      password: parentPass,
      emails: [email],
      mobile: parentUser,
      schoolName: school.school_name,
      credentialBlocks: [
        { title: "Parent login", username: parentUser, password: parentPass },
        { title: "Student login", username: studentUser, password: studentPass },
      ],
      extraLines: [
        `Student: ${student.firstName} ${student.lastName}`,
        `Admission ID: ${student.studentId}`,
        "Portal: Parent login → use mobile number as username",
      ],
    });

    console.log(
      `${email} → ${mail?.email?.sent ? "SENT" : mail?.email?.error || mail?.email?.reason || "FAIL"}`,
    );
    await sleep(2500);
  }

  await mongoose.disconnect();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
