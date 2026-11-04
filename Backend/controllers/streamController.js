import mongoose from "mongoose";
import Stream from "../models/stream.js";
import Class from "../models/class.js";
import Subject from "../models/subject.js";

const schoolIdOf = (req) => req.user?.school_id;

const normalizeClassIds = async (schoolId, raw) => {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const unique = [
    ...new Set(
      list
        .map((id) => String(id || "").trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id)),
    ),
  ];
  if (!unique.length) return [];

  const classes = await Class.find({
    schoolId,
    _id: { $in: unique },
  })
    .select("_id")
    .lean();
  const allowed = new Set(classes.map((c) => String(c._id)));
  return unique
    .filter((id) => allowed.has(id))
    .map((id) => new mongoose.Types.ObjectId(id));
};

const normalizeSubjectIds = async (schoolId, raw) => {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const unique = [
    ...new Set(
      list
        .map((id) => String(id || "").trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id)),
    ),
  ];
  if (!unique.length) return [];

  const subjects = await Subject.find({
    schoolId,
    _id: { $in: unique },
  })
    .select("_id")
    .lean();
  const allowed = new Set(subjects.map((s) => String(s._id)));
  return unique
    .filter((id) => allowed.has(id))
    .map((id) => new mongoose.Types.ObjectId(id));
};

const decorateStreams = async (schoolId, streams) => {
  const classIdSet = new Set();
  const subjectIdSet = new Set();
  for (const stream of streams) {
    for (const id of stream.classIds || []) classIdSet.add(String(id));
    for (const id of stream.compulsorySubjectIds || []) {
      subjectIdSet.add(String(id));
    }
  }

  const [classes, subjects] = await Promise.all([
    classIdSet.size
      ? Class.find({ schoolId, _id: { $in: [...classIdSet] } })
          .select("name")
          .lean()
      : Promise.resolve([]),
    subjectIdSet.size
      ? Subject.find({ schoolId, _id: { $in: [...subjectIdSet] } })
          .select("name")
          .lean()
      : Promise.resolve([]),
  ]);

  const classById = Object.fromEntries(
    classes.map((cls) => [String(cls._id), cls.name || ""]),
  );
  const subjectById = Object.fromEntries(
    subjects.map((sub) => [String(sub._id), sub.name || ""]),
  );

  return streams.map((stream) => {
    const classIds = (stream.classIds || []).map((id) => String(id));
    const classNames = classIds.map((id) => classById[id]).filter(Boolean);
    const compulsorySubjectIds = (stream.compulsorySubjectIds || []).map((id) =>
      String(id),
    );
    const compulsorySubjectNames = compulsorySubjectIds
      .map((id) => subjectById[id])
      .filter(Boolean);
    return {
      ...stream,
      classIds,
      classNames,
      classes: classIds.map((id) => ({
        _id: id,
        name: classById[id] || "",
      })),
      compulsorySubjectIds,
      compulsorySubjectNames,
      compulsorySubjects: compulsorySubjectIds.map((id) => ({
        _id: id,
        name: subjectById[id] || "",
      })),
    };
  });
};

export const getStreams = async (req, res) => {
  try {
    const schoolId = schoolIdOf(req);
    if (!schoolId) {
      return res
        .status(403)
        .json({ success: false, message: "School not identified." });
    }

    const filter = { schoolId };
    const status = String(req.query.status || "").trim();
    if (status) filter.status = status;

    const search = String(req.query.search || "").trim();
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    const classId = String(req.query.classId || "").trim();
    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
      const classOid = new mongoose.Types.ObjectId(classId);
      filter.$and = [
        ...(filter.$and || []),
        {
          $or: [
            { classIds: { $exists: false } },
            { classIds: { $size: 0 } },
            { classIds: classOid },
          ],
        },
      ];
    }

    const streams = await Stream.find(filter).sort({ name: 1 }).lean();
    const decorated = await decorateStreams(schoolId, streams);
    return res.json({ success: true, streams: decorated, data: decorated });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load streams",
    });
  }
};

export const createStream = async (req, res) => {
  try {
    const schoolId = schoolIdOf(req);
    if (!schoolId) {
      return res
        .status(403)
        .json({ success: false, message: "School not identified." });
    }

    const name = String(req.body?.name || "").trim();
    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Stream name is required." });
    }

    const classIds = await normalizeClassIds(schoolId, req.body?.classIds);
    const compulsorySubjectIds = await normalizeSubjectIds(
      schoolId,
      req.body?.compulsorySubjectIds,
    );
    if (!compulsorySubjectIds.length) {
      return res.status(400).json({
        success: false,
        message: "Select at least one compulsory subject for this stream.",
      });
    }

    const exists = await Stream.findOne({ schoolId, name }).select("_id").lean();
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "A stream with this name already exists.",
      });
    }

    const stream = await Stream.create({
      schoolId,
      name,
      code: String(req.body?.code || "").trim().toUpperCase(),
      description: String(req.body?.description || "").trim(),
      classIds,
      compulsorySubjectIds,
      status: req.body?.status === "Inactive" ? "Inactive" : "Active",
    });

    const [decorated] = await decorateStreams(schoolId, [stream.toObject()]);
    return res.status(201).json({
      success: true,
      message: "Stream created successfully",
      data: decorated,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Stream name or code already exists for this school.",
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create stream",
    });
  }
};

export const updateStream = async (req, res) => {
  try {
    const schoolId = schoolIdOf(req);
    const stream = await Stream.findOne({ _id: req.params.id, schoolId });
    if (!stream) {
      return res
        .status(404)
        .json({ success: false, message: "Stream not found." });
    }

    if (req.body?.name !== undefined) {
      const name = String(req.body.name || "").trim();
      if (!name) {
        return res
          .status(400)
          .json({ success: false, message: "Stream name is required." });
      }
      const clash = await Stream.findOne({
        schoolId,
        name,
        _id: { $ne: stream._id },
      })
        .select("_id")
        .lean();
      if (clash) {
        return res.status(400).json({
          success: false,
          message: "A stream with this name already exists.",
        });
      }
      stream.name = name;
    }

    if (req.body?.code !== undefined) {
      stream.code = String(req.body.code || "").trim().toUpperCase();
    }
    if (req.body?.description !== undefined) {
      stream.description = String(req.body.description || "").trim();
    }
    if (req.body?.status !== undefined) {
      stream.status =
        req.body.status === "Inactive" ? "Inactive" : "Active";
    }
    if (req.body?.classIds !== undefined) {
      stream.classIds = await normalizeClassIds(schoolId, req.body.classIds);
    }
    if (req.body?.compulsorySubjectIds !== undefined) {
      const compulsorySubjectIds = await normalizeSubjectIds(
        schoolId,
        req.body.compulsorySubjectIds,
      );
      if (!compulsorySubjectIds.length) {
        return res.status(400).json({
          success: false,
          message: "Select at least one compulsory subject for this stream.",
        });
      }
      stream.compulsorySubjectIds = compulsorySubjectIds;
    }

    await stream.save();
    const [decorated] = await decorateStreams(schoolId, [stream.toObject()]);
    return res.json({
      success: true,
      message: "Stream updated successfully",
      data: decorated,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Stream name or code already exists for this school.",
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update stream",
    });
  }
};

export const deleteStream = async (req, res) => {
  try {
    const schoolId = schoolIdOf(req);
    const stream = await Stream.findOneAndDelete({
      _id: req.params.id,
      schoolId,
    });
    if (!stream) {
      return res
        .status(404)
        .json({ success: false, message: "Stream not found." });
    }
    return res.json({ success: true, message: "Stream deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete stream",
    });
  }
};
