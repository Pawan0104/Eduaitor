/**
 * Merge duplicate help threads per (schoolId + participant + subType).
 * Keeps the oldest thread, moves messages from duplicates into it, deletes extras.
 *
 * Usage: node scripts/dedupeHelpThreads.js
 */
import "dotenv/config";
import mongoose from "mongoose";
import MessageThread from "../models/messagethread.js";
import DirectMessage from "../models/directmessage.js";
import connectDB from "../config/db.js";

const run = async () => {
  await connectDB();

  const helpThreads = await MessageThread.find({ isHelpThread: true }).lean();
  const groups = new Map();

  for (const t of helpThreads) {
    const requester = t.participants.find(
      (p) => p.participantModel !== "SuperAdmin",
    );
    if (!requester) continue;
    const key = [
      String(t.schoolId),
      String(requester.participantId),
      requester.participantModel,
      requester.subType || "default",
    ].join("|");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }

  let merged = 0;
  for (const [, list] of groups) {
    if (list.length < 2) continue;
    list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const keep = list[0];
    const drop = list.slice(1);

    for (const d of drop) {
      await DirectMessage.updateMany(
        { threadId: d._id },
        { $set: { threadId: keep._id } },
      );
      await MessageThread.deleteOne({ _id: d._id });
      merged += 1;
      console.log(`Merged ${d._id} → ${keep._id}`);
    }

    const last = await DirectMessage.findOne({ threadId: keep._id })
      .sort({ createdAt: -1 })
      .lean();
    if (last) {
      await MessageThread.updateOne(
        { _id: keep._id },
        {
          $set: {
            lastMessage: last.text || "📎 attachment",
            lastMessageAt: last.createdAt,
            lastMessageSenderId: last.senderId,
            lastMessageSenderSubType: last.senderSubType || "default",
          },
        },
      );
    }
  }

  console.log(`Done. Merged ${merged} duplicate help thread(s).`);
  await mongoose.disconnect();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
