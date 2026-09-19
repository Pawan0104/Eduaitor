import MarketingTemplate from "../../models/marketingTemplate.js";
import {
  MARKETING_TRIGGERS,
  MARKETING_CHANNELS,
} from "../../services/marketing/templates.js";

export const getOverrides = async (req, res) => {
  try {
    const overrides = await MarketingTemplate.find({
      schoolId: req.user.school_id,
    }).lean();
    res.json({ success: true, overrides });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const saveOverride = async (req, res) => {
  try {
    const { trigger, channel, name, sampleText, cta, hashtags, active } =
      req.body || {};
    if (!trigger || !channel) {
      return res
        .status(400)
        .json({ success: false, message: "trigger and channel required." });
    }
    const key = `${trigger}|${channel}`;
    const existing = await MarketingTemplate.findOne({
      schoolId: req.user.school_id,
      key,
    });
    const payload = {
      key,
      trigger,
      channel,
      name: name || "",
      sampleText: sampleText || "",
      cta: cta || "",
      hashtags: hashtags || [],
      active: active === false ? false : true,
    };
    const doc = existing
      ? await MarketingTemplate.updateOne({ _id: existing._id }, { $set: payload })
      : await MarketingTemplate.create({
          schoolId: req.user.school_id,
          ...payload,
        });
    res.json({ success: true, saved: existing ? existing._id : doc._id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCatalog = async (_req, res) => {
  res.json({ success: true, triggers: MARKETING_TRIGGERS, channels: MARKETING_CHANNELS });
};