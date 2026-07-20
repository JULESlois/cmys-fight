import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const CHROMIUM = "/data/data/com.termux/files/usr/var/lib/proot-distro/installed-rootfs/debian/usr/lib/chromium/chromium-headless-shell";
const PORT = process.env.CAPTURE_PORT || "3199";
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = path.resolve("screenshots");

const DOOR_SCENES = [
  { scene: "forest_up_open", theme: "forest", label: "door-forest-open" },
  { scene: "forest_up_locked", theme: "forest", label: "door-forest-locked" },
  { scene: "dungeon_left_open", theme: "dungeon", label: "door-dungeon-open" },
  { scene: "dungeon_left_locked", theme: "dungeon", label: "door-dungeon-locked" },
  { scene: "snow_down_open", theme: "snow", label: "door-snow-open" },
  { scene: "snow_down_locked", theme: "snow", label: "door-snow-locked" },
  { scene: "lava_right_open", theme: "lava", label: "door-lava-open" },
  { scene: "lava_right_locked", theme: "lava", label: "door-lava-locked" },
];

const CHEST_SCENES = [
  { scene: "treasure_closed", theme: "dungeon", label: "chest-treasure-closed" },
  { scene: "treasure_open", theme: "dungeon", label: "chest-treasure-open" },
  { scene: "boss_chest_open", theme: "dungeon", label: "chest-boss-open" },
  { scene: "treasure_open_with_multiple_loot", theme: "dungeon", label: "chest-treasure-multi-loot" },
];

const ALL_SCENES = [...DOOR_SCENES, ...CHEST_SCENES];

async function captureScene(browser, scene) {
  const url = `${BASE_URL}/?qa=1&qaScene=${scene.scene}&qaTheme=${scene.theme}&qaCapture=1`;
  const page = await browser.newPage();
  await page.setViewport({ width: 640, height: 480 });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });

  await page.waitForFunction(
    () => document.documentElement.dataset.qaReady === "1",
    { timeout: 10000 }
  );
  await new Promise(r => setTimeout(r, 200));

  const dataUrl = await page.evaluate(() => window.__CMYS_QA__.capturePng());
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  const outPath = path.join(OUT_DIR, `${scene.label}.png`);
  fs.writeFileSync(outPath, Buffer.from(base64, "base64"));
  await page.close();
  return outPath;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const res = await fetch(`${BASE_URL}/api/health`);
  if (!res.ok) throw new Error(`Server not reachable at ${BASE_URL}`);
  console.log("Server ready, launching browser...");

  const browser = await puppeteer.launch({
    executablePath: CHROMIUM,
    args: ["--no-sandbox", "--disable-gpu", "--disable-software-rasterizer"],
  });

  const results = [];
  for (const scene of ALL_SCENES) {
    await captureScene(browser, scene);
    results.push(scene.label);
    console.log(`  captured: ${scene.label}`);
  }

  await browser.close();
  console.log(JSON.stringify({ captured: results, count: results.length, outDir: OUT_DIR }));
}

main().catch(err => {
  console.error("Capture failed:", err.message);
  process.exit(1);
});
