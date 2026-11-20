import NotificationEvent from "../../models/smartNotifications/notificationEvent.js";
import { getEventDefinition } from "./eventCatalog.js";
import { processNotificationEvent } from "./processNotificationEvent.js";

/**
 * Public API for modules. Never throws to the caller — notification failures
 * must not break the parent school activity.
 *
 * @returns {{ ok: boolean, eventId?: string, duplicate?: boolean, error?: string }}
 */
export async function emitNotificationEvent({
  schoolId,
  eventType,
  entityType = "",
  entityId = null,
  payload = {},
  idempotencyKey,
  source = "system",
  occurredAt = new Date(),
  processInline = true,
} = {}) {
  try {
    if (!schoolId || !eventType || !idempotencyKey) {
      console.warn("[smart-notifications] emit skipped: missing schoolId/eventType/idempotencyKey");
      return { ok: false, error: "missing_required_fields" };
    }

    if (!getEventDefinition(eventType)) {
      console.warn(`[smart-notifications] unknown eventType: ${eventType}`);
      return { ok: false, error: "unknown_event_type" };
    }

    let event;
    try {
      event = await NotificationEvent.create({
        schoolId,
        eventType,
        entityType,
        entityId,
        payload,
        idempotencyKey,
        source,
        occurredAt,
        status: "pending",
      });
    } catch (err) {
      // Duplicate idempotency key
      if (err?.code === 11000) {
        const existing = await NotificationEvent.findOne({
          schoolId,
          idempotencyKey,
        }).lean();
        return {
          ok: true,
          duplicate: true,
          eventId: existing?._id ? String(existing._id) : undefined,
        };
      }
      throw err;
    }

    if (processInline) {
      await processNotificationEvent(event._id);
      // Flush due jobs immediately so inbox/push don't wait for cron
      try {
        const { processQueuedJobs } = await import("./dispatchWorker.js");
        await processQueuedJobs({ limit: 200 });
      } catch (flushErr) {
        console.error("[smart-notifications] job flush failed:", flushErr.message);
      }
    }

    return { ok: true, eventId: String(event._id) };
  } catch (err) {
    console.error("[smart-notifications] emit failed:", err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Bridge for legacy createNotificationHelper callers during migration.
 * Maps title/message/targets into COMMUNICATION.MANUAL_BROADCAST or a given eventType.
 */
export async function emitFromLegacyHelper({
  title,
  message,
  schoolId,
  targets = [],
  eventType = "COMMUNICATION.MANUAL_BROADCAST",
  notificationType = "general",
  createdBy = null,
  systemKey = null,
  entityType = "",
  entityId = null,
  payloadExtras = {},
}) {
  const idempotencyKey =
    systemKey ||
    `legacy:${eventType}:${schoolId}:${Buffer.from(`${title}|${message}|${JSON.stringify(targets)}`)
      .toString("base64")
      .slice(0, 80)}:${Date.now()}`;

  return emitNotificationEvent({
    schoolId,
    eventType,
    entityType: entityType || notificationType,
    entityId,
    idempotencyKey,
    source: createdBy ? `user:${createdBy}` : "legacy_helper",
    payload: {
      title,
      message,
      _preRendered: true,
      recipientRoles: ["custom"],
      inboxTargets: targets,
      audience: [
        {
          userId: `legacy-audience:${idempotencyKey}`,
          role: "custom",
          name: "Audience",
          legacyTargets: targets,
          inboxTarget: null,
        },
      ],
      ...payloadExtras,
    },
  });
}
