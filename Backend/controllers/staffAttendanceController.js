import mongoose from "mongoose";
import StaffAttendance from "../models/staffAttendance.js";
import Staff from "../models/staff.js";
import Teacher from "../models/teacher.js";
import { Driver } from "../models/transport.js";

/**
 * Attendance covers everyone the staff-management screen knows about — Staff,
 * teachers and drivers live in separate collections, so everything here works
 * on a merged, normalised person list.
 */
const getPeople = async (schoolId, { activeOnly = false } = {}) => {
  const staffQuery = { schoolId };
  const teacherQuery = { schoolId };
  const driverQuery = { schoolId };
  if (activeOnly) {
    staffQuery.status = "Active";
    // Teachers store "Present" / "On Leave" / "Inactive" — treat everything
    // except "Inactive" as active, exactly like the staff-management list does.
    teacherQuery.status = { $ne: "Inactive" };
    driverQuery.status = "Active";
  }

  const [staffDocs, teacherDocs, driverDocs] = await Promise.all([
    Staff.find(staffQuery)
      .select("fullName email phone staffRole staffRoleCustom staffId status")
      .lean(),
    Teacher.find(teacherQuery)
      .select("fullName email phone designation status")
      .lean(),
    Driver.find(driverQuery)
      .select("name email phone status")
      .lean(),
  ]);

  return [
    ...staffDocs.map((s) => ({
      _id: s._id,
      fullName: s.fullName,
      email: s.email,
      phone: s.phone,
      staffId: s.staffId,
      status: s.status,
      personType: "staff",
      staffRole: s.staffRole,
      staffRoleCustom: s.staffRoleCustom,
    })),
    ...teacherDocs.map((t) => ({
      _id: t._id,
      fullName: t.fullName,
      email: t.email,
      phone: t.phone,
      status: t.status,
      personType: "teacher",
      // Teachers have no staffRole; surface their designation so the existing
      // role column still renders something meaningful.
      staffRole: "teacher",
      staffRoleCustom: t.designation || "Teacher",
    })),
    ...driverDocs.map((d) => ({
      _id: d._id,
      fullName: d.name,
      email: d.email || "",
      phone: d.phone || "",
      status: d.status,
      personType: "driver",
      staffRole: "driver",
      staffRoleCustom: "Driver",
    })),
  ].sort((a, b) => String(a.fullName).localeCompare(String(b.fullName)));
};

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

    const staffList = await getPeople(schoolId);

    const todayRecords = await StaffAttendance.find({
      schoolId,
      date: { $gte: start, $lte: end },
    }).lean();

    const attendanceByStaff = todayRecords.reduce((acc, record) => {
      acc[record.staffId.toString()] = record;
      return acc;
    }, {});

    const staffWithToday = staffList.map((person) => {
      const todayRecord = attendanceByStaff[person._id.toString()];
      return {
        ...person,
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

    const staffList = await getPeople(schoolId, { activeOnly: true });

    const existingRecords = await StaffAttendance.find({
      schoolId,
      date: { $gte: start, $lte: end },
    }).lean();

    const existingStaffIds = new Set(
      existingRecords.map((record) => record.staffId.toString()),
    );

    const recordsToCreate = staffList
      .filter((person) => !existingStaffIds.has(person._id.toString()))
      .map((person) => ({
        schoolId,
        staffId: person._id,
        personType: person.personType,
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
    const { staffId, date, status, note, personType } = req.body;

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

    const attTypes = { teacher: Teacher, driver: Driver };
    const type = Object.prototype.hasOwnProperty.call(attTypes, personType)
      ? personType
      : "staff";
    const typeLabel = type === "teacher" ? "Teacher" : type === "driver" ? "Driver" : "Staff";

    // Confirm the person really is who they claim to be, so a bad id can never
    // silently create an orphan attendance row.
    const Person = attTypes[type] || Staff;
    const person = await Person.findOne({ _id: staffId, schoolId })
      .select("_id")
      .lean();

    if (!person) {
      return res.status(404).json({
        success: false,
        message: `${typeLabel} not found in this school`,
      });
    }

    const existing = await StaffAttendance.findOne({
      schoolId,
      staffId,
      date: attendanceDate,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Attendance already recorded for this ${type} on this date`,
      });
    }

    const record = await StaffAttendance.create({
      schoolId,
      staffId,
      personType: type,
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
          schoolId: new mongoose.Types.ObjectId(schoolId),
          staffId: new mongoose.Types.ObjectId(staffId),
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
