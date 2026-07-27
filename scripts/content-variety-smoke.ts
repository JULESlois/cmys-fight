import assert from "node:assert/strict";
import fs from "node:fs";
import { ENEMIES, getBossPool, getEnemyPool, type EnemyTheme } from "../src/game/data/enemies";
import { WEAPONS, getAvailableWeapons } from "../src/game/data/weapons";
import { SPRITES } from "../src/game/data/sprites";
import { Player } from "../src/game/entities/Player";
import { WeaponController } from "../src/game/combat/WeaponController";
import { EnvironmentSystem } from "../src/game/environment/EnvironmentSystem";
import { generateStage } from "../src/game/FloorGenerator";
import { createRunProgressFromGlobalStage, FINAL_GLOBAL_STAGE, STAGES_PER_CHAPTER } from "../src/game/RunProgress";
import { getMapData, getRoomTemplate, isSolid, MAP_HEIGHT, MAP_WIDTH } from "../src/game/MapData";
import { EncounterFactory } from "../src/game/EncounterFactory";
import { ShopSystem } from "../src/game/shop/ShopSystem";
import { createDefaultEquipmentProgress } from "../src/game/combat/EquipmentSystem";
import { EQUIPMENT } from "../src/game/data/equipment";
import { SpecialRoomRenderer, getSpecialRoomPalette } from "../src/game/render/SpecialRoomRenderer";
import { WORLD_NODES } from "../src/game/world/WorldNodes";

const themes: EnemyTheme[] = ["forest", "dungeon", "snow", "lava"];

interface StageCall { kind: "fill" | "stroke"; color: string; x: number; y: number; width: number; height: number; }
function createStageRecorder(): { ctx: CanvasRenderingContext2D; calls: StageCall[] } {
  const calls: StageCall[] = [];
  let fillStyle = "";
  let strokeStyle = "";
  const target: Record<string, unknown> = {
    fillRect(x: number, y: number, width: number, height: number) {
      calls.push({ kind: "fill", color: fillStyle, x, y, width, height });
    },
    strokeRect(x: number, y: number, width: number, height: number) {
      calls.push({ kind: "stroke", color: strokeStyle, x, y, width, height });
    },
  };
  Object.defineProperties(target, {
    fillStyle: { get: () => fillStyle, set: value => { fillStyle = String(value); } },
    strokeStyle: { get: () => strokeStyle, set: value => { strokeStyle = String(value); } },
  });
  return { ctx: target as unknown as CanvasRenderingContext2D, calls };
}

function stageSignature(roomType: "start" | "treasure" | "boss" | "exit" | "npc" | "hidden", theme: string, completed = false): string {
  const recorder = createStageRecorder();
  SpecialRoomRenderer.drawRoomStage(recorder.ctx, roomType, theme, 3.25, completed);
  return recorder.calls.map(call => `${call.kind}:${call.color}:${call.x}:${call.y}:${call.width}:${call.height}`).join("|");
}

const routeNodeIds = Object.keys(WORLD_NODES);
assert.equal(new Set(routeNodeIds.map(id => JSON.stringify(getSpecialRoomPalette(id)))).size, routeNodeIds.length, "route nodes have distinct special-room palettes");
const routeStageSignatures = routeNodeIds.map(id => stageSignature("exit", id));
assert.equal(new Set(routeStageSignatures).size, routeNodeIds.length, "route nodes have distinct floor signatures");
assert.deepEqual(routeStageSignatures, routeNodeIds.map(id => stageSignature("exit", id)), "special-room stages are deterministic at a fixed time");
const specialTypes = ["start", "treasure", "boss", "exit", "npc", "hidden"] as const;
assert.equal(new Set(specialTypes.map(type => stageSignature(type, "deep_archive"))).size, specialTypes.length, "special-room types have distinct floor inlays");
assert.notEqual(stageSignature("exit", "deep_archive", false), stageSignature("exit", "deep_archive", true), "completed special rooms visibly power down");

assert.equal(Object.keys(ENEMIES).length, 66);
for (const theme of themes) {
  assert.equal(getEnemyPool(theme, undefined, 1).length, 3, `${theme} stage 1 pool`);
  assert.equal(getEnemyPool(theme, undefined, 2).length, 5, `${theme} stage 2 pool`);
  assert.equal(getEnemyPool(theme, undefined, 3).length, 7, `${theme} stage 3 pool`);
  assert.ok(getEnemyPool(theme, "melee", 3).length >= 1);
  assert.ok(getEnemyPool(theme, "ranged", 3).length >= 2);
  assert.equal(getBossPool(theme).length, 2, `${theme} boss pool`);
}
assert.equal(new Set(themes.flatMap(theme => getBossPool(theme).map(boss => boss.bossPattern))).size, 8);
for (const id of [
  "dingdong_fowl", "root_lancer", "petal_moth",
  "bark_hound", "coffin_lobber", "lantern_wraith",
  "white_sampler", "icicle_sniper", "lab_servitor",
  "code_horse", "magma_mortar", "heat_smith_drone",
]) assert.ok(ENEMIES[id]);

assert.equal(Object.keys(WEAPONS).length, 57);
assert.equal(WEAPONS.code_scanner.pierce, 2);
assert.equal(WEAPONS.vat_horse_cannon.wallBounces, 1);
assert.equal(WEAPONS.vat_horse_cannon.statusEffect, "burn");
assert.equal(WEAPONS.mask_sprayer.statusEffect, "slow");
assert.equal(WEAPONS.swab_lance.projectileRadius, 4);
assert.ok(WEAPONS.bell_repeater.fireRate >= 6);
assert.equal(WEAPONS.vector_9.manaCost, 0);
assert.ok(WEAPONS.vector_9.fireRate >= 10);
assert.equal(WEAPONS.vector_9.damage, 1);
assert.equal(WEAPONS.vector_9.projectileStyle, "tracer");
assert.equal(WEAPONS.liberator.manaCost, 0);
assert.ok(WEAPONS.liberator.damage >= 13);
assert.ok(WEAPONS.liberator.fireRate < 1);
assert.equal(WEAPONS.tesla_carbine.projectileStyle, "lightning");
assert.equal(WEAPONS.tesla_carbine.chainCount, 2);
assert.equal(WEAPONS.micro_rocket.projectileStyle, "rocket");
assert.equal(WEAPONS.micro_rocket.explosionRadius, 30);
assert.ok((WEAPONS.plasma_caster.homingStrength ?? 0) > 0);
assert.equal(WEAPONS.ripper_disc.wallBounces, 3);
assert.equal(getAvailableWeapons(1).length, Object.values(WEAPONS).filter(w => !w.experimental).length);
assert.equal(getAvailableWeapons(1).some(weapon => weapon.id === "vector_9"), true);
assert.equal(getAvailableWeapons(1).some(weapon => weapon.id === "micro_rocket"), true);
assert.equal(getAvailableWeapons(1).filter(weapon => weapon.rarity === "legendary").length, 16);
assert.equal(getAvailableWeapons(1).filter(weapon => weapon.rarity === "myth").length, 3);
assert.equal(WEAPONS.ultimate.rarity, "myth");
assert.equal(WEAPONS.ultimate.dualWield, true);
assert.ok(WEAPONS.ultimate.fireRate >= 18);
for (const id of ["bayonet_ruby", "butterfly_emerald", "karambit_emerald"]) {
  assert.equal(WEAPONS[id].category, "sword");
  assert.equal(WEAPONS[id].attackMode, "melee");
  assert.equal(WEAPONS[id].projectileStyle, "sword");
}
assert.equal(WEAPONS.m4a1_s_cyrex.muzzleEffect, "smoke");
assert.equal(WEAPONS.m4a4_coalition.rarity, "legendary");
assert.deepEqual(
  getAvailableWeapons(1).map(weapon => weapon.id),
  getAvailableWeapons(FINAL_GLOBAL_STAGE).map(weapon => weapon.id),
  "weapon availability must not depend on chapter or stage",
);
for (const weapon of Object.values(WEAPONS)) {
  assert.ok(weapon.mechanic.length >= 12, `${weapon.id} mechanic copy`);
  assert.ok(SPRITES[`weapon_${weapon.id}`], `${weapon.id} dedicated sprite`);
}

const player = new Player(160, 120);
player.mana = 100;
player.setWeaponLoadout(["code_scanner"], 0);
let fired = WeaponController.fire(player, 0, () => 0.99);
assert.equal(fired.fired, true);
assert.equal(fired.projectiles[0].pierceRemaining, 2);
player.weaponLoadout.slots[player.weaponLoadout.activeSlot].fireCooldown = 0;
player.setWeaponLoadout(["vat_horse_cannon"], 0);
fired = WeaponController.fire(player, 0, () => 0.99);
assert.equal(fired.projectiles.length, 3);
assert.equal(fired.projectiles[0].wallBouncesRemaining, 1);
assert.equal(fired.projectiles[0].statusEffect, "burn");

player.weaponLoadout.slots[player.weaponLoadout.activeSlot].fireCooldown = 0;
player.mana = 0;
player.setWeaponLoadout(["vector_9"], 0);
fired = WeaponController.fire(player, 0, () => 0.99);
assert.equal(fired.fired, true);
assert.equal(player.mana, 0);
assert.equal(fired.projectiles[0].style, "tracer");
assert.equal(fired.projectiles[0].trailLength, 17);

player.weaponLoadout.slots[player.weaponLoadout.activeSlot].fireCooldown = 0;
player.mana = 100;
player.setWeaponLoadout(["tesla_carbine"], 0);
fired = WeaponController.fire(player, 0, () => 0.99);
assert.equal(fired.projectiles[0].style, "lightning");
assert.equal(fired.projectiles[0].chainCount, 2);
assert.equal(fired.projectiles[0].chainRange, 58);

player.weaponLoadout.slots[player.weaponLoadout.activeSlot].fireCooldown = 0;
player.setWeaponLoadout(["micro_rocket"], 0);
fired = WeaponController.fire(player, 0, () => 0.99);
assert.equal(fired.projectiles[0].style, "rocket");
assert.equal(fired.projectiles[0].explosionRadius, 30);
assert.ok(fired.projectiles[0].acceleration > 0);

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

// Shops can offer unowned meta equipment as a distinct offer kind; purchasing
// records ownership on the equipment progress and deducts coins.
const equipmentProgress = createDefaultEquipmentProgress();
const shopPlayer = {
  characterId: "knight",
  buffs: [],
  weaponLoadout: { slots: [{ weaponId: "pistol" }], activeSlot: 0 },
  shopDiscount: 0,
} as any;
const equipmentShopStage = { seed: 1, globalStageIndex: 1, chapterIndex: 1 } as any;
let equipmentOfferRoom: any;
let equipmentOffer: ReturnType<typeof ShopSystem.generateStock>[number] | undefined;
for (let seed = 1; seed <= 200 && !equipmentOffer; seed++) {
  const room = { id: `equip-shop-${seed}`, shopSeed: seed } as any;
  const stock = ShopSystem.generateStock(equipmentShopStage, room, shopPlayer, equipmentProgress);
  assert.equal(stock.length, 4, "equipment never shrinks the four-card stock");
  assert.ok(stock.filter(item => item.kind === "equipment").length <= 1, "at most one equipment card per shop");
  const offer = stock.find(item => item.kind === "equipment");
  if (offer) {
    equipmentOffer = offer;
    equipmentOfferRoom = room;
  }
}
assert.ok(equipmentOffer, "seeded shops must be able to offer equipment");
const offeredEquipment = EQUIPMENT[equipmentOffer!.equipmentId!];
assert.ok(offeredEquipment, "equipment offers carry a valid equipment id");
assert.equal(equipmentProgress.owned.includes(offeredEquipment.id), false, "only unowned gear is offered");
assert.equal(equipmentOffer!.name, offeredEquipment.name, "offers use the equipment data name");
assert.equal(equipmentOffer!.price, offeredEquipment.cost, "stage-1 undiscounted price equals the data cost");
const equipmentCoinsBefore = equipmentOffer!.price + 25;
const noProgressPurchase = ShopSystem.purchase(shopPlayer, { ...equipmentOffer!, purchased: false }, equipmentCoinsBefore);
assert.equal(noProgressPurchase.success, false, "equipment purchase requires the meta equipment progress");
const poorPurchase = ShopSystem.purchase(shopPlayer, equipmentOffer!, equipmentOffer!.price - 1, equipmentProgress);
assert.equal(poorPurchase.success, false);
assert.equal(poorPurchase.reason, "coins");
const equipmentPurchase = ShopSystem.purchase(shopPlayer, equipmentOffer!, equipmentCoinsBefore, equipmentProgress);
assert.equal(equipmentPurchase.success, true, "equipment purchase succeeds");
assert.equal(equipmentPurchase.coinsAfter, equipmentCoinsBefore - equipmentOffer!.price, "purchase deducts the price");
assert.equal(equipmentProgress.owned.includes(offeredEquipment.id), true, "purchase records ownership");
assert.equal(equipmentOffer!.purchased, true);
const repeatPurchase = ShopSystem.purchase(shopPlayer, { ...equipmentOffer!, purchased: false }, equipmentCoinsBefore, equipmentProgress);
assert.equal(repeatPurchase.success, false, "owned gear cannot be sold twice");
const restock = ShopSystem.generateStock(equipmentShopStage, equipmentOfferRoom, shopPlayer, equipmentProgress);
assert.equal(restock.some(item => item.equipmentId === offeredEquipment.id), false, "owned gear leaves the offer pool");
for (let seed = 1; seed <= 40; seed++) {
  const stock = ShopSystem.generateStock(equipmentShopStage, { id: `legacy-shop-${seed}`, shopSeed: seed } as any, shopPlayer);
  assert.equal(stock.some(item => item.kind === "equipment"), false, "callers without meta equipment keep legacy stock");
}

const originalLog = console.log;
console.log = () => {};
let hazardsChecked = 0;
let obstacleVariants = new Set<string>();
const specialRooms = { npc: 0, hidden: 0 };
const encountered = new Map<EnemyTheme, Set<string>>(themes.map(theme => [theme, new Set()]));
const bossesEncountered = new Map<EnemyTheme, Set<string>>(themes.map(theme => [theme, new Set()]));
for (let globalStage = 1; globalStage <= FINAL_GLOBAL_STAGE; globalStage++) {
  const stage = generateStage(createRunProgressFromGlobalStage(globalStage), seeded(globalStage * 97));
  for (const room of stage.rooms) {
    if (room.type === "npc" || false) specialRooms[room.type]++;
    const first = getMapData(room, stage.theme);
    const second = getMapData(room, stage.theme);
    assert.deepEqual(first, second, `map determinism ${room.id}`);
    if (room.type === "combat" || room.type === "boss") {
      obstacleVariants.add(`${stage.theme}:${room.templateId}:${first.join("")}`);
      const hazards = EnvironmentSystem.generate(stage, room, first);
      const ids = new Set<string>();
      for (const hazard of hazards) {
        hazardsChecked++;
        assert.equal(hazard.x, hazard.tileX * 16 + 8);
        assert.equal(hazard.y, hazard.tileY * 16 + 8);
        assert.equal(hazard.radius, 7);
        assert.equal(isSolid(first[hazard.tileY * MAP_WIDTH + hazard.tileX]), false);
        assert.equal(ids.has(`${hazard.tileX},${hazard.tileY}`), false);
        ids.add(`${hazard.tileX},${hazard.tileY}`);
      }
    }
  }
}

for (const theme of themes) {
  const chapterIndex = themes.indexOf(theme) + 1;
  for (let sample = 1; sample <= 120; sample++) {
    const progress = createRunProgressFromGlobalStage((chapterIndex - 1) * STAGES_PER_CHAPTER + 3);
    progress.worldNodeId = theme;
    const stage = generateStage(progress, seeded(sample * 37 + chapterIndex));
    const room = stage.rooms.find(candidate => candidate.type === "combat");
    if (!room) continue;
    room.encounterSeed = sample * 7919;
    const encounter = EncounterFactory.create({ stage, room, template: getRoomTemplate(room) });
    for (const wave of encounter.waves) for (const spawn of wave.spawns) if (spawn.enemyId) encountered.get(theme)!.add(spawn.enemyId);
  }
  assert.equal(encountered.get(theme)!.size, 7, `${theme} encounter coverage`);

  const bossStageIndex = chapterIndex * STAGES_PER_CHAPTER;
  for (let sample = 1; sample <= 80; sample++) {
    const progress = createRunProgressFromGlobalStage(bossStageIndex);
    progress.worldNodeId = theme;
    const stage = generateStage(progress, seeded(sample * 101 + chapterIndex));
    const room = stage.rooms.find(candidate => candidate.type === "boss")!;
    room.encounterSeed = sample * 104729 + chapterIndex;
    const first = EncounterFactory.create({ stage, room, template: getRoomTemplate(room) });
    const second = EncounterFactory.create({ stage, room, template: getRoomTemplate(room) });
    const firstBoss = first.waves[0].spawns[0].enemyId!;
    const secondBoss = second.waves[0].spawns[0].enemyId!;
    assert.equal(firstBoss, secondBoss, `${theme} boss selection determinism`);
    bossesEncountered.get(theme)!.add(firstBoss);
  }
  assert.equal(bossesEncountered.get(theme)!.size, 2, `${theme} alternate boss coverage`);
}
assert.ok(hazardsChecked > 100);
const minimumObstacleVariants = Math.floor(41 * FINAL_GLOBAL_STAGE / 20);
assert.ok(obstacleVariants.size >= minimumObstacleVariants);
// The fixed full-run sample is small; verify all special room branches over a broader seed set.
for (let sample = 1; sample <= 300; sample++) {
  const stage = generateStage(createRunProgressFromGlobalStage(3), seeded(sample * 13007));
  for (const room of stage.rooms) {
    if (room.type === "npc" || room.type === "hidden") specialRooms[room.type]++;
  }
}
assert.ok(specialRooms.npc > 25);
assert.ok(specialRooms.hidden > 25);
console.log = originalLog;

for (const file of [
  "src/game/environment/EnvironmentSystem.ts",
  "src/game/render/PortalRenderer.ts",
  "src/game/render/EntityRenderer.ts",
  "src/game/render/SpecialRoomRenderer.ts",
  "src/game/render/MerchantRenderer.ts",
  "src/game/render/ChestRenderer.ts",
]) {
  const source = fs.readFileSync(file, "utf8");
  assert.doesNotMatch(source, /\.arc\(/, `${file} should use pixel geometry`);
}
const dungeonSource = fs.readFileSync("src/game/states/DungeonState.ts", "utf8");
const floorSource = fs.readFileSync("src/game/FloorGenerator.ts", "utf8");
const roomRendererSource = fs.readFileSync("src/game/render/RoomRenderer.ts", "utf8");
const minimapSource = fs.readFileSync("src/game/render/MinimapRenderer.ts", "utf8");
const gameDataSource = fs.readFileSync("src/game/GameData.ts", "utf8");
assert.doesNotMatch(dungeonSource, /ctx\.arc\(t\.x/);
assert.match(dungeonSource, /treasure-weapon/);
assert.match(floorSource, /createRoom\(currentX, currentY, "combat"\)/);
assert.match(floorSource, /assignRoomType\("treasure"/);
assert.match(floorSource, /assignRoomType\("npc"/);
assert.match(floorSource, /createRoom\(origin\.x \+ direction\.dx, origin\.y \+ direction\.dy, "hidden"\)/);
assert.match(roomRendererSource, /tileId === 0 \|\| tileId === 2/);
assert.match(roomRendererSource, /getMapData\(currentRoom, baseTheme\)/, "route-node visuals preserve base-theme collision layouts");
assert.match(dungeonSource, /floor\.worldNodeId \|\| floor\.theme/, "runtime dungeon art resolves the active route node before its base theme");
assert.match(minimapSource, /room\.doors\.right[\s\S]*room\.doors\.down/);
assert.match(minimapSource, /room\.visited \|\| isCurrent/);
assert.match(minimapSource, /visibleKeys\.has/);
assert.match(minimapSource, /ctx\.fillText\("\?"/);
assert.match(minimapSource, /for \(const room of visible\) \{[\s\S]*minX = Math\.min\(minX, room\.x\)/);
assert.doesNotMatch(minimapSource, /for \(const room of floor\.rooms\) \{\s*minX = Math\.min/);
// Legacy per-room repair (room.type = "combat" / templateId = "legacy_room") was removed:
// incompatible saves are now detected by isStageCompatible and the stage is regenerated whole.
assert.match(gameDataSource, /private isStageCompatible\(stage: any, run: RunProgress\)/, "legacy room repair replaced by whole-stage compatibility check");
assert.match(gameDataSource, /if \(loadedVersion < 6 \|\| !stageCompatible\) \{\s*this\.data\.floor = generateStage\(this\.data\.run\)/, "incompatible saves regenerate the stage instead of patching rooms");
assert.match(gameDataSource, /stage\.worldNodeId !== run\.worldNodeId/, "stage compatibility keys on the run's world node");
assert.match(gameDataSource, /hashSeed\(stage\.seed, room\.id\)/, "normalizeStageMetadata re-stamps per-room encounter seeds");
const specialRoomSource = fs.readFileSync("src/game/render/SpecialRoomRenderer.ts", "utf8");
const portalSource = fs.readFileSync("src/game/render/PortalRenderer.ts", "utf8");
const ritualSpringSource = fs.readFileSync("src/game/render/RitualSpringRenderer.ts", "utf8");
const merchantSource = fs.readFileSync("src/game/render/MerchantRenderer.ts", "utf8");
const chestSource = fs.readFileSync("src/game/render/ChestRenderer.ts", "utf8");
const chestGeometrySource = fs.readFileSync("src/game/dungeon/ChestGeometry.ts", "utf8");
const shopRendererSource = fs.readFileSync("src/game/render/ShopRenderer.ts", "utf8");
assert.match(specialRoomSource, /drawRoomStage/, "special rooms keep a sparse central rune stage");
assert.match(merchantSource, /drawStallBack[\s\S]*drawMerchantBody[\s\S]*drawCounterFront/, "merchant uses separated stall, body and foreground layers");
assert.match(merchantSource, /const IDENTITY/, "merchant keeps a stable identity palette across chapters");
assert.doesNotMatch(merchantSource, /ctx\.scale\(/, "merchant uses native integer-pixel sizing");
assert.match(shopRendererSource, /MerchantRenderer\.drawMerchant/, "shop delegates world merchant art to the dedicated renderer");
assert.match(specialRoomSource, /drawRitualSpring/, "wish fountain delegates to the shared ritual spring renderer");
assert.doesNotMatch(specialRoomSource, /drawForestStage|drawDungeonStage|drawSnowStage|drawLavaStage|drawChapterStage/, "special rooms no longer add chapter side scenery");
assert.doesNotMatch(specialRoomSource, /function plate|const bounds = roomType ===/, "special rooms must not use a shared rectangular base plate");
assert.match(specialRoomSource, /const FRAME =/, "broadcast terminal uses one stable archive frame palette");
assert.match(specialRoomSource, /drawBroadcastTerminal[\s\S]*_theme: string[\s\S]*FRAME\.dark[\s\S]*FRAME\.body/, "broadcast terminal ignores chapter theme");
assert.match(ritualSpringSource, /RITUAL_SPRING_GEOMETRY[\s\S]*RITUAL_SPRING_WATER/, "Hub and Dungeon springs share geometry with chapter-specific water");
assert.match(ritualSpringSource, /completed[\s\S]*motes/, "completed springs reduce animated soul motes");
assert.match(portalSource, /PORTAL_OUTER_RING_POINTS[\s\S]*PORTAL_INNER_RING_POINTS/, "portal uses authored 16-point and 12-point rings");
assert.match(portalSource, /getPortalPointIndex[\s\S]*direction: 1 \| -1/, "portal rotation uses discrete positive-modulo point indices");
assert.match(portalSource, /drawMinimalFrame/, "portal keeps only compact supports and split bases");
assert.doesNotMatch(portalSource, /drawThemeFrame|drawForestFrame|drawDungeonFrame|drawSnowFrame|drawLavaFrame|scan bands|aperture/, "portal removes chapter machinery and rectangular scan energy");
assert.match(chestSource, /drawTreasureLid[\s\S]*drawTreasureBody/, "treasure chest separates its body and lid structures");
assert.match(chestSource, /drawBossLid[\s\S]*drawBossBody/, "Boss chest keeps a dedicated reinforced body and lid model");
assert.match(chestSource, /geometry\.openedLidAnchor[\s\S]*geometry\.closedLidAnchor/, "open and closed lids consume authored geometry anchors");
assert.match(chestGeometrySource, /openedLidAnchor:[\s\S]*lootDropAnchor:[\s\S]*physicalFootprint:/, "chest geometry separates lid, loot and collision anchors");
assert.match(dungeonSource, /ChestRenderer\.drawPart/, "Dungeon delegates chest depth parts to the dedicated renderer");
assert.doesNotMatch(dungeonSource, /fillRect\(this\.chest\.x - 9/, "Dungeon no longer draws chests as inline flat rectangles");

console.log(JSON.stringify({
  enemies: Object.keys(ENEMIES).length,
  regularEnemies: themes.reduce((sum, theme) => sum + getEnemyPool(theme, undefined, 5).length, 0),
  bosses: themes.reduce((sum, theme) => sum + getBossPool(theme).length, 0),
  weapons: Object.keys(WEAPONS).length,
  hazardsChecked,
  obstacleVariants: obstacleVariants.size,
  specialRooms,
  encounterCoverage: Object.fromEntries([...encountered].map(([theme, ids]) => [theme, ids.size])),
  bossCoverage: Object.fromEntries([...bossesEncountered].map(([theme, ids]) => [theme, ids.size])),
  pixelTelegraphs: "ok",
  specialRoomReplacement: "wish-fountain-and-photo-booth",
  minimapLinks: "progressive-visited-and-adjacent",
  floorTileRendering: "zero-and-bridge-tiles",
}));
