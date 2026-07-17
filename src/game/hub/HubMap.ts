import type {
  WorldColliderDefinition,
  WorldInteractionDefinition,
  WorldMapDefinition,
  WorldObjectDefinition,
  WorldPoint,
  WorldRect,
} from "../world/WorldMap";

export const HUB_MAP_WIDTH = 80;
export const HUB_MAP_HEIGHT = 60;
export const HUB_TILE_SIZE = 16;
export const HUB_MAP_VERSION = 2;

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

function px(tile: number): number {
  return tile * HUB_TILE_SIZE;
}

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

// Deterministic wear/detail variants. Material edges are rendered procedurally.
for (let y = 2; y < HUB_MAP_HEIGHT - 2; y++) {
  for (let x = 2; x < HUB_MAP_WIDTH - 2; x++) {
    const hash = (x * 37 + y * 61 + x * y * 3) % 101;
    const tile = ground[y * HUB_MAP_WIDTH + x];
    if (tile === HubGroundTile.sanctuary && hash < 9) setTile(groundDetail, hash % 2 === 0 ? 1 : 4, x, y);
    else if ((tile === HubGroundTile.road || tile === HubGroundTile.plaza) && hash < 10) setTile(groundDetail, 2 + hash % 2, x, y);
    else if (tile === HubGroundTile.archive && hash < 7) setTile(groundDetail, 5, x, y);
    else if (tile === HubGroundTile.observatory && hash < 7) setTile(groundDetail, 6, x, y);
    else if (tile === HubGroundTile.workshop && hash < 8) setTile(groundDetail, 7, x, y);
    else if (tile === HubGroundTile.training && hash < 12) setTile(groundDetail, 8 + hash % 2, x, y);
  }
}

// Tile collision is reserved for map boundaries and true tile architecture.
fillRect(collision, 1, 0, 0, HUB_MAP_WIDTH, 2);
fillRect(collision, 1, 0, HUB_MAP_HEIGHT - 2, HUB_MAP_WIDTH, 2);
fillRect(collision, 1, 0, 0, 2, HUB_MAP_HEIGHT);
fillRect(collision, 1, HUB_MAP_WIDTH - 2, 0, 2, HUB_MAP_HEIGHT);

// Tile architecture is now only the sanctuary wall. Buildings are object-rendered once.
frameRect(backObjects, 1, 1, 1, 78, 58, 1);
frameRect(roof, 1, 1, 1, 78, 58, 1);

const treeTiles = [[3, 4], [3, 10], [3, 48], [21, 44], [23, 53], [75, 5], [75, 14], [75, 46], [53, 55]] as const;
for (const [x, y] of treeTiles) fillRect(upperObjects, 1, x, y, 2, 2);

const colliders: WorldColliderDefinition[] = [];
const rectCollider = (id: string, x: number, y: number, width: number, height: number, sourceObjectId?: string): void => {
  colliders.push({ id, shape: "rect", x, y, width, height, sourceObjectId });
};
const circleCollider = (id: string, x: number, y: number, radius: number, sourceObjectId?: string): void => {
  colliders.push({ id, shape: "circle", x, y, radius, sourceObjectId });
};

// Rebirth spring: visible octagonal rim with a clear southern stair opening.
circleCollider("spring_basin", 648, 486, 38, "rebirth_spring");
rectCollider("spring_rim_north", 600, 452, 96, 10, "rebirth_spring");
rectCollider("spring_rim_west", 588, 464, 12, 48, "rebirth_spring");
rectCollider("spring_rim_east", 696, 464, 12, 48, "rebirth_spring");
rectCollider("spring_rim_south_west", 600, 510, 28, 10, "rebirth_spring");
rectCollider("spring_rim_south_east", 668, 510, 28, 10, "rebirth_spring");
for (const [id, x, y] of [
  ["spring_corner_nw", 600, 464], ["spring_corner_ne", 696, 464],
  ["spring_corner_sw", 600, 510], ["spring_corner_se", 696, 510],
] as const) circleCollider(id, x, y, 10, "rebirth_spring");
circleCollider("spring_lamp_west", 580, 490, 6, "rebirth_spring");
circleCollider("spring_lamp_east", 716, 490, 6, "rebirth_spring");

// Archive tower footprint: rear foundation and two side walls; the central door and stairs remain clear.
rectCollider("archive_foundation_rear", 166, 150, 196, 18, "archive_keep");
rectCollider("archive_foot_west", 154, 168, 82, 36, "archive_keep");
rectCollider("archive_foot_east", 292, 168, 82, 36, "archive_keep");
circleCollider("archive_lamp_west", 238, 196, 6, "archive_keep");
circleCollider("archive_lamp_east", 290, 196, 6, "archive_keep");

// Observatory footprint with a clear central threshold.
rectCollider("observatory_foundation_rear", 958, 150, 196, 18, "observatory_keep");
rectCollider("observatory_foot_west", 954, 168, 72, 36, "observatory_keep");
rectCollider("observatory_foot_east", 1086, 168, 72, 36, "observatory_keep");

// Workshop footprint exposes two front approaches while retaining furnace and annex mass.
rectCollider("workshop_foundation_rear", 126, 400, 228, 18, "workshop_keep");
rectCollider("workshop_furnace", 120, 418, 58, 56, "workshop_keep");
rectCollider("workshop_foot_center", 224, 420, 54, 54, "workshop_keep");
rectCollider("workshop_annex", 326, 418, 34, 56, "workshop_keep");
rectCollider("workshop_bench", 232, 454, 38, 16, "workshop_keep");

// Armory footprint and weapon galleries; the central doorway remains open.
rectCollider("armory_foundation_rear", 958, 400, 212, 18, "armory_keep");
rectCollider("armory_foot_west", 954, 418, 82, 56, "armory_keep");
rectCollider("armory_foot_east", 1092, 418, 82, 56, "armory_keep");
rectCollider("armory_rack_west", 1020, 434, 16, 32, "armory_keep");
rectCollider("armory_rack_east", 1092, 434, 16, 32, "armory_keep");

// Expedition gate collision is limited to the two piers and side wall feet.
rectCollider("expedition_pier_west", 552, 842, 42, 74, "expedition_gate");
rectCollider("expedition_pier_east", 702, 842, 42, 74, "expedition_gate");
rectCollider("expedition_wall_west", 544, 896, 56, 24, "expedition_gate");
rectCollider("expedition_wall_east", 696, 896, 56, 24, "expedition_gate");

// Existing wishing pool, trees and small props use compact shape-matched colliders.
circleCollider("garden_pool", 192, 800, 42, "garden_wish");
for (const [index, [tileX, tileY]] of treeTiles.entries()) {
  circleCollider(`tree_${index}`, px(tileX + 1), px(tileY + 1.55), 8);
}
circleCollider("reforge_stone", px(14), px(36), 12, "reforge_stone");
circleCollider("north_waystone", px(40.5), px(18), 8, "north_waystone");
circleCollider("south_waystone", px(40.5), px(47), 8, "south_waystone");

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
  layer: "back" | "sorted" | "front" | "upper" = "back",
  properties: Record<string, unknown> = {},
  sortY = px(tileY + heightTiles),
): WorldObjectDefinition {
  return {
    id,
    type: "decoration",
    x: px(tileX),
    y: px(tileY),
    width: px(widthTiles),
    height: px(heightTiles),
    sortY,
    visualBounds: visualBounds(tileX, tileY, widthTiles, heightTiles),
    properties: { kind, layer, ...properties },
  };
}

function structureParts(
  id: string,
  tileX: number,
  tileY: number,
  widthTiles: number,
  heightTiles: number,
  kind: string,
  sortY: number,
): WorldObjectDefinition[] {
  return [
    decoration(`${id}_back`, tileX, tileY, widthTiles, heightTiles, kind, "back", { part: "back", visualGroup: id }, sortY),
    decoration(`${id}_base`, tileX, tileY, widthTiles, heightTiles, kind, "sorted", { part: "base", visualGroup: id }, sortY),
    decoration(`${id}_front`, tileX, tileY, widthTiles, heightTiles, kind, "front", { part: "front", visualGroup: id }, sortY),
  ];
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
    interaction,
    properties: { kind: "hotspot", layer: "sorted", visible: false, ...properties },
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
  ...structureParts("archive_keep", 9, 4, 15, 9, "archive_keep", 204),
  ...structureParts("observatory_keep", 59, 4, 14, 9, "observatory_keep", 204),
  ...structureParts("workshop_keep", 7, 20, 16, 10, "workshop_keep", 474),
  ...structureParts("armory_keep", 59, 20, 15, 10, "armory_keep", 474),
  ...structureParts("rebirth_spring", 36, 27, 9, 7, "rebirth_spring", 520),
  ...structureParts("expedition_gate", 34, 51, 13, 8, "expedition_structure", 916),

  decoration("plaza_banners", 28, 18, 25, 4, "plaza_banners", "upper"),
  decoration("archive_district_gate", 25, 12, 5, 5, "district_gate", "sorted", { accent: "#9B74D5", emblem: "archive" }),
  decoration("observatory_district_gate", 52, 12, 5, 5, "district_gate", "sorted", { accent: "#72E0E8", emblem: "observatory" }),
  decoration("workshop_district_gate", 23, 28, 5, 5, "district_gate", "sorted", { accent: "#E58945", emblem: "workshop" }),
  decoration("armory_district_gate", 52, 28, 5, 5, "district_gate", "sorted", { accent: "#D8B45C", emblem: "armory" }),
  decoration("garden_district_gate", 23, 48, 5, 4, "district_gate", "sorted", { accent: "#7ECF8A", emblem: "garden" }),
  decoration("training_district_gate", 52, 48, 5, 4, "district_gate", "sorted", { accent: "#D7A35D", emblem: "training" }),
  decoration("north_waystone", 39, 15, 3, 4, "waystone", "sorted", { accent: "#9B74D5" }),
  decoration("south_waystone", 39, 44, 3, 4, "waystone", "sorted", { accent: "#9B74D5" }),
  decoration("reforge_stone", 12, 34, 4, 4, "reforge_stone", "sorted"),
  decoration("trial_altar_visual", 65, 46, 6, 6, "trial_altar", "sorted"),
  decoration("training_marker", 60, 47, 5, 5, "training_marker", "sorted"),
  decoration("garden_wish", 9, 47, 6, 5, "garden_wish", "sorted"),

  hotspot("rebirth_spring", "interactable", "open_rebirth_spring", "hub.rebirthSpring", {
    zone: { shape: "rect", x: 620, y: 516, width: 56, height: 44 },
    promptPoint: { x: 648, y: 518 },
    lineOfSightTarget: { x: 648, y: 532 },
    requireLineOfSight: true,
    side: "south",
  }),
  hotspot("expedition_gate", "portal", "open_expedition", "hub.expeditionGate", {
    zone: { shape: "rect", x: 604, y: 806, width: 88, height: 56 },
    promptPoint: { x: 648, y: 842 },
    lineOfSightTarget: { x: 648, y: 844 },
    requireLineOfSight: true,
    side: "north",
  }),
  hotspot("blacksmith_forge", "interactable", "open_meta_upgrades", "hub.blacksmith", {
    zone: { shape: "rect", x: 176, y: 462, width: 50, height: 42 },
    promptPoint: { x: 201, y: 466 },
    lineOfSightTarget: { x: 201, y: 468 },
    requireLineOfSight: true,
    side: "south",
  }, { tab: "body" }),
  hotspot("enchanting_table", "interactable", "open_meta_upgrades", "hub.enchanter", {
    zone: { shape: "rect", x: 278, y: 462, width: 50, height: 42 },
    promptPoint: { x: 303, y: 466 },
    lineOfSightTarget: { x: 303, y: 468 },
    requireLineOfSight: true,
    side: "south",
  }, { tab: "arcane" }),
  hotspot("reforge_hotspot", "interactable", "open_meta_refund", "hub.reforge", {
    zone: { shape: "circle", x: px(14), y: px(37), radius: 38 },
    promptPoint: { x: px(14), y: px(35.5) },
    requireLineOfSight: true,
  }),
  hotspot("archive_monument", "interactable", "open_records", "hub.records", {
    zone: { shape: "rect", x: 236, y: 196, width: 56, height: 44 },
    promptPoint: { x: 264, y: 202 },
    lineOfSightTarget: { x: 264, y: 204 },
    requireLineOfSight: true,
    side: "south",
  }, { tab: "overview" }),
  hotspot("codex_lectern", "interactable", "open_records", "hub.codex", {
    zone: { shape: "rect", x: 204, y: 202, width: 34, height: 38 },
    promptPoint: { x: 226, y: 204 },
    lineOfSightTarget: { x: 226, y: 205 },
    requireLineOfSight: true,
    side: "south",
  }, { tab: "enemies" }),
  hotspot("honor_wall", "interactable", "open_records", "hub.achievements", {
    zone: { shape: "rect", x: 290, y: 202, width: 34, height: 38 },
    promptPoint: { x: 302, y: 204 },
    lineOfSightTarget: { x: 302, y: 205 },
    requireLineOfSight: true,
    side: "south",
  }, { tab: "achievements" }),
  hotspot("astral_console", "interactable", "open_settings", "hub.settings", {
    zone: { shape: "rect", x: 1030, y: 196, width: 52, height: 44 },
    promptPoint: { x: 1056, y: 202 },
    lineOfSightTarget: { x: 1056, y: 204 },
    requireLineOfSight: true,
    side: "south",
  }),
  hotspot("armory_rack", "interactable", "open_armory", "hub.armory", {
    zone: { shape: "rect", x: 1038, y: 462, width: 52, height: 42 },
    promptPoint: { x: 1064, y: 466 },
    lineOfSightTarget: { x: 1064, y: 468 },
    requireLineOfSight: true,
    side: "south",
  }),
  hotspot("trial_altar", "interactable", "open_challenge", "hub.trialAltar", {
    zone: { shape: "circle", x: tileCenter(68, 52).x, y: tileCenter(68, 52).y, radius: 42 },
    requireLineOfSight: true,
  }),
  hotspot("training_marker_hotspot", "interactable", "open_training", "hub.training", {
    zone: { shape: "circle", x: tileCenter(62, 52).x, y: tileCenter(62, 52).y, radius: 40 },
    requireLineOfSight: true,
  }),
  hotspot("garden_wish_hotspot", "interactable", "open_wish_fountain", "hub.wishGarden", {
    zone: { shape: "circle", x: 192, y: 848, radius: 44 },
    promptPoint: { x: 192, y: 816 },
    lineOfSightTarget: { x: 192, y: 816 },
    requireLineOfSight: true,
    side: "south",
  }),

  // Functional regions take priority over roads; general circulation regions prevent stale labels.
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

export const HUB_ENTRY_POINTS: Record<string, WorldPoint> = {
  rebirth_spring: { x: 648, y: 548 },
  archive_keep: { x: 264, y: 218 },
  observatory_keep: { x: 1056, y: 218 },
  workshop_forge: { x: 201, y: 486 },
  workshop_enchanting: { x: 303, y: 486 },
  armory_keep: { x: 1064, y: 486 },
  expedition_gate: { x: 648, y: 824 },
};

export const HUB_FOOTPRINT_POINTS: Record<string, WorldPoint> = {
  rebirth_spring: { x: 600, y: 480 },
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
    rebirth_spring: { x: 648, y: 552 },
    expedition_gate: { x: 648, y: 808 },
    workshop: { x: 432, y: 488 },
    archive: { x: 448, y: 216 },
    observatory: { x: 880, y: 216 },
    armory: { x: 880, y: 488 },
    medical_return: tileCenter(34, 47),
    central_plaza: tileCenter(40, 39),
  },
};
