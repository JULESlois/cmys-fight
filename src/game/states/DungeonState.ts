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
import { UIRenderer } from "../render/UIRenderer";
import { MinimapRenderer } from "../render/MinimapRenderer";
import { PromptRenderer } from "../render/PromptRenderer";
import { getMapData, isSolid, isHazard, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, getRoomTemplate, DOOR_ZONES } from "../MapData";

import { RoomRenderer } from "../render/RoomRenderer";
import { PortalRenderer } from "../render/PortalRenderer";
import { EntityRenderer } from "../render/EntityRenderer";

export class DungeonState extends GameState {
  
  public player!: Player;
  public enemies: Enemy[] = [];
  public projectiles: Projectile[] = [];
  public pickups: Pickup[] = [];
  public currentMapData: number[] = [];
  public portal?: {x: number, y: number};
  private portalTime: number = 0;
  
  private tileSize = 16;
  private roomRenderer = new RoomRenderer();
  
  private transitionState: "none" | "fade_out" | "fade_in" = "fade_in";
  private transitionAlpha: number = 1;
  private pendingTransition: (() => void) | null = null;
  private roomClearTimer: number = 0;
  private roomIntroTimer: number = 0;
  
  constructor(engine: Engine) {
    super(engine);
  }
  
  enter(params?: any) {
    const savedP = this.engine.data.data.player;
    if (!(params && params.resume && this.player)) {
      this.player = new Player(params && params.resume ? savedP.x : 160, params && params.resume ? savedP.y : 120);
      this.player.hp = savedP.hp;
      this.player.maxHp = savedP.maxHp;
      this.player.armor = savedP.armor;
      this.player.maxArmor = savedP.maxArmor;
      this.player.mana = savedP.mana;
      this.player.maxMana = savedP.maxMana;
      this.player.currentWeaponId = savedP.currentWeaponId;
      if (savedP.speed) this.player.speed = savedP.speed;
      if (savedP.characterId) this.player.characterId = savedP.characterId;
    }

    if (!(params && params.resume)) {
       this.loadRoom();
    }
    
    if (params && params.fromLegacy && params.result !== "loss") {
       const floor = this.engine.data.data.floor;
       const sourceRoom = floor.rooms.find((r: Room) => r.id === params.sourceRoomId);
       if (sourceRoom && !sourceRoom.cleared) {
          sourceRoom.cleared = true;
          this.roomClearTimer = 2.0;
          audio.playClearRoom();
          if (!this.engine.data.data.legacyData.legacyRewardsClaimed.includes(sourceRoom.id)) {
             this.engine.data.data.legacyData.legacyRewardsClaimed.push(sourceRoom.id);
             const template = getRoomTemplate(sourceRoom);
             const pts = template.pickupSpawnPoints;
             const p1 = pts.length > 0 ? pts[0] : { x: 10, y: 8.5 };
             const p2 = pts.length > 1 ? pts[1] : { x: 8.5, y: 7.5 };
             if (params.legacyType === "legacy_rpg") {
                this.pickups.push(new Pickup(p1.x * 16 + 8, p1.y * 16 + 8, "mana", 50));
                this.pickups.push(new Pickup(p2.x * 16 + 8, p2.y * 16 + 8, "coin", 50));
             } else if (params.legacyType === "legacy_tactics") {
                this.pickups.push(new Pickup(p1.x * 16 + 8, p1.y * 16 + 8, "weapon", 1, "laser"));
                this.pickups.push(new Pickup(p2.x * 16 + 8, p2.y * 16 + 8, "coin", 100));
             }
          }
       }
    }
  }
  
  exit() {
    this.syncPlayerState();
    this.syncRoomState();
  }

  private syncPlayerState() {
    const savedP = this.engine.data.data.player;
    savedP.x = this.player.x;
    savedP.y = this.player.y;
    savedP.hp = this.player.hp;
    savedP.armor = this.player.armor;
    savedP.mana = this.player.mana;
    savedP.currentWeaponId = this.player.currentWeaponId;
  }
  
  private loadRoom() {
    
    this.projectiles = [];
    this.pickups = [];
    this.enemies = [];
    this.roomIntroTimer = 0.5;
    this.portal = undefined;

    const floor = this.engine.data.data.floor;
    const currentRoom = floor.rooms.find((r: any) => r.x === floor.currentRoomX && r.y === floor.currentRoomY);
    
    this.currentMapData = getMapData(currentRoom, floor.theme || "forest");
    const template = getRoomTemplate(currentRoom);

    if (currentRoom && currentRoom.pickups) {
      this.pickups = currentRoom.pickups.map(p => new Pickup(p.x, p.y, p.type, p.value, p.weaponId));
    }

    if (currentRoom && !currentRoom.cleared) {
       if (currentRoom.type === "treasure") {
          if (!currentRoom.pickups || currentRoom.pickups.length === 0) {
             const pts = template.pickupSpawnPoints;
             const pt = pts.length > 0 ? pts[0] : { x: 10, y: 7.5 };
             this.pickups.push(new Pickup(pt.x * 16 + 8, pt.y * 16 + 8, "weapon", 1, "shotgun"));
          }
          currentRoom.cleared = true;
       } else {
         if (currentRoom.enemies && currentRoom.enemies.length > 0) {
            for (const e of currentRoom.enemies) {
               const enemy = new Enemy(e.x, e.y, e.type);
               if (e.hp !== undefined) enemy.hp = e.hp;
               this.enemies.push(enemy);
            }
         } else if (currentRoom.type === "combat" || currentRoom.type === "boss") {
            currentRoom.enemies = [];
            for (const pt of template.enemySpawnPoints) {
               const eType = currentRoom.type === "boss" ? "boss" : (Math.random() > 0.5 ? "melee" : "ranged");
               const enemy = new Enemy(pt.x * 16 + 8, pt.y * 16 + 8, eType);
               this.enemies.push(enemy);
               currentRoom.enemies.push({ x: enemy.x, y: enemy.y, type: enemy.type, hp: enemy.hp });
            }
         }
       }
    }

    // Always check if portal should exist in this room
    if (currentRoom && currentRoom.type === "boss" && currentRoom.cleared) {
       if (template.portalSpawnPoint) {
         this.portal = { x: template.portalSpawnPoint.x * 16 + 8, y: template.portalSpawnPoint.y * 16 + 8 };
       } else {
         this.portal = { x: 160, y: 120 };
       }
    }
  }

  private syncRoomState() {
    const floor = this.engine.data.data.floor;
    const currentRoom = floor.rooms.find((r: any) => r.x === floor.currentRoomX && r.y === floor.currentRoomY);
    if (currentRoom) {
       currentRoom.pickups = this.pickups.map(p => ({ x: p.x, y: p.y, type: p.type, value: p.value, weaponId: p.weaponId }));
       if (!currentRoom.cleared && (currentRoom.type === "combat" || currentRoom.type === "boss")) {
          currentRoom.enemies = this.enemies.map(e => ({ x: e.x, y: e.y, type: e.type, hp: e.hp }));
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

    if (this.roomIntroTimer > 0) {
      this.roomIntroTimer -= dt;
      this.updatePlayer(dt);
      this.updatePickups(dt);
    } else {
      this.updatePlayer(dt);
      this.updateEnemies(dt);
      this.updateProjectiles(dt);
      this.updatePickups(dt);
      this.checkCollisions();
    }
    
    this.roomRenderer.update(dt);
    if (this.portal) {
       this.portalTime += dt;
    }
    
    // Update aim angle based on movement or target
    this.player.aimAngle = this.getPlayerAimAngle();
    const aimTarget = this.getClosestEnemy();
    
    // Update player facing and animation state
    const axis = this.engine.input.getAxis();
    if (axis.x !== 0 || axis.y !== 0) {
       this.player.animState = "walk";
       this.player.animTimer += dt;
       this.player.animFrame = Math.floor(this.player.animTimer * 8) % 2;
       
       if (Math.abs(axis.x) > Math.abs(axis.y)) {
           this.player.facing = axis.x > 0 ? "right" : "left";
       } else {
           this.player.facing = axis.y > 0 ? "down" : "up";
       }
       this.player.facingLeft = this.player.facing === "left";
    } else {
       this.player.animState = "idle";
       this.player.animFrame = 0;
       // Auto face target if not moving
       if (aimTarget) {
          const cosA = Math.cos(this.player.aimAngle);
          const sinA = Math.sin(this.player.aimAngle);
          if (Math.abs(cosA) > Math.abs(sinA)) {
              this.player.facing = cosA > 0 ? "right" : "left";
          } else {
              this.player.facing = sinA > 0 ? "down" : "up";
          }
          this.player.facingLeft = this.player.facing === "left";
       }
    }

    if (this.player.muzzleFlash > 0) this.player.muzzleFlash = Math.max(0, this.player.muzzleFlash - dt * 5);
    if (this.player.hitFlash > 0) this.player.hitFlash -= dt;
    for (const e of this.enemies) {
       if (e.hitFlash > 0) e.hitFlash -= dt;
    }
    if (this.roomClearTimer > 0) {
      this.roomClearTimer -= dt;
    }
    
    // Check Room clear
    const floor = this.engine.data.data.floor;
    const currentRoom = floor.rooms.find(r => r.x === floor.currentRoomX && r.y === floor.currentRoomY);
    if (currentRoom && !currentRoom.cleared && this.enemies.length === 0) {
      if (currentRoom.type !== "legacy_rpg" && currentRoom.type !== "legacy_tactics" && currentRoom.type !== "npc") {
        currentRoom.cleared = true;
        this.roomClearTimer = 2.0;
        audio.playClearRoom();
        const template = getRoomTemplate(currentRoom);
        if (currentRoom.type === "boss") {
           const pts = template.pickupSpawnPoints;
           const p1 = pts.length > 0 ? pts[0] : { x: 10, y: 7.5 };
           const p2 = pts.length > 1 ? pts[1] : { x: 8, y: 7.5 };
           this.pickups.push(new Pickup(p1.x * 16 + 8, p1.y * 16 + 8, "weapon", 1, "laser"));
           this.pickups.push(new Pickup(p2.x * 16 + 8, p2.y * 16 + 8, "coin", 50));
           if (template.portalSpawnPoint) {
             this.portal = { x: template.portalSpawnPoint.x * 16 + 8, y: template.portalSpawnPoint.y * 16 + 8 };
           } else {
             this.portal = { x: 160, y: 120 };
           }
        } else {
           const pts = template.pickupSpawnPoints;
           const p1 = pts.length > 0 ? pts[0] : { x: 10, y: 7.5 };
           this.pickups.push(new Pickup(p1.x * 16 + 8, p1.y * 16 + 8, "coin", 10));
        }
      }
    }

    // Handle Game Over & Interactions
    if (this.player.hp <= 0) {
      if (this.engine.input.justPressed["enter"] || this.engine.input.justPressed["Enter"] || this.engine.input.justPressed["escape"]) {
        this.engine.switchState("title");
      }
    } else {
      const target = this.getInteractTarget();
      if (target && this.engine.input.justPressed[" "]) {
         if (target.type === "legacy_rpg" || target.type === "legacy_tactics") {
            this.transitionState = "fade_out";
            this.pendingTransition = () => {
              this.syncRoomState();
              events.emit("state:change", target.type, {
                returnState: "dungeon",
                sourceRoomId: currentRoom.id,
                legacyType: target.type
              });
            };
         } else if (target.type === "portal") {
            this.transitionState = "fade_out";
            this.pendingTransition = () => {
              this.syncRoomState();
              this.engine.data.data.floor = generateFloor(floor.depth + 1);
              this.player.x = 160;
              this.player.y = 120;
              this.loadRoom();
            };
         }
      }
    }
  }
  
    private getInteractTarget(): { type: string, x: number, y: number } | null {
    const floor = this.engine.data.data.floor;
    const currentRoom = floor.rooms.find((r: any) => r.x === floor.currentRoomX && r.y === floor.currentRoomY);

    if (currentRoom && !currentRoom.cleared && (currentRoom.type === "legacy_rpg" || currentRoom.type === "legacy_tactics")) {
      const template = getRoomTemplate(currentRoom);
      const lx = template.legacySpawnPoint ? template.legacySpawnPoint.x * 16 + 8 : 160;
      const ly = template.legacySpawnPoint ? template.legacySpawnPoint.y * 16 + 8 : 120;
      if (Math.abs(this.player.x - lx) < 20 && Math.abs(this.player.y - ly) < 20) {
         return { type: currentRoom.type, x: lx, y: ly };
      }
    }

    if (this.portal) {
      const dx = this.player.x - this.portal.x;
      const dy = this.player.y - this.portal.y;
      if (Math.sqrt(dx*dx + dy*dy) < 30) {
         return { type: "portal", x: this.portal.x, y: this.portal.y };
      }
    }

    return null;
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
    
    // Check if player is on hazard
    const cx = Math.floor(this.player.x / TILE_SIZE);
    const cy = Math.floor(this.player.y / TILE_SIZE);
    let currentSpeed = this.player.speed;
    if (cx >= 0 && cx < MAP_WIDTH && cy >= 0 && cy < MAP_HEIGHT) {
      if (isHazard(this.currentMapData[cy * MAP_WIDTH + cx])) {
        currentSpeed *= 0.5;
      }
    }

    const px = this.player.x + inputAxis.x * currentSpeed * dt;
    if (!this.isCollidingWithMap(px, this.player.y, this.player.radius)) {
       this.player.x = px;
    }
    const py = this.player.y + inputAxis.y * currentSpeed * dt;
    if (!this.isCollidingWithMap(this.player.x, py, this.player.radius)) {
       this.player.y = py;
    }
    
    const floor = this.engine.data.data.floor;
    const currentRoom = floor.rooms.find(r => r.x === floor.currentRoomX && r.y === floor.currentRoomY);
    const isLocked = currentRoom && !currentRoom.cleared;

    // Room boundaries & doors
    const minX = 16, maxX = 320 - 16;
    const minY = 16, maxY = 240 - 16;
    
    // TILE_SIZE = 16
    const leftDoorYMin = DOOR_ZONES.left.yMin * 16;
    const leftDoorYMax = (DOOR_ZONES.left.yMax + 1) * 16;
    const rightDoorYMin = DOOR_ZONES.right.yMin * 16;
    const rightDoorYMax = (DOOR_ZONES.right.yMax + 1) * 16;
    const upDoorXMin = DOOR_ZONES.up.xMin * 16;
    const upDoorXMax = (DOOR_ZONES.up.xMax + 1) * 16;
    const downDoorXMin = DOOR_ZONES.down.xMin * 16;
    const downDoorXMax = (DOOR_ZONES.down.xMax + 1) * 16;
    
    if (this.player.x < minX) {
      if (!isLocked && currentRoom?.doors.left && this.player.y > leftDoorYMin && this.player.y < leftDoorYMax) {
         this.transitionState = "fade_out";
         this.pendingTransition = () => {
           this.syncRoomState();
           floor.currentRoomX -= 1;
           this.player.x = maxX - 1;
           this.loadRoom();
         };
      } else {
         this.player.x = minX;
      }
    } else if (this.player.x > maxX) {
      if (!isLocked && currentRoom?.doors.right && this.player.y > rightDoorYMin && this.player.y < rightDoorYMax) {
         this.transitionState = "fade_out";
         this.pendingTransition = () => {
           this.syncRoomState();
           floor.currentRoomX += 1;
           this.player.x = minX + 1;
           this.loadRoom();
         };
      } else {
         this.player.x = maxX;
      }
    }

    if (this.player.y < minY) {
      if (!isLocked && currentRoom?.doors.up && this.player.x > upDoorXMin && this.player.x < upDoorXMax) {
         this.transitionState = "fade_out";
         this.pendingTransition = () => {
           this.syncRoomState();
           floor.currentRoomY -= 1;
           this.player.y = maxY - 1;
           this.loadRoom();
         };
      } else {
         this.player.y = minY;
      }
    } else if (this.player.y > maxY) {
      if (!isLocked && currentRoom?.doors.down && this.player.x > downDoorXMin && this.player.x < downDoorXMax) {
         this.transitionState = "fade_out";
         this.pendingTransition = () => {
           this.syncRoomState();
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
    
    const isInteracting = this.getInteractTarget() !== null;
    if (this.engine.input.isDown(" ") && this.player.fireCooldown <= 0 && !isInteracting) {
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
    this.player.muzzleFlash = 1.0;
    audio.playShoot();
    
    const baseAngle = this.getPlayerAimAngle();
    this.player.aimAngle = baseAngle;
    this.player.facingLeft = Math.cos(baseAngle) < 0;
    
    const muzzle = this.player.getPlayerMuzzlePosition(baseAngle);
    
    for (let i = 0; i < weapon.pelletCount; i++) {
      const angle = baseAngle + (Math.random() - 0.5) * weapon.spread;
      const vx = Math.cos(angle) * weapon.bulletSpeed;
      const vy = Math.sin(angle) * weapon.bulletSpeed;
      
      this.projectiles.push(new Projectile(
        muzzle.x, muzzle.y,
        vx, vy,
        3, weapon.damage, "player", 2.0, weapon.color
      ));
    }
  }
  
  private getPlayerAimAngle(): number {
    const aimTarget = this.getClosestEnemy();
    if (aimTarget) {
      return Math.atan2(aimTarget.y - this.player.y, aimTarget.x - this.player.x);
    } else {
      const axis = this.engine.input.getAxis();
      if (axis.x !== 0 || axis.y !== 0) {
        return Math.atan2(axis.y, axis.x);
      } else {
        if (this.player.facing === "left") return Math.PI;
        if (this.player.facing === "right") return 0;
        if (this.player.facing === "up") return -Math.PI / 2;
        if (this.player.facing === "down") return Math.PI / 2;
        return this.player.facingLeft ? Math.PI : 0;
      }
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
      
      let currentSpeed = e.speed;
      const cx = Math.floor(e.x / TILE_SIZE);
      const cy = Math.floor(e.y / TILE_SIZE);
      if (cx >= 0 && cx < MAP_WIDTH && cy >= 0 && cy < MAP_HEIGHT) {
        if (isHazard(this.currentMapData[cy * MAP_WIDTH + cx])) {
          currentSpeed *= 0.5;
        }
      }

      if (e.type === "melee" || e.type === "boss") {
        if (dist > 2) {
          nextX += ((this.player.x - e.x) / dist) * currentSpeed * dt;
          nextY += ((this.player.y - e.y) / dist) * currentSpeed * dt;
        }
      } else if (e.type === "ranged") {
        if (dist > 100) {
          nextX += ((this.player.x - e.x) / dist) * currentSpeed * dt;
          nextY += ((this.player.y - e.y) / dist) * currentSpeed * dt;
        } else if (dist < 80 && dist > 0.001) {
           nextX -= ((this.player.x - e.x) / dist) * currentSpeed * dt;
           nextY -= ((this.player.y - e.y) / dist) * currentSpeed * dt;
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
               e.hitFlash = 0.1;
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
               this.player.hitFlash = 0.2;
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
    const time = Date.now() / 1000;
    for (const p of this.pickups) {
       EntityRenderer.drawPickup(ctx, p, time);
    }

    for (const e of this.enemies) {
       EntityRenderer.drawEnemy(ctx, e, time, floor.theme || 'forest');
    }
    
    if (this.portal) {
      PortalRenderer.drawPortal(ctx, this.portal, this.portalTime, floor.theme || 'forest');
      const interact = this.getInteractTarget();

    }
    
    if (this.player.hp > 0) {
       EntityRenderer.drawPlayer(ctx, this.player, this.engine, floor.theme || 'forest');
    }
    
    for (const p of this.projectiles) {
       EntityRenderer.drawProjectile(ctx, p);
    }
    
    // UI
    UIRenderer.draw(ctx, this.player, this.engine, floor);
    
    if (this.roomClearTimer > 0) {
      ctx.save();
      const alpha = Math.min(1, this.roomClearTimer);
      ctx.fillStyle = `rgba(241, 196, 15, ${alpha})`;
      ctx.font = "bold 24px monospace";
      ctx.textAlign = "center";
      // Slightly float up
      const yOffset = (2.0 - this.roomClearTimer) * 10;
      ctx.fillText("ROOM CLEAR", 160, 100 - yOffset);
      ctx.restore();
    }
    
    // Minimap
    MinimapRenderer.draw(ctx, floor);
    
    // Prompt
    PromptRenderer.draw(ctx, this.getInteractTarget(), time);

    if (this.roomIntroTimer > 0 && this.transitionState === "none") {
       ctx.fillStyle = "rgba(0,0,0,0.5)";
       ctx.fillRect(0, 80, 320, 40);
       ctx.fillStyle = "#FFF";
       ctx.font = "bold 16px monospace";
       ctx.textAlign = "center";
       ctx.fillText("READY", 160, 105);
       ctx.textAlign = "left";
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
       const time = Date.now() / 1000;
       ctx.save();
       const template = getRoomTemplate(currentRoom);
       const lx = template.legacySpawnPoint ? template.legacySpawnPoint.x * 16 + 8 : 160;
       const ly = template.legacySpawnPoint ? template.legacySpawnPoint.y * 16 + 8 : 120;
       ctx.translate(lx, ly);

       if (currentRoom.type === "legacy_rpg") {
         // CRT terminal / old memory device
         const pulse = Math.abs(Math.sin(time * 2));
         ctx.fillStyle = `rgba(39, 174, 96, ${0.3 + pulse * 0.2})`; // Greenish CRT glow
         ctx.fillRect(-20, -20, 40, 40);
         
         ctx.fillStyle = "#2C3E50"; // Terminal body
         ctx.fillRect(-15, -15, 30, 25);
         ctx.fillStyle = "#27AE60"; // Screen
         ctx.fillRect(-13, -13, 26, 18);
         // Text lines on screen
         ctx.fillStyle = `rgba(46, 204, 113, ${Math.random() > 0.1 ? 1 : 0.5})`;
         ctx.fillRect(-10, -10, 15, 2);
         ctx.fillRect(-10, -6, 20, 2);
         ctx.fillRect(-10, -2, 10, 2);

         ctx.fillStyle = "#2ECC71";
         ctx.font = "8px monospace";
         ctx.textAlign = "center";
         ctx.fillText("Old Memory Terminal", 0, 30);

       } else if (currentRoom.type === "legacy_tactics") {
         // Tactics simulator array / 5x5 projection
         ctx.fillStyle = `rgba(41, 128, 185, 0.4)`; // Blue projection
         ctx.fillRect(-25, -25, 50, 50);

         // Grid
         ctx.strokeStyle = `rgba(52, 152, 219, ${0.5 + Math.sin(time * 3) * 0.5})`;
         ctx.lineWidth = 1;
         ctx.beginPath();
         for(let i = 0; i <= 5; i++) {
            ctx.moveTo(-20 + i * 8, -20);
            ctx.lineTo(-20 + i * 8, 20);
            ctx.moveTo(-20, -20 + i * 8);
            ctx.lineTo(20, -20 + i * 8);
         }
         ctx.stroke();
         
         // Blinking units
         if (Math.floor(time * 4) % 2 === 0) {
            ctx.fillStyle = "#E74C3C";
            ctx.fillRect(-12, -12, 8, 8);
            ctx.fillStyle = "#F1C40F";
            ctx.fillRect(4, 4, 8, 8);
         }

         ctx.fillStyle = "#3498DB";
         ctx.font = "8px monospace";
         ctx.textAlign = "center";
         ctx.fillText("Tactical Simulation", 0, 35);
       }
       
      if (Math.abs(this.player.x - lx) < 20 && Math.abs(this.player.y - ly) < 20) {
           ctx.fillStyle = "#FFF";
           ctx.fillText("Press SPACE to enter", 0, 48);
       }
       ctx.restore();
    }

    if (this.transitionAlpha > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${this.transitionAlpha})`;
      ctx.fillRect(0, 0, 320, 240);
    }
  }
}
