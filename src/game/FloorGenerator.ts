import { ROOM_TEMPLATES } from "./data/roomTemplates";
export interface Room {
  id: string;
  x: number;
  y: number;
  type: "start" | "combat" | "treasure" | "boss" | "npc" | "legacy_rpg" | "legacy_tactics";
  cleared: boolean;
  templateId?: string;
  visited?: boolean;
  doors: { up: boolean; down: boolean; left: boolean; right: boolean };
  enemies?: { x: number, y: number, type: "melee" | "ranged" | "boss", hp?: number }[];
  pickups?: { x: number, y: number, type: "hp" | "mana" | "coin" | "weapon", value: number, weaponId?: string }[];
}

export interface FloorData {
  depth: number;
  theme: "forest" | "dungeon" | "snow" | "lava";
  rooms: Room[];
  currentRoomX: number;
  currentRoomY: number;
}

export function generateFloor(depth: number): FloorData {
  const rooms: Room[] = [];
  const maxRooms = 5 + depth * 2;
  
  const themes: ("forest" | "dungeon" | "snow" | "lava")[] = ["forest", "dungeon", "snow", "lava"];
  const theme = themes[(depth - 1) % themes.length];

  // Create start room at 0,0
  rooms.push({
    id: "0,0",
    x: 0,
    y: 0,
    type: "start",
    cleared: true,
    doors: { up: false, down: false, left: false, right: false }
  });

  const getRoom = (x: number, y: number) => rooms.find(r => r.x === x && r.y === y);

  let placedRooms = 1;
  let hasLegacyRpg = false;
  let hasLegacyTactics = false;
  while (placedRooms < maxRooms) {
    const r = rooms[Math.floor(Math.random() * rooms.length)];
    const dirs = [
      { dx: 0, dy: -1, dir: "up", opp: "down" },
      { dx: 0, dy: 1, dir: "down", opp: "up" },
      { dx: -1, dy: 0, dir: "left", opp: "right" },
      { dx: 1, dy: 0, dir: "right", opp: "left" }
    ];
    
    // Pick a random available direction
    const available = dirs.filter(d => !getRoom(r.x + d.dx, r.y + d.dy));
    if (available.length > 0) {
      const chosen = available[Math.floor(Math.random() * available.length)];
      const newX = r.x + chosen.dx;
      const newY = r.y + chosen.dy;
      
      // Assign type
      let type: Room["type"] = "combat";
      const rand = Math.random();
      if (rand < 0.1) type = "treasure";
      else if (rand < 0.15) type = "npc";
      else if (rand < 0.20 && !hasLegacyRpg) { type = "legacy_rpg"; hasLegacyRpg = true; }
      else if (rand < 0.25 && !hasLegacyTactics) { type = "legacy_tactics"; hasLegacyTactics = true; }
      
      // If last room, make it boss
      if (placedRooms === maxRooms - 1) {
        type = "boss";
      }

      const newRoom: Room = {
        id: `${newX},${newY}`,
        x: newX,
        y: newY,
        type,
        cleared: type !== "combat" && type !== "boss" && type !== "legacy_rpg" && type !== "legacy_tactics" && type !== "treasure", 
        doors: { up: false, down: false, left: false, right: false },
        };
      
      rooms.push(newRoom);
      placedRooms++;
    }
  }

  // Connect doors
  for (const r of rooms) {
    if (getRoom(r.x, r.y - 1)) r.doors.up = true;
    if (getRoom(r.x, r.y + 1)) r.doors.down = true;
    if (getRoom(r.x - 1, r.y)) r.doors.left = true;
    if (getRoom(r.x + 1, r.y)) r.doors.right = true;
  }


  // Assign templates and enemies
  for (const r of rooms) {
     let validTemplates = ROOM_TEMPLATES.filter(t => t.allowedRoomTypes.includes(r.type));
     if (validTemplates.length === 0) validTemplates = ROOM_TEMPLATES;
     
     let matchedDoors = validTemplates.filter(t => {
       if (t.doorMask === "any") return true;
       return t.doorMask.left === r.doors.left &&
              t.doorMask.right === r.doors.right &&
              t.doorMask.up === r.doors.up &&
              t.doorMask.down === r.doors.down;
     });
     
     if (matchedDoors.length === 0) {
       matchedDoors = validTemplates.filter(t => t.doorMask === "any");
     }
     if (matchedDoors.length === 0) {
       matchedDoors = ROOM_TEMPLATES.filter(t => t.doorMask === "any");
     }
     if (matchedDoors.length === 0) {
       matchedDoors = ROOM_TEMPLATES;
     }

     // Weighted random
     let totalWeight = matchedDoors.reduce((sum, t) => sum + t.weight, 0);
     let rand = Math.random() * totalWeight;
     let selected = matchedDoors[0];
     for (const t of matchedDoors) {
        rand -= t.weight;
        if (rand <= 0) {
           selected = t;
           break;
        }
     }
     
     r.templateId = selected.id;
     
     // Initialize enemies
     r.enemies = [];
     if (r.type !== "treasure" && r.type !== "start") {
        for (const pt of selected.enemySpawnPoints) {
           const eType = r.type === "boss" ? "boss" : (Math.random() > 0.5 ? "melee" : "ranged");
           r.enemies.push({ x: pt.x * 16 + 8, y: pt.y * 16 + 8, type: eType });
        }
     }
  }

  return {
    depth,
    theme,
    rooms,
    currentRoomX: 0,
    currentRoomY: 0
  };
}
