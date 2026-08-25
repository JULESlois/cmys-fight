import assert from "node:assert/strict";
import { DEEP_THEMES, PALETTES } from "../src/game/data/palettes";
import { getBaseTheme } from "../src/game/render/RoomRenderer";
import { quantizedAlpha, rampAlpha, ditheredAlpha, getDitherCacheSize, resetDitherCache } from "../src/game/render/DitherRamp";
import { collectBuildingLights, getRegisteredLightCount } from "../src/game/hub/HubLightRenderer";

// ---------------------------------------------------------------------------
// Palette completeness: 4 base + 8 deep themes, all with the 9-key contract.
// ---------------------------------------------------------------------------
const PALETTE_KEYS = ["bg", "wall", "floor", "hazard1", "hazard2", "bridge", "portal", "player", "enemy"] as const;
const BASE_THEMES = ["forest", "dungeon", "snow", "lava"];

for (const theme of [...BASE_THEMES, ...Object.keys(DEEP_THEMES)]) {
  const palette = PALETTES[theme];
  assert.ok(palette, `missing palette for ${theme}`);
  for (const key of PALETTE_KEYS) {
    const value = palette[key];
    assert.ok(typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value), `${theme}.${key} must be a #rrggbb hex`);
  }
}
assert.equal(Object.keys(DEEP_THEMES).length, 9, "nine deep-route themes");

// Every deep theme maps to a valid base theme.
for (const [deep, base] of Object.entries(DEEP_THEMES)) {
  assert.ok(BASE_THEMES.includes(base), `${deep} maps to a base theme`);
  assert.equal(getBaseTheme(deep), base, `getBaseTheme(${deep}) === ${base}`);
}
for (const base of BASE_THEMES) {
  assert.equal(getBaseTheme(base), base, `getBaseTheme passes base themes through`);
}

// ---------------------------------------------------------------------------
// DitherRamp pure math: ramp interpolation, quantization, Bayer thresholding.
// ---------------------------------------------------------------------------
const twoStops = [
  { at: 0, alpha: 0.2 },
  { at: 1, alpha: 0.8 },
];
assert.equal(rampAlpha(twoStops, 0), 0.2, "ramp starts at first stop");
assert.equal(rampAlpha(twoStops, 1), 0.8, "ramp ends at last stop");
assert.equal(rampAlpha(twoStops, 0.5), 0.5, "ramp interpolates linearly");
assert.equal(rampAlpha(twoStops, 2), 0.8, "ramp clamps past the last stop");

const oneStop = [{ at: 0, alpha: 0.4 }];
assert.equal(rampAlpha(oneStop, 0.5), 0.4, "single stop is constant");

assert.equal(quantizedAlpha(0.9, 4), 1, "0.9 quantizes to full level");
assert.equal(quantizedAlpha(0.3, 4), 1 / 3, "0.3 quantizes to 1/3");
assert.equal(quantizedAlpha(-1, 4), 0, "negative alpha clamps to 0");

// Bayer output must be exactly 0 or a discrete quantized level.
for (let y = 0; y < 8; y++) {
  for (let x = 0; x < 8; x++) {
    const value = ditheredAlpha(x, y, 0.5, 4);
    assert.ok(value === 0 || value === 1 / 3 || value === 2 / 3 || value === 1, `dithered alpha must be 0 or a level, got ${value}`);
  }
}

// Coverage across a full tile approximates the *quantized* level (0.5 -> 2/3
// at 4 levels), within one Bayer step.
const ditheredCoverage = (() => {
  let lit = 0;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (ditheredAlpha(x, y, 0.5, 4) > 0) lit++;
    }
  }
  return lit / (16 * 16);
})();
const quantized = quantizedAlpha(0.5, 4);
assert.ok(
  ditheredCoverage > quantized - 0.1 && ditheredCoverage < quantized + 0.1,
  `coverage should track quantized level ${quantized}, got ${ditheredCoverage.toFixed(2)}`,
);

// Canvas cache is inert without a document (smoke runs headless).
resetDitherCache();
assert.equal(getDitherCacheSize(), 0, "no canvas cache created without a DOM");

// ---------------------------------------------------------------------------
// Hub building lights: every module registered; world conversion + dedupe.
// ---------------------------------------------------------------------------
assert.equal(getRegisteredLightCount(), 7, "all seven building art modules declare lights");

const map = {
  objects: [
    {
      properties: {
        kind: "hub_structure_part",
        structureId: "rebirth_spring",
        artModule: "rebirth_spring",
        originX: 100,
        originY: 50,
      },
    },
    // Duplicate part of the same building must not double-register lights.
    {
      properties: {
        kind: "hub_structure_part",
        structureId: "rebirth_spring",
        artModule: "rebirth_spring",
        originX: 100,
        originY: 50,
      },
    },
  ],
} as any;

const lights = collectBuildingLights(map);
assert.equal(lights.length, 6, "rebirth spring declares six light sources");
assert.equal(new Set(lights.map(light => `${light.x},${light.y}`)).size, 6, "lights are unique");
const crystal = lights.find(light => light.color === "#7EF4FF");
assert.ok(crystal, "crystal light present");
assert.equal(crystal.x, 172, "local x 72 + origin x 100 = 172");
assert.equal(crystal.y, 69, "local y 19 + origin y 50 = 69");
assert.ok(crystal.intensity > 0.5, "crystal is the strongest source");

console.log("[atmosphere-art-smoke] ok — palettes, dither math, hub lights");
