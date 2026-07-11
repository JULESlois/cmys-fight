import assert from "node:assert/strict";
import fs from "node:fs";
import { BUFFS, BuffSystem } from "../src/game/combat/BuffSystem";
import { CHARACTERS } from "../src/game/data/characters";
import { ENEMIES } from "../src/game/data/enemies";
import { WEAPONS } from "../src/game/data/weapons";
import { SPRITES } from "../src/game/data/sprites";
import { MAX_PLAYER_MANA, Player } from "../src/game/entities/Player";
import { DEFAULT_KEY_BINDINGS, SETTINGS_VERSION, normalizeSettings } from "../src/game/Settings";
import { getWeaponBalanceMetrics, hasWeaponUtility } from "../src/game/WeaponBalance";

assert.equal(SETTINGS_VERSION, 7);
assert.deepEqual(DEFAULT_KEY_BINDINGS, {
  moveUp: "w", moveDown: "s", moveLeft: "a", moveRight: "d",
  fire: "j", skill: "l", interact: "k", swapWeapon: "i", pause: "escape",
});
const v6Defaults = {
  moveUp: "w", moveDown: "s", moveLeft: "a", moveRight: "d",
  fire: "j", skill: "k", interact: "l", swapWeapon: "i", pause: "escape",
} as const;
assert.deepEqual(normalizeSettings({ version: 6, keyBindings: v6Defaults }).keyBindings, DEFAULT_KEY_BINDINGS);
const v6Custom = normalizeSettings({ version: 6, keyBindings: { ...v6Defaults, skill: "u" } });
assert.equal(v6Custom.keyBindings.skill, "u");
assert.equal(v6Custom.keyBindings.interact, "l");

assert.equal(MAX_PLAYER_MANA, 120);
assert.equal(CHARACTERS.mage.maxMana, MAX_PLAYER_MANA);
const manaPlayer = new Player(0, 0);
manaPlayer.maxMana = 110;
manaPlayer.mana = 0;
assert.equal(BuffSystem.acquire(manaPlayer, "mana_well"), true);
assert.equal(manaPlayer.maxMana, MAX_PLAYER_MANA);
assert.equal(manaPlayer.mana, 10);
assert.equal(manaPlayer.manaRechargeRate, 15);
assert.ok(manaPlayer.manaRechargeDelay < 1);

const forbiddenTalentPhrases = [
  /fire rate/i,
  /projectiles?\s*[+]/i,
  /[+]\d+ projectiles?/i,
  /[+]\d+% damage/i,
  /damage and knockback/i,
];
for (const buff of Object.values(BUFFS)) {
  for (const pattern of forbiddenTalentPhrases) {
    assert.doesNotMatch(buff.description, pattern, `${buff.id} must not directly rewrite base weapon output`);
  }
}
const modifiers = BuffSystem.getWeaponModifiers(new Player(0, 0));
assert.equal("damageMultiplier" in modifiers, false);
assert.equal("fireRateMultiplier" in modifiers, false);
assert.equal("extraPellets" in modifiers, false);
assert.ok("critChanceBonus" in modifiers);
assert.ok("critDamageBonus" in modifiers);
assert.ok("spreadMultiplier" in modifiers);

const metrics = Object.fromEntries(
  Object.values(WEAPONS).map(weapon => [weapon.id, getWeaponBalanceMetrics(weapon, MAX_PLAYER_MANA)]),
);
const zeroEnergy = Object.values(WEAPONS).filter(weapon => weapon.manaCost === 0);
for (const weapon of zeroEnergy) {
  assert.ok(metrics[weapon.id].directDps <= 12.5, `${weapon.id} free DPS ${metrics[weapon.id].directDps}`);
}
assert.ok(metrics.vector_9.directDps <= metrics.laser.directDps * 0.55);
assert.ok(metrics.nail_driver.directDps < metrics.plasma_caster.directDps);
assert.ok(metrics.service_revolver.directDps < metrics.kingmaker.directDps);
assert.ok(metrics.liberator.directDps < metrics.void_rail.directDps);
for (const id of ["kingmaker", "storm_repeater", "starfall_array", "dragon_breath"]) {
  assert.ok(metrics[id].directDps <= 33, `${id} legendary direct DPS ${metrics[id].directDps}`);
}

for (const weapon of Object.values(WEAPONS).filter(weapon => weapon.manaCost >= 3)) {
  assert.ok(
    metrics[weapon.id].directDps > 12 || hasWeaponUtility(weapon),
    `${weapon.id} needs burst output or meaningful utility`,
  );
  assert.ok(metrics[weapon.id].fullManaBurstSeconds !== null);
}

const areaEnemies = Object.values(ENEMIES).filter(enemy => enemy.behavior === "area");
assert.equal(areaEnemies.length, 4);
for (const enemy of areaEnemies) assert.ok((enemy.areaRadius ?? 999) <= 24);

const enemyFactory = fs.readFileSync("src/game/EnemyFactory.ts", "utf8");
const renderer = fs.readFileSync("src/game/render/EntityRenderer.ts", "utf8");
assert.match(enemyFactory, /definition\.role === "boss" \? 0\.72 : 0\.66/);
assert.match(renderer, /enemy\.isElite \? 1\.62 : 1\.42/);
assert.match(renderer, /enemy\.type === "boss"\) scale = 2\.15/);
assert.match(renderer, /weapon\?\.renderOffsetX/);
assert.match(renderer, /weapon\?\.muzzleOffsetX/);

const spriteSource = fs.readFileSync("src/game/data/sprites.ts", "utf8");
for (const id of ["pistol", "shotgun", "service_revolver", "nail_driver", "liberator", "vector_9"]) {
  assert.match(spriteSource, new RegExp(`weapon_${id}:`));
  const sprite = SPRITES[`weapon_${id}`];
  assert.ok(sprite, `${id} model exists`);
  assert.ok(sprite[0].length >= 20, `${id} silhouette is wider than the legacy placeholder`);
  assert.ok(sprite.every(row => row.length === sprite[0].length), `${id} sprite rows align`);
  assert.ok((WEAPONS[id].muzzleOffsetX ?? 0) >= 19, `${id} has a weapon-specific muzzle position`);
}

const inputSource = fs.readFileSync("src/game/Input.ts", "utf8");
const engineSource = fs.readFileSync("src/game/Engine.ts", "utf8");
assert.match(inputSource, /skill: \[1\]/);
assert.match(inputSource, /skill: "B"/);
assert.match(inputSource, /getCancelPrompt[\s\S]*return "B"/);
assert.match(inputSource, /setVirtualKey\("escape", pressed\(1\)\)/);
assert.match(engineSource, /wasActionPressed\("pause"\)[\s\S]*clearJustPressed\(\);[\s\S]*return;/);

const report = Object.values(WEAPONS)
  .map(weapon => ({
    id: weapon.id,
    cost: weapon.manaCost,
    dps: metrics[weapon.id].directDps,
    energyPerSecond: metrics[weapon.id].energyPerSecond,
    burstSeconds: metrics[weapon.id].fullManaBurstSeconds,
    sustainedDps: metrics[weapon.id].sustainedCycleDps,
  }))
  .sort((a, b) => b.dps - a.dps);

console.log(JSON.stringify({
  settingsMigration: "v6-v7",
  manaCap: MAX_PLAYER_MANA,
  zeroEnergyCeiling: Math.max(...zeroEnergy.map(weapon => metrics[weapon.id].directDps)),
  areaRadii: areaEnemies.map(enemy => [enemy.id, enemy.areaRadius]),
  weaponBalance: report,
}));
