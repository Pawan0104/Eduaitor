import Diary from "../models/diary.js";
import Class from "../models/class.js";
import Student from "../models/student.js";
import mongoose from "mongoose";
import { createNotificationHelper } from "./notificationController.js"; // Import the helper function


export const createDiary = async (req, res) => {
  try {
    const data = await Diary.create({
      ...req.body,
      schoolId: req.user.school_id,
      teacherId: req.user.teacher_id,
    });

    // 🔴 NOTIFICATION LOGIC
    let title = "New Diary Update 📘";
    let message = data.content;

    if (data.type === "homework") {
      title = "New Homework 📚";
      message = `Homework assigned. Due: ${data.dueDate ? new Date(data.dueDate).toLocaleDateString() : "N/A"
        }`;
    }

    if (data.type === "classwork") {
      title = "Classwork Update 📝";
      message = "New classwork has been added.";
    }

    if (data.type === "remark") {
      title = "Teacher Remark 💬";
      message = data.content;
    }

    await createNotificationHelper({
      title,
      message,
      notificationType: "diary",
      createdBy: req.user._id,
      schoolId: req.user.school_id,
      targets: [
        {
          type: "class",
          classId: data.classId,
          sectionId: data.sectionId
        }
      ]
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getDiary = async (req, res) => {
  try {
    const data = await Diary.find({
      teacherId: req.user.teacher_id,
    }).populate("teacherId", "fullName email")
      .populate("subjectId", "name code")
      .populate("classId", "name")
      .sort({ createdAt: -1 });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateDiary = async (req, res) => {
  try {
    const data = await Diary.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteDiary = async (req, res) => {
  try {
    await Diary.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /api/diary/principal ──────────────────────────────────────────────────
export const getPrincipalDiary = async (req, res) => {
  try {
    const {
      classId,
      sectionId,
      subjectId,
      teacherId,
      type,
      date,
      month,
      year,
      page = 1,
      limit = 30,
    } = req.query;
    console.log("Filters:", req.query);

    const schoolId = req.user?.school_id || req.query.schoolId;

    // ── Build filter for Mongoose .find() (auto-casts strings → ObjectId) ────
    const filter = { schoolId };

    if (classId) filter.classId = classId;
    if (sectionId) filter.sectionId = sectionId;
    if (subjectId) filter.subjectId = subjectId;
    if (teacherId) filter.teacherId = teacherId;
    if (type) filter.type = type;

    // Single date filter
    if (date) {
      const d = new Date(date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      filter.date = { $gte: d, $lt: next };
    }

    // Month + year filter (only when date not set)
    if (!date && ((month !== undefined && month !== "") || year)) {
      const y = parseInt(year) || new Date().getFullYear();
      const m = month !== undefined && month !== "" ? parseInt(month) : null;

      if (m !== null) {
        filter.date = { $gte: new Date(y, m, 1), $lt: new Date(y, m + 1, 1) };
      } else {
        filter.date = { $gte: new Date(y, 0, 1), $lt: new Date(y + 1, 0, 1) };
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [entries, total] = await Promise.all([
      Diary.find(filter)
        .populate("teacherId", "name email profilePic")
        .populate("classId", "name details")
        .populate("subjectId", "name code")
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Diary.countDocuments(filter),
    ]);

    // Resolve section name + room from class.details
    const enriched = entries.map((entry) => {
      const classDetails = entry.classId?.details || [];
      // Diary.sectionId holds the sectionDetail subdocument's _id, so match on d._id
      const sectionDetail = classDetails.find(
        (d) => d._id?.toString() === entry.sectionId?.toString(),
      );
      return {
        ...entry,
        sectionName: sectionDetail?.sectionId?.name || null,
        roomNumber: sectionDetail?.roomNumber || null,
        classId: entry.classId
          ? { _id: entry.classId._id, name: entry.classId.name }
          : null,
      };
    });

    // ── Aggregate stats — must cast strings to ObjectId; aggregate() does NOT ──
    //    auto-cast the way find() does.
    const toOid = (id) => new mongoose.Types.ObjectId(id);

    const aggFilter = { schoolId: toOid(schoolId) };
    if (classId) aggFilter.classId = toOid(classId);
    if (sectionId) aggFilter.sectionId = toOid(sectionId);
    if (subjectId) aggFilter.subjectId = toOid(subjectId);
    if (teacherId) aggFilter.teacherId = toOid(teacherId);
    if (type) aggFilter.type = type;
    if (filter.date) aggFilter.date = filter.date; // already a $gte/$lt object

    const statsAgg = await Diary.aggregate([
      { $match: aggFilter },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);

    const typeCounts = { homework: 0, classwork: 0, remark: 0 };
    statsAgg.forEach(({ _id, count }) => {
      if (_id in typeCounts) typeCounts[_id] = count;
    });

    return res.status(200).json({
      success: true,
      data: enriched,
      stats: { ...typeCounts, total },
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("getPrincipalDiary:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// ─── GET /api/diary/principal/filters ─────────────────────────────────────────
export const getPrincipalDiaryFilters = async (req, res) => {
  try {
    const schoolId = req.user?.school_id || req.query.schoolId;

    const [classes, teachers] = await Promise.all([
      Class.find({ schoolId, status: "Active" })
        .select("name details")
        .populate("details.sectionId", "name")
        // ✅ FIX: populate subjects inside each section so the frontend
        //    can build the subject dropdown from class data alone.
        .populate("details.subjectTeachers.subjectId", "name code")
        .lean(),

      Diary.distinct("teacherId", { schoolId }).then((ids) =>
        ids.length
          ? mongoose
            .model("Teacher")
            .find({ _id: { $in: ids } })
            .select("fullName name")
            .lean()
          : [],
      ),
    ]);

    return res.status(200).json({ success: true, classes, teachers });
  } catch (error) {
    console.error("getPrincipalDiaryFilters:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


export const getStudentDiary = async (req, res) => {
  try {
    const studentId = req.params.studentId;
    console.log("Fetching diary for student ID:", studentId);

    // Find the class and section of the student
    const studentClass = await Student.findOne({ _id: studentId }).select("classId sectionId").lean();

    if (!studentClass) {
      return res.status(404).json({ error: "Student not found" });
    }

    const { classId, sectionId } = studentClass;
    console.log(`Student classId: ${classId}, sectionId: ${sectionId}`);
    // Find diary entries for the student's class and section
    const diaryEntries = await Diary.find({
      classId,
      sectionId,
    })
      .populate("teacherId", "fullName email")
      .populate("subjectId", "name code")
      .populate("classId", "name")
      .populate("sectionId", "name")
      .sort({ date: -1, createdAt: -1 })
      .lean();
    console.log("Diary entries found:", diaryEntries.length);
    res.json(diaryEntries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}