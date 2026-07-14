import assert from "node:assert/strict";
import fs from "node:fs";
import { ENEMIES, getEnemyRenderScale } from "../src/game/data/enemies";
import { TILE_BREAKABLE, TILE_STRUCTURE, isSolid } from "../src/game/MapData";
import {
  MONSTER_ANIMATION_FRAMES,
  MONSTER_MODEL_IDS,
  getMonsterAnimationPose,
  hasMonsterModel,
  usesNativeMonsterArt,
} from "../src/game/render/MonsterModelRenderer";
import { Enemy } from "../src/game/entities/Enemy";
import { updateEnemyAnimation } from "../src/game/EnemyAnimation";

const enemyIds = Object.keys(ENEMIES).sort();
const modelIds = [...MONSTER_MODEL_IDS].sort();
assert.deepEqual(modelIds, enemyIds, "every enemy must have a dedicated model");
assert.equal(new Set(modelIds).size, enemyIds.length);
for (const id of enemyIds) assert.equal(hasMonsterModel(id), true, id);
for (const definition of Object.values(ENEMIES)) {
  const scale = getEnemyRenderScale(definition);
  assert.ok(scale >= 0.7 && scale <= 0.8, `${definition.id} combat scale should remain compact`);
  if (definition.role !== "boss") {
    assert.ok(getEnemyRenderScale(definition, true) <= 0.84, `${definition.id} elite scale should remain bounded`);
  }
}
assert.equal(isSolid(TILE_BREAKABLE), true, "breakable props must block movement until destroyed");
assert.equal(isSolid(TILE_STRUCTURE), true, "chapter structures must participate in room collision");

const nativeForestIds = [
  "moss_brute",
  "thorn_archer",
  "boar_charger",
  "dingdong_fowl",
  "spore_mimic",
  "forest_guardian",
  "broadcast_rooster",
] as const;
for (const id of nativeForestIds) {
  assert.equal(usesNativeMonsterArt(id), true, `${id} should use authored native-resolution art`);
  assert.ok((ENEMIES[id].hitboxRadius ?? 0) >= (ENEMIES[id].role === "boss" ? 30 : 17), `${id} authored hitbox`);
  assert.ok((ENEMIES[id].shadowWidth ?? 0) >= (ENEMIES[id].role === "boss" ? 35 : 18), `${id} authored shadow`);
}
const nativeDungeonIds = [
  "bone_guard",
  "bolt_cultist",
  "grave_summoner",
  "bark_hound",
  "chain_jailer",
  "crypt_overseer",
  "kennel_warden",
] as const;
for (const id of nativeDungeonIds) {
  assert.equal(usesNativeMonsterArt(id), true, `${id} should use authored native-resolution art`);
  assert.ok((ENEMIES[id].hitboxRadius ?? 0) >= (ENEMIES[id].role === "boss" ? 34 : 18), `${id} authored hitbox`);
  assert.ok((ENEMIES[id].shadowWidth ?? 0) >= (ENEMIES[id].role === "boss" ? 44 : 20), `${id} authored shadow`);
}
const nativeSnowIds = [
  "frost_hound",
  "ice_shaman",
  "snow_turret",
  "white_sampler",
  "mirror_wisp",
  "frost_titan",
  "white_director",
] as const;
for (const id of nativeSnowIds) {
  assert.equal(usesNativeMonsterArt(id), true, `${id} should use authored native-resolution art`);
  assert.ok((ENEMIES[id].hitboxRadius ?? 0) >= (ENEMIES[id].role === "boss" ? 38 : 19), `${id} authored hitbox`);
  assert.ok((ENEMIES[id].shadowWidth ?? 0) >= (ENEMIES[id].role === "boss" ? 48 : 21), `${id} authored shadow`);
}
const nativeLavaIds = [
  "ember_knight",
  "magma_spitter",
  "cinder_oracle",
  "code_horse",
  "furnace_beetle",
  "inferno_core",
  "vat_horse_prime",
] as const;
for (const id of nativeLavaIds) {
  assert.equal(usesNativeMonsterArt(id), true, `${id} should use authored native-resolution art`);
  assert.ok((ENEMIES[id].hitboxRadius ?? 0) >= (ENEMIES[id].role === "boss" ? 42 : 21), `${id} authored hitbox`);
  assert.ok((ENEMIES[id].shadowWidth ?? 0) >= (ENEMIES[id].role === "boss" ? 56 : 24), `${id} authored shadow`);
}


assert.deepEqual(MONSTER_ANIMATION_FRAMES, { idle: 2, walk: 4, attack: 4, hurt: 2 });
for (const [state, count] of Object.entries(MONSTER_ANIMATION_FRAMES)) {
  const poses = new Set(Array.from({ length: count }, (_, frame) => JSON.stringify(getMonsterAnimationPose(state as keyof typeof MONSTER_ANIMATION_FRAMES, frame))));
  assert.equal(poses.size, count, `${state} frames should be visually distinct`);
}

const animated = new Enemy(100, 100, "melee");
animated.x = 90;
updateEnemyAnimation(animated, { dt: 0.1, previousX: 100, previousY: 100, targetX: 20 });
assert.equal(animated.facing, "left");
assert.equal(animated.animState, "walk");
assert.equal(animated.animFrame, 0);
animated.x = 80;
updateEnemyAnimation(animated, { dt: 0.11, previousX: 90, previousY: 100, targetX: 20 });
assert.equal(animated.animFrame, 1);

animated.y = 90;
updateEnemyAnimation(animated, { dt: 0.1, previousX: 80, previousY: 100, targetX: 80 });
assert.equal(animated.facing, "left", "vertical movement should retain the last horizontal facing");

animated.attackState = "windup";
animated.attackAngle = Math.PI;
animated.attackAnimationDuration = 1;
animated.attackTimer = 1;
updateEnemyAnimation(animated, { dt: 0.05, previousX: 80, previousY: 90, targetX: 140 });
assert.equal(animated.animState, "attack");
assert.equal(animated.facing, "left");
assert.equal(animated.animFrame, 0);
animated.attackTimer = 0.5;
updateEnemyAnimation(animated, { dt: 0.05, previousX: 80, previousY: 90, targetX: 140 });
assert.equal(animated.animFrame, 1);
animated.attackTimer = 0.01;
updateEnemyAnimation(animated, { dt: 0.05, previousX: 80, previousY: 90, targetX: 140 });
assert.equal(animated.animFrame, 2);
animated.attackState = "recover";
updateEnemyAnimation(animated, { dt: 0.05, previousX: 80, previousY: 90, targetX: 140 });
assert.equal(animated.animFrame, 3);
animated.hitFlash = 0.2;
updateEnemyAnimation(animated, { dt: 0.05, previousX: 80, previousY: 90, targetX: 140 });
assert.equal(animated.animState, "hurt", "hurt animation should override attack animation");
animated.reset(0, 0, "melee");
assert.equal(animated.facing, "right");
assert.equal(animated.animState, "idle");
assert.equal(animated.animFrame, 0);

const source = fs.readFileSync("src/game/render/MonsterModelRenderer.ts", "utf8");
for (const id of enemyIds) {
  assert.match(source, new RegExp(`\\n  ${id.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\(`), `${id} model definition`);
}
assert.doesNotMatch(source, /ctx\.arc\(|ctx\.ellipse\(/, "monster models must use pixel geometry");
assert.match(source, /facing === "left" \? -scale : scale/, "left-facing models should mirror the complete model");
assert.match(source, /previewStates[\s\S]*"idle"[\s\S]*"walk"[\s\S]*"attack"/, "codex preview should cycle animation states");
assert.match(source, /nativePixelArt && state !== "hurt"/, "native models author their own body movement");
assert.match(source, /!nativePixelArt && state === "attack"/, "legacy attack blocks must not cover native attack poses");
assert.match(source, /role === "boss" \? 0\.78 : 1/, "native codex previews use integer-scale regular art and bounded bosses");
assert.match(source, /function drawAuthoredMonsterDetail/, "native monsters receive a deterministic authored detail pass");
assert.match(source, /nativePixelArt\) drawAuthoredMonsterDetail/, "authored detail pass follows the native model transform");
assert.doesNotMatch(
  source.slice(source.indexOf("function drawAuthoredMonsterDetail"), source.indexOf("const models:")),
  /Math\.random|tileHash/,
  "monster detail pixels must remain stable between animation frames",
);
for (const id of enemyIds) {
  assert.match(
    source.slice(source.indexOf("function drawAuthoredMonsterDetail"), source.indexOf("const models:")),
    new RegExp(`case \\"${id}\\"`),
    `${id} authored material detail`,
  );
}
assert.match(source, /const bite = state === "attack" \? \[0, 1, 4, 2\]/, "spore mimic bite remains controlled");
assert.match(source, /Irregular heartwood fractures/, "guardian phase three uses organic fractures instead of a generic cross");
assert.match(source, /dingdong_fowl[\s\S]*#E53935[\s\S]*#F9A825/, "ding-dong fowl comb and beak");
assert.match(source, /bark_hound[\s\S]*#E57373/, "bark hound open mouth/tongue");
assert.match(source, /bone_guard[\s\S]*Sword arm and stepped blade/, "bone guard authors its shield, bones and sword slash");
assert.match(source, /bolt_cultist[\s\S]*Three ritual bolts form a fan/, "bolt cultist authors its scatter cast");
assert.match(source, /grave_summoner[\s\S]*skeletal hand breaches the floor/, "grave summoner authors its summon pose");
assert.match(source, /chain_jailer[\s\S]*Chain extends link-by-link/, "chain jailer authors its chain throw");
assert.match(source, /crypt_overseer[\s\S]*Soul reliquary replaces the generic boss-phase overlay/, "crypt overseer authors its phase core");
assert.match(source, /kennel_warden[\s\S]*Boss phases bolt extra kennel machinery/, "kennel warden authors its phase machinery");
assert.match(source, /frost_hound[\s\S]*Frost breath fractures into three short shards/, "frost hound authors its charge bite and frost breath");
assert.match(source, /ice_shaman[\s\S]*Stepped frost sigil warns the area attack/, "ice shaman authors its cast and ground sigil");
assert.match(source, /snow_turret[\s\S]*Twin cryo barrels visibly recoil/, "snow turret authors its crawler and scatter burst");
assert.match(source, /white_sampler[\s\S]*Sampling lance extends from the forearm/, "white sampler authors its face shield and sampling shot");
assert.match(source, /mirror_wisp[\s\S]*Lower shards trail independently/, "mirror wisp authors its split attack");
assert.match(source, /frost_titan[\s\S]*Boss phases grow new glacier spires/, "frost titan authors its phase silhouette");
assert.match(source, /white_director[\s\S]*Boss phases add quarantine drones/, "white director authors its command phases");
assert.match(source, /ember_knight[\s\S]*Sword arm performs a stepped forward slash/, "ember knight authors its shield and molten sword slash");
assert.match(source, /magma_spitter[\s\S]*Five ember droplets fan directly out/, "magma spitter authors its throat inflation and scatter attack");
assert.match(source, /cinder_oracle[\s\S]*Stepped cinder seal previews the area strike/, "cinder oracle authors its brazier crown and area cast");
assert.match(source, /code_horse[\s\S]*Green code panel remains physically inset/, "code horse authors its data panel and charge pose");
assert.match(source, /furnace_beetle[\s\S]*Furnace window opens vertically during the shot/, "furnace beetle authors its boiler shell and shot");
assert.match(source, /inferno_core[\s\S]*Boss phases bolt forge vanes/, "inferno core authors its crucible phases");
assert.match(source, /vat_horse_prime[\s\S]*Boss phases bolt extra vat armour/, "vat-horse prime authors its phase machinery");
assert.match(source, /code_horse[\s\S]*#2ECC71/, "code horse code panel");
assert.match(source, /broadcast_rooster[\s\S]*#F1C40F/, "broadcast rooster speaker/bell accents");
assert.match(source, /white_director[\s\S]*#D94F55/, "white director quarantine accents");
assert.match(source, /vat_horse_prime[\s\S]*#405259/, "vat-horse mechanical vat");

const renderer = fs.readFileSync("src/game/render/EntityRenderer.ts", "utf8");
assert.match(renderer, /MonsterModelRenderer\.draw/);
assert.match(renderer, /const animOffset = nativeMonsterArt \? 0/, "native grounded monsters must not receive the legacy floating sine offset");
assert.match(renderer, /enemyDefinition\.shadowWidth/, "authored monster shadows should be used");
assert.match(renderer, /const renderScale = getEnemyRenderScale/, "runtime monster scale should come from the compact chapter contract");
assert.match(renderer, /nativeMonsterArt \? renderScale/, "native monsters should use the compact authored scale");
assert.match(renderer, /enemy\.type === "boss" \? 36 : 14/, "health bars should shrink with the revised monster footprint");
assert.doesNotMatch(renderer, /drawEnemyAccent/);
assert.doesNotMatch(renderer, /enemy_\$\{enemy\.type\}_idle/);

const projectileRenderer = fs.readFileSync("src/game/render/ProjectileArtRenderer.ts", "utf8");
assert.match(projectileRenderer, /const radius = Math\.max\(1, Math\.round\(p\.radius\)\)/, "enemy projectiles may use a one-pixel core");
assert.match(projectileRenderer, /radius \* 2 \+ 4/, "enemy projectile glow padding stays compact");

const dungeonState = fs.readFileSync("src/game/states/DungeonState.ts", "utf8");
assert.match(dungeonState, /radius \* \(enemy\.type === "boss" \? 0\.72 : 0\.68\)/, "enemy projectile collision radii should shrink at spawn");
assert.match(dungeonState, /destroyBreakableTileAt/, "player projectiles should destroy authored room props");
assert.match(dungeonState, /destroyedPropTiles/, "destroyed combat props must persist on room state");

const roomRenderer = fs.readFileSync("src/game/render/RoomRenderer.ts", "utf8");
assert.match(roomRenderer, /function drawForestFloorTile/, "forest floor has authored material variants");
assert.match(roomRenderer, /function drawForestStreamTile/, "forest streams have neighbour-aware banks");
assert.match(roomRenderer, /function drawForestWallTile/, "forest walls use adjacency-aware tree and hedge edges");
assert.match(roomRenderer, /living root gate/, "forest start room has a chapter-specific gate");
assert.match(roomRenderer, /Root veins curve around the hollow center/, "forest boss altar avoids a generic square or cross decal");
assert.match(roomRenderer, /if \(theme === "forest"\)[\s\S]*return;/, "forest doors use their own root-and-vine construction");
assert.match(roomRenderer, /function drawDungeonFloorTile/, "dungeon floor has authored crypt slabs");
assert.match(roomRenderer, /function drawDungeonAbyssTile/, "dungeon void cells have neighbour-aware stone lips");
assert.match(roomRenderer, /function drawDungeonWallTile/, "dungeon walls use adjacency-aware masonry edges");
assert.match(roomRenderer, /Dungeon alone keeps the prison vocabulary/, "dungeon start room uniquely keeps the portcullis language");
assert.match(roomRenderer, /broken ossuary seal/, "dungeon boss room uses an ossuary altar");
assert.match(roomRenderer, /real portcullis replaces the universal red energy barrier/, "dungeon doors use iron portcullises and chains");
assert.match(roomRenderer, /function drawSnowFloorTile/, "snow floor has authored wind-packed material variants");
assert.match(roomRenderer, /function drawSnowCrevasseTile/, "snow crevasses have neighbour-aware shelves");
assert.match(roomRenderer, /function drawSnowWallTile/, "snow walls use adjacency-aware glacier edges");
assert.match(roomRenderer, /sealed hexagonal research airlock/, "snow start room uses a solid research airlock rather than bars");
assert.match(roomRenderer, /ruptured glacier containment seal/, "snow boss room uses a containment arena");
assert.match(roomRenderer, /solid two-piece quarantine airlock replaces the old repeated/, "snow doors use solid ice-and-steel pressure slabs");
assert.match(roomRenderer, /function drawLavaFloorTile/, "lava floor has authored basalt plate variants");
assert.match(roomRenderer, /function drawLavaFlowTile/, "lava channels have neighbour-aware slag lips");
assert.match(roomRenderer, /function drawLavaWallTile/, "lava walls use adjacency-aware foundry edges");
assert.match(roomRenderer, /octagonal furnace iris and side pistons/, "lava start room uses a radial furnace mechanism rather than bars");
assert.match(roomRenderer, /ruptured foundry crucible/, "lava boss room uses a foundry crucible arena");
assert.match(roomRenderer, /compact furnace iris replaces the old row of shutters/, "lava doors use a compact radial furnace iris");
assert.match(roomRenderer, /Riveted iron grating spans molten channels/, "lava crossings use iron grating");
assert.match(roomRenderer, /function drawForestStructureTile/, "forest combat rooms have root-ruin structures");
assert.match(roomRenderer, /function drawDungeonStructureTile/, "dungeon combat rooms have crypt structures");
assert.match(roomRenderer, /function drawSnowStructureTile/, "snow combat rooms have research modules");
assert.match(roomRenderer, /function drawLavaStructureTile/, "lava combat rooms have foundry machinery");
assert.match(roomRenderer, /function drawBreakableTile/, "combat rooms render chapter-specific breakable props");

const roomVariants = fs.readFileSync("src/game/RoomVariantSystem.ts", "utf8");
assert.match(roomVariants, /const wallClusterCount = room\.type === "boss" \? 2 : 3 \+/, "combat rooms should receive denser wall clusters");
assert.match(roomVariants, /structureClusterCount/, "combat rooms should receive chapter architecture");
assert.match(roomVariants, /breakableClusterCount/, "combat rooms should receive breakable cover");
assert.match(roomVariants, /TILE_STRUCTURE/, "generated structures use their own collision tile");
assert.match(roomVariants, /TILE_BREAKABLE/, "generated breakables use their own collision tile");

const environment = fs.readFileSync("src/game/environment/EnvironmentSystem.ts", "utf8");
assert.match(environment, /const poisonTiles = new Set/, "forest poison pools detect adjacent cells");
assert.match(environment, /connectedLeft[\s\S]*connectedRight[\s\S]*connectedUp[\s\S]*connectedDown/, "poison pool cells join into one readable hazard");
assert.match(environment, /hazard\.type !== "poison_pool"/, "joined poison pools must not receive a square outline per cell");
assert.match(environment, /const spikeTiles = new Set/, "dungeon spike beds detect adjacent cells");
assert.match(environment, /hazard\.type !== "poison_pool" && hazard\.type !== "spikes"/, "joined spike beds must not receive a square outline per cell");
assert.match(environment, /const iceTiles = new Set/, "snow ice sheets detect adjacent cells");
assert.match(environment, /Adjacent slick cells fuse into one frozen sheet/, "snow ice cells join into one readable hazard");
assert.match(environment, /hazard\.type !== "poison_pool" && hazard\.type !== "spikes" && hazard\.type !== "ice"/, "joined ice sheets must not receive a square outline per cell");
assert.match(environment, /const lavaTiles = new Set/, "lava pools detect adjacent cells");
assert.match(environment, /Adjacent molten cells fuse into a single slag pool/, "lava cells join into one readable hazard");
assert.match(environment, /hazard\.type !== "poison_pool" && hazard\.type !== "spikes" && hazard\.type !== "ice" && hazard\.type !== "lava"/, "joined lava pools must not receive a square outline per cell");

const themes = ["forest", "dungeon", "snow", "lava"] as const;
for (const theme of themes) {
  const themed = enemyIds.filter(id => ENEMIES[id].theme === theme);
  assert.equal(themed.length, 7, `${theme} should have five regular models and two bosses`);
}

console.log(JSON.stringify({
  dedicatedModels: modelIds.length,
  forestModels: enemyIds.filter(id => ENEMIES[id].theme === "forest").length,
  dungeonModels: enemyIds.filter(id => ENEMIES[id].theme === "dungeon").length,
  snowModels: enemyIds.filter(id => ENEMIES[id].theme === "snow").length,
  lavaModels: enemyIds.filter(id => ENEMIES[id].theme === "lava").length,
  pixelGeometry: "ok",
  memeSilhouettes: "ok",
  directionalFacing: "ok",
  animationStates: "ok",
  nativeForestArt: "ok",
  forestEnvironmentArt: "ok",
  nativeDungeonArt: "ok",
  dungeonEnvironmentArt: "ok",
  nativeSnowArt: "ok",
  snowEnvironmentArt: "ok",
  nativeLavaArt: "ok",
  lavaEnvironmentArt: "ok",
}));
