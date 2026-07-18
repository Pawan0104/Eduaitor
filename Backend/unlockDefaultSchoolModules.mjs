import dotenv from "dotenv";
import mongoose from "mongoose";
import School from "./models/school.js";
import { MODULE_KEYS } from "./constants/module.js";

dotenv.config({ path: ".env" });

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const filter = {
    $or: [{ school_name: "Default School" }, { admin_email: "school@admin.com" }],
  };

  const result = await School.updateMany(filter, {
    $set: { subscribed_modules: MODULE_KEYS },
  });

  const schools = await School.find(filter)
    .select("school_name admin_email subscribed_modules")
    .lean();

  console.log(`MATCHED=${result.matchedCount}`);
  console.log(`MODIFIED=${result.modifiedCount}`);
  console.log(JSON.stringify(schools, null, 2));

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore disconnect errors in failure path
  }
  process.exit(1);
});
