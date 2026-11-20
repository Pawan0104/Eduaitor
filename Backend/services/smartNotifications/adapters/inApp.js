import Notification from "../../../models/notification.js";

const TYPE_MAP = {
  attendance: "attendance",
  transport: "transport",
  communication: "general",
  diary: "diary",
  exams: "exam",
  fees: "fee",
  leave: "general",
  parent_engagement: "general",
};

/**
 * Creates an inbox Notification document so parent/teacher/staff topbars keep working.
 */
export async function sendInApp({ job, schoolId, category, legacyTargets }) {
  const recipient = job.recipient || {};
  let targets = [];

  if (Array.isArray(legacyTargets) && legacyTargets.length) {
    targets = legacyTargets.map((t) => ({
      ...t,
      ...(schoolId ? { schoolId } : {}),
    }));
  } else if (recipient.legacyTargets?.length) {
    targets = recipient.legacyTargets.map((t) => ({
      ...t,
      ...(schoolId ? { schoolId } : {}),
    }));
  } else if (recipient.inboxTarget) {
    targets = [{ ...recipient.inboxTarget, schoolId }];
  } else if (recipient.studentId) {
    targets = [{ type: "student", studentId: recipient.studentId, schoolId }];
  } else if (recipient.teacherId) {
    targets = [{ type: "teacher", teacherId: recipient.teacherId, schoolId }];
  } else if (recipient.staffId) {
    targets = [{ type: "role", roles: ["staff_admin"], staffId: recipient.staffId, schoolId }];
  } else if (recipient.role === "school_admin") {
    targets = [{ type: "role", roles: ["school_admin"], schoolId }];
  } else {
    targets = [{ type: "all", schoolId }];
  }

  const notification = await Notification.create({
    title: job.subject || "Notification",
    message: job.body,
    notificationType: TYPE_MAP[category] || "general",
    targets,
    status: "sent",
    systemKey: `smart:${job._id}`,
  });

  return {
    ok: true,
    provider: "in_app",
    providerMessageId: String(notification._id),
    inboxNotificationId: notification._id,
    result: "sent",
  };
}
