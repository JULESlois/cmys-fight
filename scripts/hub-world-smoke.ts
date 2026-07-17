import assert from "node:assert/strict";
import fs from "node:fs";
import {
  HUB_ENTRY_POINTS,
  HUB_FOOTPRINT_POINTS,
  HUB_MAP,
  HUB_MAP_HEIGHT,
  HUB_MAP_VERSION,
  HUB_MAP_WIDTH,
  HUB_TILE_SIZE,
} from "../src/game/hub/HubMap";
import { HUB_ART_METRICS, HUB_BUILDING_METRICS } from "../src/game/hub/HubArtMetrics";
import { HUB_MOVE_SPEED } from "../src/game/hub/HubPlayerController";
import { createDefaultHubProgress, normalizeHubProgress, resolveHubSpawn } from "../src/game/hub/HubProgress";
import { Camera2D } from "../src/game/world/Camera2D";
import { WorldCollision } from "../src/game/world/WorldCollision";
import { WorldInteraction } from "../src/game/world/WorldInteraction";
import { getWorldLayer, getWorldSize, type WorldMapDefinition, type WorldObjectDefinition } from "../src/game/world/WorldMap";
import { WorldMapRenderer } from "../src/game/world/WorldMapRenderer";

assert.equal(HUB_MAP_WIDTH, 80);
assert.equal(HUB_MAP_HEIGHT, 60);
assert.equal(HUB_TILE_SIZE, 16);
assert.equal(HUB_MAP_VERSION, 2);
assert.equal(HUB_MAP.widthTiles, 80);
assert.equal(HUB_MAP.heightTiles, 60);
assert.equal(HUB_MAP.tileSize, 16);
assert.deepEqual(getWorldSize(HUB_MAP), { width: 1280, height: 960 });
assert.equal(HUB_MOVE_SPEED, 100, "Hub movement must not inherit combat character speed");

const requiredLayers = ["ground", "groundDetail", "collision", "backObjects", "upperObjects", "roof"] as const;
for (const id of requiredLayers) {
  const layer = getWorldLayer(HUB_MAP, id);
  assert.ok(layer, `missing Hub layer: ${id}`);
  assert.equal(layer.tiles.length, 80 * 60, `invalid tile count: ${id}`);
}

const backObjects = getWorldLayer(HUB_MAP, "backObjects")!;
assert.deepEqual([...new Set(backObjects.tiles.filter(Boolean))], [1], "backObjects must only contain true tile architecture");
assert.ok(getWorldLayer(HUB_MAP, "roof")!.tiles.some(Boolean), "roof layer must be populated and used");

const collision = new WorldCollision(HUB_MAP);
const spawn = HUB_MAP.spawnPoints.rebirth_spring;
assert.ok(spawn);
assert.equal(collision.isCircleBlocked(spawn.x, spawn.y, 6), false, "rebirth spawn must be walkable");
assert.equal(collision.isTileBlocked(0, 0), true, "outer wall must collide");
assert.ok((HUB_MAP.colliders?.length ?? 0) >= 25, "Hub facilities must use map colliders");
assert.ok(HUB_MAP.colliders?.some(collider => collider.shape === "rect"));
assert.ok(HUB_MAP.colliders?.some(collider => collider.shape === "circle"));

for (const [id, point] of Object.entries(HUB_ENTRY_POINTS)) {
  assert.equal(collision.isCircleBlocked(point.x, point.y, 6), false, `${id} entrance must be walkable`);
}
for (const [id, point] of Object.entries(HUB_FOOTPRINT_POINTS)) {
  assert.equal(collision.isCircleBlocked(point.x, point.y, 2), true, `${id} foundation must collide`);
}

// The former full 9x7 spring rectangle produced invisible blockers at all four corners.
for (const point of [
  { x: 586, y: 450 }, { x: 710, y: 450 },
  { x: 586, y: 526 }, { x: 710, y: 526 },
]) {
  assert.equal(collision.isCircleBlocked(point.x, point.y, 4), false, `spring outer corner ${point.x},${point.y} must be clear`);
}
assert.equal(collision.isCircleBlocked(648, 532, 6), false, "spring southern stairs must be passable");
assert.equal(collision.isCircleBlocked(648, 486, 2), true, "spring basin water must collide");

function latticePoint(point: { x: number; y: number }, step: number): { x: number; y: number } {
  return { x: Math.round(point.x / step) * step, y: Math.round(point.y / step) * step };
}

function reachableWorld(targetPoint: { x: number; y: number }): boolean {
  const step = 8;
  const start = latticePoint(spawn, step);
  const target = latticePoint(targetPoint, step);
  const queue = [start];
  const seen = new Set([`${start.x},${start.y}`]);
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (Math.hypot(current.x - target.x, current.y - target.y) <= step) return true;
    for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]] as const) {
      const x = current.x + dx;
      const y = current.y + dy;
      const key = `${x},${y}`;
      if (seen.has(key) || collision.isCircleBlocked(x, y, 6)) continue;
      seen.add(key);
      queue.push({ x, y });
    }
  }
  return false;
}

for (const [id, point] of Object.entries(HUB_ENTRY_POINTS)) {
  assert.equal(reachableWorld(point), true, `${id} entrance must be reachable from rebirth spawn`);
}

const requiredActions = [
  "open_rebirth_spring",
  "open_expedition",
  "open_meta_upgrades",
  "open_records",
  "open_settings",
  "open_armory",
] as const;
const actionObjects = new Map(HUB_MAP.objects.filter(object => object.action).map(object => [object.action, object]));
for (const action of requiredActions) {
  const object = actionObjects.get(action);
  assert.ok(object, `missing Hub action: ${action}`);
  assert.equal(object.interaction?.requireLineOfSight, true, `${action} must require line of sight`);
  assert.equal(object.properties?.visible, false, `${action} must use an invisible hotspot`);
}

const structureKinds = ["archive_keep", "observatory_keep", "workshop_keep", "armory_keep", "rebirth_spring", "expedition_structure"];
for (const kind of structureKinds) {
  const parts = HUB_MAP.objects.filter(object => object.properties?.kind === kind);
  assert.equal(parts.length, 3, `${kind} must have back/base/front parts`);
  assert.deepEqual(parts.map(object => object.properties?.part).sort(), ["back", "base", "front"]);
  assert.ok(parts.every(object => object.visualBounds), `${kind} must expose visual bounds for debug QA`);
}
assert.ok(HUB_BUILDING_METRICS.archive_keep.width < 320, "archive keep must not fill the complete viewport width");
assert.equal(HUB_BUILDING_METRICS.archive_keep.doorWidth, HUB_ART_METRICS.majorDoorWidth);
assert.equal(HUB_BUILDING_METRICS.workshop_keep.doorHeight, HUB_ART_METRICS.normalDoorHeight);

const requiredZoneKeys = [
  "hub.zone.centralPlaza",
  "hub.zone.northRoad",
  "hub.zone.southCourt",
  "hub.zone.eastRoad",
  "hub.zone.westRoad",
  "hub.zone.sanctuary",
];
for (const labelKey of requiredZoneKeys) {
  assert.ok(HUB_MAP.objects.some(object => object.type === "region" && object.properties?.labelKey === labelKey), `missing region ${labelKey}`);
}

// A player inside a broad interaction circle but behind a wall cannot trigger it.
const losMap: WorldMapDefinition = {
  id: "los-test",
  version: 1,
  widthTiles: 8,
  heightTiles: 6,
  tileSize: 16,
  layers: [
    { id: "ground", tiles: Array(48).fill(1) },
    { id: "collision", tiles: Array(48).fill(0) },
  ],
  colliders: [{ id: "wall", shape: "rect", x: 48, y: 0, width: 16, height: 96 }],
  objects: [],
  spawnPoints: {},
};
const losCollision = new WorldCollision(losMap);
const wallInteraction: WorldObjectDefinition = {
  id: "wall-terminal",
  type: "interactable",
  x: 72,
  y: 32,
  action: "test",
  interaction: {
    zone: { shape: "circle", x: 80, y: 48, radius: 52 },
    promptPoint: { x: 80, y: 48 },
    lineOfSightTarget: { x: 72, y: 48 },
    requireLineOfSight: true,
  },
};
assert.equal(new WorldInteraction(losCollision).findNearest(40, 48, [wallInteraction]), null, "wall must block interaction LOS");
const noLosInteraction = { ...wallInteraction, interaction: { ...wallInteraction.interaction!, requireLineOfSight: false } };
assert.ok(new WorldInteraction(losCollision).findNearest(40, 48, [noLosInteraction]), "control interaction should be in range without LOS");

// A low-FPS/high-speed move cannot tunnel through one collision tile.
const wallTiles = Array(10 * 8).fill(0);
for (let y = 0; y < 8; y++) wallTiles[y * 10 + 4] = 1;
const speedMap: WorldMapDefinition = {
  id: "speed-test",
  version: 1,
  widthTiles: 10,
  heightTiles: 8,
  tileSize: 16,
  layers: [
    { id: "ground", tiles: Array(80).fill(1) },
    { id: "collision", tiles: wallTiles },
  ],
  objects: [],
  spawnPoints: {},
};
const speedCollision = new WorldCollision(speedMap);
const highSpeedMove = speedCollision.moveCircle(32, 56, 6, 120, 0);
assert.ok(highSpeedMove.x <= 58.01, `substeps must stop before the wall, got ${highSpeedMove.x}`);

const camera = new Camera2D(320, 240, { width: 96, height: 64 }, 7.5);
camera.snapTo(spawn.x, spawn.y, 1280, 960);
assert.ok(camera.x >= 0 && camera.x <= 960);
assert.ok(camera.y >= 0 && camera.y <= 720);
camera.x = 10.4;
camera.y = 20.6;
assert.equal(camera.renderX, 10);
assert.equal(camera.renderY, 21);
assert.deepEqual(camera.worldToScreen(100, 100), { x: 90, y: 79 });
assert.deepEqual(camera.screenToWorld(90, 79), { x: 100, y: 100 });
assert.deepEqual(camera.getViewRect(), { x: 10, y: 21, width: 320, height: 240 });
assert.deepEqual(camera.getDeadZoneWorldRect(), { x: 122, y: 109, width: 96, height: 64 });
camera.snapTo(1270, 950, 1280, 960);
assert.equal(camera.x, 960);
assert.equal(camera.y, 720);
const visible = new WorldMapRenderer().getVisibleTileBounds(HUB_MAP, camera);
const visibleTileCount = (visible.endX - visible.startX + 1) * (visible.endY - visible.startY + 1);
assert.ok(visibleTileCount < HUB_MAP_WIDTH * HUB_MAP_HEIGHT / 3, "renderer must cull off-screen Hub tiles");

const defaults = createDefaultHubProgress(HUB_MAP.version);
assert.equal(defaults.anchorId, "rebirth_spring");
assert.ok(defaults.unlockedFacilities.includes("expedition_gate"));
const migrated = normalizeHubProgress({ selectedCharacterId: "kanami", x: 999999, y: -20 });
const resolved = resolveHubSpawn(migrated, HUB_MAP, collision);
assert.deepEqual(resolved, spawn, "invalid migrated position must fall back to the rebirth anchor");

const source = (path: string) => fs.readFileSync(path, "utf8");
const hubState = source("src/game/states/HubState.ts");
const splashState = source("src/game/states/SplashState.ts");
const characterState = source("src/game/states/CharacterSelectState.ts");
const settingsState = source("src/game/states/SettingsState.ts");
const resultState = source("src/game/states/RunResultState.ts");
const mapData = source("src/game/MapData.ts");
const metaProgress = source("src/game/MetaProgress.ts");
const hubRenderer = source("src/game/hub/HubWorldRenderer.ts");
const groundRenderer = source("src/game/hub/HubGroundRenderer.ts");
const debugOverlay = source("src/game/hub/HubDebugOverlay.ts");
const collisionSource = source("src/game/world/WorldCollision.ts");

assert.match(hubState, /HubPlayerController/);
assert.match(hubState, /HubDebugOverlay\.draw/);
assert.match(hubState, /wasPressed\("f7"\)/);
assert.match(hubState, /drawObjects\(ctx, this\.map, this\.camera, "front"/);
assert.match(hubState, /drawRoofTiles/);
assert.match(hubState, /progress\.x = this\.player\.x/);
assert.match(hubState, /this\.engine\.data\.saveMeta\(\)/);
assert.match(splashState, /switchState\("hub", \{ spawnAnchor: "rebirth_spring"/);
assert.doesNotMatch(splashState, /switchState\("title"/);
assert.match(splashState, /input\.wasAnyPressed\(\)/);
assert.doesNotMatch(splashState, /keysJustPressed|touchJustPressed|gamepadJustPressed/);
assert.match(characterState, /params\?\.hubMode === true/);
assert.match(hubState, /hubMode: true/);
assert.match(characterState, /setHubLoadout/);
assert.match(settingsState, /backState\?: "title" \| "hub"/);
assert.match(resultState, /spawnAnchor: "rebirth_spring"/);
assert.match(metaProgress, /META_SAVE_VERSION = 8/);
assert.match(hubRenderer, /HubArchitectureRenderer/);
assert.match(groundRenderer, /Immediate edge and second-ring edge together form a two-tile transition/);
assert.match(groundRenderer, /Outer corner/);
assert.match(groundRenderer, /Inner corner/);
assert.match(debugOverlay, /#FF3B3B/);
assert.match(debugOverlay, /#30F2F2/);
assert.match(debugOverlay, /#FFE45E/);
assert.match(debugOverlay, /#D65CFF/);
assert.match(collisionSource, /Math\.min\(this\.map\.tileSize \/ 4, radius \* 0\.5\)/);
const architecturalKinds = HUB_MAP.objects.filter(object => object.properties?.kind === "district_gate");
assert.equal(architecturalKinds.length, 6, "each side district needs a road-facing architectural gate");
assert.match(mapData, /MAP_WIDTH = 20/);
assert.match(mapData, /MAP_HEIGHT = 15/);

console.log(JSON.stringify({
  map: `${HUB_MAP_WIDTH}x${HUB_MAP_HEIGHT}`,
  worldPixels: getWorldSize(HUB_MAP),
  mapColliders: HUB_MAP.colliders?.length ?? 0,
  coreEntrances: Object.keys(HUB_ENTRY_POINTS).length,
  reachableEntrances: "all",
  springCornerClearance: "four-corners-and-south-stairs",
  lineOfSight: "wall-blocked",
  highSpeedCollision: "one-tile-wall-blocked",
  groundTransitions: "two-tile-cardinal-plus-inner-outer-corners",
  renderLayers: "back-base-front-roof",
  fixedHubSpeed: HUB_MOVE_SPEED,
  visibleTileCount,
  camera: "dead-zone-smoothed-pixel-snapped",
  dungeonRoomContract: "20x15-unchanged",
  metaMigration: "v8-hub-progress",
}));
