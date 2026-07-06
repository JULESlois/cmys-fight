import { Room } from "./FloorGenerator";
import { ROOM_TEMPLATES, RoomTemplate } from "./data/roomTemplates";

export const TILE_SIZE = 16;
export const MAP_WIDTH = 20;
export const MAP_HEIGHT = 15;

export function getRoomTemplate(currentRoom: Room | undefined): RoomTemplate {
  if (!currentRoom) return ROOM_TEMPLATES.find(t => t.id === "cross_room")!;

  let validTemplates = ROOM_TEMPLATES.filter(t => t.allowedRoomTypes.includes(currentRoom.type));

  if (validTemplates.length === 0) {
     validTemplates = ROOM_TEMPLATES;
  }

  // Filter by doors if not 'any'
  let matchedDoors = validTemplates.filter(t => {
     if (t.doorMask === "any") return true;
     return t.doorMask.left === currentRoom.doors.left &&
            t.doorMask.right === currentRoom.doors.right &&
            t.doorMask.up === currentRoom.doors.up &&
            t.doorMask.down === currentRoom.doors.down;
  });

  if (matchedDoors.length === 0) {
     matchedDoors = validTemplates.filter(t => t.doorMask === "any");
  }
  
  if (matchedDoors.length === 0) {
     matchedDoors = ROOM_TEMPLATES.filter(t => t.doorMask === "any");
  }

  return matchedDoors[0] || ROOM_TEMPLATES[0];
}

export function getMapData(currentRoom: Room | undefined, theme: string): number[] {
  const template = getRoomTemplate(currentRoom);
  const data = [...template.tiles];
  
  if (currentRoom) {
    if (currentRoom.doors.up) {
      data[0 * MAP_WIDTH + 9] = 2;
      data[0 * MAP_WIDTH + 10] = 2;
      data[1 * MAP_WIDTH + 9] = 2;
      data[1 * MAP_WIDTH + 10] = 2;
    }
    if (currentRoom.doors.down) {
      data[13 * MAP_WIDTH + 9] = 2;
      data[13 * MAP_WIDTH + 10] = 2;
      data[14 * MAP_WIDTH + 9] = 2;
      data[14 * MAP_WIDTH + 10] = 2;
    }
    if (currentRoom.doors.left) {
      data[7 * MAP_WIDTH + 0] = 2;
      data[7 * MAP_WIDTH + 1] = 2;
      data[8 * MAP_WIDTH + 0] = 2;
      data[8 * MAP_WIDTH + 1] = 2;
    }
    if (currentRoom.doors.right) {
      data[7 * MAP_WIDTH + 18] = 2;
      data[7 * MAP_WIDTH + 19] = 2;
      data[8 * MAP_WIDTH + 18] = 2;
      data[8 * MAP_WIDTH + 19] = 2;
    }
  }
  return data;
}

export function isSolid(tileId: number): boolean {
  return tileId === 1;
}

export function isHazard(tileId: number): boolean {
  return tileId === 3;
}
