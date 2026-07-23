import assert from "node:assert/strict";
import fs from "node:fs";
import { Engine } from "../src/game/Engine";
import { GameData } from "../src/game/GameData";
import { createDefaultSettings, normalizeSettings, SETTINGS_VERSION } from "../src/game/Settings";
import { MenuState } from "../src/game/states/MenuState";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
}
Object.defineProperty(globalThis, "localStorage", { value: new MemoryStorage(), configurable: true });

const data = new GameData();
data.startNewRun("knight", "pistol", false);
data.data.run.routeDepth = 1;
data.data.run.stageWithinNode = 3;
data.data.player.coins = 77;
const runBefore = { ...data.data.run };
let prepared = 0;
let overlayClosed = 0;
let switched: { state: string; params?: unknown } | null = null;
const returnHarness = {
  states: { dungeon: { prepareForSave() { prepared++; } } },
  currentState: "dungeon",
  data,
  isPaused: true,
  closeOverlayInternal() { overlayClosed++; },
  switchState(state: string, params?: unknown) { switched = { state, params }; },
};
(Engine.prototype.returnToHubFromRun as Function).call(returnHarness);
assert.equal(prepared, 1, "Dungeon state prepares before returning to Hub");
assert.equal(overlayClosed, 1, "menu overlay closes before Hub transition");
assert.deepEqual(switched, { state: "hub", params: { spawnAnchor: "rebirth_spring" } });
assert.equal(returnHarness.isPaused, false);
assert.equal(data.data.run.routeDepth, runBefore.routeDepth);
assert.equal(data.data.run.stageWithinNode, runBefore.stageWithinNode);
assert.equal(data.data.run.worldNodeId, runBefore.worldNodeId);
assert.equal(data.data.run.hardMode, runBefore.hardMode);
assert.equal(data.data.runStats.outcome, "active", "returning to Hub does not settle the Run");
assert.equal(data.hasValidSave(), true, "active Run remains resumable at the expedition gate");

let menuReturnCalls = 0;
const menu = new MenuState({
  input: {},
  data: { settings: { language: "en" } },
  returnToHubFromRun() { menuReturnCalls++; },
} as any) as any;
menu.enter();
menu.selection = 3;
menu.handleSelect();
assert.equal(menuReturnCalls, 1, "pause menu quit uses the unified Hub return");

let rebuildTarget = "";
let rebuildParams: unknown;
let resetCalls = 0;
const resetHarness = {
  data: { resetAll() { resetCalls++; } },
  rebuildStateAfterDataChange(state: string, mutate: () => void, params?: unknown) {
    rebuildTarget = state;
    rebuildParams = params;
    mutate();
  },
};
(Engine.prototype.resetGameFromMenu as Function).call(resetHarness);
assert.equal(resetCalls, 1);
assert.equal(rebuildTarget, "hub");
assert.deepEqual(rebuildParams, { spawnAnchor: "rebirth_spring" });

assert.equal(SETTINGS_VERSION, 9);
const defaults = createDefaultSettings() as unknown as Record<string, unknown>;
assert.equal("crtFilter" in defaults, false, "GameSettings no longer contains crtFilter");
const migrated = normalizeSettings({ version: 7, crtFilter: true, masterVolume: 70 }) as unknown as Record<string, unknown>;
assert.equal(migrated.version, 9);
assert.equal(migrated.masterVolume, 70);
assert.equal("crtFilter" in migrated, false, "legacy crtFilter is ignored during migration");

const engineSource = fs.readFileSync("src/game/Engine.ts", "utf8");
const menuSource = fs.readFileSync("src/game/states/MenuState.ts", "utf8");
const settingsSource = fs.readFileSync("src/game/states/SettingsState.ts", "utf8");
const characterSource = fs.readFileSync("src/game/states/RebirthLoadoutState.ts", "utf8");
const recordsSource = fs.readFileSync("src/game/states/RecordsState.ts", "utf8");
const hubSource = fs.readFileSync("src/game/states/HubState.ts", "utf8");
const artSource = fs.readFileSync("src/game/render/ArtDirectionRenderer.ts", "utf8");
const titleSource = fs.readFileSync("src/game/states/TitleState.ts", "utf8");
const i18nSource = fs.readFileSync("src/game/i18n.ts", "utf8");
const canvasSource = fs.readFileSync("src/components/GameCanvas.tsx", "utf8");

for (const [name, source] of [
  ["Engine", engineSource],
  ["MenuState", menuSource],
  ["GameCanvas", canvasSource],
] as const) {
  assert.doesNotMatch(source, /switchState\("title"\)/, `${name} normal flow must not enter TitleState`);
}
assert.match(settingsSource, /private backState: "title" \| "hub" = "hub"/);
assert.match(characterSource, /getHubLoadout\(\)/);
assert.doesNotMatch(characterSource, /backState|hubMode|startNewRun/);
assert.match(recordsSource, /private backState: "title" \| "hub" = "hub"/);
assert.match(hubSource, /action === "continue"[\s\S]*switchState\("dungeon"\)/, "expedition gate can continue active Run");
assert.match(hubSource, /action === "start"[\s\S]*getHubLoadout\(\)[\s\S]*startNewRun\(loadout\.characterId, loadout\.starterWeaponId\)/);
assert.doesNotMatch(hubSource, /switchState\("character_select"/);
assert.doesNotMatch(hubSource, /hub\.runReady|hub\.noRun/);
for (const [name, source] of [
  ["Engine", engineSource],
  ["SettingsState", settingsSource],
  ["i18n", i18nSource],
] as const) assert.doesNotMatch(source, /crtFilter|settings\.crtFilter/, `${name} must not retain CRT settings`);
assert.doesNotMatch(engineSource, /for \(let y = 0; y < 240; y \+= 4\)/);
assert.doesNotMatch(artSource, /y \+= 23/);
assert.doesNotMatch(titleSource, /Scanlines|for\s*\(let i=0; i<240; i\+=4\)/);

console.log(JSON.stringify({
  pauseQuit: "hub-rebirth-spring",
  activeRunPreserved: true,
  expeditionContinue: "dungeon",
  resetTarget: "hub-rebirth-spring",
  normalTitleReachability: "compatibility-only",
  settingsVersion: SETTINGS_VERSION,
  crtFilter: "removed-and-v7-field-ignored",
  scanlines: "engine-combat-title-removed",
}));
