import assert from "node:assert/strict";
import fs from "node:fs";
import { WEAPON_ART_ANCHORS, WEAPON_PALETTES, WEAPON_SPRITES } from "../src/game/data/weaponArt";
import { WEAPONS } from "../src/game/data/weapons";

const sprite = WEAPON_SPRITES.mask_sprayer;
assert.equal(sprite.length, 18);
assert.ok(sprite.every(row => row.length === 25));
assert.deepEqual(WEAPON_ART_ANCHORS.mask_sprayer, { grip: [12, 13], muzzle: [24, 7] });
assert.equal(sprite[5][5], "2"); assert.equal(sprite[5][8], "2"); assert.equal(sprite[7][7], "2");
for (const color of ["#0B1116", "#D9E4E8", "#7FE7F3", "#F2C35F", "#EF6B63"]) {
  assert.ok(Object.values(WEAPON_PALETTES.mask_sprayer).includes(color));
}
assert.equal(WEAPONS.mask_sprayer.maxHeat, 100);
const source = fs.readFileSync("src/game/render/EntityRenderer.ts", "utf8");
assert.match(source, /drawMaskSprayerState/);
assert.match(source, /heatRatio >= 0\.7/);
assert.match(source, /const pulse = 0\.5 \+ 0\.5 \* Math\.sin\(time \* 3\.5\)/);
assert.match(source, /currentWeaponId === "mask_sprayer"/);
console.log("mask sprayer art smoke passed");
