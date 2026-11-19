// cron/notificationCron.js
import cron from "node-cron";
import Notification from "../models/notification.js";
import {
  processQueuedJobs,
  processPendingEvents,
} from "../services/smartNotifications/dispatchWorker.js";

// runs every minute
export const startNotificationCron = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      // Legacy scheduled inbox notifications
      const due = await Notification.find({
        status: "scheduled",
        scheduledAt: { $lte: now },
      });

      if (due.length > 0) {
        const ids = due.map((n) => n._id);
        await Notification.updateMany(
          { _id: { $in: ids } },
          { $set: { status: "sent" } },
        );
        console.log(`[cron] Published ${due.length} scheduled notification(s)`);
      }

      // Smart Notifications pipeline
      const pending = await processPendingEvents({ limit: 30 });
      const jobs = await processQueuedJobs({ limit: 80 });
      if (pending.processed || jobs.processed) {
        console.log(
          `[cron] Smart notifications: events=${pending.processed} jobs=${jobs.processed}`,
        );
      }
    } catch (err) {
      console.error("[cron] notification error:", err);
    }
  });

  console.log("[cron] Notification scheduler started (inbox + smart jobs)");
};
