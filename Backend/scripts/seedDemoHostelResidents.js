import dotenv from "dotenv";
import mongoose from "mongoose";
import School from "../models/school.js";
import Student from "../models/student.js";
import Hostel from "../models/hostel.js";
import HostelRoom from "../models/hostelRoom.js";
import HostelResident from "../models/hostelResident.js";

dotenv.config({ path: ".env" });

const findStudent = async (schoolId, firstName, lastName) =>
  Student.findOne({ schoolId, firstName, lastName }).select("_id firstName lastName gender");

const findRoom = async (schoolId, hostelId, roomNumber) =>
  HostelRoom.findOne({ schoolId, hostelId, roomNumber });

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
    throw new Error("Demo hostels not found. Run seedDemoHostels.js first.");
  }

  const aarav = await findStudent(school._id, "Aarav", "Sharma");
  const kabir = await findStudent(school._id, "Kabir", "Mehta");
  const ananya = await findStudent(school._id, "Ananya", "Verma");
  const myra = await findStudent(school._id, "Myra", "Singh");
  const disha = await findStudent(school._id, "Disha", "Patni");

  if (![aarav, kabir, ananya, myra, disha].every(Boolean)) {
    throw new Error(
      "Demo students missing. Run seedDefaultSchoolStudents.js first."
    );
  }

  const boys101 = await findRoom(school._id, boys._id, "101");
  const boys201 = await findRoom(school._id, boys._id, "201");
  const girls101 = await findRoom(school._id, girls._id, "101");
  const girls102 = await findRoom(school._id, girls._id, "102");

  if (![boys101, boys201, girls101, girls102].every(Boolean)) {
    throw new Error("Demo rooms missing. Run seedDemoHostelRooms.js first.");
  }

  const assignments = [
    {
      student: aarav,
      hostel: boys,
      room: boys101,
      bedNumber: "B1",
      notes: "Demo resident – Boys Hostel A",
    },
    {
      student: kabir,
      hostel: boys,
      room: boys201,
      bedNumber: "B1",
      notes: "Demo resident – Boys Hostel A",
    },
    {
      student: ananya,
      hostel: girls,
      room: girls102,
      bedNumber: "B1",
      notes: "Demo resident – Girls Hostel B",
    },
    {
      student: myra,
      hostel: girls,
      room: girls101,
      bedNumber: "B1",
      notes: "Demo resident – Girls Hostel B",
    },
    {
      student: disha,
      hostel: girls,
      room: girls101,
      bedNumber: "B2",
      notes: "Demo resident – Girls Hostel B",
    },
  ];

  // Clear previous active demo residents for these students
  const studentIds = assignments.map((a) => a.student._id);
  await HostelResident.deleteMany({
    schoolId: school._id,
    studentId: { $in: studentIds },
  });

  // Reset all beds in demo hostels to Available (except Maintenance rooms)
  const demoRooms = await HostelRoom.find({
    schoolId: school._id,
    hostelId: { $in: [boys._id, girls._id] },
  });

  for (const room of demoRooms) {
    for (const bed of room.beds) {
      if (room.status === "Maintenance") {
        // keep room-level maintenance; beds stay Available unless occupied later
        bed.status = "Available";
      } else {
        bed.status = "Available";
      }
    }
    await room.save();
  }

  const created = [];
  for (const item of assignments) {
    const room = await HostelRoom.findById(item.room._id);
    const bed = room.beds.find((b) => b.bedNumber === item.bedNumber);
    if (!bed) {
      throw new Error(
        `Bed ${item.bedNumber} missing in room ${room.roomNumber}`
      );
    }

    bed.status = "Occupied";
    await room.save();

    const resident = await HostelResident.create({
      schoolId: school._id,
      studentId: item.student._id,
      hostelId: item.hostel._id,
      roomId: room._id,
      bedId: bed._id,
      bedNumber: bed.bedNumber,
      checkInDate: new Date("2025-06-01"),
      notes: item.notes,
      status: "Active",
    });

    created.push({
      student: `${item.student.firstName} ${item.student.lastName}`,
      hostel: item.hostel.name,
      room: room.roomNumber,
      bed: bed.bedNumber,
      id: resident._id.toString(),
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
