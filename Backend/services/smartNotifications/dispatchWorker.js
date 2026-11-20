import NotificationJob from "../../models/smartNotifications/notificationJob.js";
import DeliveryAttempt from "../../models/smartNotifications/deliveryAttempt.js";
import { getEventDefinition } from "./eventCatalog.js";
import { dispatchChannel } from "./adapters/index.js";

const MAX_ATTEMPTS = 5;
const BACKOFF_MS = [0, 30_000, 120_000, 600_000, 1_800_000];

function backoffMs(attemptCount) {
  return BACKOFF_MS[Math.min(attemptCount, BACKOFF_MS.length - 1)] || 1_800_000;
}

/**
 * Process a batch of due queued/retry jobs.
 */
export async function processQueuedJobs({ limit = 50 } = {}) {
  const now = new Date();
  const jobs = await NotificationJob.find({
    status: { $in: ["queued", "retry"] },
    scheduledAt: { $lte: now },
  })
    .sort({ scheduledAt: 1 })
    .limit(limit);

  let processed = 0;
  for (const job of jobs) {
    try {
      job.status = "processing";
      job.attemptCount = (job.attemptCount || 0) + 1;
      await job.save();

      const def = getEventDefinition(job.eventType);
      const result = await dispatchChannel(job.channel, {
        job,
        schoolId: job.schoolId,
        category: def?.category,
        legacyTargets: job.recipient?.legacyTargets,
      });

      await DeliveryAttempt.create({
        jobId: job._id,
        schoolId: job.schoolId,
        channel: job.channel,
        provider: result.provider || job.channel,
        providerMessageId: result.providerMessageId || "",
        result: result.result || (result.ok ? "sent" : "failed"),
        errorCode: result.errorCode || "",
        responseSummary: result.responseSummary || "",
      });

      if (result.ok) {
        job.status = result.result === "delivered" ? "delivered" : "sent";
        job.sentAt = new Date();
        job.providerMessageId = result.providerMessageId || "";
        job.statusReason = result.responseSummary || "";
        if (result.inboxNotificationId) {
          job.inboxNotificationId = result.inboxNotificationId;
        }
      } else if (result.result === "skipped" || result.permanent) {
        job.status = "failed";
        job.statusReason = result.responseSummary || result.errorCode || "failed";
      } else if (job.attemptCount >= MAX_ATTEMPTS) {
        job.status = "failed";
        job.statusReason = result.responseSummary || "max_retries";
      } else {
        job.status = "retry";
        job.statusReason = result.responseSummary || "retrying";
        job.scheduledAt = new Date(Date.now() + backoffMs(job.attemptCount));
      }

      await job.save();
      processed += 1;
    } catch (err) {
      console.error("[smart-notifications] job dispatch error:", err.message);
      try {
        job.status = job.attemptCount >= MAX_ATTEMPTS ? "failed" : "retry";
        job.statusReason = err.message;
        if (job.status === "retry") {
          job.scheduledAt = new Date(Date.now() + backoffMs(job.attemptCount));
        }
        await job.save();
        await DeliveryAttempt.create({
          jobId: job._id,
          schoolId: job.schoolId,
          channel: job.channel,
          provider: job.channel,
          result: "failed",
          errorCode: "EXCEPTION",
          responseSummary: err.message,
        });
      } catch {
        /* ignore */
      }
    }
  }

  return { processed };
}

/** Process any pending events that were not processed inline. */
export async function processPendingEvents({ limit = 20 } = {}) {
  const NotificationEvent = (await import("../../models/smartNotifications/notificationEvent.js")).default;
  const { processNotificationEvent } = await import("./processNotificationEvent.js");

  const pending = await NotificationEvent.find({ status: "pending" })
    .sort({ createdAt: 1 })
    .limit(limit);
  let n = 0;
  for (const ev of pending) {
    await processNotificationEvent(ev._id);
    n += 1;
  }
  return { processed: n };
}
