import { Engine } from "../Engine";
import { generateStage, Room } from "../FloorGenerator";
import { isCombatCleared, isCombatRoom, markCombatCleared, normalizeRoomState } from "../RoomState";
import { Player, MAX_PLAYER_MANA } from "../entities/Player";
import { Projectile } from "../entities/Projectile";
import { RoomRenderer } from "../render/RoomRenderer";
import { EntityRenderer } from "../render/EntityRenderer";
import { Enemy } from "../entities/Enemy";
import { updateEnemyAnimation } from "../EnemyAnimation";
import { TILE_SIZE, getRoomTemplate, getMapData, MAP_WIDTH, MAP_HEIGHT, DOOR_ENTRY_POINTS } from "../MapData";
import { UIRenderer } from "../render/UIRenderer";
import { PixelFxSystem } from "../render/PixelFxSystem";
import { ArtDirectionRenderer } from "../render/ArtDirectionRenderer";
import { audio } from "../audio/AudioManager";
import { PortalRenderer, PortalState } from "../render/PortalRenderer";
import { MinimapRenderer } from "../render/MinimapRenderer";

import { Pickup } from "../entities/Pickup";
import { acquirePickup, acquireProjectile, releaseEnemy, releasePickup, releaseProjectile } from "../EntityPools";
import { PromptRenderer } from "../render/PromptRenderer";
import { EncounterController } from "../EncounterController";
import { EncounterFactory } from "../EncounterFactory";
import { DamageSystem } from "../combat/DamageSystem";
import { WeaponController } from "../combat/WeaponController";
import { segmentCircleHit } from "../combat/Collision";
import {
  calculateChainDamage,
  calculateExplosionDamage,
  calculateExplosionFalloff,
  rotateVelocityToward,
} from "../combat/ProjectileEffects";
import { LightningArc, SkillController } from "../combat/SkillController";
import { getStageDifficulty } from "../combat/StageDifficulty";
import { BuffSystem, type BuffId } from "../combat/BuffSystem";
import { createSeededRandom, hashSeed } from "../Random";
import { WEAPONS, rollAvailableWeapon } from "../data/weapons";
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
import { getEnemyDefinition } from "../data/enemies";
import { t, uiFont } from "../i18n";

type RoomPhase = "entering" | "intro" | "locking" | "combat" | "cleared" | "reward" | "exiting" | "exploration";

import { GameState } from "./GameState";
export class DungeonState extends GameState {
  protected engine: Engine;
  private player: Player;
  private projectiles: Projectile[] = [];
  private roomRenderer = new RoomRenderer();
  private fx = new PixelFxSystem();
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
    player.maxMana = Math.max(1, Math.min(MAX_PLAYER_MANA, savedP.maxMana));
    player.mana = Math.max(0, Math.min(player.maxMana, savedP.mana));
    player.manaRechargeTimer = savedP.manaRechargeTimer ?? 0;
    player.manaRechargeDelay = savedP.manaRechargeDelay ?? 1.35;
    player.manaRechargeRate = savedP.manaRechargeRate ?? 9;
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
    player.phoenixProtocolReady = savedP.phoenixProtocolReady === true;
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
          this.fx.emitRoomClear(160, 120, this.engine.isPerformanceDegraded());
          const template = getRoomTemplate(sourceRoom);
          const pts = template.pickupSpawnPoints;
          const p1 = pts.length > 0 ? pts[0] : { x: 10, y: 8.5 };
          const p2 = pts.length > 1 ? pts[1] : { x: 8.5, y: 7.5 };
          if (params.legacyType === "legacy_rpg") {
             this.pickups.push(acquirePickup(p1.x * 16 + 8, p1.y * 16 + 8, "mana", 20));
             this.pickups.push(acquirePickup(p2.x * 16 + 8, p2.y * 16 + 8, "coin", 50));
          } else if (params.legacyType === "legacy_tactics") {
             this.pickups.push(acquirePickup(p1.x * 16 + 8, p1.y * 16 + 8, "weapon", 1, "laser"));
             this.engine.data.discoverWeapon("laser");
             this.pickups.push(acquirePickup(p2.x * 16 + 8, p2.y * 16 + 8, "coin", 100));
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
    savedP.manaRechargeTimer = this.player.manaRechargeTimer;
    savedP.manaRechargeDelay = this.player.manaRechargeDelay;
    savedP.manaRechargeRate = this.player.manaRechargeRate;
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
    savedP.phoenixProtocolReady = this.player.phoenixProtocolReady;
    savedP.statusEffects = StatusEffectSystem.normalize(this.player.statusEffects);
    savedP.buffRerollsRemaining = this.player.buffRerollsRemaining;
    savedP.shopDiscount = this.player.shopDiscount;
    savedP.supplyDropBonus = this.player.supplyDropBonus;
    this.engine.data.discoverPlayerBuild();
  }

  private addEnemy(enemy: Enemy) {
    this.moveToNearestPassable(enemy, enemy.radius);
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
    for (const projectile of this.projectiles) releaseProjectile(projectile);
    for (const pickup of this.pickups) releasePickup(pickup);
    for (const enemy of this.enemies) releaseEnemy(enemy);
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
    this.moveToNearestPassable(this.player, this.player.radius);
    this.environmentHazards = EnvironmentSystem.generate(floor, currentRoom, this.currentMapData);
    const template = getRoomTemplate(currentRoom);

    if (currentRoom && currentRoom.pickups) {
      this.pickups = currentRoom.pickups.map((p: any) => {
        const pickup = acquirePickup(p.x, p.y, p.type, p.value, p.weaponId);
        this.moveToNearestPassable(pickup, 4);
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
        const random = createSeededRandom(hashSeed(currentRoom.encounterSeed ?? floor.seed, "treasure-weapon"));
        const weapon = rollAvailableWeapon(floor.globalStageIndex, random, "treasure", ["pistol"]);
        this.chest = { x: pt.x * 16 + 8, y: pt.y * 16 + 8, weaponId: weapon.id, opened: false };
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
      this.fx.emitRoomClear(160, 120, this.engine.isPerformanceDegraded());
      if (this.player.characterId === "mage") {
        this.player.mana = Math.min(this.player.maxMana, this.player.mana + 8);
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
    const options = BuffSystem.rollChoices(seed, this.player.buffs, 3, floor.globalStageIndex);
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
      const options = BuffSystem.rollChoices(seed, excluded, 3, floor.globalStageIndex);
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
      const dropped = acquirePickup(this.player.x, this.player.y, "weapon", 1, result.droppedWeaponId);
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
       this.pickups.push(acquirePickup(160, 120, "hp", Math.round(20 * difficulty.rewardMultiplier)));
       this.pickups.push(acquirePickup(140, 120, "coin", Math.round(50 * difficulty.rewardMultiplier)));
    } else if (currentRoom.type === "combat") {
       this.pickups.push(acquirePickup(
         160,
         120,
         Math.random() > 0.5 ? "hp" : "mana",
         Math.round(8 * difficulty.rewardMultiplier),
       ));
       this.pickups.push(acquirePickup(150, 110, "coin", Math.round(20 * difficulty.rewardMultiplier)));
    } else if (currentRoom.type === "treasure") {
       const pts = template.pickupSpawnPoints;
       const pt = pts.length > 0 ? pts[0] : { x: 10, y: 7.5 };
       const random = createSeededRandom(hashSeed(currentRoom.encounterSeed ?? floor.seed, "treasure-weapon"));
       const weapon = rollAvailableWeapon(floor.globalStageIndex, random, "treasure", ["pistol"]);
       this.chest = { x: pt.x * 16 + 8, y: pt.y * 16 + 8, weaponId: weapon.id, opened: false };
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

  private syncMusicScene() {
    const floor = this.engine.data.data.floor;
    const room = floor.rooms.find(candidate => candidate.x === floor.currentRoomX && candidate.y === floor.currentRoomY);
    const theme = floor.theme === "dungeon" || floor.theme === "snow" || floor.theme === "lava" ? floor.theme : "forest";
    if (this.shopOpen || room?.type === "shop") {
      audio.setMusicScene("shop");
    } else if (room?.type === "boss" && this.roomPhase === "combat") {
      audio.setMusicScene("boss");
    } else if (this.roomPhase === "combat") {
      audio.setMusicScene(`combat_${theme}` as const);
    } else {
      audio.setMusicScene(theme);
    }
  }

  update(dt: number) {
    this.syncMusicScene();
    this.roomRenderer.update(dt);
    this.fx.update(dt);

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

    audio.playSkill();
    if (result.lightningArcs.length > 0) {
      this.lightningArcs.push(...result.lightningArcs);
      for (const arc of result.lightningArcs) {
        this.fx.emitImpact(arc.x2, arc.y2, "#8DF6FF", false, this.engine.isPerformanceDegraded());
      }
    }

    if (result.killedEnemyIds.length > 0) {
      const killed = new Set(result.killedEnemyIds);
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        if (!killed.has(enemy.id)) continue;
        this.handleEnemyKilled(enemy);
        this.enemies.splice(i, 1);
        releaseEnemy(enemy);
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
      this.pickups.push(acquirePickup(
        enemy.x,
        enemy.y,
        "coin",
        Math.max(1, Math.round(enemy.eliteCoinReward * difficulty.rewardMultiplier)),
      ));
      this.pickups.push(acquirePickup(
        enemy.x + 8,
        enemy.y,
        Math.random() < 0.5 ? "mana" : "hp",
        8,
      ));
      return;
    }

    if (Math.random() < Math.min(0.8, 0.3 + this.player.supplyDropBonus)) {
      this.pickups.push(acquirePickup(
        enemy.x,
        enemy.y,
        Math.random() < 0.5 ? "mana" : "hp",
        5,
      ));
    }
  }

  private handleEnemyKilled(enemy: Enemy) {
    this.engine.data.recordEnemyKill(enemy);
    const energyRestore = BuffSystem.getKillEnergyRestore(this.player);
    if (energyRestore > 0) {
      this.player.mana = Math.min(this.player.maxMana, this.player.mana + energyRestore);
    }
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
      releaseEnemy(enemy);
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
          this.fx.emitDamage(this.player.x, this.player.y, this.engine.isPerformanceDegraded());
          audio.playHurt();
        }
        hazard.triggerCooldown = 0.72;
      }
    }
  }

  public getPlayer(): Player {
    return this.player;
  }

  public capturesPauseInput(): boolean {
    return this.shopOpen;
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
           this.player.x = DOOR_ENTRY_POINTS.fromRight.x;
           this.player.y = DOOR_ENTRY_POINTS.fromRight.y;
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
           this.player.x = DOOR_ENTRY_POINTS.fromLeft.x;
           this.player.y = DOOR_ENTRY_POINTS.fromLeft.y;
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
           this.player.x = DOOR_ENTRY_POINTS.fromDown.x;
           this.player.y = DOOR_ENTRY_POINTS.fromDown.y;
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
           this.player.x = DOOR_ENTRY_POINTS.fromUp.x;
           this.player.y = DOOR_ENTRY_POINTS.fromUp.y;
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

  private getBroadcastPosition(room: Room): { x: number; y: number } {
    const template = getRoomTemplate(room);
    const point = template.pickupSpawnPoints[0] ?? template.legacySpawnPoint ?? { x: 10, y: 7.5 };
    return { x: point.x * 16 + 8, y: point.y * 16 + 8 };
  }

  private handleInteract(target: any) {
    if (target.type === "portal" && this.portal) {
       this.portal.state = "activating";
       this.portal.timer = 0.4;
       audio.playPortal();
    } else if (target.type === "legacy_rpg" || target.type === "legacy_tactics") {
       this.engine.input.clear();
       this.engine.switchState(target.type, { sourceRoomId: target.roomId });
    } else if (target.type === "broadcast") {
       const floor = this.engine.data.data.floor;
       const room = floor.rooms.find((candidate: Room) => candidate.id === target.roomId);
       if (room && !room.interactionCompleted) {
         const random = createSeededRandom(hashSeed(room.encounterSeed ?? floor.seed, "broadcast-reward"));
         const reward = Math.floor(random() * 4);
         if (reward === 0) {
           this.pickups.push(acquirePickup(target.x, target.y + 16, "coin", 24));
         } else if (reward === 1) {
           this.pickups.push(acquirePickup(target.x, target.y + 16, "mana", 15));
         } else if (reward === 2) {
           this.pickups.push(acquirePickup(target.x, target.y + 16, "hp", 2));
         } else {
           const broadcastWeapons = ["bell_repeater", "mask_sprayer", "code_scanner", "swab_lance", "vat_horse_cannon"];
           const weaponId = broadcastWeapons[Math.floor(random() * broadcastWeapons.length)];
           this.pickups.push(acquirePickup(target.x, target.y + 16, "weapon", 1, weaponId));
           this.engine.data.discoverWeapon(weaponId);
         }
         room.interactionCompleted = true;
         room.rewardGenerated = true;
         audio.playClearRoom();
         this.fx.emitRoomClear(target.x, target.y, this.engine.isPerformanceDegraded());
         this.syncRoomState();
         this.syncPlayerState();
         this.engine.data.save();
       }
    } else if (target.type === "treasure" && this.chest && !this.chest.opened) {
       this.chest.opened = true;
       audio.playPickup();
       const floor = this.engine.data.data.floor;
       const currentRoom = floor.rooms.find((r: any) => r.x === floor.currentRoomX && r.y === floor.currentRoomY);
       if (currentRoom) {
          currentRoom.interactionCompleted = true;
          currentRoom.rewardGenerated = true;
       }
       this.pickups.push(acquirePickup(this.chest.x, this.chest.y + 10, "weapon", 1, this.chest.weaponId));
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

    if (currentRoom?.type === "npc" && !currentRoom.interactionCompleted) {
      const broadcast = this.getBroadcastPosition(currentRoom);
      if (Math.hypot(this.player.x - broadcast.x, this.player.y - broadcast.y) < 30) {
        return { type: "broadcast", x: broadcast.x, y: broadcast.y, roomId: currentRoom.id };
      }
    }

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

  private moveToNearestPassable(entity: { x: number; y: number }, radius: number): void {
    if (!this.isCollidingWithMap(entity.x, entity.y, radius)) return;
    const originX = Math.max(1, Math.min(MAP_WIDTH - 2, Math.floor(entity.x / TILE_SIZE)));
    const originY = Math.max(1, Math.min(MAP_HEIGHT - 2, Math.floor(entity.y / TILE_SIZE)));
    for (let distance = 0; distance <= 9; distance++) {
      for (let dy = -distance; dy <= distance; dy++) {
        for (let dx = -distance; dx <= distance; dx++) {
          if (distance > 0 && Math.abs(dx) !== distance && Math.abs(dy) !== distance) continue;
          const tileX = originX + dx;
          const tileY = originY + dy;
          if (tileX <= 0 || tileX >= MAP_WIDTH - 1 || tileY <= 0 || tileY >= MAP_HEIGHT - 1) continue;
          const x = tileX * TILE_SIZE + TILE_SIZE / 2;
          const y = tileY * TILE_SIZE + TILE_SIZE / 2;
          if (this.isCollidingWithMap(x, y, radius)) continue;
          entity.x = x;
          entity.y = y;
          return;
        }
      }
    }
    entity.x = 160;
    entity.y = 120;
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

  private hasLineOfSight(startX: number, startY: number, endX: number, endY: number): boolean {
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(distance / 6));
    for (let step = 1; step < steps; step++) {
      const t = step / steps;
      if (this.isCollidingWithMap(startX + dx * t, startY + dy * t, 2)) return false;
    }
    return true;
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
      if (result.projectiles[0]) this.fx.emitMuzzle(result.projectiles[0], this.engine.isPerformanceDegraded());
      if (result.recoil >= 0.7) {
        this.engine.triggerScreenShake(Math.min(1.8, result.recoil), 0.055 + result.recoil * 0.015);
      }
      this.engine.data.recordWeaponUsed(this.player.currentWeaponId);
      audio.playWeaponShot(result.projectiles[0]?.style ?? "bullet", result.recoil);
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
      const previousX = e.x;
      const previousY = e.y;
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
        updateEnemyAnimation(e, { dt, previousX, previousY, targetX: this.player.x });
        continue;
      }

      if (e.attackState === "recover") {
        e.attackTimer -= dt;
        if (e.attackTimer <= 0) {
          e.attackState = "idle";
          e.attackTimer = 0;
        }
        updateEnemyAnimation(e, { dt, previousX, previousY, targetX: this.player.x });
        continue;
      }

      if (e.type === "melee" && e.behavior === "charge") {
        if (dist <= 110 && e.attackCooldown <= 0) {
          this.beginEnemyAttack(e, e.attackWindup);
          updateEnemyAnimation(e, { dt, previousX, previousY, targetX: this.player.x });
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
          updateEnemyAnimation(e, { dt, previousX, previousY, targetX: this.player.x });
          continue;
        }

        if (dist > attackRange - 2) {
          const angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
          nextX += Math.cos(angle) * currentSpeed * dt;
          nextY += Math.sin(angle) * currentSpeed * dt;
        }
      } else if (e.type === "ranged") {
        const hasAttackLine = !e.requiresLineOfSight || this.hasLineOfSight(e.x, e.y, this.player.x, this.player.y);
        const canAttack = (e.behavior !== "summon" || this.enemies.length < 7) && hasAttackLine;
        if (canAttack && e.attackCooldown <= 0 && dist <= e.attackRange) {
          this.beginEnemyAttack(e, e.attackWindup);
          updateEnemyAnimation(e, { dt, previousX, previousY, targetX: this.player.x });
          continue;
        }

        if (dist > 112 || !hasAttackLine) {
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
          updateEnemyAnimation(e, { dt, previousX, previousY, targetX: this.player.x });
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
      updateEnemyAnimation(e, { dt, previousX, previousY, targetX: this.player.x });
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
    enemy.attackAnimationDuration = windup;
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
          this.fx.emitDamage(this.player.x, this.player.y, this.engine.isPerformanceDegraded());
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
          this.fx.emitDamage(this.player.x, this.player.y, this.engine.isPerformanceDegraded());
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
    this.projectiles.push(acquireProjectile(
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
        this.fx.emitDamage(this.player.x, this.player.y, this.engine.isPerformanceDegraded());
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
    const fan = (count: number, spread: number, speedScale = 1) => {
      const originalSpeed = enemy.projectileSpeed;
      enemy.projectileSpeed *= speedScale;
      for (let i = 0; i < count; i++) {
        const offset = (i - (count - 1) / 2) * spread;
        this.spawnEnemyProjectile(enemy, enemy.attackAngle + offset, 4, 4);
      }
      enemy.projectileSpeed = originalSpeed;
    };

    const pattern = getEnemyDefinition(enemy.enemyId).bossPattern;
    if (pattern === "grove") {
      if (enemy.bossPhase === 1) {
        radial(6, enemy.attackSequence * 0.16, 0.95);
        if (enemy.attackSequence % 2 === 1) fan(3, 0.2);
      } else if (enemy.bossPhase === 2) {
        radial(9, enemy.attackSequence * 0.2);
        if (enemy.attackSequence % 2 === 0) this.spawnSummonedEnemy(enemy);
      } else {
        radial(8, enemy.attackSequence * 0.27, 1.08);
        radial(8, enemy.attackSequence * 0.27 + Math.PI / 8, 0.78);
        fan(3, 0.16, 1.15);
      }
      return;
    }

    if (pattern === "broadcast") {
      if (enemy.bossPhase === 1) {
        fan(3, 0.22, 1.18);
        if (enemy.attackSequence % 3 === 2) radial(5, enemy.attackSequence * 0.18, 0.9);
      } else if (enemy.bossPhase === 2) {
        radial(6, enemy.attackSequence * 0.28, 1.15);
        fan(5, 0.18, 1.08);
        if (enemy.attackSequence % 2 === 0) this.spawnSummonedEnemy(enemy);
      } else {
        fan(7, 0.14, 1.25);
        radial(4, enemy.attackSequence % 2 === 0 ? 0 : Math.PI / 4, 0.92);
        if (enemy.attackSequence % 3 === 0) this.spawnSummonedEnemy(enemy);
      }
      return;
    }

    if (pattern === "crypt") {
      const crossOffset = enemy.attackSequence % 2 === 0 ? 0 : Math.PI / 4;
      if (enemy.bossPhase === 1) {
        radial(4, crossOffset, 1.12);
      } else if (enemy.bossPhase === 2) {
        radial(6, crossOffset + enemy.attackSequence * 0.08);
        if (enemy.attackSequence % 2 === 0) this.spawnSummonedEnemy(enemy);
      } else {
        radial(8, crossOffset, 1.2);
        fan(5, 0.2, 1.08);
      }
      return;
    }

    if (pattern === "kennel") {
      if (enemy.bossPhase === 1) {
        fan(3, 0.28, 1.18);
        radial(4, enemy.attackSequence % 2 === 0 ? 0 : Math.PI / 4, 0.88);
      } else if (enemy.bossPhase === 2) {
        fan(5, 0.2, 1.12);
        if (enemy.attackSequence % 2 === 0) this.spawnSummonedEnemy(enemy);
      } else {
        radial(8, enemy.attackSequence * 0.18, 1.2);
        fan(3, 0.12, 1.3);
        if (enemy.attackSequence % 2 === 0) this.spawnSummonedEnemy(enemy);
      }
      return;
    }

    if (pattern === "frost") {
      if (enemy.bossPhase === 1) {
        radial(4, enemy.attackSequence % 2 ? Math.PI / 4 : 0, 1.15);
        this.spawnEnemyProjectile(enemy, enemy.attackAngle, 4, 4);
      } else if (enemy.bossPhase === 2) {
        radial(8, enemy.attackSequence * 0.12, 1.05);
        fan(3, 0.24, 1.18);
      } else {
        fan(7, 0.16, 1.22);
        radial(6, enemy.attackSequence * 0.2, 0.9);
      }
      return;
    }

    if (pattern === "sample") {
      if (enemy.bossPhase === 1) {
        fan(3, 0.3, 1.2);
        this.spawnEnemyProjectile(enemy, enemy.attackAngle, 4, 4);
      } else if (enemy.bossPhase === 2) {
        radial(8, enemy.attackSequence * 0.1, 1.02);
        if (enemy.attackSequence % 2 === 0) this.spawnSummonedEnemy(enemy);
      } else {
        fan(7, 0.13, 1.25);
        radial(4, enemy.attackSequence % 2 === 0 ? 0 : Math.PI / 4, 1.1);
        if (enemy.attackSequence % 3 === 0) this.spawnSummonedEnemy(enemy);
      }
      return;
    }

    if (pattern === "inferno") {
      if (enemy.bossPhase === 1) {
        radial(6, enemy.attackSequence * 0.32, 1.08);
      } else if (enemy.bossPhase === 2) {
        radial(8, enemy.attackSequence * 0.34, 1.12);
        radial(8, -enemy.attackSequence * 0.22 + Math.PI / 8, 0.82);
      } else {
        radial(12, enemy.attackSequence * 0.24, 1.18);
        fan(5, 0.18, 1.24);
      }
      return;
    }

    if (pattern === "code") {
      if (enemy.bossPhase === 1) {
        radial(5, enemy.attackSequence * 0.4, 1.15);
        if (enemy.attackSequence % 3 === 0) fan(3, 0.16, 1.05);
      } else if (enemy.bossPhase === 2) {
        radial(8, enemy.attackSequence * 0.28, 1.2);
        if (enemy.attackSequence % 3 === 0) this.spawnSummonedEnemy(enemy);
      } else {
        radial(10, enemy.attackSequence * 0.32, 1.28);
        radial(10, -enemy.attackSequence * 0.2 + Math.PI / 10, 0.85);
        fan(3, 0.1, 1.3);
        if (enemy.attackSequence % 3 === 0) this.spawnSummonedEnemy(enemy);
      }
      return;
    }

    if (enemy.bossPhase === 1) radial(enemy.projectileCount, enemy.attackSequence * 0.12);
    else if (enemy.bossPhase === 2) {
      radial(enemy.projectileCount + 2, enemy.attackSequence * 0.2, 1.08);
      this.spawnEnemyProjectile(enemy, enemy.attackAngle, 4, 4);
    } else {
      fan(5, 0.18);
      radial(Math.max(6, enemy.projectileCount), enemy.attackSequence * 0.28, 1.15);
    }
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      this.updateProjectileHoming(p, dt);
      p.update(dt);
      let environmentHitT = this.getProjectileEnvironmentHitT(p);
      let entityHit = false;
      let directEnemyId: number | undefined;

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
          const hitX = e.x;
          const hitY = e.y;
          p.x = p.previousX + (p.x - p.previousX) * closestHitT;
          p.y = p.previousY + (p.y - p.previousY) * closestHitT;
          const result = DamageSystem.damageEnemy(e, p.damage);
          p.hitEnemyIds.add(e.id);
          directEnemyId = e.id;
          if (result.applied) {
            this.applyProjectileKnockback(e, p);
            if (p.statusEffect && p.statusDuration > 0) {
              StatusEffectSystem.applyEnemy(e, p.statusEffect, p.statusDuration);
            }
            audio.playHit();
            this.fx.emitProjectileImpact(p, p.critical, this.engine.isPerformanceDegraded());
          }
          if (result.killed) {
            this.handleEnemyKilled(e);
            this.enemies.splice(closestEnemyIndex, 1);
            releaseEnemy(e);
          }
          if (result.applied && p.chainCount > 0 && p.chainRange > 0) {
            this.applyProjectileChain(p, hitX, hitY);
          }
          if (p.explosionRadius > 0) {
            entityHit = true;
          } else if (p.pierceRemaining > 0) {
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
            this.fx.emitDamage(this.player.x, this.player.y, this.engine.isPerformanceDegraded());
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

      if (!entityHit && environmentHitT !== null) {
        const proposedX = p.x;
        const proposedY = p.y;
        const impactX = p.previousX + (proposedX - p.previousX) * environmentHitT;
        const impactY = p.previousY + (proposedY - p.previousY) * environmentHitT;
        p.x = impactX;
        p.y = impactY;
        this.fx.emitProjectileImpact(p, p.critical, this.engine.isPerformanceDegraded());

        if (p.wallBouncesRemaining > 0) {
          const blockedX = proposedX < 0 || proposedX > 320 || this.isCollidingWithMap(proposedX, p.previousY, p.radius);
          const blockedY = proposedY < 0 || proposedY > 240 || this.isCollidingWithMap(p.previousX, proposedY, p.radius);
          if (blockedX || (!blockedX && !blockedY)) p.vx *= -1;
          if (blockedY || (!blockedX && !blockedY)) p.vy *= -1;
          p.x = p.previousX;
          p.y = p.previousY;
          p.wallBouncesRemaining--;
          environmentHitT = null;
        }
      }

      if (entityHit || environmentHitT !== null || p.life <= 0) {
        if (p.explosionRadius > 0 && !p.detonated) {
          this.detonateProjectile(p, directEnemyId);
        }
        this.projectiles.splice(i, 1);
        releaseProjectile(p);
      }
    }
  }

  private updateProjectileHoming(projectile: Projectile, dt: number) {
    if (projectile.faction !== "player" || projectile.homingStrength <= 0 || this.enemies.length === 0) return;
    let target: Enemy | null = null;
    let closestDistance = 150;
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0 || projectile.hitEnemyIds.has(enemy.id)) continue;
      const distance = Math.hypot(enemy.x - projectile.x, enemy.y - projectile.y);
      if (distance < closestDistance) {
        target = enemy;
        closestDistance = distance;
      }
    }
    if (!target) return;

    const targetAngle = Math.atan2(target.y - projectile.y, target.x - projectile.x);
    const velocity = rotateVelocityToward(
      projectile.vx,
      projectile.vy,
      targetAngle,
      projectile.homingStrength * dt,
    );
    projectile.vx = velocity.vx;
    projectile.vy = velocity.vy;
  }

  private applyProjectileChain(projectile: Projectile, sourceX: number, sourceY: number) {
    const visited = new Set(projectile.hitEnemyIds);
    let fromX = sourceX;
    let fromY = sourceY;

    for (let chainIndex = 0; chainIndex < projectile.chainCount; chainIndex++) {
      let target: Enemy | null = null;
      let closestDistance = projectile.chainRange;
      for (const enemy of this.enemies) {
        if (enemy.hp <= 0 || visited.has(enemy.id)) continue;
        const distance = Math.hypot(enemy.x - fromX, enemy.y - fromY);
        if (distance < closestDistance) {
          target = enemy;
          closestDistance = distance;
        }
      }
      if (!target) break;

      visited.add(target.id);
      projectile.hitEnemyIds.add(target.id);
      const targetX = target.x;
      const targetY = target.y;
      const damage = calculateChainDamage(
        projectile.damage,
        projectile.chainDamageMultiplier,
        chainIndex,
      );
      this.lightningArcs.push({
        x1: fromX,
        y1: fromY,
        x2: targetX,
        y2: targetY,
        life: 0.18,
        maxLife: 0.18,
      });
      const result = DamageSystem.damageEnemy(target, damage);
      if (result.applied) {
        if (projectile.statusEffect && projectile.statusDuration > 0) {
          StatusEffectSystem.applyEnemy(target, projectile.statusEffect, projectile.statusDuration);
        }
        this.fx.emitImpact(targetX, targetY, "#8DF6FF", false, this.engine.isPerformanceDegraded());
      }
      if (result.killed) {
        const targetIndex = this.enemies.indexOf(target);
        this.handleEnemyKilled(target);
        if (targetIndex >= 0) this.enemies.splice(targetIndex, 1);
        releaseEnemy(target);
      }
      fromX = targetX;
      fromY = targetY;
    }
  }

  private detonateProjectile(projectile: Projectile, directEnemyId?: number) {
    if (projectile.detonated || projectile.explosionRadius <= 0) return;
    projectile.detonated = true;
    const radius = projectile.explosionRadius;
    this.fx.emitExplosion(projectile.x, projectile.y, radius, projectile.color, this.engine.isPerformanceDegraded());
    this.engine.triggerScreenShake(Math.min(2.4, 0.8 + radius / 24), 0.12);

    for (let index = this.enemies.length - 1; index >= 0; index--) {
      const enemy = this.enemies[index];
      if (enemy.id === directEnemyId || enemy.hp <= 0) continue;
      const dx = enemy.x - projectile.x;
      const dy = enemy.y - projectile.y;
      const distance = Math.hypot(dx, dy);
      if (distance > radius + enemy.radius) continue;
      const falloff = calculateExplosionFalloff(distance, radius);
      const damage = calculateExplosionDamage(
        projectile.damage,
        projectile.explosionDamageMultiplier,
        distance,
        radius,
      );
      const result = DamageSystem.damageEnemy(enemy, damage);
      if (result.applied) {
        if (projectile.statusEffect && projectile.statusDuration > 0) {
          StatusEffectSystem.applyEnemy(enemy, projectile.statusEffect, projectile.statusDuration);
        }
        if (enemy.type !== "boss" && distance > 0) {
          const push = projectile.knockback * falloff;
          const nextX = enemy.x + dx / distance * push;
          const nextY = enemy.y + dy / distance * push;
          if (!this.isCollidingWithMap(nextX, enemy.y, enemy.radius)) enemy.x = nextX;
          if (!this.isCollidingWithMap(enemy.x, nextY, enemy.radius)) enemy.y = nextY;
        }
      }
      if (result.killed) {
        this.handleEnemyKilled(enemy);
        this.enemies.splice(index, 1);
        releaseEnemy(enemy);
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
           if (p.type === "mana" && this.player.mana >= this.player.maxMana - 1e-9) continue;
           let droppedWeapon: Pickup | null = null;
           if (p.type === "mana") {
              this.player.mana = Math.min(this.player.maxMana, this.player.mana + p.value);
           } else if (p.type === "hp") {
              this.player.hp = Math.min(this.player.maxHp, this.player.hp + p.value);
           } else if (p.type === "weapon" && p.weaponId) {
              const result = WeaponController.equipWeapon(this.player, p.weaponId);
              if (!result.consumed) continue;
              if (result.droppedWeaponId) {
                 droppedWeapon = acquirePickup(this.player.x, this.player.y, "weapon", 1, result.droppedWeaponId);
                 droppedWeapon.blockedUntilPlayerLeaves = true;
                 (droppedWeapon as any).bounceTimer = 0.2;
                 (droppedWeapon as any).baseY = droppedWeapon.y;
              }
           } else if (p.type === "coin") {
              this.engine.data.data.player.coins += p.value;
           }
           audio.playPickup();
           this.fx.emitPickup(p, this.engine.isPerformanceDegraded());
           this.pickups.splice(i, 1);
           releasePickup(p);
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
    
    // Pixel-grid enemy arrival telegraphs.
    for (const t of this.encounterCtrl.telegraphs) {
      const blink = Math.floor(t.timeLeft * 14) % 2 === 0;
      const color = t.isElite ? "rgba(241, 196, 15, 0.95)" : "rgba(231, 76, 60, 0.9)";
      const half = (t.type === "boss" ? 22 : 11) + (t.isElite ? 4 : 0);
      ctx.fillStyle = blink ? color : "rgba(255,255,255,0.45)";
      const size = t.type === "boss" ? 8 : 5;
      const corners = [
        [t.x - half, t.y - half, size, 2], [t.x - half, t.y - half, 2, size],
        [t.x + half - size, t.y - half, size, 2], [t.x + half - 2, t.y - half, 2, size],
        [t.x - half, t.y + half - 2, size, 2], [t.x - half, t.y + half - size, 2, size],
        [t.x + half - size, t.y + half - 2, size, 2], [t.x + half - 2, t.y + half - size, 2, size],
      ] as const;
      for (const [x, y, w, h] of corners) ctx.fillRect(Math.round(x), Math.round(y), w, h);
      ctx.fillStyle = t.isElite ? "rgba(241,196,15,0.2)" : "rgba(231,76,60,0.18)";
      const cell = t.type === "boss" ? 8 : 6;
      for (let y = -1; y <= 1; y++) {
        for (let x = -1; x <= 1; x++) {
          if ((x + y + (blink ? 1 : 0)) % 2 === 0) {
            ctx.fillRect(Math.round(t.x + x * cell - cell / 2), Math.round(t.y + y * cell - cell / 2), cell - 1, cell - 1);
          }
        }
      }
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

    if (currentRoom?.type === "npc") {
      const broadcast = this.getBroadcastPosition(currentRoom);
      ctx.save();
      ctx.translate(Math.round(broadcast.x), Math.round(broadcast.y));
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(-12, 9, 24, 4);
      ctx.fillStyle = currentRoom.interactionCompleted ? "#4D5656" : "#8E44AD";
      ctx.fillRect(-10, -14, 20, 24);
      ctx.fillStyle = "#17202A";
      ctx.fillRect(-7, -11, 14, 9);
      const signal = Math.floor(time * 6) % 4;
      const colors = ["#F1C40F", "#ECF0F1", "#2ECC71", "#FF7043"];
      colors.forEach((color, index) => {
        ctx.fillStyle = currentRoom.interactionCompleted ? "#566573" : color;
        ctx.fillRect(-6 + index * 4, -9 + ((index + signal) % 2), 3, 5);
      });
      ctx.fillStyle = "#BDC3C7";
      ctx.fillRect(-7, 1, 4, 5);
      ctx.fillRect(3, 1, 4, 5);
      ctx.fillStyle = "#09101A";
      ctx.fillRect(-8, 10, 4, 5);
      ctx.fillRect(4, 10, 4, 5);
      ctx.restore();
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
       EntityRenderer.drawProjectile(ctx, p, this.engine.data.settings.reducedFlashing);
    }
    this.fx.draw(ctx, this.engine.data.settings.reducedFlashing);
    ArtDirectionRenderer.drawWorldGrade(
      ctx,
      floor.theme || "forest",
      currentRoom,
      time,
      this.roomPhase === "combat",
      this.engine.isPerformanceDegraded(),
      this.engine.data.settings.reducedFlashing,
    );
    
    UIRenderer.draw(ctx, this.player, this.engine, floor, this.roomPhase);
    this.tutorial.draw(ctx, this.engine.input, this.engine.data.settings.language);
    
    if (this.roomPhase === "cleared" && this.phaseTimer > 0) {
      ctx.save();
      const alpha = Math.min(1, this.phaseTimer);
      ctx.fillStyle = `rgba(241, 196, 15, ${alpha})`;
      ctx.font = uiFont(this.engine.data.settings.language, 24, true);
      ctx.textAlign = "center";
      const yOffset = (1.0 - this.phaseTimer) * 10;
      ctx.fillText(t(this.engine.data.settings.language, "dungeon.roomClear"), 160, 100 - yOffset);
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
    PromptRenderer.draw(ctx, this.getInteractTarget(), time, this.engine.input.getPrompt("interact"), this.engine.data.settings.language);

    if (this.buffSelection) {
      BuffSelectionRenderer.draw(
        ctx,
        this.buffSelection,
        this.player.buffRerollsRemaining,
        this.buffSelectionIndex,
        this.engine.input.getPrompt("interact"),
        this.engine.input.getPrompt("swapWeapon"),
        this.engine.data.settings.language,
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
        this.engine.input.getCancelPrompt(),
        this.engine.data.settings.language,
      );
    }
    
    if (this.player.hp <= 0) {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, 0, 320, 240);
      ctx.fillStyle = "#E74C3C";
      ctx.font = uiFont(this.engine.data.settings.language, 20);
      ctx.textAlign = "center";
      ctx.fillText(t(this.engine.data.settings.language, "dungeon.died"), 160, 120);
      ctx.fillStyle = "#FFF";
      ctx.font = "10px monospace";
      ctx.fillText(t(this.engine.data.settings.language, "dungeon.retry", { prompt: this.engine.input.getPrompt("interact") }), 160, 150);
      ctx.textAlign = "left";
    }

    if (this.transitionAlpha > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${this.transitionAlpha})`;
      ctx.fillRect(0, 0, 320, 240);
    }
    
    // Optional debug info overlay. Hidden by default; toggle with F6.
    if (this.engine.isDebugOverlayVisible()) {
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
