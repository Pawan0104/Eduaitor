import MarketingPost from "../../models/marketingPost.js";
import MarketingSocialAccount from "../../models/marketingSocialAccount.js";
import MarketingTemplate from "../../models/marketingTemplate.js";
import { generateSuggestion, generateForEntity } from "../../services/marketing/generator.js";
import { publishPost } from "../../services/marketing/publishService.js";
import { runDailyAutopilot, autopilotStatus } from "../../services/marketing/dailyPlanner.js";
import { fetchWebsiteSnippet } from "../../services/marketing/websiteContent.js";
import { POST_STATUSES } from "../../models/marketingPost.js";

const currentActor = (req) => req.user?.email || req.user?.name || "unknown";

const currentVer = (post) => post.versions?.[post.currentVersion] || {};

const sanitize = (post) => JSON.parse(JSON.stringify(post));

/* ─── Dashboard ─────────────────────────────────────────────── */
export const getDashboard = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const [rows, accounts, scheduled, recent] = await Promise.all([
      MarketingPost.aggregate([
        { $match: { schoolId } },
        { $group: { _id: "$status", n: { $sum: 1 } } },
      ]),
      MarketingSocialAccount.countDocuments({ schoolId, status: "active" }),
      MarketingPost.find({ schoolId, status: "SCHEDULED" })
        .sort({ "schedule.scheduledAt": 1 })
        .limit(5)
        .lean(),
      MarketingPost.find({ schoolId, status: "PUBLISHED" })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);
    const counts = Object.fromEntries(rows.map((r) => [r._id, r.n]));
    POST_STATUSES.forEach((s) => { if (!counts[s]) counts[s] = 0; });
    res.json({
      success: true,
      counts,
      activeAccounts: accounts,
      upcoming: scheduled.map((p) => ({
        _id: p._id,
        channel: p.channel,
        scheduledAt: p.schedule?.scheduledAt,
        excerpt: (currentVer(p).text || "").slice(0, 80),
      })),
      recent: recent.map((p) => ({
        _id: p._id,
        channel: p.channel,
        publishedAt: p.workflow?.publishedAt || p.updatedAt,
        excerpt: (currentVer(p).text || "").slice(0, 80),
        permalink: p.publish?.permalink || "",
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─── List ──────────────────────────────────────────────────── */
export const listPosts = async (req, res) => {
  try {
    const { status, channel, suggestion, autopilot } = req.query;
    const query = { schoolId: req.user.school_id };
    if (status && POST_STATUSES.includes(status)) query.status = status;
    if (channel) query.channel = channel;
    let sort = { createdAt: -1 };
    if (suggestion === "1") {
      query.status = { $in: ["DRAFT", "PENDING", "REJECTED"] };
      sort = { createdAt: -1 };
    }
    if (autopilot === "1") {
      query["source.trigger"] = "daily.autopilot";
      sort = { createdAt: 1 }; // day-wise queue, oldest plan first
    }
    const posts = await MarketingPost.find(query).sort(sort).limit(200).lean();
    res.json({
      success: true,
      posts: posts.map((p) => ({
        _id: p._id,
        channel: p.channel,
        title: p.title,
        status: p.status,
        source: p.source,
        version: currentVer(p),
        workflow: p.workflow,
        schedule: p.schedule,
        publish: {
          permalink: p.publish?.permalink,
          attempts: p.publish?.attempts,
          lastError: p.publish?.lastError,
        },
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getPost = async (req, res) => {
  try {
    const post = await MarketingPost.findOne({
      _id: req.params.id,
      schoolId: req.user.school_id,
    }).lean();
    if (!post) return res.status(404).json({ success: false, message: "Post not found." });
    res.json({ success: true, post: sanitize(post) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─── Generation ────────────────────────────────────────────── */
export const generatePost = async (req, res) => {
  try {
    const { trigger, entityType, entityId, channel } = req.body || {};
    const post = await generateSuggestion({
      schoolId: req.user.school_id,
      trigger: trigger || "manual",
      entityType,
      entityId,
      channel,
      actor: currentActor(req),
    });
    res.status(201).json({ success: true, post: sanitize(post) });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const generateAllFromEntity = async (req, res) => {
  try {
    const { trigger, entityType, entityId } = req.body || {};
    const posts = await generateForEntity({
      schoolId: req.user.school_id,
      entityType,
      entityId,
      trigger: trigger || "manual",
      actor: currentActor(req),
    });
    res.status(201).json({ success: true, posts });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/* ─── Autopilot (super admin / Eduaitor tenant) ─────────────── */
export const runAutopilot = async (req, res) => {
  try {
    const { date } = req.body || {};
    const result = await runDailyAutopilot({
      schoolId: req.user.school_id,
      actor: currentActor(req),
      date,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAutopilotStatus = async (req, res) => {
  try {
    const status = await autopilotStatus({ schoolId: req.user.school_id });
    res.json(status);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const previewWebsite = async (req, res) => {
  try {
    const snippet = await fetchWebsiteSnippet({ force: true });
    res.json({ success: true, website: snippet });
  } catch (err) {
    res.status(502).json({ success: false, message: err.message });
  }
};

/** Approve + publish immediately (used by the super-admin approver). */
export const approveAndPublish = async (req, res) => {
  try {
    const post = await MarketingPost.findOne({
      _id: req.params.id,
      schoolId: req.user.school_id,
    });
    if (!post) return res.status(404).json({ success: false, message: "Post not found." });
    if (!["DRAFT", "PENDING", "REJECTED"].includes(post.status)) {
      return res.status(400).json({ success: false, message: "This post is not awaiting approval." });
    }
    post.status = "APPROVED";
    post.workflow.approvedBy = currentActor(req);
    post.workflow.approvedAt = new Date();
    post.workflow.submittedAt = post.workflow.submittedAt || new Date();
    await post.save();

    const result = await publishPost({
      postId: String(post._id),
      actor: currentActor(req),
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/* ─── Manual create ─────────────────────────────────────────── */
export const createManualPost = async (req, res) => {
  try {
    const { channel, title, text, hashtags, cta, media } = req.body || {};
    if (!channel) return res.status(400).json({ success: false, message: "channel required." });
    if (!text) return res.status(400).json({ success: false, message: "text required." });
    const post = await MarketingPost.create({
      schoolId: req.user.school_id,
      channel,
      title: title || "",
      status: "DRAFT",
      source: { trigger: "manual" },
      versions: [{ text, hashtags: hashtags || [], cta: cta || "", media: media || [] }],
    });
    res.status(201).json({ success: true, post: sanitize(post.toObject()) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─── Edit (bumps version; approved content demotes to DRAFT) ── */
export const editPost = async (req, res) => {
  try {
    const { text, hashtags, cta, media, reason } = req.body || {};
    const schoolId = req.user.school_id;
    const post = await MarketingPost.findOne({ _id: req.params.id, schoolId });
    if (!post) return res.status(404).json({ success: false, message: "Post not found." });
    if (["PUBLISHED"].includes(post.status)) {
      return res.status(400).json({ success: false, message: "Published posts cannot be edited." });
    }
    if (text === undefined) {
      return res.status(400).json({ success: false, message: "text required." });
    }

    const bumped = post.status === "APPROVED" || post.status === "SCHEDULED";
    post.versions.push({
      text,
      hashtags: hashtags || [],
      cta: cta || "",
      media: media || [],
      editedBy: currentActor(req),
      editedAt: new Date(),
      editReason: reason || "",
    });
    post.currentVersion = post.versions.length - 1;
    post.status = bumped ? "DRAFT" : "PENDING";
    if (bumped) {
      post.workflow.schedule = undefined;
      post.schedule.publishedNow = false;
    }
    post.workflow.submittedBy = currentActor(req);
    post.workflow.submittedAt = new Date();
    await post.save();
    res.json({ success: true, post: sanitize(post.toObject()) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─── Workflow transitions ──────────────────────────────────── */
export const submitPost = async (req, res) => {
  try {
    const post = await MarketingPost.findOne({
      _id: req.params.id,
      schoolId: req.user.school_id,
    });
    if (!post) return res.status(404).json({ success: false, message: "Post not found." });
    if (!["DRAFT", "REJECTED"].includes(post.status)) {
      return res.status(400).json({ success: false, message: "Only drafts can be submitted." });
    }
    post.status = "PENDING";
    post.workflow.submittedBy = currentActor(req);
    post.workflow.submittedAt = new Date();
    await post.save();
    res.json({ success: true, post: sanitize(post.toObject()) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const approvePost = async (req, res) => {
  try {
    const { scheduledAt } = req.body || {};
    const post = await MarketingPost.findOne({
      _id: req.params.id,
      schoolId: req.user.school_id,
    });
    if (!post) return res.status(404).json({ success: false, message: "Post not found." });
    if (post.status !== "PENDING") {
      return res.status(400).json({ success: false, message: "Only pending posts can be approved." });
    }
    post.status = scheduledAt ? "SCHEDULED" : "APPROVED";
    post.workflow.approvedBy = currentActor(req);
    post.workflow.approvedAt = new Date();
    if (scheduledAt) {
      post.schedule.scheduledAt = new Date(scheduledAt);
      post.schedule.publishedNow = false;
      post.workflow.scheduledBy = currentActor(req);
    }
    await post.save();
    res.json({ success: true, post: sanitize(post.toObject()) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const rejectPost = async (req, res) => {
  try {
    const { reason } = req.body || {};
    const post = await MarketingPost.findOne({
      _id: req.params.id,
      schoolId: req.user.school_id,
    });
    if (!post) return res.status(404).json({ success: false, message: "Post not found." });
    if (post.status !== "PENDING") {
      return res.status(400).json({ success: false, message: "Only pending posts can be rejected." });
    }
    post.status = "REJECTED";
    post.workflow.rejectedBy = currentActor(req);
    post.workflow.rejectedAt = new Date();
    post.workflow.rejectedReason = reason || "";
    await post.save();
    res.json({ success: true, post: sanitize(post.toObject()) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const schedulePost = async (req, res) => {
  try {
    const { scheduledAt } = req.body || {};
    if (!scheduledAt) return res.status(400).json({ success: false, message: "scheduledAt required." });
    const post = await MarketingPost.findOne({
      _id: req.params.id,
      schoolId: req.user.school_id,
    });
    if (!post) return res.status(404).json({ success: false, message: "Post not found." });
    if (!["APPROVED", "SCHEDULED"].includes(post.status)) {
      return res.status(400).json({ success: false, message: "Only approved posts can be scheduled." });
    }
    post.status = "SCHEDULED";
    post.schedule.scheduledAt = new Date(scheduledAt);
    post.schedule.publishedNow = false;
    post.workflow.scheduledBy = currentActor(req);
    await post.save();
    res.json({ success: true, post: sanitize(post.toObject()) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const publishNow = async (req, res) => {
  try {
    const result = await publishPost({
      postId: req.params.id,
      actor: currentActor(req),
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const retryPost = async (req, res) => {
  try {
    const result = await publishPost({
      postId: req.params.id,
      actor: currentActor(req),
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const discardPost = async (req, res) => {
  try {
    const post = await MarketingPost.findOne({
      _id: req.params.id,
      schoolId: req.user.school_id,
    });
    if (!post) return res.status(404).json({ success: false, message: "Post not found." });
    if (["PUBLISHED", "PUBLISHING"].includes(post.status)) {
      return res.status(400).json({ success: false, message: "Published posts cannot be discarded." });
    }
    await post.deleteOne();
    res.json({ success: true, message: "Post discarded." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─── Templates (school overrides of the seeds) ─────────────── */
export const listTemplates = async (req, res) => {
  const overrides = await MarketingTemplate.find({ schoolId: req.user.school_id }).lean();
  res.json({ success: true, overrides });
};