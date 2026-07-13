import assert from "node:assert/strict";
import fs from "node:fs";
import { APP_VERSION } from "../src/version";
import { audio } from "../src/game/audio/AudioManager";
import { QA_MUSIC_SCENES, QA_STAGE_PRESETS, isQaMode } from "../src/game/qa/BrowserQa";
import { isDebugMode } from "../src/game/DebugTools";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
assert.equal(packageJson.version, APP_VERSION);
assert.equal(APP_VERSION, "0.27.0");

assert.deepEqual(QA_STAGE_PRESETS.map(preset => preset.stage), [1, 5, 9, 13, 16]);
assert.equal(new Set(QA_MUSIC_SCENES).size, 16);
assert.ok(QA_MUSIC_SCENES.includes("boss"));
assert.ok(QA_MUSIC_SCENES.includes("combat_lava"));

const musicConfig = JSON.parse(fs.readFileSync("public/music-tracks.json", "utf8"));
assert.equal(typeof musicConfig.tracks, "object");
for (const scene of QA_MUSIC_SCENES) assert.ok(scene in musicConfig.tracks, `Missing music slot: ${scene}`);

const diagnostics = audio.getDiagnostics();
assert.equal(diagnostics.supported, false);
assert.equal(diagnostics.source, "unsupported");
assert.deepEqual(await audio.probeExternalFallback(), { passed: false, source: "unsupported" });

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { location: { search: "?qa=1" } },
});
assert.equal(isQaMode(), true);
assert.equal(isDebugMode(), true);
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { location: { search: "" } },
});
assert.equal(isQaMode(), false);
Reflect.deleteProperty(globalThis, "window");

const gameCanvas = fs.readFileSync("src/components/GameCanvas.tsx", "utf8");
assert.match(gameCanvas, /data-testid="game-canvas"/);
assert.match(gameCanvas, /installQaBridge/);
assert.match(gameCanvas, /<QaPanel/);

const qaPanel = fs.readFileSync("src/components/QaPanel.tsx", "utf8");
assert.match(qaPanel, /data-testid="qa-run-checks"/);
assert.match(qaPanel, /EXTERNAL FALLBACK/);
assert.match(qaPanel, /SCREENSHOT/);
assert.match(qaPanel, /window\.__CMYS_QA__/);

const serviceWorker = fs.readFileSync("public/sw.js", "utf8");
assert.match(serviceWorker, new RegExp(`cmys-fight-v${APP_VERSION.replaceAll(".", "\\.")}`));
assert.match(serviceWorker, /music-tracks\.json/);

const server = fs.readFileSync("server.ts", "utf8");
assert.match(server, /APP_VERSION/);

console.log(JSON.stringify({
  browserQaBridge: "ok",
  qaPanel: "ok",
  audioDiagnostics: "ok",
  externalFallbackContract: "ok",
  versionContract: APP_VERSION,
}));
