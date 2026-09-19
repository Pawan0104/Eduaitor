/**
 * Marketing AI Autopilot (super admin / Eduaitor tenant).
 * Every day: for each linked social account, generate ONE fresh post inspired
 * by the Eduaitor website — caption + hashtags + a designed image — as a DRAFT
 * for the super admin to approve day-by-day. Approving publishes immediately.
 */
import MarketingPost from "../../models/marketingPost.js";
import MarketingSocialAccount from "../../models/marketingSocialAccount.js";
import { generateTextSuggestion, generateImage } from "./aiGateway.js";
import { fetchWebsiteSnippet } from "./websiteContent.js";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary.js";
import { MARKETING_CHANNELS } from "./templates.js";

/** Rotating content angles so consecutive days stay varied. */
const TOPIC_ANGLES = [
  "why schools are adopting AI for daily operations and marketing",
  "highlight Eduaitor's strengths: automation that saves school staff hours",
  "admissions season — how schools can attract more parents",
  "keeping parents informed: the power of instant school announcements",
  "education technology trends schools should watch this year",
  "behind the scenes: how a school runs smoother with one dashboard",
  "student success stories and celebrating school milestones",
  "making school marketing easy with ready-made social posts",
];

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const dateKeyIST = (d) => {
  const base = new Date(d || new Date());
  const ist = new Date(base.getTime() + IST_OFFSET_MS);
  return ist.toISOString().slice(0, 10);
};

const nextDayKey = () => dateKeyIST(new Date(Date.now() + 24 * 60 * 60 * 1000));

const dayIndex = (key) =>
  Math.floor(new Date(`${key}T00:00:00Z`).getTime() / 86_400_000);

const CHANNEL_RULES = {
  facebook:
    "Facebook: warm, friendly, engaging tone; a crisp first line to stop the scroll; include 2-4 relevant hashtags.",
  instagram:
    "Instagram: short punchy hook, strong visual cue, no links, 1-3 hashtags; the image must be the star.",
  linkedin:
    "LinkedIn: professional, value-driven, credible tone; 1-3 hashtags.",
  whatsapp:
    "WhatsApp: plain friendly message, mobile-friendly, no hashtags, minimal emoji.",
  blog: "Blog: 250-350 words with a title line starting 'Title: '. No hashtags.",
};

const buildPrompt = ({ website, channel, topic, date }) => {
  const rule = CHANNEL_RULES[channel] || "";
  return [
    `You are Eduaitor's social media manager.`,
    `We publish ONE ${channel.toUpperCase()} post dated ${date}.`,
    `Topic for today: ${topic}.`,
    ``,
    `Study this website content to capture the brand voice and what the product does — then write a FRESH post on the topic above that fits that voice. Do NOT copy text from the website verbatim.`,
    `Website title: ${website.title}`,
    `Website description: ${website.description}`,
    `Website content sample:`,
    `"""${website.content}"""`,
    website.pages?.length
      ? `What the website is about (pages):\n- ${website.pages.slice(0, 5).join("\n- ")}`
      : "",
    ``,
    rule,
    ``,
    `The imagePrompt must describe a clean, modern, school-appropriate poster/creative (no text mistakes, no invented logos) that would pair with this post.`,
    `Never invent phone numbers, emails, or URL links.`,
  ]
    .filter(Boolean)
    .join("\n");
};

/** Download a remote image URL into a buffer (mimetype from content-type). */
const downloadToBuffer = async (url) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`Image download failed (HTTP ${res.status}).`);
  const contentType = res.headers.get("content-type") || "image/png";
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, contentType };
};

const toCloudinaryMedia = async ({ originalname, mimetype, buffer }) => {
  try {
    const uploaded = await uploadToCloudinary(
      { originalname, mimetype, buffer },
      "marketing/autopilot",
    );
    return uploaded ? [{ url: uploaded.url }] : [];
  } catch (err) {
    console.error("[marketing] cloudinary upload skipped:", err.message);
    return [];
  }
};

/**
 * Generate today's plan: one DRAFT per linked+active channel.
 * Returns summary. Idempotent per (tenant, date, channel) via dedupeKey.
 */
export const runDailyAutopilot = async ({ schoolId, actor, date }) => {
  if (!schoolId) throw new Error("schoolId required.");

  const accounts = await MarketingSocialAccount.find({
    schoolId,
    status: "active",
  }).lean();

  if (!accounts.length) {
    return {
      success: true,
      generated: 0,
      date: nextDayKey(),
      message: "No active social accounts linked. Link one first.",
      channels: [],
    };
  }

  const planDate = date || nextDayKey();
  const website = await fetchWebsiteSnippet().catch((err) => ({
    title: "Eduaitor",
    description: "AI tools for schools.",
    content: "",
    summary: err.message,
  }));

  const channels = [...new Set(accounts.map((a) => a.channel))].filter((c) =>
    MARKETING_CHANNELS.includes(c),
  );
  const startIdx = dayIndex(planDate);
  const created = [];

  for (let i = 0; i < channels.length; i++) {
    const channel = channels[i];
    const topic = TOPIC_ANGLES[(startIdx + i) % TOPIC_ANGLES.length];
    try {
      const prompt = buildPrompt({ website, channel, topic, date: planDate });
      const ai = await generateTextSuggestion({ prompt });

      // Design the visual for this post (best-effort; text proceeds anyway).
      let media = [];
      if (ai.imagePrompt) {
        const img = await generateImage({ prompt: ai.imagePrompt });
        if (img) {
          try {
            if (img.startsWith("data:")) {
              const [head, b64] = img.split(",");
              media = await toCloudinaryMedia({
                originalname: `autopilot-${channel}-${planDate}.png`,
                mimetype: head?.includes("image/") ? head.split(";")[0].replace("data:", "") : "image/png",
                buffer: Buffer.from(b64, "base64"),
              });
            } else if (img.startsWith("http")) {
              const dl = await downloadToBuffer(img);
              media = await toCloudinaryMedia({
                originalname: `autopilot-${channel}-${planDate}.png`,
                mimetype: dl.contentType || "image/png",
                buffer: dl.buffer,
              });
            }
          } catch (err) {
            console.error("[marketing] media attach skipped:", err.message);
          }
        }
      }

      const post = await MarketingPost.create({
        schoolId,
        channel,
        title: "",
        status: "DRAFT",
        source: {
          trigger: "daily.autopilot",
          entityType: "website",
          entityId: planDate,
          entitySummary: `${website.title || "Eduaitor"} — ${topic}`,
        },
        versions: [{ text: ai.text, hashtags: ai.hashtags, cta: ai.cta, media }],
        currentVersion: 0,
        dedupeKey: `daily.autopilot|${String(schoolId)}|${planDate}|${channel}`,
      });
      created.push({ channel, postId: String(post._id), withImage: media.length > 0 });
    } catch (err) {
      created.push({ channel, error: err.message });
    }
  }

  return {
    success: true,
    generated: created.filter((c) => c.postId).length,
    date: planDate,
    channels: created,
    website: website.title,
  };
};

export const autopilotStatus = async ({ schoolId }) => {
  const [accounts, drafts, published] = await Promise.all([
    MarketingSocialAccount.find({ schoolId, status: "active" })
      .select("channel name mode accountMeta connectedAt")
      .lean(),
    MarketingPost.countDocuments({
      schoolId,
      "source.trigger": "daily.autopilot",
      status: { $in: ["DRAFT", "PENDING"] },
    }),
    MarketingPost.countDocuments({
      schoolId,
      "source.trigger": "daily.autopilot",
      status: "PUBLISHED",
    }),
  ]);
  const nextDate = nextDayKey();
  const exists = await MarketingPost.exists({
    schoolId,
    "source.entityId": nextDate,
  });
  return {
    success: true,
    accounts,
    pendingCount: drafts,
    publishedCount: published,
    hasPlanForNextDate: Boolean(exists),
    scheduledDate: nextDate,
  };
};