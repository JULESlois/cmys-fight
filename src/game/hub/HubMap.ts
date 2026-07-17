import type { WorldMapDefinition, WorldObjectDefinition } from "../world/WorldMap";

export const HUB_MAP_WIDTH = 80;
export const HUB_MAP_HEIGHT = 60;
export const HUB_TILE_SIZE = 16;
export const HUB_MAP_VERSION = 1;

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

function tileCenter(tileX: number, tileY: number): { x: number; y: number } {
  return { x: tileX * HUB_TILE_SIZE + HUB_TILE_SIZE / 2, y: tileY * HUB_TILE_SIZE + HUB_TILE_SIZE / 2 };
}

const ground = emptyLayer();
const groundDetail = emptyLayer();
const collision = emptyLayer();
const backObjects = emptyLayer();
const upperObjects = emptyLayer();

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

// Deterministic small ground accents. Roads and the central plaza stay legible.
for (let y = 2; y < HUB_MAP_HEIGHT - 2; y++) {
  for (let x = 2; x < HUB_MAP_WIDTH - 2; x++) {
    const hash = (x * 37 + y * 61 + x * y * 3) % 97;
    const tile = ground[y * HUB_MAP_WIDTH + x];
    if (tile === HubGroundTile.sanctuary && hash < 7) setTile(groundDetail, hash % 2 === 0 ? 1 : 4, x, y);
    else if ((tile === HubGroundTile.road || tile === HubGroundTile.plaza) && hash < 4) setTile(groundDetail, 2, x, y);
    else if (tile === HubGroundTile.archive && hash < 5) setTile(groundDetail, 3, x, y);
    else if (tile === HubGroundTile.observatory && hash < 5) setTile(groundDetail, 6, x, y);
    else if (tile === HubGroundTile.workshop && hash < 5) setTile(groundDetail, 5, x, y);
  }
}

// World boundary and permanent facility footprints.
fillRect(collision, 1, 0, 0, HUB_MAP_WIDTH, 2);
fillRect(collision, 1, 0, HUB_MAP_HEIGHT - 2, HUB_MAP_WIDTH, 2);
fillRect(collision, 1, 0, 0, 2, HUB_MAP_HEIGHT);
fillRect(collision, 1, HUB_MAP_WIDTH - 2, 0, 2, HUB_MAP_HEIGHT);
fillRect(collision, 1, 36, 27, 9, 7); // Rebirth spring basin.
fillRect(collision, 1, 7, 5, 18, 7); // Archive keep.
fillRect(collision, 1, 59, 5, 14, 7); // Observatory.
fillRect(collision, 1, 7, 22, 7, 7); // Forge.
fillRect(collision, 1, 17, 22, 6, 7); // Enchanting annex.
fillRect(collision, 1, 59, 22, 15, 7); // Armory hall.
fillRect(collision, 1, 35, 53, 3, 5); // Expedition gate left pier.
fillRect(collision, 1, 43, 53, 3, 5); // Expedition gate right pier.
fillRect(collision, 1, 9, 47, 6, 5); // Garden wishing pool.

// Boundary wall and building tile silhouettes.
frameRect(backObjects, 1, 1, 1, 78, 58, 1);
fillRect(backObjects, 2, 7, 5, 18, 7);
fillRect(backObjects, 4, 59, 5, 14, 7);
fillRect(backObjects, 3, 7, 22, 7, 7);
fillRect(backObjects, 3, 17, 22, 6, 7);
fillRect(backObjects, 5, 59, 22, 15, 7);

// Tree canopies frame the garden and map perimeter without covering main roads.
for (const [x, y] of [[3, 4], [3, 10], [3, 48], [21, 44], [23, 53], [75, 5], [75, 14], [75, 46], [53, 55]] as const) {
  fillRect(upperObjects, 1, x, y, 2, 2);
  fillRect(collision, 1, x, y + 1, 2, 1);
}

const interactable = (
  id: string,
  type: "interactable" | "portal",
  tileX: number,
  tileY: number,
  widthTiles: number,
  heightTiles: number,
  action: string,
  promptKey: string,
  kind: string,
  properties: Record<string, unknown> = {},
): WorldObjectDefinition => ({
  id,
  type,
  x: tileX * HUB_TILE_SIZE,
  y: tileY * HUB_TILE_SIZE,
  width: widthTiles * HUB_TILE_SIZE,
  height: heightTiles * HUB_TILE_SIZE,
  sortY: (tileY + heightTiles) * HUB_TILE_SIZE,
  action,
  promptKey,
  properties: { kind, layer: "sorted", ...properties },
});

const decoration = (
  id: string,
  tileX: number,
  tileY: number,
  widthTiles: number,
  heightTiles: number,
  kind: string,
  layer: "back" | "sorted" | "upper" = "back",
  properties: Record<string, unknown> = {},
): WorldObjectDefinition => ({
  id,
  type: "decoration",
  x: tileX * HUB_TILE_SIZE,
  y: tileY * HUB_TILE_SIZE,
  width: widthTiles * HUB_TILE_SIZE,
  height: heightTiles * HUB_TILE_SIZE,
  sortY: (tileY + heightTiles) * HUB_TILE_SIZE,
  properties: { kind, layer, ...properties },
});

const region = (id: string, labelKey: string, x: number, y: number, width: number, height: number): WorldObjectDefinition => ({
  id,
  type: "region",
  x: x * HUB_TILE_SIZE,
  y: y * HUB_TILE_SIZE,
  width: width * HUB_TILE_SIZE,
  height: height * HUB_TILE_SIZE,
  properties: { labelKey },
});

const springInteraction = tileCenter(40, 34);
const gateInteraction = tileCenter(40, 51);
const objects: WorldObjectDefinition[] = [
  decoration("archive_keep", 6, 3, 20, 10, "archive_keep"),
  decoration("observatory_keep", 58, 3, 16, 10, "observatory_keep"),
  decoration("workshop_keep", 6, 20, 18, 11, "workshop_keep"),
  decoration("armory_keep", 58, 20, 17, 11, "armory_keep"),
  decoration("expedition_backdrop", 34, 51, 13, 8, "expedition_backdrop", "back"),
  decoration("plaza_banners", 28, 18, 25, 4, "plaza_banners", "upper"),

  // Mid-scale architectural markers connect each district to the main roads.
  decoration("archive_district_gate", 25, 12, 5, 5, "district_gate", "sorted", {
    accent: "#9B74D5",
    emblem: "archive",
  }),
  decoration("observatory_district_gate", 52, 12, 5, 5, "district_gate", "sorted", {
    accent: "#72E0E8",
    emblem: "observatory",
  }),
  decoration("workshop_district_gate", 23, 28, 5, 5, "district_gate", "sorted", {
    accent: "#E58945",
    emblem: "workshop",
  }),
  decoration("armory_district_gate", 52, 28, 5, 5, "district_gate", "sorted", {
    accent: "#D8B45C",
    emblem: "armory",
  }),
  decoration("garden_district_gate", 23, 48, 5, 4, "district_gate", "sorted", {
    accent: "#7ECF8A",
    emblem: "garden",
  }),
  decoration("training_district_gate", 52, 48, 5, 4, "district_gate", "sorted", {
    accent: "#D7A35D",
    emblem: "training",
  }),
  decoration("north_waystone", 39, 15, 3, 4, "waystone", "sorted", { accent: "#9B74D5" }),
  decoration("south_waystone", 39, 44, 3, 4, "waystone", "sorted", { accent: "#9B74D5" }),

  interactable("rebirth_spring", "interactable", 36, 27, 9, 7, "open_rebirth_spring", "hub.rebirthSpring", "rebirth_spring", {
    interactionX: springInteraction.x,
    interactionY: springInteraction.y,
    interactionRadius: 42,
  }),
  interactable("expedition_gate", "portal", 35, 52, 11, 7, "open_expedition", "hub.expeditionGate", "expedition_gate", {
    interactionX: gateInteraction.x,
    interactionY: gateInteraction.y,
    interactionRadius: 48,
  }),
  interactable("blacksmith_forge", "interactable", 8, 24, 5, 6, "open_meta_upgrades", "hub.blacksmith", "blacksmith_forge", {
    interactionX: tileCenter(10, 30).x,
    interactionY: tileCenter(10, 30).y,
    interactionRadius: 44,
    tab: "body",
  }),
  interactable("enchanting_table", "interactable", 17, 25, 5, 5, "open_meta_upgrades", "hub.enchanter", "enchanting_table", {
    interactionX: tileCenter(19, 30).x,
    interactionY: tileCenter(19, 30).y,
    interactionRadius: 44,
    tab: "arcane",
  }),
  interactable("reforge_stone", "interactable", 12, 34, 4, 4, "open_meta_refund", "hub.reforge", "reforge_stone", {
    interactionRadius: 42,
  }),
  interactable("archive_monument", "interactable", 9, 10, 4, 4, "open_records", "hub.records", "archive_monument", {
    interactionX: tileCenter(11, 13).x,
    interactionY: tileCenter(11, 13).y,
    interactionRadius: 44,
    tab: "overview",
  }),
  interactable("codex_lectern", "interactable", 16, 10, 4, 4, "open_records", "hub.codex", "codex_lectern", {
    interactionX: tileCenter(18, 13).x,
    interactionY: tileCenter(18, 13).y,
    interactionRadius: 44,
    tab: "enemies",
  }),
  interactable("honor_wall", "interactable", 21, 7, 4, 4, "open_records", "hub.achievements", "honor_wall", {
    interactionX: tileCenter(23, 13).x,
    interactionY: tileCenter(23, 13).y,
    interactionRadius: 50,
    tab: "achievements",
  }),
  interactable("astral_console", "interactable", 63, 8, 6, 5, "open_settings", "hub.settings", "astral_console", {
    interactionX: tileCenter(66, 13).x,
    interactionY: tileCenter(66, 13).y,
    interactionRadius: 46,
  }),
  interactable("armory_rack", "interactable", 61, 24, 7, 5, "open_armory", "hub.armory", "armory_rack", {
    interactionX: tileCenter(64, 30).x,
    interactionY: tileCenter(64, 30).y,
    interactionRadius: 46,
  }),
  interactable("trial_altar", "interactable", 65, 46, 6, 6, "open_challenge", "hub.trialAltar", "trial_altar", {
    interactionRadius: 48,
  }),
  interactable("training_marker", "interactable", 60, 47, 5, 5, "open_training", "hub.training", "training_marker", {
    interactionRadius: 44,
  }),
  interactable("garden_wish", "interactable", 9, 47, 6, 5, "open_wish_fountain", "hub.wishGarden", "garden_wish", {
    interactionX: tileCenter(12, 53).x,
    interactionY: tileCenter(12, 53).y,
    interactionRadius: 44,
  }),

  region("zone_rebirth", "hub.zone.rebirth", 29, 19, 23, 23),
  region("zone_workshop", "hub.zone.workshop", 4, 19, 22, 22),
  region("zone_archive", "hub.zone.archive", 5, 3, 23, 16),
  region("zone_observatory", "hub.zone.observatory", 56, 3, 20, 16),
  region("zone_armory", "hub.zone.armory", 55, 19, 23, 22),
  region("zone_garden", "hub.zone.garden", 4, 42, 22, 16),
  region("zone_training", "hub.zone.training", 55, 42, 23, 17),
  region("zone_expedition", "hub.zone.expedition", 31, 50, 19, 10),
];

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
  ],
  objects,
  spawnPoints: {
    rebirth_spring: tileCenter(40, 35),
    expedition_gate: tileCenter(40, 50),
    workshop: tileCenter(27, 30),
    archive: tileCenter(28, 13),
    medical_return: tileCenter(34, 47),
    central_plaza: tileCenter(40, 39),
  },
};
