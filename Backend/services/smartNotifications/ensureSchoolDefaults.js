import NotificationRule from "../../models/smartNotifications/notificationRule.js";
import MessageTemplate from "../../models/smartNotifications/messageTemplate.js";
import NotificationPreference from "../../models/smartNotifications/notificationPreference.js";
import { EVENT_CATALOG, EVENT_TYPES } from "./eventCatalog.js";

/**
 * Idempotently seed rules + templates + preferences for a school.
 */
export async function ensureSchoolDefaults(schoolId) {
  if (!schoolId) return;

  await NotificationPreference.findOneAndUpdate(
    { schoolId },
    {
      $setOnInsert: {
        schoolId,
        quietHoursStart: "21:00",
        quietHoursEnd: "07:00",
        timezone: "Asia/Kolkata",
        channels: {
          in_app: true,
          push: true,
          email: true,
          sms: false,
          whatsapp: false,
        },
      },
    },
    { upsert: true, new: true },
  );

  const existingRules = await NotificationRule.find({ schoolId })
    .select("eventType")
    .lean();
  const haveRules = new Set(existingRules.map((r) => r.eventType));

  const existingTemplates = await MessageTemplate.find({
    schoolId,
    language: "en",
    channel: "default",
  })
    .select("eventType")
    .lean();
  const haveTpl = new Set(existingTemplates.map((t) => t.eventType));

  const ruleDocs = [];
  const tplDocs = [];

  for (const eventType of EVENT_TYPES) {
    const def = EVENT_CATALOG[eventType];
    if (!haveRules.has(eventType)) {
      ruleDocs.push({
        schoolId,
        eventType,
        enabled: def.defaultEnabled !== false,
        recipientRoles: def.defaultRecipients || ["parent"],
        channels: def.defaultChannels || ["in_app", "push"],
        timing: def.timing || { mode: "immediate", offsetMinutes: 0 },
        respectQuietHours: def.respectQuietHours !== false,
        urgent: Boolean(def.urgent),
        version: 1,
      });
    }
    if (!haveTpl.has(eventType)) {
      tplDocs.push({
        schoolId,
        eventType,
        language: "en",
        channel: "default",
        subject: def.subject || "",
        body: def.body || "",
        version: 1,
        status: "active",
        isDefaultOverride: true,
      });
    }
  }

  if (ruleDocs.length) await NotificationRule.insertMany(ruleDocs, { ordered: false }).catch(() => {});
  if (tplDocs.length) await MessageTemplate.insertMany(tplDocs, { ordered: false }).catch(() => {});
}
