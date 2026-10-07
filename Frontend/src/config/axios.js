import axios from "axios";
import { API } from "./api";
import { beginProcessing, endProcessing } from "../utils/processing.js";

const TOKEN_KEY = "eduaitor_token";

export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setAuthToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function clearAuthToken() {
  setAuthToken("");
}

function attachAuthHeader(config) {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}

const MUTATING = new Set(["post", "put", "patch", "delete"]);

// Show the global "Processing…" overlay only for save/submit/add style calls,
// not for background list/GET loads.
function trackProcessing(config) {
  if (MUTATING.has(String(config.method || "get").toLowerCase())) {
    config.__processingId = Symbol("processing");
    beginProcessing();
  }
  return config;
}

function untrackProcessing(config) {
  if (config && config.__processingId) {
    endProcessing();
    config.__processingId = undefined;
  }
  return config;
}

/**
 * Many pages still `import axios from "axios"` (not this shared client).
 * Local/dev cookie auth often fails across localhost vs 127.0.0.1, so attach
 * the Bearer token to the default axios instance as well.
 */
axios.defaults.withCredentials = true;
axios.defaults.timeout = 60000;
axios.interceptors.request.use(attachAuthHeader);
axios.interceptors.request.use(trackProcessing);
axios.interceptors.response.use(
  (res) => {
    untrackProcessing(res.config);
    return res;
  },
  (err) => {
    untrackProcessing(err.config);
    return Promise.reject(err);
  },
);

/** Shared client: cookies + Bearer token (works across Netlify → Render). */
const api = axios.create({
  baseURL: API,
  withCredentials: true,
  // Render free tier cold-starts can take a while.
  timeout: 60000,
});

api.interceptors.request.use(attachAuthHeader);
api.interceptors.request.use(trackProcessing);
api.interceptors.response.use(
  (res) => {
    untrackProcessing(res.config);
    return res;
  },
  (err) => {
    untrackProcessing(err.config);
    return Promise.reject(err);
  },
);

export default api;
