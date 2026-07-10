import { ROOM_TEMPLATES } from "./data/roomTemplates";
import type { SerializedEncounterState } from "./EncounterController";
import { normalizeRoomState } from "./RoomState";
import {
  createRunProgressFromGlobalStage,
  getStageLabel,
  isBossStage,
  normalizeRunProgress,
  type RunProgress,
} from "./RunProgress";
import { createRandomSeed, createSeededRandom, hashSeed, type RandomSource } from "./Random";
import type { BuffId } from "./combat/BuffSystem";
import type { ActiveStatusEffect } from "./combat/StatusEffectSystem";
import type { ShopItem } from "./shop/ShopSystem";

export type ThemeId = "forest" | "dungeon" | "snow" | "lava";

export interface Room {
  id: string;
  x: number;
  y: number;
  type: "start" | "combat" | "treasure" | "shop" | "boss" | "exit" | "npc" | "legacy_rpg" | "legacy_tactics";
  cleared: boolean;
  combatCleared?: boolean;
  rewardGenerated?: boolean;
  interactionCompleted?: boolean;
  templateId?: string;
  visited?: boolean;
  doors: { up: boolean; down: boolean; left: boolean; right: boolean };
  encounterId?: string;
  encounterSeed?: number;
  shopSeed?: number;
  shopStock?: ShopItem[];
  encounterState?: SerializedEncounterState;
  enemies?: {
    x: number;
    y: number;
    type: "melee" | "ranged" | "boss";
    enemyId?: string;
    isElite?: boolean;
    hp?: number;
    attackState?: "idle" | "windup" | "recover";
    attackCooldown?: number;
    attackTimer?: number;
    attackAngle?: number;
    attackTargetX?: number;
    attackTargetY?: number;
    bossPhase?: 1 | 2 | 3;
    attackSequence?: number;
    statusEffects?: ActiveStatusEffect[];
  }[];
  pickups?: {
    x: number;
    y: number;
    type: "hp" | "mana" | "coin" | "weapon";
    value: number;
    weaponId?: string;
    blockedUntilPlayerLeaves?: boolean;
  }[];
}

export interface StageData {
  /** Compatibility index used by older systems as a difficulty value. */
  depth: number;
  chapterIndex: number;
  stageIndex: number;
  globalStageIndex: number;
  isBossStage: boolean;
  seed: number;
  buffChoiceOptions?: BuffId[];
  buffChoiceRoomId?: string;
  buffChoiceCompleted?: boolean;
  theme: ThemeId;
  rooms: Room[];
  currentRoomX: number;
  currentRoomY: number;
}

/** @deprecated The old floor field now stores a StageData object. */
export type FloorData = StageData;

const THEMES: ThemeId[] = ["forest", "dungeon", "snow", "lava"];

function choose<T>(items: T[], random: RandomSource): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))];
}

function createRoom(x: number, y: number, type: Room["type"]): Room {
  return {
    id: `${x},${y}`,
    x,
    y,
    type,
    cleared: type === "start" || type === "treasure" || type === "shop" || type === "exit" || type === "npc" || type === "legacy_rpg" || type === "legacy_tactics",
    doors: { up: false, down: false, left: false, right: false },
  };
}

function connectDoors(rooms: Room[], mapGrid: Record<string, Room>): void {
  const getRoom = (x: number, y: number) => mapGrid[`${x},${y}`];
  for (const room of rooms) {
    room.doors.up = Boolean(getRoom(room.x, room.y - 1));
    room.doors.down = Boolean(getRoom(room.x, room.y + 1));
    room.doors.left = Boolean(getRoom(room.x - 1, room.y));
    room.doors.right = Boolean(getRoom(room.x + 1, room.y));
  }
}

function getDistances(mapGrid: Record<string, Room>): Record<string, number> {
  const start = mapGrid["0,0"];
  const distances: Record<string, number> = { "0,0": 0 };
  const queue: Room[] = start ? [start] : [];

  while (queue.length > 0) {
    const room = queue.shift()!;
    const distance = distances[room.id];
    const neighbors = [
      mapGrid[`${room.x},${room.y - 1}`],
      mapGrid[`${room.x},${room.y + 1}`],
      mapGrid[`${room.x - 1},${room.y}`],
      mapGrid[`${room.x + 1},${room.y}`],
    ].filter((candidate): candidate is Room => Boolean(candidate));

    for (const neighbor of neighbors) {
      if (distances[neighbor.id] !== undefined) continue;
      distances[neighbor.id] = distance + 1;
      queue.push(neighbor);
    }
  }

  return distances;
}

function getDoorCount(room: Room): number {
  return [room.doors.up, room.doors.down, room.doors.left, room.doors.right].filter(Boolean).length;
}

function assignRoomType(
  type: Room["type"],
  preferred: Room[],
  fallback: Room[],
  random: RandomSource,
): Room | null {
  const preferredChoices = preferred.filter(room => room.type === "combat");
  const fallbackChoices = fallback.filter(room => room.type === "combat");
  const choices = preferredChoices.length > 0 ? preferredChoices : fallbackChoices;
  if (choices.length === 0) return null;
  const selected = choose(choices, random);
  selected.type = type;
  selected.cleared = true;
  return selected;
}

function assignTemplates(stage: StageData, random: RandomSource): void {
  for (const room of stage.rooms) {
    let validTemplates = ROOM_TEMPLATES.filter(template => template.allowedRoomTypes.includes(room.type));
    if (validTemplates.length === 0) validTemplates = ROOM_TEMPLATES;

    let matchedDoors = validTemplates.filter(template => {
      if (template.doorMask === "any") return true;
      return template.doorMask.left === room.doors.left &&
        template.doorMask.right === room.doors.right &&
        template.doorMask.up === room.doors.up &&
        template.doorMask.down === room.doors.down;
    });

    if (matchedDoors.length === 0) matchedDoors = validTemplates.filter(template => template.doorMask === "any");
    if (matchedDoors.length === 0) matchedDoors = ROOM_TEMPLATES.filter(template => template.doorMask === "any");
    if (matchedDoors.length === 0) matchedDoors = ROOM_TEMPLATES;

    const totalWeight = matchedDoors.reduce((sum, template) => sum + template.weight, 0);
    let roll = random() * totalWeight;
    let selected = matchedDoors[0];
    for (const template of matchedDoors) {
      roll -= template.weight;
      if (roll <= 0) {
        selected = template;
        break;
      }
    }

    room.templateId = selected.id;
    room.encounterId = `enc_${room.type}_${stage.globalStageIndex}`;
    room.encounterSeed = hashSeed(stage.seed, room.id);
    normalizeRoomState(room);
  }
}

function createBossStage(progress: RunProgress, theme: ThemeId, seed: number, random: RandomSource): StageData {
  const start = createRoom(0, 0, "start");
  const preparation = createRoom(1, 0, "shop");
  const boss = createRoom(2, 0, "boss");
  const rooms = [start, preparation, boss];
  const mapGrid: Record<string, Room> = {
    [start.id]: start,
    [preparation.id]: preparation,
    [boss.id]: boss,
  };
  connectDoors(rooms, mapGrid);

  const stage: StageData = {
    depth: progress.globalStageIndex,
    chapterIndex: progress.chapterIndex,
    stageIndex: progress.stageIndex,
    globalStageIndex: progress.globalStageIndex,
    isBossStage: true,
    seed,
    theme,
    rooms,
    currentRoomX: 0,
    currentRoomY: 0,
  };
  assignTemplates(stage, random);
  start.templateId = "cross_room";
  preparation.templateId = "horizontal_corridor";
  boss.templateId = "boss_arena";
  return stage;
}

function createNormalStage(progress: RunProgress, theme: ThemeId, seed: number, random: RandomSource): StageData {
  const rooms: Room[] = [];
  const mapGrid: Record<string, Room> = {};
  const directions = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];
  const addRoom = (room: Room) => {
    mapGrid[room.id] = room;
    rooms.push(room);
  };
  const getRoom = (x: number, y: number) => mapGrid[`${x},${y}`];

  addRoom(createRoom(0, 0, "start"));

  const mainPathLength = 3 + Math.min(2, Math.floor((progress.stageIndex - 1) / 2));
  const branchCount = 2 + Math.min(2, Math.floor((progress.chapterIndex - 1) / 2));
  let currentX = 0;
  let currentY = 0;

  for (let i = 0; i < mainPathLength; i++) {
    const available = directions.filter(direction => !getRoom(currentX + direction.dx, currentY + direction.dy));
    if (available.length === 0) break;
    const direction = choose(available, random);
    currentX += direction.dx;
    currentY += direction.dy;
    addRoom(createRoom(currentX, currentY, "combat"));
  }

  let branchesAdded = 0;
  let attempts = 0;
  while (branchesAdded < branchCount && attempts < 80) {
    attempts++;
    const originChoices = rooms.filter(room => room.type !== "start");
    const origin = choose(originChoices, random);
    const available = directions.filter(direction => !getRoom(origin.x + direction.dx, origin.y + direction.dy));
    if (available.length === 0) continue;
    const direction = choose(available, random);
    addRoom(createRoom(origin.x + direction.dx, origin.y + direction.dy, "combat"));
    branchesAdded++;
  }

  connectDoors(rooms, mapGrid);
  const distances = getDistances(mapGrid);
  const deadEnds = rooms.filter(room => room.type !== "start" && getDoorCount(room) === 1);
  const endpointPool = deadEnds.length > 0 ? deadEnds : rooms.filter(room => room.type !== "start");
  const maxDistance = Math.max(...endpointPool.map(room => distances[room.id] ?? 0));
  const furthest = endpointPool.filter(room => (distances[room.id] ?? 0) === maxDistance);
  const exitRoom = choose(furthest, random);
  exitRoom.type = "exit";
  exitRoom.cleared = true;

  const specialDeadEnds = deadEnds.filter(room => room !== exitRoom);
  const remainingCombat = rooms.filter(room => room.type === "combat");
  assignRoomType(random() < 0.55 ? "shop" : "treasure", specialDeadEnds, remainingCombat, random);
  if (random() < 0.5) {
    assignRoomType("legacy_rpg", specialDeadEnds, remainingCombat, random);
  } else {
    assignRoomType("legacy_tactics", specialDeadEnds, remainingCombat, random);
  }

  const stage: StageData = {
    depth: progress.globalStageIndex,
    chapterIndex: progress.chapterIndex,
    stageIndex: progress.stageIndex,
    globalStageIndex: progress.globalStageIndex,
    isBossStage: false,
    seed,
    theme,
    rooms,
    currentRoomX: 0,
    currentRoomY: 0,
  };
  assignTemplates(stage, random);
  return stage;
}

export function generateStage(progressValue: RunProgress, random: RandomSource = Math.random): StageData {
  const progress = normalizeRunProgress(progressValue);
  const seed = createRandomSeed(random);
  const seededRandom = createSeededRandom(seed);
  const theme = THEMES[(progress.chapterIndex - 1) % THEMES.length];
  const stage = isBossStage(progress)
    ? createBossStage(progress, theme, seed, seededRandom)
    : createNormalStage(progress, theme, seed, seededRandom);

  console.log(
    `[StageGen] Generated ${getStageLabel(progress)} with ${stage.rooms.length} rooms (${stage.isBossStage ? "boss" : "normal"}).`,
  );
  return stage;
}

/** @deprecated Use generateStage with RunProgress. */
export function generateFloor(depth: number): StageData {
  return generateStage(createRunProgressFromGlobalStage(depth));
}
