import XLSX from "xlsx";
import Timetable from "../models/timetable.js";
import Class from "../models/class.js";
import Subject from "../models/subject.js";
import Teacher from "../models/teacher.js";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const TEMPLATE_HEADERS = [
  "className",
  "sectionName",
  "day",
  "periodName",
  "start",
  "end",
  "type",
  "subjectName",
  "teacherName",
  "customName",
];

const buildSchedule = (assignments) =>
  Object.keys(assignments).map((day) => ({
    day,
    periods: Object.keys(assignments[day]).map((periodId) => {
      const p = assignments[day][periodId];
      return {
        periodId,
        subjectId: p?.subjectId || null,
        teacherId: p?.teacherId || null,
        substituteTeacherId: p?.substituteTeacherId || null,
        customName: p?.customName || "",
        type: p?.type || "lecture",
        status: !p?.teacherId ? "no-teacher" : "normal",
      };
    }),
  }));

const norm = (v) => String(v ?? "").trim();
const normKey = (v) => norm(v).toLowerCase();

export const downloadTimetableTemplate = (req, res) => {
  try {
    const sampleRows = [
      {
        className: "Grade 1",
        sectionName: "A",
        day: "Monday",
        periodName: "Period 1",
        start: "08:00",
        end: "08:45",
        type: "lecture",
        subjectName: "English",
        teacherName: "Priya Malhotra",
        customName: "",
      },
      {
        className: "Grade 1",
        sectionName: "A",
        day: "Monday",
        periodName: "Period 2",
        start: "08:45",
        end: "09:30",
        type: "lunch",
        subjectName: "",
        teacherName: "",
        customName: "Lunch Break",
      },
      {
        className: "Grade 1",
        sectionName: "A",
        day: "Tuesday",
        periodName: "Period 1",
        start: "08:00",
        end: "08:45",
        type: "lecture",
        subjectName: "Mathematics",
        teacherName: "Rahul Desai",
        customName: "",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows, {
      header: TEMPLATE_HEADERS,
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Timetable");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=timetable_bulk_upload_template.xlsx",
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.send(buffer);
  } catch (error) {
    console.error("Timetable template error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate template",
    });
  }
};

export const bulkUploadTimetable = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    if (!schoolId) {
      return res.status(400).json({ success: false, message: "schoolId required" });
    }
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: "Spreadsheet file is required" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (!rows.length) {
      return res.status(400).json({ success: false, message: "File has no data rows" });
    }

    const [classes, subjects, teachers] = await Promise.all([
      Class.find({ schoolId, status: "Active" })
        .populate("details.sectionId", "name")
        .lean(),
      Subject.find({ schoolId }).select("name").lean(),
      Teacher.find({ schoolId }).select("fullName email username").lean(),
    ]);

    const classMap = new Map();
    classes.forEach((cls) => {
      (cls.details || []).forEach((d) => {
        const sectionName = d.sectionId?.name || "";
        const key = `${normKey(cls.name)}||${normKey(sectionName)}`;
        classMap.set(key, {
          classId: cls._id,
          detailId: d._id,
          className: cls.name,
          sectionName,
        });
      });
      // also allow class-only match when section blank and only one detail
      if ((cls.details || []).length === 1) {
        const d = cls.details[0];
        const key = `${normKey(cls.name)}||`;
        if (!classMap.has(key)) {
          classMap.set(key, {
            classId: cls._id,
            detailId: d._id,
            className: cls.name,
            sectionName: d.sectionId?.name || "",
          });
        }
      }
    });

    const subjectMap = new Map(
      subjects.map((s) => [normKey(s.name), s._id.toString()]),
    );
    const teacherMap = new Map();
    teachers.forEach((t) => {
      if (t.fullName) teacherMap.set(normKey(t.fullName), t._id.toString());
      if (t.email) teacherMap.set(normKey(t.email), t._id.toString());
      if (t.username) teacherMap.set(normKey(t.username), t._id.toString());
    });

    const groups = new Map();
    const failed = [];
    let rowNum = 1;

    for (const raw of rows) {
      rowNum += 1;
      const className = norm(raw.className);
      const sectionName = norm(raw.sectionName);
      const dayRaw = norm(raw.day);
      const periodName = norm(raw.periodName) || "Period";
      const start = norm(raw.start);
      const end = norm(raw.end);
      let type = normKey(raw.type) || "lecture";
      if (!["lecture", "activity", "lunch", "free"].includes(type)) type = "lecture";
      const subjectName = norm(raw.subjectName);
      const teacherName = norm(raw.teacherName);
      const customName = norm(raw.customName);

      if (!className) {
        failed.push({ row: rowNum, reason: "className missing" });
        continue;
      }

      const day =
        DAYS.find((d) => d.toLowerCase() === dayRaw.toLowerCase()) || null;
      if (!day) {
        failed.push({
          row: rowNum,
          reason: `Invalid day "${dayRaw}" (use Monday–Saturday)`,
        });
        continue;
      }

      const classHit =
        classMap.get(`${normKey(className)}||${normKey(sectionName)}`) ||
        classMap.get(`${normKey(className)}||`);
      if (!classHit) {
        failed.push({
          row: rowNum,
          reason: `Class/section not found: ${className}${sectionName ? " - " + sectionName : ""}`,
        });
        continue;
      }

      let subjectId = "";
      let teacherId = "";
      if (type === "lecture") {
        if (subjectName) {
          subjectId = subjectMap.get(normKey(subjectName)) || "";
          if (!subjectId) {
            failed.push({
              row: rowNum,
              reason: `Subject not found: ${subjectName}`,
            });
            continue;
          }
        }
        if (teacherName) {
          teacherId = teacherMap.get(normKey(teacherName)) || "";
          if (!teacherId) {
            failed.push({
              row: rowNum,
              reason: `Teacher not found: ${teacherName}`,
            });
            continue;
          }
        }
      }

      const groupKey = `${classHit.classId}_${classHit.detailId}`;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          classId: classHit.classId,
          detailId: classHit.detailId,
          label: `${classHit.className}${classHit.sectionName ? " - " + classHit.sectionName : ""}`,
          periodOrder: [],
          periodMap: new Map(),
          assignments: {},
        });
      }
      const group = groups.get(groupKey);

      const periodKey = `${normKey(periodName)}|${start}|${end}`;
      let periodId = group.periodMap.get(periodKey);
      if (!periodId) {
        periodId = `P${group.periodOrder.length + 1}`;
        group.periodMap.set(periodKey, periodId);
        group.periodOrder.push({
          id: periodId,
          name: periodName,
          start: start || "08:00",
          end: end || "08:45",
        });
      }

      if (!group.assignments[day]) group.assignments[day] = {};
      group.assignments[day][periodId] = {
        subjectId,
        teacherId,
        type,
        customName,
        substituteTeacherId: "",
      };
    }

    const success = [];
    for (const group of groups.values()) {
      const periodConfigs = group.periodOrder;
      const schedule = buildSchedule(group.assignments);
      const filter = {
        schoolId,
        classId: group.classId,
        detailId: group.detailId || null,
      };

      let timetable = await Timetable.findOne(filter);
      if (timetable) {
        timetable.periodConfigs = periodConfigs;
        timetable.schedule = schedule;
        await timetable.save();
      } else {
        timetable = await Timetable.create({
          ...filter,
          periodConfigs,
          schedule,
        });
      }
      success.push({
        class: group.label,
        periods: periodConfigs.length,
        days: Object.keys(group.assignments).length,
      });
    }

    res.json({
      success: true,
      message: `Uploaded ${success.length} timetable(s)`,
      data: {
        uploaded: success.length,
        failed: failed.length,
        success,
        failedRows: failed,
      },
    });
  } catch (error) {
    console.error("Timetable bulk upload error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Bulk upload failed",
    });
  }
};
