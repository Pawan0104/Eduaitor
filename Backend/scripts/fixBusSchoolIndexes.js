import "dotenv/config";
import mongoose from "mongoose";

await mongoose.connect(process.env.MONGO_URI);
const buses = mongoose.connection.db.collection("buses");

try {
  await buses.createIndex(
    { schoolId: 1, driver: 1 },
    { unique: true, partialFilterExpression: { driver: { $type: "objectId" } } },
  );
  console.log("CREATED buses schoolId+driver partial");
} catch (e) {
  console.log("driver:", e.message);
}

try {
  await buses.createIndex(
    { schoolId: 1, route: 1 },
    { unique: true, partialFilterExpression: { route: { $type: "objectId" } } },
  );
  console.log("CREATED buses schoolId+route partial");
} catch (e) {
  console.log("route:", e.message);
}

console.log(
  (await buses.indexes()).map((i) => `${i.name} ${JSON.stringify(i.key)}`),
);
await mongoose.disconnect();
