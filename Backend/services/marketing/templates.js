/**
 * Marketing AI: trigger catalog and default content templates.
 * A school can override any (trigger × channel) by saving its own row in
 * marketing_templates with the same key; null schoolId rows are the seeds.
 */

export const MARKETING_CHANNELS = [
  "facebook",
  "instagram",
  "linkedin",
  "whatsapp",
  "blog",
];

export const MARKETING_TRIGGERS = [
  {
    key: "event.created",
    label: "New Event",
    entityType: "event",
    hint: "Annual function, sports day, cultural event",
  },
  {
    key: "notice.holiday",
    label: "Holiday Announcement",
    entityType: "notice",
    hint: "School closed / holiday notice",
  },
  {
    key: "notice.announcement",
    label: "Announcement",
    entityType: "notice",
    hint: "General announcement / circular",
  },
  {
    key: "admission.opened",
    label: "Admission Campaign",
    entityType: "lead",
    hint: "Admissions opened for a session",
  },
  {
    key: "exam.resultsPublished",
    label: "Exam Results",
    entityType: "exam",
    hint: "Results published for an exam",
  },
];

/** Default seed templates: one row per (trigger, channel). */
export const DEFAULT_TEMPLATES = [
  // ---- event.created ----
  { trigger: "event.created", channel: "facebook", name: "Event announcement", cta: "Contact school office", hashtags: ["SchoolEvents", "EduAItor"], sampleText: "🎭 {event.title} is on {event.startDate}! Join us at {event.location} and be part of the celebration. {event.description}" },
  { trigger: "event.created", channel: "instagram", name: "Event reel/post", cta: "DM for details", hashtags: ["SchoolEvents", "EduAItor"], sampleText: "Save the date 🗓️ {event.title} — {event.startDate} at {event.location}. Your {school.name} family can't wait to see you there!" },
  { trigger: "event.created", channel: "linkedin", name: "Event professional post", cta: "Learn more", hashtags: ["Education", "SchoolLife"], sampleText: "We are excited to announce {event.title}, happening on {event.startDate} at {event.location}. This is a wonderful opportunity for our students to shine." },
  { trigger: "event.created", channel: "whatsapp", name: "Event WhatsApp notice", cta: "", hashtags: [], sampleText: "📢 {school.name} — {event.title} on {event.startDate} at {event.location}. {event.description}" },
  { trigger: "event.created", channel: "blog", name: "Event blog draft", cta: "", hashtags: [], sampleText: "Title: {event.title} at {school.name}\n\nWe are thrilled to share that {school.name} is hosting {event.title} on {event.startDate} at {event.location}. {event.description} Stay tuned for more updates!" },

  // ---- notice.holiday ----
  { trigger: "notice.holiday", channel: "facebook", name: "Holiday notice", cta: "", hashtags: [], sampleText: "📅 Holiday Notice — {school.name} will remain closed on {notice.date} ({notice.title}). Wishing everyone a great break!" },
  { trigger: "notice.holiday", channel: "instagram", name: "Holiday graphic", cta: "", hashtags: ["Holiday", "SchoolNotice"], sampleText: "🎉 {school.name} is on a holiday on {notice.date}. See you back refreshed!" },
  { trigger: "notice.holiday", channel: "linkedin", name: "Holiday update", cta: "", hashtags: [], sampleText: "A quick update: {school.name} will be closed on {notice.date} on account of {notice.title}. We'll resume regular operations the following day." },
  { trigger: "notice.holiday", channel: "whatsapp", name: "Holiday WhatsApp", cta: "", hashtags: [], sampleText: "📅 {school.name} — Holiday notice: {notice.title} on {notice.date}. School remains closed." },
  { trigger: "notice.holiday", channel: "blog", name: "Notice blog draft", cta: "", hashtags: [], sampleText: "Title: Holiday Announcement — {notice.title}\n\nThis is to inform everyone that {school.name} will be closed on {notice.date} on account of {notice.title}." },

  // ---- notice.announcement ----
  { trigger: "notice.announcement", channel: "facebook", name: "Announcement", cta: "", hashtags: [], sampleText: "🔔 Announcement from {school.name}: {notice.title}. {notice.description}" },
  { trigger: "notice.announcement", channel: "instagram", name: "Announcement post", cta: "", hashtags: [], sampleText: "🔔 {school.name} announces: {notice.title}. {notice.description}" },
  { trigger: "notice.announcement", channel: "whatsapp", name: "Announcement WhatsApp", cta: "", hashtags: [], sampleText: "🔔 {school.name} — {notice.title}. {notice.description}" },
  { trigger: "notice.announcement", channel: "blog", name: "Announcement blog draft", cta: "", hashtags: [], sampleText: "Title: {notice.title}\n\n{school.name} is pleased to announce: {notice.title}. {notice.description}" },

  // ---- admission.opened ----
  { trigger: "admission.opened", channel: "facebook", name: "Admission open", cta: "Apply Now", hashtags: ["AdmissionsOpen", "EduAItor"], sampleText: "🎓 Admissions open for session {lead.session}! Give your child the best start with {school.name}. Seats are limited — apply today." },
  { trigger: "admission.opened", channel: "instagram", name: "Admission campaign", cta: "Apply Now", hashtags: ["AdmissionsOpen", "Admission2026"], sampleText: "🎓 Admissions open at {school.name} for session {lead.session}! Your child's bright future begins here. Apply today." },
  { trigger: "admission.opened", channel: "linkedin", name: "Admission pro post", cta: "Enquire", hashtags: ["Admissions", "Education"], sampleText: "{school.name} is now accepting applications for the upcoming session {lead.session}. We invite parents to visit campus and learn how we are shaping confident, curious learners." },
  { trigger: "admission.opened", channel: "whatsapp", name: "Admission WhatsApp", cta: "Apply Now", hashtags: [], sampleText: "🎓 {school.name} — Admissions open for session {lead.session}! Limited seats. Apply today." },
  { trigger: "admission.opened", channel: "blog", name: "Admission blog draft", cta: "", hashtags: [], sampleText: "Title: Admissions Open at {school.name} for Session {lead.session}\n\n{school.name} has opened admissions for the academic session {lead.session}. With a focus on academics, sports and character, we invite you to apply." },

  // ---- exam.resultsPublished ----
  { trigger: "exam.resultsPublished", channel: "facebook", name: "Results announcement", cta: "", hashtags: ["ExamResults", "ProudParents"], sampleText: "📊 Results for {exam.name} have been published! Congratulations to all our students for their hard work. Keep aiming higher, {school.name} family!" },
  { trigger: "exam.resultsPublished", channel: "instagram", name: "Results post", cta: "", hashtags: ["ExamResults", "Congratulations"], sampleText: "📊 {exam.name} results are out! Congratulations to every student of {school.name} — we are so proud of you." },
  { trigger: "exam.resultsPublished", channel: "whatsapp", name: "Results WhatsApp", cta: "", hashtags: [], sampleText: "📊 {school.name} — Results for {exam.name} are now published. Congratulations to all students!" },
  { trigger: "exam.resultsPublished", channel: "blog", name: "Results blog draft", cta: "", hashtags: [], sampleText: "Title: {exam.name} Results Published\n\n{school.name} has published the results of {exam.name}. Heartiest congratulations to all students for their hard work and dedication." },
];

export const channelLabel = (channel) =>
  ({ facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn", whatsapp: "WhatsApp", blog: "Blog" })[channel] || channel;

export const triggerByKey = (key) =>
  MARKETING_TRIGGERS.find((t) => t.key === key) || null;