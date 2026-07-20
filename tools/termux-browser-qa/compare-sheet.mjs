import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const CHROMIUM = "/data/data/com.termux/files/usr/var/lib/proot-distro/installed-rootfs/debian/usr/lib/chromium/chromium-headless-shell";
const SCREENSHOTS_DIR = path.resolve("screenshots");

const pairs = [
  { ref: "reference/ref-forest.png", cur: "door-forest-h-open.png", label: "Forest" },
  { ref: "reference/ref-dungeon.png", cur: "door-dungeon-h-open.png", label: "Dungeon" },
  { ref: "reference/ref-snow.png", cur: "door-snow-h-open.png", label: "Snow" },
  { ref: "reference/ref-lava.png", cur: "door-lava-h-open.png", label: "Lava" },
];

const cellW = 320, cellH = 240, captionH = 20;
const cols = 2, rows = pairs.length;
const width = cols * cellW;
const height = rows * (cellH + captionH);

const images = [];
for (const p of pairs) {
  const refBuf = fs.readFileSync(path.join(SCREENSHOTS_DIR, p.ref));
  const curBuf = fs.readFileSync(path.join(SCREENSHOTS_DIR, p.cur));
  images.push({
    refUrl: "data:image/png;base64," + refBuf.toString("base64"),
    curUrl: "data:image/png;base64," + curBuf.toString("base64"),
    label: p.label,
  });
}

const browser = await puppeteer.launch({ executablePath: CHROMIUM, args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
await page.setViewport({ width, height });
await page.setContent('<html><body style="margin:0;background:#111;"></body></html>');

const result = await page.evaluate(async (opts) => {
  const { cellW, cellH, captionH, width, height, images } = opts;
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#111"; ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < images.length; i++) {
    const y = i * (cellH + captionH);
    const refImg = new Image();
    await new Promise((res, rej) => { refImg.onload = res; refImg.onerror = rej; refImg.src = images[i].refUrl; });
    ctx.drawImage(refImg, 0, y, cellW, cellH);
    const curImg = new Image();
    await new Promise((res, rej) => { curImg.onload = res; curImg.onerror = rej; curImg.src = images[i].curUrl; });
    ctx.drawImage(curImg, cellW, y, cellW, cellH);
    ctx.fillStyle = "#222"; ctx.fillRect(0, y + cellH, cellW, captionH);
    ctx.fillRect(cellW, y + cellH, cellW, captionH);
    ctx.fillStyle = "#eee"; ctx.font = "11px monospace"; ctx.textAlign = "center";
    ctx.fillText("REF " + images[i].label, cellW / 2, y + cellH + 14);
    ctx.fillText("CURRENT " + images[i].label, cellW + cellW / 2, y + cellH + 14);
  }
  return canvas.toDataURL("image/png");
}, { cellW, cellH, captionH, width, height, images });

const base64 = result.replace(/^data:image\/png;base64,/, "");
fs.writeFileSync(path.join(SCREENSHOTS_DIR, "door-reference-vs-current.png"), Buffer.from(base64, "base64"));
await browser.close();
console.log("generated: door-reference-vs-current.png");
