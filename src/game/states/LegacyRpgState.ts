import { GameState } from "./GameState";
import { Engine } from "../Engine";
import { events } from "../EventBus";

const TILE_SIZE = 16;
const MAP_WIDTH = 20;
const MAP_HEIGHT = 15;

// Tile definitions:
// 0: Lush Grass (Walkable)
// 1: Thick Sakura forest / Boundaries (Obstacle)
// 2: Ancient Stone Path (Walkable)
// 3: Sacred River (Obstacle)
// 4: Stone Lantern (Obstacle & Light Source)
// 5: Torii Gate (Walkable but framed)
const baseMapData = [
  1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
  1,1,1,1,1,1,1,1,4,0,0,4,1,1,1,1,1,1,1,1,
  1,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,1,
  1,0,2,2,2,0,0,0,2,2,2,2,0,0,0,2,2,2,0,1,
  1,0,2,0,2,0,0,0,2,0,0,2,0,0,0,2,0,2,0,1,
  1,0,2,2,2,2,2,2,2,0,0,2,2,2,2,2,2,2,0,1,
  1,0,0,0,0,0,0,0,2,0,0,2,0,0,0,0,0,0,0,1,
  1,1,4,0,0,4,1,0,2,0,0,2,0,1,4,0,0,4,1,1,
  1,0,0,0,0,0,1,0,2,2,2,2,0,1,0,0,0,0,0,1,
  1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
  1,3,3,3,3,3,3,3,3,0,0,3,3,3,3,3,3,3,3,1,
  1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
  1,0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,0,1,
  1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
  1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
];

function getMapData(currentRoom: any): number[] {
  const data = [...baseMapData];
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

const TILE_OBSTACLE: { [key: number]: boolean } = {
  0: false,
  1: true,
  2: false,
  3: false, // water/lava is passable now
  4: true,
  5: false,
};

// NPCs with modern anime styling details
const npcs = [
  { x: 10, y: 3, name: "Aoi (Miko)", role: "Sacred Shrine Maiden", color: "#E74C3C", headColor: "#FFF" },
  { x: 5, y: 8, name: "Kaito (Ronin)", role: "Mysterious Exile Samurai", color: "#34495E", headColor: "#5DADE2" },
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  spin: number;
}

export class LegacyRpgState extends GameState {
  private moveTimer: number = 0;
  private particles: Particle[] = [];
  private pulseTimer: number = 0;
  private windTime: number = 0;

  // Transition & Animation state
  private transitionState: "none" | "fade_out" | "fade_in" = "none";
  private transitionAlpha: number = 0;
  private pendingTransition: { dx: number, dy: number, px: number, py: number } | null = null;

  private pVisX: number = -1;
  private pVisY: number = -1;
  private pDir: "up" | "down" | "left" | "right" = "down";
  private pWalkAnim: number = 0;
  private params: any;

  enter(params?: any) {
    this.params = params;
    this.spawnParticles(15);
    this.transitionState = "none";
    this.transitionAlpha = 0;
    this.pVisX = this.engine.data.data.legacyData.player.x;
    this.pVisY = this.engine.data.data.legacyData.player.y;
  }

  exit() {}

  private spawnParticles(count: number) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * 320,
        y: Math.random() * 240,
        vx: -0.2 - Math.random() * 0.4,
        vy: 0.3 + Math.random() * 0.5,
        size: 2 + Math.random() * 3,
        angle: Math.random() * Math.PI * 2,
        spin: 0.02 + Math.random() * 0.05,
      });
    }
  }

  update(dt: number) {
    this.moveTimer -= dt;
    this.pulseTimer += dt;
    this.windTime += dt;

    if (this.transitionState === "fade_out") {
      this.transitionAlpha += dt * 4;
      if (this.transitionAlpha >= 1) {
         this.transitionAlpha = 1;
         if (this.pendingTransition) {
            const pt = this.pendingTransition;
            const floor = this.engine.data.data.floor;
            floor.currentRoomX += pt.dx;
            floor.currentRoomY += pt.dy;
            this.engine.data.data.legacyData.player.x = pt.px;
            this.engine.data.data.legacyData.player.y = pt.py;
            this.pVisX = pt.px;
            this.pVisY = pt.py;
            
            this.transitionState = "fade_in";
            this.pendingTransition = null;
         }
      }
      return;
    } else if (this.transitionState === "fade_in") {
      this.transitionAlpha -= dt * 4;
      if (this.transitionAlpha <= 0) {
        this.transitionAlpha = 0;
        this.transitionState = "none";
      }
      return;
    }

    // Handle menu state change
    if (this.engine.input.justPressed["Enter"]) {
      events.emit("state:change", "menu");
      return;
    }

    const px = this.engine.data.data.legacyData.player.x;
    const py = this.engine.data.data.legacyData.player.y;
    const speed = 10 * dt;
    
    let isMoving = false;
    if (this.pVisX < px) { this.pVisX = Math.min(px, this.pVisX + speed); isMoving = true; }
    else if (this.pVisX > px) { this.pVisX = Math.max(px, this.pVisX - speed); isMoving = true; }
    
    if (this.pVisY < py) { this.pVisY = Math.min(py, this.pVisY + speed); isMoving = true; }
    else if (this.pVisY > py) { this.pVisY = Math.max(py, this.pVisY - speed); isMoving = true; }

    if (isMoving) {
      this.pWalkAnim += dt * 8;
    } else {
      this.pWalkAnim = 0;
    }

    // Input-driven player movement
    // Only accept input if we are visually at the target tile and cooldown allows
    if (!isMoving && this.moveTimer <= 0) {
      let dx = 0;
      let dy = 0;

      if (this.engine.input.keys["ArrowUp"] || this.engine.input.keys["w"]) dy = -1;
      else if (this.engine.input.keys["ArrowDown"] || this.engine.input.keys["s"]) dy = 1;
      else if (this.engine.input.keys["ArrowLeft"] || this.engine.input.keys["a"]) dx = -1;
      else if (this.engine.input.keys["ArrowRight"] || this.engine.input.keys["d"]) dx = 1;

      if (dx !== 0 || dy !== 0) {
        if (dx < 0) this.pDir = "left";
        else if (dx > 0) this.pDir = "right";
        else if (dy < 0) this.pDir = "up";
        else if (dy > 0) this.pDir = "down";
        
        this.movePlayer(dx, dy);
        this.moveTimer = 0.16; // Move delay to feel responsive but structured
      }
    }

    // Check interaction
    if (this.engine.input.justPressed[" "]) {
      this.interact();
    }

    // Update Sakura particles (Floating wind flow)
    for (const p of this.particles) {
      p.y += p.vy;
      p.x += p.vx + Math.sin(this.windTime + p.y * 0.05) * 0.2;
      p.angle += p.spin;

      // Recycle off-screen particles
      if (p.y > 240 || p.x < -10) {
        p.y = -5;
        p.x = Math.random() * 340;
        p.vx = -0.2 - Math.random() * 0.4;
        p.vy = 0.3 + Math.random() * 0.5;
      }
    }
  }

  private interact() {
    const floor = this.engine.data.data.floor;
    const currentRoom = floor.rooms.find(r => r.x === floor.currentRoomX && r.y === floor.currentRoomY);
    if (currentRoom?.type !== "npc" && currentRoom?.type !== "start") return;

    const px = this.engine.data.data.legacyData.player.x;
    const py = this.engine.data.data.legacyData.player.y;

    for (const npc of npcs) {
      if (Math.abs(npc.x - px) + Math.abs(npc.y - py) === 1) {
        events.emit("dialog:start", {
          npc,
          returnState: "legacy_rpg",
          sourceRoomId: this.params?.sourceRoomId,
          legacyType: "legacy_rpg"
        });
        return;
      }
    }
  }

  private movePlayer(dx: number, dy: number) {
    const newX = this.engine.data.data.legacyData.player.x + dx;
    const newY = this.engine.data.data.legacyData.player.y + dy;

    const floor = this.engine.data.data.floor;
    const currentRoom = floor.rooms.find(r => r.x === floor.currentRoomX && r.y === floor.currentRoomY);

    if (newX < 0 || newX >= MAP_WIDTH || newY < 0 || newY >= MAP_HEIGHT) {
      events.emit("state:change", "dungeon", {
        fromLegacy: true,
        legacyType: "legacy_rpg",
        sourceRoomId: this.params?.sourceRoomId,
        result: "win"
      });
      return;
    }

    const mapData = getMapData(currentRoom);
    const tileId = mapData[newY * MAP_WIDTH + newX];
    const isObstacle = TILE_OBSTACLE[tileId] ?? false;

    if (!isObstacle) {
      let npcBlock = false;
      for (const npc of npcs) {
        if (npc.x === newX && npc.y === newY) {
          npcBlock = true;
          break;
        }
      }

      if (!npcBlock) {
        let enemyHit = false;
        if (currentRoom && !currentRoom.cleared && currentRoom.enemies) {
          const enemyIndex = currentRoom.enemies.findIndex(e => e.x === newX && e.y === newY);
          if (enemyIndex !== -1) {
            enemyHit = true;
            // Remove the enemy
            currentRoom.enemies.splice(enemyIndex, 1);
            // Trigger combat
            events.emit("state:change", "legacy_tactics", { 
              sourceRoomId: this.params?.sourceRoomId,
              returnState: "legacy_rpg",
              legacyType: "legacy_tactics",
              fromLegacyRpg: true
            });
          }
        }

        if (!enemyHit) {
          this.engine.data.data.legacyData.player.x = newX;
          this.engine.data.data.legacyData.player.y = newY;
        }
      }
    }
  }

  private transitionRoom(dx: number, dy: number, playerNewX: number, playerNewY: number) {
    this.transitionState = "fade_out";
    this.pendingTransition = { dx, dy, px: playerNewX, py: playerNewY };
  }

  draw(ctx: CanvasRenderingContext2D) {
    const floor = this.engine.data.data.floor;
    const currentRoom = floor.rooms.find(r => r.x === floor.currentRoomX && r.y === floor.currentRoomY);
    const hasNpcs = currentRoom?.type === "npc" || currentRoom?.type === "start";
    const mapData = getMapData(currentRoom);

    const theme = floor.theme || "forest";

    // 1. DRAW BASE FLOOR (No grid lines - seamless soft watercolor gradient texture)
    const baseGrad = ctx.createLinearGradient(0, 0, 0, 240);
    if (theme === "forest") {
      baseGrad.addColorStop(0, "#2C3E2F"); 
      baseGrad.addColorStop(1, "#1E2B20");
    } else if (theme === "dungeon") {
      baseGrad.addColorStop(0, "#2C3E50"); 
      baseGrad.addColorStop(1, "#1A252F");
    } else if (theme === "snow") {
      baseGrad.addColorStop(0, "#D6EAF8"); 
      baseGrad.addColorStop(1, "#85C1E9");
    } else if (theme === "lava") {
      baseGrad.addColorStop(0, "#641E16"); 
      baseGrad.addColorStop(1, "#17202A");
    }
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, 320, 240);

    // Render floor details & paths organically without grid outlines
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tileId = mapData[y * MAP_WIDTH + x];
        const tx = x * TILE_SIZE;
        const ty = y * TILE_SIZE;

        if (tileId === 2) {
          if (theme === "forest") {
            // Cobblestone path
            ctx.fillStyle = "#4A4E52";
            ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = "#5E6368";
            ctx.fillRect(tx + 2, ty + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            ctx.fillStyle = "#373A3C";
            ctx.fillRect(tx + 3, ty + 10, 8, 2);
          } else if (theme === "dungeon") {
            ctx.fillStyle = "#7F8C8D";
            ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = "#95A5A6";
            ctx.fillRect(tx + 1, ty + 1, TILE_SIZE - 2, TILE_SIZE - 2);
            ctx.fillStyle = "#BDC3C7";
            ctx.fillRect(tx + 3, ty + 3, TILE_SIZE - 6, TILE_SIZE - 6);
          } else if (theme === "snow") {
            ctx.fillStyle = "#EBF5FB";
            ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = "#F8F9F9";
            ctx.fillRect(tx + 2, ty + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          } else if (theme === "lava") {
            ctx.fillStyle = "#1C2833";
            ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = "#273746";
            ctx.fillRect(tx + 2, ty + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            ctx.fillStyle = "#E74C3C";
            ctx.fillRect(tx + 6, ty + 6, 4, 1);
          }
        } else if (tileId === 3) {
          if (theme === "forest" || theme === "snow") {
            ctx.fillStyle = theme === "forest" ? "#204060" : "#A9CCE3";
            ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
            
            ctx.fillStyle = theme === "forest" ? "#336699" : "#D4E6F1";
            const sparkOffset = Math.floor(this.windTime * 4) % 8;
            ctx.fillRect(tx + sparkOffset, ty + 4, 3, 1);
            ctx.fillRect(tx + ((sparkOffset + 4) % 8), ty + 10, 4, 1);
          } else if (theme === "dungeon") {
            ctx.fillStyle = "#5B2C6F";
            ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = "#8E44AD";
            const sparkOffset = Math.floor(this.windTime * 3) % 8;
            ctx.fillRect(tx + sparkOffset, ty + 6, 2, 2);
          } else if (theme === "lava") {
            ctx.fillStyle = "#BA4A00";
            ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = "#F39C12";
            const sparkOffset = Math.floor(this.windTime * 2) % 8;
            ctx.fillRect(tx + sparkOffset, ty + 4, 4, 2);
            ctx.fillRect(tx + ((sparkOffset + 4) % 8), ty + 10, 3, 2);
          }
        }
      }
    }

    // Draw the wooden bridge crossing the stream
    for (let x = 0; x < MAP_WIDTH; x++) {
      const tileIdY10 = mapData[10 * MAP_WIDTH + x];
      if (tileIdY10 === 3 && (x === 9 || x === 10)) {
        const tx = x * TILE_SIZE;
        const ty = 10 * TILE_SIZE;
        // Wooden planks
        ctx.fillStyle = "#8B5A2B";
        ctx.fillRect(tx, ty - 1, TILE_SIZE, TILE_SIZE + 2);
        ctx.fillStyle = "#CD853F";
        ctx.fillRect(tx + 1, ty, TILE_SIZE - 2, TILE_SIZE);
        // Planks separation lines
        ctx.fillStyle = "#5C3815";
        ctx.fillRect(tx + 3, ty, 1, TILE_SIZE);
        ctx.fillRect(tx + 11, ty, 1, TILE_SIZE);
      }
    }

    // 2. DRAW SHADOWS FIRST (HD-2D Style: Translucent black ellipses under trees & sprites)
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tileId = mapData[y * MAP_WIDTH + x];
        const tx = x * TILE_SIZE + 8;
        const ty = y * TILE_SIZE + 14;
        if (tileId === 1) {
          // Tree Shadow
          ctx.beginPath();
          ctx.ellipse(tx, ty + 2, 9, 4, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (tileId === 4) {
          // Lantern Shadow
          ctx.beginPath();
          ctx.ellipse(tx, ty, 6, 3, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // NPC Shadows
    if (hasNpcs) {
      for (const npc of npcs) {
        ctx.beginPath();
        ctx.ellipse(npc.x * TILE_SIZE + 8, npc.y * TILE_SIZE + 15, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Player Shadow
    const px = this.engine.data.data.legacyData.player.x;
    const py = this.engine.data.data.legacyData.player.y;
    ctx.beginPath();
    ctx.ellipse(px * TILE_SIZE + 8, py * TILE_SIZE + 15, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. DRAW ENVIRONMENT & OBJECTS (Layered rendering)
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tileId = mapData[y * MAP_WIDTH + x];
        const tx = x * TILE_SIZE;
        const ty = y * TILE_SIZE;

        if (tileId === 1) {
          if (theme === "forest") {
            // Sakura Tree
            ctx.fillStyle = "#4E3629";
            ctx.fillRect(tx + 6, ty + 8, 4, 8);
            ctx.fillStyle = "#E882A4";
            ctx.beginPath();
            ctx.arc(tx + 8, ty + 4, 8, 0, Math.PI * 2);
            ctx.arc(tx + 4, ty + 1, 6, 0, Math.PI * 2);
            ctx.arc(tx + 12, ty + 2, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#F3A9C3";
            ctx.beginPath();
            ctx.arc(tx + 7, ty + 2, 4, 0, Math.PI * 2);
            ctx.arc(tx + 11, ty, 3, 0, Math.PI * 2);
            ctx.fill();
          } else if (theme === "dungeon") {
            // Stone Pillar
            ctx.fillStyle = "#2C3E50";
            ctx.fillRect(tx + 2, ty, 12, 16);
            ctx.fillStyle = "#34495E";
            ctx.fillRect(tx + 4, ty, 8, 16);
            ctx.fillStyle = "#7F8C8D";
            ctx.fillRect(tx + 2, ty + 14, 12, 2);
          } else if (theme === "snow") {
            // Ice Crystal
            ctx.fillStyle = "#AED6F1";
            ctx.beginPath();
            ctx.moveTo(tx + 8, ty);
            ctx.lineTo(tx + 14, ty + 16);
            ctx.lineTo(tx + 2, ty + 16);
            ctx.fill();
            ctx.fillStyle = "#D6EAF8";
            ctx.beginPath();
            ctx.moveTo(tx + 8, ty + 2);
            ctx.lineTo(tx + 12, ty + 16);
            ctx.lineTo(tx + 4, ty + 16);
            ctx.fill();
          } else if (theme === "lava") {
            // Obsidian Spike
            ctx.fillStyle = "#17202A";
            ctx.beginPath();
            ctx.moveTo(tx + 8, ty + 2);
            ctx.lineTo(tx + 14, ty + 16);
            ctx.lineTo(tx + 2, ty + 16);
            ctx.fill();
            ctx.fillStyle = "#CB4335";
            ctx.fillRect(tx + 7, ty + 8, 2, 4);
          }
        } else if (tileId === 4) {
          // Ancient Stone Lantern
          ctx.fillStyle = "#7F8C8D";
          ctx.fillRect(tx + 5, ty + 6, 6, 10); // pillar
          ctx.fillStyle = "#95A5A6";
          ctx.fillRect(tx + 3, ty + 3, 10, 3); // box base
          ctx.fillStyle = "#34495E";
          ctx.fillRect(tx + 2, ty + 1, 12, 2); // cap
          
          // Flame point inside lantern
          ctx.fillStyle = "#F1C40F";
          ctx.fillRect(tx + 7, ty + 4, 2, 2);
        }
      }
    }

    if (theme === "forest") {
      // Render Torii Gate (Sacred archway over the main shrine path)
      // Placed around x: 10, y: 1 - 2
      ctx.fillStyle = "#C0392B"; // Vibrant vermilion
      // Left Pillar
      ctx.fillRect(9 * TILE_SIZE + 2, 1 * TILE_SIZE, 3, 32);
      // Right Pillar
      ctx.fillRect(11 * TILE_SIZE - 5, 1 * TILE_SIZE, 3, 32);
      // Top Arch Beam
      ctx.fillRect(8 * TILE_SIZE + 4, 1 * TILE_SIZE, 56, 4);
      ctx.fillStyle = "#2C3E50"; // Dark top cap
      ctx.fillRect(8 * TILE_SIZE + 2, 1 * TILE_SIZE - 2, 60, 2);
      // Middle bracing beam
      ctx.fillStyle = "#C0392B";
      ctx.fillRect(9 * TILE_SIZE + 2, 1 * TILE_SIZE + 6, 28, 3);
    }

    if (currentRoom) {
      ctx.fillStyle = "rgba(255, 255, 0, 0.4)"; // Bright highlight for doors
      // Left door
      if (currentRoom.doors.left) {
        ctx.fillRect(0, 7 * TILE_SIZE, 8, TILE_SIZE * 2);
      }
      // Right door
      if (currentRoom.doors.right) {
        ctx.fillRect((MAP_WIDTH - 1) * TILE_SIZE + 8, 7 * TILE_SIZE, 8, TILE_SIZE * 2);
      }
      // Up door
      if (currentRoom.doors.up) {
        ctx.fillRect(9 * TILE_SIZE, 0, TILE_SIZE * 2, 8);
      }
      // Down door
      if (currentRoom.doors.down) {
        ctx.fillRect(9 * TILE_SIZE, (MAP_HEIGHT - 1) * TILE_SIZE + 8, TILE_SIZE * 2, 8);
      }
    }

    // 4. DRAW CHARACTERS WITH MODERN ANIME PORTRAYALS
    // Draw NPCs
    if (hasNpcs) {
      for (const npc of npcs) {
        const nx = npc.x * TILE_SIZE;
        const ny = npc.y * TILE_SIZE;

        // Base outfit / clothes
        ctx.fillStyle = npc.color;
        ctx.fillRect(nx + 3, ny + 5, 10, 11);
        
        // Face / skin
        ctx.fillStyle = "#FFE3D1";
        ctx.fillRect(nx + 4, ny + 1, 8, 5);

        // Hair
        ctx.fillStyle = npc.headColor;
        ctx.fillRect(nx + 3, ny, 10, 2);
        ctx.fillRect(nx + 3, ny + 1, 2, 3);
        ctx.fillRect(nx + 11, ny + 1, 2, 3);

        // Cute accessories (Kaito Ronin glowing scarf or Aoi Miko red hair ribbon)
        if (npc.name.includes("Aoi")) {
          ctx.fillStyle = "#E74C3C"; // Ribbon
          ctx.fillRect(nx + 2, ny, 2, 2);
          ctx.fillRect(nx + 12, ny, 2, 2);
        } else {
          ctx.fillStyle = "#1ABC9C"; // Cyan glowing scarf
          ctx.fillRect(nx + 2, ny + 5, 12, 2);
        }
      }
    }

    // Draw Map Enemies
    if (currentRoom && !currentRoom.cleared && currentRoom.enemies) {
      for (const e of currentRoom.enemies) {
        const ex = e.x * TILE_SIZE;
        const ey = e.y * TILE_SIZE;

        // Enemy Shadow
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.beginPath();
        ctx.ellipse(ex + 8, ey + 15, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Sprite Body (Neon Slime style)
        ctx.fillStyle = currentRoom.type === "boss" ? "#F1C40F" : "#E74C3C";
        ctx.fillRect(ex + 4, ey + 6, 8, 8);
        
        // Face
        ctx.fillStyle = "#111";
        ctx.fillRect(ex + 5, ey + 8, 2, 2);
        ctx.fillRect(ex + 9, ey + 8, 2, 2);
        
        // Hovering intent indicator
        ctx.fillStyle = "#FFF";
        ctx.font = "6px monospace";
        ctx.fillText("!", ex + 6, ey + 2);
      }
    }

    // Draw Player: Red hair kitsune swordsman / elegant heroine
    const renderX = this.pVisX * TILE_SIZE;
    const renderY = this.pVisY * TILE_SIZE;
    const walkFrame = Math.floor(this.pWalkAnim) % 4;
    
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(renderX + 8, renderY + 15, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair base
    ctx.fillStyle = "#8E44AD";
    
    if (this.pDir === "down") {
      // Hair top and sides
      ctx.fillRect(renderX + 3, renderY, 10, 3);
      ctx.fillRect(renderX + 2, renderY + 2, 2, 4);
      ctx.fillRect(renderX + 12, renderY + 2, 2, 4);
      
      // Face
      ctx.fillStyle = "#FFE3D1";
      ctx.fillRect(renderX + 4, renderY + 2, 8, 5);
      
      // Eyes
      ctx.fillStyle = "#00F2FE";
      ctx.fillRect(renderX + 5, renderY + 4, 2, 2);
      ctx.fillRect(renderX + 9, renderY + 4, 2, 2);
    } else if (this.pDir === "up") {
      // Full back hair
      ctx.fillRect(renderX + 3, renderY, 10, 7);
    } else if (this.pDir === "left") {
      ctx.fillRect(renderX + 4, renderY, 8, 3);
      ctx.fillRect(renderX + 8, renderY + 2, 2, 4);
      
      // Face
      ctx.fillStyle = "#FFE3D1";
      ctx.fillRect(renderX + 4, renderY + 2, 6, 5);
      
      // Eye
      ctx.fillStyle = "#00F2FE";
      ctx.fillRect(renderX + 5, renderY + 4, 2, 2);
    } else if (this.pDir === "right") {
      ctx.fillRect(renderX + 4, renderY, 8, 3);
      ctx.fillRect(renderX + 6, renderY + 2, 2, 4);
      
      // Face
      ctx.fillStyle = "#FFE3D1";
      ctx.fillRect(renderX + 6, renderY + 2, 6, 5);
      
      // Eye
      ctx.fillStyle = "#00F2FE";
      ctx.fillRect(renderX + 9, renderY + 4, 2, 2);
    }

    // Cloak
    ctx.fillStyle = "#1A1A1A";
    ctx.fillRect(renderX + 3, renderY + 7, 10, 9);
    
    // Sash
    if (this.pDir === "down" || this.pDir === "left" || this.pDir === "right") {
      ctx.fillStyle = "#F1C40F"; // Gold sash
      ctx.fillRect(renderX + 3, renderY + 9, 10, 2);
    }

    // Legs animation
    ctx.fillStyle = "#111";
    if (walkFrame === 1) {
      ctx.fillRect(renderX + 4, renderY + 16, 3, 2);
      ctx.fillRect(renderX + 9, renderY + 15, 3, 1);
    } else if (walkFrame === 3) {
      ctx.fillRect(renderX + 4, renderY + 15, 3, 1);
      ctx.fillRect(renderX + 9, renderY + 16, 3, 2);
    } else {
      ctx.fillRect(renderX + 4, renderY + 16, 3, 1);
      ctx.fillRect(renderX + 9, renderY + 16, 3, 1);
    }

    // 5. RADIANT HD-2D LIGHTING & BLOOM EFFECTS (Lantern Cones of Glow)
    const lanternPulse = 20 + Math.sin(this.pulseTimer * 4) * 4;
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tileId = mapData[y * MAP_WIDTH + x];
        if (tileId === 4) {
          const lX = x * TILE_SIZE + 8;
          const lY = y * TILE_SIZE + 5;

          // Radial gradient light overlay
          const lightGlow = ctx.createRadialGradient(lX, lY, 2, lX, lY, lanternPulse);
          lightGlow.addColorStop(0, "rgba(254, 211, 48, 0.4)");
          lightGlow.addColorStop(0.3, "rgba(254, 211, 48, 0.15)");
          lightGlow.addColorStop(1, "rgba(254, 211, 48, 0)");

          ctx.fillStyle = lightGlow;
          ctx.beginPath();
          ctx.arc(lX, lY, lanternPulse, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 6. FLOATING PARTICLES (Sakura, Snow, Ash, Embers)
    for (const p of this.particles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      
      if (theme === "forest") {
        ctx.fillStyle = "rgba(243, 169, 195, 0.85)"; // Sakura
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (theme === "dungeon") {
        ctx.fillStyle = "rgba(100, 100, 120, 0.6)"; // Dust/Ash
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (theme === "snow") {
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)"; // Snowflake
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (theme === "lava") {
        ctx.fillStyle = "rgba(231, 76, 60, 0.9)"; // Ember
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    }

    // 7. CINEMATIC CORNER VIGNETTE (Octopath Atmosphere)
    const vigGrad = ctx.createRadialGradient(160, 120, 100, 160, 120, 220);
    vigGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
    vigGrad.addColorStop(1, "rgba(0, 0, 0, 0.65)");
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, 320, 240);

    // 8. ELEGANT GRAPHICAL HUD & OVERLAYS
    ctx.fillStyle = "rgba(10, 15, 20, 0.8)";
    ctx.strokeStyle = "rgba(142, 68, 173, 0.5)";
    ctx.lineWidth = 1;
    ctx.fillRect(4, 4, 156, 18);
    ctx.strokeRect(4, 4, 156, 18);

    ctx.fillStyle = "#FFF";
    ctx.font = "8px monospace";
    ctx.fillText(`LVL ${this.engine.data.data.legacyData.player.level} | EXP ${this.engine.data.data.legacyData.player.exp}/20`, 8, 15);

    // Render Minimap
    ctx.fillStyle = "rgba(10, 15, 20, 0.8)";
    ctx.fillRect(260, 4, 56, 56);
    ctx.strokeStyle = "rgba(142, 68, 173, 0.5)";
    ctx.strokeRect(260, 4, 56, 56);
    
    // Calculate minimap offset
    const mmSize = 8;
    const mmOffsetX = 260 + 28 - currentRoom!.x * mmSize - (mmSize/2);
    const mmOffsetY = 4 + 28 - currentRoom!.y * mmSize - (mmSize/2);

    for (const r of floor.rooms) {
      const rx = mmOffsetX + r.x * mmSize;
      const ry = mmOffsetY + r.y * mmSize;
      
      // Only draw rooms that fit in the minimap viewport
      if (rx > 256 && rx < 316 && ry > 0 && ry < 60) {
        if (r.x === floor.currentRoomX && r.y === floor.currentRoomY) {
          ctx.fillStyle = "#00F2FE"; // Current room
        } else if (r.cleared) {
          ctx.fillStyle = "#7F8C8D"; // Cleared
        } else {
          ctx.fillStyle = "#34495E"; // Unvisited/uncleared
        }
        ctx.fillRect(rx + 1, ry + 1, mmSize - 2, mmSize - 2);

        // Marker for uncleared combat rooms (mobs)
        if (!r.cleared && r.type === "combat") {
          ctx.fillStyle = "#E74C3C"; // Red skull/marker
          ctx.fillRect(rx + 3, ry + 3, 2, 2);
        }

        // Marker for boss
        if (r.type === "boss") {
          ctx.fillStyle = "#F1C40F"; // Gold boss marker
          ctx.fillRect(rx + 2, ry + 2, 4, 4);
        }
      }
    }

    // Prompt bar at bottom
    // Default key hints removed (now in Pause menu)

    // Map Transition overlay
    if (this.transitionAlpha > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${this.transitionAlpha})`;
      ctx.fillRect(0, 0, 320, 240);
    }
  }
}
