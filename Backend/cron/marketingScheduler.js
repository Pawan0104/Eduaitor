import cron from "node-cron";
import MarketingPost from "../models/marketingPost.js";
import { publishPost } from "../services/marketing/publishService.js";
import { runDailyAutopilot } from "../services/marketing/dailyPlanner.js";

/**
 * Marketing scheduler (Phase 1): every minute, publish SCHEDULED posts whose
 * scheduledAt has passed. Publish failures stay FAILED for manual retry via
 * the admin UI. Phase 2 replaces this with BullMQ delayed jobs.
 */
export const startMarketingScheduler = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const due = await MarketingPost.find({
        status: "SCHEDULED",
        "schedule.scheduledAt": { $lte: new Date() },
      }).lean();
      for (const post of due) {
        publishPost({ postId: post._id, actor: "scheduler" }).catch((err) =>
          console.error(`marketing scheduler: ${post.channel} ${post._id} →`, err.message),
        );
      }
    } catch (err) {
      console.error("marketing scheduler error:", err.message);
    }
  });
};

const EDUAITOR_TENANT_ID =
  process.env.SUPER_ADMIN_TENANT_ID || "1b7ead000000000000000001";

/**
 * Super admin autopilot: every night at 2:00 AM (Asia/Kolkata) generate the
 * next day's drafts for Eduaitor's own linked social accounts, based on the
 * Eduaitor website. The super admin approves each post day-by-day.
 */
export const startDailyAutopilotCron = () => {
  cron.schedule(
    "0 2 * * *",
    async () => {
      try {
        await runDailyAutopilot({
          schoolId: EDUAITOR_TENANT_ID,
          actor: "daily-autopilot",
        });
      } catch (err) {
        console.error("[daily-autopilot] error:", err.message);
      }
    },
    { timezone: "Asia/Kolkata" },
  );
};