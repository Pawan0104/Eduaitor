import api from "../../config/axios";

const qs = (params = {}) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") p.set(k, v);
  });
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const marketingApi = {
  catalog: () => api.get("/marketing/catalog"),
  dashboard: () => api.get("/marketing/dashboard"),
  listPosts: (params = {}) => api.get(`/marketing/posts${qs(params)}`),
  getPost: (id) => api.get(`/marketing/posts/${id}`),
  generate: (payload) => api.post("/marketing/posts/generate", payload),
  generateEntity: (payload) => api.post("/marketing/posts/generate-entity", payload),
  createManual: (payload) => api.post("/marketing/posts", payload),
  submit: (id) => api.post(`/marketing/posts/${id}/submit`),
  edit: (id, payload) => api.put(`/marketing/posts/${id}`, payload),
  approve: (id, payload = {}) => api.post(`/marketing/posts/${id}/approve`, payload),
  reject: (id, reason) => api.post(`/marketing/posts/${id}/reject`, { reason }),
  schedule: (id, scheduledAt) => api.post(`/marketing/posts/${id}/schedule`, { scheduledAt }),
  publishNow: (id) => api.post(`/marketing/posts/${id}/publish-now`),
  retry: (id) => api.post(`/marketing/posts/${id}/retry`),
  discard: (id) => api.delete(`/marketing/posts/${id}`),
  // autopilot (super admin)
  runAutopilot: (payload = {}) => api.post("/marketing/posts/autopilot-run", payload),
  autopilotStatus: () => api.get("/marketing/posts/autopilot-status"),
  websitePreview: () => api.get("/marketing/posts/website-preview"),
  approveAndPublish: (id) => api.post(`/marketing/posts/${id}/approve-and-publish`),
  // accounts
  accounts: () => api.get("/marketing/accounts"),
  connect: (payload) => api.post("/marketing/accounts/connect", payload),
  testAccount: (id) => api.post(`/marketing/accounts/${id}/test`),
  updateToken: (id, token) => api.post(`/marketing/accounts/${id}/token`, { token }),
  disconnect: (id) => api.post(`/marketing/accounts/${id}/disconnect`),
  connectUrl: (channel, redirectUri) =>
    api.get(`/marketing/accounts/connect-url${qs({ channel, redirectUri })}`),
  completeOAuth: ({ code, state, redirectUri }) =>
    api.get(`/marketing/oauth/facebook/callback${qs({ code, state, redirect_uri: redirectUri })}`),
};

export const CHANNEL_LABELS = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
  blog: "Blog",
};

export const CHANNEL_COLORS = {
  facebook: { bg: "#EEF2FF", icon: "#3B82F6" },
  instagram: { bg: "#FAF5FF", icon: "#A855F7" },
  linkedin: { bg: "#EFF6FF", icon: "#2563EB" },
  whatsapp: { bg: "#ECFDF5", icon: "#059669" },
  blog: { bg: "#F0FDFA", icon: "#0D9488" },
};

export const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};