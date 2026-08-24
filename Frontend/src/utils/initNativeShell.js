/**
 * Native shell + branded splash (Capacitor).
 * Keeps splash up until the app shell is ready (auth settled / first paint),
 * so users don't see a long white gap after the splash.
 */
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { publicAsset } from "./publicAsset";

const SPLASH_MIN_MS = 1200;
const SPLASH_MAX_MS = 10000;

let readyResolve;
let readySettled = false;
const readyPromise = new Promise((resolve) => {
  readyResolve = resolve;
});

/** Call once auth boot (or first paint fallback) is done. */
export function signalAppShellReady() {
  if (readySettled) return;
  readySettled = true;
  readyResolve();
}

function ensureWebSplash() {
  if (document.getElementById("eduaitor-native-splash")) return;

  const splashSrc = publicAsset("eduaitor-splash-logo.png");
  const isNative = Capacitor.isNativePlatform();
  const el = document.createElement("div");
  el.id = "eduaitor-native-splash";
  el.setAttribute("aria-hidden", "true");
  el.className = isNative
    ? "eduaitor-splash-native"
    : "eduaitor-splash-web";
  el.innerHTML = `
    <img class="eduaitor-splash-full" src="${splashSrc}" alt="Eduaitor" />
  `;
  document.body.appendChild(el);

  if (document.getElementById("eduaitor-splash-style")) return;
  const style = document.createElement("style");
  style.id = "eduaitor-splash-style";
  style.textContent = `
    #eduaitor-native-splash {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      width: 100vw;
      height: 100vh;
      height: 100dvh;
      max-width: 100vw;
      max-height: 100dvh;
      margin: 0;
      padding: env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px);
      background: #ffffff;
      overflow: hidden;
      transition: opacity 0.35s ease, visibility 0.35s ease;
    }
    #eduaitor-native-splash.eduaitor-splash-hide {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }
    /* Website / desktop: fit inside viewport, no stretch */
    #eduaitor-native-splash.eduaitor-splash-web .eduaitor-splash-full {
      display: block;
      width: auto;
      height: auto;
      max-width: min(100%, 28rem);
      max-height: min(100%, 100dvh);
      object-fit: contain;
      object-position: center center;
    }
    @media (min-width: 768px) {
      #eduaitor-native-splash.eduaitor-splash-web .eduaitor-splash-full {
        max-width: min(100%, 32rem);
        max-height: min(92dvh, 56rem);
      }
    }
    /* Native APK: full-bleed cover */
    #eduaitor-native-splash.eduaitor-splash-native .eduaitor-splash-full {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center center;
    }
  `;
  document.head.appendChild(style);
}

function hideWebSplash() {
  const el = document.getElementById("eduaitor-native-splash");
  if (!el) return;
  el.classList.add("eduaitor-splash-hide");
  window.setTimeout(() => el.remove(), 400);
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Keep the web UI below the phone status bar (time / battery / notches).
 * Safe-area CSS handles insets; StatusBar overlay off avoids drawing under the system bar.
 */
export async function initNativeShell() {
  const started = Date.now();
  ensureWebSplash();

  // Safety: never leave splash forever if callers forget to signal
  window.setTimeout(() => signalAppShellReady(), SPLASH_MAX_MS);

  if (Capacitor.isNativePlatform()) {
    try {
      await StatusBar.setOverlaysWebView({ overlay: false });
    } catch {
      // older / unsupported platforms
    }

    try {
      const theme = document.documentElement.className || "";
      const dark =
        theme.includes("theme-dark") ||
        document.documentElement.classList.contains("theme-dark");
      await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
    } catch {
      // ignore
    }

    try {
      await StatusBar.setBackgroundColor({ color: "#ffffff" });
    } catch {
      // ignore
    }

    try {
      await SplashScreen.show({ autoHide: false, showDuration: 0 });
    } catch {
      // plugin may already be visible from launch
    }
  }

  const minWait = delay(Math.max(0, SPLASH_MIN_MS - (Date.now() - started)));
  await Promise.all([minWait, readyPromise]);

  hideWebSplash();

  if (Capacitor.isNativePlatform()) {
    try {
      await SplashScreen.hide({ fadeOutDuration: 280 });
    } catch {
      // ignore
    }
  }
}
