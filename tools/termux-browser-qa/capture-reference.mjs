import puppeteer from "puppeteer-core";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CHROMIUM = "/data/data/com.termux/files/usr/var/lib/proot-distro/installed-rootfs/debian/usr/lib/chromium/chromium-headless-shell";
const REF_DIR = "/data/data/com.termux/files/home/cmys-fight-reference";
const PORT = 3200;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = path.resolve("screenshots/reference");

const STAGES = [
  { stage: 1, theme: "forest", label: "ref-forest" },
  { stage: 5, theme: "dungeon", label: "ref-dungeon" },
  { stage: 9, theme: "snow", label: "ref-snow" },
  { stage: 13, theme: "lava", label: "ref-lava" },
];

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url + "/api/health");
      if (res.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error("Server did not start in time");
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const server = spawn("node", ["dist/server.cjs"], {
    cwd: REF_DIR,
    stdio: "pipe",
    env: { ...process.env, PORT: String(PORT) },
  });

  try {
    await waitForServer(BASE_URL);
    console.log("Reference server ready, launching browser...");

    const browser = await puppeteer.launch({
      executablePath: CHROMIUM,
      args: ["--no-sandbox", "--disable-gpu", "--disable-software-rasterizer"],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 640, height: 480 });
    await page.goto(`${BASE_URL}/?qa=1`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    for (const { stage, label } of STAGES) {
      await page.evaluate((s) => {
        const qa = window.__CMYS_QA__;
        qa.switchState("dungeon");
        qa.jumpToStage(s);
      }, stage);
      await new Promise(r => setTimeout(r, 1500));

      const dataUrl = await page.evaluate(() => window.__CMYS_QA__.capturePng());
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
      fs.writeFileSync(path.join(OUT_DIR, `${label}.png`), Buffer.from(base64, "base64"));
      console.log(`  captured: ${label}`);
    }

    await browser.close();
    console.log(JSON.stringify({ captured: STAGES.map(s => s.label), outDir: OUT_DIR }));
  } finally {
    server.kill("SIGTERM");
  }
}

main().catch(err => {
  console.error("Reference capture failed:", err.message);
  process.exit(1);
});
