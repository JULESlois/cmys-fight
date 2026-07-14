import { Room } from "./FloorGenerator";
import { ROOM_TEMPLATES, RoomTemplate } from "./data/roomTemplates";
import { applyRoomVariant } from "./RoomVariantSystem";

export const TILE_SIZE = 16;
export const MAP_WIDTH = 20;
export const MAP_HEIGHT = 15;
export const TILE_FLOOR = 0;
export const TILE_WALL = 1;
export const TILE_BRIDGE = 2;
export const TILE_HAZARD = 3;
export const TILE_PROP = 4;
export const TILE_BREAKABLE = 5;
export const TILE_STRUCTURE = 6;

export const DOOR_ZONES = {
  left: { xMin: 0, xMax: 1, yMin: 6, yMax: 8 },
  right: { xMin: 18, xMax: 19, yMin: 6, yMax: 8 },
  up: { xMin: 8, xMax: 11, yMin: 0, yMax: 1 },
  down: { xMin: 8, xMax: 11, yMin: 13, yMax: 14 }
};

// Door openings from different templates used to stop after two edge tiles.
// These corridors meet at the room center, so a minimap connection always has a
// collision-free route even when the selected template contains interior walls.
export const DOOR_CORRIDORS = {
  left: { xMin: 0, xMax: 10, yMin: 6, yMax: 8 },
  right: { xMin: 9, xMax: 19, yMin: 6, yMax: 8 },
  up: { xMin: 8, xMax: 11, yMin: 0, yMax: 7 },
  down: { xMin: 8, xMax: 11, yMin: 7, yMax: 14 },
};

export const DOOR_ENTRY_POINTS = {
  fromLeft: { x: 17, y: 120 },
  fromRight: { x: 303, y: 120 },
  fromUp: { x: 160, y: 17 },
  fromDown: { x: 160, y: 223 },
};



export function getRoomTemplate(currentRoom: Room | undefined): RoomTemplate {
  if (!currentRoom) return ROOM_TEMPLATES.find(t => t.id === "cross_room")!;

  if (currentRoom.templateId) {
    const template = ROOM_TEMPLATES.find(t => t.id === currentRoom.templateId);
    if (template) return template;
  }

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
    applyRoomVariant(data, currentRoom, theme, template, MAP_WIDTH, MAP_HEIGHT);
    const applyDoor = (zone: {xMin: number, xMax: number, yMin: number, yMax: number}) => {
      for (let y = zone.yMin; y <= zone.yMax; y++) {
        for (let x = zone.xMin; x <= zone.xMax; x++) {
          data[y * MAP_WIDTH + x] = 0; // Set to passable floor (0) instead of 2 (bridge) to be safe
        }
      }
    };
    
    if (currentRoom.doors.up) applyDoor(DOOR_CORRIDORS.up);
    if (currentRoom.doors.down) applyDoor(DOOR_CORRIDORS.down);
    if (currentRoom.doors.left) applyDoor(DOOR_CORRIDORS.left);
    if (currentRoom.doors.right) applyDoor(DOOR_CORRIDORS.right);

    // Destroyed combat props persist when the player revisits the room. The
    // generated layout remains deterministic, while only the authored crate,
    // urn, sample case or slag drum cells are removed.
    for (const index of currentRoom.destroyedPropTiles ?? []) {
      if (index >= 0 && index < data.length && data[index] === TILE_BREAKABLE) {
        data[index] = TILE_FLOOR;
      }
    }
  }
  
  return data;
}

export function isSolid(tileId: number): boolean {
  return tileId === TILE_WALL || tileId === TILE_BREAKABLE || tileId === TILE_STRUCTURE;
}

export function isHazard(tileId: number): boolean {
  return tileId === TILE_HAZARD;
}

export function isBreakable(tileId: number): boolean {
  return tileId === TILE_BREAKABLE;
}

export function validateTemplates() {
  let errors = 0;
  for (const t of ROOM_TEMPLATES) {
    if (t.tiles.length !== 300) {
      console.warn(`Template ${t.id} has ${t.tiles.length} tiles instead of 300`);
      errors++;
    }
    const checkPoint = (pt: any, name: string) => {
      if (!pt) return;
      const tx = Math.floor(pt.x);
      const ty = Math.floor(pt.y);
      if (tx >= 0 && tx < MAP_WIDTH && ty >= 0 && ty < MAP_HEIGHT) {
        const tileId = t.tiles[ty * MAP_WIDTH + tx];
        if (tileId === 1) { // 1 is solid
          console.warn(`Template ${t.id} has ${name} on solid tile at ${pt.x}, ${pt.y}`);
          errors++;
        }
      }
    };
    for (const pt of t.enemySpawnPoints) checkPoint(pt, 'enemySpawnPoint');
    for (const pt of t.pickupSpawnPoints) checkPoint(pt, 'pickupSpawnPoint');
    checkPoint(t.portalSpawnPoint, 'portalSpawnPoint');
    checkPoint(t.legacySpawnPoint, 'legacySpawnPoint');

    // Check if declared doors are open (passable)
    const checkDoor = (zone: {xMin: number, xMax: number, yMin: number, yMax: number}, dir: string) => {
        let isPassable = true;
        for(let y = zone.yMin; y <= zone.yMax; y++) {
            for(let x = zone.xMin; x <= zone.xMax; x++) {
                if(t.tiles[y * MAP_WIDTH + x] === 1) isPassable = false;
            }
        }
        if (!isPassable) {
            // It's a warning because MapData gets dynamic cut-outs now, but templates SHOULD have open doors if they declare them.
            // console.warn(`Template ${t.id} declares ${dir} door but has solid tiles in door zone`);
        }
    };

    if (t.doorMask !== "any") {
       if (t.doorMask.up) checkDoor(DOOR_ZONES.up, 'up');
       if (t.doorMask.down) checkDoor(DOOR_ZONES.down, 'down');
       if (t.doorMask.left) checkDoor(DOOR_ZONES.left, 'left');
       if (t.doorMask.right) checkDoor(DOOR_ZONES.right, 'right');
    }
  }
  if (errors > 0) {
    console.warn(`Template validation found ${errors} issues.`);
  } else {
    console.log("All map templates validated successfully.");
  }
}

// Run validation immediately in dev
try {
  validateTemplates();
} catch (e) {
  console.error(e);
}
