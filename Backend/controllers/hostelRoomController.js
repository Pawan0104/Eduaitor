import Hostel from "../models/hostel.js";
import HostelRoom from "../models/hostelRoom.js";
import HostelResident from "../models/hostelResident.js";

const getSchoolId = (req) => req.user?.school_id;

const DEFAULT_BEDS = {
  Single: 1,
  Double: 2,
  Triple: 3,
  Quad: 4,
  Dormitory: 6,
};

const buildBeds = (count, existing = []) => {
  const beds = [];
  for (let i = 1; i <= count; i++) {
    const bedNumber = `B${i}`;
    const prev = existing.find((b) => b.bedNumber === bedNumber);
    beds.push({
      bedNumber,
      status: prev?.status || "Available",
    });
  }
  return beds;
};

const withBedStats = (room) => {
  const beds = room.beds || [];
  return {
    ...room,
    totalBeds: beds.length,
    availableBeds: beds.filter((b) => b.status === "Available").length,
    occupiedBeds: beds.filter((b) => b.status === "Occupied").length,
  };
};

/* ---------------- LIST ROOMS ---------------- */
export const getRooms = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "School not identified.",
      });
    }

    const { search, status, hostelId, floor, roomType } = req.query;
    const filter = { schoolId };

    if (status) filter.status = status;
    if (hostelId) filter.hostelId = hostelId;
    if (floor !== undefined && floor !== "") filter.floor = Number(floor);
    if (roomType) filter.roomType = roomType;

    if (search?.trim()) {
      const q = search.trim();
      filter.$or = [
        { roomNumber: { $regex: q, $options: "i" } },
        { amenities: { $regex: q, $options: "i" } },
        { notes: { $regex: q, $options: "i" } },
        { "beds.bedNumber": { $regex: q, $options: "i" } },
      ];
    }

    const rooms = await HostelRoom.find(filter)
      .populate("hostelId", "name code type")
      .sort({ floor: 1, roomNumber: 1 })
      .lean();

    return res.json({
      success: true,
      data: rooms.map(withBedStats),
    });
  } catch (error) {
    next(error);
  }
};

/* ---------------- GET SINGLE ---------------- */
export const getRoom = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const room = await HostelRoom.findOne({
      _id: req.params.id,
      schoolId,
    })
      .populate("hostelId", "name code type")
      .lean();

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found.",
      });
    }

    return res.json({ success: true, data: withBedStats(room) });
  } catch (error) {
    next(error);
  }
};

/* ---------------- CREATE ---------------- */
export const createRoom = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "School not identified.",
      });
    }

    const {
      hostelId,
      roomNumber,
      floor,
      roomType,
      bedCount,
      amenities,
      notes,
      status,
    } = req.body;

    if (!hostelId) {
      return res.status(400).json({
        success: false,
        message: "Hostel is required.",
      });
    }

    if (!roomNumber?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Room number is required.",
      });
    }

    const hostel = await Hostel.findOne({ _id: hostelId, schoolId });
    if (!hostel) {
      return res.status(400).json({
        success: false,
        message: "Selected hostel was not found for this school.",
      });
    }

    const type = roomType || "Double";
    const count = Math.max(
      1,
      Number(bedCount) || DEFAULT_BEDS[type] || 2
    );

    const room = await HostelRoom.create({
      schoolId,
      hostelId,
      roomNumber: String(roomNumber).trim().toUpperCase(),
      floor: floor === undefined || floor === "" ? 1 : Number(floor),
      roomType: type,
      beds: buildBeds(count),
      amenities: amenities?.trim() || "",
      notes: notes?.trim() || "",
      status: status || "Active",
    });

    const populated = await HostelRoom.findById(room._id)
      .populate("hostelId", "name code type")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Room created successfully",
      data: withBedStats(populated),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A room with this number already exists in the hostel.",
      });
    }
    next(error);
  }
};

/* ---------------- UPDATE ---------------- */
export const updateRoom = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const room = await HostelRoom.findOne({
      _id: req.params.id,
      schoolId,
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found.",
      });
    }

    const {
      hostelId,
      roomNumber,
      floor,
      roomType,
      bedCount,
      amenities,
      notes,
      status,
      beds,
    } = req.body;

    if (hostelId !== undefined) {
      const hostel = await Hostel.findOne({ _id: hostelId, schoolId });
      if (!hostel) {
        return res.status(400).json({
          success: false,
          message: "Selected hostel was not found for this school.",
        });
      }
      room.hostelId = hostelId;
    }

    if (roomNumber !== undefined) {
      if (!String(roomNumber).trim()) {
        return res.status(400).json({
          success: false,
          message: "Room number is required.",
        });
      }
      room.roomNumber = String(roomNumber).trim().toUpperCase();
    }

    if (floor !== undefined && floor !== "") room.floor = Number(floor);
    if (roomType !== undefined) room.roomType = roomType;
    if (amenities !== undefined) room.amenities = String(amenities).trim();
    if (notes !== undefined) room.notes = String(notes).trim();
    if (status !== undefined) room.status = status;

    if (Array.isArray(beds) && beds.length > 0) {
      room.beds = beds.map((b, idx) => ({
        bedNumber: String(b.bedNumber || `B${idx + 1}`).trim(),
        status: ["Available", "Occupied", "Maintenance"].includes(b.status)
          ? b.status
          : "Available",
      }));
    } else if (bedCount !== undefined && bedCount !== "") {
      const count = Math.max(1, Number(bedCount));
      const occupiedCount = room.beds.filter((b) => b.status === "Occupied")
        .length;
      if (count < occupiedCount) {
        return res.status(400).json({
          success: false,
          message: `Cannot reduce beds below ${occupiedCount} occupied bed(s).`,
        });
      }
      room.beds = buildBeds(count, room.beds);
    }

    await room.save();

    const populated = await HostelRoom.findById(room._id)
      .populate("hostelId", "name code type")
      .lean();

    return res.json({
      success: true,
      message: "Room updated successfully",
      data: withBedStats(populated),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A room with this number already exists in the hostel.",
      });
    }
    next(error);
  }
};

/* ---------------- DELETE ---------------- */
export const deleteRoom = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const room = await HostelRoom.findOne({
      _id: req.params.id,
      schoolId,
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found.",
      });
    }

    const activeResidents = await HostelResident.countDocuments({
      schoolId,
      roomId: room._id,
      status: "Active",
    });
    if (activeResidents > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete a room with active residents.",
      });
    }

    const occupied = room.beds.filter((b) => b.status === "Occupied").length;
    if (occupied > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete a room with occupied beds.",
      });
    }

    await room.deleteOne();

    return res.json({
      success: true,
      message: "Room deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
