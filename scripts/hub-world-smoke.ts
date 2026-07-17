import assert from "node:assert/strict";
import fs from "node:fs";
import { HUB_MAP, HUB_MAP_HEIGHT, HUB_MAP_WIDTH, HUB_TILE_SIZE } from "../src/game/hub/HubMap";
import { createDefaultHubProgress, normalizeHubProgress, resolveHubSpawn } from "../src/game/hub/HubProgress";
import { Camera2D } from "../src/game/world/Camera2D";
import { WorldCollision } from "../src/game/world/WorldCollision";
import { getWorldLayer, getWorldSize } from "../src/game/world/WorldMap";
import { WorldMapRenderer } from "../src/game/world/WorldMapRenderer";

assert.equal(HUB_MAP_WIDTH, 80);
assert.equal(HUB_MAP_HEIGHT, 60);
assert.equal(HUB_TILE_SIZE, 16);
assert.equal(HUB_MAP.widthTiles, 80);
assert.equal(HUB_MAP.heightTiles, 60);
assert.equal(HUB_MAP.tileSize, 16);
assert.deepEqual(getWorldSize(HUB_MAP), { width: 1280, height: 960 });

const requiredLayers = ["ground", "groundDetail", "collision", "backObjects", "upperObjects"] as const;
for (const id of requiredLayers) {
  const layer = getWorldLayer(HUB_MAP, id);
  assert.ok(layer, `missing Hub layer: ${id}`);
  assert.equal(layer.tiles.length, 80 * 60, `invalid tile count: ${id}`);
}

const collision = new WorldCollision(HUB_MAP);
const spawn = HUB_MAP.spawnPoints.rebirth_spring;
assert.ok(spawn);
assert.equal(collision.isCircleBlocked(spawn.x, spawn.y, 6), false, "rebirth spawn must be walkable");
assert.equal(collision.isTileBlocked(0, 0), true, "outer wall must collide");
assert.equal(collision.isTileBlocked(40, 30), true, "rebirth basin must collide");

const camera = new Camera2D(320, 240, { width: 96, height: 64 }, 7.5);
camera.snapTo(spawn.x, spawn.y, 1280, 960);
assert.ok(camera.x >= 0 && camera.x <= 960);
assert.ok(camera.y >= 0 && camera.y <= 720);
camera.snapTo(1270, 950, 1280, 960);
assert.equal(camera.x, 960);
assert.equal(camera.y, 720);
const visible = new WorldMapRenderer().getVisibleTileBounds(HUB_MAP, camera);
const visibleTileCount = (visible.endX - visible.startX + 1) * (visible.endY - visible.startY + 1);
assert.ok(visibleTileCount < HUB_MAP_WIDTH * HUB_MAP_HEIGHT / 3, "renderer must cull off-screen Hub tiles");

const requiredActions = [
  "open_rebirth_spring",
  "open_expedition",
  "open_meta_upgrades",
  "open_records",
  "open_settings",
] as const;
const actionObjects = new Map(HUB_MAP.objects.filter(object => object.action).map(object => [object.action, object]));
for (const action of requiredActions) assert.ok(actionObjects.has(action), `missing Hub action: ${action}`);

function interactionTile(action: string): { x: number; y: number } {
  const object = actionObjects.get(action);
  assert.ok(object, `missing action object: ${action}`);
  const ix = typeof object.properties?.interactionX === "number"
    ? object.properties.interactionX
    : object.x + (object.width ?? 0) / 2;
  const iy = typeof object.properties?.interactionY === "number"
    ? object.properties.interactionY
    : object.y + (object.height ?? 0) / 2;
  return { x: Math.floor(ix / HUB_TILE_SIZE), y: Math.floor(iy / HUB_TILE_SIZE) };
}

function reachable(target: { x: number; y: number }): boolean {
  const start = { x: Math.floor(spawn.x / HUB_TILE_SIZE), y: Math.floor(spawn.y / HUB_TILE_SIZE) };
  const queue = [start];
  const seen = new Set([`${start.x},${start.y}`]);
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.x === target.x && current.y === target.y) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const x = current.x + dx;
      const y = current.y + dy;
      const key = `${x},${y}`;
      if (seen.has(key) || collision.isTileBlocked(x, y)) continue;
      seen.add(key);
      queue.push({ x, y });
    }
  }
  return false;
}

for (const action of requiredActions) {
  const target = interactionTile(action);
  assert.equal(collision.isTileBlocked(target.x, target.y), false, `${action} interaction tile must be walkable`);
  assert.equal(reachable(target), true, `${action} must be reachable from rebirth spawn`);
}

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

assert.match(hubState, /HubPlayerController/);
assert.match(hubState, /PromptRenderer\.drawAt/);
assert.match(hubState, /progress\.x = this\.player\.x/);
assert.match(hubState, /this\.engine\.data\.saveMeta\(\)/);
assert.match(splashState, /switchState\("hub", \{ spawnAnchor: "rebirth_spring"/);
assert.doesNotMatch(splashState, /switchState\("title"/);
assert.match(characterState, /params\?\.hubMode === true/);
assert.match(hubState, /hubMode: true/);
assert.match(characterState, /setHubLoadout/);
assert.match(settingsState, /backState\?: "title" \| "hub"/);
assert.match(resultState, /spawnAnchor: "rebirth_spring"/);
assert.match(metaProgress, /META_SAVE_VERSION = 8/);
assert.match(hubRenderer, /drawSteppedSpire/);
assert.match(hubRenderer, /drawGabledRoof/);
assert.match(hubRenderer, /drawArchWindow/);
assert.match(hubRenderer, /drawButtress/);
assert.match(hubRenderer, /drawDistrictGate/);
assert.match(hubRenderer, /drawWaystone/);
const architecturalKinds = HUB_MAP.objects.filter(object => object.properties?.kind === "district_gate");
assert.equal(architecturalKinds.length, 6, "each side district needs a road-facing architectural gate");
assert.match(mapData, /MAP_WIDTH = 20/);
assert.match(mapData, /MAP_HEIGHT = 15/);

console.log(JSON.stringify({
  map: `${HUB_MAP_WIDTH}x${HUB_MAP_HEIGHT}`,
  worldPixels: getWorldSize(HUB_MAP),
  visibleTileCount,
  coreInteractions: requiredActions.length,
  pathConnectivity: "rebirth-to-core-facilities",
  camera: "dead-zone-smoothed-clamped",
  dungeonRoomContract: "20x15-unchanged",
  metaMigration: "v8-hub-progress",
}));
