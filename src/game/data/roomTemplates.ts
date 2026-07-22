export type RoomType = "start" | "combat" | "treasure" | "boss" | "exit" | "npc" | "hidden";

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

const WIDTH = 20;
const HEIGHT = 15;
const FLOOR = 0;
const WALL = 1;
const PROP = 4;
const BREAKABLE = 5;

const ANY_DOORS: DoorMask = { up: true, down: true, left: true, right: true };
const COMBAT_TYPES: RoomType[] = ["combat", "npc"];
const SPECIAL_TYPES: RoomType[] = [
  "treasure", "boss", "exit", "npc",
  
];

function normalizeMask(mask: DoorMask | "any"): DoorMask {
  return mask === "any" ? ANY_DOORS : mask;
}

/** Standard outer wall with every declared doorway cut toward the room center. */
function createRoomTiles(mask: DoorMask | "any", detail: "open" | "combat" | "boss" = "open"): number[] {
  const tiles = Array.from({ length: WIDTH * HEIGHT }, () => FLOOR);
  for (let x = 0; x < WIDTH; x++) {
    tiles[x] = WALL;
    tiles[(HEIGHT - 1) * WIDTH + x] = WALL;
  }
  for (let y = 0; y < HEIGHT; y++) {
    tiles[y * WIDTH] = WALL;
    tiles[y * WIDTH + WIDTH - 1] = WALL;
  }

  const doors = normalizeMask(mask);
  if (doors.up) for (let x = 8; x <= 11; x++) tiles[x] = FLOOR;
  if (doors.down) for (let x = 8; x <= 11; x++) tiles[(HEIGHT - 1) * WIDTH + x] = FLOOR;
  if (doors.left) for (let y = 6; y <= 8; y++) tiles[y * WIDTH] = FLOOR;
  if (doors.right) for (let y = 6; y <= 8; y++) tiles[y * WIDTH + WIDTH - 1] = FLOOR;

  // Edge cover replaces the old solid quadrants. It stays outside the central
  // 14x9 facility field and never exceeds a 2x2 connected wall group.
  if (detail !== "open") {
    const wallCells = detail === "boss"
      ? [[2, 2], [3, 2], [2, 3], [17, 2], [16, 2], [17, 3], [2, 12], [3, 12], [17, 12], [16, 12]]
      : [[2, 2], [3, 2], [2, 3], [17, 11], [16, 12], [17, 12]];
    for (const [x, y] of wallCells) tiles[y * WIDTH + x] = WALL;
    for (const [x, y] of [[5, 2], [14, 12]]) tiles[y * WIDTH + x] = PROP;
    for (const [x, y] of [[6, 12], [13, 2]]) tiles[y * WIDTH + x] = BREAKABLE;
  }
  return tiles;
}

function template(
  id: string,
  allowedRoomTypes: RoomType[],
  doorMask: DoorMask | "any",
  enemySpawnPoints: { x: number; y: number }[],
  pickupSpawnPoints: { x: number; y: number }[],
  options: {
    portalSpawnPoint?: { x: number; y: number };
    legacySpawnPoint?: { x: number; y: number };
    detail?: "open" | "combat" | "boss";
    weight?: number;
  } = {},
): RoomTemplate {
  return {
    id,
    allowedRoomTypes,
    doorMask,
    tiles: createRoomTiles(doorMask, options.detail ?? "open"),
    enemySpawnPoints,
    pickupSpawnPoints,
    portalSpawnPoint: options.portalSpawnPoint,
    legacySpawnPoint: options.legacySpawnPoint,
    weight: options.weight ?? 10,
  };
}

export const OPEN_LAYOUT_TEMPLATE_IDS = [
  "horizontal_corridor", "vertical_corridor",
  "corner_lt", "corner_rt", "corner_lb", "corner_rb",
  "legacy_room", "dead_end", "dead_end_up", "dead_end_down",
  "dead_end_left", "dead_end_right",
] as const;

export const ROOM_TEMPLATES: RoomTemplate[] = [
  template("horizontal_corridor", ["combat", "npc"], { left: true, right: true, up: false, down: false },
    [{ x: 10, y: 5 }, { x: 10, y: 9 }, { x: 5, y: 7 }, { x: 15, y: 7 }], [{ x: 10, y: 7 }], { detail: "combat" }),
  template("vertical_corridor", COMBAT_TYPES, { left: false, right: false, up: true, down: true },
    [{ x: 5, y: 7 }, { x: 15, y: 7 }, { x: 10, y: 3 }, { x: 10, y: 11 }], [{ x: 10, y: 7 }], { detail: "combat" }),
  template("corner_lt", COMBAT_TYPES, { left: true, right: false, up: true, down: false },
    [{ x: 5, y: 5 }, { x: 10, y: 5 }, { x: 5, y: 10 }], [{ x: 15, y: 5 }], { detail: "combat" }),
  template("cross_room", ["combat", "start"], "any",
    [{ x: 5, y: 5 }, { x: 15, y: 5 }, { x: 5, y: 10 }, { x: 15, y: 10 }], [{ x: 10, y: 7 }], { detail: "combat", weight: 1 }),
  template("dead_end", ["treasure"], "any", [], [{ x: 10, y: 7 }]),
  template("boss_arena", ["boss"], "any", [{ x: 10, y: 6 }], [], {
    detail: "boss", portalSpawnPoint: { x: 10, y: 7 },
  }),
  template("legacy_room", ["combat", "combat", "combat", "combat"], "any", [], [], {
    legacySpawnPoint: { x: 10, y: 7 },
  }),
  template("corner_rt", COMBAT_TYPES, { left: false, right: true, up: true, down: false },
    [{ x: 10, y: 5 }, { x: 15, y: 5 }, { x: 15, y: 10 }], [{ x: 15, y: 10 }], { detail: "combat" }),
  template("corner_lb", COMBAT_TYPES, { left: true, right: false, up: false, down: true },
    [{ x: 5, y: 10 }, { x: 10, y: 10 }, { x: 5, y: 12 }], [{ x: 5, y: 10 }], { detail: "combat" }),
  template("corner_rb", COMBAT_TYPES, { left: false, right: true, up: false, down: true },
    [{ x: 10, y: 10 }, { x: 15, y: 10 }, { x: 15, y: 12 }], [{ x: 15, y: 10 }], { detail: "combat" }),
  template("dead_end_up", ["combat", ...SPECIAL_TYPES], { left: false, right: false, up: true, down: false },
    [{ x: 7, y: 5 }, { x: 13, y: 8 }], [{ x: 10, y: 7 }], {
      detail: "open", portalSpawnPoint: { x: 10, y: 7.5 }, legacySpawnPoint: { x: 10, y: 7.5 },
    }),
  template("dead_end_down", ["combat", ...SPECIAL_TYPES], { left: false, right: false, up: false, down: true },
    [{ x: 7, y: 9 }, { x: 13, y: 6 }], [{ x: 10, y: 7 }], {
      detail: "open", portalSpawnPoint: { x: 10, y: 7.5 }, legacySpawnPoint: { x: 10, y: 7.5 },
    }),
  template("dead_end_left", ["combat", ...SPECIAL_TYPES], { left: true, right: false, up: false, down: false },
    [{ x: 6, y: 5 }, { x: 12, y: 9 }], [{ x: 10, y: 7 }], {
      detail: "open", portalSpawnPoint: { x: 10, y: 7.5 }, legacySpawnPoint: { x: 10, y: 7.5 },
    }),
  template("dead_end_right", ["combat", ...SPECIAL_TYPES], { left: false, right: true, up: false, down: false },
    [{ x: 8, y: 9 }, { x: 14, y: 5 }], [{ x: 10, y: 7 }], {
      detail: "open", portalSpawnPoint: { x: 10, y: 7.5 }, legacySpawnPoint: { x: 10, y: 7.5 },
    }),
  template("three_way_up", COMBAT_TYPES, { left: true, right: true, up: true, down: false },
    [{ x: 5, y: 10 }, { x: 10, y: 10 }, { x: 15, y: 10 }], [{ x: 10, y: 9 }], { detail: "combat" }),
  template("three_way_down", COMBAT_TYPES, { left: true, right: true, up: false, down: true },
    [{ x: 5, y: 5 }, { x: 10, y: 5 }, { x: 15, y: 5 }], [{ x: 10, y: 5 }], { detail: "combat" }),
  template("three_way_left", COMBAT_TYPES, { left: true, right: false, up: true, down: true },
    [{ x: 10, y: 5 }, { x: 15, y: 7.5 }, { x: 10, y: 10 }], [{ x: 14, y: 7.5 }], { detail: "combat" }),
  template("three_way_right", COMBAT_TYPES, { left: false, right: true, up: true, down: true },
    [{ x: 5, y: 7.5 }, { x: 10, y: 5 }, { x: 10, y: 10 }], [{ x: 6, y: 7.5 }], { detail: "combat" }),
];

export const ALL_ROOM_TEMPLATE_IDS = ROOM_TEMPLATES.map(template => template.id);
