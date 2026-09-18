import assert from "node:assert/strict";
import fs from "node:fs";
import { BossHealthBarRenderer } from "../src/game/render/BossHealthBarRenderer";
import { HUD_LAYOUT } from "../src/game/render/HudLayout";
import { ToastSystem, archivedToastText } from "../src/game/ui/ToastSystem";
import { BUFFS, type BuffId } from "../src/game/combat/BuffSystem";
import { GameData } from "../src/game/GameData";
import { t } from "../src/game/i18n";

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

/** Minimal recording context: BossHealthBarRenderer only fills/strokes/texts. */
function recordingContext() {
  const calls: { op: string; text?: string }[] = [];
  const ctx = {
    fillStyle: "", strokeStyle: "", lineWidth: 1, textAlign: "left", font: "",
    save() { calls.push({ op: "save" }); },
    restore() { calls.push({ op: "restore" }); },
    fillRect() { calls.push({ op: "fillRect" }); },
    strokeRect() { calls.push({ op: "strokeRect" }); },
    fillText(_text: string, _x: number, _y: number) { calls.push({ op: "fillText", text: _text }); },
  } as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

// ---------------------------------------------------------------------------
// Boss health bar: layout stays inside the free top-center band.
// ---------------------------------------------------------------------------
const bar = (BossHealthBarRenderer as any).BAR as { x: number; y: number; width: number; height: number };
const status = HUD_LAYOUT.topLeftStatus;
const minimap = HUD_LAYOUT.topRightMinimap;
assert.ok(bar.x >= status.x + status.width, "bar starts right of the status panel");
assert.ok(
  bar.y + bar.height <= minimap.y || bar.x + bar.width <= minimap.x,
  "bar never overlaps the minimap reservation",
);
assert.ok(bar.x >= 0 && bar.x + bar.width <= 320 && bar.y >= 0 && bar.y + bar.height <= 240, "bar stays on screen");

// Draw: name is uppercased, and no draw happens without a boss id reset leak.
BossHealthBarRenderer.reset();
const first = recordingContext();
BossHealthBarRenderer.draw(first.ctx, {
  enemyId: "forest_guardian",
  name: "Forest Guardian",
  hp: 80,
  maxHp: 100,
  phase: 1,
}, { language: "en", nowMs: 1000, reducedFlashing: false });
assert.ok(
  first.calls.some(call => call.op === "fillText" && call.text === "FOREST GUARDIAN"),
  "boss name renders uppercased",
);

// Switching boss resets the pulse baseline instead of flashing on spawn.
const second = recordingContext();
BossHealthBarRenderer.draw(second.ctx, {
  enemyId: "frost_titan",
  name: "Frost Titan",
  hp: 300,
  maxHp: 300,
  phase: 1,
}, { language: "en", nowMs: 1001, reducedFlashing: false });
assert.ok(
  second.calls.some(call => call.op === "fillText" && call.text === "FROST TITAN"),
  "second boss draws after reset",
);
BossHealthBarRenderer.reset();

// ---------------------------------------------------------------------------
// Toast queue: capped, clearable, localized.
// ---------------------------------------------------------------------------
ToastSystem.clear();
for (let index = 0; index < 6; index++) ToastSystem.push(`note-${index}`);
assert.equal(ToastSystem.pending().length, 4, "queue caps at 4 entries");
assert.equal(ToastSystem.pending()[0].text, "note-2", "oldest entries drop first");
ToastSystem.clear();
assert.equal(ToastSystem.pending().length, 0, "clear empties the queue");

assert.equal(archivedToastText("Laser", "en"), t("en", "toast.archived", { name: "Laser" }));
assert.ok(archivedToastText("Laser", "en").includes("Laser"), "english toast embeds the name");
assert.ok(archivedToastText("Laser", "zh-CN").includes("Laser"), "chinese toast embeds the name");

// ---------------------------------------------------------------------------
// Codex discovery reports novelty so callers can toast.
// ---------------------------------------------------------------------------
const data = new GameData();
assert.equal(data.discoverWeapon("laser"), true, "first weapon discovery is new");
assert.equal(data.discoverWeapon("laser"), false, "repeat weapon discovery is not new");
const buffId = Object.keys(BUFFS)[0] as BuffId;
assert.equal(data.discoverBuff(buffId), true, "first buff discovery is new");
assert.equal(data.discoverBuff(buffId), false, "repeat buff discovery is not new");

// ---------------------------------------------------------------------------
// Source contracts: wiring and the playShoot unification regression.
// ---------------------------------------------------------------------------
const read = (path: string) => fs.readFileSync(path, "utf8");
const dungeon = read("src/game/states/DungeonState.ts");
const hud = read("src/game/render/UIRenderer.ts");
assert.match(dungeon, /BossHealthBarRenderer\.draw\(/, "dungeon draws the boss bar while a boss lives");
assert.match(dungeon, /enemies\.find\(e => e\.type === "boss" && e\.hp > 0\)/, "boss lookup gates on hp");
assert.match(dungeon, /ToastSystem\.draw\(/, "dungeon renders toasts");
assert.match(dungeon, /ToastSystem\.clear\(\)/, "dungeon clears toasts on exit");
assert.match(dungeon, /BossHealthBarRenderer\.reset\(\)/, "boss bar resets on exit");
assert.match(dungeon, /drawLowHealthWarning\(/, "dungeon renders the low HP warning");
assert.match(hud, /hp \/ maxHp > 0\.25\) return/, "low HP gate triggers at 25%");

for (const statePath of ["src/game/states/SettingsState.ts", "src/game/states/HubState.ts", "src/game/states/RebirthLoadoutState.ts"]) {
  const source = read(statePath);
  assert.doesNotMatch(source, /playShoot\(\)/, `${statePath} uses UI sounds, not the weapon shot`);
}

// Settings visuals: shared palette, no hardcoded legacy colors, slider meters.
const settings = read("src/game/states/SettingsState.ts");
assert.doesNotMatch(settings, /#00F2FE/, "settings uses UI_COLORS, not the legacy cyan");
assert.match(settings, /drawPixelButton\(/, "settings root rows use the shared button primitive");
assert.match(settings, /drawMeter\(ctx, 196/, "numeric settings render a value meter");
assert.match(settings, /cursorPulse\(/, "settings rows breathe like the pause menu");

console.log("[hud-feedback-smoke] ok — boss vitals, toasts, low HP warning, settings restyle");
