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
import { WEAPON_PALETTES, WEAPON_SPRITES } from "../src/game/data/weaponArt";
import { EnemyFactory } from "../src/game/EnemyFactory";
import { getEnemyDefinition } from "../src/game/data/enemies";
import { ShopSystem } from "../src/game/shop/ShopSystem";
import { FINAL_GLOBAL_STAGE } from "../src/game/RunProgress";

const oldDefaults = {
  moveUp: "w", moveDown: "s", moveLeft: "a", moveRight: "d",
  fire: "f", skill: "e", interact: " ", swapWeapon: "q", pause: "p",
} as const;

assert.equal(SETTINGS_VERSION, 7);
assert.deepEqual(DEFAULT_KEY_BINDINGS, {
  moveUp: "w", moveDown: "s", moveLeft: "a", moveRight: "d",
  fire: "j", skill: "l", interact: "k", swapWeapon: "i", pause: "escape",
});
const migratedDefaults = normalizeSettings({ version: 4, keyBindings: oldDefaults });
assert.deepEqual(migratedDefaults.keyBindings, DEFAULT_KEY_BINDINGS);
const customLegacy = normalizeSettings({ version: 4, keyBindings: { ...oldDefaults, fire: "r" } });
assert.equal(customLegacy.keyBindings.fire, "r");
assert.equal(customLegacy.keyBindings.skill, "e");

const player = new Player(100, 100);
player.mana = 0;
player.maxMana = 25;
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
assert.equal(wellPlayer.maxMana, 37);
assert.equal(wellPlayer.manaRechargeRate, 10);
assert.ok(Math.abs(wellPlayer.manaRechargeDelay - 0.6375) < 1e-9);
wellPlayer.setWeaponLoadout(["void_rail"], 0);
wellPlayer.mana = 20;
const voidShot = WeaponController.fire(wellPlayer, 0, () => 0.5);
assert.equal(voidShot.fired, true);
assert.equal(wellPlayer.mana, 13, "Mana Well should preserve the authored Void Rail cost of 7");

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
const mythWeapons = Object.values(WEAPONS).filter(weapon => weapon.rarity === "myth");
assert.equal(Object.keys(WEAPONS).length, 57);
assert.equal(legendaryWeapons.length, 17);
assert.equal(legendaryWeapons.filter(weapon => weapon.series === "vanguard").length, 2);
assert.equal(legendaryWeapons.filter(weapon => weapon.series === "aether").length, 2);
assert.equal(legendaryWeapons.filter(weapon => weapon.series === "phoenix").length, 2);
assert.equal(getAvailableWeapons(1).length, Object.keys(WEAPONS).length);
assert.equal(getAvailableWeapons(1).filter(weapon => weapon.rarity === "legendary").length, 17);
assert.equal(mythWeapons.length, 3);
assert.deepEqual(mythWeapons.map(weapon => weapon.id).sort(), ["awp_dragon_lore", "so_14", "ultimate"]);
assert.deepEqual(
  getAvailableWeapons(1).map(weapon => weapon.id),
  getAvailableWeapons(FINAL_GLOBAL_STAGE).map(weapon => weapon.id),
);
assert.ok(WEAPONS.void_rail.damage > WEAPONS.laser.damage * 2);
assert.ok(WEAPONS.dragon_breath.pelletCount > WEAPONS.shotgun.pelletCount * 2);

const legendaryBuffs = Object.values(BUFFS).filter(buff => buff.rarity === "legendary");
assert.equal(Object.keys(BUFFS).length, 25);
assert.equal(legendaryBuffs.length, 9);
for (const series of ["vanguard", "aether", "phoenix"] as const) {
  assert.equal(legendaryBuffs.filter(buff => buff.series === series).length, 3);
}
for (let seed = 1; seed <= 80; seed++) {
  const early = BuffSystem.rollChoices(seed, [], 3, 5);
  assert.equal(early.some(id => BUFFS[id].rarity === "legendary"), false);
}
const latePool = new Set<BuffId>();
for (let seed = 1; seed <= 800; seed++) {
  for (const id of BuffSystem.rollChoices(seed, [], 3, FINAL_GLOBAL_STAGE)) latePool.add(id);
}
for (const buff of legendaryBuffs) assert.ok(latePool.has(buff.id));

let foundLegendaryStock = false;
for (let seed = 1; seed <= 200 && !foundLegendaryStock; seed++) {
  const stock = ShopSystem.generateStock(
    { seed, globalStageIndex: FINAL_GLOBAL_STAGE, chapterIndex: 4 } as any,
    { id: `shop-${seed}`, shopSeed: seed } as any,
    { characterId: "knight", buffs: [], weaponSlots: ["pistol"], shopDiscount: 0 } as any,
  );
  foundLegendaryStock = stock.some(item => item.rarity === "legendary");
}
assert.equal(foundLegendaryStock, true);

let shopWeaponTotal = 0;
let shopWeaponHighTier = 0;
let shopWeaponMyth = 0;
let shopBuffTotal = 0;
let shopBuffHighTier = 0;
for (let seed = 1; seed <= 2000; seed++) {
  const stock = ShopSystem.generateStock(
    { seed, globalStageIndex: FINAL_GLOBAL_STAGE, chapterIndex: 4 } as any,
    { id: `quality-shop-${seed}`, shopSeed: seed } as any,
    { characterId: "knight", buffs: [], weaponSlots: ["pistol"], shopDiscount: 0 } as any,
  );
  assert.equal(stock.length, 4);
  assert.equal(stock.filter(item => item.kind === "weapon").length, 2);
  assert.equal(stock.filter(item => item.kind === "buff").length, 2);
  assert.equal(new Set(stock.map(item => item.id)).size, 4);
  assert.equal(
    new Set(stock.map(item => item.weaponId ? `weapon:${item.weaponId}` : `buff:${item.buffId}`)).size,
    4,
  );
  for (const item of stock) {
    const highTier = item.rarity === "rare" || item.rarity === "legendary" || item.rarity === "myth";
    if (item.kind === "weapon") {
      shopWeaponTotal++;
      if (highTier) shopWeaponHighTier++;
      if (item.rarity === "myth") shopWeaponMyth++;
    } else {
      shopBuffTotal++;
      if (highTier) shopBuffHighTier++;
    }
  }
}
const shopWeaponHighTierRate = shopWeaponHighTier / shopWeaponTotal;
const shopWeaponMythRate = shopWeaponMyth / shopWeaponTotal;
const shopBuffHighTierRate = shopBuffHighTier / shopBuffTotal;
assert.ok(
  shopWeaponHighTierRate >= 0.4 && shopWeaponHighTierRate <= 0.46,
  `shop weapon high-tier rate ${shopWeaponHighTierRate}`,
);
assert.ok(
  shopWeaponMythRate >= 0.001 && shopWeaponMythRate <= 0.015,
  `shop weapon myth rate ${shopWeaponMythRate}`,
);
assert.ok(
  shopBuffHighTierRate >= 0.53 && shopBuffHighTierRate <= 0.59,
  `shop talent high-tier rate ${shopBuffHighTierRate}`,
);

const fullBuffStock = ShopSystem.generateStock(
  { seed: 0xF011, globalStageIndex: FINAL_GLOBAL_STAGE, chapterIndex: 4 } as any,
  { id: "full-buff-shop", shopSeed: 0xF011 } as any,
  {
    buffs: (Object.keys(BUFFS) as BuffId[]).slice(0, BuffSystem.MAX_BUFFS),
    weaponSlots: ["pistol"],
    shopDiscount: 0,
  } as any,
);
assert.equal(fullBuffStock.length, 4);
assert.equal(fullBuffStock.every(item => item.kind === "weapon"), true);

const legacyShopRoom = {
  id: "legacy-supply-shop",
  shopSeed: 0x51A,
  shopStock: [
    { id: "legacy:heal", kind: "heal", name: "FIELD MEDKIT", description: "", price: 14, purchased: false, amount: 3 },
    { id: "legacy:armor", kind: "armor", name: "ARMOR PATCH", description: "", price: 16, purchased: false, amount: 3 },
    { id: "legacy:weapon", kind: "weapon", name: WEAPONS.laser.name, description: "", price: 72, purchased: false, weaponId: "laser", rarity: "rare" },
    { id: "legacy:buff", kind: "buff", name: BUFFS.critical_focus.name, description: "", price: 52, purchased: false, buffId: "critical_focus", rarity: "uncommon" },
  ],
} as any;
const migratedShopStock = ShopSystem.reconcileStock(
  { seed: 0x51A, globalStageIndex: FINAL_GLOBAL_STAGE, chapterIndex: 4 } as any,
  legacyShopRoom,
  { characterId: "knight", buffs: [], weaponSlots: ["pistol"], shopDiscount: 0 } as any,
);
assert.equal(migratedShopStock.length, 4);
assert.equal(migratedShopStock.every(item => item.kind === "weapon" || item.kind === "buff"), true);
assert.equal(migratedShopStock.some(item => item.weaponId === "laser"), true);
assert.equal(migratedShopStock.some(item => item.buffId === "critical_focus"), true);
assert.equal(
  new Set(migratedShopStock.map(item => item.weaponId ? `weapon:${item.weaponId}` : `buff:${item.buffId}`)).size,
  4,
);

const engineSource = fs.readFileSync("src/game/Engine.ts", "utf8");
const dungeonSource = fs.readFileSync("src/game/states/DungeonState.ts", "utf8");
const rendererSource = fs.readFileSync("src/game/render/EntityRenderer.ts", "utf8");
assert.match(engineSource, /stateCapturesPause[\s\S]*capturesPauseInput\(\)[\s\S]*wasUiPressed\("cancel"\)[\s\S]*!stateCapturesPause[\s\S]*wasActionPressed\("pause"\)/);
assert.match(dungeonSource, /capturesPauseInput\(\): boolean[\s\S]*return this\.shopOpen/);
assert.doesNotMatch(dungeonSource, /wasUiPressed\("cancel"\) \|\| this\.engine\.input\.wasActionPressed\("pause"\)/);
assert.match(dungeonSource, /kind === "boss" \? "boss" : "treasure"/);
assert.match(dungeonSource, /createOrRestoreWeaponChest\(currentRoom, "boss"\)/);
assert.match(dungeonSource, /currentRoom\.weaponChest = \{ \.\.\.this\.chest \}/);
assert.match(rendererSource, /enemy\.isElite \? 1\.62 : 1\.42/);
assert.match(rendererSource, /if \(enemy\.type === "boss"\) scale = nativeMonsterArt \? 1 : 2\.15/);
for (const weapon of legendaryWeapons) {
  assert.ok(WEAPON_SPRITES[weapon.id], `${weapon.id} dedicated model`);
  assert.ok(WEAPON_PALETTES[weapon.id], `${weapon.id} dedicated palette`);
}

console.log(JSON.stringify({
  twoHandKeyboardDefaults: "ok",
  legacyBindingMigration: "ok",
  manaRecharge: "ok",
  consistentShopPause: "start-pauses-b-cancels",
  smallerEnemyBodies: "ok",
  legendaryWeapons: legendaryWeapons.length,
  mythWeapons: mythWeapons.length,
  legendaryTalents: legendaryBuffs.length,
  powerSeries: 3,
  allStageWeaponPool: "ok",
  bossWeaponChest: "ok",
  shopStock: "weapons-and-talents-only",
  shopWeaponHighTierRate: Number(shopWeaponHighTierRate.toFixed(3)),
  shopWeaponMythRate: Number(shopWeaponMythRate.toFixed(3)),
  shopTalentHighTierRate: Number(shopBuffHighTierRate.toFixed(3)),
}));
