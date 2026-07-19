import type {
  WorldColliderDefinition,
  WorldInteractionDefinition,
  WorldMapDefinition,
  WorldObjectDefinition,
  WorldPoint,
  WorldRect,
} from "../world/WorldMap";
import { colliderToSpatialShape } from "../world/SpatialSemantics";
import type { HubCollisionPolicy } from "./HubStructure";
import { HUB_MATERIALIZED_STRUCTURE_BY_ID, HUB_STRUCTURES } from "./structures/HubStructures";

export const HUB_MAP_WIDTH = 80;
export const HUB_MAP_HEIGHT = 60;
export const HUB_TILE_SIZE = 16;
export const HUB_MAP_VERSION = 3;

export const HubGroundTile = {
  sanctuary: 1,
  road: 2,
  plaza: 3,
  workshop: 4,
  archive: 5,
  observatory: 6,
  armory: 7,
  garden: 8,
  training: 9,
  expedition: 10,
} as const;

export const HubGroundDetailTile = {
  grassTuft: 1,
  stoneWear: 2,
  plazaRune: 3,
  flower: 4,
  archiveEmber: 5,
  observatoryRune: 6,
  workshopSoot: 7,
  trainingScratch: 8,
  trainingFootprint: 9,
  armoryMetalWear: 10,
  gardenFlowers: 11,
  gardenSoil: 12,
  expeditionRuneCrack: 13,
} as const;

function emptyLayer(): number[] {
  return Array.from({ length: HUB_MAP_WIDTH * HUB_MAP_HEIGHT }, () => 0);
}
function setTile(layer: number[], tileId: number, x: number, y: number): void {
  if (x < 0 || y < 0 || x >= HUB_MAP_WIDTH || y >= HUB_MAP_HEIGHT) return;
  layer[y * HUB_MAP_WIDTH + x] = tileId;
}
function fillRect(layer: number[], tileId: number, x: number, y: number, width: number, height: number): void {
  for (let tileY = y; tileY < y + height; tileY++) {
    for (let tileX = x; tileX < x + width; tileX++) setTile(layer, tileId, tileX, tileY);
  }
}
function frameRect(layer: number[], tileId: number, x: number, y: number, width: number, height: number, thickness = 1): void {
  fillRect(layer, tileId, x, y, width, thickness);
  fillRect(layer, tileId, x, y + height - thickness, width, thickness);
  fillRect(layer, tileId, x, y, thickness, height);
  fillRect(layer, tileId, x + width - thickness, y, thickness, height);
}
function px(tile: number): number { return tile * HUB_TILE_SIZE; }
function tileCenter(tileX: number, tileY: number): WorldPoint {
  return { x: px(tileX) + HUB_TILE_SIZE / 2, y: px(tileY) + HUB_TILE_SIZE / 2 };
}

const ground = emptyLayer();
const groundDetail = emptyLayer();
const collision = emptyLayer();
const backObjects = emptyLayer();
const upperObjects = emptyLayer();
const roof = emptyLayer();

fillRect(ground, HubGroundTile.sanctuary, 0, 0, HUB_MAP_WIDTH, HUB_MAP_HEIGHT);
fillRect(ground, HubGroundTile.road, 37, 2, 7, 56);
fillRect(ground, HubGroundTile.road, 2, 27, 76, 7);
fillRect(ground, HubGroundTile.plaza, 29, 19, 23, 23);
fillRect(ground, HubGroundTile.workshop, 4, 19, 22, 22);
fillRect(ground, HubGroundTile.archive, 5, 3, 23, 16);
fillRect(ground, HubGroundTile.observatory, 56, 3, 20, 16);
fillRect(ground, HubGroundTile.armory, 55, 19, 23, 22);
fillRect(ground, HubGroundTile.garden, 4, 42, 22, 16);
fillRect(ground, HubGroundTile.training, 55, 42, 23, 17);
fillRect(ground, HubGroundTile.expedition, 31, 50, 19, 10);
fillRect(ground, HubGroundTile.plaza, 28, 42, 25, 11);

for (let y = 2; y < HUB_MAP_HEIGHT - 2; y++) {
  for (let x = 2; x < HUB_MAP_WIDTH - 2; x++) {
    const hash = (x * 37 + y * 61 + x * y * 3) % 101;
    const tile = ground[y * HUB_MAP_WIDTH + x];
    if (tile === HubGroundTile.sanctuary && hash < 9) setTile(groundDetail, hash % 2 === 0 ? HubGroundDetailTile.grassTuft : HubGroundDetailTile.flower, x, y);
    else if ((tile === HubGroundTile.road || tile === HubGroundTile.plaza) && hash < 10) setTile(groundDetail, hash % 2 === 0 ? HubGroundDetailTile.stoneWear : HubGroundDetailTile.plazaRune, x, y);
    else if (tile === HubGroundTile.archive && hash < 7) setTile(groundDetail, HubGroundDetailTile.archiveEmber, x, y);
    else if (tile === HubGroundTile.observatory && hash < 7) setTile(groundDetail, HubGroundDetailTile.observatoryRune, x, y);
    else if (tile === HubGroundTile.workshop && hash < 11) setTile(groundDetail, HubGroundDetailTile.workshopSoot, x, y);
    else if (tile === HubGroundTile.training && hash < 16) setTile(groundDetail, hash % 2 === 0 ? HubGroundDetailTile.trainingScratch : HubGroundDetailTile.trainingFootprint, x, y);
    else if (tile === HubGroundTile.armory && hash < 10) setTile(groundDetail, HubGroundDetailTile.armoryMetalWear, x, y);
    else if (tile === HubGroundTile.garden && hash < 14) setTile(groundDetail, hash % 3 === 0 ? HubGroundDetailTile.gardenSoil : HubGroundDetailTile.gardenFlowers, x, y);
    else if (tile === HubGroundTile.expedition && hash < 14) setTile(groundDetail, HubGroundDetailTile.expeditionRuneCrack, x, y);
  }
}

fillRect(collision, 1, 0, 0, HUB_MAP_WIDTH, 2);
fillRect(collision, 1, 0, HUB_MAP_HEIGHT - 1, HUB_MAP_WIDTH, 1);
fillRect(collision, 1, 0, 0, 2, HUB_MAP_HEIGHT);
fillRect(collision, 1, HUB_MAP_WIDTH - 2, 0, 2, HUB_MAP_HEIGHT);
frameRect(backObjects, 1, 1, 1, 78, 58, 1);
frameRect(roof, 1, 1, 1, 78, 58, 1);

const treeTiles = [[3, 4], [3, 10], [3, 48], [21, 44], [23, 53], [75, 5], [75, 14], [75, 46], [53, 55]] as const;
for (const [x, y] of treeTiles) fillRect(upperObjects, 1, x, y, 2, 2);

const colliders: WorldColliderDefinition[] = HUB_STRUCTURES.flatMap(structure => structure.colliders);
const circleCollider = (id: string, x: number, y: number, radius: number, sourceObjectId?: string): void => {
  colliders.push({ id, shape: "circle", x, y, radius, sourceObjectId, properties: sourceObjectId ? { visiblePropId: sourceObjectId } : undefined });
};
const rectCollider = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  sourceObjectId?: string,
): void => {
  colliders.push({
    id,
    shape: "rect",
    x,
    y,
    width,
    height,
    sourceObjectId,
    properties: sourceObjectId ? { visiblePropId: sourceObjectId } : undefined,
  });
};

function addDistrictGateColliders(id: string, x: number, y: number, width: number, height: number): void {
  rectCollider(`${id}_pillar_left`, x, y + height - 26, 24, 26, id);
  rectCollider(`${id}_pillar_right`, x + width - 24, y + height - 26, 24, 26, id);
}

for (const [id, x, y, width, height] of [
  ["archive_district_gate", px(25), px(12), px(5), px(5)],
  ["observatory_district_gate", px(52), px(12), px(5), px(5)],
  ["workshop_district_gate", px(23), px(28), px(5), px(5)],
  ["armory_district_gate", px(52), px(28), px(5), px(5)],
  ["garden_district_gate", px(23), px(48), px(5), px(4)],
  ["training_district_gate", px(52), px(48), px(5), px(4)],
] as const) addDistrictGateColliders(id, x, y, width, height);

for (const [index, pillarX] of [px(28) + 28, px(28) + 112, px(53) - 116, px(53) - 32].entries()) {
  rectCollider(`plaza_colonnade_pillar_${index}`, pillarX - 10, px(18) + 51, 20, 18, "plaza_banners");
}

rectCollider("training_marker_base", px(60) + 31, px(47) + px(5) - 20, 18, 20, "training_marker");

// Garden wish spring: segmented rim and a smaller true water footprint leave
// the southern stair gap and four outer corners open.
rectCollider("garden_wish_water", 157, 788, 70, 18, "garden_wish");
rectCollider("garden_wish_rim_north", 157, 783, 70, 6, "garden_wish");
rectCollider("garden_wish_rim_west", 150, 788, 7, 25, "garden_wish");
rectCollider("garden_wish_rim_east", 227, 788, 7, 25, "garden_wish");
rectCollider("garden_wish_rim_south_left", 157, 812, 27, 6, "garden_wish");
rectCollider("garden_wish_rim_south_right", 200, 812, 27, 6, "garden_wish");
for (const [id, x, y] of [
  ["garden_wish_corner_nw", 157, 788],
  ["garden_wish_corner_ne", 227, 788],
  ["garden_wish_corner_sw", 157, 812],
  ["garden_wish_corner_se", 227, 812],
] as const) circleCollider(id, x, y, 5.6, "garden_wish");
for (const [id, x, y] of [
  ["garden_wish_lantern_nw", 142, 780],
  ["garden_wish_lantern_ne", 242, 780],
  ["garden_wish_lantern_sw", 139, 815],
  ["garden_wish_lantern_se", 245, 815],
] as const) circleCollider(id, x, y, 4.2, "garden_wish");
for (const [index, [tileX, tileY]] of treeTiles.entries()) circleCollider(`tree_${index}`, px(tileX + 1), px(tileY + 1.55), 8);
circleCollider("reforge_stone", px(14), px(36), 14, "reforge_stone");
circleCollider("north_waystone", px(40.5), px(18), 10, "north_waystone");
circleCollider("south_waystone", px(40.5), px(47), 10, "south_waystone");

function visualBounds(tileX: number, tileY: number, widthTiles: number, heightTiles: number): WorldRect {
  return { x: px(tileX), y: px(tileY), width: px(widthTiles), height: px(heightTiles) };
}

function decoration(
  id: string,
  tileX: number,
  tileY: number,
  widthTiles: number,
  heightTiles: number,
  kind: string,
  layer: "back" | "sorted" | "upper" = "back",
  properties: Record<string, unknown> = {},
  collisionPolicy: HubCollisionPolicy = "none",
  sortY = px(tileY + heightTiles),
): WorldObjectDefinition {
  const physicalColliders = colliders.filter(collider => collider.properties?.visiblePropId === id);
  const bounds = visualBounds(tileX, tileY, widthTiles, heightTiles);
  const fadeWhenOccluding = layer === "sorted" && heightTiles >= 4;
  return {
    id,
    type: "decoration",
    x: px(tileX),
    y: px(tileY),
    width: px(widthTiles),
    height: px(heightTiles),
    sortY,
    visualBounds: bounds,
    physicalFootprint: physicalColliders.map(colliderToSpatialShape),
    occlusionProjection: fadeWhenOccluding ? bounds : undefined,
    occlusionGroupId: id,
    fadeWhenOccluding,
    minimumAlpha: 0.42,
    properties: {
      kind,
      layer,
      visiblePropId: id,
      collisionPolicy,
      physicalColliderIds: physicalColliders.map(collider => collider.id),
      ...properties,
    },
  };
}

function hotspot(
  id: string,
  type: "interactable" | "portal",
  action: string,
  promptKey: string,
  interaction: WorldInteractionDefinition,
  properties: Record<string, unknown> = {},
): WorldObjectDefinition {
  const zone = interaction.zone;
  const bounds = zone.shape === "rect"
    ? { x: zone.x, y: zone.y, width: zone.width, height: zone.height }
    : { x: zone.x - zone.radius, y: zone.y - zone.radius, width: zone.radius * 2, height: zone.radius * 2 };
  const visiblePropId = typeof properties.visiblePropId === "string" ? properties.visiblePropId : undefined;
  const physicalColliders = visiblePropId
    ? colliders.filter(collider => collider.properties?.visiblePropId === visiblePropId)
    : [];
  const promptAnchor = interaction.promptPoint ?? (zone.shape === "rect"
    ? { x: zone.x + zone.width / 2, y: zone.y }
    : { x: zone.x, y: zone.y - zone.radius });
  return {
    id,
    type,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    sortY: bounds.y + bounds.height,
    action,
    promptKey,
    physicalFootprint: physicalColliders.map(colliderToSpatialShape),
    interactionShell: interaction.side || physicalColliders.length === 0
      ? undefined
      : { distance: 40 },
    interaction,
    properties: {
      kind: "hotspot",
      layer: "sorted",
      visible: false,
      physicalColliderIds: physicalColliders.map(collider => collider.id),
      promptAnchorX: promptAnchor.x,
      promptAnchorY: promptAnchor.y,
      ...properties,
    },
  };
}

function region(id: string, labelKey: string, x: number, y: number, width: number, height: number): WorldObjectDefinition {
  return {
    id,
    type: "region",
    x: px(x),
    y: px(y),
    width: px(width),
    height: px(height),
    properties: { labelKey },
  };
}

const objects: WorldObjectDefinition[] = [
  ...HUB_STRUCTURES.flatMap(structure => structure.objects),

  decoration("plaza_banners", 28, 18, 25, 4, "plaza_banners", "upper", {}, "custom"),
  decoration("archive_district_gate", 25, 12, 5, 5, "district_gate", "sorted", { accent: "#9B74D5", emblem: "archive" }, "custom"),
  decoration("observatory_district_gate", 52, 12, 5, 5, "district_gate", "sorted", { accent: "#72E0E8", emblem: "observatory" }, "custom"),
  decoration("workshop_district_gate", 23, 28, 5, 5, "district_gate", "sorted", { accent: "#E58945", emblem: "workshop" }, "custom"),
  decoration("armory_district_gate", 52, 28, 5, 5, "district_gate", "sorted", { accent: "#D8B45C", emblem: "armory" }, "custom"),
  decoration("garden_district_gate", 23, 48, 5, 4, "district_gate", "sorted", { accent: "#7ECF8A", emblem: "garden" }, "custom"),
  decoration("training_district_gate", 52, 48, 5, 4, "district_gate", "sorted", { accent: "#D7A35D", emblem: "training" }, "custom"),
  decoration("north_waystone", 39, 15, 3, 4, "waystone", "sorted", { accent: "#9B74D5" }, "footprint"),
  decoration("south_waystone", 39, 44, 3, 4, "waystone", "sorted", { accent: "#9B74D5" }, "footprint"),
  decoration("reforge_stone", 12, 34, 4, 4, "reforge_stone", "sorted", {}, "footprint"),
  decoration("training_marker", 60, 47, 5, 5, "training_marker", "sorted", {}, "custom"),
  decoration("garden_wish", 9, 47, 6, 5, "garden_wish", "sorted", {}, "custom"),

  hotspot("north_waystone_hotspot", "interactable", "inspect_waystone", "hub.waystone", {
    zone: { shape: "circle", x: px(40.5), y: px(18), radius: 34 },
    promptPoint: { x: px(40.5), y: px(14.5) },
    requireLineOfSight: true,
  }, { visiblePropId: "north_waystone" }),
  hotspot("south_waystone_hotspot", "interactable", "inspect_waystone", "hub.waystone", {
    zone: { shape: "circle", x: px(40.5), y: px(47), radius: 34 },
    promptPoint: { x: px(40.5), y: px(43.5) },
    requireLineOfSight: true,
  }, { visiblePropId: "south_waystone" }),
  hotspot("reforge_hotspot", "interactable", "open_meta_refund", "hub.reforge", {
    zone: { shape: "circle", x: px(14), y: px(37), radius: 38 },
    promptPoint: { x: px(14), y: px(33.5) },
    requireLineOfSight: true,
  }, { visiblePropId: "reforge_stone" }),
  hotspot("training_marker_hotspot", "interactable", "open_training", "hub.training", {
    zone: { shape: "circle", x: tileCenter(62, 52).x, y: tileCenter(62, 52).y, radius: 40 },
    promptPoint: { x: px(62.5), y: px(46.5) },
    requireLineOfSight: true,
  }, { visiblePropId: "training_marker" }),
  hotspot("garden_wish_hotspot", "interactable", "open_wish_fountain", "hub.wishGarden", {
    zone: { shape: "circle", x: 192, y: 848, radius: 44 },
    promptPoint: { x: 192, y: 744 },
    lineOfSightTarget: { x: 192, y: 816 },
    requireLineOfSight: true,
  }, { visiblePropId: "garden_wish" }),

  region("zone_rebirth", "hub.zone.rebirth", 34, 25, 13, 12),
  region("zone_workshop", "hub.zone.workshop", 4, 19, 22, 22),
  region("zone_archive", "hub.zone.archive", 5, 3, 23, 16),
  region("zone_observatory", "hub.zone.observatory", 56, 3, 20, 16),
  region("zone_armory", "hub.zone.armory", 55, 19, 23, 22),
  region("zone_garden", "hub.zone.garden", 4, 42, 22, 16),
  region("zone_training", "hub.zone.training", 55, 42, 23, 17),
  region("zone_expedition", "hub.zone.expedition", 31, 50, 19, 10),
  region("zone_central_plaza", "hub.zone.centralPlaza", 29, 19, 23, 23),
  region("zone_north_road", "hub.zone.northRoad", 37, 2, 7, 17),
  region("zone_south_court", "hub.zone.southCourt", 28, 42, 25, 11),
  region("zone_east_road", "hub.zone.eastRoad", 52, 27, 26, 7),
  region("zone_west_road", "hub.zone.westRoad", 2, 27, 27, 7),
  region("zone_sanctuary", "hub.zone.sanctuary", 2, 2, 76, 56),
];

function structureAnchor(structureId: string, anchorId: string): WorldPoint {
  const point = HUB_MATERIALIZED_STRUCTURE_BY_ID.get(structureId)?.anchors[anchorId];
  if (!point) throw new Error(`[HubMap] Missing ${structureId} anchor ${anchorId}`);
  return point;
}

export const HUB_ENTRY_POINTS: Record<string, WorldPoint> = {
  rebirth_spring: structureAnchor("rebirth_spring", "rebirth_entry"),
  archive_keep: structureAnchor("archive_keep", "archive_entry"),
  observatory_keep: structureAnchor("observatory_keep", "observatory_entry"),
  workshop_forge: structureAnchor("workshop_keep", "workshop_forge_entry"),
  workshop_enchanting: structureAnchor("workshop_keep", "workshop_enchanting_entry"),
  armory_keep: structureAnchor("armory_keep", "armory_entry"),
  expedition_gate: structureAnchor("expedition_gate", "expedition_entry"),
};

export const HUB_FOOTPRINT_POINTS: Record<string, WorldPoint> = {
  rebirth_spring: { x: 648, y: 484 },
  archive_keep: { x: 180, y: 184 },
  observatory_keep: { x: 980, y: 184 },
  workshop_keep: { x: 146, y: 446 },
  armory_keep: { x: 980, y: 446 },
  expedition_gate: { x: 570, y: 872 },
};

export const HUB_MAP: WorldMapDefinition = {
  id: "ashen_sanctuary",
  version: HUB_MAP_VERSION,
  widthTiles: HUB_MAP_WIDTH,
  heightTiles: HUB_MAP_HEIGHT,
  tileSize: HUB_TILE_SIZE,
  layers: [
    { id: "ground", tiles: ground },
    { id: "groundDetail", tiles: groundDetail },
    { id: "collision", tiles: collision, visible: false },
    { id: "backObjects", tiles: backObjects },
    { id: "upperObjects", tiles: upperObjects },
    { id: "roof", tiles: roof },
  ],
  colliders,
  objects,
  spawnPoints: {
    rebirth_spring: structureAnchor("rebirth_spring", "rebirth_entry"),
    expedition_gate: structureAnchor("expedition_gate", "expedition_entry"),
    workshop: { x: 432, y: 488 },
    archive: { x: 448, y: 216 },
    observatory: { x: 880, y: 216 },
    armory: { x: 880, y: 488 },
    medical_return: tileCenter(34, 47),
    central_plaza: tileCenter(40, 39),
  },
};
