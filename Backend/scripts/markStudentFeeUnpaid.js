import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import Student from "../models/student.js";
import Payment from "../models/payment.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const PARENT_MOBILE = "9876543210";

const run = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI missing");

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 20000,
    tlsAllowInvalidHostnames: true,
  });

  const student = await Student.findOne({
    $or: [
      { fatherMobile: PARENT_MOBILE },
      { "parentCredentials.username": PARENT_MOBILE },
    ],
  });

  if (!student) {
    throw new Error(`Student not found for parent mobile ${PARENT_MOBILE}`);
  }

  const finalFee = Number(student.finalFee) || Number(student.totalFee) || 25000;

  const deleted = await Payment.deleteMany({
    studentId: student._id,
    schoolId: student.schoolId,
  });

  student.totalPaid = 0;
  student.totalDue = finalFee;
  if (!student.finalFee) student.finalFee = finalFee;
  if (!student.totalFee) student.totalFee = finalFee;
  await student.save();

  console.log(
    JSON.stringify(
      {
        student: `${student.firstName} ${student.lastName}`,
        studentId: student.studentId,
        parentMobile: PARENT_MOBILE,
        finalFee: student.finalFee,
        totalPaid: student.totalPaid,
        totalDue: student.totalDue,
        paymentsRemoved: deleted.deletedCount,
      },
      null,
      2,
    ),
  );

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
