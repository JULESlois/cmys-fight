import assert from "node:assert/strict";
import fs from "node:fs";
import { WEAPON_ART_ANCHORS, WEAPON_PALETTES, WEAPON_SPRITES } from "../src/game/data/weaponArt";
import { WEAPONS } from "../src/game/data/weapons";

const sprite = WEAPON_SPRITES.swab_lance;
const palette = WEAPON_PALETTES.swab_lance;
const weapon = WEAPONS.swab_lance;

assert.equal(sprite.length, 16, "Swab Lance preserves 16px sprite height");
assert.ok(sprite.every(row => row.length === 30), "Swab Lance preserves 30px sprite width");
assert.deepEqual(WEAPON_ART_ANCHORS.swab_lance.muzzle, [29, 8], "muzzle anchor remains unchanged");
assert.equal(weapon.chargeSlots, 3, "three-slot gameplay remains unchanged");
assert.equal(weapon.projectileRadius, 4, "projectile collision radius remains unchanged");
assert.equal(weapon.acceleration, 75, "acceleration remains unchanged");
assert.equal(weapon.trailLength, 18, "configured full trail remains unchanged");

for (const color of ["#0B1017", "#384654", "#C8D5DE", "#E8F5FB", "#63D7FF", "#23303D", "#F0B35A"]) {
  assert.ok(Object.values(palette).includes(color), `palette includes ${color}`);
}

const entityRenderer = fs.readFileSync("src/game/render/EntityRenderer.ts", "utf8");
const projectileRenderer = fs.readFileSync("src/game/render/ProjectileArtRenderer.ts", "utf8");
const concept = fs.readFileSync("docs/art-proposals/2026-07-27-swab-lance-redesign.svg", "utf8");

assert.match(entityRenderer, /drawSwabLanceState/);
assert.match(entityRenderer, /resourceState\.value/);
assert.match(entityRenderer, /customState\.chargeTimer/);
assert.match(projectileRenderer, /drawSwabLanceProjectile/);
assert.match(projectileRenderer, /speed - 128/);
assert.match(projectileRenderer, /p\.trailLength - 4/);
assert.match(concept, /viewBox="0 0 1280 860"/);

console.log(JSON.stringify({
  weapon: weapon.id,
  sprite: "30x16",
  chargeSlots: weapon.chargeSlots,
  muzzle: WEAPON_ART_ANCHORS.swab_lance.muzzle,
  projectile: {
    radius: weapon.projectileRadius,
    acceleration: weapon.acceleration,
    fullTrail: weapon.trailLength,
  },
  states: ["3-charge", "2-charge", "1-charge", "empty", "recovering", "accelerating-projectile"],
}));
