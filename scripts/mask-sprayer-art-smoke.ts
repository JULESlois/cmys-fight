import assert from "node:assert/strict";
import fs from "node:fs";
import { WEAPON_ART_ANCHORS, WEAPON_PALETTES, WEAPON_SPRITES } from "../src/game/data/weaponArt";
import { WEAPONS } from "../src/game/data/weapons";

const sprite = WEAPON_SPRITES.mask_sprayer;
assert.equal(sprite.length, 18, "Mask Sprayer preserves 18px sprite height");
assert.ok(sprite.every(row => row.length === 25), "Mask Sprayer preserves 25px sprite width");
assert.equal(sprite[5][5], "2", "left mask eye remains dark");
assert.equal(sprite[5][8], "2", "right mask eye remains dark");
assert.equal(sprite[7][7], "2", "nose bridge remains readable at 1x");
assert.notEqual(sprite[5][22], ".", "upper condensation vane exists");
assert.notEqual(sprite[10][22], ".", "lower condensation vane exists");
assert.notEqual(sprite[8][24], ".", "muzzle channel reaches the anchor");
assert.deepEqual(WEAPON_ART_ANCHORS.mask_sprayer, { grip: [12, 13], muzzle: [24, 7] });

assert.deepEqual(WEAPON_PALETTES.mask_sprayer, {
  ".": "transparent", "1": "#080B10", "2": "#0B1116", "3": "#8BA2AD",
  "4": "#D9E4E8", "5": "#263844", "6": "#7FE7F3", "7": "#D9F8FF",
  "8": "#F2C35F", "9": "#EF6B63",
});

const weapon = WEAPONS.mask_sprayer;
assert.equal(weapon.damage, 1); assert.equal(weapon.fireRate, 2.2); assert.equal(weapon.spread, 0.68);
assert.equal(weapon.pelletCount, 8); assert.equal(weapon.maxHeat, 100); assert.equal(weapon.heatPerShot, 15);
assert.equal(weapon.heatDecayRate, 35); assert.equal(weapon.overheatLockout, 2.5);
assert.equal(weapon.projectileLife, 1.05); assert.equal(weapon.statusEffect, "slow"); assert.equal(weapon.statusDuration, 1.2);

const renderer = fs.readFileSync("src/game/render/EntityRenderer.ts", "utf8");
for (const pattern of [/drawMaskSprayerState/, /heatRatio >= 0\.7/, /overheatTimer > 0/, /#F2C35F/, /#EF6B63/, /rgba\(127,231,243/, /currentWeaponId === "mask_sprayer"/]) {
  assert.match(renderer, pattern);
}

const concept = fs.readFileSync("docs/art-proposals/2026-07-27-mask-sprayer-redesign.svg", "utf8");
assert.match(concept, /width="1200" height="800" viewBox="0 0 1200 800"/);
for (const color of ["#0b1116", "#d9e4e8", "#7fe7f3", "#f2c35f", "#ef6b63"]) assert.ok(concept.toLowerCase().includes(color));

console.log(JSON.stringify({ weapon: weapon.id, sprite: "25x18", states: ["idle", "high-heat", "overheated", "cooling"] }));
