/**
 * Vector-sharp HD brand assets for Eduaitor.
 * Circular triad mark (Track / Assess / Improve + AI) rendered from SVG.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const RES = path.join(ROOT, "android", "app", "src", "main", "res");

const COLORS = {
  track: "#0F766E", // deep teal
  assess: "#5B21B6", // rich violet
  improve: "#C2410C", // burnt orange
  ink: "#0F172A",
  white: "#FFFFFF",
  mint: "#F0FDFA",
  mintLine: "#99F6E4",
  softTeal: "#CCFBF1",
};

function polar(cx, cy, r, deg) {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

/** Donut wedge from startDeg→endDeg (degrees, 0 = top, clockwise). */
function wedgePath(cx, cy, rOut, rIn, startDeg, endDeg) {
  const large = endDeg - startDeg > 180 ? 1 : 0;
  const [x1, y1] = polar(cx, cy, rOut, startDeg);
  const [x2, y2] = polar(cx, cy, rOut, endDeg);
  const [x3, y3] = polar(cx, cy, rIn, endDeg);
  const [x4, y4] = polar(cx, cy, rIn, startDeg);
  return [
    `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
    `A ${rOut} ${rOut} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
    `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
    `A ${rIn} ${rIn} 0 ${large} 0 ${x4.toFixed(2)} ${y4.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function brandMarkSvg({ size = 1024, withShadow = true, opaqueBg = false } = {}) {
  const cx = size / 2;
  const cy = size / 2;
  const rOut = size * 0.42;
  const rIn = size * 0.245;
  const labelR = (rOut + rIn) / 2;
  const labelFs = Math.round(size * 0.048);
  const aiFs = Math.round(size * 0.2);

  // Degrees: 0 = top, clockwise. Gaps between wedges for a modern segmented ring.
  const arcs = [
    { fill: COLORS.track, label: "Track", start: 212, end: 328, mid: 270 }, // left
    { fill: COLORS.assess, label: "Assess", start: 336, end: 444, mid: 30 }, // right (wraps)
    { fill: COLORS.improve, label: "Improve", start: 92, end: 204, mid: 148 }, // bottom
  ];

  const bg = opaqueBg
    ? `<rect width="${size}" height="${size}" fill="${COLORS.white}"/>`
    : "";
  const shadow = withShadow
    ? `<ellipse cx="${cx}" cy="${cy + rOut * 0.95}" rx="${rOut * 0.7}" ry="${rOut * 0.07}" fill="#0F172A" opacity="0.14"/>`
    : "";

  const clean = arcs
    .map((a) => {
      const paths =
        a.end > 360
          ? `<path d="${wedgePath(cx, cy, rOut, rIn, a.start, 360)}" fill="${a.fill}"/>
    <path d="${wedgePath(cx, cy, rOut, rIn, 0, a.end - 360)}" fill="${a.fill}"/>`
          : `<path d="${wedgePath(cx, cy, rOut, rIn, a.start, a.end)}" fill="${a.fill}"/>`;
      const [lx, ly] = polar(cx, cy, labelR, a.mid % 360);
      // Horizontal labels — readable at launcher sizes
      return `
    ${paths}
    <text x="${lx.toFixed(2)}" y="${ly.toFixed(2)}" fill="${COLORS.white}" font-size="${labelFs}"
      font-family="Segoe UI, Arial, Helvetica, sans-serif" font-weight="700"
      text-anchor="middle" dominant-baseline="middle">${a.label}</text>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${bg}
  ${shadow}
  ${clean}
  <circle cx="${cx}" cy="${cy}" r="${rIn * 0.9}" fill="${COLORS.white}"/>
  <text x="${cx}" y="${cy + aiFs * 0.06}" fill="${COLORS.ink}" font-size="${aiFs}"
    font-family="Segoe UI, Arial, Helvetica, sans-serif" font-weight="800"
    text-anchor="middle" dominant-baseline="middle">AI</text>
</svg>`;
}

function splashBackdropSvg(w, h) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${COLORS.white}"/>
      <stop offset="55%" stop-color="${COLORS.mint}"/>
      <stop offset="100%" stop-color="${COLORS.softTeal}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <path d="M0 ${h * 0.78} C ${w * 0.25} ${h * 0.74}, ${w * 0.5} ${h * 0.82}, ${w} ${h * 0.76} L ${w} ${h} L 0 ${h} Z"
    fill="${COLORS.mintLine}" opacity="0.45"/>
  <path d="M0 ${h * 0.84} C ${w * 0.3} ${h * 0.8}, ${w * 0.65} ${h * 0.88}, ${w} ${h * 0.83} L ${w} ${h} L 0 ${h} Z"
    fill="#5EEAD4" opacity="0.22"/>
  <g opacity="0.35" stroke="${COLORS.track}" stroke-width="${Math.max(3, w * 0.003)}" fill="none">
    <rect x="${w * 0.12}" y="${h * 0.88}" width="${w * 0.05}" height="${w * 0.05}" rx="${w * 0.008}"
      transform="rotate(-12 ${w * 0.145} ${h * 0.905})"/>
    <circle cx="${w * 0.82}" cy="${h * 0.9}" r="${w * 0.028}"/>
    <path d="M${w * 0.7} ${h * 0.86} h ${w * 0.06} l ${-w * 0.02} ${w * 0.04} h ${-w * 0.02} z"/>
  </g>
  <g opacity="0.28" fill="${COLORS.assess}">
    <circle cx="${w * 0.22}" cy="${h * 0.14}" r="${w * 0.012}"/>
    <circle cx="${w * 0.78}" cy="${h * 0.16}" r="${w * 0.009}"/>
  </g>
</svg>`;
}

function titleSvg(w, h, titleY, titleFs) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <text x="${w / 2}" y="${titleY}" fill="${COLORS.ink}" font-size="${titleFs}"
    font-family="Segoe UI, Arial, Helvetica, sans-serif" font-weight="800"
    text-anchor="middle" dominant-baseline="hanging">Eduaitor</text>
</svg>`;
}

function safeWrite(filePath, buf) {
  const tmp = filePath + ".tmp.png";
  fs.writeFileSync(tmp, buf);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    /* locked */
  }
  try {
    fs.renameSync(tmp, filePath);
  } catch {
    fs.copyFileSync(tmp, filePath);
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

async function svgPng(svg) {
  return sharp(Buffer.from(svg))
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

async function coverResize(buf, width, height) {
  return sharp(buf)
    .resize(width, height, {
      fit: "cover",
      position: "centre",
      kernel: sharp.kernel.lanczos3,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .sharpen({ sigma: 0.45 })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

async function iconPad(buf, size, { padRatio = 0.08 } = {}) {
  const inner = Math.round(size * (1 - padRatio * 2));
  const logo = await sharp(buf)
    .resize(inner, inner, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: logo, gravity: "centre" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function buildSplashHd(w, h, markPng) {
  const markSize = Math.round(w * 0.58);
  const markX = Math.round((w - markSize) / 2);
  const markY = Math.round(h * 0.24);
  const titleY = Math.round(markY + markSize + h * 0.01);
  const titleFs = Math.round(w * 0.105);

  const markScaled = await sharp(markPng)
    .resize(markSize, markSize, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();

  const backdrop = await svgPng(splashBackdropSvg(w, h));
  const title = await svgPng(titleSvg(w, h, titleY, titleFs));

  return sharp(backdrop)
    .composite([
      { input: markScaled, left: markX, top: markY },
      { input: title, left: 0, top: 0 },
    ])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

async function writeSplashAssets(srcBuf) {
  const master = await coverResize(srcBuf, 1440, 2560);
  safeWrite(path.join(ROOT, "public", "eduaitor-splash-logo.png"), master);
  safeWrite(path.join(ROOT, "resources", "splash.png"), master);
  safeWrite(
    path.join(ROOT, "resources", "splash-preview.png"),
    await coverResize(srcBuf, 540, 960)
  );
  console.log("wrote public + resources splash @ 1440x2560 HD");

  // Canonical Capacitor splash slot sizes (downscale from HD source)
  const SIZES = {
    drawable: [480, 800],
    "drawable-port-mdpi": [320, 480],
    "drawable-port-hdpi": [480, 800],
    "drawable-port-xhdpi": [720, 1280],
    "drawable-port-xxhdpi": [960, 1600],
    "drawable-port-xxxhdpi": [1280, 1920],
    "drawable-land-mdpi": [480, 320],
    "drawable-land-hdpi": [800, 480],
    "drawable-land-xhdpi": [1280, 720],
    "drawable-land-xxhdpi": [1600, 960],
    "drawable-land-xxxhdpi": [1920, 1280],
  };

  let n = 0;
  for (const [dir, [w, h]] of Object.entries(SIZES)) {
    const splash = path.join(RES, dir, "splash.png");
    if (!fs.existsSync(path.dirname(splash))) continue;
    safeWrite(splash, await coverResize(srcBuf, w, h));
    console.log(`splash ${dir} ${w}x${h}`);
    n++;
  }
  return n;
}

async function writeIcons(iconBuf) {
  const web1024 = await iconPad(iconBuf, 1024, { padRatio: 0.06 });
  safeWrite(path.join(ROOT, "resources", "icon.png"), web1024);
  safeWrite(path.join(ROOT, "public", "eduaitor-app-icon.png"), web1024);
  safeWrite(path.join(ROOT, "public", "app-icon.png"), web1024);
  safeWrite(path.join(ROOT, "resources", "icon-eduaitor-ai.png"), web1024);
  console.log("wrote public/resources icons @ 1024");

  const densities = {
    "mipmap-mdpi": { icon: 48, fg: 108 },
    "mipmap-hdpi": { icon: 72, fg: 162 },
    "mipmap-xhdpi": { icon: 96, fg: 216 },
    "mipmap-xxhdpi": { icon: 144, fg: 324 },
    "mipmap-xxxhdpi": { icon: 192, fg: 432 },
  };

  for (const [dir, sizes] of Object.entries(densities)) {
    const dirPath = path.join(RES, dir);
    if (!fs.existsSync(dirPath)) continue;
    const launcher = await iconPad(iconBuf, sizes.icon, { padRatio: 0.04 });
    const foreground = await iconPad(iconBuf, sizes.fg, { padRatio: 0.16 });
    for (const name of ["ic_launcher.png", "ic_launcher_round.png"]) {
      safeWrite(path.join(dirPath, name), launcher);
    }
    safeWrite(path.join(dirPath, "ic_launcher_foreground.png"), foreground);
    console.log(`icons ${dir}`);
  }
}

async function main() {
  fs.mkdirSync(path.join(ROOT, "resources"), { recursive: true });

  const ICON_PX = 2048;
  const SPLASH_W = 2160;
  const SPLASH_H = 3840;

  console.log("rendering vector circular mark + HD splash…");
  const iconOpaque = await svgPng(
    brandMarkSvg({ size: ICON_PX, withShadow: true, opaqueBg: true })
  );
  const iconClear = await svgPng(
    brandMarkSvg({ size: ICON_PX, withShadow: true, opaqueBg: false })
  );
  const splashBuf = await buildSplashHd(SPLASH_W, SPLASH_H, iconClear);

  safeWrite(path.join(ROOT, "resources", "icon-source.png"), iconOpaque);
  safeWrite(path.join(ROOT, "resources", "splash-source.png"), splashBuf);
  console.log(`sources: icon ${ICON_PX}px, splash ${SPLASH_W}x${SPLASH_H}`);

  const splashCount = await writeSplashAssets(splashBuf);
  await writeIcons(iconOpaque);
  console.log(`Done. splash dens=${splashCount}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
