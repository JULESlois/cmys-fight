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

const themes: EnemyTheme[] = ["forest", "dungeon", "snow", "lava"];
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
assert.equal(getAvailableWeapons(1).length, Object.keys(WEAPONS).length);
assert.equal(getAvailableWeapons(1).some(weapon => weapon.id === "vector_9"), true);
assert.equal(getAvailableWeapons(1).some(weapon => weapon.id === "micro_rocket"), true);
assert.equal(getAvailableWeapons(1).filter(weapon => weapon.rarity === "legendary").length, 17);
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
assert.match(minimapSource, /room\.doors\.right[\s\S]*room\.doors\.down/);
assert.match(minimapSource, /room\.visited \|\| isCurrent/);
assert.match(minimapSource, /visibleKeys\.has/);
assert.match(minimapSource, /ctx\.fillText\("\?"/);
assert.match(minimapSource, /for \(const room of visible\) \{[\s\S]*minX = Math\.min\(minX, room\.x\)/);
assert.doesNotMatch(minimapSource, /for \(const room of floor\.rooms\) \{\s*minX = Math\.min/);
assert.match(gameDataSource, /room\.type = "combat"/);
assert.match(gameDataSource, /room\.templateId = "legacy_room"/);
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
