import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { publicAsset } from "../utils/publicAsset";
import { subscribeProcessing } from "../utils/processing.js";

function useProcessing() {
  const [active, setActive] = useState(false);
  useEffect(() => subscribeProcessing(setActive), []);
  return active;
}

// Lightweight global overlay shown while a save/submit/add request is running.
// The processing util keeps the "active" state latched for a minimum window,
// so even instant responses still show the overlay briefly. The spinner ring
// carries the school logo for school-bound roles and Eduaitor for super admin.
export default function ProcessingOverlay() {
  const active = useProcessing();
  const { user } = useAuth();
  const [logoBroken, setLogoBroken] = useState(false);

  const role = user?.role;
  const isSuperAdmin = role === "super_admin";
  const schoolName =
    user?.school_name ||
    (role === "school_admin" ? user?.name : null) ||
    "";
  const schoolLogo = user?.school_logo && !logoBroken ? user.school_logo : null;

  if (!active) return null;

  const eduaitorLogo = publicAsset("eduaitor.png");

  return (
    <div
      className="fixed inset-0 z-[120000] flex items-center justify-center bg-black/25 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex flex-col items-center gap-4 rounded-3xl bg-[rgb(var(--surface))] px-8 py-7 shadow-2xl ring-1 ring-[rgb(var(--border))]">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-4 border-[rgb(var(--primary))] border-t-transparent animate-spin" />
          <div className="absolute inset-1.5 animate-spin">
            <div className="relative h-full w-full">
              {isSuperAdmin || !role ? (
                <img
                  src={eduaitorLogo}
                  alt=""
                  className="h-full w-full p-1.5 rounded-full object-contain bg-white"
                />
              ) : schoolLogo ? (
                <img
                  src={schoolLogo}
                  alt=""
                  onError={() => setLogoBroken(true)}
                  className="h-full w-full rounded-full object-cover bg-white"
                />
              ) : (
                <span
                  className="flex h-full w-full items-center justify-center rounded-full bg-white text-lg font-bold leading-none"
                  style={{ color: "rgb(var(--primary))" }}
                >
                  {schoolName ? schoolName.charAt(0).toUpperCase() : "…"}
                </span>
              )}
              <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-[rgb(var(--primary))] ring-[3px] ring-[rgb(var(--surface))]" />
            </div>
          </div>
        </div>
        <p className="text-sm font-medium text-[rgb(var(--text))]">
          Processing…
        </p>
      </div>
    </div>
  );
}