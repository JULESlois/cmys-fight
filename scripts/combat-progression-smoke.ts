import assert from "node:assert/strict";
import fs from "node:fs";
import {
  DEFAULT_KEY_BINDINGS,
  SETTINGS_VERSION,
  normalizeSettings,
} from "../src/game/Settings";
import { Player } from "../src/game/entities/Player";
import { DamageSystem } from "../src/game/combat/DamageSystem";
import { WeaponController } from "../src/game/combat/WeaponController";
import { BuffSystem, BUFFS, type BuffId } from "../src/game/combat/BuffSystem";
import { WEAPONS, getAvailableWeapons } from "../src/game/data/weapons";
import { EnemyFactory } from "../src/game/EnemyFactory";
import { getEnemyDefinition } from "../src/game/data/enemies";
import { ShopSystem } from "../src/game/shop/ShopSystem";

const oldDefaults = {
  moveUp: "w", moveDown: "s", moveLeft: "a", moveRight: "d",
  fire: "f", skill: "e", interact: " ", swapWeapon: "q", pause: "p",
} as const;

assert.equal(SETTINGS_VERSION, 6);
assert.deepEqual(DEFAULT_KEY_BINDINGS, {
  moveUp: "w", moveDown: "s", moveLeft: "a", moveRight: "d",
  fire: "j", skill: "k", interact: "l", swapWeapon: "i", pause: "escape",
});
const migratedDefaults = normalizeSettings({ version: 4, keyBindings: oldDefaults });
assert.deepEqual(migratedDefaults.keyBindings, DEFAULT_KEY_BINDINGS);
const customLegacy = normalizeSettings({ version: 4, keyBindings: { ...oldDefaults, fire: "r" } });
assert.equal(customLegacy.keyBindings.fire, "r");
assert.equal(customLegacy.keyBindings.skill, "e");

const player = new Player(100, 100);
player.mana = 0;
player.maxMana = 100;
player.manaRechargeTimer = 1;
DamageSystem.updatePlayer(player, 0.5);
assert.equal(player.mana, 0);
DamageSystem.updatePlayer(player, 0.6);
assert.ok(player.mana > 0 && player.mana < 10);
DamageSystem.updatePlayer(player, 20);
assert.equal(player.mana, player.maxMana);

player.setWeaponLoadout(["laser"], 0);
player.mana = 10;
player.fireCooldown = 0;
const fired = WeaponController.fire(player, 0, () => 0.5);
assert.equal(fired.fired, true);
assert.equal(player.mana, 9);
assert.equal(player.manaRechargeTimer, player.manaRechargeDelay);

const wellPlayer = new Player(0, 0);
wellPlayer.mana = 0;
assert.equal(BuffSystem.acquire(wellPlayer, "mana_well"), true);
assert.equal(wellPlayer.maxMana, 140);
assert.equal(wellPlayer.manaRechargeRate, 20);
assert.equal(wellPlayer.manaRechargeDelay, 0.8);
wellPlayer.setWeaponLoadout(["void_rail"], 0);
wellPlayer.mana = 20;
const voidShot = WeaponController.fire(wellPlayer, 0, () => 0.5);
assert.equal(voidShot.fired, true);
assert.equal(wellPlayer.mana, 14, "Mana Well should reduce Void Rail cost from 7 to 6");

const phoenix = new Player(0, 0);
phoenix.hp = 1;
phoenix.maxHp = 8;
phoenix.armor = 0;
phoenix.maxArmor = 5;
assert.equal(BuffSystem.acquire(phoenix, "phoenix_protocol"), true);
const lethal = DamageSystem.damagePlayer(phoenix, 10);
assert.equal(lethal.killed, false);
assert.equal(phoenix.hp, 2);
assert.equal(phoenix.armor, 3);
assert.equal(phoenix.phoenixProtocolReady, false);

const stage = { globalStageIndex: 8, chapterIndex: 2, hardMode: false } as any;
const definition = getEnemyDefinition("bark_hound");
const normal = EnemyFactory.create(stage, { x: 80, y: 80, type: definition.role, enemyId: definition.id, isElite: false } as any);
const elite = EnemyFactory.create(stage, { x: 80, y: 80, type: definition.role, enemyId: definition.id, isElite: true } as any);
assert.ok(normal.radius < definition.radius);
assert.equal(elite.radius, normal.radius, "Elite enemies must not enlarge their collision body");
const bossDef = getEnemyDefinition("kennel_warden");
const boss = EnemyFactory.create(stage, { x: 80, y: 80, type: "boss", enemyId: bossDef.id, isElite: false } as any);
assert.ok(boss.radius < bossDef.radius);

const legendaryWeapons = Object.values(WEAPONS).filter(weapon => weapon.rarity === "legendary");
assert.equal(Object.keys(WEAPONS).length, 22);
assert.equal(legendaryWeapons.length, 6);
assert.equal(legendaryWeapons.filter(weapon => weapon.series === "vanguard").length, 2);
assert.equal(legendaryWeapons.filter(weapon => weapon.series === "aether").length, 2);
assert.equal(legendaryWeapons.filter(weapon => weapon.series === "phoenix").length, 2);
assert.equal(getAvailableWeapons(6).some(weapon => weapon.rarity === "legendary"), false);
assert.equal(getAvailableWeapons(20).filter(weapon => weapon.rarity === "legendary").length, 6);
assert.ok(WEAPONS.void_rail.damage > WEAPONS.laser.damage * 2);
assert.ok(WEAPONS.dragon_breath.pelletCount > WEAPONS.shotgun.pelletCount * 2);

const legendaryBuffs = Object.values(BUFFS).filter(buff => buff.rarity === "legendary");
assert.equal(Object.keys(BUFFS).length, 23);
assert.equal(legendaryBuffs.length, 9);
for (const series of ["vanguard", "aether", "phoenix"] as const) {
  assert.equal(legendaryBuffs.filter(buff => buff.series === series).length, 3);
}
for (let seed = 1; seed <= 80; seed++) {
  const early = BuffSystem.rollChoices(seed, [], 3, 6);
  assert.equal(early.some(id => BUFFS[id].rarity === "legendary"), false);
}
const latePool = new Set<BuffId>();
for (let seed = 1; seed <= 800; seed++) {
  for (const id of BuffSystem.rollChoices(seed, [], 3, 20)) latePool.add(id);
}
for (const buff of legendaryBuffs) assert.ok(latePool.has(buff.id));

let foundLegendaryStock = false;
for (let seed = 1; seed <= 200 && !foundLegendaryStock; seed++) {
  const stock = ShopSystem.generateStock(
    { seed, globalStageIndex: 20, chapterIndex: 4 } as any,
    { id: `shop-${seed}`, shopSeed: seed } as any,
    { buffs: [], weaponSlots: ["pistol"], shopDiscount: 0 } as any,
  );
  foundLegendaryStock = stock.some(item => item.rarity === "legendary");
}
assert.equal(foundLegendaryStock, true);

const engineSource = fs.readFileSync("src/game/Engine.ts", "utf8");
const dungeonSource = fs.readFileSync("src/game/states/DungeonState.ts", "utf8");
const rendererSource = fs.readFileSync("src/game/render/EntityRenderer.ts", "utf8");
const spriteSource = fs.readFileSync("src/game/data/sprites.ts", "utf8");
assert.match(engineSource, /stateCapturesPause[\s\S]*capturesPauseInput/);
assert.match(dungeonSource, /capturesPauseInput\(\): boolean[\s\S]*return this\.shopOpen/);
assert.match(dungeonSource, /rollAvailableWeapon\(floor\.globalStageIndex, random, "treasure"/);
assert.match(rendererSource, /enemy\.isElite \? 1\.85 : 1\.62/);
assert.match(rendererSource, /enemy\.type === "boss"\) scale = 2\.45/);
for (const weapon of legendaryWeapons) {
  assert.match(spriteSource, new RegExp(`weapon_${weapon.id}:`));
}

console.log(JSON.stringify({
  twoHandKeyboardDefaults: "ok",
  legacyBindingMigration: "ok",
  manaRecharge: "ok",
  shopPauseCapture: "ok",
  smallerEnemyBodies: "ok",
  legendaryWeapons: legendaryWeapons.length,
  legendaryTalents: legendaryBuffs.length,
  powerSeries: 3,
  stageGating: "ok",
}));
