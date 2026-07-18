import Hostel from "../models/hostel.js";
import HostelRoom from "../models/hostelRoom.js";
import HostelResident from "../models/hostelResident.js";
import Student from "../models/student.js";

const getSchoolId = (req) => req.user?.school_id;

const setBedStatus = async (room, bedId, status) => {
  const bed = room.beds.id(bedId);
  if (!bed) return false;
  bed.status = status;
  await room.save();
  return true;
};

const normalizeGender = (gender) => {
  const value = String(gender || "")
    .trim()
    .toLowerCase();
  if (["male", "m", "boy", "boys"].includes(value)) return "Male";
  if (["female", "f", "girl", "girls"].includes(value)) return "Female";
  return "";
};

/** Boys hostel → male only; Girls hostel → female only; Co-ed → both */
const assertGenderHostelMatch = (studentGender, hostelType) => {
  const gender = normalizeGender(studentGender);
  const type = String(hostelType || "").trim();

  if (!gender) {
    return "Student gender is required to assign a hostel bed.";
  }

  if (type === "Boys" && gender !== "Male") {
    return "Female students cannot check in to a Boys hostel.";
  }

  if (type === "Girls" && gender !== "Female") {
    return "Male students cannot check in to a Girls hostel.";
  }

  return null;
};

/* ---------------- LIST RESIDENTS ---------------- */
export const getResidents = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "School not identified.",
      });
    }

    const { search, status, hostelId, roomId } = req.query;
    const filter = { schoolId };

    if (status && status !== "all") filter.status = status;
    else if (!status) filter.status = "Active";

    if (hostelId) filter.hostelId = hostelId;
    if (roomId) filter.roomId = roomId;

    let residents = await HostelResident.find(filter)
      .populate({
        path: "studentId",
        select: "firstName lastName studentId gender rollNo classId sectionId",
        populate: [
          { path: "classId", select: "name className" },
          { path: "sectionId", select: "name sectionName" },
        ],
      })
      .populate("hostelId", "name code type")
      .populate("roomId", "roomNumber floor roomType")
      .sort({ checkInDate: -1 })
      .lean();

    if (search?.trim()) {
      const q = search.trim().toLowerCase();
      residents = residents.filter((r) => {
        const student = r.studentId;
        const fullName = `${student?.firstName || ""} ${student?.lastName || ""}`
          .trim()
          .toLowerCase();
        return (
          fullName.includes(q) ||
          student?.studentId?.toLowerCase().includes(q) ||
          r.bedNumber?.toLowerCase().includes(q) ||
          r.roomId?.roomNumber?.toLowerCase().includes(q) ||
          r.hostelId?.name?.toLowerCase().includes(q)
        );
      });
    }

    return res.json({ success: true, data: residents });
  } catch (error) {
    next(error);
  }
};

/* ---------------- CREATE / ASSIGN ---------------- */
export const createResident = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "School not identified.",
      });
    }

    const { studentId, roomId, bedId, checkInDate, notes } = req.body;

    if (!studentId || !roomId || !bedId) {
      return res.status(400).json({
        success: false,
        message: "Student, room and bed are required.",
      });
    }

    const student = await Student.findOne({ _id: studentId, schoolId });
    if (!student) {
      return res.status(400).json({
        success: false,
        message: "Student not found for this school.",
      });
    }

    const existing = await HostelResident.findOne({
      schoolId,
      studentId,
      status: "Active",
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "This student is already assigned to a hostel bed.",
      });
    }

    const room = await HostelRoom.findOne({ _id: roomId, schoolId });
    if (!room) {
      return res.status(400).json({
        success: false,
        message: "Room not found.",
      });
    }

    if (room.status !== "Active") {
      return res.status(400).json({
        success: false,
        message: "Cannot assign to an inactive or maintenance room.",
      });
    }

    const hostel = await Hostel.findOne({ _id: room.hostelId, schoolId });
    if (!hostel || hostel.status !== "Active") {
      return res.status(400).json({
        success: false,
        message: "Hostel is not available.",
      });
    }

    const genderError = assertGenderHostelMatch(student.gender, hostel.type);
    if (genderError) {
      return res.status(400).json({
        success: false,
        message: genderError,
      });
    }

    const bed = room.beds.id(bedId);
    if (!bed) {
      return res.status(400).json({
        success: false,
        message: "Bed not found in this room.",
      });
    }

    if (bed.status === "Maintenance") {
      return res.status(400).json({
        success: false,
        message: "This bed is under maintenance.",
      });
    }

    const bedTaken = await HostelResident.findOne({
      schoolId,
      roomId,
      bedId,
      status: "Active",
    });
    if (bedTaken || bed.status === "Occupied") {
      return res.status(400).json({
        success: false,
        message: "This bed is already occupied.",
      });
    }

    const resident = await HostelResident.create({
      schoolId,
      studentId,
      hostelId: room.hostelId,
      roomId: room._id,
      bedId: bed._id,
      bedNumber: bed.bedNumber,
      checkInDate: checkInDate ? new Date(checkInDate) : new Date(),
      notes: notes?.trim() || "",
      status: "Active",
    });

    bed.status = "Occupied";
    await room.save();

    const populated = await HostelResident.findById(resident._id)
      .populate({
        path: "studentId",
        select: "firstName lastName studentId gender rollNo classId sectionId",
        populate: [
          { path: "classId", select: "name className" },
          { path: "sectionId", select: "name sectionName" },
        ],
      })
      .populate("hostelId", "name code type")
      .populate("roomId", "roomNumber floor roomType")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Student assigned to hostel successfully",
      data: populated,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Student or bed is already assigned.",
      });
    }
    next(error);
  }
};

/* ---------------- UPDATE ---------------- */
export const updateResident = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const resident = await HostelResident.findOne({
      _id: req.params.id,
      schoolId,
      status: "Active",
    });

    if (!resident) {
      return res.status(404).json({
        success: false,
        message: "Active resident not found.",
      });
    }

    const { roomId, bedId, checkInDate, notes } = req.body;

    // Reassign to another bed if requested
    if (roomId && bedId) {
      const sameBed =
        String(resident.roomId) === String(roomId) &&
        String(resident.bedId) === String(bedId);

      if (!sameBed) {
        const newRoom = await HostelRoom.findOne({ _id: roomId, schoolId });
        if (!newRoom || newRoom.status !== "Active") {
          return res.status(400).json({
            success: false,
            message: "Target room is not available.",
          });
        }

        const newHostel = await Hostel.findOne({
          _id: newRoom.hostelId,
          schoolId,
        });
        if (!newHostel || newHostel.status !== "Active") {
          return res.status(400).json({
            success: false,
            message: "Target hostel is not available.",
          });
        }

        const student = await Student.findOne({
          _id: resident.studentId,
          schoolId,
        }).select("gender");

        const genderError = assertGenderHostelMatch(
          student?.gender,
          newHostel.type
        );
        if (genderError) {
          return res.status(400).json({
            success: false,
            message: genderError,
          });
        }

        const newBed = newRoom.beds.id(bedId);
        if (!newBed) {
          return res.status(400).json({
            success: false,
            message: "Target bed not found.",
          });
        }

        if (newBed.status !== "Available") {
          return res.status(400).json({
            success: false,
            message: "Target bed is not available.",
          });
        }

        const oldRoom = await HostelRoom.findOne({
          _id: resident.roomId,
          schoolId,
        });
        if (oldRoom) {
          await setBedStatus(oldRoom, resident.bedId, "Available");
        }

        newBed.status = "Occupied";
        await newRoom.save();

        resident.hostelId = newRoom.hostelId;
        resident.roomId = newRoom._id;
        resident.bedId = newBed._id;
        resident.bedNumber = newBed.bedNumber;
      }
    }

    if (checkInDate !== undefined) {
      resident.checkInDate = checkInDate ? new Date(checkInDate) : resident.checkInDate;
    }
    if (notes !== undefined) resident.notes = String(notes).trim();

    await resident.save();

    const populated = await HostelResident.findById(resident._id)
      .populate({
        path: "studentId",
        select: "firstName lastName studentId gender rollNo classId sectionId",
        populate: [
          { path: "classId", select: "name className" },
          { path: "sectionId", select: "name sectionName" },
        ],
      })
      .populate("hostelId", "name code type")
      .populate("roomId", "roomNumber floor roomType")
      .lean();

    return res.json({
      success: true,
      message: "Resident updated successfully",
      data: populated,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Target bed is already assigned.",
      });
    }
    next(error);
  }
};

/* ---------------- CHECK OUT ---------------- */
export const checkoutResident = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const resident = await HostelResident.findOne({
      _id: req.params.id,
      schoolId,
      status: "Active",
    });

    if (!resident) {
      return res.status(404).json({
        success: false,
        message: "Active resident not found.",
      });
    }

    const room = await HostelRoom.findOne({
      _id: resident.roomId,
      schoolId,
    });
    if (room) {
      await setBedStatus(room, resident.bedId, "Available");
    }

    resident.status = "CheckedOut";
    resident.checkOutDate = new Date();
    await resident.save();

    return res.json({
      success: true,
      message: "Student checked out successfully",
      data: resident,
    });
  } catch (error) {
    next(error);
  }
};

/* ---------------- DELETE (force remove) ---------------- */
export const deleteResident = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const resident = await HostelResident.findOne({
      _id: req.params.id,
      schoolId,
    });

    if (!resident) {
      return res.status(404).json({
        success: false,
        message: "Resident not found.",
      });
    }

    if (resident.status === "Active") {
      const room = await HostelRoom.findOne({
        _id: resident.roomId,
        schoolId,
      });
      if (room) {
        await setBedStatus(room, resident.bedId, "Available");
      }
    }

    await resident.deleteOne();

    return res.json({
      success: true,
      message: "Resident record deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
