import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";

const STORAGE_KEY = "eduaitor_build_id";
const CHECK_MS = 60_000;

async function fetchRemoteVersion() {
  const res = await fetch(`/version.json?t=${Date.now()}`, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
  });
  if (!res.ok) throw new Error(`version ${res.status}`);
  return res.json();
}

function applyUpdate(buildId) {
  try {
    localStorage.setItem(STORAGE_KEY, buildId);
  } catch {
    // ignore
  }
  const url = new URL(window.location.href);
  url.searchParams.set("_v", buildId);
  // Hard navigation so WebView drops stale JS/CSS
  window.location.replace(url.toString());
}

/**
 * When Netlify deploys a new build, prompt the user to reload
 * (works in browser + live Capacitor APK loading Netlify).
 */
export default function AppUpdatePrompt() {
  const [update, setUpdate] = useState(null); // { buildId, builtAt }

  const check = useCallback(async ({ forcePrompt = false } = {}) => {
    try {
      const remote = await fetchRemoteVersion();
      const remoteId = String(remote?.buildId || "");
      if (!remoteId) return;

      let localId = "";
      try {
        localId = localStorage.getItem(STORAGE_KEY) || "";
      } catch {
        localId = "";
      }

      // First run after install / clear storage — remember quietly
      if (!localId) {
        try {
          localStorage.setItem(STORAGE_KEY, remoteId);
        } catch {
          // ignore
        }
        return;
      }

      if (localId !== remoteId) {
        setUpdate({
          buildId: remoteId,
          builtAt: remote.builtAt || null,
        });
        return;
      }

      if (forcePrompt) {
        // Already up to date — nothing to show
        setUpdate(null);
      }
    } catch {
      // Offline / version file missing — skip
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(() => check(), CHECK_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    let removeCap = null;
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener("appStateChange", ({ isActive }) => {
        if (isActive) check();
      }).then((handle) => {
        removeCap = () => handle.remove();
      });
    }

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      if (removeCap) removeCap();
    };
  }, [check]);

  if (!update) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(15, 23, 42, 0.55)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-update-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-[rgb(var(--surface))] border border-[rgb(var(--border))] shadow-xl p-5 space-y-4">
        <div>
          <h2
            id="app-update-title"
            className="text-base font-bold text-[rgb(var(--text))]"
          >
            Update available
          </h2>
          <p className="text-sm text-[rgb(var(--text-muted))] mt-1.5 leading-relaxed">
            A new version of Eduaitor is ready. Update now to get the latest
            features and fixes.
          </p>
          {update.builtAt && (
            <p className="text-[11px] text-[rgb(var(--text-muted))] mt-2">
              Deployed {new Date(update.builtAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => applyUpdate(update.buildId)}
            className="w-full py-3 rounded-xl bg-[rgb(var(--primary))] text-white font-bold text-sm active:scale-[.98]"
          >
            Update now
          </button>
          <button
            type="button"
            onClick={() => setUpdate(null)}
            className="w-full py-3 rounded-xl border border-[rgb(var(--border))] font-bold text-sm text-[rgb(var(--text))] active:scale-[.98]"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
