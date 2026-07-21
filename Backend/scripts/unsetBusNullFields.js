import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error("MONGO_URI not found in Backend/.env");
  process.exit(1);
}

async function main() {
  await mongoose.connect(uri);
  console.log("Connected to Atlas");

  const Bus = mongoose.connection.collection("buses");

  const routeRes = await Bus.updateMany({ route: null }, { $unset: { route: "" } });
  console.log(`route:null unset -> matched=${routeRes.matchedCount} modified=${routeRes.modifiedCount}`);

  const driverRes = await Bus.updateMany({ driver: null }, { $unset: { driver: "" } });
  console.log(`driver:null unset -> matched=${driverRes.matchedCount} modified=${driverRes.modifiedCount}`);

  await mongoose.disconnect();
  console.log("Done");
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
