import { sendPushToTargets } from "../../push/pushService.js";

/**
 * Build legacy-style targets from a smart job recipient (or passthrough legacyTargets).
 */
function buildTargets(job, schoolId, legacyTargets) {
  const targets = legacyTargets || job.recipient?.legacyTargets;
  if (Array.isArray(targets) && targets.length) {
    return targets.map((t) => ({ ...t, ...(schoolId ? { schoolId } : {}) }));
  }

  const recipient = job.recipient || {};
  if (recipient.inboxTarget) {
    return [{ ...recipient.inboxTarget, schoolId }];
  }
  if (recipient.studentId) {
    return [{ type: "student", studentId: recipient.studentId, schoolId }];
  }
  if (recipient.teacherId) {
    return [{ type: "teacher", teacherId: recipient.teacherId, schoolId }];
  }
  if (recipient.staffId) {
    return [{ type: "staff", staffId: recipient.staffId, schoolId }];
  }
  if (recipient.role === "school_admin") {
    return [{ type: "role", roles: ["school_admin"], schoolId }];
  }
  return [];
}

export async function sendPush({ job, schoolId, legacyTargets }) {
  const targets = buildTargets(job, schoolId, legacyTargets);
  if (!targets.length) {
    return {
      ok: false,
      permanent: true,
      provider: "fcm",
      result: "skipped",
      errorCode: "NO_PUSH_IDENTITY",
      responseSummary: "No device identity for recipient",
    };
  }

  const result = await sendPushToTargets({
    title: job.subject || "Notification",
    message: job.body,
    schoolId,
    targets,
    data: {
      eventType: job.eventType || "",
      jobId: String(job._id),
    },
  });

  if (result?.skipped) {
    return {
      ok: false,
      permanent: true,
      provider: "fcm",
      result: "skipped",
      errorCode: "FCM_NOT_CONFIGURED",
      responseSummary: "Firebase not configured",
    };
  }

  if (!result?.sent) {
    return {
      ok: false,
      permanent: true,
      provider: "fcm",
      result: "skipped",
      errorCode: "NO_DEVICE_TOKEN",
      responseSummary: `No tokens (failed=${result?.failed || 0})`,
    };
  }

  return {
    ok: true,
    provider: "fcm",
    providerMessageId: "",
    result: "sent",
    responseSummary: `sent=${result.sent}`,
  };
}
