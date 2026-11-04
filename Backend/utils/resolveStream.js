import mongoose from "mongoose";
import Stream from "../models/stream.js";

/**
 * Resolve a school stream id to { streamId, stream }.
 * When classId is provided and the stream is class-scoped, the stream must
 * belong to that class (empty classIds = all classes).
 */
export const resolveStream = async (schoolId, streamId, classId = null) => {
  if (!streamId) return { streamId: null, stream: "" };
  if (!mongoose.Types.ObjectId.isValid(streamId)) {
    const error = new Error("Invalid stream selected.");
    error.statusCode = 400;
    throw error;
  }

  const doc = await Stream.findOne({
    _id: streamId,
    schoolId,
    status: "Active",
  })
    .select("name classIds")
    .lean();

  if (!doc) {
    const error = new Error("Selected stream was not found.");
    error.statusCode = 400;
    throw error;
  }

  const linked = Array.isArray(doc.classIds) ? doc.classIds : [];
  if (
    classId &&
    linked.length > 0 &&
    !linked.some((id) => String(id) === String(classId))
  ) {
    const error = new Error("Selected stream is not available for this class.");
    error.statusCode = 400;
    throw error;
  }

  return { streamId: doc._id, stream: doc.name || "" };
};
