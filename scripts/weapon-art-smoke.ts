import assert from "node:assert/strict";
import fs from "node:fs";
import { WEAPONS } from "../src/game/data/weapons";
import {
  WEAPON_ART_ANCHORS,
  WEAPON_PALETTES,
  WEAPON_SPRITES,
  getWeaponArtOffsets,
} from "../src/game/data/weaponArt";
import { SPRITES, SPRITE_PALETTES } from "../src/game/data/sprites";
import { SpriteRenderer } from "../src/game/render/SpriteRenderer";

const weaponIds = Object.keys(WEAPONS).sort();
assert.deepEqual(Object.keys(WEAPON_SPRITES).sort(), weaponIds, "every weapon must use the authored art registry");
assert.deepEqual(Object.keys(WEAPON_PALETTES).sort(), weaponIds, "every weapon must use an independent palette");
assert.deepEqual(Object.keys(WEAPON_ART_ANCHORS).sort(), weaponIds, "every weapon must define grip and muzzle anchors");

const signatures = new Set<string>();
const dimensions = new Set<string>();
for (const id of weaponIds) {
  const rows = WEAPON_SPRITES[id];
  const palette = WEAPON_PALETTES[id];
  const anchor = WEAPON_ART_ANCHORS[id];
  const width = rows[0]?.length ?? 0;
  const height = rows.length;
  assert.ok(width >= 18 && width <= 32, `${id} width ${width}`);
  assert.ok(height >= 16 && height <= 18, `${id} height ${height}`);
  assert.ok(rows.every(row => row.length === width), `${id} rows must align`);
  assert.strictEqual(SPRITES[`weapon_${id}`], rows, `${id} runtime sprite must use the authored registry`);
  assert.strictEqual(SPRITE_PALETTES[`weapon_${id}`], palette, `${id} runtime palette must use the authored registry`);

  const usedPixels = new Set(rows.join(""));
  usedPixels.delete(".");
  assert.ok(usedPixels.has("1"), `${id} needs a dark authored outline`);
  for (const pixel of usedPixels) {
    assert.ok(pixel in palette, `${id} palette is missing pixel ${pixel}`);
    assert.match(palette[pixel], /^#[0-9A-F]{6}$/i, `${id} pixel ${pixel} must use an explicit RGB color`);
  }
  const materialColors = [...usedPixels].filter(pixel => pixel !== "1");
  assert.ok(materialColors.length >= 3, `${id} needs at least three material/highlight colors`);

  const visible = rows.join("").replaceAll(".", "").length;
  const occupancy = visible / (width * height);
  assert.ok(occupancy >= 0.25 && occupancy <= 0.8, `${id} occupancy ${occupancy.toFixed(3)}`);

  assert.ok(anchor.grip[0] >= 0 && anchor.grip[0] < width, `${id} grip X`);
  assert.ok(anchor.grip[1] >= 0 && anchor.grip[1] < height, `${id} grip Y`);
  assert.ok(anchor.muzzle[0] >= 0 && anchor.muzzle[0] < width, `${id} muzzle X`);
  assert.ok(anchor.muzzle[1] >= 0 && anchor.muzzle[1] < height, `${id} muzzle Y`);
  assert.ok(anchor.muzzle[0] > anchor.grip[0], `${id} must face right in authored coordinates`);

  const offsets = getWeaponArtOffsets(id);
  assert.ok(offsets, `${id} offsets`);
  assert.equal(WEAPONS[id].renderOffsetX, offsets?.renderOffsetX, `${id} render X derives from grip`);
  assert.equal(WEAPONS[id].renderOffsetY, offsets?.renderOffsetY, `${id} render Y derives from grip`);
  assert.equal(WEAPONS[id].muzzleOffsetX, offsets?.muzzleOffsetX, `${id} muzzle X derives from art`);
  assert.equal(WEAPONS[id].muzzleOffsetY, offsets?.muzzleOffsetY, `${id} muzzle Y derives from art`);
  assert.ok((WEAPONS[id].muzzleOffsetX ?? 0) >= 10, `${id} muzzle must clear the player body`);
  assert.ok(Math.abs(WEAPONS[id].muzzleOffsetY ?? 0) <= 8, `${id} firing axis must stay near the held weapon`);

  const signature = rows.join("\n");
  assert.equal(signatures.has(signature), false, `${id} must not reuse another silhouette`);
  signatures.add(signature);
  dimensions.add(`${width}x${height}`);
}
assert.ok(dimensions.size >= 10, "weapon art must use varied canvases instead of one universal box");

const sourceDriven = [
  "ballistic_knife", "olympia", "ksg_12", "akimbo_scorpion", "scavenger", "venom_x", "ray_gun", "wunderwaffe",
  "minishark", "water_bolt", "stardust_dragon_staff", "terrarian", "last_prism", "zenith",
];
for (const id of sourceDriven) assert.ok(WEAPON_SPRITES[id], `${id} source-derived model`);

for (const id of ["last_prism", "zenith"]) {
  const used = new Set(WEAPON_SPRITES[id].join("").replace(/[.1]/g, ""));
  assert.ok(used.size >= 7, `${id} must preserve its multicolor identity`);
}
assert.equal(WEAPON_PALETTES.ray_gun["4"], "#BD442B");
assert.equal(WEAPON_PALETTES.ray_gun["5"], "#D7E53C");
assert.equal(WEAPON_PALETTES.venom_x["5"], "#75DB49");
assert.equal(WEAPON_PALETTES.wunderwaffe["5"], "#5DE7F2");

const renderedColors = new Set<string>();
const ctx = {
  save() {}, restore() {}, translate() {}, scale() {},
  fillRect() { renderedColors.add(currentFill); },
  font: "",
  fillText() {},
  get fillStyle() { return currentFill; },
  set fillStyle(value: string | CanvasGradient | CanvasPattern) { currentFill = String(value); },
} as unknown as CanvasRenderingContext2D;
let currentFill = "";
SpriteRenderer.drawPixelSprite(ctx, "weapon_ray_gun", 0, 0, 1);
assert.ok(renderedColors.has("#BD442B"), "Ray Gun renderer must use its red receiver color");
assert.ok(renderedColors.has("#D7E53C"), "Ray Gun renderer must use its luminous chamber color");

const spriteSource = fs.readFileSync("src/game/data/sprites.ts", "utf8");
assert.doesNotMatch(spriteSource, /^\s+weapon_[a-z0-9_]+:\s*\[/m, "legacy inline weapon sprites must stay removed");
assert.match(spriteSource, /\.\.\.WEAPON_SPRITE_ENTRIES/);

console.log(JSON.stringify({
  weaponModels: weaponIds.length,
  uniqueSilhouettes: signatures.size,
  canvasVariants: dimensions.size,
  sourceDriven: sourceDriven.length,
  independentPalettes: Object.keys(WEAPON_PALETTES).length,
  authoredAnchors: Object.keys(WEAPON_ART_ANCHORS).length,
  multicolorFinalWeapons: "ok",
  runtimePaletteRouting: "ok",
}));
