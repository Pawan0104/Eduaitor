import axios from "axios";
import { API } from "./api";

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

/**
 * Many pages still `import axios from "axios"` (not this shared client).
 * Local/dev cookie auth often fails across localhost vs 127.0.0.1, so attach
 * the Bearer token to the default axios instance as well.
 */
axios.defaults.withCredentials = true;
axios.defaults.timeout = 60000;
axios.interceptors.request.use(attachAuthHeader);

/** Shared client: cookies + Bearer token (works across Netlify → Render). */
const api = axios.create({
  baseURL: API,
  withCredentials: true,
  // Render free tier cold-starts can take a while.
  timeout: 60000,
});

api.interceptors.request.use(attachAuthHeader);

export default api;
