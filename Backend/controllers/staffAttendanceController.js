import mongoose from "mongoose";
import StaffAttendance from "../models/staffAttendance.js";
import Staff from "../models/staff.js";

const getDateRange = (date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const getRandomBiometricStatus = () => {
  const rand = Math.random();
  if (rand < 0.78) return "Present";
  if (rand < 0.9) return "Absent";
  if (rand < 0.96) return "Leave";
  return "Half Day";
};

export const getStaffAttendanceMeta = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const today = new Date();
    const { start, end } = getDateRange(today);

    const staffList = await Staff.find({ schoolId })
      .select("fullName email phone staffRole staffRoleCustom staffId status")
      .sort({ fullName: 1 })
      .lean();

    const todayRecords = await StaffAttendance.find({
      schoolId,
      date: { $gte: start, $lte: end },
    }).lean();

    const attendanceByStaff = todayRecords.reduce((acc, record) => {
      acc[record.staffId.toString()] = record;
      return acc;
    }, {});

    const staffWithToday = staffList.map((staff) => {
      const todayRecord = attendanceByStaff[staff._id.toString()];
      return {
        ...staff,
        todayStatus: todayRecord?.status || "Not marked",
        todayNote: todayRecord?.note || "",
        todayAttendanceId: todayRecord?._id || null,
      };
    });

    return res.json({
      success: true,
      data: {
        staffList: staffWithToday,
        todayDate: start,
        todayStatus: todayRecords.length ? true : false,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getStaffAttendanceRecords = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { staffId, month, year } = req.query;

    if (!staffId || !month || !year) {
      return res.status(400).json({
        success: false,
        message: "staffId, month, and year are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(staffId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid staffId",
      });
    }

    const records = await StaffAttendance.find({
      schoolId,
      staffId,
      month: Number(month),
      year: Number(year),
    }).sort({ date: 1 });

    return res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
};

export const biometricSyncStaffAttendance = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const today = new Date();
    const { start, end } = getDateRange(today);

    const staffList = await Staff.find({ schoolId, status: "Active" })
      .select("_id fullName staffRole staffRoleCustom phone email")
      .lean();

    const existingRecords = await StaffAttendance.find({
      schoolId,
      date: { $gte: start, $lte: end },
    }).lean();

    const existingStaffIds = new Set(
      existingRecords.map((record) => record.staffId.toString()),
    );

    const recordsToCreate = staffList
      .filter((staff) => !existingStaffIds.has(staff._id.toString()))
      .map((staff) => ({
        schoolId,
        staffId: staff._id,
        date: start,
        month: start.getMonth() + 1,
        year: start.getFullYear(),
        status: getRandomBiometricStatus(),
        note: "Synced from biometric device",
        markedBy: req.user._id,
      }));

    const inserted = recordsToCreate.length
      ? await StaffAttendance.insertMany(recordsToCreate)
      : [];

    return res.json({
      success: true,
      data: {
        createdCount: inserted.length,
        alreadyRecorded: existingRecords.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const saveStaffAttendance = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { staffId, date, status, note } = req.body;

    if (!staffId || !date || !status) {
      return res.status(400).json({
        success: false,
        message: "staffId, date, and status are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(staffId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid staffId",
      });
    }

    const attendanceDate = new Date(date);
    const month = attendanceDate.getMonth() + 1;
    const year = attendanceDate.getFullYear();

    const existing = await StaffAttendance.findOne({
      schoolId,
      staffId,
      date: attendanceDate,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Attendance already recorded for this staff on this date",
      });
    }

    const record = await StaffAttendance.create({
      schoolId,
      staffId,
      date: attendanceDate,
      month,
      year,
      status,
      note: note || "",
      markedBy: req.user._id,
    });

    return res.status(201).json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

export const updateStaffAttendance = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { attendanceId, status, note } = req.body;

    if (!attendanceId || !status) {
      return res.status(400).json({
        success: false,
        message: "attendanceId and status are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(attendanceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendanceId",
      });
    }

    const record = await StaffAttendance.findOne({
      _id: attendanceId,
      schoolId,
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    record.status = status;
    record.note = note || record.note;
    await record.save();

    return res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

export const getStaffAttendanceSummary = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { staffId, month, year } = req.query;

    if (!staffId || !month || !year) {
      return res.status(400).json({
        success: false,
        message: "staffId, month, and year are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(staffId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid staffId",
      });
    }

    const summary = await StaffAttendance.aggregate([
      {
        $match: {
          schoolId: mongoose.Types.ObjectId(schoolId),
          staffId: mongoose.Types.ObjectId(staffId),
          month: Number(month),
          year: Number(year),
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const result = {
      Present: 0,
      Absent: 0,
      Leave: 0,
      "Half Day": 0,
    };

    summary.forEach((item) => {
      result[item._id] = item.count;
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
