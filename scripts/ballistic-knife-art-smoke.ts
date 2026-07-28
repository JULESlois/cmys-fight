import assert from "node:assert/strict";
import fs from "node:fs";
import { WEAPON_ART_ANCHORS, WEAPON_PALETTES, WEAPON_SPRITES } from "../src/game/data/weaponArt";
import { WEAPONS } from "../src/game/data/weapons";

const weapon = WEAPONS.ballistic_knife;
const sprite = WEAPON_SPRITES.ballistic_knife;
const palette = WEAPON_PALETTES.ballistic_knife;
const anchor = WEAPON_ART_ANCHORS.ballistic_knife;

assert.equal(sprite.length, 16, "Ballistic Knife keeps a 16px held height");
assert.ok(sprite.every(row => row.length === 28), "Ballistic Knife keeps a 28px width");
assert.deepEqual(anchor, { grip: [10, 10], muzzle: [27, 7] }, "held alignment remains unchanged");
for (const color of ["#111820", "#5F6E79", "#C8D1D8", "#F2F5F7", "#D08B45"]) {
  assert.ok(Object.values(palette).includes(color), `palette includes ${color}`);
}

assert.equal(weapon.damage, 9);
assert.equal(weapon.fireRate, 1.1);
assert.equal(weapon.bulletSpeed, 320);
assert.equal(weapon.spread, 0);
assert.equal(weapon.manaCost, 0);
assert.equal(weapon.pierce, 3);
assert.equal(weapon.trailLength, 5);
assert.equal(weapon.spinRate, 20);

const renderer = fs.readFileSync("src/game/render/EntityRenderer.ts", "utf8");
const projectileRenderer = fs.readFileSync("src/game/render/ProjectileArtRenderer.ts", "utf8");
assert.match(renderer, /ballistic_knife[\s\S]*warm collar[\s\S]*visible dark rail gap/);
assert.match(renderer, /ballistic_knife[\s\S]*Silent spring release/);
const knifeBranch = projectileRenderer.match(/if \(p\.weaponId === "ballistic_knife"\)[\s\S]*?return;/)?.[0] ?? "";
assert.match(knifeBranch, /hitEnemyIds\.size/);
assert.match(knifeBranch, /spinRate only flips[\s\S]*circular silhouette/);
assert.doesNotMatch(knifeBranch, /ctx\.rotate\(p\.spinAngle\)/);

const concept = fs.readFileSync("docs/art-proposals/2026-07-28-ballistic-knife-redesign.svg", "utf8");
assert.match(concept, /<svg[^>]+width="1400"[^>]+height="900"[^>]+viewBox="0 0 1400 900"/);
for (const color of ["#111820", "#5f6e79", "#c8d1d8", "#f2f5f7", "#d08b45", "#efb54a"]) {
  assert.ok(concept.toLowerCase().includes(color), `concept includes ${color}`);
}

console.log(JSON.stringify({
  weapon: weapon.id,
  sprite: "28x16",
  states: ["ready", "fire"],
  projectile: "velocity-locked blade",
  pierceFeedbackLevels: 4,
  gameplayParameters: "preserved",
}));
