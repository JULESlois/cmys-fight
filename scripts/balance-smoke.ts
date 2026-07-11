import assert from "node:assert/strict";
import fs from "node:fs";
import { BUFFS, BuffSystem, type BuffId } from "../src/game/combat/BuffSystem";
import { WeaponController } from "../src/game/combat/WeaponController";
import { CHARACTERS } from "../src/game/data/characters";
import { ENEMIES } from "../src/game/data/enemies";
import { WEAPONS } from "../src/game/data/weapons";
import { SPRITES } from "../src/game/data/sprites";
import { MAX_PLAYER_MANA, Player } from "../src/game/entities/Player";
import { GameData, RUN_SAVE_KEY } from "../src/game/GameData";
import { DEFAULT_KEY_BINDINGS, SETTINGS_VERSION, normalizeSettings } from "../src/game/Settings";
import { getWeaponBalanceMetrics, hasWeaponUtility } from "../src/game/WeaponBalance";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });

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

function loadV16CombatSave(options: {
  characterId: keyof typeof CHARACTERS;
  buffs?: BuffId[];
  maxMana: number;
  mana: number;
  manaRechargeDelay: number;
  manaRechargeRate: number;
}) {
  storage.clear();
  const legacy = new GameData();
  legacy.data.saveVersion = 16;
  legacy.data.player.characterId = options.characterId;
  legacy.data.player.buffs = options.buffs ?? [];
  legacy.data.player.maxMana = options.maxMana;
  legacy.data.player.mana = options.mana;
  legacy.data.player.manaRechargeDelay = options.manaRechargeDelay;
  legacy.data.player.manaRechargeRate = options.manaRechargeRate;
  storage.setItem(RUN_SAVE_KEY, JSON.stringify(legacy.data));

  const loaded = new GameData();
  assert.equal(loaded.load(), true);
  const persisted = JSON.parse(storage.getItem(RUN_SAVE_KEY) ?? "{}") as { saveVersion?: number };
  assert.equal(persisted.saveVersion, 17);
  return loaded.data.player;
}

const migratedKnight = loadV16CombatSave({
  characterId: "knight",
  maxMana: 90,
  mana: 90,
  manaRechargeDelay: 0.8,
  manaRechargeRate: 20,
});
assert.equal(migratedKnight.maxMana, 50);
assert.equal(migratedKnight.mana, 50);
assert.equal(migratedKnight.manaRechargeDelay, 1.35);
assert.equal(migratedKnight.manaRechargeRate, 9);

const migratedManaBuild = loadV16CombatSave({
  characterId: "knight",
  buffs: ["mana_well", "entropy_engine"],
  maxMana: 90,
  mana: 90,
  manaRechargeDelay: 0.8,
  manaRechargeRate: 20,
});
assert.equal(migratedManaBuild.maxMana, 80);
assert.equal(migratedManaBuild.mana, 80);
assert.ok(Math.abs(migratedManaBuild.manaRechargeDelay - 0.72) < 1e-9);
assert.equal(migratedManaBuild.manaRechargeRate, 15);

const migratedRogue = loadV16CombatSave({
  characterId: "rogue",
  buffs: ["mana_well"],
  maxMana: 120,
  mana: 120,
  manaRechargeDelay: 0.8,
  manaRechargeRate: 20,
});
assert.equal(migratedRogue.maxMana, 110);
assert.equal(migratedRogue.mana, 110);

const migratedMage = loadV16CombatSave({
  characterId: "mage",
  maxMana: 150,
  mana: 150,
  manaRechargeDelay: 1.25,
  manaRechargeRate: 12,
});
assert.equal(migratedMage.maxMana, MAX_PLAYER_MANA);
assert.equal(migratedMage.mana, MAX_PLAYER_MANA);
assert.equal(migratedMage.manaRechargeDelay, 1.35);
assert.equal(migratedMage.manaRechargeRate, 9);

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

const discountPlayer = new Player(0, 0);
discountPlayer.buffs = ["mana_well"];
BuffSystem.applyRuntimeStats(discountPlayer);
for (const weapon of Object.values(WEAPONS).filter(candidate => candidate.manaCost > 0)) {
  const expectedCost = weapon.manaCost * 0.8;
  assert.ok(
    Math.abs(WeaponController.getEnergyCost(discountPlayer, weapon.id) - expectedCost) < 1e-9,
    `${weapon.id} receives the full 20% energy discount`,
  );
  const discountedMetrics = getWeaponBalanceMetrics(weapon, discountPlayer.maxMana, 15, 0.9, 0.8);
  assert.ok(Math.abs(discountedMetrics.effectiveEnergyCost - expectedCost) < 1e-9);
}

discountPlayer.setWeaponLoadout(["laser"], 0);
discountPlayer.mana = 1;
discountPlayer.fireCooldown = 0;
const discountedShot = WeaponController.fire(discountPlayer, 0, () => 0.5);
assert.equal(discountedShot.fired, true);
assert.ok(Math.abs(discountPlayer.mana - 0.2) < 1e-9);
assert.equal(WeaponController.formatEnergyCost(0.8), "0.8");
assert.equal(WeaponController.formatEnergyCost(2), "2");

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
const spriteSignatures = new Set<string>();
for (const weapon of Object.values(WEAPONS)) {
  const id = weapon.id;
  assert.match(spriteSource, new RegExp(`weapon_${id}:`));
  const sprite = SPRITES[`weapon_${id}`];
  assert.ok(sprite, `${id} model exists`);
  assert.ok(sprite.length >= 16, `${id} has a full-height model`);
  assert.ok(sprite[0].length >= 16, `${id} has a readable silhouette`);
  assert.ok(sprite.every(row => row.length === sprite[0].length), `${id} sprite rows align`);
  assert.ok(Number.isFinite(weapon.renderOffsetX), `${id} has a weapon-specific render X`);
  assert.ok(Number.isFinite(weapon.renderOffsetY), `${id} has a weapon-specific render Y`);
  assert.ok(Number.isFinite(weapon.muzzleOffsetX), `${id} has a weapon-specific muzzle X`);
  assert.ok(Number.isFinite(weapon.muzzleOffsetY), `${id} has a weapon-specific muzzle Y`);
  assert.ok((weapon.muzzleOffsetX ?? 0) >= (weapon.renderOffsetX ?? 0) + 7, `${id} muzzle extends past the grip`);
  spriteSignatures.add(sprite.join("\n"));
}
assert.equal(spriteSignatures.size, Object.keys(WEAPONS).length, "all weapon silhouettes are distinct");
for (const id of ["pistol", "shotgun", "service_revolver", "nail_driver", "liberator", "vector_9"]) {
  assert.ok(SPRITES[`weapon_${id}`][0].length >= 20, `${id} keeps its expanded firearm silhouette`);
}

const inputSource = fs.readFileSync("src/game/Input.ts", "utf8");
const engineSource = fs.readFileSync("src/game/Engine.ts", "utf8");
const pauseSource = fs.readFileSync("src/game/render/PauseOverlayRenderer.ts", "utf8");
const hudSource = fs.readFileSync("src/game/render/UIRenderer.ts", "utf8");
assert.match(inputSource, /skill: \[1\]/);
assert.match(inputSource, /skill: "B"/);
assert.match(inputSource, /getCancelPrompt[\s\S]*return "B"/);
assert.match(inputSource, /setVirtualKey\("escape", pressed\(1\)\)/);
assert.match(engineSource, /wasActionPressed\("pause"\)[\s\S]*clearJustPressed\(\);[\s\S]*return;/);
assert.match(pauseSource, /WeaponController\.getEnergyCost/);
assert.match(hudSource, /WeaponController\.getEnergyCost/);

const report = Object.values(WEAPONS)
  .map(weapon => ({
    id: weapon.id,
    cost: weapon.manaCost,
    discountedCost: getWeaponBalanceMetrics(weapon, MAX_PLAYER_MANA, 15, 0.9, 0.8).effectiveEnergyCost,
    dps: metrics[weapon.id].directDps,
    energyPerSecond: metrics[weapon.id].energyPerSecond,
    burstSeconds: metrics[weapon.id].fullManaBurstSeconds,
    sustainedDps: metrics[weapon.id].sustainedCycleDps,
  }))
  .sort((a, b) => b.dps - a.dps);

const characterSustain = Object.fromEntries(
  Object.values(CHARACTERS).map(character => [
    character.id,
    Object.fromEntries(["laser", "tesla_carbine", "void_rail", "dragon_breath"].map(id => [
      id,
      getWeaponBalanceMetrics(WEAPONS[id], character.maxMana).sustainedCycleDps,
    ])),
  ]),
);

console.log(JSON.stringify({
  settingsMigration: "v6-v7",
  runMigration: "v16-v17",
  manaCap: MAX_PLAYER_MANA,
  manaDiscount: "fractional-20-percent",
  zeroEnergyCeiling: Math.max(...zeroEnergy.map(weapon => metrics[weapon.id].directDps)),
  areaRadii: areaEnemies.map(enemy => [enemy.id, enemy.areaRadius]),
  weaponModels: spriteSignatures.size,
  characterSustain,
  weaponBalance: report,
}));
