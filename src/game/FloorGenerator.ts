export interface Room {
  id: string;
  x: number;
  y: number;
  type: "start" | "combat" | "treasure" | "boss" | "npc";
  cleared: boolean;
  doors: { up: boolean; down: boolean; left: boolean; right: boolean };
  enemies?: { x: number; y: number }[];
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
      if (Math.random() < 0.2) type = "treasure";
      else if (Math.random() < 0.1) type = "npc";
      
      // If last room, make it boss
      if (placedRooms === maxRooms - 1) {
        type = "boss";
      }

      let enemies: {x: number; y: number}[] = [];
      if (type === "combat") {
        const numEnemies = 2 + Math.floor(Math.random() * 3); // 2 to 4 enemies
        for (let i = 0; i < numEnemies; i++) {
          enemies.push({
            x: 4 + Math.floor(Math.random() * 12), // 4 to 15
            y: 4 + Math.floor(Math.random() * 7)   // 4 to 10
          });
        }
      } else if (type === "boss") {
        enemies.push({ x: 10, y: 7 }); // Boss in the center
      }

      const newRoom: Room = {
        id: `${newX},${newY}`,
        x: newX,
        y: newY,
        type,
        cleared: type !== "combat" && type !== "boss", 
        doors: { up: false, down: false, left: false, right: false },
        enemies
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

  return {
    depth,
    theme,
    rooms,
    currentRoomX: 0,
    currentRoomY: 0
  };
}
