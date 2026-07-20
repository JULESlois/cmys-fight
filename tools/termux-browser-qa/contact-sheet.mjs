import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const CHROMIUM = "/data/data/com.termux/files/usr/var/lib/proot-distro/installed-rootfs/debian/usr/lib/chromium/chromium-headless-shell";
const SCREENSHOTS_DIR = path.resolve("screenshots");

const DOOR_H_SHEET = {
  label: "door-horizontal-contact-sheet",
  columns: 2,
  images: [
    { file: "door-forest-h-open.png", caption: "Forest H Open" },
    { file: "door-forest-h-locked.png", caption: "Forest H Locked" },
    { file: "door-dungeon-h-open.png", caption: "Dungeon H Open" },
    { file: "door-dungeon-h-locked.png", caption: "Dungeon H Locked" },
    { file: "door-snow-h-open.png", caption: "Snow H Open" },
    { file: "door-snow-h-locked.png", caption: "Snow H Locked" },
    { file: "door-lava-h-open.png", caption: "Lava H Open" },
    { file: "door-lava-h-locked.png", caption: "Lava H Locked" },
  ],
};

const DOOR_V_SHEET = {
  label: "door-vertical-contact-sheet",
  columns: 2,
  images: [
    { file: "door-forest-v-open.png", caption: "Forest V Open" },
    { file: "door-forest-v-locked.png", caption: "Forest V Locked" },
    { file: "door-dungeon-v-open.png", caption: "Dungeon V Open" },
    { file: "door-dungeon-v-locked.png", caption: "Dungeon V Locked" },
    { file: "door-snow-v-open.png", caption: "Snow V Open" },
    { file: "door-snow-v-locked.png", caption: "Snow V Locked" },
    { file: "door-lava-v-open.png", caption: "Lava V Open" },
    { file: "door-lava-v-locked.png", caption: "Lava V Locked" },
  ],
};

async function generateSheet(browser, sheet) {
  const cellW = 320;
  const cellH = 240;
  const captionH = 20;
  const cols = sheet.columns;
  const rows = Math.ceil(sheet.images.length / cols);
  const width = cols * cellW;
  const height = rows * (cellH + captionH);

  const imageDataUrls = [];
  for (const img of sheet.images) {
    const buf = fs.readFileSync(path.join(SCREENSHOTS_DIR, img.file));
    imageDataUrls.push({ dataUrl: `data:image/png;base64,${buf.toString("base64")}`, caption: img.caption });
  }

  const page = await browser.newPage();
  await page.setViewport({ width, height });
  await page.setContent(`<html><body style="margin:0;background:#111;"></body></html>`);

  const result = await page.evaluate(async (opts) => {
    const { cellW, cellH, captionH, cols, width, height, images } = opts;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < images.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * cellW;
      const y = row * (cellH + captionH);

      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = images[i].dataUrl;
      });
      ctx.drawImage(img, x, y, cellW, cellH);

      ctx.fillStyle = "#222";
      ctx.fillRect(x, y + cellH, cellW, captionH);
      ctx.fillStyle = "#eee";
      ctx.font = "12px monospace";
      ctx.textAlign = "center";
      ctx.fillText(images[i].caption, x + cellW / 2, y + cellH + 14);
    }

    return canvas.toDataURL("image/png");
  }, { cellW, cellH, captionH, cols, width, height, images: imageDataUrls });

  const base64 = result.replace(/^data:image\/png;base64,/, "");
  const outPath = path.join(SCREENSHOTS_DIR, `${sheet.label}.png`);
  fs.writeFileSync(outPath, Buffer.from(base64, "base64"));
  await page.close();
  return outPath;
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROMIUM,
    args: ["--no-sandbox", "--disable-gpu", "--disable-software-rasterizer"],
  });

  for (const sheet of [DOOR_H_SHEET, DOOR_V_SHEET]) {
    const outPath = await generateSheet(browser, sheet);
    console.log(`  generated: ${path.basename(outPath)}`);
  }

  await browser.close();
  console.log("Contact sheets done.");
}

main().catch(err => {
  console.error("Contact sheet failed:", err.message);
  process.exit(1);
});
