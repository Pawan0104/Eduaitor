import MessageThread from "../models/messagethread.js";
import DirectMessage from "../models/directmessage.js";
import Notification from "../models/notification.js";
import Teacher from "../models/teacher.js";
import Staff from "../models/staff.js";
import School from "../models/school.js";
import Student from "../models/student.js";

// ─────────────────────────────────────────────────────────────
// Display name resolver for a message participant
// ─────────────────────────────────────────────────────────────
export const getParticipantDisplayName = async ({
  participantModel,
  participantId,
} = {}) => {
  if (!participantId) return "";
  try {
    if (participantModel === "Teacher") {
      const t = await Teacher.findById(participantId).select("fullName").lean();
      return t?.fullName || "Teacher";
    }
    if (participantModel === "Staff") {
      const s = await Staff.findById(participantId).select("fullName").lean();
      return s?.fullName || "Staff";
    }
    if (participantModel === "School") {
      const s = await School.findById(participantId)
        .select("school_name")
        .lean();
      return s?.school_name || "School";
    }
    if (participantModel === "Student") {
      const s = await Student.findById(participantId)
        .select("firstName lastName")
        .lean();
      const name = `${s?.firstName || ""} ${s?.lastName || ""}`.trim();
      return name || "Student";
    }
    if (participantModel === "SuperAdmin") return "Platform Support";
  } catch (err) {
    console.error("getParticipantDisplayName error:", err.message);
  }
  return "";
};

// Short preview string for a notification body
export const buildMessagePreview = (text, attachment) => {
  const t = (text || "").trim();
  if (t) return t.length > 120 ? `${t.slice(0, 117)}...` : t;
  const name = attachment?.name;
  if (name) return `📎 ${name}`;
  if (attachment?.url) return "📎 Attachment";
  return "You have a new message.";
};

const mirrorThreadQuery = (schoolId, a, b) => {
  const query = {
    participants: {
      $all: [
        {
          $elemMatch: {
            participantId: a.participantId,
            subType: a.subType || "default",
          },
        },
        {
          $elemMatch: {
            participantId: b.participantId,
            subType: b.subType || "default",
          },
        },
      ],
    },
  };
  if (schoolId) query.schoolId = schoolId;
  return query;
};

// ─────────────────────────────────────────────────────────────
// Mirror a school/teacher/staff → student message into the
// counterpart (parent) thread so both share the same conversation.
// Only mirrors when the recipient is a Student and the sender is
// NOT the student themselves (i.e. school → child / school → parent).
// Returns the mirrored message's thread id + document, or null.
// ─────────────────────────────────────────────────────────────
export const mirrorDirectMessageToCounterpart = async ({
  thread,
  sender, // { participantId, participantModel, subType }
  text,
  attachment,
}) => {
  if (!thread || !sender) return null;

  const recipient = thread.participants.find(
    (p) =>
      !(
        String(p.participantId) === String(sender.participantId) &&
        (p.subType || "default") === (sender.subType || "default")
      ),
  );

  if (!recipient) return null;
  if (recipient.participantModel !== "Student") return null;
  if (sender.participantModel === "Student") return null;

  const counterpartSubType =
    (recipient.subType || "student") === "parent" ? "student" : "parent";

  const senderParticipant = {
    participantId: sender.participantId,
    participantModel: sender.participantModel,
    subType: sender.subType || "default",
    schoolId: thread.schoolId,
  };
  const counterpartParticipant = {
    participantId: recipient.participantId,
    participantModel: "Student",
    subType: counterpartSubType,
    schoolId: thread.schoolId,
  };

  let counterpartThread = await MessageThread.findOne(
    mirrorThreadQuery(thread.schoolId, senderParticipant, counterpartParticipant),
  );

  if (!counterpartThread) {
    counterpartThread = await MessageThread.create({
      schoolId: thread.schoolId,
      participants: [senderParticipant, counterpartParticipant],
      lastMessage: "",
      lastMessageAt: null,
    });
  }

  const mirrored = await DirectMessage.create({
    threadId: counterpartThread._id,
    senderId: sender.participantId,
    senderModel: sender.participantModel,
    senderSubType: sender.subType || "default",
    text: text || "",
    attachment: attachment || undefined,
    seen: false,
  });

  await MessageThread.findByIdAndUpdate(counterpartThread._id, {
    lastMessage: text && text.trim() ? text.trim() : "📎 Attachment",
    lastMessageAt: new Date(),
    lastMessageSenderId: sender.participantId,
    lastMessageSenderSubType: sender.subType || "default",
  });

  return { threadId: counterpartThread._id, message: mirrored };
};

// ─────────────────────────────────────────────────────────────
// Upsert a single bell notification for a student. Reusing a
// systemKey means a busy conversation stays as ONE notification
// that keeps jumping back to unread instead of flooding the bell.
// ─────────────────────────────────────────────────────────────
const upsertStudentNotification = async ({
  schoolId,
  targets,
  title,
  message,
  systemKey,
}) => {
  if (!schoolId || !targets?.length) return null;

  const now = new Date();
  const set = {
    title,
    message,
    targets,
    notificationType: "general",
    status: "sent",
    scheduledAt: null,
    readBy: [],
    dismissedBy: [],
    createdAt: now,
  };

  try {
    // Reuse a single notification per conversation so a busy chat does
    // not flood the bell. createdAt is immutable in Mongoose, so we
    // replace the row to keep the newest message sorted to the top.
    const existing = await Notification.findOne({ systemKey }).select("_id");
    if (existing) {
      await Notification.deleteOne({ _id: existing._id });
    }
    return await Notification.create({ ...set, systemKey });
  } catch (err) {
    if (err?.code === 11000) {
      await Notification.updateOne({ systemKey }, { $set: set });
      return null;
    }
    console.error("upsertStudentNotification error:", err.message);
    return null;
  }
};

// Notify a student (and, since they share the same Student._id, the
// parent session too) about a new direct message.
export const notifyStudentOfMessage = ({
  schoolId,
  studentId,
  senderName,
  preview,
  systemKey,
}) => {
  if (!studentId) return null;
  return upsertStudentNotification({
    schoolId,
    targets: [{ type: "student", studentId, schoolId }],
    title: `New message from ${senderName || "School"}`,
    message: preview || "You have a new message.",
    systemKey,
  });
};

// Notify every student member of a group about a new group message.
export const notifyGroupStudentsOfMessage = async ({
  schoolId,
  group,
  sender,
  preview,
  systemKey,
}) => {
  if (!group) return null;
  const studentIds = (group.members || [])
    .filter((m) => m.userType === "student" && m.userId)
    .map((m) => String(m.userId))
    .filter(
      (id) =>
        !(
          sender &&
          sender.userType === "student" &&
          String(sender.userId) === id
        ),
    );

  if (!studentIds.length) return null;

  const unique = [...new Set(studentIds)];
  const targets = unique.map((id) => ({
    type: "student",
    studentId: id,
    schoolId,
  }));

  const senderName = await getParticipantDisplayName({
    participantModel:
      sender?.userType === "teacher"
        ? "Teacher"
        : sender?.userType === "staff"
          ? "Staff"
          : sender?.userType === "admin"
            ? "School"
            : "Student",
    participantId: sender?.userId,
  });

  return upsertStudentNotification({
    schoolId,
    targets,
    title: `New message in ${group.name || "Group"}`,
    message: `${senderName ? `${senderName}: ` : ""}${preview || "New message."}`,
    systemKey,
  });
};
