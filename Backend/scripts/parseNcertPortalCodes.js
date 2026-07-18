/**
 * Fetches ncert.nic.in/textbook.php and extracts book codes.
 * Usage: node scripts/parseNcertPortalCodes.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "data", "ncertPortalBooks.json");

const res = await fetch("https://ncert.nic.in/textbook.php");
if (!res.ok) throw new Error(`NCERT fetch failed: ${res.status}`);
const html = await res.text();

const blockRe =
  /\(\(document\.test\.tclass\.value==(\d+)\)\s*&&\s*\(document\.test\.tsubject\.options\[sind\]\.text=="([^"]+)"\)\)\s*\{([\s\S]*?)\n\t\}/g;

const books = [];
let m;
while ((m = blockRe.exec(html))) {
  const className = String(m[1]);
  const subject = m[2];
  const body = m[3];

  // Collect text and value assignments (skip commented lines)
  const lines = body.split("\n").map((l) => l.trim());
  const texts = new Map(); // index -> title
  const values = new Map(); // index -> { code, chapterCount }

  for (const line of lines) {
    if (line.startsWith("//")) continue;

    const textMatch = line.match(
      /^document\.test\.tbook\.options\[(\d+)\]\.text="([^"]+)";?$/,
    );
    if (textMatch) {
      texts.set(Number(textMatch[1]), textMatch[2]);
      continue;
    }

    const valueMatch = line.match(
      /^document\.test\.tbook\.options\[(\d+)\]\.value="textbook\.php\?([a-z0-9]+)=0-(\d+)"/,
    );
    if (valueMatch) {
      values.set(Number(valueMatch[1]), {
        code: valueMatch[2],
        chapterCount: Number(valueMatch[3]),
      });
    }
  }

  for (const [idx, title] of texts.entries()) {
    if (idx === 0) continue; // placeholder
    const meta = values.get(idx);
    if (!meta) continue;
    books.push({
      className,
      subject,
      title,
      code: meta.code,
      chapterCount: meta.chapterCount,
    });
  }
}

const seen = new Set();
const unique = [];
for (const book of books) {
  const key = `${book.className}|${book.code}`;
  if (seen.has(key)) continue;
  seen.add(key);
  unique.push(book);
}

fs.writeFileSync(OUT, JSON.stringify(unique, null, 2), "utf8");
console.log(`Wrote ${unique.length} NCERT books → ${OUT}`);

const byClass = unique.reduce((acc, b) => {
  acc[b.className] = (acc[b.className] || 0) + 1;
  return acc;
}, {});
console.log("By class:", byClass);
console.log("Sample:", unique.slice(0, 8));
