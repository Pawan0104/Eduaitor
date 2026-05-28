import mongoose from "mongoose";
import Class from "../models/class.js";
import Teacher from "../models/teacher.js";

/* ── CREATE CLASS ── */
export const createClass = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    let { name, details, status } = req.body;

    if (!schoolId)
      return res.status(400).json({
        success: false,
        message: "schoolId is required",
      });

    if (!name)
      return res.status(400).json({
        success: false,
        message: "Class name is required",
      });

    if (!details || details.length === 0)
      return res.status(400).json({
        success: false,
        message: "At least one detail entry is required",
      });

    name = name.trim();

    const exists = await Class.findOne({
      schoolId,
      name: { $regex: `^${name}$`, $options: "i" },
    });

    if (exists)
      return res.status(400).json({
        success: false,
        message: `"${name}" already exists`,
      });

    for (const d of details) {
      if (!d.roomNumber)
        return res.status(400).json({
          success: false,
          message: "Room number required",
        });
    }

    const sanitized = details.map((d) => ({
      ...d,
      sectionId: d.sectionId || null,
      teacherId: d.teacherId || null,
      subjectTeachers:
        d.subjectTeachers?.map((st) => ({
          subjectId: st.subjectId || null,
          teacherId: st.teacherId || null,
        })) || [],
      capacity: d.capacity || 40,
    }));

    const newClass = await Class.create({
      name,
      schoolId,
      details: sanitized,
      status,
    });

    // ✅ SYNC TEACHERS (MULTI CLASS SUPPORT)
    const teacherIds = [
      ...new Map(
        sanitized
          .filter((d) => d.teacherId)
          .map((d) => {
            const id = new mongoose.Types.ObjectId(d.teacherId);
            return [id.toString(), id];
          }),
      ).values(),
    ];

    if (teacherIds.length > 0) {
      await Teacher.updateMany(
        { _id: { $in: teacherIds } },
        { $addToSet: { assignedClasses: newClass._id } },
      );
    }

    const populated = await Class.findById(newClass._id)
      .populate("details.sectionId", "name status")
      .populate("details.teacherId", "fullName")
      .populate("details.subjectTeachers.teacherId", "fullName")
      .populate("details.subjectTeachers.subjectId", "name");

    res.status(201).json({
      success: true,
      message: "Class created successfully",
      class: populated,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── GET ALL CLASSES ── */
export const getClasses = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const schoolId = req.user.school_id;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "schoolId is required",
      });
    }

    const classes = await Class.find({ schoolId })
      .populate({
        path: "details.sectionId",
        select: "name status",
      })
      .populate({
        path: "details.teacherId",
        select: "fullName",
      })
      .populate("details.subjectTeachers.subjectId", "name")
      .populate("details.subjectTeachers.teacherId", "fullName")
      .sort({ name: 1 })
      .lean();

    res.json({ success: true, classes });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ── GET SINGLE CLASS ── */
export const getClassById = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;

    if (!schoolId)
      return res.status(400).json({
        success: false,
        message: "schoolId is required",
      });

    const cls = await Class.findOne({
      _id: req.params.id,
      schoolId,
    })
      .populate("details.sectionId", "name status")
      .populate("details.teacherId", "fullName")
      .populate("details.subjectTeachers.teacherId", "fullName")
      .populate("details.subjectTeachers.subjectId", "name");

    if (!cls)
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });

    res.json({ success: true, class: cls });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── GET FLAT — for dropdowns ──
   returns one entry per detail:
   "Class 1"       (sectionId: null)
   "Class 1 - A"   (sectionId: populated)
   "Class 1 - B"
*/
export const getClassesFlat = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;

    if (!schoolId)
      return res.status(400).json({
        success: false,
        message: "schoolId is required",
      });

    const classes = await Class.find({
      schoolId,
      status: "Active",
    })
      .populate("details.sectionId", "name status")
      .sort({ name: 1 });

    const result = [];

    classes.forEach((cls) => {
      cls.details.forEach((d) => {
        result.push({
          _id: `${cls._id}_${d._id}`,
          displayName: d.sectionId
            ? `${cls.name} - ${d.sectionId.name}`
            : cls.name,
          classId: cls._id,
          className: cls.name,
          detailId: d._id,
          sectionId: d.sectionId?._id || null,
          sectionName: d.sectionId?.name || null,
        });
      });
    });

    res.json({ success: true, classes: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── UPDATE CLASS ── */
export const updateClass = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const { name, details, status } = req.body;

    if (!schoolId)
      return res.status(400).json({
        success: false,
        message: "schoolId is required",
      });

    const cls = await Class.findOne({
      _id: req.params.id,
      schoolId,
    });

    if (!cls)
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });

    if (name && name !== cls.name) {
      const exists = await Class.findOne({
        schoolId,
        name: { $regex: `^${name}$`, $options: "i" },
        _id: { $ne: cls._id },
      });

      if (exists)
        return res.status(400).json({
          success: false,
          message: "Class name already exists",
        });
    }

    // 🔥 OLD TEACHERS
    const oldTeacherIds = cls.details
      .filter((d) => d.teacherId)
      .map((d) => d.teacherId.toString());

    const sanitized = details?.map((d) => ({
      ...d,
      sectionId: d.sectionId || null,
      teacherId: d.teacherId || null,
      subjectTeachers:
        d.subjectTeachers?.map((st) => ({
          subjectId: st.subjectId || null,
          teacherId: st.teacherId || null,
        })) || [],
      capacity: d.capacity || 40,
    }));

    // 🔥 NEW TEACHERS
    const newTeacherIds =
      sanitized
        ?.filter((d) => d.teacherId)
        .map((d) => d.teacherId.toString()) || [];

    // 🔥 FIND DIFF
    const removedTeachers = oldTeacherIds.filter(
      (id) => !newTeacherIds.includes(id),
    );
    const addedTeachers = newTeacherIds.filter(
      (id) => !oldTeacherIds.includes(id),
    );

    // 🔥 REMOVE CLASS FROM OLD TEACHERS
    await Teacher.updateMany(
      { _id: { $in: removedTeachers } },
      { $pull: { assignedClasses: cls._id } },
    );

    // 🔥 ADD CLASS TO NEW TEACHERS
    await Teacher.updateMany(
      { _id: { $in: addedTeachers } },
      { $addToSet: { assignedClasses: cls._id } },
    );

    // 🔥 UPDATE CLASS
    cls.name = name || cls.name;
    cls.details = sanitized || cls.details;
    cls.status = status || cls.status;

    await cls.save();

    const populated = await Class.findById(cls._id)
      .populate("details.sectionId", "name status")
      .populate("details.teacherId", "fullName")
      .populate("details.subjectTeachers.subjectId", "name")
      .populate("details.subjectTeachers.teacherId", "fullName");

    res.json({
      success: true,
      message: "Class updated successfully",
      class: populated,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── DELETE CLASS ── */
export const deleteClass = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;

    const cls = await Class.findOne({
      _id: req.params.id,
      schoolId,
    });

    if (!cls)
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });

    await cls.deleteOne();

    res.json({
      success: true,
      message: "Class deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── GET ALL CLASSES (ADMIN) ── */
export const getAllClasses = async (req, res) => {
  try {
    if (req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const schoolId = req.query.schoolId;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "schoolId is required",
      });
    }

    const classes = await Class.find({ schoolId })
      .populate({
        path: "details.sectionId",
        select: "name status",
      })
      .populate({
        path: "details.teacherId",
        select: "fullName",
      })
      .populate("details.subjectTeachers.subjectId", "name")
      .populate("details.subjectTeachers.teacherId", "fullName")
      .sort({ name: 1 })
      .lean();

    res.json({ success: true, classes });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ── GET CLASSES FOR TEACHER ── */
export const getTeacherClasses = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const rawTeacherId = req.user?.teacher_id;

    if (!schoolId || !rawTeacherId) {
      return res.status(400).json({ success: false, message: "Missing credentials" });
    }

    const teacherObjId = new mongoose.Types.ObjectId(rawTeacherId);
    const schoolObjId = new mongoose.Types.ObjectId(schoolId);

    // Get teacher's assignedClasses
    const teacher = await Teacher.findById(teacherObjId).select("assignedClasses");

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    // Also find classes where teacher appears in details
    const classesFromDetails = await Class.find({
      schoolId: schoolObjId,
      $or: [
        { "details.teacherId": teacherObjId },
        { "details.subjectTeachers.teacherId": teacherObjId },
      ],
    }).select("_id");

    const allClassIds = new Set([
      ...(teacher.assignedClasses || []).map((id) => id.toString()),
      ...classesFromDetails.map((c) => c._id.toString()),
    ]);

    const classes = await Class.find({
      _id: { $in: [...allClassIds] },
      schoolId: schoolObjId,
    })
      .populate("details.sectionId", "name status")
      .populate("details.teacherId", "fullName")
      .populate("details.subjectTeachers.subjectId", "name")
      .populate("details.subjectTeachers.teacherId", "fullName")
      .sort({ name: 1 })
      .lean();

    res.json({ success: true, classes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};