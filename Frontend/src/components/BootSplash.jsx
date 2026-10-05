import { useEffect, useState } from "react";
import { publicAsset } from "../utils/publicAsset";

/**
 * Full-viewport boot/loading splash that fits any screen without stretching.
 * Portrait art is centered and scaled with contain (letterboxed on wide screens).
 */
export default function BootSplash({ className = "" }) {
  // initNativeShell() injects its own splash (#eduaitor-native-splash) at a
  // higher z-index, and it is created before React first renders. Rendering
  // this component as well stacks two logos and two spinning AI marks, so the
  // React splash defers to the injected one. We keep re-checking so that if the
  // injected splash is removed early (max-ms timeout) we still cover the gap.
  const [deferred, setDeferred] = useState(true);

  useEffect(() => {
    const check = () =>
      setDeferred(!!document.getElementById("eduaitor-native-splash"));
    check();
    const t = setInterval(check, 250);
    return () => clearInterval(t);
  }, []);

  if (deferred) return null;

  const src = publicAsset("eduaitor-splash-logo.png");
  const aiSrc = publicAsset("eduaitor-splash-ai.png");
  return (
    <>
      <style>{`
        @keyframes eduaitor-ai-swing-spin {
          0% { transform: rotate(0deg); }
          50% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
      `}</style>
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
        <div
          style={{
            position: "relative",
            width: "min(100%, 40rem)",
            maxWidth: "100%",
          }}
        >
          <img
            src={src}
            alt="Eduaitor"
            className="eduaitor-boot-splash-img"
            style={{
              display: "block",
              width: "100%",
              height: "auto",
              objectFit: "contain",
              objectPosition: "center center",
            }}
          />
          <img
            src={aiSrc}
            alt=""
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "43%",
              top: "2%",
              width: "24%",
              height: "72%",
              objectFit: "contain",
              transformOrigin: "50% 50%",
              animation: "eduaitor-ai-swing-spin 2.8s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>
    </>
  );
}
