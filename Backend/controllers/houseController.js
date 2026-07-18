import mongoose from "mongoose";
import House from "../models/house.js";
import Student from "../models/student.js";
import { ensureDefaultHouses } from "../utils/ensureDefaultHouses.js";

const getSchoolId = (req) => req.user?.school_id;

const toObjectId = (id) => {
  if (!id) return id;
  if (id instanceof mongoose.Types.ObjectId) return id;
  return new mongoose.Types.ObjectId(id);
};

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/* ---------------- LIST HOUSES (+ counts) ---------------- */
export const getHouses = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "School not identified.",
      });
    }

    await ensureDefaultHouses(schoolId);

    const { status, search } = req.query;
    const filter = { schoolId };
    if (status) filter.status = status;
    if (search?.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { code: { $regex: q, $options: "i" } },
      ];
    }

    const houses = await House.find(filter).sort({ createdAt: 1 }).lean();

    const counts = await Student.aggregate([
      {
        $match: {
          schoolId: toObjectId(schoolId),
          houseId: { $ne: null },
        },
      },
      { $group: { _id: "$houseId", count: { $sum: 1 } } },
    ]);

    const countMap = Object.fromEntries(
      counts.map((c) => [String(c._id), c.count]),
    );

    const unassigned = await Student.countDocuments({
      schoolId,
      $or: [{ houseId: null }, { houseId: { $exists: false } }],
    });

    const data = houses.map((h) => ({
      ...h,
      studentCount: countMap[String(h._id)] || 0,
    }));

    return res.json({
      success: true,
      data,
      summary: {
        totalHouses: data.length,
        activeHouses: data.filter((h) => h.status === "Active").length,
        assignedStudents: data.reduce((s, h) => s + h.studentCount, 0),
        unassignedStudents: unassigned,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* ---------------- CREATE HOUSE ---------------- */
export const createHouse = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "School not identified.",
      });
    }

    await ensureDefaultHouses(schoolId);

    const { name, code, color, description, status } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "House name is required.",
      });
    }

    const exists = await House.findOne({
      schoolId,
      name: name.trim(),
    });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "A house with this name already exists.",
      });
    }

    const house = await House.create({
      schoolId,
      name: name.trim(),
      code: code ? String(code).trim().toUpperCase() : "",
      color: color || "#6366F1",
      description: description || "",
      status: status || "Active",
      isDefault: false,
    });

    return res.status(201).json({
      success: true,
      message: "House created successfully",
      data: house,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "House name or code already exists for this school.",
      });
    }
    next(error);
  }
};

/* ---------------- UPDATE HOUSE (rename etc.) ---------------- */
export const updateHouse = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { name, code, color, description, status } = req.body;

    const house = await House.findOne({ _id: req.params.id, schoolId });
    if (!house) {
      return res.status(404).json({
        success: false,
        message: "House not found.",
      });
    }

    if (name !== undefined) {
      if (!name?.trim()) {
        return res.status(400).json({
          success: false,
          message: "House name is required.",
        });
      }
      const clash = await House.findOne({
        schoolId,
        name: name.trim(),
        _id: { $ne: house._id },
      });
      if (clash) {
        return res.status(400).json({
          success: false,
          message: "A house with this name already exists.",
        });
      }
      house.name = name.trim();
    }
    if (code !== undefined) house.code = String(code || "").trim().toUpperCase();
    if (color !== undefined) house.color = color || house.color;
    if (description !== undefined) house.description = description || "";
    if (status !== undefined) house.status = status;

    await house.save();

    return res.json({
      success: true,
      message: "House updated successfully",
      data: house,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "House name or code already exists for this school.",
      });
    }
    next(error);
  }
};

/* ---------------- DELETE HOUSE ---------------- */
export const deleteHouse = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const house = await House.findOne({ _id: req.params.id, schoolId });
    if (!house) {
      return res.status(404).json({
        success: false,
        message: "House not found.",
      });
    }

    const activeCount = await House.countDocuments({
      schoolId,
      status: "Active",
    });
    if (house.status === "Active" && activeCount <= 1) {
      return res.status(400).json({
        success: false,
        message: "At least one active house is required.",
      });
    }

    const assigned = await Student.countDocuments({
      schoolId,
      houseId: house._id,
    });
    if (assigned > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${assigned} student(s) are assigned to this house. Reallocate them first.`,
      });
    }

    await house.deleteOne();

    return res.json({
      success: true,
      message: "House deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/* ---------------- LIST STUDENTS (by house / unassigned) ---------------- */
export const getHouseStudents = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "School not identified.",
      });
    }

    const { houseId, unassigned, search } = req.query;
    const filter = { schoolId };

    if (unassigned === "true" || unassigned === "1") {
      filter.$or = [{ houseId: null }, { houseId: { $exists: false } }];
    } else if (houseId) {
      filter.houseId = houseId;
    }

    if (search?.trim()) {
      const q = search.trim();
      const nameFilter = {
        $or: [
          { firstName: { $regex: q, $options: "i" } },
          { lastName: { $regex: q, $options: "i" } },
          { studentId: { $regex: q, $options: "i" } },
        ],
      };
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, nameFilter];
        delete filter.$or;
      } else {
        Object.assign(filter, nameFilter);
      }
    }

    const students = await Student.find(filter)
      .select("firstName lastName studentId classId sectionId houseId gender")
      .populate("classId", "name")
      .populate("sectionId", "name")
      .populate("houseId", "name code color")
      .sort({ firstName: 1 })
      .lean();

    return res.json({ success: true, data: students });
  } catch (error) {
    next(error);
  }
};

/* ---------------- ASSIGN ONE STUDENT ---------------- */
export const assignStudentHouse = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { studentId, houseId } = req.body;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "studentId is required.",
      });
    }

    const student = await Student.findOne({ _id: studentId, schoolId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    if (houseId) {
      const house = await House.findOne({
        _id: houseId,
        schoolId,
        status: "Active",
      });
      if (!house) {
        return res.status(404).json({
          success: false,
          message: "Active house not found.",
        });
      }
      student.houseId = house._id;
    } else {
      student.houseId = null;
    }

    await student.save();

    return res.json({
      success: true,
      message: houseId
        ? "Student assigned to house"
        : "Student unassigned from house",
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

/* ---------------- RANDOM ALLOCATE ----------------
 * body: { onlyUnassigned?: boolean }  default true
 * Distributes students evenly across active houses (random order).
 */
export const randomAllocateHouses = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "School not identified.",
      });
    }

    await ensureDefaultHouses(schoolId);

    const onlyUnassigned = req.body?.onlyUnassigned !== false;

    const houses = await House.find({ schoolId, status: "Active" }).sort({
      createdAt: 1,
    });
    if (houses.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No active houses available for allocation.",
      });
    }

    const studentFilter = { schoolId };
    if (onlyUnassigned) {
      studentFilter.$or = [{ houseId: null }, { houseId: { $exists: false } }];
    }

    const students = await Student.find(studentFilter).select("_id");
    if (students.length === 0) {
      return res.json({
        success: true,
        message: onlyUnassigned
          ? "No unassigned students to allocate."
          : "No students found to allocate.",
        data: { allocated: 0 },
      });
    }

    const shuffled = shuffle(students);
    const houseIds = houses.map((h) => h._id);

    const ops = shuffled.map((stu, idx) => ({
      updateOne: {
        filter: { _id: stu._id, schoolId },
        update: { $set: { houseId: houseIds[idx % houseIds.length] } },
      },
    }));

    await Student.bulkWrite(ops);

    return res.json({
      success: true,
      message: `Randomly allocated ${shuffled.length} student(s) across ${houses.length} house(s).`,
      data: {
        allocated: shuffled.length,
        houses: houses.length,
        onlyUnassigned,
      },
    });
  } catch (error) {
    next(error);
  }
};
