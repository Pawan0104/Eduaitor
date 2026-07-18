import dotenv from "dotenv";
import { loginUser } from "../controllers/authController.js";
import connectDB from "../config/db.js";
import mongoose from "mongoose";

dotenv.config({ path: "./.env" });

const run = async () => {
  try {
    await connectDB();

    const req = {
      body: {
        email: "school@admin.com",
        password: "#admin@school123",
      },
    };

    const res = {
      cookie: (...args) => console.log("cookie", args[0]),
      status(code) {
        console.log("status", code);
        return this;
      },
      json(payload) {
        console.log("json", payload);
        return payload;
      },
    };

    await loginUser(req, res);
  } catch (error) {
    console.error("controller test error:", error);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
};

run();
