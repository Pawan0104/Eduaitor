import dotenv from "dotenv";
import mongoose from "mongoose";
import School from "../models/school.js";
import Hostel from "../models/hostel.js";

dotenv.config({ path: ".env" });

const DEMO = [
  {
    name: "Boys Hostel A",
    code: "HST-A",
    type: "Boys",
    address: "North Campus, Block A",
    totalFloors: 3,
    capacity: 120,
    wardenName: "Ramesh Kumar",
    wardenPhone: "9876501111",
    description: "Main boys hostel near the playground",
    status: "Active",
  },
  {
    name: "Girls Hostel B",
    code: "HST-B",
    type: "Girls",
    address: "East Campus, Block B",
    totalFloors: 2,
    capacity: 80,
    wardenName: "Sunita Sharma",
    wardenPhone: "9876502222",
    description: "Girls hostel with attached mess",
    status: "Active",
  },
];

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const school = await School.findOne({
    $or: [
      { school_name: "Default School" },
      { admin_email: "school@admin.com" },
    ],
  }).select("_id school_name subscribed_modules");

  if (!school) {
    throw new Error("Default School not found");
  }

  if (!school.subscribed_modules?.includes("hostel")) {
    await School.updateOne(
      { _id: school._id },
      { $addToSet: { subscribed_modules: "hostel" } }
    );
  }

  const created = [];
  for (const item of DEMO) {
    const hostel = await Hostel.findOneAndUpdate(
      { schoolId: school._id, code: item.code },
      { $set: { ...item, schoolId: school._id } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    created.push({
      id: hostel._id.toString(),
      name: hostel.name,
      code: hostel.code,
      type: hostel.type,
    });
  }

  console.log(`School: ${school.school_name}`);
  console.log(JSON.stringify(created, null, 2));

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
