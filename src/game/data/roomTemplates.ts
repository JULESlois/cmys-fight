export type RoomType = "start" | "combat" | "treasure" | "shop" | "boss" | "exit" | "npc" | "legacy_rpg" | "legacy_tactics" | "wish_fountain" | "photo_booth";

export interface DoorMask {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export interface RoomTemplate {
  id: string;
  allowedRoomTypes: RoomType[];
  doorMask: DoorMask | "any";
  tiles: number[];
  enemySpawnPoints: { x: number; y: number }[];
  pickupSpawnPoints: { x: number; y: number }[];
  portalSpawnPoint?: { x: number; y: number };
  legacySpawnPoint?: { x: number; y: number };
  weight: number;
}


function createOpenRoomTiles(mask: DoorMask | "any"): number[] {
  const width = 20;
  const height = 15;
  const tiles = Array.from({ length: width * height }, () => 0);
  for (let x = 0; x < width; x++) {
    tiles[x] = 1;
    tiles[(height - 1) * width + x] = 1;
  }
  for (let y = 0; y < height; y++) {
    tiles[y * width] = 1;
    tiles[y * width + width - 1] = 1;
  }
  const doors = mask === "any"
    ? { up: true, down: true, left: true, right: true }
    : mask;
  if (doors.up) for (let x = 8; x <= 11; x++) tiles[x] = 0;
  if (doors.down) for (let x = 8; x <= 11; x++) tiles[(height - 1) * width + x] = 0;
  if (doors.left) for (let y = 6; y <= 8; y++) tiles[y * width] = 0;
  if (doors.right) for (let y = 6; y <= 8; y++) tiles[y * width + width - 1] = 0;
  return tiles;
}

export const OPEN_LAYOUT_TEMPLATE_IDS = [
  "horizontal_corridor",
  "vertical_corridor",
  "corner_lt",
  "corner_rt",
  "corner_lb",
  "corner_rb",
  "legacy_room",
] as const;

export const ROOM_TEMPLATES: RoomTemplate[] = [
{
    id: "horizontal_corridor",
    allowedRoomTypes: ["combat", "shop", "npc"],
    doorMask: { left: true, right: true, up: false, down: false },
    tiles: createOpenRoomTiles({ left: true, right: true, up: false, down: false }),
    enemySpawnPoints: [{x: 10, y: 5}, {x: 10, y: 9}, {x: 5, y: 7}, {x: 15, y: 7}],
    pickupSpawnPoints: [{x: 10, y: 7}],
    weight: 10
  },
  {
    id: "vertical_corridor",
    allowedRoomTypes: ["combat", "npc"],
    doorMask: { left: false, right: false, up: true, down: true },
    tiles: createOpenRoomTiles({ left: false, right: false, up: true, down: true }),
    enemySpawnPoints: [{x: 5, y: 7}, {x: 15, y: 7}, {x: 10, y: 3}, {x: 10, y: 11}],
    pickupSpawnPoints: [{x: 10, y: 7}],
    weight: 10
  },
  {
    id: "corner_lt",
    allowedRoomTypes: ["combat", "npc"],
    doorMask: { left: true, right: false, up: true, down: false },
    tiles: createOpenRoomTiles({ left: true, right: false, up: true, down: false }),
    enemySpawnPoints: [{x: 5, y: 5}, {x: 10, y: 5}, {x: 5, y: 10}],
    pickupSpawnPoints: [{x: 15, y: 5}],
    weight: 10
  },
  {
    id: "cross_room",
    allowedRoomTypes: ["combat", "start"],
    doorMask: "any",
    tiles: [1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,2,2,0,0,0,0,0,0,2,2,0,0,0,1,1,1,0,0,0,0,2,2,0,0,0,0,0,0,2,2,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,3,3,3,3,0,0,0,0,0,0,0,1,2,2,0,0,0,0,0,3,3,3,3,3,3,0,0,0,0,0,2,2,2,2,0,0,0,0,0,3,3,3,3,3,3,0,0,0,0,0,2,2,1,0,0,0,0,0,0,0,3,3,3,3,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,2,2,0,0,0,0,0,0,2,2,0,0,0,0,1,1,1,0,0,0,2,2,0,0,0,0,0,0,2,2,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1],
    enemySpawnPoints: [{x: 5, y: 5}, {x: 15, y: 5}, {x: 5, y: 10}, {x: 15, y: 10}],
    pickupSpawnPoints: [{x: 10, y: 7}],
    weight: 1
  },
  {
    id: "dead_end",
    allowedRoomTypes: ["treasure", "shop"],
    doorMask: "any",
    tiles: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,4,0,0,0,0,0,0,0,0,4,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,2,2,2,2,2,2,2,2,0,0,0,1,1,1,1,1,0,0,0,2,2,0,0,0,0,0,0,2,2,0,0,0,1,1,2,2,0,0,2,2,0,0,0,0,0,0,0,0,2,2,0,0,1,1,2,2,0,0,2,2,0,0,0,0,0,0,0,0,2,2,0,0,1,1,1,1,0,0,0,2,2,0,0,0,0,0,0,2,2,0,0,0,1,1,1,1,1,0,0,0,2,2,2,2,2,2,2,2,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,4,0,0,0,0,0,0,0,0,4,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    enemySpawnPoints: [],
    pickupSpawnPoints: [{x: 10, y: 7}],
    weight: 10
  },
  {
    id: "boss_arena",
    allowedRoomTypes: ["boss"],
    doorMask: "any",
    tiles: [1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    enemySpawnPoints: [{x: 10, y: 6}],
    pickupSpawnPoints: [],
    portalSpawnPoint: {x: 10, y: 7},
    weight: 10
  },
  {
    id: "legacy_room",
    allowedRoomTypes: ["wish_fountain", "photo_booth", "legacy_rpg", "legacy_tactics"],
    doorMask: "any",
    tiles: createOpenRoomTiles("any"),
    enemySpawnPoints: [],
    pickupSpawnPoints: [],
    legacySpawnPoint: {x: 10, y: 7},
    weight: 10
  }  ,
  {
    id: "corner_rt",
    allowedRoomTypes: ["combat", "npc"],
    doorMask: { left: false, right: true, up: true, down: false },
    tiles: createOpenRoomTiles({ left: false, right: true, up: true, down: false }),
    enemySpawnPoints: [{x: 10, y: 5}, {x: 15, y: 5}, {x: 15, y: 10}],
    pickupSpawnPoints: [{x: 15, y: 10}],
    weight: 10
  },
  {
    id: "corner_lb",
    allowedRoomTypes: ["combat", "npc"],
    doorMask: { left: true, right: false, up: false, down: true },
    tiles: createOpenRoomTiles({ left: true, right: false, up: false, down: true }),
    enemySpawnPoints: [{x: 5, y: 10}, {x: 10, y: 10}, {x: 5, y: 12}],
    pickupSpawnPoints: [{x: 5, y: 10}],
    weight: 10
  },
  {
    id: "corner_rb",
    allowedRoomTypes: ["combat", "npc"],
    doorMask: { left: false, right: true, up: false, down: true },
    tiles: createOpenRoomTiles({ left: false, right: true, up: false, down: true }),
    enemySpawnPoints: [{x: 10, y: 10}, {x: 15, y: 10}, {x: 15, y: 12}],
    pickupSpawnPoints: [{x: 15, y: 10}],
    weight: 10
  },
  {
    id: "dead_end_up",
    allowedRoomTypes: ["combat", "treasure", "shop", "boss", "exit", "npc", "wish_fountain", "photo_booth", "legacy_rpg", "legacy_tactics"],
    doorMask: { left: false, right: false, up: true, down: false },
    tiles: [
      1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,
      1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,
      1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,
      1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,
      1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,
      1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,
      1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,
      1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,
      1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,
      1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,
      1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
      1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
      1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
      1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
      1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    enemySpawnPoints: [{x: 10, y: 5}, {x: 10, y: 7}],
    pickupSpawnPoints: [{x: 10, y: 7}],
    portalSpawnPoint: {x: 10, y: 7.5},
    legacySpawnPoint: {x: 10, y: 7.5},
    weight: 10
  },
  {
    id: "dead_end_down",
    allowedRoomTypes: ["combat", "treasure", "shop", "boss", "exit", "npc", "wish_fountain", "photo_booth", "legacy_rpg", "legacy_tactics"],
    doorMask: { left: false, right: false, up: false, down: true },
    tiles: [
      1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
      1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
      1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
      1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
      1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
      1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,
      1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,
      1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,
      1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,
      1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,
      1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,
      1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,
      1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,
      1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,
      1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1],
    enemySpawnPoints: [{x: 10, y: 10}, {x: 10, y: 12}],
    pickupSpawnPoints: [{x: 10, y: 12}],
    portalSpawnPoint: {x: 10, y: 7.5},
    legacySpawnPoint: {x: 10, y: 7.5},
    weight: 10
  },
  {
    id: "dead_end_left",
    allowedRoomTypes: ["combat", "treasure", "shop", "boss", "exit", "npc", "wish_fountain", "photo_booth", "legacy_rpg", "legacy_tactics"],
    doorMask: { left: true, right: false, up: false, down: false },
    tiles: [
      1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
      1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,
      1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,
      1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,
      1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,
      1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,
      1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,
      0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,
      0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,
      1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,
      1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,
      1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,
      1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,
      1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,
      1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    enemySpawnPoints: [{x: 5, y: 7}, {x: 7, y: 7}],
    pickupSpawnPoints: [{x: 5, y: 7}],
    portalSpawnPoint: {x: 10, y: 7.5},
    legacySpawnPoint: {x: 10, y: 7.5},
    weight: 10
  },
  {
    id: "dead_end_right",
    allowedRoomTypes: ["combat", "treasure", "shop", "boss", "exit", "npc", "wish_fountain", "photo_booth", "legacy_rpg", "legacy_tactics"],
    doorMask: { left: false, right: true, up: false, down: false },
    tiles: [
      1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
      1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,1,
      1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,1,
      1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,1,
      1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,1,
      1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,1,
      1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,1,
      1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,
      1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,
      1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,1,
      1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,1,
      1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,1,
      1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,1,
      1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,1,
      1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    enemySpawnPoints: [{x: 15, y: 7}, {x: 13, y: 7}],
    pickupSpawnPoints: [{x: 15, y: 7}],
    portalSpawnPoint: {x: 10, y: 7.5},
    legacySpawnPoint: {x: 10, y: 7.5},
    weight: 10
  },
  {
    id: "three_way_up",
    allowedRoomTypes: ["combat", "npc"],
    doorMask: { left: true, right: true, up: true, down: false },
    tiles: [
      1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
    ],
    enemySpawnPoints: [{x: 5, y: 10}, {x: 10, y: 10}, {x: 15, y: 10}],
    pickupSpawnPoints: [{x: 10, y: 10}],
    weight: 10
  },
  {
    id: "three_way_down",
    allowedRoomTypes: ["combat", "npc"],
    doorMask: { left: true, right: true, up: false, down: true },
    tiles: [
      1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1
    ],
    enemySpawnPoints: [{x: 5, y: 5}, {x: 10, y: 5}, {x: 15, y: 5}],
    pickupSpawnPoints: [{x: 10, y: 5}],
    weight: 10
  },
  {
    id: "three_way_left",
    allowedRoomTypes: ["combat", "npc"],
    doorMask: { left: true, right: false, up: true, down: true },
    tiles: [
      1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1
    ],
    enemySpawnPoints: [{x: 10, y: 5}, {x: 15, y: 7.5}, {x: 10, y: 10}],
    pickupSpawnPoints: [{x: 15, y: 7.5}],
    weight: 10
  },
  {
    id: "three_way_right",
    allowedRoomTypes: ["combat", "npc"],
    doorMask: { left: false, right: true, up: true, down: true },
    tiles: [
      1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
      1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1
    ],
    enemySpawnPoints: [{x: 5, y: 7.5}, {x: 10, y: 5}, {x: 10, y: 10}],
    pickupSpawnPoints: [{x: 5, y: 7.5}],
    weight: 10
  }
];