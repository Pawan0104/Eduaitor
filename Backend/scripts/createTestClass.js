import dotenv from "dotenv";
import mongoose from "mongoose";
import Class from "../models/class.js";
import School from "../models/school.js";

dotenv.config();

const run = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error("MONGO_URI not set in env");

    // Connect with relaxed hostname validation for local dev SRV issues
    await mongoose.connect(uri, {
      // dev-only: allow invalid hostnames when SRV records don't match
      tlsAllowInvalidHostnames: true,
    });

    const school = await School.findOne({ admin_email: "school@admin.com" });
    if (!school) {
      console.error("School not found");
      process.exit(1);
    }

    const existing = await Class.findOne({ schoolId: school._id, name: "Test Class" });
    if (existing) {
      console.log("Class already exists:", existing._id);
      process.exit(0);
    }

    const cls = await Class.create({ name: "Test Class", schoolId: school._id });
    console.log("Created class", cls._id);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
