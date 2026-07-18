/**
 * Extract text from specific PDF pages using pdfjs-dist (no canvas required).
 */
import { createRequire } from "module";

const require = createRequire(import.meta.url);

let pdfjsLibPromise = null;
const loadPdfjs = async () => {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import("pdfjs-dist/legacy/build/pdf.mjs");
  }
  return pdfjsLibPromise;
};

/**
 * @param {Buffer|Uint8Array} pdfBuffer
 * @param {number} pageFrom 1-based
 * @param {number} pageTo 1-based
 * @param {number} maxPages cap
 */
export const extractPdfPageText = async (
  pdfBuffer,
  pageFrom,
  pageTo,
  maxPages = 6,
) => {
  const pdfjs = await loadPdfjs();
  const data =
    pdfBuffer instanceof Uint8Array
      ? pdfBuffer
      : new Uint8Array(pdfBuffer);

  const loadingTask = pdfjs.getDocument({
    data,
    useSystemFonts: true,
    disableWorker: true,
  });
  const doc = await loadingTask.promise;
  const total = doc.numPages;

  let from = Math.max(1, Number(pageFrom) || 1);
  let to = Math.min(total, Number(pageTo) || from);
  if (to < from) to = from;

  const span = to - from + 1;
  if (span > maxPages) {
    to = from + maxPages - 1;
  }

  const parts = [];
  for (let p = from; p <= to; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const text = content.items
      .map((it) => ("str" in it ? it.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) {
      parts.push(`--- Page ${p} ---\n${text}`);
    } else {
      parts.push(`--- Page ${p} ---\n(No extractable text on this page)`);
    }
  }

  await doc.destroy();
  return {
    text: parts.join("\n\n"),
    pageFrom: from,
    pageTo: to,
    totalPages: total,
  };
};

export const fetchPdfBuffer = async (pdfUrl) => {
  const res = await fetch(pdfUrl, {
    headers: {
      Accept: "application/pdf,*/*",
      "User-Agent": "EduaitorDailyLearning/1.0",
    },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch PDF (${res.status})`);
  }
  return Buffer.from(await res.arrayBuffer());
};
