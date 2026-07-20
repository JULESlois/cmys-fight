import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const CHROMIUM = "/data/data/com.termux/files/usr/var/lib/proot-distro/installed-rootfs/debian/usr/lib/chromium/chromium-headless-shell";
const SCREENSHOTS_DIR = path.resolve("screenshots");

const DOOR_SHEET = {
  label: "door-contact-sheet",
  columns: 2,
  images: [
    { file: "door-forest-open.png", caption: "Forest Open" },
    { file: "door-forest-locked.png", caption: "Forest Locked" },
    { file: "door-dungeon-open.png", caption: "Dungeon Open" },
    { file: "door-dungeon-locked.png", caption: "Dungeon Locked" },
    { file: "door-snow-open.png", caption: "Snow Open" },
    { file: "door-snow-locked.png", caption: "Snow Locked" },
    { file: "door-lava-open.png", caption: "Lava Open" },
    { file: "door-lava-locked.png", caption: "Lava Locked" },
  ],
};

const CHEST_SHEET = {
  label: "chest-contact-sheet",
  columns: 2,
  images: [
    { file: "chest-treasure-closed.png", caption: "Treasure Closed" },
    { file: "chest-treasure-open.png", caption: "Treasure Open" },
    { file: "chest-boss-open.png", caption: "Boss Open" },
    { file: "chest-treasure-multi-loot.png", caption: "Multi Loot" },
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

  for (const sheet of [DOOR_SHEET, CHEST_SHEET]) {
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
