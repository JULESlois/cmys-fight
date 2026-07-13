import assert from "node:assert/strict";
import fs from "node:fs";
import { BUFFS, BuffSystem, type BuffId } from "../src/game/combat/BuffSystem";
import { StatusEffectSystem } from "../src/game/combat/StatusEffectSystem";
import { WeaponController } from "../src/game/combat/WeaponController";
import { ENEMY_ATTACK_RATE_MULTIPLIER, getStageDifficulty } from "../src/game/combat/StageDifficulty";
import { CHARACTERS } from "../src/game/data/characters";
import { ENEMIES, getEnemyDefinition } from "../src/game/data/enemies";
import { ROOM_TEMPLATES } from "../src/game/data/roomTemplates";
import { WEAPONS } from "../src/game/data/weapons";
import { SPRITES } from "../src/game/data/sprites";
import { MAX_PLAYER_MANA, Player } from "../src/game/entities/Player";
import { EnemyFactory } from "../src/game/EnemyFactory";
import { EncounterFactory, isCrampedCombatTemplate } from "../src/game/EncounterFactory";
import { EnvironmentSystem } from "../src/game/environment/EnvironmentSystem";
import { acquirePickup } from "../src/game/EntityPools";
import { DungeonState } from "../src/game/states/DungeonState";
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

assert.equal(MAX_PLAYER_MANA, 80);
assert.deepEqual(
  Object.fromEntries(Object.values(CHARACTERS).map(character => [character.id, {
    maxMana: character.maxMana,
    rate: character.manaRechargeRate,
    delay: character.manaRechargeDelay,
  }])),
  {
    knight: { maxMana: 25, rate: 10, delay: 0.85 },
    mage: { maxMana: 60, rate: 12, delay: 1.1 },
    michele: { maxMana: 42, rate: 10, delay: 1.1 },
    kanami: { maxMana: 48, rate: 10, delay: 1.2 },
    celestia: { maxMana: 52, rate: 11, delay: 1.05 },
    rogue: { maxMana: 40, rate: 9, delay: 1.35 },
  },
);

const manaPlayer = new Player(0, 0);
assert.equal(manaPlayer.maxMana, 25);
assert.equal(manaPlayer.manaRechargeRate, 10);
assert.equal(manaPlayer.manaRechargeDelay, 0.85);
assert.equal(BuffSystem.acquire(manaPlayer, "capacitor_cell"), true);
assert.equal(manaPlayer.maxMana, 33);
assert.equal(manaPlayer.mana, 33);
assert.equal(BuffSystem.acquire(manaPlayer, "mana_well"), true);
assert.equal(manaPlayer.maxMana, 45);
assert.equal(manaPlayer.mana, 45);
assert.ok(Math.abs(manaPlayer.manaRechargeDelay - 0.6375) < 1e-9);
assert.equal(BuffSystem.acquire(manaPlayer, "flux_regulator"), true);
assert.equal(manaPlayer.manaRechargeRate, 12.5);

const capacityOrderA = new Player(0, 0);
capacityOrderA.characterId = "rogue";
BuffSystem.applyRuntimeStats(capacityOrderA);
BuffSystem.acquire(capacityOrderA, "capacitor_cell");
BuffSystem.acquire(capacityOrderA, "mana_well");
const capacityOrderB = new Player(0, 0);
capacityOrderB.characterId = "rogue";
BuffSystem.applyRuntimeStats(capacityOrderB);
BuffSystem.acquire(capacityOrderB, "mana_well");
BuffSystem.acquire(capacityOrderB, "capacitor_cell");
assert.equal(capacityOrderA.maxMana, 60);
assert.equal(capacityOrderB.maxMana, 60);

const mageCapacity = new Player(0, 0);
mageCapacity.characterId = "mage";
BuffSystem.applyRuntimeStats(mageCapacity);
mageCapacity.mana = mageCapacity.maxMana;
BuffSystem.acquire(mageCapacity, "capacitor_cell");
BuffSystem.acquire(mageCapacity, "mana_well");
assert.equal(mageCapacity.maxMana, MAX_PLAYER_MANA);
assert.equal(mageCapacity.mana, MAX_PLAYER_MANA);

const energyRestorePlayer = new Player(0, 0);
energyRestorePlayer.buffs = ["energy_feedback", "skill_loop", "entropy_engine"];
assert.equal(BuffSystem.getSkillEnergyRestore(energyRestorePlayer), 12);
assert.equal(BuffSystem.getKillEnergyRestore(energyRestorePlayer), 2);
assert.ok(Math.abs(BuffSystem.getSkillCooldownMultiplier(energyRestorePlayer) - 0.75) < 1e-9);

function loadLegacyCombatSave(options: {
  saveVersion?: number;
  characterId: keyof typeof CHARACTERS;
  buffs?: BuffId[];
  maxMana: number;
  mana: number;
  manaRechargeDelay: number;
  manaRechargeRate: number;
}) {
  storage.clear();
  const legacy = new GameData();
  legacy.data.saveVersion = options.saveVersion ?? 17;
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
  assert.equal(persisted.saveVersion, 23);
  return loaded.data.player;
}

const migratedKnight = loadLegacyCombatSave({
  saveVersion: 16,
  characterId: "knight",
  maxMana: 50,
  mana: 25,
  manaRechargeDelay: 1.35,
  manaRechargeRate: 9,
});
assert.equal(migratedKnight.maxMana, 25);
assert.equal(migratedKnight.mana, 12.5);
assert.equal(migratedKnight.manaRechargeDelay, 0.85);
assert.equal(migratedKnight.manaRechargeRate, 10);

const migratedManaBuild = loadLegacyCombatSave({
  characterId: "knight",
  buffs: ["mana_well", "entropy_engine"],
  maxMana: 80,
  mana: 40,
  manaRechargeDelay: 0.72,
  manaRechargeRate: 15,
});
assert.equal(migratedManaBuild.maxMana, 37);
assert.equal(migratedManaBuild.mana, 18.5);
assert.ok(Math.abs(migratedManaBuild.manaRechargeDelay - 0.51) < 1e-9);
assert.equal(migratedManaBuild.manaRechargeRate, 10);

const migratedRogue = loadLegacyCombatSave({
  characterId: "rogue",
  buffs: ["mana_well"],
  maxMana: 110,
  mana: 55,
  manaRechargeDelay: 0.9,
  manaRechargeRate: 15,
});
assert.equal(migratedRogue.maxMana, 52);
assert.equal(migratedRogue.mana, 26);
assert.ok(Math.abs(migratedRogue.manaRechargeDelay - 1.0125) < 1e-9);
assert.equal(migratedRogue.manaRechargeRate, 9);

const migratedMage = loadLegacyCombatSave({
  characterId: "mage",
  maxMana: 120,
  mana: 30,
  manaRechargeDelay: 1.35,
  manaRechargeRate: 9,
});
assert.equal(migratedMage.maxMana, 60);
assert.equal(migratedMage.mana, 15);
assert.equal(migratedMage.manaRechargeDelay, 1.1);
assert.equal(migratedMage.manaRechargeRate, 12);
assert.equal(migratedMage.mageArcaneCharge, 0);

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

const resourcePlayer = new Player(0, 0);
resourcePlayer.buffs = ["mana_well"];
BuffSystem.applyRuntimeStats(resourcePlayer);
for (const weapon of Object.values(WEAPONS).filter(candidate => candidate.manaCost > 0)) {
  assert.equal(
    WeaponController.getEnergyCost(resourcePlayer, weapon.id),
    weapon.manaCost,
    `${weapon.id} keeps its authored energy cost`,
  );
}
resourcePlayer.setWeaponLoadout(["laser"], 0);
resourcePlayer.mana = 1;
resourcePlayer.fireCooldown = 0;
const resourceShot = WeaponController.fire(resourcePlayer, 0, () => 0.5);
assert.equal(resourceShot.fired, true);
assert.equal(resourcePlayer.mana, 0);
assert.equal(WeaponController.formatEnergyCost(0.8), "0.8");
assert.equal(WeaponController.formatEnergyCost(2), "2");
assert.equal(ENEMY_ATTACK_RATE_MULTIPLIER, 0.7);
assert.ok(Math.abs(getStageDifficulty({ globalStageIndex: 1, chapterIndex: 1 }).attackCooldownMultiplier - 1 / 0.7) < 1e-9);

const metrics = Object.fromEntries(
  Object.values(WEAPONS).map(weapon => [weapon.id, getWeaponBalanceMetrics(weapon, MAX_PLAYER_MANA)]),
);
const zeroEnergy = Object.values(WEAPONS).filter(weapon => weapon.manaCost === 0);
for (const weapon of zeroEnergy) {
  const ceiling = weapon.maxHeat ? 15.5 : 15;
  assert.ok(metrics[weapon.id].directDps <= ceiling, `${weapon.id} free DPS ${metrics[weapon.id].directDps}`);
}
assert.ok(metrics.vector_9.directDps <= metrics.laser.directDps * 0.65);
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
  assert.ok(Math.floor(CHARACTERS.knight.maxMana / weapon.manaCost) >= 3, `${weapon.id} must allow at least three Knight shots`);
}

const areaEnemies = Object.values(ENEMIES).filter(enemy => enemy.behavior === "area");
assert.equal(areaEnemies.length, 4);
for (const enemy of areaEnemies) {
  assert.ok((enemy.areaRadius ?? 999) <= 24);
  assert.ok((enemy.attackRange ?? 999) <= 145);
  assert.ok((enemy.minimumWindup ?? 0) >= 0.65);
  assert.equal(enemy.requiresLineOfSight, true);
}
const iceShamanDefinition = ENEMIES.ice_shaman;
assert.equal(iceShamanDefinition.attackDamage, 2);
assert.equal(iceShamanDefinition.areaRadius, 18);
assert.equal(iceShamanDefinition.statusDuration, 1.25);
assert.equal(iceShamanDefinition.attackRange, 135);
const snowStage = { globalStageIndex: 15, chapterIndex: 3, stageIndex: 5, hardMode: false } as any;
const scaledShaman = EnemyFactory.create(snowStage, {
  x: 80, y: 80, type: "ranged", enemyId: "ice_shaman", isElite: false,
});
const scaledEliteShaman = EnemyFactory.create(snowStage, {
  x: 80, y: 80, type: "ranged", enemyId: "ice_shaman", isElite: true,
});
assert.ok(scaledShaman.attackWindup >= 0.75);
assert.ok(scaledShaman.attackInterval >= 1.65);
assert.ok(scaledShaman.attackDamage <= 4);
assert.ok(scaledEliteShaman.attackWindup >= 0.75);
assert.ok(scaledEliteShaman.attackInterval >= 1.65);

const controlPlayer = new Player(0, 0);
controlPlayer.statusEffects = [];
StatusEffectSystem.applyPlayer(controlPlayer, "slow", 1.25);
assert.equal(StatusEffectSystem.getMovementMultiplier(controlPlayer), 0.72);
StatusEffectSystem.updatePlayer(controlPlayer, 0.8);
const slowBeforeRefresh = controlPlayer.statusEffects.find(status => status.id === "slow")!.duration;
StatusEffectSystem.applyPlayer(controlPlayer, "slow", 1.25);
const slowAfterRefresh = controlPlayer.statusEffects.find(status => status.id === "slow")!.duration;
assert.ok(slowAfterRefresh <= slowBeforeRefresh + 0.300001);
for (let i = 0; i < 10; i++) StatusEffectSystem.applyPlayer(controlPlayer, "slow", 3);
assert.ok(controlPlayer.statusEffects.find(status => status.id === "slow")!.duration <= 1.5);
controlPlayer.statusEffects = [];
StatusEffectSystem.applyPlayer(controlPlayer, "root", 3);
assert.ok(controlPlayer.statusEffects.find(status => status.id === "root")!.duration <= 0.65);

let constrainedWaves = 0;
let crampedTemplateCount = 0;
for (const template of ROOM_TEMPLATES.filter(candidate => candidate.allowedRoomTypes.includes("combat"))) {
  const cramped = isCrampedCombatTemplate(template);
  if (cramped) crampedTemplateCount++;
  for (let seed = 1; seed <= 40; seed++) {
    const stage = {
      seed,
      globalStageIndex: 13,
      chapterIndex: 3,
      stageIndex: 3,
      hardMode: false,
    } as any;
    const room = {
      id: `balance-${template.id}-${seed}`,
      type: "combat",
      encounterSeed: seed,
    } as any;
    const encounter = EncounterFactory.create({ stage, room, template });
    for (const wave of encounter.waves) {
      constrainedWaves++;
      const definitions = wave.spawns.map(spawn => getEnemyDefinition(spawn.enemyId!));
      assert.ok(definitions.filter(definition => definition.behavior === "area").length <= 1);
      assert.ok(definitions.filter(definition => definition.statusEffect === "slow" || definition.statusEffect === "root").length <= 1);
      if (cramped) assert.equal(definitions.some(definition => definition.behavior === "area"), false);
    }
    if (cramped) {
      const hazards = EnvironmentSystem.generate(stage, room, [...template.tiles]);
      const groups = new Set(hazards.map(hazard => hazard.id.split(":").at(-2)));
      assert.ok(groups.size <= 1, `${template.id} should have at most one hazard group`);
    }
  }
}
assert.ok(crampedTemplateCount >= 4);
assert.ok(constrainedWaves > 100);

const dungeonHarness = new DungeonState({} as any) as any;
dungeonHarness.currentMapData = Array.from({ length: 20 * 15 }, () => 0);
assert.equal(dungeonHarness.hasLineOfSight(32, 32, 288, 32), true);
dungeonHarness.currentMapData[2 * 20 + 10] = 1;
assert.equal(dungeonHarness.hasLineOfSight(32, 32, 288, 32), false);
dungeonHarness.currentMapData = Array.from({ length: 20 * 15 }, () => 0);
dungeonHarness.player.x = 80;
dungeonHarness.player.y = 80;
dungeonHarness.player.mana = dungeonHarness.player.maxMana;
dungeonHarness.pickups = [acquirePickup(80, 80, "mana", 5)];
dungeonHarness.updatePickups(0);
assert.equal(dungeonHarness.pickups.length, 1, "full Energy must not consume a mana pickup");

const enemyFactory = fs.readFileSync("src/game/EnemyFactory.ts", "utf8");
const renderer = fs.readFileSync("src/game/render/EntityRenderer.ts", "utf8");
const dungeonSource = fs.readFileSync("src/game/states/DungeonState.ts", "utf8");
assert.match(enemyFactory, /definition\.role === "boss" \? 0\.72 : 0\.66/);
assert.match(renderer, /enemy\.isElite \? 1\.62 : 1\.42/);
assert.match(renderer, /enemy\.type === "boss"\) scale = 2\.15/);
assert.match(renderer, /weapon\?\.renderOffsetX/);
assert.match(renderer, /weapon\?\.muzzleOffsetX/);
assert.match(dungeonSource, /rangedAttackRange = normalMode \? Math\.min\(e\.attackRange, 128\) : e\.attackRange/);
assert.match(dungeonSource, /hasLineOfSight/);
assert.match(dungeonSource, /p\.type === "mana" && this\.player\.mana >= this\.player\.maxMana/);

const spriteSignatures = new Set<string>();
for (const weapon of Object.values(WEAPONS)) {
  const id = weapon.id;
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
assert.match(inputSource, /getCancelPrompt[\s\S]*getUiPrompt\("cancel"\)/);
assert.doesNotMatch(inputSource, /setVirtualKey\("escape"/);
assert.match(inputSource, /suppressUntilReleased/);
assert.match(engineSource, /input\.suppressUntilReleased\(\)/);
assert.match(engineSource, /wasActionPressed\("pause"\)[\s\S]*clearJustPressed\(\);[\s\S]*return;/);
assert.match(pauseSource, /WeaponController\.getEnergyCost/);
assert.match(hudSource, /WeaponController\.getEnergyCost/);

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

const characterSustain = Object.fromEntries(
  Object.values(CHARACTERS).map(character => [
    character.id,
    Object.fromEntries(["laser", "tesla_carbine", "void_rail", "dragon_breath"].map(id => [
      id,
      getWeaponBalanceMetrics(
        WEAPONS[id],
        character.maxMana,
        character.manaRechargeRate,
        character.manaRechargeDelay,
      ).sustainedCycleDps,
    ])),
  ]),
);

console.log(JSON.stringify({
  settingsMigration: "v6-v7",
  runMigration: "v17-v23-ratio-preserved",
  manaCap: MAX_PLAYER_MANA,
  characterMana: Object.fromEntries(Object.values(CHARACTERS).map(character => [character.id, [
    character.maxMana,
    character.manaRechargeRate,
    character.manaRechargeDelay,
  ]])),
  energyCostDiscount: "removed",
  controlRefreshCap: "ok",
  constrainedWaves,
  crampedTemplateCount,
  zeroEnergyCeiling: Math.max(...zeroEnergy.map(weapon => metrics[weapon.id].directDps)),
  areaRadii: areaEnemies.map(enemy => [enemy.id, enemy.areaRadius]),
  weaponModels: spriteSignatures.size,
  characterSustain,
  weaponBalance: report,
}));
