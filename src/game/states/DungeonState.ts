import { GameState } from "./GameState";
import { Engine } from "../Engine";
import { Player } from "../entities/Player";
import { Enemy } from "../entities/Enemy";
import { Projectile } from "../entities/Projectile";
import { Pickup } from "../entities/Pickup";
import { WEAPONS } from "../data/weapons";
import { generateFloor, Room } from "../FloorGenerator";
import { events } from "../EventBus";
import { audio } from "../audio/AudioManager";
import { getMapData, isSolid, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from "../MapData";

import { RoomRenderer } from "../render/RoomRenderer";

export class DungeonState extends GameState {
  
  public player!: Player;
  public enemies: Enemy[] = [];
  public projectiles: Projectile[] = [];
  public pickups: Pickup[] = [];
  public currentMapData: number[] = [];
  
  private tileSize = 16;
  private roomRenderer = new RoomRenderer();
  
  private transitionState: "none" | "fade_out" | "fade_in" = "fade_in";
  private transitionAlpha: number = 1;
  private pendingTransition: (() => void) | null = null;
  
  constructor(engine: Engine) {
    super(engine);
  }
  
  enter(params?: any) {
    const savedP = this.engine.data.data.player;
    this.player = new Player(160, 120);
    this.player.hp = savedP.hp;
    this.player.maxHp = savedP.maxHp;
    this.player.armor = savedP.armor;
    this.player.maxArmor = savedP.maxArmor;
    this.player.mana = savedP.mana;
    this.player.maxMana = savedP.maxMana;
    this.player.currentWeaponId = savedP.currentWeaponId;

    this.loadRoom();
    
    if (params && params.fromLegacy) {
       this.pickups.push(new Pickup(160, 140, "weapon", 1, "shotgun"));
       this.pickups.push(new Pickup(140, 120, "mana", 50));
       this.pickups.push(new Pickup(180, 120, "hp", 2));
    }
  }
  
  exit() {
    this.syncPlayerState();
  }

  private syncPlayerState() {
    const savedP = this.engine.data.data.player;
    savedP.hp = this.player.hp;
    savedP.armor = this.player.armor;
    savedP.mana = this.player.mana;
    savedP.currentWeaponId = this.player.currentWeaponId;
  }
  
  private loadRoom() {
    this.projectiles = [];
    this.pickups = [];
    this.enemies = [];

    const floor = this.engine.data.data.floor;
    const currentRoom = floor.rooms.find(r => r.x === floor.currentRoomX && r.y === floor.currentRoomY);
    
    this.currentMapData = getMapData(currentRoom, floor.theme || "forest");

    if (currentRoom && !currentRoom.cleared) {
       if (currentRoom.type === "treasure") {
          this.pickups.push(new Pickup(160, 120, "weapon", 1, "shotgun"));
          currentRoom.cleared = true;
       } else if (currentRoom.enemies) {
         for (const eData of currentRoom.enemies) {
           const type = currentRoom.type === "boss" ? "boss" : (Math.random() > 0.5 ? "melee" : "ranged");
           this.enemies.push(new Enemy(eData.x * 16, eData.y * 16, type));
         }
       }
    }
  }

  update(dt: number) {
    if (this.transitionState === "fade_out") {
      this.transitionAlpha += dt * 4;
      if (this.transitionAlpha >= 1) {
         this.transitionAlpha = 1;
         if (this.pendingTransition) {
            this.pendingTransition();
            this.pendingTransition = null;
         }
         this.transitionState = "fade_in";
      }
      return;
    } else if (this.transitionState === "fade_in") {
      this.transitionAlpha -= dt * 4;
      if (this.transitionAlpha <= 0) {
         this.transitionAlpha = 0;
         this.transitionState = "none";
      }
    }

    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updatePickups(dt);
    this.checkCollisions();
    
    this.roomRenderer.update(dt);
    
    // Check Room clear
    const floor = this.engine.data.data.floor;
    const currentRoom = floor.rooms.find(r => r.x === floor.currentRoomX && r.y === floor.currentRoomY);
    if (currentRoom && !currentRoom.cleared && this.enemies.length === 0) {
      currentRoom.cleared = true;
      audio.playClearRoom();
      if (currentRoom.type === "boss") {
         this.pickups.push(new Pickup(160, 120, "weapon", 1, "laser"));
         this.pickups.push(new Pickup(140, 120, "coin", 50));
      } else {
         this.pickups.push(new Pickup(160, 120, "coin", 10));
      }
    }

    // Handle Game Over & Interactions
    if (this.player.hp <= 0) {
      if (this.engine.input.justPressed["Enter"]) {
        // reset game
        this.engine.data.resetRun();
        this.enter(); 
      }
    } else if (currentRoom && !currentRoom.cleared && (currentRoom.type === "legacy_rpg" || currentRoom.type === "legacy_tactics")) {
      if (this.player.x > 140 && this.player.x < 180 && this.player.y > 100 && this.player.y < 140) {
         if (this.engine.input.justPressed[" "]) {
            this.transitionState = "fade_out";
            this.pendingTransition = () => {
              events.emit("state:change", currentRoom.type);
            };
         }
      }
    } else if (currentRoom && currentRoom.type === "boss" && currentRoom.cleared) {
      // Check next floor
      if (this.player.x > 140 && this.player.x < 180 && this.player.y < 30) {
         if (this.engine.input.justPressed[" "]) {
            this.engine.data.data.floor = generateFloor(floor.depth + 1);
            this.enter(this.engine);
         }
      }
    }
  }
  
  private isCollidingWithMap(x: number, y: number, radius: number): boolean {
    const points = [
      {x: x - radius + 2, y: y},
      {x: x + radius - 2, y: y},
      {x: x, y: y - radius + 2},
      {x: x, y: y + radius - 2}
    ];
    for (const p of points) {
      const tx = Math.floor(p.x / TILE_SIZE);
      const ty = Math.floor(p.y / TILE_SIZE);
      if (tx >= 0 && tx < MAP_WIDTH && ty >= 0 && ty < MAP_HEIGHT) {
         if (isSolid(this.currentMapData[ty * MAP_WIDTH + tx])) return true;
      }
    }
    return false;
  }

  private updatePlayer(dt: number) {
    if (this.player.hp <= 0) return;
    
    const inputAxis = this.engine.input.getAxis();
    const px = this.player.x + inputAxis.x * this.player.speed * dt;
    if (!this.isCollidingWithMap(px, this.player.y, this.player.radius)) {
       this.player.x = px;
    }
    const py = this.player.y + inputAxis.y * this.player.speed * dt;
    if (!this.isCollidingWithMap(this.player.x, py, this.player.radius)) {
       this.player.y = py;
    }
    
    const floor = this.engine.data.data.floor;
    const currentRoom = floor.rooms.find(r => r.x === floor.currentRoomX && r.y === floor.currentRoomY);
    const isLocked = currentRoom && !currentRoom.cleared;

    // Room boundaries & doors
    const minX = 16, maxX = 320 - 16;
    const minY = 16, maxY = 240 - 16;
    const doorW = 32;
    
    if (this.player.x < minX) {
      if (!isLocked && currentRoom?.doors.left && this.player.y > 120 - doorW && this.player.y < 120 + doorW) {
         this.transitionState = "fade_out";
         this.pendingTransition = () => {
           floor.currentRoomX -= 1;
           this.player.x = maxX - 1;
           this.loadRoom();
         };
      } else {
         this.player.x = minX;
      }
    } else if (this.player.x > maxX) {
      if (!isLocked && currentRoom?.doors.right && this.player.y > 120 - doorW && this.player.y < 120 + doorW) {
         this.transitionState = "fade_out";
         this.pendingTransition = () => {
           floor.currentRoomX += 1;
           this.player.x = minX + 1;
           this.loadRoom();
         };
      } else {
         this.player.x = maxX;
      }
    }

    if (this.player.y < minY) {
      if (!isLocked && currentRoom?.doors.up && this.player.x > 160 - doorW && this.player.x < 160 + doorW) {
         this.transitionState = "fade_out";
         this.pendingTransition = () => {
           floor.currentRoomY -= 1;
           this.player.y = maxY - 1;
           this.loadRoom();
         };
      } else {
         this.player.y = minY;
      }
    } else if (this.player.y > maxY) {
      if (!isLocked && currentRoom?.doors.down && this.player.x > 160 - doorW && this.player.x < 160 + doorW) {
         this.transitionState = "fade_out";
         this.pendingTransition = () => {
           floor.currentRoomY += 1;
           this.player.y = minY + 1;
           this.loadRoom();
         };
      } else {
         this.player.y = maxY;
      }
    }
    
    // Firing
    if (this.player.fireCooldown > 0) {
      this.player.fireCooldown -= dt;
    }
    
    if (this.engine.input.isDown(" ") && this.player.fireCooldown <= 0) {
      this.fireWeapon();
    }

    // Switch weapon hack
    if (this.engine.input.justPressed["q"]) {
      // switch logic could be here if multiple weapons owned
    }
  }
  
  private fireWeapon() {
    const weapon = WEAPONS[this.player.currentWeaponId];
    if (this.player.mana < weapon.manaCost) return;
    
    this.player.mana -= weapon.manaCost;
    this.player.fireCooldown = 1 / weapon.fireRate;
    audio.playShoot();
    
    let target = this.getClosestEnemy();
    let dx = 1, dy = 0;
    if (target) {
      const dist = Math.hypot(target.x - this.player.x, target.y - this.player.y);
      if (dist > 0.001) {
         dx = (target.x - this.player.x) / dist;
         dy = (target.y - this.player.y) / dist;
      }
    } else {
      const axis = this.engine.input.getAxis();
      if (axis.x !== 0 || axis.y !== 0) {
        dx = axis.x;
        dy = axis.y;
      }
    }
    
    const baseAngle = Math.atan2(dy, dx);
    
    for (let i = 0; i < weapon.pelletCount; i++) {
      const angle = baseAngle + (Math.random() - 0.5) * weapon.spread;
      const vx = Math.cos(angle) * weapon.bulletSpeed;
      const vy = Math.sin(angle) * weapon.bulletSpeed;
      
      this.projectiles.push(new Projectile(
        this.player.x, this.player.y,
        vx, vy,
        3, weapon.damage, "player", 2.0, weapon.color
      ));
    }
  }
  
  private getClosestEnemy(): Enemy | null {
    let closest = null;
    let minDist = Infinity;
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
      if (d < minDist) {
        minDist = d;
        closest = e;
      }
    }
    return closest;
  }
  
  private updateEnemies(dt: number) {
    if (this.player.hp <= 0) return;
    
    for (const e of this.enemies) {
      const dist = Math.hypot(this.player.x - e.x, this.player.y - e.y);
      
      let nextX = e.x;
      let nextY = e.y;

      if (e.type === "melee" || e.type === "boss") {
        if (dist > 2) {
          nextX += ((this.player.x - e.x) / dist) * e.speed * dt;
          nextY += ((this.player.y - e.y) / dist) * e.speed * dt;
        }
      } else if (e.type === "ranged") {
        if (dist > 100) {
          nextX += ((this.player.x - e.x) / dist) * e.speed * dt;
          nextY += ((this.player.y - e.y) / dist) * e.speed * dt;
        } else if (dist < 80 && dist > 0.001) {
           nextX -= ((this.player.x - e.x) / dist) * e.speed * dt;
           nextY -= ((this.player.y - e.y) / dist) * e.speed * dt;
        }
        
        if (e.shootCooldown > 0) e.shootCooldown -= dt;
        if (e.shootCooldown <= 0) {
          const dx = dist > 0.001 ? (this.player.x - e.x) / dist : 1;
          const dy = dist > 0.001 ? (this.player.y - e.y) / dist : 0;
          this.projectiles.push(new Projectile(
            e.x, e.y,
            dx * 100, dy * 100,
            3, 2, "enemy", 3.0, "#E74C3C"
          ));
          e.shootCooldown = 2.0;
        }
      }
      
      if (!this.isCollidingWithMap(nextX, e.y, e.radius)) e.x = nextX;
      if (!this.isCollidingWithMap(e.x, nextY, e.radius)) e.y = nextY;
      
      if (e.type === "boss") {
         if (e.shootCooldown > 0) e.shootCooldown -= dt;
         if (e.shootCooldown <= 0) {
            for (let i = 0; i < 8; i++) {
               const angle = (Math.PI * 2 / 8) * i;
               this.projectiles.push(new Projectile(
                  e.x, e.y,
                  Math.cos(angle)*60, Math.sin(angle)*60,
                  4, 3, "enemy", 4.0, "#F1C40F"
               ));
            }
            e.shootCooldown = 3.0;
         }
      }
      
      // Keep within bounds
      e.x = Math.max(16, Math.min(320 - 16, e.x));
      e.y = Math.max(16, Math.min(240 - 16, e.y));
    }
  }
  
  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(dt);
      if (p.life <= 0 || p.x < 0 || p.x > 320 || p.y < 0 || p.y > 240 || this.isCollidingWithMap(p.x, p.y, p.radius)) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  private updatePickups(dt: number) {
     for (let i = this.pickups.length - 1; i >= 0; i--) {
        const p = this.pickups[i];
        if (Math.hypot(p.x - this.player.x, p.y - this.player.y) < p.radius + this.player.radius) {
           audio.playPickup();
           if (p.type === "mana") {
              this.player.mana = Math.min(this.player.maxMana, this.player.mana + p.value);
           } else if (p.type === "hp") {
              this.player.hp = Math.min(this.player.maxHp, this.player.hp + p.value);
           } else if (p.type === "weapon" && p.weaponId) {
              this.player.currentWeaponId = p.weaponId;
           } else if (p.type === "coin") {
              this.engine.data.data.player.coins += p.value;
           }
           this.pickups.splice(i, 1);
        }
     }
  }
  
  private checkCollisions() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      let hit = false;
      
      if (p.faction === "player") {
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          if (Math.hypot(p.x - e.x, p.y - e.y) < p.radius + e.radius) {
            audio.playHit();
            e.hp -= p.damage;
            if (e.hp <= 0) {
              // drop chance
              if (Math.random() < 0.3) {
                 this.pickups.push(new Pickup(e.x, e.y, Math.random() < 0.5 ? "mana" : "hp", 10));
              }
              this.enemies.splice(j, 1);
            }
            hit = true;
            break;
          }
        }
      } else if (p.faction === "enemy" && this.player.hp > 0) {
        if (Math.hypot(p.x - this.player.x, p.y - this.player.y) < p.radius + this.player.radius) {
          audio.playHurt();
          if (this.player.armor > 0) {
            this.player.armor -= p.damage;
            if (this.player.armor < 0) {
              this.player.hp += this.player.armor; // Apply overflow to hp
              this.player.armor = 0;
            }
          } else {
             this.player.hp -= p.damage;
          }
          hit = true;
        }
      }
      
      if (hit) {
        this.projectiles.splice(i, 1);
      }
    }
  }
  
  draw(ctx: CanvasRenderingContext2D) {
    const floor = this.engine.data.data.floor;
    const currentRoom = floor.rooms.find(r => r.x === floor.currentRoomX && r.y === floor.currentRoomY);
    
    // Room background
    this.roomRenderer.drawBackground(ctx, currentRoom, floor.theme || "forest");
    this.roomRenderer.drawForeground(ctx, currentRoom, floor.theme || "forest", this.player);

    // Entities
    for (const p of this.pickups) {
       ctx.fillStyle = p.type === "mana" ? "#3498DB" : (p.type === "hp" ? "#2ECC71" : "#F1C40F");
       ctx.beginPath();
       ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
       ctx.fill();
    }

    for (const e of this.enemies) {
      ctx.fillStyle = e.type === "melee" ? "#E74C3C" : (e.type === "boss" ? "#F1C40F" : "#9B59B6");
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // HP bar
      ctx.fillStyle = "#E74C3C";
      ctx.fillRect(e.x - 10, e.y - 12, 20, 2);
      ctx.fillStyle = "#2ECC71";
      ctx.fillRect(e.x - 10, e.y - 12, 20 * (e.hp / e.maxHp), 2);
    }
    
    if (this.player.hp > 0) {
      ctx.fillStyle = "#3498DB";
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    for (const p of this.projectiles) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // HUD
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(5, 5, 140, 45);
    ctx.fillStyle = "#FFF";
    ctx.font = "10px monospace";
    ctx.fillText(`HP: ${Math.max(0, this.player.hp)}/${this.player.maxHp}  AR: ${this.player.armor}/${this.player.maxArmor}`, 10, 15);
    ctx.fillText(`MP: ${this.player.mana}/${this.player.maxMana}  WPN: ${WEAPONS[this.player.currentWeaponId].name}`, 10, 30);
    ctx.fillText(`COINS: ${this.engine.data.data.player.coins}`, 10, 45);
    
    // Minimap
    const mmSize = 6;
    const mmX = 310 - mmSize * 15;
    const mmY = 10;
    for (const r of floor.rooms) {
       ctx.fillStyle = (r.x === floor.currentRoomX && r.y === floor.currentRoomY) ? "#FFF" : (r.cleared ? "#95A5A6" : "#34495E");
       ctx.fillRect(mmX + r.x * mmSize, mmY + r.y * mmSize, mmSize - 1, mmSize - 1);
    }

    if (this.player.hp <= 0) {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, 0, 320, 240);
      ctx.fillStyle = "#E74C3C";
      ctx.font = "20px monospace";
      ctx.textAlign = "center";
      ctx.fillText("YOU DIED", 160, 120);
      ctx.fillStyle = "#FFF";
      ctx.font = "10px monospace";
      ctx.fillText("Press ENTER to restart", 160, 150);
      ctx.textAlign = "left";
    }

    if (currentRoom && !currentRoom.cleared && (currentRoom.type === "legacy_rpg" || currentRoom.type === "legacy_tactics")) {
       ctx.fillStyle = "rgba(142, 68, 173, 0.4)";
       ctx.fillRect(160 - 20, 120 - 20, 40, 40);
       ctx.fillStyle = "#FFD700";
       ctx.font = "8px monospace";
       ctx.textAlign = "center";
       ctx.fillText("Old Memory / Tactical Simulation", 160, 160);
       
       if (this.player.x > 140 && this.player.x < 180 && this.player.y > 100 && this.player.y < 140) {
           ctx.fillText("Press SPACE to enter", 160, 175);
       }
       ctx.textAlign = "left";
    }

    if (this.transitionAlpha > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${this.transitionAlpha})`;
      ctx.fillRect(0, 0, 320, 240);
    }
  }
}
