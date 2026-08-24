import { publicAsset } from "../utils/publicAsset";

/**
 * Full-viewport boot/loading splash that fits any screen without stretching.
 * Portrait art is centered and scaled with contain (letterboxed on wide screens).
 */
export default function BootSplash({ className = "" }) {
  const src = publicAsset("eduaitor-splash-logo.png");
  return (
    <div
      className={`eduaitor-boot-splash fixed inset-0 z-[99990] flex items-center justify-center overflow-hidden bg-white ${className}`}
      style={{
        background: "#ffffff",
        width: "100vw",
        height: "100dvh",
        maxHeight: "100dvh",
        padding:
          "env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px)",
      }}
      aria-busy="true"
      aria-live="polite"
    >
      <img
        src={src}
        alt="Eduaitor"
        className="eduaitor-boot-splash-img"
        style={{
          display: "block",
          width: "auto",
          height: "auto",
          maxWidth: "min(100%, 28rem)",
          maxHeight: "min(100%, 100dvh)",
          objectFit: "contain",
          objectPosition: "center center",
        }}
      />
    </div>
  );
}
