/**
 * Builds the LLM prompt from the ERP entity, school context and template.
 */

const friendlyDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const fillTemplate = (text, vars) =>
  String(text || "").replace(/\{([a-zA-Z0-9.]+)\}/g, (m, key) =>
    vars[key] !== undefined ? vars[key] : m,
  );

export const entityToVars = (entity = {}, school = {}) => {
  const o = entity || {};
  const s = school || {};
  const name = o.studentName || o.student?.name || "";
  return {
    "event.title": o.title,
    "event.startDate": friendlyDate(o.startDate),
    "event.location": o.location,
    "event.description": o.description,
    "notice.title": o.title,
    "notice.date": friendlyDate(o.date),
    "notice.description": o.description,
    "lead.session": o.session,
    "lead.studentClass": o.className || o.class || "",
    "lead.studentName": name,
    "exam.name": o.name || o.examName,
    "school.name": s.school_name || s.name || "Our School",
  };
};

export const buildPrompt = ({ trigger, channel, entity, school, template }) => {
  const vars = entityToVars(entity, school);
  const sample = fillTemplate(template?.sampleText, vars);
  const schoolName = school?.school_name || school?.name || "Our School";

  const sections = [
    `Generate ONE social media post for a school called "${schoolName}" on the ${channel.toUpperCase()} channel.`,
    `Trigger: ${trigger}.`,
    `ERP context: ${JSON.stringify(entity || {})}.`,
    channel === "instagram" &&
      "Instagram rules: short hook, strong visual cue, no links, 1-3 hashtags.",
    channel === "linkedin" &&
      "LinkedIn rules: professional tone, value-driven, 1-3 hashtags.",
    channel === "whatsapp" &&
      "WhatsApp rules: plain message, no hashtags, no emoji overload, mobile-friendly.",
    channel === "facebook" &&
      "Facebook rules: friendly, engaging, 2-4 hashtags max.",
    channel === "blog" &&
      'Blog rules: 250-350 words with a title line starting "Title: ".',
  ].filter(Boolean);

  let instruction =
    sections.join("\n") +
    `\n\nUse this house style and sample as inspiration (adapt, don't copy verbatim):\n"""${sample}"""`;
  if (template?.language && template.language !== "en") {
    instruction += `\n\nWrite the post in language: ${template.language} (Indian regional languages welcome).`;
  }
  instruction +=
    "\n\nThe imagePrompt should describe a poster/creative for this post (school-appropriate, clean, no text mistakes).";
  return instruction;
};