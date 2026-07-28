import assert from "node:assert/strict";
import { WEAPON_ART_ANCHORS, WEAPON_PALETTES, WEAPON_SPRITES } from "../src/game/data/weaponArt";
import { WEAPONS } from "../src/game/data/weapons";
import { getBellRepeaterArtMetrics } from "../src/game/render/BellRepeaterArt";

const sprite = WEAPON_SPRITES.bell_repeater;
assert.equal(sprite.length, 17);
assert.ok(sprite.every(row => row.length === 28));
assert.deepEqual(WEAPON_ART_ANCHORS.bell_repeater, { grip: [11, 12], muzzle: [27, 8] });
for (const color of ["#6B4A32", "#A97845", "#4E5966", "#9C6A20", "#D4A438", "#FFF3B0"]) {
  assert.ok(Object.values(WEAPON_PALETTES.bell_repeater).includes(color));
}
assert.equal(WEAPONS.bell_repeater.magazineSize, 25);
const idleA = getBellRepeaterArtMetrics({ time: 0, resourceRatio: 1, reloadProgress: 0, shotCount: 1, muzzleFlash: 0 });
const idleB = getBellRepeaterArtMetrics({ time: 0.3, resourceRatio: 1, reloadProgress: 0, shotCount: 1, muzzleFlash: 0 });
assert.notEqual(idleA.clapperOffset, idleB.clapperOffset, "monotonic render time animates the idle clapper");
assert.equal(getBellRepeaterArtMetrics({ time: 0, resourceRatio: 0.2, reloadProgress: 0, shotCount: 1, muzzleFlash: 0 }).lowAmmo, true);
assert.equal(getBellRepeaterArtMetrics({ time: 0, resourceRatio: 1, reloadProgress: 0, shotCount: 3, muzzleFlash: 1 }).accentShot, true);
assert.deepEqual([0.1, 0.5, 0.9].map(reloadProgress => getBellRepeaterArtMetrics({ time: 0, resourceRatio: 0, reloadProgress, shotCount: 0, muzzleFlash: 0 }).reloadStage), [1, 2, 3]);
console.log("ding-dong repeater art smoke passed");
