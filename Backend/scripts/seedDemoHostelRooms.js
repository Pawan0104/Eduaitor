import dotenv from "dotenv";
import mongoose from "mongoose";
import School from "../models/school.js";
import Hostel from "../models/hostel.js";
import HostelRoom from "../models/hostelRoom.js";

dotenv.config({ path: ".env" });

const buildBeds = (count, occupiedIndexes = []) =>
  Array.from({ length: count }, (_, i) => ({
    bedNumber: `B${i + 1}`,
    status: occupiedIndexes.includes(i + 1) ? "Occupied" : "Available",
  }));

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const school = await School.findOne({
    $or: [
      { school_name: "Default School" },
      { admin_email: "school@admin.com" },
    ],
  }).select("_id school_name");

  if (!school) throw new Error("Default School not found");

  const boys = await Hostel.findOne({ schoolId: school._id, code: "HST-A" });
  const girls = await Hostel.findOne({ schoolId: school._id, code: "HST-B" });

  if (!boys || !girls) {
    throw new Error(
      "Demo hostels HST-A / HST-B not found. Run seedDemoHostels.js first."
    );
  }

  const rooms = [
    {
      hostelId: boys._id,
      roomNumber: "101",
      floor: 1,
      roomType: "Double",
      beds: buildBeds(2, [1]),
      amenities: "Fan, Study table",
      notes: "Near entrance",
      status: "Active",
    },
    {
      hostelId: boys._id,
      roomNumber: "102",
      floor: 1,
      roomType: "Triple",
      beds: buildBeds(3),
      amenities: "Fan, Attached bath",
      notes: "",
      status: "Active",
    },
    {
      hostelId: boys._id,
      roomNumber: "201",
      floor: 2,
      roomType: "Quad",
      beds: buildBeds(4, [1, 2]),
      amenities: "AC, Wardrobe",
      notes: "Corner room",
      status: "Active",
    },
    {
      hostelId: girls._id,
      roomNumber: "101",
      floor: 1,
      roomType: "Double",
      beds: buildBeds(2),
      amenities: "Fan, Attached bath",
      notes: "",
      status: "Active",
    },
    {
      hostelId: girls._id,
      roomNumber: "102",
      floor: 1,
      roomType: "Triple",
      beds: buildBeds(3, [1]),
      amenities: "Fan, Study table",
      notes: "Warden floor",
      status: "Active",
    },
    {
      hostelId: girls._id,
      roomNumber: "201",
      floor: 2,
      roomType: "Single",
      beds: buildBeds(1),
      amenities: "AC",
      notes: "Guest / sick room",
      status: "Maintenance",
    },
  ];

  const created = [];
  for (const item of rooms) {
    const room = await HostelRoom.findOneAndUpdate(
      {
        schoolId: school._id,
        hostelId: item.hostelId,
        roomNumber: item.roomNumber,
      },
      { $set: { ...item, schoolId: school._id } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    created.push({
      id: room._id.toString(),
      hostel: item.hostelId.equals(boys._id) ? "Boys Hostel A" : "Girls Hostel B",
      roomNumber: room.roomNumber,
      beds: room.beds.length,
      available: room.beds.filter((b) => b.status === "Available").length,
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
