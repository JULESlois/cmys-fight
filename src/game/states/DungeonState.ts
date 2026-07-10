import { Engine } from "../Engine";
import { generateStage, Room } from "../FloorGenerator";
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
import { EncounterController } from "../EncounterController";
import { EncounterFactory } from "../EncounterFactory";
import { DamageSystem } from "../combat/DamageSystem";
import { WeaponController } from "../combat/WeaponController";
import { segmentCircleHit } from "../combat/Collision";
import { LightningArc, SkillController } from "../combat/SkillController";
import { getStageDifficulty } from "../combat/StageDifficulty";
import { BuffSystem, type BuffId } from "../combat/BuffSystem";
import { hashSeed } from "../Random";
import { BuffSelectionRenderer } from "../render/BuffSelectionRenderer";
import { ShopSystem, type ShopPurchaseFailure } from "../shop/ShopSystem";
import { ShopRenderer } from "../render/ShopRenderer";
import { StatusEffectSystem } from "../combat/StatusEffectSystem";
import {
  EnvironmentSystem,
  type EnvironmentHazard,
} from "../environment/EnvironmentSystem";
import { isFinalStage } from "../RunProgress";
import type { RunOutcome } from "../RunStats";
import { TutorialSystem } from "../TutorialSystem";

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
  private lightningArcs: LightningArc[] = [];
  private buffSelection: BuffId[] | null = null;
  private buffSelectionIndex = 0;
  private shopOpen: boolean = false;
  private shopSelectionIndex = 0;
  private shopFailure?: ShopPurchaseFailure;
  private shopFailureTimer: number = 0;
  private environmentHazards: EnvironmentHazard[] = [];
  private environmentTime: number = 0;
  private tutorial = new TutorialSystem();

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
    player.skillCooldown = savedP.skillCooldown ?? 0;
    player.skillActiveTimer = savedP.skillActiveTimer ?? 0;
    player.skillDirectionX = savedP.skillDirectionX ?? 0;
    player.skillDirectionY = savedP.skillDirectionY ?? 0;
    player.rogueCritTimer = savedP.rogueCritTimer ?? 0;
    player.knightGuardReady = savedP.knightGuardReady ?? player.characterId === "knight";
    player.buffs = BuffSystem.normalizeBuffs(savedP.buffs);
    player.emergencyBarrierReady = savedP.emergencyBarrierReady === true;
    player.statusEffects = StatusEffectSystem.normalize(savedP.statusEffects);
    player.buffRerollsRemaining = savedP.buffRerollsRemaining ?? 0;
    player.shopDiscount = savedP.shopDiscount ?? 0;
    player.supplyDropBonus = savedP.supplyDropBonus ?? 0;
    BuffSystem.applyRuntimeStats(player);
    return player;
  }

  enter(params?: any) {
    this.transitionState = "fade_in";
    this.transitionAlpha = 1.0;
    
    this.player = this.createPlayerFromSave();
    this.tutorial.reset(this.engine.data.settings.tutorialCompleted);
    
    if (!this.engine.data.data.floor || this.engine.data.data.floor.depth === 0) {
      this.engine.data.data.floor = generateStage(this.engine.data.data.run);
    }
    
    this.loadRoom();
    
    if (params && params.fromLegacy && params.result !== "loss") {
       const floor = this.engine.data.data.floor;
       const sourceRoom = floor.rooms.find((r: Room) => r.id === params.sourceRoomId);
       if (sourceRoom && !sourceRoom.interactionCompleted) {
          sourceRoom.interactionCompleted = true;
          audio.playClearRoom();
          const template = getRoomTemplate(sourceRoom);
          const pts = template.pickupSpawnPoints;
          const p1 = pts.length > 0 ? pts[0] : { x: 10, y: 8.5 };
          const p2 = pts.length > 1 ? pts[1] : { x: 8.5, y: 7.5 };
          if (params.legacyType === "legacy_rpg") {
             this.pickups.push(new Pickup(p1.x * 16 + 8, p1.y * 16 + 8, "mana", 50));
             this.pickups.push(new Pickup(p2.x * 16 + 8, p2.y * 16 + 8, "coin", 50));
          } else if (params.legacyType === "legacy_tactics") {
             this.pickups.push(new Pickup(p1.x * 16 + 8, p1.y * 16 + 8, "weapon", 1, "laser"));
             this.engine.data.discoverWeapon("laser");
             this.pickups.push(new Pickup(p2.x * 16 + 8, p2.y * 16 + 8, "coin", 100));
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
    savedP.maxHp = this.player.maxHp;
    savedP.armor = this.player.armor;
    savedP.maxArmor = this.player.maxArmor;
    savedP.mana = this.player.mana;
    savedP.maxMana = this.player.maxMana;
    savedP.weaponSlots = this.player.weaponSlots[1]
      ? [this.player.weaponSlots[0], this.player.weaponSlots[1]]
      : [this.player.weaponSlots[0]];
    savedP.activeWeaponSlot = this.player.activeWeaponSlot;
    savedP.currentWeaponId = this.player.currentWeaponId;
    savedP.skillCooldown = this.player.skillCooldown;
    savedP.skillActiveTimer = this.player.skillActiveTimer;
    savedP.skillDirectionX = this.player.skillDirectionX;
    savedP.skillDirectionY = this.player.skillDirectionY;
    savedP.rogueCritTimer = this.player.rogueCritTimer;
    savedP.knightGuardReady = this.player.knightGuardReady;
    savedP.buffs = [...this.player.buffs];
    savedP.emergencyBarrierReady = this.player.emergencyBarrierReady;
    savedP.statusEffects = StatusEffectSystem.normalize(this.player.statusEffects);
    savedP.buffRerollsRemaining = this.player.buffRerollsRemaining;
    savedP.shopDiscount = this.player.shopDiscount;
    savedP.supplyDropBonus = this.player.supplyDropBonus;
    this.engine.data.discoverPlayerBuild();
  }

  private addEnemy(enemy: Enemy) {
    this.enemies.push(enemy);
    this.engine.data.discoverEnemy(enemy.enemyId);
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
          enemyId: e.enemyId,
          isElite: e.isElite,
          hp: e.hp,
          attackState: e.attackState,
          attackCooldown: e.attackCooldown,
          attackTimer: e.attackTimer,
          attackAngle: e.attackAngle,
          attackTargetX: e.attackTargetX,
          attackTargetY: e.attackTargetY,
          bossPhase: e.bossPhase,
          attackSequence: e.attackSequence,
          statusEffects: StatusEffectSystem.normalize(e.statusEffects),
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
    this.lightningArcs = [];
    this.portal = undefined;
    this.chest = null;
    this.shopOpen = false;
    this.shopFailure = undefined;
    this.shopFailureTimer = 0;
    this.environmentHazards = [];
    this.environmentTime = 0;
    this.encounterCtrl = new EncounterController();
    
    const floor = this.engine.data.data.floor;
    const currentRoom = floor.rooms.find((r: Room) => r.x === floor.currentRoomX && r.y === floor.currentRoomY);
    this.buffSelection = !floor.buffChoiceCompleted && floor.buffChoiceOptions?.length
      ? BuffSystem.normalizeBuffs(floor.buffChoiceOptions).slice(0, 3)
      : null;
    for (const buffId of this.buffSelection ?? []) this.engine.data.discoverBuff(buffId);

    if (!currentRoom) {
      console.error(`[DungeonState] Missing room at ${floor.currentRoomX},${floor.currentRoomY}`);
      this.currentMapData = getMapData(undefined, floor.theme || "forest");
      this.setPhase("exploration");
      return;
    }

    normalizeRoomState(currentRoom);
    this.currentMapData = getMapData(currentRoom, floor.theme || "forest");
    this.environmentHazards = EnvironmentSystem.generate(floor, currentRoom, this.currentMapData);
    const template = getRoomTemplate(currentRoom);

    if (currentRoom && currentRoom.pickups) {
      this.pickups = currentRoom.pickups.map((p: any) => {
        const pickup = new Pickup(p.x, p.y, p.type, p.value, p.weaponId);
        pickup.blockedUntilPlayerLeaves = p.blockedUntilPlayerLeaves === true;
        if (p.weaponId) this.engine.data.discoverWeapon(p.weaponId);
        return pickup;
      });
    }

    currentRoom.visited = true;

    if (currentRoom.type === "start" || currentRoom.type === "npc") {
      this.setPhase("exploration");
      return;
    }

    if (currentRoom.type === "exit") {
      const portalPoint = template.portalSpawnPoint ?? { x: 10, y: 7.5 };
      this.portal = {
        x: portalPoint.x * 16 + 8,
        y: portalPoint.y * 16 + 8,
        state: "idle",
        timer: 0,
      };
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

    if (currentRoom.type === "shop") {
      currentRoom.shopStock = ShopSystem.reconcileStock(floor, currentRoom, this.player);
      for (const item of currentRoom.shopStock) {
        if (item.weaponId) this.engine.data.discoverWeapon(item.weaponId);
        if (item.buffId) this.engine.data.discoverBuff(item.buffId);
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
        const enemy = EncounterFactory.createEnemy(floor, savedEnemy);
        if (savedEnemy.hp !== undefined) enemy.hp = savedEnemy.hp;
        if (savedEnemy.attackState !== undefined) enemy.attackState = savedEnemy.attackState;
        if (savedEnemy.attackCooldown !== undefined) enemy.attackCooldown = savedEnemy.attackCooldown;
        if (savedEnemy.attackTimer !== undefined) enemy.attackTimer = savedEnemy.attackTimer;
        if (savedEnemy.attackAngle !== undefined) enemy.attackAngle = savedEnemy.attackAngle;
        if (savedEnemy.attackTargetX !== undefined) enemy.attackTargetX = savedEnemy.attackTargetX;
        if (savedEnemy.attackTargetY !== undefined) enemy.attackTargetY = savedEnemy.attackTargetY;
        if (savedEnemy.bossPhase !== undefined) enemy.bossPhase = savedEnemy.bossPhase;
        if (savedEnemy.attackSequence !== undefined) enemy.attackSequence = savedEnemy.attackSequence;
        enemy.statusEffects = StatusEffectSystem.normalize(savedEnemy.statusEffects);
        this.addEnemy(enemy);
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
      const activeFloor = this.engine.data.data.floor;
      const activeRoom = activeFloor.rooms.find(
        room => room.x === activeFloor.currentRoomX && room.y === activeFloor.currentRoomY,
      );
      if (activeRoom?.type === "boss") this.engine.data.startBossFight();
      if (options?.startEncounter === false) {
         return;
      }
      
      const floor = this.engine.data.data.floor;
      const currentRoom = floor.rooms.find((r: any) => r.x === floor.currentRoomX && r.y === floor.currentRoomY);
      const template = getRoomTemplate(currentRoom);

      this.encounterCtrl.start(EncounterFactory.create({
        stage: floor,
        room: currentRoom,
        template,
      }));
    } else if (phase === "cleared") {
      this.phaseTimer = 1.0;
      audio.playClearRoom();
      if (this.player.characterId === "mage") {
        this.player.mana = Math.min(this.player.maxMana, this.player.mana + 15);
      }
      const floor = this.engine.data.data.floor;
      const currentRoom = floor.rooms.find((r: any) => r.x === floor.currentRoomX && r.y === floor.currentRoomY);
      if (currentRoom) {
         markCombatCleared(currentRoom);
         currentRoom.enemies = [];
         currentRoom.encounterState = undefined;
         this.prepareBuffChoice(floor, currentRoom);
      }
    } else if (phase === "reward") {
      // Spawn rewards
      this.spawnRoomRewards();
      this.phaseTimer = 0.5;
    } else if (phase === "exiting") {
      // Free to move
    }
  }
  
  private prepareBuffChoice(floor: typeof this.engine.data.data.floor, currentRoom: Room) {
    if (floor.buffChoiceCompleted || floor.buffChoiceOptions?.length) return;
    if (this.player.buffs.length >= BuffSystem.MAX_BUFFS) {
      floor.buffChoiceCompleted = true;
      return;
    }
    const seed = hashSeed(floor.seed, `buff:${currentRoom.id}:${this.player.buffs.join(",")}`);
    const options = BuffSystem.rollChoices(seed, this.player.buffs, 3);
    if (options.length === 0) {
      floor.buffChoiceCompleted = true;
      return;
    }
    floor.buffChoiceOptions = options;
    floor.buffChoiceRoomId = currentRoom.id;
    floor.buffChoiceCompleted = false;
    floor.buffChoiceRerollCount = floor.buffChoiceRerollCount ?? 0;
    this.buffSelection = [...options];
    this.buffSelectionIndex = 0;
    for (const buffId of options) this.engine.data.discoverBuff(buffId);
  }

  private updateBuffSelection() {
    if (!this.buffSelection) return;
    if (this.engine.input.wasPressed("r") && this.player.buffRerollsRemaining > 0) {
      const floor = this.engine.data.data.floor;
      const rerollCount = (floor.buffChoiceRerollCount ?? 0) + 1;
      const roomId = floor.buffChoiceRoomId ?? "unknown";
      const excluded = [...this.player.buffs, ...this.buffSelection];
      const seed = hashSeed(floor.seed, `buff-reroll:${roomId}:${rerollCount}:${this.player.buffs.join(",")}`);
      const options = BuffSystem.rollChoices(seed, excluded, 3);
      if (options.length > 0) {
        this.player.buffRerollsRemaining--;
        floor.buffChoiceRerollCount = rerollCount;
        floor.buffChoiceOptions = options;
        this.buffSelection = [...options];
        this.buffSelectionIndex = 0;
        for (const buffId of options) this.engine.data.discoverBuff(buffId);
        this.syncPlayerState();
        this.engine.data.save();
        audio.playShoot();
        this.engine.input.clearJustPressed();
      }
      return;
    }
    const movePrevious = this.engine.input.wasPressed("arrowleft") || this.engine.input.wasPressed("arrowup");
    const moveNext = this.engine.input.wasPressed("arrowright") || this.engine.input.wasPressed("arrowdown") || this.engine.input.wasActionPressed("swapWeapon");
    if (movePrevious) {
      this.buffSelectionIndex = (this.buffSelectionIndex - 1 + this.buffSelection.length) % this.buffSelection.length;
      audio.playShoot();
    }
    if (moveNext) {
      this.buffSelectionIndex = (this.buffSelectionIndex + 1) % this.buffSelection.length;
      audio.playShoot();
    }
    const keys = ["1", "2", "3"];
    const directIndex = keys.findIndex(key => this.engine.input.wasPressed(key));
    const selectedIndex = directIndex >= 0
      ? directIndex
      : this.engine.input.wasActionPressed("interact")
        ? this.buffSelectionIndex
        : -1;
    if (selectedIndex < 0 || selectedIndex >= this.buffSelection.length) return;
    const selected = this.buffSelection[selectedIndex];
    if (!BuffSystem.acquire(this.player, selected)) return;

    const floor = this.engine.data.data.floor;
    floor.buffChoiceCompleted = true;
    floor.buffChoiceOptions = undefined;
    floor.buffChoiceRoomId = undefined;
    floor.buffChoiceRerollCount = undefined;
    this.buffSelection = null;
    this.syncPlayerState();
    this.syncRoomState();
    this.engine.data.save();
    audio.playPickup();
    this.engine.input.clear();
  }

  private updateShop(dt: number) {
    this.shopFailureTimer = Math.max(0, this.shopFailureTimer - dt);
    if (this.shopFailureTimer <= 0) this.shopFailure = undefined;

    if (this.engine.input.wasPressed("escape") || this.engine.input.wasActionPressed("pause")) {
      this.shopOpen = false;
      this.shopFailure = undefined;
      this.engine.input.clear();
      return;
    }

    const floor = this.engine.data.data.floor;
    const room = floor.rooms.find(candidate =>
      candidate.x === floor.currentRoomX && candidate.y === floor.currentRoomY
    );
    if (!room || room.type !== "shop") {
      this.shopOpen = false;
      return;
    }

    room.shopStock = ShopSystem.reconcileStock(floor, room, this.player);
    const movePrevious = this.engine.input.wasPressed("arrowleft") || this.engine.input.wasPressed("arrowup");
    const moveNext = this.engine.input.wasPressed("arrowright") || this.engine.input.wasPressed("arrowdown") || this.engine.input.wasActionPressed("swapWeapon");
    if (movePrevious) {
      this.shopSelectionIndex = (this.shopSelectionIndex - 1 + room.shopStock.length) % room.shopStock.length;
      audio.playShoot();
    }
    if (moveNext) {
      this.shopSelectionIndex = (this.shopSelectionIndex + 1) % room.shopStock.length;
      audio.playShoot();
    }
    const keys = ["1", "2", "3", "4"];
    const directIndex = keys.findIndex(key => this.engine.input.wasPressed(key));
    const selectedIndex = directIndex >= 0
      ? directIndex
      : this.engine.input.wasActionPressed("interact")
        ? this.shopSelectionIndex
        : -1;
    if (selectedIndex < 0 || selectedIndex >= room.shopStock.length) return;

    const item = room.shopStock[selectedIndex];
    const coins = this.engine.data.data.player.coins;
    const result = ShopSystem.purchase(this.player, item, coins);
    if (!result.success) {
      this.shopFailure = result.reason;
      this.shopFailureTimer = 1.4;
      audio.playHurt();
      return;
    }

    this.engine.data.data.player.coins = result.coinsAfter;
    if (result.droppedWeaponId) {
      const dropped = new Pickup(this.player.x, this.player.y, "weapon", 1, result.droppedWeaponId);
      dropped.blockedUntilPlayerLeaves = true;
      (dropped as any).bounceTimer = 0.2;
      (dropped as any).baseY = dropped.y;
      this.pickups.push(dropped);
    }

    this.shopFailure = undefined;
    this.syncPlayerState();
    this.syncRoomState();
    this.engine.data.save();
    audio.playPickup();
    this.engine.input.clearJustPressed();
  }

  private spawnRoomRewards() {
    const floor = this.engine.data.data.floor;
    const difficulty = getStageDifficulty(floor);
    const currentRoom = floor.rooms.find((r: any) => r.x === floor.currentRoomX && r.y === floor.currentRoomY);
    if (!currentRoom || currentRoom.rewardGenerated) return;
    const template = getRoomTemplate(currentRoom);
    
    if (currentRoom.type === "boss") {
       if (template.portalSpawnPoint) {
         this.portal = { x: template.portalSpawnPoint.x * 16 + 8, y: template.portalSpawnPoint.y * 16 + 8, state: "spawning", timer: 0.6 };
       }
       this.pickups.push(new Pickup(160, 120, "hp", Math.round(20 * difficulty.rewardMultiplier)));
       this.pickups.push(new Pickup(140, 120, "coin", Math.round(50 * difficulty.rewardMultiplier)));
    } else if (currentRoom.type === "combat") {
       this.pickups.push(new Pickup(
         160,
         120,
         Math.random() > 0.5 ? "hp" : "mana",
         Math.round(15 * difficulty.rewardMultiplier),
       ));
       this.pickups.push(new Pickup(150, 110, "coin", Math.round(20 * difficulty.rewardMultiplier)));
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

    if (this.buffSelection) {
      this.updateBuffSelection();
      return;
    }

    if (this.shopOpen) {
      this.updateShop(dt);
      return;
    }

    if (this.player.hp <= 0) {
      this.finishRun("defeat");
      return;
    }

    if (this.tutorial.update(this.engine.input)) {
      this.engine.data.settings.tutorialCompleted = true;
      this.engine.data.saveSettings();
    }

    this.engine.data.recordRunTime(dt);
    DamageSystem.updatePlayer(this.player, dt);
    StatusEffectSystem.updatePlayer(this.player, dt);
    if (this.player.hp <= 0) {
      this.finishRun("defeat");
      return;
    }
    this.updateEnemyStatuses(dt);

    const previousX = this.player.x;
    const previousY = this.player.y;

    this.updateRoomPhase(dt);
    this.updateEnvironmentHazards(dt);
    if (this.player.hp <= 0) {
      this.finishRun("defeat");
      return;
    }
    
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
    SkillController.update(this.player, dt);
    this.updateLightningArcs(dt);

    const canUseSkill = ["combat", "cleared", "reward", "exiting", "exploration"].includes(this.roomPhase);
    if (
      canUseSkill &&
      this.transitionState === "none" &&
      this.engine.input.wasActionPressed("skill")
    ) {
      this.activateCharacterSkill();
    }

    if (
      this.player.hp > 0 &&
      (this.engine.input.wasActionPressed("swapWeapon") || this.engine.input.wasPressed("tab"))
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

    // 4. Interact and fire are separate actions across keyboard, gamepad, and touch.
    if (interactTarget && this.engine.input.wasActionPressed("interact")) {
      this.handleInteract(interactTarget);
    } else if (
      this.engine.input.isActionDown("fire") &&
      this.player.fireCooldown <= 0 &&
      (this.roomPhase === "combat" || this.roomPhase === "cleared" || this.roomPhase === "exiting" || this.roomPhase === "reward" || this.roomPhase === "exploration")
    ) {
      this.fireWeapon();
    }
    // ==========================================

    // WORLD UPDATE SEQUENCE
    if (this.roomPhase === "combat") {
       this.updateEnemies(dt);
    }
    if (this.player.hp <= 0) {
      this.finishRun("defeat");
      return;
    }
    
    this.updateProjectiles(dt);
    if (this.player.hp <= 0) {
      this.finishRun("defeat");
      return;
    }
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
             this.syncPlayerState();
             this.syncRoomState();
             if (isFinalStage(this.engine.data.data.run)) {
               this.finishRun("victory");
               return;
             }
             this.engine.data.advanceStage();
             this.player.x = 160;
             this.player.y = 120;
             this.engine.input.clear();
             this.loadRoom();
          };
       }
    }
  }

  private finishRun(outcome: Exclude<RunOutcome, "active">) {
    if (this.engine.data.data.runStats.settled) return;
    this.syncPlayerState();
    this.syncRoomState();
    const summary = this.engine.data.finalizeRun(outcome);
    this.engine.switchState("run_result", { summary });
  }

  private activateCharacterSkill() {
    const result = SkillController.activate(
      this.player,
      this.enemies,
      this.engine.input.getAxis(),
      this.player.aimAngle,
    );
    if (!result.activated) return;

    if (result.lightningArcs.length > 0) {
      this.lightningArcs.push(...result.lightningArcs);
      audio.playHit();
    } else {
      audio.playPickup();
    }

    if (result.killedEnemyIds.length > 0) {
      const killed = new Set(result.killedEnemyIds);
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        if (!killed.has(enemy.id)) continue;
        this.handleEnemyKilled(enemy);
        this.enemies.splice(i, 1);
      }
    }
  }

  private updateLightningArcs(dt: number) {
    for (let i = this.lightningArcs.length - 1; i >= 0; i--) {
      this.lightningArcs[i].life -= dt;
      if (this.lightningArcs[i].life <= 0) {
        this.lightningArcs.splice(i, 1);
      }
    }
  }

  private spawnEnemyDeathDrop(enemy: Enemy) {
    if (enemy.isElite) {
      const difficulty = getStageDifficulty(this.engine.data.data.floor);
      this.pickups.push(new Pickup(
        enemy.x,
        enemy.y,
        "coin",
        Math.max(1, Math.round(enemy.eliteCoinReward * difficulty.rewardMultiplier)),
      ));
      this.pickups.push(new Pickup(
        enemy.x + 8,
        enemy.y,
        Math.random() < 0.5 ? "mana" : "hp",
        12,
      ));
      return;
    }

    if (Math.random() < Math.min(0.8, 0.3 + this.player.supplyDropBonus)) {
      this.pickups.push(new Pickup(
        enemy.x,
        enemy.y,
        Math.random() < 0.5 ? "mana" : "hp",
        10,
      ));
    }
  }

  private handleEnemyKilled(enemy: Enemy) {
    this.engine.data.recordEnemyKill(enemy);
    this.spawnEnemyDeathDrop(enemy);
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
       const isDashing = SkillController.isRogueDashing(this.player);
       const statusMovement = StatusEffectSystem.getMovementMultiplier(this.player);
       const inputX = isDashing ? this.player.skillDirectionX : axis.x;
       const inputY = isDashing ? this.player.skillDirectionY : axis.y;
       const moveSpeed = (isDashing
         ? SkillController.ROGUE_DASH_SPEED * (this.portal?.state === "activating" ? 0 : 1)
         : this.player.speed * speedMult) * statusMovement;

       const onIce = !isDashing && this.environmentHazards.some(hazard =>
         hazard.type === "ice" && EnvironmentSystem.contains(hazard, this.player.x, this.player.y, this.player.radius)
       );
       let velocityX = inputX * moveSpeed;
       let velocityY = inputY * moveSpeed;
       if (onIce && statusMovement > 0) {
         const response = Math.min(1, dt * (axis.x || axis.y ? 4.2 : 1.35));
         this.player.vx += (velocityX - this.player.vx) * response;
         this.player.vy += (velocityY - this.player.vy) * response;
         velocityX = this.player.vx;
         velocityY = this.player.vy;
       } else {
         this.player.vx = velocityX;
         this.player.vy = velocityY;
       }

       const nextX = this.player.x + velocityX * dt;
       const nextY = this.player.y + velocityY * dt;
       
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
         this.addEnemy(EncounterFactory.createEnemy(this.engine.data.data.floor, spawn));
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

  private updateEnemyStatuses(dt: number) {
    for (let index = this.enemies.length - 1; index >= 0; index--) {
      const enemy = this.enemies[index];
      if (!StatusEffectSystem.updateEnemy(enemy, dt)) continue;
      this.handleEnemyKilled(enemy);
      this.enemies.splice(index, 1);
    }
  }

  private updateEnvironmentHazards(dt: number) {
    this.environmentTime += dt;
    if (["entering", "intro", "locking"].includes(this.roomPhase)) return;
    for (const hazard of this.environmentHazards) {
      hazard.triggerCooldown = Math.max(0, hazard.triggerCooldown - dt);
      if (!EnvironmentSystem.contains(hazard, this.player.x, this.player.y, this.player.radius)) continue;

      if (hazard.type === "poison_pool" && hazard.triggerCooldown <= 0) {
        StatusEffectSystem.applyPlayer(this.player, "poison", 2.4);
        hazard.triggerCooldown = 1.1;
      } else if (hazard.type === "lava" && hazard.triggerCooldown <= 0) {
        StatusEffectSystem.applyPlayer(this.player, "burn", 2.6);
        hazard.triggerCooldown = 0.9;
      } else if (
        hazard.type === "spikes" &&
        hazard.triggerCooldown <= 0 &&
        EnvironmentSystem.isSpikeActive(hazard, this.environmentTime)
      ) {
        const result = DamageSystem.damagePlayer(this.player, 1, 0.35);
        if (result.applied) {
          this.engine.data.recordPlayerDamage(result.armorDamage + result.hpDamage, false);
          this.engine.triggerScreenShake(2.2, 0.12);
          audio.playHurt();
        }
        hazard.triggerCooldown = 0.72;
      }
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

  private getShopPosition(room: Room): { x: number; y: number } {
    const template = getRoomTemplate(room);
    const point = template.pickupSpawnPoints[0] ?? { x: 10, y: 7.5 };
    return { x: point.x * 16 + 8, y: point.y * 16 + 8 };
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
       this.engine.data.discoverWeapon(this.chest.weaponId);
    } else if (target.type === "shop") {
       this.shopOpen = true;
       this.shopSelectionIndex = 0;
       this.shopFailure = undefined;
       this.shopFailureTimer = 0;
       audio.playPickup();
       this.engine.input.clearJustPressed();
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

    if (currentRoom?.type === "shop") {
      const shop = this.getShopPosition(currentRoom);
      if (Math.hypot(this.player.x - shop.x, this.player.y - shop.y) < 32) {
        return { type: "shop", x: shop.x, y: shop.y, roomId: currentRoom.id };
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
      this.engine.data.recordWeaponUsed(this.player.currentWeaponId);
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
      if (e.type === "boss") this.updateBossPhase(e);
      
      let nextX = e.x;
      let nextY = e.y;
      
      let currentSpeed = e.speed;
      currentSpeed *= StatusEffectSystem.getMovementMultiplier(e);
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

      if (e.type === "melee" && e.behavior === "charge") {
        if (dist <= 110 && e.attackCooldown <= 0) {
          this.beginEnemyAttack(e, e.attackWindup);
          continue;
        }

        if (dist > 28) {
          const angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
          nextX += Math.cos(angle) * currentSpeed * dt;
          nextY += Math.sin(angle) * currentSpeed * dt;
        }
      } else if (e.type === "melee") {
        const attackRange = e.radius + this.player.radius + 8;
        if (dist <= attackRange && e.attackCooldown <= 0) {
          this.beginEnemyAttack(e, e.attackWindup);
          continue;
        }

        if (dist > attackRange - 2) {
          const angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
          nextX += Math.cos(angle) * currentSpeed * dt;
          nextY += Math.sin(angle) * currentSpeed * dt;
        }
      } else if (e.type === "ranged") {
        const canAttack = e.behavior !== "summon" || this.enemies.length < 7;
        if (canAttack && e.attackCooldown <= 0 && dist <= 190) {
          this.beginEnemyAttack(e, e.attackWindup);
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
          const phaseWindup = e.attackWindup * (e.bossPhase === 1 ? 1 : e.bossPhase === 2 ? 0.88 : 0.76);
          this.beginEnemyAttack(e, phaseWindup);
          continue;
        }

        if (dist > (e.bossPhase === 3 ? 48 : 60)) {
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

  private updateBossPhase(enemy: Enemy) {
    const healthRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;
    const nextPhase: 1 | 2 | 3 = healthRatio <= 0.33 ? 3 : healthRatio <= 0.66 ? 2 : 1;
    if (nextPhase === enemy.bossPhase) return;
    enemy.bossPhase = nextPhase;
    enemy.attackState = "recover";
    enemy.attackTimer = 0.35;
    enemy.attackCooldown = Math.min(enemy.attackCooldown, 0.45);
    enemy.hitFlash = 0.35;
  }

  private beginEnemyAttack(enemy: Enemy, windup: number) {
    enemy.attackState = "windup";
    enemy.attackTimer = windup;
    enemy.attackAngle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
    enemy.attackTargetX = this.player.x;
    enemy.attackTargetY = this.player.y;
  }

  private resolveEnemyAttack(enemy: Enemy) {
    if (enemy.behavior === "melee") {
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const distance = Math.hypot(dx, dy);
      const targetAngle = Math.atan2(dy, dx);
      const angleDelta = Math.atan2(
        Math.sin(targetAngle - enemy.attackAngle),
        Math.cos(targetAngle - enemy.attackAngle)
      );

      if (distance <= enemy.radius + this.player.radius + 11 && Math.abs(angleDelta) <= Math.PI * 0.42) {
        const result = DamageSystem.damagePlayer(this.player, enemy.attackDamage);
        if (result.applied) {
          this.engine.data.recordPlayerDamage(
            result.armorDamage + result.hpDamage,
            enemy.type === "boss",
          );
          this.engine.triggerScreenShake(2.2, 0.12);
          this.applyEnemyStatusToPlayer(enemy, result.armorDamage + result.hpDamage > 0);
          audio.playHurt();
        }
      }
      enemy.attackCooldown = enemy.attackInterval;
    } else if (enemy.behavior === "charge") {
      this.resolveChargeAttack(enemy);
      enemy.attackCooldown = enemy.attackInterval;
    } else if (enemy.behavior === "shoot") {
      this.spawnEnemyProjectile(enemy, enemy.attackAngle);
      enemy.attackCooldown = enemy.attackInterval;
    } else if (enemy.behavior === "scatter") {
      const count = Math.max(2, enemy.projectileCount);
      for (let i = 0; i < count; i++) {
        const offset = (i - (count - 1) / 2) * enemy.projectileSpread;
        this.spawnEnemyProjectile(enemy, enemy.attackAngle + offset);
      }
      enemy.attackCooldown = enemy.attackInterval;
    } else if (enemy.behavior === "summon") {
      this.spawnSummonedEnemy(enemy);
      enemy.attackCooldown = enemy.attackInterval;
    } else if (enemy.behavior === "area") {
      const distance = Math.hypot(
        this.player.x - enemy.attackTargetX,
        this.player.y - enemy.attackTargetY,
      );
      if (distance <= enemy.areaRadius + this.player.radius) {
        const result = DamageSystem.damagePlayer(this.player, enemy.attackDamage);
        if (result.applied) {
          this.engine.data.recordPlayerDamage(
            result.armorDamage + result.hpDamage,
            enemy.type === "boss",
          );
          this.engine.triggerScreenShake(2.2, 0.12);
          this.applyEnemyStatusToPlayer(enemy, result.armorDamage + result.hpDamage > 0);
          audio.playHurt();
        }
      }
      enemy.attackCooldown = enemy.attackInterval;
    } else if (enemy.behavior === "boss") {
      this.resolveBossAttack(enemy);
      const phaseMultiplier = enemy.bossPhase === 1 ? 1 : enemy.bossPhase === 2 ? 0.78 : 0.58;
      enemy.attackCooldown = enemy.attackInterval * phaseMultiplier;
    }

    enemy.attackSequence++;
    enemy.attackState = "recover";
    enemy.attackTimer = 0.16;
  }

  private spawnEnemyProjectile(enemy: Enemy, angle: number, radius = 3, life = 3) {
    this.projectiles.push(new Projectile(
      enemy.x,
      enemy.y,
      Math.cos(angle) * enemy.projectileSpeed,
      Math.sin(angle) * enemy.projectileSpeed,
      radius,
      enemy.attackDamage,
      "enemy",
      life,
      enemy.displayColor,
      0,
      false,
      0,
      0,
      enemy.statusEffect,
      enemy.statusDuration,
      enemy.type === "boss",
    ));
  }

  private resolveChargeAttack(enemy: Enemy) {
    const startX = enemy.x;
    const startY = enemy.y;
    const steps = Math.max(1, Math.ceil(enemy.chargeDistance / 4));
    for (let step = 1; step <= steps; step++) {
      const distance = enemy.chargeDistance * (step / steps);
      const nextX = startX + Math.cos(enemy.attackAngle) * distance;
      const nextY = startY + Math.sin(enemy.attackAngle) * distance;
      if (this.isCollidingWithMap(nextX, nextY, enemy.radius)) break;
      enemy.x = Math.max(16, Math.min(304, nextX));
      enemy.y = Math.max(16, Math.min(224, nextY));
    }

    const hit = segmentCircleHit(
      startX,
      startY,
      enemy.x,
      enemy.y,
      this.player.x,
      this.player.y,
      enemy.radius + this.player.radius + 2,
    );
    if (hit) {
      const result = DamageSystem.damagePlayer(this.player, enemy.attackDamage);
      if (result.applied) {
        this.engine.data.recordPlayerDamage(
          result.armorDamage + result.hpDamage,
          enemy.type === "boss",
        );
        this.engine.triggerScreenShake(2.2, 0.12);
        this.applyEnemyStatusToPlayer(enemy, result.armorDamage + result.hpDamage > 0);
        audio.playHurt();
      }
    }
  }

  private applyEnemyStatusToPlayer(enemy: Enemy, dealtDamage: boolean) {
    if (!dealtDamage || !enemy.statusEffect || enemy.statusDuration <= 0) return;
    StatusEffectSystem.applyPlayer(this.player, enemy.statusEffect, enemy.statusDuration);
  }

  private spawnSummonedEnemy(enemy: Enemy) {
    if (!enemy.summonEnemyId || this.enemies.length >= 7) return;
    const angle = enemy.attackSequence * 2.3999632297;
    const distance = enemy.radius + 18;
    const x = enemy.x + Math.cos(angle) * distance;
    const y = enemy.y + Math.sin(angle) * distance;
    if (this.isCollidingWithMap(x, y, 8)) return;
    const summoned = EncounterFactory.createEnemy(this.engine.data.data.floor, {
      x,
      y,
      type: "melee",
      enemyId: enemy.summonEnemyId,
      isElite: false,
    });
    summoned.attackCooldown = Math.max(0.6, summoned.attackCooldown);
    this.addEnemy(summoned);
  }

  private resolveBossAttack(enemy: Enemy) {
    const radial = (count: number, offset: number, speedScale = 1) => {
      const originalSpeed = enemy.projectileSpeed;
      enemy.projectileSpeed *= speedScale;
      for (let i = 0; i < count; i++) {
        this.spawnEnemyProjectile(enemy, offset + Math.PI * 2 * i / count, 4, 4);
      }
      enemy.projectileSpeed = originalSpeed;
    };

    if (enemy.bossPhase === 1) {
      radial(enemy.projectileCount, enemy.attackSequence * 0.12);
      return;
    }

    if (enemy.bossPhase === 2) {
      radial(enemy.projectileCount + 2, enemy.attackSequence * 0.2, 1.08);
      this.spawnEnemyProjectile(enemy, enemy.attackAngle, 4, 4);
      return;
    }

    const fanCount = 5;
    for (let i = 0; i < fanCount; i++) {
      const offset = (i - 2) * 0.18;
      this.spawnEnemyProjectile(enemy, enemy.attackAngle + offset, 4, 4);
    }
    radial(Math.max(6, enemy.projectileCount), enemy.attackSequence * 0.28, 1.15);
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(dt);
      let environmentHitT = this.getProjectileEnvironmentHitT(p);
      let entityHit = false;

      if (p.faction === "player") {
        let closestEnemyIndex = -1;
        let closestHitT = Infinity;
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          if (p.hitEnemyIds.has(e.id)) continue;
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
          p.hitEnemyIds.add(e.id);
          if (result.applied) {
            this.applyProjectileKnockback(e, p);
            if (p.statusEffect && p.statusDuration > 0) {
              StatusEffectSystem.applyEnemy(e, p.statusEffect, p.statusDuration);
            }
            audio.playHit();
          }
          if (result.killed) {
            this.handleEnemyKilled(e);
            this.enemies.splice(closestEnemyIndex, 1);
          }
          if (p.pierceRemaining > 0) {
            p.pierceRemaining--;
          } else {
            entityHit = true;
          }
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
          if (result.applied) {
            this.engine.data.recordPlayerDamage(
              result.armorDamage + result.hpDamage,
              p.sourceBoss,
            );
            this.engine.triggerScreenShake(2.2, 0.12);
            if (
              result.armorDamage + result.hpDamage > 0 &&
              p.statusEffect &&
              p.statusDuration > 0
            ) {
              StatusEffectSystem.applyPlayer(this.player, p.statusEffect, p.statusDuration);
            }
            audio.playHurt();
          }
          entityHit = true;
        }
      }

      if (!entityHit && environmentHitT !== null && p.wallBouncesRemaining > 0) {
        const proposedX = p.x;
        const proposedY = p.y;
        const blockedX = proposedX < 0 || proposedX > 320 || this.isCollidingWithMap(proposedX, p.previousY, p.radius);
        const blockedY = proposedY < 0 || proposedY > 240 || this.isCollidingWithMap(p.previousX, proposedY, p.radius);
        if (blockedX || (!blockedX && !blockedY)) p.vx *= -1;
        if (blockedY || (!blockedX && !blockedY)) p.vy *= -1;
        p.x = p.previousX;
        p.y = p.previousY;
        p.wallBouncesRemaining--;
        environmentHitT = null;
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
    const time = Date.now() / 1000;
    EnvironmentSystem.draw(ctx, this.environmentHazards, this.environmentTime);
    const doorLocked = this.roomPhase !== "exploration";
    this.roomRenderer.drawForeground(ctx, currentRoom, floor.theme || "forest", doorLocked);
    
    // Draw telegraphs
    for (const t of this.encounterCtrl.telegraphs) {
       ctx.strokeStyle = t.isElite ? "rgba(241, 196, 15, 0.95)" : "rgba(231, 76, 60, 0.8)";
       ctx.lineWidth = 2;
       ctx.beginPath();
       const rad = (t.type === "boss" ? 24 : 12) + (t.isElite ? 4 : 0);
       ctx.arc(t.x, t.y, rad, 0, Math.PI * 2);
       ctx.stroke();
       ctx.fillStyle = t.isElite ? "rgba(241, 196, 15, 0.18)" : "rgba(231, 76, 60, 0.2)";
       ctx.fill();
    }

    for (const arc of this.lightningArcs) {
      const alpha = Math.max(0, arc.life / arc.maxLife);
      const midX = (arc.x1 + arc.x2) / 2;
      const midY = (arc.y1 + arc.y2) / 2;
      const dx = arc.x2 - arc.x1;
      const dy = arc.y2 - arc.y1;
      const length = Math.hypot(dx, dy) || 1;
      const bend = 4 * alpha;
      ctx.strokeStyle = `rgba(0, 242, 254, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(arc.x1, arc.y1);
      ctx.lineTo(midX - dy / length * bend, midY + dx / length * bend);
      ctx.lineTo(arc.x2, arc.y2);
      ctx.stroke();
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(Math.round(arc.x2) - 2, Math.round(arc.y2) - 2, 4, 4);
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

    if (currentRoom?.type === "shop") {
      const shop = this.getShopPosition(currentRoom);
      ShopRenderer.drawMerchant(ctx, shop.x, shop.y, time);
    }

    for (const p of this.pickups) {
       EntityRenderer.drawPickup(ctx, p, time);
    }
    
    for (const e of this.enemies) {
       EntityRenderer.drawEnemy(ctx, e, time, floor.theme || 'forest', this.engine.data.settings.reducedFlashing);
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
    this.tutorial.draw(ctx, this.engine.input);
    
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
    PromptRenderer.draw(ctx, this.getInteractTarget(), time, this.engine.input.getPrompt("interact"));

    if (this.buffSelection) {
      BuffSelectionRenderer.draw(
        ctx,
        this.buffSelection,
        this.player.buffRerollsRemaining,
        this.buffSelectionIndex,
        this.engine.input.getPrompt("interact"),
        this.engine.input.getPrompt("swapWeapon"),
      );
    }

    if (this.shopOpen && currentRoom?.type === "shop") {
      ShopRenderer.drawOverlay(
        ctx,
        currentRoom.shopStock ?? [],
        this.engine.data.data.player.coins,
        this.shopFailure,
        this.shopSelectionIndex,
        this.engine.input.getPrompt("interact"),
        this.engine.input.getPrompt("swapWeapon"),
        this.engine.input.getPrompt("pause"),
      );
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
