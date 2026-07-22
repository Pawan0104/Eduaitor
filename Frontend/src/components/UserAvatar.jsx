import { useState } from "react";

const SIZE = {
  sm: "h-9 w-9 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-24 w-24 text-2xl",
  "2xl": "h-28 w-28 text-3xl",
};

function getInitials(name) {
  if (!name) return "U";
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "U";
}

/**
 * Visible person avatar — prefers photo when available; initials fallback.
 * Works across Classic / Campus / Forest skins via CSS variables.
 */
export default function UserAvatar({
  name = "",
  photoUrl = "",
  size = "md",
  className = "",
  rounded = "full",
}) {
  const [broken, setBroken] = useState(false);
  const dim = SIZE[size] || SIZE.md;
  const radius = rounded === "2xl" ? "rounded-2xl" : "rounded-full";
  const showPhoto = Boolean(photoUrl) && !broken;

  if (showPhoto) {
    return (
      <img
        src={photoUrl}
        alt={name || "Profile"}
        onError={() => setBroken(true)}
        className={`${dim} ${radius} shrink-0 object-cover ring-2 ring-white/50 shadow-md bg-[rgb(var(--surface))] ${className}`}
      />
    );
  }

  return (
    <div
      className={`${dim} ${radius} flex shrink-0 items-center justify-center bg-[rgb(var(--primary))] font-bold text-white shadow ring-2 ring-white/40 ${className}`}
      aria-hidden={!name}
      title={name || undefined}
    >
      {getInitials(name)}
    </div>
  );
}
