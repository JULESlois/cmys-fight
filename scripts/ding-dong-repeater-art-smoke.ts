import assert from "node:assert/strict";
import fs from "node:fs";
import { WEAPON_ART_ANCHORS, WEAPON_PALETTES, WEAPON_SPRITES } from "../src/game/data/weaponArt";
import { WEAPONS } from "../src/game/data/weapons";
import { getBellRepeaterArtMetrics } from "../src/game/render/BellRepeaterArt";

const id = "bell_repeater";
const sprite = WEAPON_SPRITES[id];
const palette = WEAPON_PALETTES[id];
const anchor = WEAPON_ART_ANCHORS[id];
const weapon = WEAPONS[id];

assert.equal(sprite.length, 17, "Ding-Dong Repeater keeps a 17px-tall low-resolution canvas");
assert.ok(sprite.every(row => row.length === 28), "Ding-Dong Repeater uses a 28x17 canvas");
assert.equal(anchor.muzzle[0], 27, "muzzle anchor terminates at the tuning-fork centerline");
assert.equal(anchor.muzzle[1], 8, "muzzle anchor remains on the projectile axis");
assert.notEqual(sprite[7][14], ".", "bell clapper remains visible at 1x scale");
assert.equal(sprite[7][26], "1", "tuning-fork muzzle preserves a dark negative-space channel");
assert.notEqual(sprite[13][17], ".", "box magazine remains visually present");

for (const expected of ["#6B4A32", "#A97845", "#4E5966", "#9C6A20", "#D4A438", "#FFF3B0"]) {
  assert.ok(Object.values(palette).includes(expected), `palette contains ${expected}`);
}

assert.equal(weapon.damage, 2);
assert.equal(weapon.fireRate, 6.8);
assert.equal(weapon.magazineSize, 25);
assert.equal(weapon.reloadTime, 1.5);
assert.equal(weapon.projectileStyle, "tracer");
assert.equal(weapon.trailLength, 15);

const idleA = getBellRepeaterArtMetrics({ time: 0, resourceRatio: 1, reloadProgress: 0, shotCount: 1, muzzleFlash: 0 });
const idleB = getBellRepeaterArtMetrics({ time: 0.3, resourceRatio: 1, reloadProgress: 0, shotCount: 1, muzzleFlash: 0 });
assert.notEqual(idleA.clapperOffset, idleB.clapperOffset, "clapper has a deterministic 1.2s idle swing");
assert.equal(getBellRepeaterArtMetrics({ time: 0, resourceRatio: 0.2, reloadProgress: 0, shotCount: 1, muzzleFlash: 0 }).lowAmmo, true);
assert.equal(getBellRepeaterArtMetrics({ time: 0, resourceRatio: 0.21, reloadProgress: 0, shotCount: 1, muzzleFlash: 0 }).lowAmmo, false);
assert.equal(getBellRepeaterArtMetrics({ time: 0, resourceRatio: 1, reloadProgress: 0, shotCount: 3, muzzleFlash: 1 }).accentShot, true);
assert.equal(getBellRepeaterArtMetrics({ time: 0, resourceRatio: 1, reloadProgress: 0, shotCount: 2, muzzleFlash: 1 }).accentShot, false);
assert.deepEqual([0.1, 0.5, 0.9].map(reloadProgress => getBellRepeaterArtMetrics({ time: 0, resourceRatio: 0, reloadProgress, shotCount: 0, muzzleFlash: 0 }).reloadStage), [1, 2, 3]);

const concept = fs.readFileSync("docs/art-proposals/2026-07-27-ding-dong-repeater-redesign.svg", "utf8");
assert.match(concept, /width="1200" height="800" viewBox="0 0 1200 800"/);
assert.match(concept, /#6b4a32/i);
assert.match(concept, /#d4a438/i);
assert.match(concept, /#4e5966/i);

console.log(JSON.stringify({
  weapon: id,
  canvas: "28x17",
  silhouette: ["bell-receiver", "tuning-fork-muzzle", "box-magazine"],
  states: ["idle-swing", "third-shot-accent", "low-ammo", "three-stage-reload"],
  gameplay: "unchanged",
}));
