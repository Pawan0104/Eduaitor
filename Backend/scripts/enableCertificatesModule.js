/**
 * Enable certificates module on Default School.
 * Usage: node scripts/enableCertificatesModule.js
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import School from "../models/school.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const s = await School.findOneAndUpdate(
    {
      $or: [
        { school_name: "Default School" },
        { admin_email: "school@admin.com" },
      ],
    },
    { $addToSet: { subscribed_modules: "certificates" } },
    { new: true },
  ).select("school_name admin_email subscribed_modules");

  if (!s) {
    console.error("Default School not found");
    process.exit(1);
  }

  console.log(
    "OK",
    s.school_name,
    "certificates=",
    (s.subscribed_modules || []).includes("certificates"),
  );
  await mongoose.disconnect();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
