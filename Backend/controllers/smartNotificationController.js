import NotificationRule from "../models/smartNotifications/notificationRule.js";
import MessageTemplate from "../models/smartNotifications/messageTemplate.js";
import NotificationJob from "../models/smartNotifications/notificationJob.js";
import NotificationEvent from "../models/smartNotifications/notificationEvent.js";
import NotificationPreference from "../models/smartNotifications/notificationPreference.js";
import DeliveryAttempt from "../models/smartNotifications/deliveryAttempt.js";
import {
  EVENT_CATALOG,
  EVENT_TYPES,
  listEventsByCategory,
  getEventDefinition,
  ensureSchoolDefaults,
  emitNotificationEvent,
  getChannelStatus,
  renderTemplate,
} from "../services/smartNotifications/index.js";

function schoolIdOf(req) {
  return req.user?.school_id || req.user?.schoolId || null;
}

export const getOverview = async (req, res) => {
  try {
    const schoolId = schoolIdOf(req);
    await ensureSchoolDefaults(schoolId);

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const [sentToday, failed, pending, byEvent] = await Promise.all([
      NotificationJob.countDocuments({
        schoolId,
        status: { $in: ["sent", "delivered"] },
        sentAt: { $gte: start },
      }),
      NotificationJob.countDocuments({ schoolId, status: "failed" }),
      NotificationJob.countDocuments({
        schoolId,
        status: { $in: ["queued", "retry", "processing"] },
      }),
      NotificationJob.aggregate([
        { $match: { schoolId, createdAt: { $gte: start } } },
        { $group: { _id: "$eventType", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 12 },
      ]),
    ]);

    const categoryActivity = {};
    for (const row of byEvent) {
      const def = getEventDefinition(row._id);
      const cat = def?.category || "other";
      categoryActivity[cat] = (categoryActivity[cat] || 0) + row.count;
    }

    res.json({
      success: true,
      overview: {
        sentToday,
        failed,
        pending,
        categoryActivity,
        topEvents: byEvent.map((r) => ({
          eventType: r._id,
          name: getEventDefinition(r._id)?.name || r._id,
          count: r.count,
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getEvents = async (req, res) => {
  try {
    const schoolId = schoolIdOf(req);
    await ensureSchoolDefaults(schoolId);
    const rules = await NotificationRule.find({ schoolId }).lean();
    const byType = Object.fromEntries(rules.map((r) => [r.eventType, r]));

    const grouped = listEventsByCategory().map((cat) => ({
      ...cat,
      events: cat.events.map((ev) => {
        const rule = byType[ev.eventType];
        return {
          ...ev,
          enabled: rule ? rule.enabled : true,
          recipientRoles: rule?.recipientRoles || ev.defaultRecipients,
          channels: rule?.channels || ev.defaultChannels,
          timing: rule?.timing || ev.timing,
          respectQuietHours: rule?.respectQuietHours ?? ev.respectQuietHours,
          urgent: rule?.urgent ?? ev.urgent,
          version: rule?.version || 1,
        };
      }),
    }));

    res.json({ success: true, categories: grouped, eventTypes: EVENT_TYPES });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const patchEvent = async (req, res) => {
  try {
    const schoolId = schoolIdOf(req);
    const { eventType } = req.params;
    if (!EVENT_CATALOG[eventType]) {
      return res.status(404).json({ success: false, message: "Unknown event type" });
    }
    await ensureSchoolDefaults(schoolId);

    const allowed = [
      "enabled",
      "recipientRoles",
      "channels",
      "timing",
      "respectQuietHours",
      "urgent",
    ];
    const $set = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) $set[key] = req.body[key];
    }
    $set.updatedBy = req.user?._id || req.user?.id || null;

    const rule = await NotificationRule.findOneAndUpdate(
      { schoolId, eventType },
      { $set, $inc: { version: 1 } },
      { new: true, upsert: true },
    );

    res.json({ success: true, rule });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getTemplate = async (req, res) => {
  try {
    const schoolId = schoolIdOf(req);
    const { eventType } = req.params;
    const def = getEventDefinition(eventType);
    if (!def) return res.status(404).json({ success: false, message: "Unknown event" });

    await ensureSchoolDefaults(schoolId);
    const tpl =
      (await MessageTemplate.findOne({
        schoolId,
        eventType,
        language: "en",
        channel: "default",
      }).lean()) || null;

    res.json({
      success: true,
      template: tpl || {
        eventType,
        language: "en",
        channel: "default",
        subject: def.subject,
        body: def.body,
        version: 1,
      },
      placeholders: def.placeholders,
      catalogDefault: { subject: def.subject, body: def.body },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const putTemplate = async (req, res) => {
  try {
    const schoolId = schoolIdOf(req);
    const { eventType } = req.params;
    if (!EVENT_CATALOG[eventType]) {
      return res.status(404).json({ success: false, message: "Unknown event" });
    }
    const { subject = "", body = "", deepLink = "" } = req.body;
    if (!body?.trim()) {
      return res.status(400).json({ success: false, message: "Body is required" });
    }

    const tpl = await MessageTemplate.findOneAndUpdate(
      { schoolId, eventType, language: "en", channel: "default" },
      {
        $set: {
          subject,
          body,
          deepLink,
          status: "active",
          updatedBy: req.user?._id || req.user?.id || null,
        },
        $inc: { version: 1 },
        $setOnInsert: { schoolId, eventType, language: "en", channel: "default" },
      },
      { new: true, upsert: true },
    );

    res.json({ success: true, template: tpl });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const testTemplate = async (req, res) => {
  try {
    const schoolId = schoolIdOf(req);
    const { eventType } = req.params;
    const def = getEventDefinition(eventType);
    if (!def) return res.status(404).json({ success: false, message: "Unknown event" });

    const sample = {
      studentName: "Aarav Sharma",
      className: "5-A",
      date: new Date().toLocaleDateString("en-IN"),
      time: "09:15",
      title: "Sample title",
      message: "Sample message body",
      schoolName: "Demo School",
      routeName: "Route 12",
      stopName: "Green Park",
      vehicleNumber: "DL-01-AB-1234",
      delayMinutes: "15",
      eta: "09:40",
      subjectName: "Mathematics",
      homeworkTitle: "Chapter 4 exercises",
      dueDate: new Date().toLocaleDateString("en-IN"),
      examName: "Mid Term",
      amount: "₹2,500",
      dueAmount: "₹2,500",
      feeType: "Tuition",
      receiptNo: "RCPT-1001",
      leaveType: "Sick",
      fromDate: new Date().toLocaleDateString("en-IN"),
      toDate: new Date().toLocaleDateString("en-IN"),
      status: "approved",
      meetingTitle: "PTM",
      meetingTime: "10:00 AM",
      senderName: "Class Teacher",
      markedBy: "Class Teacher",
      reason: "Fever",
      ...(req.body?.payload || {}),
    };

    const tpl =
      (await MessageTemplate.findOne({
        schoolId,
        eventType,
        language: "en",
        channel: "default",
      }).lean()) || { subject: def.subject, body: def.body };

    const preview = renderTemplate(tpl, sample, def.placeholders);

    if (req.body?.send) {
      const result = await emitNotificationEvent({
        schoolId,
        eventType: "COMMUNICATION.MANUAL_BROADCAST",
        entityType: "test",
        entityId: eventType,
        idempotencyKey: `test:${schoolId}:${eventType}:${Date.now()}`,
        source: `admin-test:${req.user?._id || req.user?.id}`,
        payload: {
          title: preview.subject || def.name,
          message: preview.body || def.body,
          _preRendered: true,
          recipientRoles: ["school_admin"],
        },
      });
      return res.json({ success: true, preview, sent: result });
    }

    res.json({ success: true, preview, sample });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getHistory = async (req, res) => {
  try {
    const schoolId = schoolIdOf(req);
    const {
      eventType,
      channel,
      status,
      studentId,
      q,
      page = 1,
      limit = 30,
      from,
      to,
    } = req.query;

    const filter = { schoolId };
    if (eventType) filter.eventType = eventType;
    if (channel) filter.channel = channel;
    if (status) filter.status = status;
    if (studentId) filter["recipient.studentId"] = studentId;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    if (q) {
      filter.$or = [
        { subject: new RegExp(q, "i") },
        { body: new RegExp(q, "i") },
        { "recipient.name": new RegExp(q, "i") },
        { "recipient.email": new RegExp(q, "i") },
        { "recipient.mobile": new RegExp(q, "i") },
      ];
    }

    const skip = (Math.max(1, Number(page)) - 1) * Math.min(100, Number(limit) || 30);
    const take = Math.min(100, Number(limit) || 30);

    const [items, total] = await Promise.all([
      NotificationJob.find(filter).sort({ createdAt: -1 }).skip(skip).limit(take).lean(),
      NotificationJob.countDocuments(filter),
    ]);

    res.json({
      success: true,
      items: items.map((j) => ({
        ...j,
        eventName: getEventDefinition(j.eventType)?.name || j.eventType,
      })),
      total,
      page: Number(page) || 1,
      limit: take,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getHistoryDetail = async (req, res) => {
  try {
    const schoolId = schoolIdOf(req);
    const job = await NotificationJob.findOne({
      _id: req.params.jobId,
      schoolId,
    }).lean();
    if (!job) return res.status(404).json({ success: false, message: "Not found" });

    const [attempts, event] = await Promise.all([
      DeliveryAttempt.find({ jobId: job._id }).sort({ attemptedAt: -1 }).lean(),
      NotificationEvent.findById(job.eventId).lean(),
    ]);

    res.json({
      success: true,
      job: {
        ...job,
        eventName: getEventDefinition(job.eventType)?.name || job.eventType,
      },
      attempts,
      event,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getChannels = async (req, res) => {
  try {
    const schoolId = schoolIdOf(req);
    await ensureSchoolDefaults(schoolId);
    const prefs = await NotificationPreference.findOne({ schoolId }).lean();
    res.json({
      success: true,
      providers: getChannelStatus(),
      schoolChannels: prefs?.channels || {
        in_app: true,
        push: true,
        email: true,
        sms: false,
        whatsapp: false,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const patchChannels = async (req, res) => {
  try {
    const schoolId = schoolIdOf(req);
    const channels = req.body?.channels || {};
    const prefs = await NotificationPreference.findOneAndUpdate(
      { schoolId },
      {
        $set: {
          ...(channels.in_app !== undefined ? { "channels.in_app": channels.in_app } : {}),
          ...(channels.push !== undefined ? { "channels.push": channels.push } : {}),
          ...(channels.email !== undefined ? { "channels.email": channels.email } : {}),
          ...(channels.sms !== undefined ? { "channels.sms": channels.sms } : {}),
          ...(channels.whatsapp !== undefined ? { "channels.whatsapp": channels.whatsapp } : {}),
          updatedBy: req.user?._id || req.user?.id || null,
        },
        $setOnInsert: {
          schoolId,
          quietHoursStart: "21:00",
          quietHoursEnd: "07:00",
          timezone: "Asia/Kolkata",
        },
      },
      { new: true, upsert: true },
    );
    res.json({ success: true, preferences: prefs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getPreferences = async (req, res) => {
  try {
    const schoolId = schoolIdOf(req);
    await ensureSchoolDefaults(schoolId);
    const prefs = await NotificationPreference.findOne({ schoolId }).lean();
    res.json({ success: true, preferences: prefs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const patchPreferences = async (req, res) => {
  try {
    const schoolId = schoolIdOf(req);
    const { quietHoursStart, quietHoursEnd, timezone, channels } = req.body || {};
    const $set = { updatedBy: req.user?._id || req.user?.id || null };
    if (quietHoursStart) $set.quietHoursStart = quietHoursStart;
    if (quietHoursEnd) $set.quietHoursEnd = quietHoursEnd;
    if (timezone) $set.timezone = timezone;
    if (channels) {
      Object.entries(channels).forEach(([k, v]) => {
        $set[`channels.${k}`] = v;
      });
    }
    const prefs = await NotificationPreference.findOneAndUpdate(
      { schoolId },
      { $set, $setOnInsert: { schoolId } },
      { new: true, upsert: true },
    );
    res.json({ success: true, preferences: prefs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Manual broadcast through the Smart Notifications engine */
export const sendBroadcast = async (req, res) => {
  try {
    const schoolId = schoolIdOf(req);
    const {
      title,
      message,
      targets,
      target,
      notificationType = "general",
      urgent = false,
    } = req.body;

    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({ success: false, message: "Title and message are required" });
    }

    let resolvedTargets = [];
    const raw = targets || target;
    if (raw) {
      resolvedTargets = Array.isArray(raw) ? raw : [typeof raw === "string" ? JSON.parse(raw) : raw];
    } else {
      resolvedTargets = [{ type: "all" }];
    }
    resolvedTargets = resolvedTargets.map((t) => ({ ...t, schoolId }));

    const eventType = urgent
      ? "COMMUNICATION.URGENT_ANNOUNCEMENT"
      : "COMMUNICATION.MANUAL_BROADCAST";

    const result = await emitNotificationEvent({
      schoolId,
      eventType,
      entityType: "broadcast",
      idempotencyKey: `broadcast:${schoolId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      source: `user:${req.user?._id || req.user?.id}`,
      payload: {
        title: title.trim(),
        message: message.trim(),
        _preRendered: true,
        recipientRoles: ["custom"],
        audience: [
          {
            userId: `broadcast:${Date.now()}`,
            role: "custom",
            name: "Broadcast audience",
            legacyTargets: resolvedTargets,
          },
        ],
        notificationType,
      },
    });

    res.status(201).json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
