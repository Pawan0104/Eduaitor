import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

/**
 * Keep the web UI below the phone status bar (time / battery / notches).
 * Safe-area CSS handles insets; StatusBar overlay off avoids drawing under the system bar.
 */
export async function initNativeShell() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch {
    // older / unsupported platforms
  }

  try {
    const theme = document.documentElement.className || "";
    const dark = theme.includes("theme-dark");
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
  } catch {
    // ignore
  }

  try {
    await StatusBar.setBackgroundColor({ color: "#ffffff" });
  } catch {
    // ignore
  }
}
