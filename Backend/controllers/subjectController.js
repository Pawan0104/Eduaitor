import Subject from "../models/subject.js";
import Class from "../models/class.js";

/* ── CREATE ── */
export const createSubject = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    let { name, status } = req.body;

    if (!schoolId)
      return res.status(400).json({
        success: false,
        message: "schoolId is required",
      });

    name = name.trim();

    // Case-insensitive duplicate check
    const existing = await Subject.findOne({
      schoolId,
      name: { $regex: `^${name}$`, $options: "i" },
    });

    if (existing)
      return res.status(400).json({
        success: false,
        message: "Subject already exists in this school",
      });

    const subject = await Subject.create({
      schoolId,
      name,
      status,
    });

    res.status(201).json({
      success: true,
      message: "Subject created successfully",
      subject,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
/* ── GET ALL ── */
export const getSubjects = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;

    if (!schoolId)
      return res
        .status(400)
        .json({ success: false, message: "schoolId is required" });

    // Only fetch subjects for this school
    const subjects = await Subject.find({ schoolId }).sort({ createdAt: -1 });

    const classes = await Class.find({ schoolId }) // ← filter by schoolId
      .populate("details.sectionId", "name")
      .select("name details");

    const result = subjects.map((sub) => {
      const subId = sub._id.toString();

      /*
        For each class, check each detail entry's subjects array.
        Collect unique class+section combos that use this subject.
      */
      const usedIn = [];

      classes.forEach((cls) => {
        cls.details.forEach((detail) => {
          const hasSubject = detail.subjectTeachers?.some(
            (st) =>
              (typeof st.subjectId === "object"
                ? st.subjectId._id.toString()
                : st.subjectId.toString()) === subId,
          );

          if (hasSubject) {
            usedIn.push({
              _id: `${cls._id}_${detail._id}`,
              classId: cls._id,
              name: cls.name,
              section: detail.sectionId?.name || null,
              // display label e.g. "Class 1 - A" or "Class 1"
              label: detail.sectionId
                ? `${cls.name} - ${detail.sectionId.name}`
                : cls.name,
            });
          }
        });
      });

      return {
        _id: sub._id,
        name: sub.name,
        status: sub.status,
        classCount: usedIn.length,
        classes: usedIn,
      };
    });

    res.status(200).json({ success: true, subjects: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── UPDATE ── */
export const updateSubject = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    let { name, status } = req.body;

    if (!schoolId)
      return res.status(400).json({
        success: false,
        message: "schoolId is required",
      });

    const subject = await Subject.findOne({
      _id: req.params.id,
      schoolId,
    });

    if (!subject)
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });

    if (name) {
      name = name.trim();

      const existing = await Subject.findOne({
        schoolId,
        name: { $regex: `^${name}$`, $options: "i" },
        _id: { $ne: subject._id },
      });

      if (existing)
        return res.status(400).json({
          success: false,
          message: "Subject name already exists in this school",
        });
    }

    subject.name = name || subject.name;
    subject.status = status || subject.status;

    await subject.save();

    res.status(200).json({
      success: true,
      message: "Subject updated successfully",
      subject,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── DELETE ── */
export const deleteSubject = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;

    if (!schoolId)
      return res.status(400).json({
        success: false,
        message: "schoolId is required",
      });

    const subject = await Subject.findOne({
      _id: req.params.id,
      schoolId,
    });

    if (!subject)
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });

    // Check usage in classes
    const isUsed = await Class.findOne({
      schoolId,
      "details.subjectTeachers.subjectId": subject._id,
    });

    if (isUsed) {
      return res.status(400).json({
        success: false,
        message: "Subject is used in classes and cannot be deleted",
      });
    }

    await subject.deleteOne();

    res.status(200).json({
      success: true,
      message: "Subject deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── GET ALL FOR SUPER ADMIN ── */
export const getAllSubjects = async (req, res) => {
  try {
    if (req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const schoolId = req.query.schoolId;

    if (!schoolId)
      return res
        .status(400)
        .json({ success: false, message: "schoolId is required" });

    // Only fetch subjects for this school
    const subjects = await Subject.find({ schoolId }).sort({ createdAt: -1 });

    const classes = await Class.find({ schoolId }) // ← filter by schoolId
      .populate("details.sectionId", "name")
      .select("name details");

    const result = subjects.map((sub) => {
      const subId = sub._id.toString();

      /*
        For each class, check each detail entry's subjects array.
        Collect unique class+section combos that use this subject.
      */
      const usedIn = [];

      classes.forEach((cls) => {
        cls.details.forEach((detail) => {
          const hasSubject = detail.subjectTeachers?.some(
            (st) =>
              (typeof st.subjectId === "object"
                ? st.subjectId._id.toString()
                : st.subjectId.toString()) === subId,
          );

          if (hasSubject) {
            usedIn.push({
              _id: `${cls._id}_${detail._id}`,
              classId: cls._id,
              name: cls.name,
              section: detail.sectionId?.name || null,
              // display label e.g. "Class 1 - A" or "Class 1"
              label: detail.sectionId
                ? `${cls.name} - ${detail.sectionId.name}`
                : cls.name,
            });
          }
        });
      });

      return {
        _id: sub._id,
        name: sub.name,
        status: sub.status,
        classCount: usedIn.length,
        classes: usedIn,
      };
    });

    res.status(200).json({ success: true, subjects: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
