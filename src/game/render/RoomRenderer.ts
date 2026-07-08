import { Room } from "../FloorGenerator";
import { Player } from "../entities/Player";
import { getMapData, MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, DOOR_ZONES } from "../MapData";
import { PALETTES } from "../data/palettes";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  spin: number;
}

export class RoomRenderer {
  private particles: Particle[] = [];
  private windTime: number = 0;

  constructor() {
    this.spawnParticles(15);
  }

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

  public update(dt: number) {
    this.windTime += dt;
    for (const p of this.particles) {
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.angle += p.spin * dt * 60;
      if (p.x < -10 || p.y > 250) {
        p.x = 330;
        p.y = -10;
      }
    }
  }

  public drawBackground(ctx: CanvasRenderingContext2D, currentRoom: Room | undefined, theme: string) {
    const mapData = getMapData(currentRoom, theme);

    // 1. DRAW BASE FLOOR
    const p = PALETTES[theme] || PALETTES["forest"];
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, 320, 240);

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tileId = mapData[y * MAP_WIDTH + x];
        const tx = x * TILE_SIZE;
        const ty = y * TILE_SIZE;

        if (tileId === 2) {
          ctx.fillStyle = p.floor;
          ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
          
          // Deterministic pseudo-random noise based on coordinates
          const hash = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453);
          
          ctx.fillStyle = "rgba(0,0,0,0.1)";
          if (hash % 10 > 7) {
             ctx.fillRect(tx + 2, ty + 2, 2, 2);
             ctx.fillRect(tx + 10, ty + 8, 2, 2);
          } else if (hash % 10 > 4) {
             ctx.fillRect(tx + 4, ty + 12, 4, 2);
             ctx.fillRect(tx + 8, ty + 2, 2, 2);
          } else {
             ctx.fillRect(tx + 12, ty + 4, 2, 2);
             ctx.fillRect(tx + 2, ty + 10, 2, 4);
          }
          
          // Theme specific floor details
          if (theme === "dungeon" && hash % 10 > 8) {
              ctx.fillStyle = "rgba(0,0,0,0.2)";
              ctx.fillRect(tx + 4, ty + 4, 8, 1);
              ctx.fillRect(tx + 4, ty + 12, 8, 1);
          }
          
          // Edge line
          ctx.fillStyle = "rgba(0,0,0,0.05)";
          ctx.fillRect(tx, ty + TILE_SIZE - 1, TILE_SIZE, 1);
          ctx.fillRect(tx + TILE_SIZE - 1, ty, 1, TILE_SIZE);
        } else if (tileId === 3) {
          if (theme === "forest" || theme === "snow") {
            ctx.fillStyle = p.hazard1;
            const sparkOffset = Math.floor(this.windTime * 4) % 8;
            ctx.fillRect(tx + sparkOffset, ty + 4, 3, 1);
            ctx.fillRect(tx + ((sparkOffset + 4) % 8), ty + 10, 4, 1);
          } else if (theme === "dungeon") {
            ctx.fillStyle = p.hazard1;
            ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = p.hazard2;
            const sparkOffset = Math.floor(this.windTime * 3) % 8;
            ctx.fillRect(tx + sparkOffset, ty + 6, 2, 2);
          } else if (theme === "lava") {
            ctx.fillStyle = p.hazard1;
            ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = p.hazard2;
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
        ctx.fillStyle = "#8B5A2B";
        ctx.fillRect(tx, ty - 1, TILE_SIZE, TILE_SIZE + 2);
        ctx.fillStyle = "#CD853F";
        ctx.fillRect(tx + 1, ty, TILE_SIZE - 2, TILE_SIZE);
        ctx.fillStyle = "#5C3815";
        ctx.fillRect(tx + 3, ty, 1, TILE_SIZE);
        ctx.fillRect(tx + 11, ty, 1, TILE_SIZE);
      }
    }
  }

  public drawForeground(ctx: CanvasRenderingContext2D, currentRoom: Room | undefined, theme: string, player: Player) {
    const mapData = getMapData(currentRoom, theme);
    const p = PALETTES[theme] || PALETTES["forest"];

    // 2. DRAW SHADOWS
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tileId = mapData[y * MAP_WIDTH + x];
        const tx = x * TILE_SIZE + 8;
        const ty = y * TILE_SIZE + 14;
        if (tileId === 1) {
          ctx.beginPath();
          ctx.ellipse(tx, ty + 2, 9, 4, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (tileId === 4) {
          ctx.beginPath();
          ctx.ellipse(tx, ty, 6, 3, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Player Shadow
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 6, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. DRAW ENVIRONMENT & OBJECTS
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tileId = mapData[y * MAP_WIDTH + x];
        const tx = x * TILE_SIZE;
        const ty = y * TILE_SIZE;

        if (tileId === 1) {
          ctx.fillStyle = p.wall;
          ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
          
          // General wall highlight/shadow
          ctx.fillStyle = "rgba(255,255,255,0.15)";
          ctx.fillRect(tx, ty, TILE_SIZE, 2);
          ctx.fillStyle = "rgba(0,0,0,0.3)";
          ctx.fillRect(tx, ty + TILE_SIZE - 2, TILE_SIZE, 2);
          ctx.fillRect(tx + TILE_SIZE - 2, ty, 2, TILE_SIZE);

          const hash = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453);

          if (theme === "forest") {
            ctx.fillStyle = "#E882A4"; // Leaves
            if (hash % 10 > 5) {
               ctx.fillRect(tx + 2, ty + 2, 6, 6);
               ctx.fillRect(tx + 8, ty + 6, 6, 6);
            } else {
               ctx.fillRect(tx + 4, ty + 4, 8, 8);
            }
          } else if (theme === "dungeon") {
            ctx.fillStyle = "rgba(0,0,0,0.4)";
            // Brick lines
            ctx.fillRect(tx, ty + 7, TILE_SIZE, 2);
            ctx.fillRect(tx + 7, ty, 2, 7);
            ctx.fillRect(tx + 3, ty + 9, 2, 7);
          } else if (theme === "snow") {
            ctx.fillStyle = "#FFF";
            ctx.fillRect(tx, ty, TILE_SIZE, 4);
            if (hash % 10 > 5) {
               ctx.fillRect(tx + 4, ty + 4, 2, 4);
               ctx.fillRect(tx + 10, ty + 4, 2, 2);
            }
          } else if (theme === "lava") {
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            if (hash % 10 > 5) {
               ctx.fillRect(tx + 4, ty, 2, 12);
               ctx.fillRect(tx + 6, ty + 6, 4, 2);
            } else {
               ctx.fillRect(tx + 8, ty, 2, 8);
               ctx.fillStyle = p.hazard1;
               ctx.fillRect(tx + 8, ty + 8, 2, 4);
            }
          }
        } else if (tileId === 4) {
          ctx.fillStyle = "#7F8C8D";
          ctx.fillRect(tx + 5, ty + 6, 6, 10); 
          ctx.fillStyle = "#95A5A6";
          ctx.fillRect(tx + 3, ty + 3, 10, 3); 
          ctx.fillStyle = "#34495E";
          ctx.fillRect(tx + 2, ty + 1, 12, 2); 
          
          ctx.fillStyle = "#F1C40F";
          ctx.fillRect(tx + 7, ty + 4, 2, 2);
        }
      }
    }

    if (theme === "forest") {
      ctx.fillStyle = "#C0392B"; 
      ctx.fillRect(9 * TILE_SIZE + 2, 1 * TILE_SIZE, 3, 32);
      ctx.fillRect(11 * TILE_SIZE - 5, 1 * TILE_SIZE, 3, 32);
      ctx.fillRect(8 * TILE_SIZE + 4, 1 * TILE_SIZE, 56, 4);
      ctx.fillStyle = "#2C3E50"; 
      ctx.fillRect(8 * TILE_SIZE + 2, 1 * TILE_SIZE - 2, 60, 2);
      ctx.fillStyle = "#C0392B";
      ctx.fillRect(9 * TILE_SIZE + 2, 1 * TILE_SIZE + 6, 28, 3);
    }

    if (currentRoom) {
      const isLocked = !currentRoom.cleared;
      
      const drawDoor = (x: number, y: number, w: number, h: number) => {
         const frameColor = isLocked ? "#C0392B" : "#27AE60";
         const innerColor = isLocked ? "rgba(231, 76, 60, 0.2)" : "rgba(46, 204, 113, 0.1)";
         
         ctx.fillStyle = innerColor;
         ctx.fillRect(x, y, w, h);
         
         ctx.fillStyle = frameColor;
         
         if (isLocked) {
             ctx.fillStyle = "rgba(231, 76, 60, 0.8)";
             if (w > h) {
                // Horizontal barrier
                for (let i = x + 4; i < x + w; i += 8) {
                   ctx.fillRect(i, y + 2, 2, h - 4);
                }
             } else {
                // Vertical barrier
                for (let i = y + 4; i < y + h; i += 8) {
                   ctx.fillRect(x + 2, i, w - 4, 2);
                }
             }
             
             // Draw frame on edges
             ctx.fillStyle = frameColor;
             if (w > h) {
                 ctx.fillRect(x, y, w, 2);
                 ctx.fillRect(x, y + h - 2, w, 2);
             } else {
                 ctx.fillRect(x, y, 2, h);
                 ctx.fillRect(x + w - 2, y, 2, h);
             }
         } else {
             // Open door frame details (just sides)
             ctx.fillStyle = frameColor;
             if (w > h) {
                ctx.fillRect(x, y, 4, h);
                ctx.fillRect(x + w - 4, y, 4, h);
             } else {
                ctx.fillRect(x, y, w, 4);
                ctx.fillRect(x, y + h - 4, w, 4);
             }
         }
      };
      
      if (currentRoom.doors.left) drawDoor(0, DOOR_ZONES.left.yMin * TILE_SIZE, 16, (DOOR_ZONES.left.yMax - DOOR_ZONES.left.yMin + 1) * TILE_SIZE);
      if (currentRoom.doors.right) drawDoor((MAP_WIDTH - 1) * TILE_SIZE, DOOR_ZONES.right.yMin * TILE_SIZE, 16, (DOOR_ZONES.right.yMax - DOOR_ZONES.right.yMin + 1) * TILE_SIZE);
      if (currentRoom.doors.up) drawDoor(DOOR_ZONES.up.xMin * TILE_SIZE, 0, (DOOR_ZONES.up.xMax - DOOR_ZONES.up.xMin + 1) * TILE_SIZE, 16);
      if (currentRoom.doors.down) drawDoor(DOOR_ZONES.down.xMin * TILE_SIZE, (MAP_HEIGHT - 1) * TILE_SIZE, (DOOR_ZONES.down.xMax - DOOR_ZONES.down.xMin + 1) * TILE_SIZE, 16);
      

    }

    // Weather Effects
    const lanternPulse = 20 + Math.sin(this.windTime * 4) * 4;
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tileId = mapData[y * MAP_WIDTH + x];
        if (tileId === 4) {
          const lX = x * TILE_SIZE + 8;
          const lY = y * TILE_SIZE + 5;

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

    if (theme === "forest" || theme === "snow" || theme === "lava") {
      for (const p of this.particles) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        
        if (theme === "forest") {
          ctx.fillStyle = "rgba(232, 130, 164, 0.8)";
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (theme === "snow") {
          ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (theme === "lava") {
          ctx.fillStyle = "rgba(243, 156, 18, 0.8)";
          ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
        }
        ctx.restore();
      }
    }
  }
}
