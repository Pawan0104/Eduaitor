import cron from "node-cron";
import Event from "../models/event.js";
import Notice from "../models/notice.js";
import Class from "../models/class.js";
import Notification from "../models/notification.js";
import { createNotificationHelper } from "../controllers/notificationController.js";

const TZ = process.env.EVENT_REMINDER_TZ || "Asia/Kolkata";
const MORNING_HOUR = Number(process.env.EVENT_REMINDER_MORNING_HOUR || 8); // today reminders
const EVENING_HOUR = Number(process.env.EVENT_REMINDER_EVENING_HOUR || 19); // tomorrow reminders

const ymdInTz = (date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const toDateInTz = (date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .reduce((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});

  return new Date(
    Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    ),
  );
};

const addDaysYmd = (ymd, days) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
};

const eventTargetsForParent = async (event) => {
  if (!event.assignClass || event.assignClass === "All Classes") {
    return [{ type: "role", roles: ["student_admin"] }];
  }

  const cls = await Class.findOne({
    schoolId: event.schoolId,
    name: event.assignClass,
  })
    .select("_id")
    .lean();

  if (!cls?._id) return [{ type: "role", roles: ["student_admin"] }];

  return [
    {
      type: "class",
      classId: cls._id,
    },
  ];
};

const buildEventSummary = (events, notices) => {
  const lines = [];
  if (events.length) {
    lines.push(
      ...events.map((e) => `• ${e.title} (${e.time || "Time TBD"}, ${e.location || "Venue TBD"})`),
    );
  }
  if (notices.length) {
    lines.push(...notices.map((n) => `• ${n.title}`));
  }
  return lines.slice(0, 6).join("\n");
};

const sendReminderForScope = async ({ scope, dayOffset }) => {
  const now = new Date();
  const nowTz = toDateInTz(now);
  const targetYmd = addDaysYmd(ymdInTz(now), dayOffset);

  const eventDocs = await Event.find({}).select(
    "_id schoolId title startDate endDate time location assignClass",
  );
  const events = eventDocs.filter((e) => ymdInTz(e.startDate) === targetYmd);

  const eventNotices = await Notice.find({
    category: "Event",
    isActive: true,
  }).select("_id schoolId title publishDate expiryDate");
  const notices = eventNotices.filter((n) => ymdInTz(n.publishDate) === targetYmd);

  const schoolIds = new Set([
    ...events.map((e) => String(e.schoolId)),
    ...notices.map((n) => String(n.schoolId)),
  ]);

  for (const schoolId of schoolIds) {
    const schoolEvents = events.filter((e) => String(e.schoolId) === schoolId);
    const schoolNotices = notices.filter((n) => String(n.schoolId) === schoolId);
    if (!schoolEvents.length && !schoolNotices.length) continue;

    const key = `event-reminder:${scope}:${targetYmd}:school:${schoolId}`;
    const exists = await Notification.exists({ systemKey: key });
    if (exists) continue;

    const total = schoolEvents.length + schoolNotices.length;
    const whenLabel = dayOffset === 0 ? "today" : "tomorrow";
    const title =
      dayOffset === 0
        ? `Today's School Events (${total})`
        : `Tomorrow's School Events (${total})`;
    const body = `Reminder for ${whenLabel}: please check upcoming school event updates.\n${buildEventSummary(schoolEvents, schoolNotices)}`;

    if (schoolEvents.length) {
      const grouped = new Map();
      for (const ev of schoolEvents) {
        const targetSig = ev.assignClass || "All Classes";
        if (!grouped.has(targetSig)) grouped.set(targetSig, []);
        grouped.get(targetSig).push(ev);
      }

      for (const [sig, groupedEvents] of grouped.entries()) {
        const targets = await eventTargetsForParent(groupedEvents[0]);
        await createNotificationHelper({
          title,
          message: body,
          notificationType: "general",
          schoolId,
          targets,
          startingDate: groupedEvents[0].startDate,
          endingDate: groupedEvents[0].endDate || groupedEvents[0].startDate,
          systemKey: `${key}:class:${sig}`,
        });
      }
    }

    if (schoolNotices.length) {
      await createNotificationHelper({
        title,
        message: body,
        notificationType: "general",
        schoolId,
        targets: [{ type: "role", roles: ["student_admin"] }],
        startingDate: nowTz,
        endingDate: nowTz,
        systemKey: `${key}:notice`,
      });
    }
  }
};

export const startEventReminderCron = () => {
  cron.schedule(
    `0 ${MORNING_HOUR} * * *`,
    async () => {
      try {
        await sendReminderForScope({ scope: "morning", dayOffset: 0 });
        console.log("[cron] Sent morning event reminders");
      } catch (err) {
        console.error("[cron] morning event reminder error:", err);
      }
    },
    { timezone: TZ },
  );

  cron.schedule(
    `0 ${EVENING_HOUR} * * *`,
    async () => {
      try {
        await sendReminderForScope({ scope: "evening", dayOffset: 1 });
        console.log("[cron] Sent evening event reminders");
      } catch (err) {
        console.error("[cron] evening event reminder error:", err);
      }
    },
    { timezone: TZ },
  );

  console.log(
    `[cron] Event reminder scheduler started (${TZ}) morning=${MORNING_HOUR}:00 evening=${EVENING_HOUR}:00`,
  );
};

