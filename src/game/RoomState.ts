import type { Room } from "./FloorGenerator";

export function isCombatRoom(room: Room): boolean {
  return room.type === "combat" || room.type === "boss";
}

export function isSpecialRoom(room: Room): boolean {
  return room.type === "start" ||
    room.type === "treasure" ||
    
    room.type === "exit" ||
    room.type === "npc" ||
    
    false;
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
  room.combatStartNotified ??= false;
  room.combatClearNotified ??= combatCleared;
  room.rewardGenerated ??= false;
  room.interactionCompleted ??= false;
  if (room.weaponChest) {
    room.weaponChest.kind = room.weaponChest.kind === "boss" ? "boss" : "treasure";
    room.weaponChest.opened = room.interactionCompleted || room.weaponChest.opened === true;
    if (room.weaponChest.opened) room.interactionCompleted = true;
  }
  room.enemies ??= [];
  room.pickups ??= [];

  if (combatCleared) {
    room.enemies = [];
    room.encounterState = undefined;
  }

  return room;
}
