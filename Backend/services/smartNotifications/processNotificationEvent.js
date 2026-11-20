import NotificationEvent from "../../models/smartNotifications/notificationEvent.js";
import NotificationRule from "../../models/smartNotifications/notificationRule.js";
import MessageTemplate from "../../models/smartNotifications/messageTemplate.js";
import NotificationJob from "../../models/smartNotifications/notificationJob.js";
import NotificationPreference from "../../models/smartNotifications/notificationPreference.js";
import { getEventDefinition } from "./eventCatalog.js";
import { ensureSchoolDefaults } from "./ensureSchoolDefaults.js";
import { resolveRecipients } from "./recipientResolver.js";
import { renderTemplate } from "./templateRenderer.js";
import { isInQuietHours, nextQuietHoursEnd } from "./quietHours.js";

function computeSchedule({ rule, prefs, now = new Date() }) {
  let scheduledAt = new Date(now);

  if (rule.timing?.mode === "offset" && rule.timing.offsetMinutes) {
    scheduledAt = new Date(now.getTime() + Number(rule.timing.offsetMinutes) * 60_000);
  }

  const respect = rule.respectQuietHours !== false && !rule.urgent;
  if (respect && isInQuietHours(scheduledAt, prefs.quietHoursStart, prefs.quietHoursEnd)) {
    scheduledAt = nextQuietHoursEnd(
      scheduledAt,
      prefs.quietHoursStart,
      prefs.quietHoursEnd,
    );
  }
  return scheduledAt;
}

/**
 * Load rule, resolve recipients, render templates, enqueue jobs.
 */
export async function processNotificationEvent(eventId) {
  const event = await NotificationEvent.findById(eventId);
  if (!event) return { ok: false, reason: "event_not_found" };
  if (event.status === "processed" || event.status === "suppressed") {
    return { ok: true, skipped: true, status: event.status };
  }

  try {
    await ensureSchoolDefaults(event.schoolId);

    const def = getEventDefinition(event.eventType);
    if (!def) {
      event.status = "failed";
      event.statusReason = `Unknown event type: ${event.eventType}`;
      event.processedAt = new Date();
      await event.save();
      return { ok: false, reason: event.statusReason };
    }

    let rule = await NotificationRule.findOne({
      schoolId: event.schoolId,
      eventType: event.eventType,
    });

    if (!rule) {
      rule = await NotificationRule.create({
        schoolId: event.schoolId,
        eventType: event.eventType,
        enabled: true,
        recipientRoles: def.defaultRecipients,
        channels: def.defaultChannels,
        urgent: def.urgent,
        respectQuietHours: def.respectQuietHours,
        timing: def.timing,
      });
    }

    if (!rule.enabled) {
      event.status = "suppressed";
      event.statusReason = "Rule disabled";
      event.processedAt = new Date();
      await event.save();
      return { ok: true, suppressed: true };
    }

    const prefs =
      (await NotificationPreference.findOne({ schoolId: event.schoolId }).lean()) || {
        quietHoursStart: "21:00",
        quietHoursEnd: "07:00",
        channels: { in_app: true, push: true, email: true, sms: false, whatsapp: false },
      };

    const eventPayload = event.payload || {};
    const enabledChannels = (rule.channels || []).filter((ch) => {
      if (eventPayload._skipInApp && ch === "in_app") return false;
      if (prefs.channels && prefs.channels[ch] === false) return false;
      return true;
    });

    if (!enabledChannels.length) {
      event.status = "suppressed";
      event.statusReason = "No channels enabled";
      event.processedAt = new Date();
      await event.save();
      return { ok: true, suppressed: true };
    }

    // Allow payload to override rendered title/body (manual broadcast / legacy)
    const templateDoc =
      (await MessageTemplate.findOne({
        schoolId: event.schoolId,
        eventType: event.eventType,
        language: "en",
        channel: "default",
        status: "active",
      }).lean()) || {
        subject: def.subject,
        body: def.body,
        version: 1,
      };

    const payload = {
      ...(event.payload || {}),
    };

    // If caller provided final title/message, treat as already rendered
    const preRendered = Boolean(payload.title && payload.message && payload._preRendered);

    let subject = "";
    let body = "";
    let templateVersion = templateDoc.version || 1;

    if (preRendered) {
      subject = String(payload.title);
      body = String(payload.message);
    } else {
      const rendered = renderTemplate(
        {
          subject: payload.title || templateDoc.subject || def.subject,
          body: payload.message || templateDoc.body || def.body,
        },
        payload,
        def.placeholders,
      );
      if (!rendered.ok) {
        event.status = "failed";
        event.statusReason = rendered.reason;
        event.processedAt = new Date();
        await event.save();
        return { ok: false, reason: rendered.reason };
      }
      subject = rendered.subject;
      body = rendered.body;
    }

    const recipientRoles =
      Array.isArray(payload.recipientRoles) && payload.recipientRoles.length
        ? payload.recipientRoles
        : rule.recipientRoles || def.defaultRecipients;

    const recipients = await resolveRecipients({
      schoolId: event.schoolId,
      recipientRoles,
      payload,
    });

    if (!recipients.length) {
      event.status = "processed";
      event.statusReason = "No recipients resolved";
      event.processedAt = new Date();
      await event.save();
      return { ok: true, jobs: 0 };
    }

    const scheduledAt = computeSchedule({ rule, prefs });
    const jobs = [];

    // For legacy multi-target broadcasts, create one in_app job with legacyTargets
    // plus per-recipient jobs for other channels when individual contacts exist.
    for (const recipient of recipients) {
      for (const channel of enabledChannels) {
        // Skip channels that need contact info we don't have
        if (channel === "email" && !recipient.email && !recipient.legacyTargets) continue;
        if ((channel === "sms" || channel === "whatsapp") && !recipient.mobile && !recipient.legacyTargets) {
          continue;
        }

        jobs.push({
          schoolId: event.schoolId,
          eventId: event._id,
          eventType: event.eventType,
          recipient: {
            userId: recipient.userId,
            role: recipient.role,
            name: recipient.name,
            email: recipient.email,
            mobile: recipient.mobile,
            studentId: recipient.studentId || null,
            teacherId: recipient.teacherId || null,
            staffId: recipient.staffId || null,
            legacyTargets: recipient.legacyTargets || undefined,
            inboxTarget: recipient.inboxTarget || undefined,
          },
          channel,
          subject,
          body,
          templateVersion,
          status: "queued",
          scheduledAt,
        });
      }
    }

    if (jobs.length) {
      await NotificationJob.insertMany(jobs, { ordered: false });
    }

    event.status = "processed";
    event.statusReason = `Created ${jobs.length} job(s)`;
    event.processedAt = new Date();
    await event.save();

    return { ok: true, jobs: jobs.length };
  } catch (err) {
    console.error("[smart-notifications] process failed:", err);
    try {
      event.status = "failed";
      event.statusReason = err.message;
      event.processedAt = new Date();
      await event.save();
    } catch {
      /* ignore */
    }
    return { ok: false, reason: err.message };
  }
}
