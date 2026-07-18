import assert from "node:assert/strict";
import fs from "node:fs";
import {
  HubGroundDetailTile,
  HUB_ENTRY_POINTS,
  HUB_MAP,
  HUB_MAP_HEIGHT,
  HUB_MAP_VERSION,
  HUB_MAP_WIDTH,
  HUB_TILE_SIZE,
} from "../src/game/hub/HubMap";
import { HUB_ART_METRICS, HUB_BUILDING_METRICS } from "../src/game/hub/HubArtMetrics";
import { HUB_MOVE_SPEED } from "../src/game/hub/HubPlayerController";
import {
  HUB_MATERIALIZED_STRUCTURE_BY_ID,
  HUB_STRUCTURE_DEFINITIONS,
  HUB_STRUCTURES,
} from "../src/game/hub/structures/HubStructures";
import { createDefaultHubProgress, normalizeHubProgress, resolveHubSpawn } from "../src/game/hub/HubProgress";
import { Camera2D } from "../src/game/world/Camera2D";
import { WorldCollision } from "../src/game/world/WorldCollision";
import { WorldInteraction } from "../src/game/world/WorldInteraction";
import {
  getWorldLayer,
  getWorldSize,
  type WorldInteractionZone,
  type WorldMapDefinition,
  type WorldObjectDefinition,
  type WorldPoint,
} from "../src/game/world/WorldMap";
import { WorldMapRenderer } from "../src/game/world/WorldMapRenderer";
import { moveSweptCircle } from "../src/game/physics/SweptCircleMovement";
import { OcclusionController } from "../src/game/world/OcclusionController";
import { closestPointOnFootprints, colliderToSpatialShape } from "../src/game/world/SpatialSemantics";

assert.equal(HUB_MAP_WIDTH, 80);
assert.equal(HUB_MAP_HEIGHT, 60);
assert.equal(HUB_TILE_SIZE, 16);
assert.equal(HUB_MAP_VERSION, 3);
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
assert.ok(getWorldLayer(HUB_MAP, "roof")!.tiles.some(Boolean), "roof layer must remain populated for sanctuary wall lips");

const collision = new WorldCollision(HUB_MAP);
const worldInteraction = new WorldInteraction(collision);
const spawn = HUB_MAP.spawnPoints.rebirth_spring;
assert.ok(spawn);
assert.equal(collision.isCircleBlocked(spawn.x, spawn.y, 6), false, "rebirth spawn must be walkable");
assert.equal(collision.isTileBlocked(0, 0), true, "outer wall must collide");
assert.ok(HUB_MAP.colliders?.some(collider => collider.shape === "rect"));
assert.ok(HUB_MAP.colliders?.some(collider => collider.shape === "circle"));

const expectedStructureIds = [
  "rebirth_spring",
  "archive_keep",
  "observatory_keep",
  "workshop_keep",
  "armory_keep",
  "expedition_gate",
] as const;
assert.deepEqual(HUB_STRUCTURE_DEFINITIONS.map(definition => definition.id), expectedStructureIds);
assert.equal(HUB_STRUCTURES.length, expectedStructureIds.length);

const expectedRegionIds = [
  "zone_rebirth",
  "zone_workshop",
  "zone_archive",
  "zone_observatory",
  "zone_armory",
  "zone_garden",
  "zone_training",
  "zone_expedition",
  "zone_central_plaza",
  "zone_north_road",
  "zone_south_court",
  "zone_east_road",
  "zone_west_road",
  "zone_sanctuary",
].sort();
assert.deepEqual(
  HUB_MAP.objects.filter(object => object.type === "region").map(object => object.id).sort(),
  expectedRegionIds,
  "this Hub repair must not add or remove regions",
);

for (const definition of HUB_STRUCTURE_DEFINITIONS) {
  assert.ok(Number.isFinite(definition.origin.x) && Number.isFinite(definition.origin.y), `${definition.id} needs an origin`);
  assert.ok(definition.visualBounds.width > 0 && definition.visualBounds.height > 0, `${definition.id} needs visual bounds`);
  assert.ok(definition.visualParts.length > 0, `${definition.id} needs local visual parts`);
  assert.ok(definition.colliders.length > 0, `${definition.id} needs local colliders`);
  assert.ok(definition.interactions.length > 0, `${definition.id} needs local interactions`);
  assert.ok(Object.keys(definition.anchors).length > 0, `${definition.id} needs local anchors`);
  assert.ok(definition.occluders.length > 0, `${definition.id} needs local occluders`);
  assert.ok(["blocked-footprint", "roof-occluder", "map-layout"].includes(definition.rearAccessRule));

  const materialized = HUB_MATERIALIZED_STRUCTURE_BY_ID.get(definition.id);
  assert.ok(materialized, `${definition.id} must be materialized`);
  for (const part of [...definition.visualParts, ...definition.occluders]) {
    const object = materialized.objects.find(candidate => candidate.id === `${definition.id}:${part.id}`);
    assert.ok(object, `${definition.id}:${part.id} must become a world object`);
    assert.equal(object.x, definition.origin.x + part.bounds.x);
    assert.equal(object.y, definition.origin.y + part.bounds.y);
    assert.equal(object.width, part.bounds.width);
    assert.equal(object.height, part.bounds.height);
    assert.equal(object.properties?.structureId, definition.id);
  }
  for (const [anchorId, local] of Object.entries(definition.anchors)) {
    assert.deepEqual(materialized.anchors[anchorId], {
      x: definition.origin.x + local.x,
      y: definition.origin.y + local.y,
    });
  }
  for (const localCollider of definition.colliders) {
    if (localCollider.shape !== "rect" || !("fromVisualPartId" in localCollider)) continue;
    const sourcePart = [...definition.visualParts, ...definition.occluders].find(part => part.id === localCollider.fromVisualPartId);
    const worldCollider = materialized.colliders.find(candidate => candidate.id === `${definition.id}:${localCollider.id}`);
    assert.ok(sourcePart && worldCollider?.shape === "rect", `${definition.id}:${localCollider.id} must derive from its visual part`);
    const inset = localCollider.inset ?? 0;
    assert.deepEqual(
      { x: worldCollider.x, y: worldCollider.y, width: worldCollider.width, height: worldCollider.height },
      {
        x: definition.origin.x + sourcePart.bounds.x + inset,
        y: definition.origin.y + sourcePart.bounds.y + inset,
        width: sourcePart.bounds.width - inset * 2,
        height: sourcePart.bounds.height - inset * 2,
      },
      `${definition.id}:${localCollider.id} must match local visual bounds`,
    );
  }
}

const structureObjects = HUB_MAP.objects.filter(object => object.properties?.kind === "hub_structure_part");
assert.ok(structureObjects.length > 20, "restored architecture must be split into detailed local parts");
assert.equal(structureObjects.some(object => object.properties?.layer === "front"), false, "whole-building front overlays are forbidden");
for (const definition of HUB_STRUCTURE_DEFINITIONS) {
  const structureParts = structureObjects.filter(object => object.properties?.structureId === definition.id);
  assert.equal(structureParts.length, definition.visualParts.length + definition.occluders.length);
  const occluders = structureParts.filter(object => object.properties?.role === "occluder");
  assert.equal(occluders.length, definition.occluders.length);
  assert.ok(occluders.every(object => typeof object.sortY === "number"), `${definition.id} occluders must be Y-sortable`);
  const structureTop = definition.origin.y + definition.visualBounds.y;
  const structureBottom = structureTop + definition.visualBounds.height;
  for (const occluder of occluders) {
    assert.ok(
      (occluder.sortY ?? structureTop) >= structureTop && (occluder.sortY ?? structureBottom) <= structureBottom,
      `${occluder.id} sortY must stay inside the structure projection`,
    );
    const playerBehindSortY = structureTop - 1 + 8;
    const playerInFrontSortY = structureBottom + 1 + 8;
    assert.ok(playerBehindSortY < occluder.sortY!, `${occluder.id} must cover a player behind it`);
    assert.ok(playerInFrontSortY > occluder.sortY!, `${occluder.id} must not cover a player in front of it`);
  }
}

const visiblePropObjects = new Map<string, WorldObjectDefinition>();
for (const object of HUB_MAP.objects.filter(candidate => candidate.properties?.visible !== false)) {
  visiblePropObjects.set(object.id, object);
  if (typeof object.properties?.visiblePropId === "string") {
    visiblePropObjects.set(object.properties.visiblePropId, object);
  }
}
for (const hotspot of HUB_MAP.objects.filter(object => object.action)) {
  const visiblePropId = hotspot.properties?.visiblePropId;
  assert.equal(typeof visiblePropId, "string", `${hotspot.id} must bind to a visible prop`);
  assert.ok(visiblePropObjects.has(visiblePropId as string), `${hotspot.id} visible prop ${String(visiblePropId)} is missing`);
  assert.equal(hotspot.properties?.visible, false, `${hotspot.id} must remain an invisible hotspot`);
  assert.equal(hotspot.interaction?.requireLineOfSight, true, `${hotspot.id} must require LOS`);
}

const physicalVisibleProps = HUB_MAP.objects.filter(object =>
  object.type === "decoration" && typeof object.properties?.visiblePropId === "string"
);
const linkedColliders = HUB_MAP.colliders ?? [];
for (const prop of physicalVisibleProps) {
  const visiblePropId = prop.properties?.visiblePropId as string;
  const policy = prop.properties?.collisionPolicy;
  assert.ok(policy === "none" || policy === "footprint" || policy === "custom", `${visiblePropId} needs collisionPolicy`);
  const propColliders = linkedColliders.filter(collider => collider.properties?.visiblePropId === visiblePropId);
  if (policy === "none") continue;
  assert.ok(propColliders.length > 0, `${visiblePropId} must link at least one collider`);
  const bounds = prop.visualBounds;
  if (bounds) {
    assert.ok(propColliders.some(collider => {
      if (collider.shape === "rect") {
        return collider.width < bounds.width || collider.height < bounds.height;
      }
      if (collider.shape === "circle") return collider.radius * 2 < Math.max(bounds.width, bounds.height);
      return true;
    }), `${visiblePropId} collision must use a ground footprint, not full visualBounds`);
  }
}

for (const object of HUB_MAP.objects.filter(candidate => candidate.interactionShell)) {
  assert.ok(object.physicalFootprint?.length, `${object.id} interactionShell requires physicalFootprint`);
  assert.equal(object.interaction?.side, undefined, `${object.id} proximity shell must not keep a side restriction`);
}

const movementDirections = [
  [0, -1], [0, 1], [-1, 0], [1, 0],
  [-Math.SQRT1_2, -Math.SQRT1_2], [Math.SQRT1_2, -Math.SQRT1_2],
  [-Math.SQRT1_2, Math.SQRT1_2], [Math.SQRT1_2, Math.SQRT1_2],
] as const;
const movementDts = [1 / 60, 1 / 30, 0.1] as const;
let directionalTrajectoryChecks = 0;
for (const collider of linkedColliders.filter(candidate => candidate.properties?.visiblePropId)) {
  const shape = colliderToSpatialShape(collider);
  const isolatedMap: WorldMapDefinition = {
    id: `isolated:${collider.id}`,
    version: 1,
    widthTiles: 200,
    heightTiles: 200,
    tileSize: 16,
    layers: [
      { id: "ground", tiles: Array(200 * 200).fill(1) },
      { id: "collision", tiles: Array(200 * 200).fill(0) },
    ],
    colliders: [collider],
    objects: [],
    spawnPoints: {},
  };
  const isolated = new WorldCollision(isolatedMap);
  const bounds = collider.shape === "rect"
    ? { x: collider.x, y: collider.y, width: collider.width, height: collider.height }
    : collider.shape === "circle"
      ? { x: collider.x - collider.radius, y: collider.y - collider.radius, width: collider.radius * 2, height: collider.radius * 2 }
      : {
          x: Math.min(...collider.points.map(point => point.x)),
          y: Math.min(...collider.points.map(point => point.y)),
          width: Math.max(...collider.points.map(point => point.x)) - Math.min(...collider.points.map(point => point.x)),
          height: Math.max(...collider.points.map(point => point.y)) - Math.min(...collider.points.map(point => point.y)),
        };
  const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  for (const dt of movementDts) {
    for (const [directionX, directionY] of movementDirections) {
      const startDistance = Math.max(bounds.width, bounds.height) + 42;
      let actor = {
        x: center.x + directionX * startDistance,
        y: center.y + directionY * startDistance,
      };
      for (let step = 0; step < 180; step++) {
        const dx = center.x - actor.x;
        const dy = center.y - actor.y;
        const distance = Math.hypot(dx, dy) || 1;
        const moved = moveSweptCircle({
          ...actor,
          radius: 6,
          deltaX: dx / distance * HUB_MOVE_SPEED * dt,
          deltaY: dy / distance * HUB_MOVE_SPEED * dt,
          isBlocked: (x, y, radius) => isolated.isCircleBlocked(x, y, radius),
        });
        actor = { x: moved.x, y: moved.y };
      }
      assert.equal(isolated.isCircleBlocked(actor.x, actor.y, 6), false, `${collider.id} trajectory entered footprint`);
      const closest = closestPointOnFootprints([shape], actor.x, actor.y);
      assert.ok(closest, `${collider.id} closest footprint point`);
      assert.ok(Math.abs(closest.distance - 6) <= 1.01, `${collider.id} stop error ${closest.distance} at dt=${dt}`);
      directionalTrajectoryChecks++;
    }
  }
}

assert.equal(collision.isCircleBlocked(413, 266, 6), true, "district gate left pillar blocks");
assert.equal(collision.isCircleBlocked(467, 266, 6), true, "district gate right pillar blocks");
assert.equal(collision.isCircleBlocked(440, 266, 6), false, "district gate center remains passable");
assert.equal(collision.isCircleBlocked(476, 353, 4), true, "plaza colonnade pillar blocks");
assert.equal(collision.isCircleBlocked(1088, 823, 6), true, "trial altar base blocks");
assert.equal(collision.isCircleBlocked(1000, 825, 6), true, "training marker base blocks");
assert.equal(collision.isCircleBlocked(502, 330, 4), false, "plaza banner cloth does not block");
assert.equal(collision.isCircleBlocked(132, 310, 4), false, "workshop smoke does not block");

interface CollisionSample {
  label: "visual-base" | "door-corridor" | "stairs" | "side-wall" | "rear-wall" | "exterior";
  point: WorldPoint;
  blocked: boolean;
}
const collisionSamples: Record<(typeof expectedStructureIds)[number], CollisionSample[]> = {
  rebirth_spring: [
    { label: "visual-base", point: { x: 648, y: 484 }, blocked: true },
    { label: "door-corridor", point: { x: 648, y: 514 }, blocked: false },
    { label: "stairs", point: { x: 648, y: 522 }, blocked: false },
    { label: "side-wall", point: { x: 594, y: 488 }, blocked: true },
    { label: "rear-wall", point: { x: 648, y: 466 }, blocked: true },
    { label: "exterior", point: { x: 648, y: 540 }, blocked: false },
  ],
  archive_keep: [
    { label: "visual-base", point: { x: 180, y: 190 }, blocked: true },
    { label: "door-corridor", point: { x: 264, y: 190 }, blocked: false },
    { label: "stairs", point: { x: 264, y: 212 }, blocked: false },
    { label: "side-wall", point: { x: 170, y: 190 }, blocked: true },
    { label: "rear-wall", point: { x: 264, y: 146 }, blocked: true },
    { label: "exterior", point: { x: 264, y: 264 }, blocked: false },
  ],
  observatory_keep: [
    { label: "visual-base", point: { x: 980, y: 190 }, blocked: true },
    { label: "door-corridor", point: { x: 1056, y: 190 }, blocked: false },
    { label: "stairs", point: { x: 1056, y: 212 }, blocked: false },
    { label: "side-wall", point: { x: 966, y: 190 }, blocked: true },
    { label: "rear-wall", point: { x: 1056, y: 146 }, blocked: true },
    { label: "exterior", point: { x: 1056, y: 264 }, blocked: false },
  ],
  workshop_keep: [
    { label: "visual-base", point: { x: 146, y: 450 }, blocked: true },
    { label: "door-corridor", point: { x: 200, y: 458 }, blocked: false },
    { label: "stairs", point: { x: 220, y: 502 }, blocked: false },
    { label: "side-wall", point: { x: 146, y: 458 }, blocked: true },
    { label: "rear-wall", point: { x: 240, y: 404 }, blocked: true },
    { label: "exterior", point: { x: 240, y: 510 }, blocked: false },
  ],
  armory_keep: [
    { label: "visual-base", point: { x: 980, y: 450 }, blocked: true },
    { label: "door-corridor", point: { x: 1064, y: 452 }, blocked: false },
    { label: "stairs", point: { x: 1064, y: 478 }, blocked: false },
    { label: "side-wall", point: { x: 964, y: 450 }, blocked: true },
    { label: "rear-wall", point: { x: 1064, y: 404 }, blocked: true },
    { label: "exterior", point: { x: 1064, y: 510 }, blocked: false },
  ],
  expedition_gate: [
    { label: "visual-base", point: { x: 573, y: 890 }, blocked: true },
    { label: "door-corridor", point: { x: 648, y: 860 }, blocked: false },
    { label: "stairs", point: { x: 648, y: 916 }, blocked: false },
    { label: "side-wall", point: { x: 573, y: 900 }, blocked: true },
    { label: "rear-wall", point: { x: 573, y: 930 }, blocked: true },
    { label: "exterior", point: { x: 648, y: 938 }, blocked: false },
  ],
};
for (const [structureId, samples] of Object.entries(collisionSamples)) {
  assert.deepEqual(samples.map(sample => sample.label).sort(), ["door-corridor", "exterior", "rear-wall", "side-wall", "stairs", "visual-base"]);
  for (const sample of samples) {
    assert.equal(
      collision.isCircleBlocked(sample.point.x, sample.point.y, 6),
      sample.blocked,
      `${structureId} ${sample.label} sample ${sample.point.x},${sample.point.y}`,
    );
  }
}

for (const y of [514, 518, 522]) {
  assert.equal(collision.isCircleBlocked(648, y, 6), false, `spring stair center 648,${y} must be open for player radius`);
}
assert.equal(collision.isCircleBlocked(648, 484, 6), true, "spring water must block the player");
for (const point of [{ x: 586, y: 450 }, { x: 710, y: 450 }, { x: 586, y: 526 }, { x: 710, y: 526 }]) {
  assert.equal(collision.isCircleBlocked(point.x, point.y, 4), false, `spring outer corner ${point.x},${point.y} must not be an air wall`);
}

const expedition = HUB_MATERIALIZED_STRUCTURE_BY_ID.get("expedition_gate")!;
for (const colliderId of ["pier_west", "pier_east", "wall_west", "wall_east"]) {
  const local = expedition.definition.colliders.find(candidate => candidate.id === colliderId);
  assert.ok(local?.shape === "rect" && "fromVisualPartId" in local, `${colliderId} must derive from a visual part`);
}
assert.equal(collision.isCircleBlocked(573, 842, 6), false, "expedition pier top must not create an air wall");
assert.equal(collision.isCircleBlocked(573, 930, 6), true, "expedition pier/wall foot bottom must remain solid");
assert.equal(collision.isCircleBlocked(648, 916, 6), false, "expedition upper steps must be walkable");
assert.equal(collision.isCircleBlocked(648, 938, 6), false, "expedition lower steps must be walkable");

const interactionProbes: Record<string, { entry: WorldPoint; behind?: WorldPoint }> = {
  rebirth_spring: { entry: { x: 648, y: 548 }, behind: { x: 648, y: 520 } },
  archive_monument: { entry: { x: 264, y: 252 }, behind: { x: 264, y: 208 } },
  codex_lectern: { entry: { x: 220, y: 252 }, behind: { x: 220, y: 208 } },
  honor_wall: { entry: { x: 316, y: 252 }, behind: { x: 316, y: 208 } },
  astral_console: { entry: { x: 1056, y: 252 }, behind: { x: 1056, y: 208 } },
  blacksmith_forge: { entry: { x: 220, y: 516 }, behind: { x: 220, y: 480 } },
  enchanting_table: { entry: { x: 306, y: 516 }, behind: { x: 306, y: 480 } },
  armory_rack: { entry: { x: 1002, y: 502 }, behind: { x: 1002, y: 480 } },
  expedition_gate: { entry: { x: 648, y: 824 }, behind: { x: 648, y: 866 } },
};
for (const [id, probe] of Object.entries(interactionProbes)) {
  const object = HUB_MAP.objects.find(candidate => candidate.id === id);
  assert.ok(object?.interaction, `missing interaction ${id}`);
  const fromEntry = worldInteraction.findNearest(probe.entry.x, probe.entry.y, [object], 80);
  assert.equal(fromEntry?.object.id, id, `${id} must trigger from its correct entrance; its own collider must not block LOS`);
  if (object.interaction?.side && probe.behind) {
    assert.equal(worldInteraction.findNearest(probe.behind.x, probe.behind.y, [object], 80), null, `${id} directional restriction`);
  }
}

for (const object of HUB_MAP.objects.filter(candidate => candidate.interactionShell && candidate.physicalFootprint?.length)) {
  const footprint = object.physicalFootprint!;
  const first = footprint[0];
  const center = first.shape === "rect"
    ? { x: first.x + first.width / 2, y: first.y + first.height / 2 }
    : first.shape === "circle"
      ? { x: first.x, y: first.y }
      : {
          x: first.points.reduce((sum, point) => sum + point.x, 0) / first.points.length,
          y: first.points.reduce((sum, point) => sum + point.y, 0) / first.points.length,
        };
  for (const [dx, dy] of movementDirections) {
    const edge = closestPointOnFootprints(footprint, center.x + dx * 200, center.y + dy * 200)!;
    const probe = { x: edge.x + dx * 18, y: edge.y + dy * 18 };
    const isolatedObject = { ...object, interaction: { ...object.interaction!, requireLineOfSight: false } };
    assert.equal(
      new WorldInteraction().findNearest(probe.x, probe.y, [isolatedObject], 80)?.object.id,
      object.id,
      `${object.id} proximity shell direction ${dx},${dy}`,
    );
  }
}

function expandedZone(a: WorldPoint, b: WorldPoint, padding = 4): WorldInteractionZone {
  return {
    shape: "rect",
    x: Math.min(a.x, b.x) - padding,
    y: Math.min(a.y, b.y) - padding,
    width: Math.abs(a.x - b.x) + padding * 2,
    height: Math.abs(a.y - b.y) + padding * 2,
  };
}
const actualLosWallProbes: Record<string, WorldPoint> = {
  archive_monument: { x: 264, y: 146 },
  astral_console: { x: 1056, y: 146 },
  blacksmith_forge: { x: 240, y: 404 },
  armory_rack: { x: 1064, y: 404 },
  expedition_gate: { x: 760, y: 870 },
};
for (const [id, wallPoint] of Object.entries(actualLosWallProbes)) {
  const original = HUB_MAP.objects.find(candidate => candidate.id === id)!;
  const target = original.interaction!.lineOfSightTarget ?? original.interaction!.promptPoint!;
  const losOnlyObject: WorldObjectDefinition = {
    ...original,
    interaction: {
      ...original.interaction!,
      zone: expandedZone(wallPoint, target),
      side: undefined,
      facing: undefined,
    },
  };
  assert.equal(
    worldInteraction.findNearest(wallPoint.x, wallPoint.y, [losOnlyObject], 240),
    null,
    `${id} must be blocked by actual Hub structure geometry when approached through a wall`,
  );
}

function latticePoint(point: WorldPoint, step: number): WorldPoint {
  return { x: Math.round(point.x / step) * step, y: Math.round(point.y / step) * step };
}
function reachableWorld(targetPoint: WorldPoint): boolean {
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
  assert.equal(collision.isCircleBlocked(point.x, point.y, 6), false, `${id} entrance must be walkable`);
  assert.equal(reachableWorld(point), true, `${id} entrance must be reachable from rebirth spawn`);
}

const detailIds = new Set(getWorldLayer(HUB_MAP, "groundDetail")!.tiles.filter(Boolean));
for (const id of Object.values(HubGroundDetailTile)) assert.ok(detailIds.has(id), `ground detail ${id} must be generated`);

const wallTiles = Array(10 * 8).fill(0);
for (let y = 0; y < 8; y++) wallTiles[y * 10 + 4] = 1;
const speedMap: WorldMapDefinition = {
  id: "speed-test",
  version: 1,
  widthTiles: 10,
  heightTiles: 8,
  tileSize: 16,
  layers: [{ id: "ground", tiles: Array(80).fill(1) }, { id: "collision", tiles: wallTiles }],
  objects: [],
  spawnPoints: {},
};
const highSpeedMove = new WorldCollision(speedMap).moveCircle(32, 56, 6, 120, 0);
assert.ok(highSpeedMove.x <= 58.01, `substeps must stop before a one-tile wall, got ${highSpeedMove.x}`);

const thinColliderMap: WorldMapDefinition = {
  id: "thin-collider",
  version: 1,
  widthTiles: 20,
  heightTiles: 10,
  tileSize: 16,
  layers: [{ id: "ground", tiles: Array(200).fill(1) }, { id: "collision", tiles: Array(200).fill(0) }],
  colliders: [{ id: "thin", shape: "rect", x: 80, y: 20, width: 5, height: 100 }],
  objects: [],
  spawnPoints: {},
};
const thinMove = new WorldCollision(thinColliderMap).moveCircle(50, 70, 6, 20, 0);
assert.ok(thinMove.x <= 74.01, `dt=0.1 movement cannot cross a 5px collider: ${thinMove.x}`);

const occlusion = new OcclusionController();
const occluder: WorldObjectDefinition = {
  id: "occlusion-test",
  type: "decoration",
  x: 100,
  y: 80,
  width: 80,
  height: 80,
  sortY: 150,
  occlusionGroupId: "test-group",
  occlusionProjection: { x: 100, y: 80, width: 80, height: 80 },
  fadeWhenOccluding: true,
  minimumAlpha: 0.42,
  properties: { rearAccessRule: "roof-occluder" },
};
occlusion.update(1 / 60, { x: 120, y: 100, width: 32, height: 35 }, 180, [occluder]);
assert.equal(occlusion.getAlpha("test-group"), 1, "player in front keeps building opaque");
occlusion.update(1 / 60, { x: 120, y: 100, width: 32, height: 35 }, 130, [occluder]);
assert.ok(occlusion.getAlpha("test-group") < 1 && occlusion.getAlpha("test-group") > 0.42, "fade begins smoothly");
for (let frame = 0; frame < 90; frame++) occlusion.update(1 / 60, { x: 120, y: 100, width: 32, height: 35 }, 130, [occluder]);
assert.ok(occlusion.getAlpha("test-group") >= 0.35 && occlusion.getAlpha("test-group") <= 0.5, "occluder reaches minimum alpha band");
for (let frame = 0; frame < 120; frame++) occlusion.update(1 / 60, { x: 220, y: 100, width: 32, height: 35 }, 130, [occluder]);
assert.equal(occlusion.getAlpha("test-group"), 1, "occluder restores after player leaves");

const camera = new Camera2D(320, 240, { width: 96, height: 64 }, 7.5);
camera.snapTo(spawn.x, spawn.y, 1280, 960);
camera.x = 10.4;
camera.y = 20.6;
assert.equal(camera.renderX, 10);
assert.equal(camera.renderY, 21);
assert.deepEqual(camera.worldToScreen(100, 100), { x: 90, y: 79 });
assert.deepEqual(camera.screenToWorld(90, 79), { x: 100, y: 100 });
assert.deepEqual(camera.getViewRect(), { x: 10, y: 21, width: 320, height: 240 });
assert.deepEqual(camera.getDeadZoneWorldRect(), { x: 122, y: 109, width: 96, height: 64 });
camera.snapTo(1270, 950, 1280, 960);
const visible = new WorldMapRenderer().getVisibleTileBounds(HUB_MAP, camera);
const visibleTileCount = (visible.endX - visible.startX + 1) * (visible.endY - visible.startY + 1);
assert.ok(visibleTileCount < HUB_MAP_WIDTH * HUB_MAP_HEIGHT / 3, "renderer must cull off-screen Hub tiles");

const defaults = createDefaultHubProgress(HUB_MAP.version);
assert.equal(defaults.anchorId, "rebirth_spring");
assert.ok(defaults.unlockedFacilities.includes("expedition_gate"));
const migrated = normalizeHubProgress({ selectedCharacterId: "kanami", x: 999999, y: -20 });
assert.deepEqual(resolveHubSpawn(migrated, HUB_MAP, collision), spawn, "invalid migrated position must fall back to rebirth");
assert.ok(HUB_BUILDING_METRICS.archive_keep.width < 320);
assert.equal(HUB_BUILDING_METRICS.archive_keep.doorWidth, HUB_ART_METRICS.majorDoorWidth);
assert.equal(HUB_BUILDING_METRICS.workshop_keep.doorHeight, HUB_ART_METRICS.normalDoorHeight);

const source = (path: string) => fs.readFileSync(path, "utf8");
const hubMapSource = source("src/game/hub/HubMap.ts");
const hubState = source("src/game/states/HubState.ts");
const splashState = source("src/game/states/SplashState.ts");
const mapData = source("src/game/MapData.ts");
const metaProgress = source("src/game/MetaProgress.ts");
const hubRenderer = source("src/game/hub/HubWorldRenderer.ts");
const groundRenderer = source("src/game/hub/HubGroundRenderer.ts");
const debugOverlay = source("src/game/hub/HubDebugOverlay.ts");
const collisionSource = source("src/game/world/WorldCollision.ts");
const qaSource = source("src/game/qa/BrowserQa.ts");

assert.match(hubMapSource, /HUB_STRUCTURES\.flatMap\(structure => structure\.colliders\)/);
assert.doesNotMatch(hubMapSource, /spring_basin|expedition_pier_west|archive_foundation_rear/);
assert.match(hubState, /HubDebugOverlay\.draw/);
assert.match(hubState, /wasPressed\("f7"\)/);
assert.doesNotMatch(hubState, /drawObjects\(ctx, this\.map, this\.camera, "front"/);
assert.match(hubState, /qaSetPresentation/);
assert.match(splashState, /switchState\("hub", \{ spawnAnchor: "rebirth_spring"/);
assert.match(hubRenderer, /HubArchitectureRenderer/);
for (const detailName of [
  "workshopSoot", "trainingScratch", "trainingFootprint", "armoryMetalWear", "gardenFlowers", "gardenSoil", "expeditionRuneCrack",
]) assert.match(hubRenderer, new RegExp(`HubGroundDetailTile\\.${detailName}`));
assert.match(groundRenderer, /two-tile transition/);
assert.match(debugOverlay, /#FF3B3B/);
assert.match(debugOverlay, /#30F2F2/);
assert.match(debugOverlay, /#FFE45E/);
assert.match(debugOverlay, /#D65CFF/);
assert.match(collisionSource, /moveSweptCircle/);
assert.match(hubState, /OcclusionController/);
assert.doesNotMatch(hubState, /zoneBannerTimer|private message =|drawPixelPanel\(ctx, 43, 207/);
assert.match(qaSource, /setHubPresentation/);
assert.match(mapData, /MAP_WIDTH = 20/);
assert.match(mapData, /MAP_HEIGHT = 15/);
assert.match(metaProgress, /META_SAVE_VERSION = 8/);

console.log(JSON.stringify({
  map: `${HUB_MAP_WIDTH}x${HUB_MAP_HEIGHT}`,
  worldPixels: getWorldSize(HUB_MAP),
  structures: HUB_STRUCTURE_DEFINITIONS.length,
  structureParts: structureObjects.length,
  mapColliders: HUB_MAP.colliders?.length ?? 0,
  physicalVisibleProps: physicalVisibleProps.length,
  collisionSamples: Object.values(collisionSamples).reduce((sum, samples) => sum + samples.length, 0),
  reachableEntrances: Object.keys(HUB_ENTRY_POINTS).length,
  visibleInteractionProps: visiblePropObjects.size,
  interactionEntryChecks: Object.keys(interactionProbes).length,
  actualHubLosWallChecks: Object.keys(actualLosWallProbes).length,
  springStairs: "648,514|518|522-radius6-open",
  expeditionCollision: "visual-part-derived-top-clear-bottom-solid-central-open",
  rearAccessRules: Object.fromEntries(HUB_STRUCTURE_DEFINITIONS.map(definition => [definition.id, definition.rearAccessRule])),
  groundDetails: [...detailIds].sort((a, b) => a - b),
  highSpeedCollision: "one-tile-wall-blocked",
  thinCollider: "5px-dt0.1-blocked",
  directionalTrajectoryChecks,
  occlusion: "smooth-1-to-0.42-to-1",
  fixedHubSpeed: HUB_MOVE_SPEED,
  camera: "dead-zone-smoothed-pixel-snapped",
  visibleTileCount,
  dungeonRoomContract: "20x15-unchanged",
  metaMigration: "v8-hub-progress",
}));
