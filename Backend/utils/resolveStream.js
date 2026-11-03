import mongoose from "mongoose";
import Stream from "../models/stream.js";

/**
 * Resolve a school stream id to { streamId, stream }.
 * Returns empty values when no id is provided.
 */
export const resolveStream = async (schoolId, streamId) => {
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
    .select("name")
    .lean();

  if (!doc) {
    const error = new Error("Selected stream was not found.");
    error.statusCode = 400;
    throw error;
  }

  return { streamId: doc._id, stream: doc.name || "" };
};
