import Hostel from "../models/hostel.js";
import HostelRoom from "../models/hostelRoom.js";

const getSchoolId = (req) => req.user?.school_id;

const normalizeCode = (code) => {
  if (code === undefined || code === null) return undefined;
  const value = String(code).trim().toUpperCase();
  return value || undefined;
};

/* ---------------- LIST HOSTELS ---------------- */
export const getHostels = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "School not identified.",
      });
    }

    const { search, status, type } = req.query;
    const filter = { schoolId };

    if (status) filter.status = status;
    if (type) filter.type = type;

    if (search?.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { code: { $regex: q, $options: "i" } },
        { wardenName: { $regex: q, $options: "i" } },
        { address: { $regex: q, $options: "i" } },
      ];
    }

    const hostels = await Hostel.find(filter).sort({ createdAt: -1 }).lean();

    return res.json({ success: true, data: hostels });
  } catch (error) {
    next(error);
  }
};

/* ---------------- GET SINGLE ---------------- */
export const getHostel = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const hostel = await Hostel.findOne({
      _id: req.params.id,
      schoolId,
    }).lean();

    if (!hostel) {
      return res.status(404).json({
        success: false,
        message: "Hostel not found.",
      });
    }

    return res.json({ success: true, data: hostel });
  } catch (error) {
    next(error);
  }
};

/* ---------------- CREATE ---------------- */
export const createHostel = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "School not identified.",
      });
    }

    const {
      name,
      code,
      type,
      address,
      totalFloors,
      capacity,
      wardenName,
      wardenPhone,
      description,
      status,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Hostel name is required.",
      });
    }

    const payload = {
      schoolId,
      name: String(name).trim(),
      type: type || "Boys",
      address: address?.trim() || "",
      totalFloors:
        totalFloors === undefined || totalFloors === ""
          ? 1
          : Number(totalFloors),
      capacity:
        capacity === undefined || capacity === "" ? 0 : Number(capacity),
      wardenName: wardenName?.trim() || "",
      wardenPhone: wardenPhone?.trim() || "",
      description: description?.trim() || "",
      status: status || "Active",
    };

    const normalizedCode = normalizeCode(code);
    if (normalizedCode) payload.code = normalizedCode;

    const hostel = await Hostel.create(payload);

    return res.status(201).json({
      success: true,
      message: "Hostel created successfully",
      data: hostel,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A hostel with this name or code already exists.",
      });
    }
    next(error);
  }
};

/* ---------------- UPDATE ---------------- */
export const updateHostel = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const hostel = await Hostel.findOne({
      _id: req.params.id,
      schoolId,
    });

    if (!hostel) {
      return res.status(404).json({
        success: false,
        message: "Hostel not found.",
      });
    }

    const {
      name,
      code,
      type,
      address,
      totalFloors,
      capacity,
      wardenName,
      wardenPhone,
      description,
      status,
    } = req.body;

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({
          success: false,
          message: "Hostel name is required.",
        });
      }
      hostel.name = String(name).trim();
    }

    if (code !== undefined) {
      const normalizedCode = normalizeCode(code);
      if (normalizedCode) hostel.code = normalizedCode;
      else hostel.set("code", undefined);
    }
    if (type !== undefined) hostel.type = type;
    if (address !== undefined) hostel.address = String(address).trim();
    if (totalFloors !== undefined && totalFloors !== "") {
      hostel.totalFloors = Number(totalFloors);
    }
    if (capacity !== undefined && capacity !== "") {
      hostel.capacity = Number(capacity);
    }
    if (wardenName !== undefined) hostel.wardenName = String(wardenName).trim();
    if (wardenPhone !== undefined) {
      hostel.wardenPhone = String(wardenPhone).trim();
    }
    if (description !== undefined) {
      hostel.description = String(description).trim();
    }
    if (status !== undefined) hostel.status = status;

    await hostel.save();

    return res.json({
      success: true,
      message: "Hostel updated successfully",
      data: hostel,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A hostel with this name or code already exists.",
      });
    }
    next(error);
  }
};

/* ---------------- DELETE ---------------- */
export const deleteHostel = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const hostel = await Hostel.findOne({
      _id: req.params.id,
      schoolId,
    });

    if (!hostel) {
      return res.status(404).json({
        success: false,
        message: "Hostel not found.",
      });
    }

    const roomCount = await HostelRoom.countDocuments({
      schoolId,
      hostelId: hostel._id,
    });

    if (roomCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete hostel with ${roomCount} room(s). Remove rooms first.`,
      });
    }

    await hostel.deleteOne();

    return res.json({
      success: true,
      message: "Hostel deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
