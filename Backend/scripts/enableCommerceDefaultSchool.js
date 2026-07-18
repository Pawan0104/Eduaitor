import dotenv from "dotenv";
import mongoose from "mongoose";
import School from "../models/school.js";

dotenv.config({ path: ".env" });

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const filter = {
    $or: [{ school_name: "Default School" }, { admin_email: "school@admin.com" }],
  };

  const result = await School.updateMany(filter, {
    $addToSet: { subscribed_modules: "commerce" },
  });

  const schools = await School.find(filter)
    .select("school_name admin_email subscribed_modules")
    .lean();

  console.log(`MATCHED=${result.matchedCount}`);
  console.log(`MODIFIED=${result.modifiedCount}`);
  for (const s of schools) {
    console.log(
      `${s.school_name} | commerce=${(s.subscribed_modules || []).includes("commerce")}`
    );
  }

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
