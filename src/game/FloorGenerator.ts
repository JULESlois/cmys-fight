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
  // Encounter logic instead of direct enemies
  encounterId?: string;
  // Fallback for remaining enemies if player leaves and comes back
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
  const minMainPathLength = 3 + Math.floor(depth / 2);
  const maxBranches = 2 + Math.floor(depth / 3);

  const themes: ("forest" | "dungeon" | "snow" | "lava")[] = ["forest", "dungeon", "snow", "lava"];
  const theme = themes[(depth - 1) % themes.length];

  let mapGrid: Record<string, Room> = {};

  const getRoom = (x: number, y: number) => mapGrid[`${x},${y}`];
  const setRoom = (x: number, y: number, r: Room) => {
    mapGrid[`${x},${y}`] = r;
    rooms.push(r);
  };

  // 1. Start room
  const startRoom: Room = {
    id: "0,0", x: 0, y: 0, type: "start", cleared: true,
    doors: { up: false, down: false, left: false, right: false }
  };
  setRoom(0, 0, startRoom);

  // Helper for directions
  const dirs = [
    { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
  ];

  // 2. Main path
  let currX = 0, currY = 0;
  for (let i = 0; i < minMainPathLength; i++) {
    const available = dirs.filter(d => !getRoom(currX + d.dx, currY + d.dy));
    if (available.length === 0) break;
    const chosen = available[Math.floor(Math.random() * available.length)];
    currX += chosen.dx;
    currY += chosen.dy;
    setRoom(currX, currY, {
      id: `${currX},${currY}`, x: currX, y: currY, type: "combat", cleared: false,
      doors: { up: false, down: false, left: false, right: false }
    });
  }

  // 3. Branches
  let branchesAdded = 0;
  let attempts = 0;
  while (branchesAdded < maxBranches && attempts < 50) {
    attempts++;
    const r = rooms[Math.floor(Math.random() * rooms.length)];
    if (r.type === "start") continue;
    const available = dirs.filter(d => !getRoom(r.x + d.dx, r.y + d.dy));
    if (available.length > 0) {
      const chosen = available[Math.floor(Math.random() * available.length)];
      const nx = r.x + chosen.dx;
      const ny = r.y + chosen.dy;
      setRoom(nx, ny, {
        id: `${nx},${ny}`, x: nx, y: ny, type: "combat", cleared: false,
        doors: { up: false, down: false, left: false, right: false }
      });
      branchesAdded++;
    }
  }

  // Connect doors based on grid adjacency
  for (const r of rooms) {
    if (getRoom(r.x, r.y - 1)) r.doors.up = true;
    if (getRoom(r.x, r.y + 1)) r.doors.down = true;
    if (getRoom(r.x - 1, r.y)) r.doors.left = true;
    if (getRoom(r.x + 1, r.y)) r.doors.right = true;
  }

  // BFS to find distances from start
  const dists: Record<string, number> = { "0,0": 0 };
  const q: Room[] = [startRoom];
  let maxDist = 0;
  let furthestRooms: Room[] = [];

  while (q.length > 0) {
    const r = q.shift()!;
    const d = dists[r.id];
    
    if (d > maxDist) {
      maxDist = d;
      furthestRooms = [r];
    } else if (d === maxDist) {
      furthestRooms.push(r);
    }

    const neighbors = [
      getRoom(r.x, r.y - 1), getRoom(r.x, r.y + 1),
      getRoom(r.x - 1, r.y), getRoom(r.x + 1, r.y)
    ].filter(n => n && dists[n.id] === undefined);

    for (const n of neighbors) {
      dists[n!.id] = d + 1;
      q.push(n!);
    }
  }

  // Boss is the furthest room
  const bossRoom = furthestRooms[Math.floor(Math.random() * furthestRooms.length)];
  bossRoom.type = "boss";

  // Find dead ends (only 1 door) for special rooms
  const deadEnds = rooms.filter(r => 
    r.id !== "0,0" && r.type !== "boss" &&
    [r.doors.up, r.doors.down, r.doors.left, r.doors.right].filter(Boolean).length === 1
  );

  // Other rooms
  const nonMain = rooms.filter(r => r.id !== "0,0" && r.type !== "boss");

  const assignType = (targetType: Room["type"], preferredSet: Room[], fallbackSet: Room[]) => {
    let choices = preferredSet.filter(r => r.type === "combat");
    if (choices.length === 0) choices = fallbackSet.filter(r => r.type === "combat");
    if (choices.length > 0) {
      const chosen = choices[Math.floor(Math.random() * choices.length)];
      chosen.type = targetType;
      // Also mark it as not cleared initially, though it might change below
    }
  };

  assignType("treasure", deadEnds, nonMain);
  if (Math.random() < 0.5) assignType("legacy_rpg", deadEnds, nonMain);
  else assignType("legacy_tactics", deadEnds, nonMain);

  // Set cleared status correctly
  for (const r of rooms) {
    if (r.type === "treasure" || r.type === "start" || r.type === "npc" || r.type === "legacy_rpg" || r.type === "legacy_tactics") {
      r.cleared = true; 
      // Note: Treasure might spawn chest, but room itself is "cleared" from combat perspective
    }
  }

  // Template matching
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
     r.encounterId = `enc_${r.type}_${depth}`; // Basic encounter ID based on type and depth
  }

  console.log(`[MapGen] Generated ${rooms.length} rooms. Boss Dist: ${maxDist}`);

  return {
    depth,
    theme,
    rooms,
    currentRoomX: 0,
    currentRoomY: 0
  };
}
