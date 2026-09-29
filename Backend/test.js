import path from "path";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.join(__dirname, ".env"),
});
const uri = process.env.MONGO_URI;
try {
  await mongoose.connect(uri);
  console.log("✅ Connected Successfully");
} catch (err) {
  console.error(err);
}
console.log(process.env.MONGO_URI);