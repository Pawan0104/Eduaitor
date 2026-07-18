import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import School from "../models/school.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const run = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI missing");

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 20000,
    tlsAllowInvalidHostnames: true,
  });

  const school = await School.findOneAndUpdate(
    { admin_email: "school@admin.com" },
    {
      $set: {
        razorpayKeyId: "",
        razorpayKeySecret: "",
      },
    },
    { returnDocument: "after" },
  );

  if (!school) throw new Error("Default school not found");

  console.log("Cleared mock Razorpay keys for:", school.school_name);
  console.log("Ready for real key setup in Fee Collection.");
  await mongoose.disconnect();
  process.exit(0);
};

run().catch(async (err) => {
  console.error(err.message || err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
