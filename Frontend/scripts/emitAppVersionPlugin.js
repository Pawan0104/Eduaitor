import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

/** Emit dist/version.json on every build so the app can prompt for updates. */
export function emitAppVersionPlugin() {
  return {
    name: "emit-app-version",
    writeBundle(outputOptions) {
      const outDir = outputOptions.dir || "dist";
      mkdirSync(outDir, { recursive: true });

      let git = "nogit";
      try {
        git = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
      } catch {
        // Netlify / local without git
      }

      const payload = {
        buildId: `${git}-${Date.now()}`,
        builtAt: new Date().toISOString(),
        git,
      };

      writeFileSync(
        join(outDir, "version.json"),
        `${JSON.stringify(payload, null, 2)}\n`,
        "utf8",
      );
    },
  };
}
