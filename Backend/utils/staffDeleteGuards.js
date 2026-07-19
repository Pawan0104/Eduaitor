import Class from "../models/class.js";
import Timetable from "../models/timetable.js";
import Lead from "../models/lead.js";
import { Bus, TransportRoute } from "../models/transport.js";

/**
 * Returns an error message string if the person cannot be deleted, else null.
 */
export const getTeacherDeleteBlocker = async (teacherId, schoolId) => {
  const linkedClass = await Class.findOne({
    schoolId,
    $or: [
      { "details.teacherId": teacherId },
      { "details.subjectTeachers.teacherId": teacherId },
    ],
  })
    .select("name")
    .lean();

  if (linkedClass) {
    return `Cannot delete: this teacher is assigned to class "${linkedClass.name}". Reassign classes/subjects first.`;
  }

  const linkedTimetable = await Timetable.findOne({
    schoolId,
    $or: [
      { "schedule.periods.teacherId": teacherId },
      { "schedule.periods.substituteTeacherId": teacherId },
    ],
  })
    .select("_id")
    .lean();

  if (linkedTimetable) {
    return "Cannot delete: this teacher is used in the timetable. Remove or reassign timetable slots first.";
  }

  return null;
};

export const getDriverDeleteBlocker = async (driver) => {
  const issues = [];

  if (driver.bus) {
    const bus = await Bus.findById(driver.bus).select("busId").lean();
    issues.push(bus?.busId ? `bus ${bus.busId}` : "a bus");
  }
  if (driver.route) {
    const route = await TransportRoute.findById(driver.route).select("name").lean();
    issues.push(route?.name ? `route "${route.name}"` : "a route");
  }

  if (issues.length === 0) return null;
  return `Cannot delete: driver is still assigned to ${issues.join(" and ")}. Clear the assignment first.`;
};

export const getStaffDeleteBlocker = async (staffId, schoolId) => {
  const lead = await Lead.findOne({
    schoolId,
    "assignedTo.userType": "staff",
    "assignedTo.userId": staffId,
    status: { $in: ["active", "processing"] },
  })
    .select("studentName")
    .lean();

  if (lead) {
    return `Cannot delete: this staff member is assigned to open lead "${lead.studentName}". Reassign the lead first.`;
  }

  return null;
};
