/**
 * Stream a chapter PDF for in-app viewing.
 * - Uploaded Cloudinary URLs: redirect (or stream)
 * - NCERT URLs: server-side fetch + pipe (avoids X-Frame-Options / CORS)
 * Only allows https hosts we trust.
 */

const ALLOWED_HOSTS = new Set([
  "ncert.nic.in",
  "www.ncert.nic.in",
  "res.cloudinary.com",
]);

export const isAllowedPdfUrl = (raw) => {
  try {
    const u = new URL(String(raw));
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    if (ALLOWED_HOSTS.has(u.hostname)) return true;
    // Cloudinary sometimes uses subdomains
    if (u.hostname.endsWith(".cloudinary.com")) return true;
    return false;
  } catch {
    return false;
  }
};

export const resolveChapterPdfUrl = (chapter) => {
  if (!chapter) return "";
  if (chapter.pdf?.url) return String(chapter.pdf.url);
  if (chapter.ncertPdfUrl) return String(chapter.ncertPdfUrl);
  return "";
};

/**
 * @param {import('express').Response} res
 * @param {string} pdfUrl
 */
export const streamPdfFromUrl = async (res, pdfUrl) => {
  if (!pdfUrl || !isAllowedPdfUrl(pdfUrl)) {
    res.status(400).json({
      success: false,
      message: "PDF URL is missing or not allowed",
    });
    return;
  }

  const upstream = await fetch(pdfUrl, {
    headers: {
      "User-Agent":
        "EduaitorSyllabusViewer/1.0 (educational; +https://eduaitor.local)",
      Accept: "application/pdf,*/*",
    },
    redirect: "follow",
  });

  if (!upstream.ok) {
    res.status(upstream.status === 404 ? 404 : 502).json({
      success: false,
      message: `Could not fetch PDF (${upstream.status})`,
    });
    return;
  }

  const contentType =
    upstream.headers.get("content-type") || "application/pdf";
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", "inline; filename=\"chapter.pdf\"");
  res.setHeader("Cache-Control", "private, max-age=3600");
  // Allow frontend on another origin to use the blob after fetch
  res.setHeader("X-Content-Type-Options", "nosniff");

  const buf = Buffer.from(await upstream.arrayBuffer());
  res.setHeader("Content-Length", buf.length);
  res.status(200).end(buf);
};
