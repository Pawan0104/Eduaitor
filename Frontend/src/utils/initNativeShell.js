/**
 * Native shell + branded splash (Capacitor).
 * Shows rotating Eduaitor logo, then hides the native SplashScreen.
 */
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";

const SPLASH_MIN_MS = 2200;

function ensureWebSplash() {
  if (document.getElementById("eduaitor-native-splash")) return;

  const el = document.createElement("div");
  el.id = "eduaitor-native-splash";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = `
    <div class="eduaitor-splash-inner">
      <img class="eduaitor-splash-logo" src="/eduaitor.png" alt="Eduaitor" />
      <p class="eduaitor-splash-tag">Smarter Schools. Stronger Students.</p>
    </div>
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
      background: #05080f;
      transition: opacity 0.45s ease, visibility 0.45s ease;
    }
    #eduaitor-native-splash.eduaitor-splash-hide {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }
    .eduaitor-splash-inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.25rem;
      padding: 1.5rem;
    }
    .eduaitor-splash-logo {
      width: min(72vw, 280px);
      height: auto;
      display: block;
      animation: eduaitor-spin 1.4s linear infinite;
      transform-origin: center center;
    }
    .eduaitor-splash-tag {
      margin: 0;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      font-size: 0.8rem;
      letter-spacing: 0.04em;
      color: #5b9fd4;
      opacity: 0.9;
      text-align: center;
    }
    @keyframes eduaitor-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

function hideWebSplash() {
  const el = document.getElementById("eduaitor-native-splash");
  if (!el) return;
  el.classList.add("eduaitor-splash-hide");
  window.setTimeout(() => el.remove(), 500);
}

/**
 * Keep the web UI below the phone status bar (time / battery / notches).
 * Safe-area CSS handles insets; StatusBar overlay off avoids drawing under the system bar.
 */
export async function initNativeShell() {
  const started = Date.now();

  // Web splash (works on APK + browser preview). Native splash covers cold start.
  ensureWebSplash();

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
      // Keep native splash until web splash animation is ready
      await SplashScreen.show({ autoHide: false, showDuration: 0 });
    } catch {
      // plugin may already be visible from launch
    }
  }

  const wait = Math.max(0, SPLASH_MIN_MS - (Date.now() - started));
  await new Promise((r) => setTimeout(r, wait));

  hideWebSplash();

  if (Capacitor.isNativePlatform()) {
    try {
      await SplashScreen.hide({ fadeOutDuration: 300 });
    } catch {
      // ignore
    }
  }
}
