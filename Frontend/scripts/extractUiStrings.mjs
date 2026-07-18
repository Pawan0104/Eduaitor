import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../src");
const counts = new Map();

const skipRe =
  /^(http|https|theme-|rgb|rgba|flex|grid|text-|bg-|w-|h-|px-|py-|mt-|mb-|ml-|mr-|gap-|rounded|border|shadow|font-|hover:|active:|sm:|md:|lg:|xl:|min-|max-|from-|to-|opacity|transition|duration|cursor|absolute|relative|fixed|hidden|block|items-|justify-|col-|row-|p-|m-|z-|top-|left-|right-|bottom-|object-|leading-|tracking-|uppercase|truncate|pointer|space-|divide-|ring-|outline|overflow|whitespace|Fa[A-Z]|Md[A-Z]|Gi[A-Z]|Hi[A-Z]|Fi[A-Z]|Pi[A-Z])/;

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (["node_modules", "dist"].includes(ent.name)) continue;
      walk(p);
      continue;
    }
    if (!/\.(jsx|js)$/.test(ent.name)) continue;
    const src = fs.readFileSync(p, "utf8");
    const re = /(["'])((?:\\\1|.)*?)\1/g;
    let m;
    while ((m = re.exec(src))) {
      let s = m[2];
      try {
        s = JSON.parse(`"${s.replace(/\\'/g, "'")}"`);
      } catch {
        s = m[2].replace(/\\n/g, " ").replace(/\\'/g, "'").replace(/\\"/g, '"');
      }
      s = String(s).trim().replace(/\s+/g, " ");
      if (s.length < 3 || s.length > 70) continue;
      if (skipRe.test(s)) continue;
      if (/^[\d\s.,:%+\-_/\\|#@]+$/.test(s)) continue;
      if (!/[a-zA-Z]{3,}/.test(s)) continue;
      if (s.includes("${") || s.includes("</") || s.includes("=>")) continue;
      if (s.startsWith("/") || s.includes("node_modules")) continue;
      if (/^[a-z]+([A-Z][a-z]+)+$/.test(s)) continue; // camelCase ids
      if (/^[A-Z_]+$/.test(s)) continue;
      // Prefer human UI: has space or starts with capital word
      if (!/\s/.test(s) && !/^[A-Z][a-z]/.test(s)) continue;
      counts.set(s, (counts.get(s) || 0) + 1);
    }
  }
}

walk(path.join(root, "pages"));
walk(path.join(root, "components"));

const out = [...counts.entries()]
  .filter(([, c]) => c >= 2)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 300);

fs.writeFileSync(
  path.join(__dirname, "ui-strings.tsv"),
  out.map(([s, c]) => `${c}\t${s}`).join("\n"),
  "utf8",
);
console.log(`Wrote ${out.length} strings`);
console.log(out.slice(0, 40).map(([s, c]) => `${c}\t${s}`).join("\n"));
