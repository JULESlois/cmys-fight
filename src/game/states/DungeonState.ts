import { Engine } from "../Engine";
import { generateFloor, Room } from "../FloorGenerator";
import { isCombatCleared, isCombatRoom, markCombatCleared, normalizeRoomState } from "../RoomState";
import { Player } from "../entities/Player";
import { Projectile } from "../entities/Projectile";
import { RoomRenderer } from "../render/RoomRenderer";
import { EntityRenderer } from "../render/EntityRenderer";
import { Enemy } from "../entities/Enemy";
import { TILE_SIZE, getRoomTemplate, getMapData, MAP_WIDTH, MAP_HEIGHT } from "../MapData";
import { UIRenderer } from "../render/UIRenderer";
import { audio } from "../audio/AudioManager";
import { PortalRenderer, PortalState } from "../render/PortalRenderer";
import { MinimapRenderer } from "../render/MinimapRenderer";

import { Pickup } from "../entities/Pickup";
import { PromptRenderer } from "../render/PromptRenderer";
import { EncounterController, EncounterDef } from "../EncounterController";
import { DamageSystem } from "../combat/DamageSystem";
import { WeaponController } from "../combat/WeaponController";
import { segmentCircleHit } from "../combat/Collision";

type RoomPhase = "entering" | "intro" | "locking" | "combat" | "cleared" | "reward" | "exiting" | "exploration";

import { GameState } from "./GameState";
export class DungeonState extends GameState {
  protected engine: Engine;
  private player: Player;
  private projectiles: Projectile[] = [];
  private roomRenderer = new RoomRenderer();
  private enemies: Enemy[] = [];
  private pickups: Pickup[] = [];
  
  private chest: { x: number, y: number, weaponId: string, opened: boolean } | null = null;
  
  private portal?: { x: number, y: number, state: PortalState, timer: number };
  
  private transitionState: "none" | "fade_in" | "fade_out" = "fade_in";
  private transitionAlpha: number = 1.0;
  private pendingTransition: (() => void) | null = null;
  
  private currentMapData: number[] = [];
  
  private roomPhase: RoomPhase = "entering";
  private phaseTimer: number = 0;
  private encounterCtrl = new EncounterController();

  constructor(engine: Engine) {
    super(engine);
    this.player = new Player(160, 120);
  }

  private createPlayerFromSave(): Player {
    const savedP = this.engine.data.data.player;
    const player = new Player(savedP.x ?? 160, savedP.y ?? 120);
    player.characterId = savedP.characterId;
    player.hp = savedP.hp;
    player.maxHp = savedP.maxHp;
    player.armor = savedP.armor ?? 0;
    player.maxArmor = savedP.maxArmor ?? 0;
    player.mana = savedP.mana;
    player.maxMana = savedP.maxMana;
    player.speed = savedP.speed;
    player.setWeaponLoadout(savedP.weaponSlots, savedP.activeWeaponSlot);
    return player;
  }

  enter(params?: any) {
    this.transitionState = "fade_in";
    this.transitionAlpha = 1.0;
    
    this.player = this.createPlayerFromSave();
    
    if (!this.engine.data.data.floor || this.engine.data.data.floor.depth === 0) {
      this.engine.data.data.floor = generateFloor(1);
    }
    
    this.loadRoom();
    
    if (params && params.fromLegacy && params.result !== "loss") {
       const floor = this.engine.data.data.floor;
       const sourceRoom = floor.rooms.find((r: Room) => r.id === params.sourceRoomId);
       if (sourceRoom && !sourceRoom.interactionCompleted) {
          sourceRoom.interactionCompleted = true;
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
    this.prepareForSave();
  }

  prepareForSave() {
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
    savedP.weaponSlots = this.player.weaponSlots[1]
      ? [this.player.weaponSlots[0], this.player.weaponSlots[1]]
      : [this.player.weaponSlots[0]];
    savedP.activeWeaponSlot = this.player.activeWeaponSlot;
    savedP.currentWeaponId = this.player.currentWeaponId;
  }

  private syncRoomState() {
    const floor = this.engine.data.data.floor;
    const r = floor.rooms.find((rm: Room) => rm.x === floor.currentRoomX && rm.y === floor.currentRoomY);
    if (r) {
      normalizeRoomState(r);
      r.pickups = this.pickups.map(p => ({
        x: p.x,
        y: p.y,
        type: p.type,
        value: p.value,
        weaponId: p.weaponId,
        blockedUntilPlayerLeaves: p.blockedUntilPlayerLeaves,
      }));
      if (isCombatRoom(r) && !isCombatCleared(r)) {
        r.enemies = this.enemies.map(e => ({
          x: e.x,
          y: e.y,
          type: e.type,
          hp: e.hp,
          attackState: e.attackState,
          attackCooldown: e.attackCooldown,
          attackTimer: e.attackTimer,
          attackAngle: e.attackAngle,
        }));
        r.encounterState = this.roomPhase === "combat" && this.encounterCtrl.active
          ? this.encounterCtrl.serialize()
          : undefined;
      } else {
        r.enemies = [];
        r.encounterState = undefined;
      }
    }
  }

  private loadRoom() {
    this.projectiles = [];
    this.pickups = [];
    this.enemies = [];
    this.portal = undefined;
    this.chest = null;
    this.encounterCtrl = new EncounterController();
    
    const floor = this.engine.data.data.floor;
    const currentRoom = floor.rooms.find((r: Room) => r.x === floor.currentRoomX && r.y === floor.currentRoomY);

    if (!currentRoom) {
      console.error(`[DungeonState] Missing room at ${floor.currentRoomX},${floor.currentRoomY}`);
      this.currentMapData = getMapData(undefined, floor.theme || "forest");
      this.setPhase("exploration");
      return;
    }

    normalizeRoomState(currentRoom);
    this.currentMapData = getMapData(currentRoom, floor.theme || "forest");
    const template = getRoomTemplate(currentRoom);

    if (currentRoom && currentRoom.pickups) {
      this.pickups = currentRoom.pickups.map((p: any) => {
        const pickup = new Pickup(p.x, p.y, p.type, p.value, p.weaponId);
        pickup.blockedUntilPlayerLeaves = p.blockedUntilPlayerLeaves === true;
        return pickup;
      });
    }

    currentRoom.visited = true;

    if (currentRoom.type === "start" || currentRoom.type === "npc") {
      this.setPhase("exploration");
      return;
    }

    if (currentRoom.type === "treasure") {
      if (!currentRoom.interactionCompleted) {
        const pts = template.pickupSpawnPoints;
        const pt = pts.length > 0 ? pts[0] : { x: 10, y: 7.5 };
        this.chest = { x: pt.x * 16 + 8, y: pt.y * 16 + 8, weaponId: "shotgun", opened: false };
      }
      this.setPhase("exploration");
      return;
    }

    if (currentRoom.type === "legacy_rpg" || currentRoom.type === "legacy_tactics") {
      this.setPhase("exploration");
      return;
    }

    if (isCombatRoom(currentRoom)) {
      if (isCombatCleared(currentRoom)) {
        currentRoom.enemies = [];
        currentRoom.encounterState = undefined;

        if (currentRoom.rewardGenerated !== true) {
          this.setPhase("reward");
          return;
        }

        if (currentRoom.type === "boss" && template.portalSpawnPoint) {
          this.portal = {
            x: template.portalSpawnPoint.x * 16 + 8,
            y: template.portalSpawnPoint.y * 16 + 8,
            state: "idle",
            timer: 0
          };
        }

        this.setPhase("exploration");
        return;
      }

      for (const savedEnemy of currentRoom.enemies) {
        const enemy = new Enemy(savedEnemy.x, savedEnemy.y, savedEnemy.type);
        if (savedEnemy.hp !== undefined) enemy.hp = savedEnemy.hp;
        if (savedEnemy.attackState !== undefined) enemy.attackState = savedEnemy.attackState;
        if (savedEnemy.attackCooldown !== undefined) enemy.attackCooldown = savedEnemy.attackCooldown;
        if (savedEnemy.attackTimer !== undefined) enemy.attackTimer = savedEnemy.attackTimer;
        if (savedEnemy.attackAngle !== undefined) enemy.attackAngle = savedEnemy.attackAngle;
        this.enemies.push(enemy);
      }

      if (currentRoom.encounterState) {
        try {
          this.encounterCtrl.restore(currentRoom.encounterState);
          this.setPhase("combat", { startEncounter: false });
          return;
        } catch (error) {
          console.warn(`[DungeonState] Invalid encounter state in room ${currentRoom.id}; using enemy fallback.`, error);
          currentRoom.encounterState = undefined;
          this.encounterCtrl = new EncounterController();
        }
      }

      if (this.enemies.length > 0) {
        this.setPhase("combat", { startEncounter: false });
      } else {
        this.setPhase("entering");
      }
    }
  }

  private setPhase(phase: RoomPhase, options?: { startEncounter?: boolean }) {
    this.roomPhase = phase;
    this.phaseTimer = 0;
    
    if (phase === "entering") {
      // Setup
    } else if (phase === "intro") {
      this.phaseTimer = 0.8;
    } else if (phase === "locking") {
      this.phaseTimer = 0.5;
    } else if (phase === "combat") {
      if (options?.startEncounter === false) {
         return;
      }
      
      const floor = this.engine.data.data.floor;
      const currentRoom = floor.rooms.find((r: any) => r.x === floor.currentRoomX && r.y === floor.currentRoomY);
      const template = getRoomTemplate(currentRoom);
      
      const encounterDef: EncounterDef = {
        id: currentRoom.encounterId || "default",
        waves: [
          {
            delay: 0.5,
            telegraphTime: 0.6,
            spawns: template.enemySpawnPoints.map((pt: any) => ({
              x: pt.x * 16 + 8,
              y: pt.y * 16 + 8,
              type: currentRoom.type === "boss" ? "boss" : (Math.random() > 0.5 ? "melee" : "ranged")
            }))
          }
        ]
      };
      
      if (currentRoom.type === "combat" && Math.random() > 0.5) {
        // Optional second wave
        encounterDef.waves.push({
           delay: 1.0,
           telegraphTime: 0.6,
           spawns: [
              { x: 160, y: 120, type: "melee" },
              { x: 100, y: 120, type: "ranged" }
           ]
        });
      }
      
      this.encounterCtrl.start(encounterDef);
    } else if (phase === "cleared") {
      this.phaseTimer = 1.0;
      audio.playClearRoom();
      const floor = this.engine.data.data.floor;
      const currentRoom = floor.rooms.find((r: any) => r.x === floor.currentRoomX && r.y === floor.currentRoomY);
      if (currentRoom) {
         markCombatCleared(currentRoom);
         currentRoom.enemies = [];
         currentRoom.encounterState = undefined;
      }
    } else if (phase === "reward") {
      // Spawn rewards
      this.spawnRoomRewards();
      this.phaseTimer = 0.5;
    } else if (phase === "exiting") {
      // Free to move
    }
  }
  
  private spawnRoomRewards() {
    const floor = this.engine.data.data.floor;
    const currentRoom = floor.rooms.find((r: any) => r.x === floor.currentRoomX && r.y === floor.currentRoomY);
    if (!currentRoom || currentRoom.rewardGenerated) return;
    const template = getRoomTemplate(currentRoom);
    
    if (currentRoom.type === "boss") {
       if (template.portalSpawnPoint) {
         this.portal = { x: template.portalSpawnPoint.x * 16 + 8, y: template.portalSpawnPoint.y * 16 + 8, state: "spawning", timer: 0.6 };
       }
       this.pickups.push(new Pickup(160, 120, "hp", 20));
       this.pickups.push(new Pickup(140, 120, "coin", 50));
    } else if (currentRoom.type === "combat") {
       this.pickups.push(new Pickup(160, 120, Math.random() > 0.5 ? "hp" : "mana", 15));
       this.pickups.push(new Pickup(150, 110, "coin", 20));
    } else if (currentRoom.type === "treasure") {
       const pts = template.pickupSpawnPoints;
       const pt = pts.length > 0 ? pts[0] : { x: 10, y: 7.5 };
       this.chest = { x: pt.x * 16 + 8, y: pt.y * 16 + 8, weaponId: "shotgun", opened: false };
    }
    
    // Animate pickups (pop out)
    for (const p of this.pickups) {
      if ((p as any).bounceTimer === undefined) {
          (p as any).bounceTimer = 0.2;
          (p as any).baseY = p.y;
      }
    }
    currentRoom.rewardGenerated = true;
  }

  update(dt: number) {
    this.roomRenderer.update(dt);

    if (this.transitionState === "fade_in") {
      this.transitionAlpha -= dt * 2;
      if (this.transitionAlpha <= 0) {
        this.transitionAlpha = 0;
        this.transitionState = "none";
        if (this.roomPhase === "entering") {
           this.setPhase("intro");
        }
      }
    } else if (this.transitionState === "fade_out") {
      this.transitionAlpha += dt * 2;
      if (this.transitionAlpha >= 1) {
        this.transitionAlpha = 1;
        const cb = this.pendingTransition;
        this.pendingTransition = null;
        if (cb) cb();
        else console.warn("[DungeonState] fade_out finished without pendingTransition");
        this.transitionState = "fade_in";
      }
      return; 
    }

    if (this.engine.input.wasPressed("enter") && this.player.hp <= 0) {
      this.engine.data.restartCurrentRun();
      this.player = this.createPlayerFromSave();
      
      this.player.fireCooldown = 0;
      this.player.muzzleFlash = 0;
      this.player.hitFlash = 0;
      this.player.animState = "idle";
      this.player.animFrame = 0;
      
      this.transitionState = "fade_in";
      this.transitionAlpha = 1;
      this.loadRoom();
      return;
    }

    const previousX = this.player.x;
    const previousY = this.player.y;

    this.updateRoomPhase(dt);
    
    const moved = Math.hypot(this.player.x - previousX, this.player.y - previousY) > 0.01;

    // ==========================================
    // PLAYER UPDATE SEQUENCE (TODO: Move to PlayerController)
    // 1. Update aim angle based on input/closest enemy
    this.player.aimAngle = this.getPlayerAimAngle();
    // 2. Update player facing and animation
    this.updatePlayerFacingAndAnimation(dt, moved);
    
    // 3. Firing logic
    if (this.player.fireCooldown > 0) {
      this.player.fireCooldown -= dt;
    }
    if (this.player.muzzleFlash > 0) {
      this.player.muzzleFlash -= dt * 10;
      if (this.player.muzzleFlash < 0) this.player.muzzleFlash = 0;
    }
    if (this.player.hitFlash > 0) {
      this.player.hitFlash = Math.max(0, this.player.hitFlash - dt);
    }
    DamageSystem.updatePlayer(this.player, dt);

    if (
      this.player.hp > 0 &&
      (this.engine.input.wasPressed("q") || this.engine.input.wasPressed("tab"))
    ) {
      if (WeaponController.switchWeapon(this.player)) {
        this.player.muzzleFlash = 0;
        audio.playPickup();
      }
    }

    // Interactive objects
    const interactTarget = this.getInteractTarget();
    if (this.portal && this.portal.state !== "spawning" && this.portal.state !== "activating") {
       if (interactTarget && interactTarget.type === "portal") {
          this.portal.state = "hovered";
       } else {
          this.portal.state = "idle";
       }
    }

    // 4. Handle Fire input
    if (this.engine.input.isDown(" ") && this.player.fireCooldown <= 0) {
      if (interactTarget) {
         if (this.engine.input.wasPressed(" ")) {
             this.handleInteract(interactTarget);
         }
      } else if (this.roomPhase === "combat" || this.roomPhase === "cleared" || this.roomPhase === "exiting" || this.roomPhase === "reward" || this.roomPhase === "exploration") {
         this.fireWeapon();
      }
    }
    // ==========================================

    // WORLD UPDATE SEQUENCE
    if (this.roomPhase === "combat") {
       this.updateEnemies(dt);
    }
    
    this.updateProjectiles(dt);
    this.updatePickups(dt);
    
    if (this.portal && this.portal.state === "spawning") {
       this.portal.timer -= dt;
       if (this.portal.timer <= 0) {
          this.portal.state = "idle";
       }
    } else if (this.portal && this.portal.state === "activating") {
       this.portal.timer -= dt;
       if (this.portal.timer <= 0) {
          this.transitionState = "fade_out";
          this.transitionAlpha = 0;
          this.pendingTransition = () => {
             this.syncRoomState();
             const nextDepth = this.engine.data.data.floor.depth + 1;
             this.engine.data.data.floor = generateFloor(nextDepth);
             this.player.x = 160;
             this.player.y = 120;
             this.engine.input.clear();
             this.loadRoom();
          };
       }
    }
  }

  private updateRoomPhase(dt: number) {
    // Player movement
    const isLocked = this.roomPhase === "entering" || this.roomPhase === "intro" || this.roomPhase === "locking" || this.portal?.state === "activating";
    
    // In combat or cleared, player moves freely. During intro, move slowly.
    let speedMult = 1.0;
    if (isLocked) speedMult = 0.2;
    if (this.portal?.state === "activating") speedMult = 0;
    
    if (this.player.hp > 0 && this.transitionState === "none") {
       const axis = this.engine.input.getAxis();
       const nextX = this.player.x + axis.x * this.player.speed * speedMult * dt;
       const nextY = this.player.y + axis.y * this.player.speed * speedMult * dt;
       
       if (!this.isCollidingWithMap(nextX, this.player.y, this.player.radius)) this.player.x = nextX;
       if (!this.isCollidingWithMap(this.player.x, nextY, this.player.radius)) this.player.y = nextY;
       
       this.handleDoorTransitions();
    }
    
    if (this.roomPhase === "intro") {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) this.setPhase("locking");
    } else if (this.roomPhase === "locking") {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) this.setPhase("combat");
    } else if (this.roomPhase === "combat") {
      this.encounterCtrl.update(dt, this.enemies, (spawn) => {
         this.enemies.push(new Enemy(spawn.x, spawn.y, spawn.type));
      });
      if (!this.encounterCtrl.active && this.enemies.length === 0) {
         this.setPhase("cleared");
      }
    } else if (this.roomPhase === "cleared") {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) this.setPhase("reward");
    } else if (this.roomPhase === "reward") {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) this.setPhase("exploration");
    }
  }

  private handleDoorTransitions() {
    const floor = this.engine.data.data.floor;
    const currentRoom = floor.rooms.find((r: any) => r.x === floor.currentRoomX && r.y === floor.currentRoomY);
    
    // Bounds check
    const minX = 16, maxX = 320 - 16;
    const minY = 16, maxY = 240 - 16;
    
    const upDoorXMin = 140, upDoorXMax = 180;
    const downDoorXMin = 140, downDoorXMax = 180;
    const leftDoorYMin = 100, leftDoorYMax = 140;
    const rightDoorYMin = 100, rightDoorYMax = 140;
    
    const isLocked = this.roomPhase !== "exploration";

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
  }

  private handleInteract(target: any) {
    if (target.type === "portal" && this.portal) {
       this.portal.state = "activating";
       this.portal.timer = 0.4;
       audio.playPickup();
    } else if (target.type === "legacy_rpg" || target.type === "legacy_tactics") {
       this.engine.input.clear();
       this.engine.switchState(target.type, { sourceRoomId: target.roomId });
    } else if (target.type === "treasure" && this.chest && !this.chest.opened) {
       this.chest.opened = true;
       audio.playPickup();
       const floor = this.engine.data.data.floor;
       const currentRoom = floor.rooms.find((r: any) => r.x === floor.currentRoomX && r.y === floor.currentRoomY);
       if (currentRoom) {
          currentRoom.interactionCompleted = true;
          currentRoom.rewardGenerated = true;
       }
       this.pickups.push(new Pickup(this.chest.x, this.chest.y + 10, "weapon", 1, this.chest.weaponId));
    }
  }

  private getInteractTarget(): { type: string, x: number, y: number, roomId?: string } | null {
    const floor = this.engine.data.data.floor;
    const currentRoom = floor.rooms.find((r: any) => r.x === floor.currentRoomX && r.y === floor.currentRoomY);

    if (currentRoom && (currentRoom.type === "legacy_rpg" || currentRoom.type === "legacy_tactics") && !currentRoom.interactionCompleted) {
      const template = getRoomTemplate(currentRoom);
      const lx = template.legacySpawnPoint ? template.legacySpawnPoint.x * 16 + 8 : 160;
      const ly = template.legacySpawnPoint ? template.legacySpawnPoint.y * 16 + 8 : 120;
      if (Math.abs(this.player.x - lx) < 20 && Math.abs(this.player.y - ly) < 20) {
         return { type: currentRoom.type, x: lx, y: ly, roomId: currentRoom.id };
      }
    }

    if (this.portal && this.portal.state !== "spawning" && this.portal.state !== "activating") {
      const dx = this.player.x - this.portal.x;
      const dy = this.player.y - this.portal.y;
      if (Math.sqrt(dx*dx + dy*dy) < 30) {
         return { type: "portal", x: this.portal.x, y: this.portal.y };
      }
    }
    
    if (this.chest && !this.chest.opened) {
      const dx = this.player.x - this.chest.x;
      const dy = this.player.y - this.chest.y;
      if (Math.sqrt(dx*dx + dy*dy) < 30) {
         return { type: "treasure", x: this.chest.x, y: this.chest.y };
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
        const tileId = this.currentMapData[ty * MAP_WIDTH + tx];
        if (tileId === 1) return true;
      } else {
        return true;
      }
    }
    return false;
  }

  // TODO: Move to PlayerController
  private updatePlayerFacingAndAnimation(dt: number, moved: boolean) {
    this.player.facing = Math.cos(this.player.aimAngle) >= 0 ? "right" : "left";
    this.player.facingLeft = this.player.facing === "left";

    if (moved) {
      this.player.animState = "walk";
      this.player.animTimer += dt;
      this.player.animFrame = Math.floor(this.player.animTimer * 8) % 2;
    } else {
      this.player.animState = "idle";
      this.player.animFrame = 0;
    }
  }

  // TODO: Move to PlayerController
  private fireWeapon() {
    const baseAngle = this.getPlayerAimAngle();
    const result = WeaponController.fire(this.player, baseAngle);
    if (result.fired) {
      this.projectiles.push(...result.projectiles);
      audio.playShoot();
    }
  }

  // TODO: Move to PlayerController
  private getPlayerAimAngle(): number {
    const target = this.getClosestEnemy();
    if (target) {
      return Math.atan2(target.y - this.player.y, target.x - this.player.x);
    }
    const axis = this.engine.input.getAxis();
    if (axis.x !== 0 || axis.y !== 0) {
      return Math.atan2(axis.y, axis.x);
    }
    return this.player.aimAngle;
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
      if (e.hitFlash > 0) {
        e.hitFlash = Math.max(0, e.hitFlash - dt);
        currentSpeed *= 0.5;
      }

      e.attackCooldown = Math.max(0, e.attackCooldown - dt);

      if (e.attackState === "windup") {
        e.attackTimer -= dt;
        if (e.attackTimer <= 0) {
          this.resolveEnemyAttack(e);
        }
        continue;
      }

      if (e.attackState === "recover") {
        e.attackTimer -= dt;
        if (e.attackTimer <= 0) {
          e.attackState = "idle";
          e.attackTimer = 0;
        }
        continue;
      }

      if (e.type === "melee") {
        const attackRange = e.radius + this.player.radius + 8;
        if (dist <= attackRange && e.attackCooldown <= 0) {
          this.beginEnemyAttack(e, 0.32);
          continue;
        }

        if (dist > attackRange - 2) {
          const angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
          nextX += Math.cos(angle) * currentSpeed * dt;
          nextY += Math.sin(angle) * currentSpeed * dt;
        }
      } else if (e.type === "ranged") {
        if (e.attackCooldown <= 0 && dist <= 190) {
          this.beginEnemyAttack(e, 0.5);
          continue;
        }

        if (dist > 112) {
          const angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
          nextX += Math.cos(angle) * currentSpeed * dt;
          nextY += Math.sin(angle) * currentSpeed * dt;
        } else if (dist < 78) {
          const angle = Math.atan2(e.y - this.player.y, e.x - this.player.x);
          nextX += Math.cos(angle) * currentSpeed * dt;
          nextY += Math.sin(angle) * currentSpeed * dt;
        }
      } else if (e.type === "boss") {
        if (e.attackCooldown <= 0) {
          this.beginEnemyAttack(e, 0.65);
          continue;
        }

        if (dist > 60) {
          const angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
          nextX += Math.cos(angle) * currentSpeed * dt;
          nextY += Math.sin(angle) * currentSpeed * dt;
        }
      }
      
      if (!this.isCollidingWithMap(nextX, e.y, e.radius)) e.x = nextX;
      if (!this.isCollidingWithMap(e.x, nextY, e.radius)) e.y = nextY;
      
      e.x = Math.max(16, Math.min(320 - 16, e.x));
      e.y = Math.max(16, Math.min(240 - 16, e.y));
    }

    this.separateEnemies();
  }

  private separateEnemies() {
    for (let i = 0; i < this.enemies.length; i++) {
      for (let j = i + 1; j < this.enemies.length; j++) {
        const a = this.enemies[i];
        const b = this.enemies[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distance = Math.hypot(dx, dy);
        const minDistance = a.radius + b.radius + 2;
        if (distance >= minDistance) continue;

        if (distance < 0.001) {
          const angle = ((a.id * 31 + b.id * 17) % 360) * Math.PI / 180;
          distance = 0.001;
          dx = Math.cos(angle) * distance;
          dy = Math.sin(angle) * distance;
        }

        const nx = dx / distance;
        const ny = dy / distance;
        const overlap = minDistance - distance;
        let aShare = 0.5;
        let bShare = 0.5;
        if (a.type === "boss" && b.type !== "boss") {
          aShare = 0.15;
          bShare = 0.85;
        } else if (b.type === "boss" && a.type !== "boss") {
          aShare = 0.85;
          bShare = 0.15;
        }

        this.moveEnemyBy(a, -nx * overlap * aShare, -ny * overlap * aShare);
        this.moveEnemyBy(b, nx * overlap * bShare, ny * overlap * bShare);
      }
    }
  }

  private moveEnemyBy(enemy: Enemy, dx: number, dy: number) {
    const nextX = Math.max(16, Math.min(320 - 16, enemy.x + dx));
    const nextY = Math.max(16, Math.min(240 - 16, enemy.y + dy));
    if (!this.isCollidingWithMap(nextX, enemy.y, enemy.radius)) enemy.x = nextX;
    if (!this.isCollidingWithMap(enemy.x, nextY, enemy.radius)) enemy.y = nextY;
  }

  private beginEnemyAttack(enemy: Enemy, windup: number) {
    enemy.attackState = "windup";
    enemy.attackTimer = windup;
    enemy.attackAngle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
  }

  private resolveEnemyAttack(enemy: Enemy) {
    if (enemy.type === "melee") {
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const distance = Math.hypot(dx, dy);
      const targetAngle = Math.atan2(dy, dx);
      const angleDelta = Math.atan2(
        Math.sin(targetAngle - enemy.attackAngle),
        Math.cos(targetAngle - enemy.attackAngle)
      );

      if (distance <= enemy.radius + this.player.radius + 11 && Math.abs(angleDelta) <= Math.PI * 0.42) {
        const result = DamageSystem.damagePlayer(this.player, 2);
        if (result.applied) audio.playHurt();
      }
      enemy.attackCooldown = 0.85;
    } else if (enemy.type === "ranged") {
      this.projectiles.push(new Projectile(
        enemy.x,
        enemy.y,
        Math.cos(enemy.attackAngle) * 90,
        Math.sin(enemy.attackAngle) * 90,
        3,
        2,
        "enemy",
        3.0,
        "#E74C3C"
      ));
      enemy.attackCooldown = 1.45;
    } else {
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i;
        this.projectiles.push(new Projectile(
          enemy.x,
          enemy.y,
          Math.cos(angle) * 60,
          Math.sin(angle) * 60,
          4,
          3,
          "enemy",
          4.0,
          "#F1C40F"
        ));
      }
      enemy.attackCooldown = 2.35;
    }

    enemy.attackState = "recover";
    enemy.attackTimer = 0.16;
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(dt);
      const environmentHitT = this.getProjectileEnvironmentHitT(p);
      let entityHit = false;

      if (p.faction === "player") {
        let closestEnemyIndex = -1;
        let closestHitT = Infinity;
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          const hit = segmentCircleHit(
            p.previousX, p.previousY, p.x, p.y,
            e.x, e.y, p.radius + e.radius,
          );
          if (hit && hit.t < closestHitT) {
            closestHitT = hit.t;
            closestEnemyIndex = j;
          }
        }

        if (closestEnemyIndex >= 0 && (environmentHitT === null || closestHitT <= environmentHitT)) {
          const e = this.enemies[closestEnemyIndex];
          p.x = p.previousX + (p.x - p.previousX) * closestHitT;
          p.y = p.previousY + (p.y - p.previousY) * closestHitT;
          const result = DamageSystem.damageEnemy(e, p.damage);
          if (result.applied) {
            this.applyProjectileKnockback(e, p);
            audio.playHit();
          }
          if (result.killed) {
            if (Math.random() < 0.3) {
              this.pickups.push(new Pickup(e.x, e.y, Math.random() < 0.5 ? "mana" : "hp", 10));
            }
            this.enemies.splice(closestEnemyIndex, 1);
          }
          entityHit = true;
        }
      } else if (p.faction === "enemy" && this.player.hp > 0) {
        const hit = segmentCircleHit(
          p.previousX, p.previousY, p.x, p.y,
          this.player.x, this.player.y, p.radius + this.player.radius,
        );
        if (hit && (environmentHitT === null || hit.t <= environmentHitT)) {
          p.x = hit.x;
          p.y = hit.y;
          const result = DamageSystem.damagePlayer(this.player, p.damage);
          if (result.applied) audio.playHurt();
          entityHit = true;
        }
      }

      if (entityHit || environmentHitT !== null || p.life <= 0) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  private applyProjectileKnockback(enemy: Enemy, projectile: Projectile) {
    if (projectile.knockback <= 0 || enemy.type === "boss") return;

    const velocityLength = Math.hypot(projectile.vx, projectile.vy);
    if (velocityLength <= 0) return;

    const pushX = (projectile.vx / velocityLength) * projectile.knockback;
    const pushY = (projectile.vy / velocityLength) * projectile.knockback;
    const nextX = enemy.x + pushX;
    const nextY = enemy.y + pushY;

    if (!this.isCollidingWithMap(nextX, enemy.y, enemy.radius)) {
      enemy.x = Math.max(16, Math.min(304, nextX));
    }
    if (!this.isCollidingWithMap(enemy.x, nextY, enemy.radius)) {
      enemy.y = Math.max(16, Math.min(224, nextY));
    }
  }

  private getProjectileEnvironmentHitT(projectile: Projectile): number | null {
    const dx = projectile.x - projectile.previousX;
    const dy = projectile.y - projectile.previousY;
    const distance = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(distance / 4));

    for (let step = 1; step <= steps; step++) {
      const t = step / steps;
      const x = projectile.previousX + dx * t;
      const y = projectile.previousY + dy * t;
      if (x < 0 || x > 320 || y < 0 || y > 240 || this.isCollidingWithMap(x, y, projectile.radius)) {
        return t;
      }
    }
    return null;
  }

  private updatePickups(dt: number) {
     for (let i = this.pickups.length - 1; i >= 0; i--) {
        const p = this.pickups[i];
        
        if ((p as any).bounceTimer > 0) {
           (p as any).bounceTimer -= dt;
           const jump = Math.sin(((p as any).bounceTimer / 0.2) * Math.PI) * 10;
           p.y = (p as any).baseY - jump;
        }

        const pickupDistance = Math.hypot(p.x - this.player.x, p.y - this.player.y);
        const pickupRange = p.radius + this.player.radius;
        if (p.blockedUntilPlayerLeaves) {
           if (pickupDistance > pickupRange + 6) {
              p.blockedUntilPlayerLeaves = false;
           }
           continue;
        }
        
        if (pickupDistance < pickupRange) {
           let droppedWeapon: Pickup | null = null;
           if (p.type === "mana") {
              this.player.mana = Math.min(this.player.maxMana, this.player.mana + p.value);
           } else if (p.type === "hp") {
              this.player.hp = Math.min(this.player.maxHp, this.player.hp + p.value);
           } else if (p.type === "weapon" && p.weaponId) {
              const result = WeaponController.equipWeapon(this.player, p.weaponId);
              if (!result.consumed) continue;
              if (result.droppedWeaponId) {
                 droppedWeapon = new Pickup(this.player.x, this.player.y, "weapon", 1, result.droppedWeaponId);
                 droppedWeapon.blockedUntilPlayerLeaves = true;
                 (droppedWeapon as any).bounceTimer = 0.2;
                 (droppedWeapon as any).baseY = droppedWeapon.y;
              }
           } else if (p.type === "coin") {
              this.engine.data.data.player.coins += p.value;
           }
           audio.playPickup();
           this.pickups.splice(i, 1);
           if (droppedWeapon) this.pickups.push(droppedWeapon);
        }
     }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const floor = this.engine.data.data.floor;
    const currentRoom = floor.rooms.find((r: any) => r.x === floor.currentRoomX && r.y === floor.currentRoomY);
    
    this.roomRenderer.drawBackground(ctx, currentRoom, floor.theme || "forest");
    const doorLocked = this.roomPhase !== "exploration";
    this.roomRenderer.drawForeground(ctx, currentRoom, floor.theme || "forest", doorLocked);

    const time = Date.now() / 1000;
    
    // Draw telegraphs
    for (const t of this.encounterCtrl.telegraphs) {
       ctx.strokeStyle = "rgba(231, 76, 60, 0.8)";
       ctx.lineWidth = 2;
       ctx.beginPath();
       const rad = t.type === "boss" ? 24 : 12;
       ctx.arc(t.x, t.y, rad, 0, Math.PI * 2);
       ctx.stroke();
       ctx.fillStyle = "rgba(231, 76, 60, 0.2)";
       ctx.fill();
    }

    const aimTarget = this.getClosestEnemy();
    if (this.player.hp > 0 && aimTarget) {
      EntityRenderer.drawTargetMarker(ctx, aimTarget, time);
    }

    if (this.chest) {
       ctx.fillStyle = this.chest.opened ? "#7f8c8d" : "#f1c40f";
       ctx.fillRect(this.chest.x - 8, this.chest.y - 8, 16, 12);
       ctx.fillStyle = "#e67e22";
       ctx.fillRect(this.chest.x - 8, this.chest.y - 8, 16, 4);
    }

    for (const p of this.pickups) {
       EntityRenderer.drawPickup(ctx, p, time);
    }
    
    for (const e of this.enemies) {
       EntityRenderer.drawEnemy(ctx, e, time, floor.theme || 'forest');
    }
    
    if (this.portal) {
      PortalRenderer.drawPortal(ctx, this.portal, time, floor.theme || 'forest');
    }
    
    if (this.player.hp > 0) {
       EntityRenderer.drawPlayer(ctx, this.player, this.engine, floor.theme || 'forest');
    }
    
    for (const p of this.projectiles) {
       EntityRenderer.drawProjectile(ctx, p);
    }
    
    UIRenderer.draw(ctx, this.player, this.engine, floor, this.roomPhase);
    
    if (this.roomPhase === "cleared" && this.phaseTimer > 0) {
      ctx.save();
      const alpha = Math.min(1, this.phaseTimer);
      ctx.fillStyle = `rgba(241, 196, 15, ${alpha})`;
      ctx.font = "bold 24px monospace";
      ctx.textAlign = "center";
      const yOffset = (1.0 - this.phaseTimer) * 10;
      ctx.fillText("ROOM CLEAR", 160, 100 - yOffset);
      ctx.restore();
    }

    if (this.roomPhase === "intro" && currentRoom) {
       ctx.save();
       ctx.fillStyle = "rgba(0,0,0,0.5)";
       ctx.fillRect(0, 90, 320, 30);
       ctx.fillStyle = "#FFF";
       ctx.font = "bold 16px monospace";
       ctx.textAlign = "center";
       ctx.fillText(`${currentRoom.type.toUpperCase()}`, 160, 110);
       ctx.restore();
    }
    
    MinimapRenderer.draw(ctx, floor);
    PromptRenderer.draw(ctx, this.getInteractTarget(), time);
    
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

    if (this.transitionAlpha > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${this.transitionAlpha})`;
      ctx.fillRect(0, 0, 320, 240);
    }
    
    // Debug info overlay
    // @ts-ignore
    if (import.meta.env?.DEV) {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, 150, 60);
      ctx.fillStyle = "#FFF";
      ctx.font = "8px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`Phase: ${this.roomPhase} | Trans: ${this.transitionState}`, 5, 10);
      ctx.fillText(`Enemies: ${this.enemies.length} | Enc: ${this.encounterCtrl.state}`, 5, 20);
      ctx.fillText(`Facing: ${this.player.facing} | Anim: ${this.player.animState}`, 5, 30);
      ctx.fillText(`Aim: ${(this.player.aimAngle * 180 / Math.PI).toFixed(1)}°`, 5, 40);
      ctx.fillText(`Pos: ${Math.round(this.player.x)}, ${Math.round(this.player.y)}`, 5, 50);
      ctx.restore();
    }
  }
}
