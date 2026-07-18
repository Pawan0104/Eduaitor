/**
 * Enable daily_learning module on Default School.
 * Usage: node scripts/enableDailyLearningModule.js
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
    { $addToSet: { subscribed_modules: "daily_learning" } },
    { new: true },
  ).select("school_name subscribed_modules");
  console.log(s);
  await mongoose.disconnect();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
