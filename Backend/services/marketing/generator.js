import School from "../../models/school.js";
import Event from "../../models/event.js";
import Notice from "../../models/notice.js";
import Lead from "../../models/lead.js";
import Exam from "../../models/exam.js";
import MarketingPost from "../../models/marketingPost.js";
import MarketingTemplate from "../../models/marketingTemplate.js";
import { generateTextSuggestion } from "./aiGateway.js";
import { buildPrompt, entityToVars } from "./prompts.js";
import { DEFAULT_TEMPLATES, MARKETING_CHANNELS } from "./templates.js";

const entityFetch = {
  event: (id) => Event.findById(id).lean(),
  notice: (id) => Notice.findById(id).lean(),
  lead: (id) => Lead.findById(id).lean(),
  exam: (id) => Exam.findById(id).lean(),
};

export const loadEntity = async (entityType, entityId) => {
  const fn = entityFetch[entityType];
  if (!fn || !entityId) return null;
  try {
    return await fn(entityId);
  } catch {
    return null;
  }
};

const currentVersion = (post) => post.versions?.[post.currentVersion] || {};

/** Pick school override first, otherwise the seed default. */
export const resolveTemplate = async ({ schoolId, trigger, channel }) => {
  const custom = await MarketingTemplate.findOne({
    schoolId,
    trigger,
    channel,
  }).lean();
  if (custom) return custom;
  return (
    DEFAULT_TEMPLATES.find(
      (t) => t.trigger === trigger && t.channel === channel,
    ) || null
  );
};

export const makeDedupeKey = ({ schoolId, trigger, entityId, channel }) =>
  [String(schoolId), trigger, String(entityId || "manual"), channel]
    .filter(Boolean)
    .join("|");

/**
 * Generate ONE AI draft (status=DRAFT) for a school, trigger and channel.
 * Returns the created MarketingPost. Shared by the Suggestions UI (manual
 * generate per channel) and the auto-trigger pipeline.
 */
export const generateSuggestion = async ({
  schoolId,
  trigger = "manual",
  entityType = "",
  entityId = "",
  channel,
  title = "",
  actor,
  actorId,
}) => {
  if (!schoolId) throw new Error("schoolId is required.");
  if (!MARKETING_CHANNELS.includes(channel)) throw new Error("Invalid channel.");

  const [school, entity] = await Promise.all([
    School.findById(schoolId)
      .select("school_name name school_logo admin_email")
      .lean(),
    entityType && entityId ? loadEntity(entityType, entityId) : null,
  ]);

  const template = await resolveTemplate({ schoolId, trigger, channel });

  const prompt = buildPrompt({
    trigger,
    channel,
    entity,
    school,
    template,
  });
  const ai = await generateTextSuggestion({ prompt });
  const vars = entityToVars(entity, school);

  if (!ai.text) {
    throw new Error("AI returned an empty post.");
  }

  const resolvedTitle =
    title ||
    (channel === "blog" && entity?.title
      ? `Blog: ${entity.title}`
      : channel === "blog"
        ? "Blog draft"
        : "");

  const firstVersion = {
    text: ai.text,
    hashtags: ai.hashtags || [],
    cta: ai.cta || "",
    ...(vars["event.title"] && channel === "blog"
      ? { media: [] }
      : { media: [] }),
  };

  const post = await MarketingPost.create({
    schoolId,
    channel,
    title: resolvedTitle,
    status: "DRAFT",
    source: {
      trigger,
      entityType,
      entityId: String(entityId || ""),
      entitySummary:
        entity?.title || entity?.name || vars["event.title"] || "",
    },
    versions: [firstVersion],
    currentVersion: 0,
    dedupeKey: makeDedupeKey({
      schoolId,
      trigger,
      entityId,
      channel,
    }),
  }).catch(async (err) => {
    // Re-generating the same source right after a previous attempt hits the
    // unique dedupeKey; return the existing draft instead of failing.
    if (err?.code === 11000) {
      const existing = await MarketingPost.findOne({
        schoolId,
        channel,
        "source.trigger": trigger,
        "source.entityId": String(entityId || ""),
        status: { $in: ["DRAFT", "PENDING", "REJECTED"] },
      }).sort({ createdAt: -1 });
      if (existing) return existing;
    }
    throw err;
  });

  return post.toObject();
};

/**
 * Generate drafts for every channel from one ERP entity.
 * Returns the array of created posts.
 */
export const generateForEntity = async ({
  schoolId,
  entityType,
  entityId,
  trigger,
  actor,
  channels = MARKETING_CHANNELS,
}) => {
  const entity = await loadEntity(entityType, entityId);
  if (!entity) throw new Error("Entity not found.");
  const created = [];
  for (const channel of channels) {
    try {
      const post = await generateSuggestion({
        schoolId,
        trigger,
        entityType,
        entityId,
        channel,
        actor,
      });
      created.push(post);
    } catch (err) {
      // One channel failing shouldn't block the rest.
      created.push({ channel, error: err.message });
    }
  }
  return created;
};

export { currentVersion };