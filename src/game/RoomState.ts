import type { Room } from "./FloorGenerator";

export function isCombatRoom(room: Room): boolean {
  return room.type === "combat" || room.type === "boss";
}

export function isSpecialRoom(room: Room): boolean {
  return room.type === "start" ||
    room.type === "treasure" ||
    room.type === "exit" ||
    room.type === "npc" ||
    room.type === "legacy_rpg" ||
    room.type === "legacy_tactics";
}

export function isCombatCleared(room: Room): boolean {
  if (isSpecialRoom(room)) return true;
  return room.combatCleared ?? room.cleared ?? false;
}

export function markCombatCleared(room: Room): void {
  room.combatCleared = true;
  room.cleared = true;
}

export function normalizeRoomState(room: Room): Room {
  const combatCleared = isSpecialRoom(room)
    ? true
    : (room.combatCleared ?? room.cleared ?? false);

  room.combatCleared = combatCleared;
  room.cleared = combatCleared;
  room.rewardGenerated ??= false;
  room.interactionCompleted ??= false;
  room.enemies ??= [];
  room.pickups ??= [];

  if (combatCleared) {
    room.enemies = [];
    room.encounterState = undefined;
  }

  return room;
}
