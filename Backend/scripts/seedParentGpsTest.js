/**
 * Seed transport + GPS for parent phone testing.
 *
 *   cd Backend
 *   node scripts/seedParentGpsTest.js
 *
 * Assigns QA student (parent 9876543299) to a GPS-enabled bus route.
 */
import dotenv from "dotenv";
import connectDB from "../config/db.js";
import School from "../models/school.js";
import Student from "../models/student.js";
import { Driver, Bus, TransportRoute } from "../models/transport.js";
import { MODULE_KEYS } from "../constants/module.js";

dotenv.config();

// Starting pin (Jaipur center) — parent can "Open in Maps" immediately
const LAT = 26.9124;
const LNG = 75.7873;

const run = async () => {
  await connectDB();

  const school =
    (await School.findOne({ admin_email: "school@admin.com" })) ||
    (await School.findOne({ school_name: /default/i }));

  if (!school) {
    console.error("Default School not found. Run seedQaTestUsers.js first.");
    process.exit(1);
  }

  // Unlock transport + GPS modules
  const mods = new Set([...(school.subscribed_modules || []), ...MODULE_KEYS]);
  school.subscribed_modules = [...mods];
  await school.save();

  // Driver
  let driver = await Driver.findOne({ schoolId: school._id, phone: "9876500999" });
  if (!driver) {
    driver = await Driver.create({
      schoolId: school._id,
      name: "QA Transport Driver",
      phone: "9876500999",
      license: "QA-DL-0001",
      experience: "5 years",
      status: "Active",
    });
  } else {
    driver.status = "Active";
    await driver.save();
  }

  // Bus with live GPS
  let bus = await Bus.findOne({ schoolId: school._id, busId: "QA-BUS-01" });
  if (!bus) {
    bus = new Bus({
      schoolId: school._id,
      busId: "QA-BUS-01",
      regNo: "RJ14-QA-0001",
      model: "Tata Starbus",
      capacity: 40,
      status: "Active",
    });
  }
  bus.driver = driver._id;
  bus.gpsEnabled = true;
  bus.gpsDeviceId = "QA-GPS-DEVICE-01";
  bus.lastLatitude = LAT;
  bus.lastLongitude = LNG;
  bus.lastGpsAt = new Date();
  bus.gpsSpeedKmh = 28;
  bus.status = "Active";
  await bus.save();

  // Route
  let route = await TransportRoute.findOne({
    schoolId: school._id,
    name: "QA Parent GPS Route",
  });
  if (!route) {
    route = new TransportRoute({
      schoolId: school._id,
      name: "QA Parent GPS Route",
    });
  }
  route.bus = bus._id;
  route.driver = driver._id;
  route.stops = 4;
  route.students = 1;
  route.startTime = "07:15";
  route.endTime = "08:30";
  route.stopsList = ["Stop A - Sector 1", "Stop B - Market", "Stop C - Colony", "School Gate"];
  route.status = "Active";
  await route.save();

  // Cross-link
  bus.route = route._id;
  await bus.save();
  driver.bus = bus._id;
  driver.route = route._id;
  await driver.save();

  // Assign students: QA student + legacy Disha if present
  const studentFilters = [
    { schoolId: school._id, "studentCredentials.username": "qa.student@default.com" },
    { schoolId: school._id, "parentCredentials.username": "9876543299" },
    { schoolId: school._id, "studentCredentials.username": "student@admin.com" },
  ];

  const assigned = [];
  for (const filter of studentFilters) {
    const student = await Student.findOne(filter);
    if (!student) continue;
    student.transport = route._id;
    student.busFeeFrequency = student.busFeeFrequency || "annually";
    await student.save();
    assigned.push({
      name: `${student.firstName} ${student.lastName || ""}`.trim(),
      studentUser: student.studentCredentials?.username,
      parentUser: student.parentCredentials?.username,
      id: student._id.toString(),
    });
  }

  // Deduplicate by id
  const unique = [...new Map(assigned.map((a) => [a.id, a])).values()];

  console.log("\n========== PARENT GPS TEST READY ==========\n");
  console.log("School:   ", school.school_name, school._id.toString());
  console.log("Route:    ", route.name, `(${route.routeId || route._id})`);
  console.log("Bus:      ", bus.busId, bus.regNo);
  console.log("Driver:   ", driver.name, driver.phone);
  console.log("GPS:      ", LAT, LNG, "| enabled:", bus.gpsEnabled);
  console.log("Maps:     ", `https://www.google.com/maps?q=${LAT},${LNG}`);
  console.log("\nStudents assigned to route:");
  if (!unique.length) {
    console.log("  NONE — run: node scripts/seedQaTestUsers.js");
  } else {
    for (const s of unique) {
      console.log(`  ${s.name}`);
      console.log(`    student login: ${s.studentUser}`);
      console.log(`    parent login:  ${s.parentUser}`);
    }
  }

  console.log("\n--- Phone (Parent) ---");
  console.log("1. Open https://admineduaitor.netlify.app (or your local URL)");
  console.log("2. Login parent: 9876543299  /  #qa@parent123");
  console.log("3. Menu → Transport & GPS");
  console.log("4. Tap Refresh location / Open in Maps");
  console.log("\n--- Move the bus (desktop School Admin) ---");
  console.log("Transport → Buses → QA-BUS-01 → change Last Lat/Lng → Save");
  console.log("Then refresh on phone.\n");
  console.log(`Bus Mongo id (for API PATCH): ${bus._id.toString()}`);
  console.log("PATCH /api/transport/buses/" + bus._id.toString() + "/gps");
  console.log(
    JSON.stringify(
      { latitude: 26.92, longitude: 75.8, gpsSpeedKmh: 25, gpsEnabled: true },
      null,
      2,
    ),
  );
  console.log("\nDone.\n");
  process.exit(0);
};

run().catch((err) => {
  console.error("GPS seed failed:", err);
  process.exit(1);
});
