import assert from "node:assert/strict";
import fs from "node:fs";
import { WEAPONS } from "../src/game/data/weapons";
import {
  LEFT_FACING_REFERENCE_SPRITES,
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

const expectedLeftFacingReferences = [
  "aa_12",
  "ak47_wild_lotus",
  "awp_dragon_lore",
  "bp50",
  "cx_9",
  "inspector",
  "ksg_12",
  "mx_guardian",
  "na_45",
  "olympia",
  "r9_0",
  "scavenger",
  "so_14",
];
assert.deepEqual(
  [...LEFT_FACING_REFERENCE_SPRITES].sort(),
  expectedLeftFacingReferences,
  "all left-facing source references must be mirrored exactly once",
);
assert.equal(
  (LEFT_FACING_REFERENCE_SPRITES as readonly string[]).includes("minishark"),
  false,
  "Minishark source art already faces right and must not be mirrored",
);

for (const id of [
  "r9_0", "minishark", "mx_guardian", "cx_9", "mg42", "bp50", "na_45",
  "so_14", "aa_12", "awp_dragon_lore", "ak47_wild_lotus",
]) {
  const rows = WEAPON_SPRITES[id];
  const anchor = WEAPON_ART_ANCHORS[id];
  assert.notEqual(rows[anchor.grip[1]][anchor.grip[0]], ".", `${id} grip must touch the authored weapon`);
  let nearestMuzzlePixel = Number.POSITIVE_INFINITY;
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      if (rows[y][x] === ".") continue;
      nearestMuzzlePixel = Math.min(
        nearestMuzzlePixel,
        Math.hypot(x - anchor.muzzle[0], y - anchor.muzzle[1]),
      );
    }
  }
  assert.ok(nearestMuzzlePixel <= 1, `${id} muzzle must terminate at the right-facing barrel edge`);
}

const barrelAxisAudit: Record<string, { fromX: number; toX: number; axisY: number; tolerance: number }> = {
  mg42: { fromX: 18, toX: 31, axisY: 7, tolerance: 1 },
  finale: { fromX: 21, toX: 31, axisY: 7, tolerance: 1 },
  bp50: { fromX: 19, toX: 31, axisY: 7, tolerance: 1 },
};
for (const [id, audit] of Object.entries(barrelAxisAudit)) {
  const rows = WEAPON_SPRITES[id];
  const centers: Array<{ x: number; y: number }> = [];
  for (let x = audit.fromX; x <= audit.toX; x++) {
    const ys: number[] = [];
    for (let y = 0; y < rows.length; y++) {
      if (Math.abs(y - audit.axisY) <= audit.tolerance + 1 && rows[y][x] !== ".") ys.push(y);
    }
    if (ys.length > 0) centers.push({ x, y: ys.reduce((sum, y) => sum + y, 0) / ys.length });
  }
  assert.ok(centers.length >= audit.toX - audit.fromX - 1, `${id} barrel must remain continuous`);
  const meanX = centers.reduce((sum, point) => sum + point.x, 0) / centers.length;
  const meanY = centers.reduce((sum, point) => sum + point.y, 0) / centers.length;
  const numerator = centers.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0);
  const denominator = centers.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0) || 1;
  const slope = numerator / denominator;
  assert.ok(Math.abs(slope) <= 0.08, `${id} barrel axis must be horizontal, got slope ${slope}`);
  assert.ok(Math.abs(meanY - audit.axisY) <= audit.tolerance, `${id} barrel must stay on authored aim axis`);
}

const slenderLongGunAudit = ["mg42", "finale", "bp50", "storm_repeater"];
for (const id of slenderLongGunAudit) {
  const rows = WEAPON_SPRITES[id];
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  const columnThickness: number[] = [];
  for (let x = 0; x < rows[0].length; x++) {
    let thickness = 0;
    for (let y = 0; y < rows.length; y++) {
      if (rows[y][x] === ".") continue;
      thickness++;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    columnThickness.push(thickness);
  }
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const coreStart = Math.floor(minX + width * 0.25);
  const coreEnd = Math.ceil(minX + width * 0.75);
  const coreColumns = columnThickness.slice(coreStart, coreEnd + 1).filter(value => value > 0);
  const averageCoreThickness = coreColumns.reduce((sum, value) => sum + value, 0) / coreColumns.length;
  assert.ok(width >= 28, `${id} must retain a long-gun silhouette`);
  assert.ok(height / width <= 0.47, `${id} must remain visually slender, got ${(height / width).toFixed(3)}`);
  assert.ok(averageCoreThickness <= 9.5, `${id} receiver is too thick: ${averageCoreThickness.toFixed(2)}`);
}

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
  "r9_0", "mx_guardian", "cx_9", "mg42", "bp50", "na_45",
  "so_14", "aa_12", "awp_dragon_lore", "ak47_wild_lotus", "inspector", "finale", "polaris",
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
assert.equal(WEAPON_PALETTES.awp_dragon_lore["6"], "#5E7F3A");
assert.equal(WEAPON_PALETTES.awp_dragon_lore["7"], "#F0D27A");
assert.equal(WEAPON_PALETTES.ak47_wild_lotus["7"], "#E75A92");
assert.equal(WEAPON_PALETTES.ak47_wild_lotus["8"], "#F0A6C0");
assert.equal(WEAPON_PALETTES.inspector["5"], "#70D7FF");
assert.equal(WEAPON_PALETTES.inspector["6"], "#E8F5FF");
assert.equal(WEAPON_PALETTES.finale["6"], "#F06CA8");
assert.equal(WEAPON_PALETTES.polaris["5"], "#E9F2FA");
assert.equal(WEAPON_PALETTES.polaris["6"], "#8FDFFF");

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
  rightFacingReferenceAudit: "ok",
  levelBarrelAudit: "ok",
  slenderLongGunAudit: slenderLongGunAudit.length,
  multicolorFinalWeapons: "ok",
  runtimePaletteRouting: "ok",
}));
