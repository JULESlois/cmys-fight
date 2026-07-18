import assert from "node:assert/strict";
import fs from "node:fs";
import type { WeaponSlots } from "../src/game/data/weapons";
import { Player } from "../src/game/entities/Player";
import { HUD_LAYOUT, rectsOverlap } from "../src/game/render/HudLayout";
import { WeaponHudRenderer } from "../src/game/render/WeaponHudRenderer";

interface DrawRect { x: number; y: number; width: number; height: number }
interface DrawText { text: string; x: number; y: number }

function createRecordingContext() {
  type Transform = { sx: number; sy: number; tx: number; ty: number };
  let transform: Transform = { sx: 1, sy: 1, tx: 0, ty: 0 };
  const stack: Transform[] = [];
  const rects: DrawRect[] = [];
  const texts: DrawText[] = [];
  const values: Record<string, unknown> = {};
  const target: Record<string, unknown> = {
    save() { stack.push({ ...transform }); },
    restore() { transform = stack.pop() ?? { sx: 1, sy: 1, tx: 0, ty: 0 }; },
    translate(x: number, y: number) {
      transform.tx += x * transform.sx;
      transform.ty += y * transform.sy;
    },
    scale(x: number, y: number) {
      transform.sx *= x;
      transform.sy *= y;
    },
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, rect() {}, clip() {}, fill() {}, stroke() {},
    fillRect(x: number, y: number, width: number, height: number) {
      const x1 = transform.tx + transform.sx * x;
      const x2 = transform.tx + transform.sx * (x + width);
      const y1 = transform.ty + transform.sy * y;
      const y2 = transform.ty + transform.sy * (y + height);
      rects.push({ x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) });
    },
    strokeRect(x: number, y: number, width: number, height: number) {
      (target.fillRect as (x: number, y: number, width: number, height: number) => void)(x, y, width, height);
    },
    fillText(text: string, x: number, y: number) {
      texts.push({ text, x: transform.tx + transform.sx * x, y: transform.ty + transform.sy * y });
    },
    measureText(text: string) { return { width: [...text].length * 4 }; },
  };
  const ctx = new Proxy(target, {
    get(object, property) {
      if (property in object) return object[property as string];
      if (property in values) return values[property as string];
      return () => {};
    },
    set(_object, property, value) {
      values[property as string] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, rects, texts };
}

function createPlayer(weaponIds: WeaponSlots, activeSlot: 0 | 1 = 0, mana = 33): Player {
  const player = new Player(160, 120);
  player.maxMana = 50;
  player.mana = mana;
  player.setWeaponLoadout(weaponIds, activeSlot);
  return player;
}

const scenarios = [
  { id: "energy-0", player: createPlayer(["na_45"], 0, 0), language: "en" as const },
  { id: "energy-33", player: createPlayer(["na_45"], 0, 33), language: "en" as const },
  { id: "single-cost", player: createPlayer(["ray_gun"], 0, 33), language: "en" as const },
  { id: "sustain", player: createPlayer(["terrarian"], 0, 33), language: "en" as const },
  { id: "heat", player: createPlayer(["mg42"], 0, 33), language: "en" as const },
  { id: "dual", player: createPlayer(["na_45", "shotgun"], 0, 33), language: "en" as const },
  {
    id: "long-en",
    player: createPlayer(["butterfly_emerald", "pistol"], 0, 33),
    language: "en" as const,
    activeNameOverride: "BUTTERFLY KNIFE GAMMA DOPPLER EMERALD PROTOTYPE",
  },
  {
    id: "long-zh",
    player: createPlayer(["butterfly_emerald", "pistol"], 0, 33),
    language: "zh-CN" as const,
    activeNameOverride: "蝴蝶刀伽马多普勒翡翠实验型超长名称",
  },
];

scenarios[4].player.weaponHeatWeaponId = "mg42";
scenarios[4].player.weaponHeat = 72;

const results = [];
for (const scenario of scenarios) {
  const recorder = createRecordingContext();
  WeaponHudRenderer.draw(recorder.ctx, scenario.player, scenario.language, {
    activeNameOverride: scenario.activeNameOverride,
  });
  assert.ok(recorder.rects.length > 0, `${scenario.id} draws HUD geometry`);
  assert.ok(
    recorder.rects.every(rect => rect.y + rect.height <= 235.001),
    `${scenario.id} never draws below y=235`,
  );
  assert.ok(
    recorder.texts.every(text => text.x >= HUD_LAYOUT.bottomRightWeapon.x - 1 && text.x <= 315),
    `${scenario.id} text remains in the right-side safe area`,
  );
  if (scenario.id.startsWith("long-")) {
    assert.ok(recorder.texts.some(text => text.text.endsWith("…")), `${scenario.id} is truncated`);
  }
  if (scenario.id === "sustain") {
    assert.ok(recorder.texts.some(text => /^-1\.5\/S$/.test(text.text)), "sustain rate is shown as -N/S");
  }
  if (scenario.id === "dual") {
    assert.equal(
      recorder.texts.some(text => text.text.includes("SHOTGUN")),
      false,
      "standby weapon full name is not rendered",
    );
    assert.ok(recorder.texts.some(text => text.text === "II"), "standby slot is shown compactly");
  }
  results.push({ id: scenario.id, rects: recorder.rects.length, texts: recorder.texts.map(text => text.text) });
}

assert.equal(HUD_LAYOUT.bottomRightWeapon.width, 96);
assert.equal(HUD_LAYOUT.bottomRightWeapon.height, 38);
assert.equal(HUD_LAYOUT.bottomRightWeapon.y + HUD_LAYOUT.bottomRightWeapon.height, 235);
assert.equal(rectsOverlap(HUD_LAYOUT.dungeonBottomNotice, HUD_LAYOUT.bottomRightWeapon), false);
assert.deepEqual(HUD_LAYOUT.hubBottomNotice, { x: 43, y: 207, width: 234, height: 23 });

const read = (path: string) => fs.readFileSync(path, "utf8");
const uiSource = read("src/game/render/UIRenderer.ts");
const hudSource = read("src/game/render/WeaponHudRenderer.ts");
const dungeonSource = read("src/game/states/DungeonState.ts");
const noticeRenderer = read("src/game/notice/WorldNoticeRenderer.ts");
assert.match(uiSource, /WeaponHudRenderer\.draw/);
assert.doesNotMatch(uiSource, /WEAPONS\[player\.currentWeaponId\]|Standby Weapon|FPS Style Weapon UI/);
assert.match(hudSource, /const cells = 14/);
assert.match(hudSource, /UI_COLORS\.cyan/);
assert.match(hudSource, /UI_COLORS\.yellow/);
assert.match(hudSource, /UI_COLORS\.red/);
assert.match(hudSource, /sustainEnergyPerSecond/);
assert.match(hudSource, /maxHeat/);
for (const scene of [
  "hud_energy_0", "hud_energy_33", "hud_single_cost", "hud_sustain", "hud_heat",
  "hud_dual", "hud_long_en", "hud_long_zh", "hud_notice",
]) assert.match(dungeonSource, new RegExp(`\\| "${scene}"`));
assert.match(noticeRenderer, /getBottomNoticeBounds\(scene\)/);

console.log(JSON.stringify({
  bounds: HUD_LAYOUT.bottomRightWeapon,
  energyCells: 14,
  scenarios: results.map(result => result.id),
  bottomNoticeOverlap: false,
  hubNoticePosition: "preserved",
  longNames: "ellipsis-clamped-en-and-zh",
}));

