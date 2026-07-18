import { Engine } from "../Engine";
import { UI_COLORS } from "../render/PixelUi";
import { generateStage, type Room, type ThemeId } from "../FloorGenerator";
import { isCombatCleared, isCombatRoom, markCombatCleared, normalizeRoomState } from "../RoomState";
import { Player, MAX_PLAYER_MANA } from "../entities/Player";
import { Projectile } from "../entities/Projectile";
import { RoomRenderer } from "../render/RoomRenderer";
import { EntityRenderer } from "../render/EntityRenderer";
import { Enemy } from "../entities/Enemy";
import { updateEnemyAnimation } from "../EnemyAnimation";
import {
  TILE_BREAKABLE,
  TILE_STRUCTURE,
  TILE_WALL,
  TILE_SIZE,
  getRoomTemplate,
  getMapData,
  isSolid,
  MAP_WIDTH,
  MAP_HEIGHT,
} from "../MapData";
import {
  circleIntersectsRect,
  DOOR_ORIENTATIONS,
  getDoorBarrierBounds,
  getDoorGeometry,
  getOppositeDoor,
  isDoorTransitionTriggered,
  type DoorOrientation,
} from "../dungeon/DoorGeometry";
import { UIRenderer } from "../render/UIRenderer";
import type { WeaponHudDrawOptions } from "../render/WeaponHudRenderer";
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
  calculateCloseRangeDamageMultiplier,
  calculateExplosionDamage,
  calculateExplosionFalloff,
  rotateVelocityToward,
} from "../combat/ProjectileEffects";
import { LightningArc, SkillController } from "../combat/SkillController";
import { getStageDifficulty } from "../combat/StageDifficulty";
import { BuffSystem, type BuffId } from "../combat/BuffSystem";
import { createSeededRandom, hashSeed } from "../Random";
import { WEAPONS, getProjectileProfile, isWeaponAvailableForCharacter, rollAvailableWeapon } from "../data/weapons";
import { usesDetailedCharacterArt } from "../data/characters";
import { BuffSelectionRenderer } from "../render/BuffSelectionRenderer";
import { ShopSystem, type ShopPurchaseFailure } from "../shop/ShopSystem";
import { ShopRenderer } from "../render/ShopRenderer";
import { SpecialRoomRenderer } from "../render/SpecialRoomRenderer";
import { ChestRenderer } from "../render/ChestRenderer";
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
import {
  DUNGEON_RITUAL_SPRING_SCALE,
  RoomObjectCollision,
  type RoomObjectCollisionChannel,
} from "../dungeon/RoomObjectCollision";
import { moveSweptCircle, type SweptCircleMoveResult } from "../physics/SweptCircleMovement";
import { drawRitualSpringPart, RITUAL_SPRING_GEOMETRY } from "../render/RitualSpringRenderer";
import { OcclusionController } from "../world/OcclusionController";
import type { WorldObjectDefinition, WorldRect } from "../world/WorldMap";

type RoomPhase = "entering" | "intro" | "locking" | "combat" | "cleared" | "reward" | "exiting" | "exploration";
interface DepthRenderable {
  id: string;
  sortY: number;
  draw: () => void;
}
type WeaponChest = {
  kind: "treasure" | "boss";
  x: number;
  y: number;
  weaponId: string;
  opened: boolean;
};

export type DungeonQaScene =
  | "treasure_closed"
  | "treasure_open"
  | "wish_fountain"
  | "portal_idle"
  | "portal_hovered"
  | "portal_activating"
  | "special_exit"
  | "special_wish"
  | "horizontal_corridor"
  | "vertical_corridor"
  | "corner_lt"
  | "hud_energy_0"
  | "hud_energy_33"
  | "hud_single_cost"
  | "hud_sustain"
  | "hud_heat"
  | "hud_dual"
  | "hud_long_en"
  | "hud_long_zh"
  | "hud_notice";

import { GameState } from "./GameState";
export class DungeonState extends GameState {
  protected engine: Engine;
  private player: Player;
  private projectiles: Projectile[] = [];
  private roomRenderer = new RoomRenderer();
  private fx = new PixelFxSystem();
  private enemies: Enemy[] = [];
  private pickups: Pickup[] = [];
  
  private chest: WeaponChest | null = null;
  
  private portal?: { x: number, y: number, state: PortalState, timer: number };
  
  private transitionState: "none" | "fade_in" | "fade_out" = "fade_in";
  private transitionAlpha: number = 1.0;
  private pendingTransition: (() => void) | null = null;
  
  private currentMapData: number[] = [];
  private readonly roomObjectCollision = new RoomObjectCollision();
  private readonly occlusionController = new OcclusionController();
  
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
  private qaPresentationTime: number | null = null;
  private qaFrozen = false;
  private qaCollisionDebug = false;
  private qaWeaponHudOptions: WeaponHudDrawOptions = {};

  constructor(engine: Engine) {
    super(engine);
    this.player = new Player(160, 120);
  }

  public capturesPauseInput(): boolean {
    return this.shopOpen;
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
    player.skillActiveTimer = player.characterId === "michele" || player.characterId === "kanami" || player.characterId === "celestia"
      ? 0
      : savedP.skillActiveTimer ?? 0;
    player.skillDirectionX = savedP.skillDirectionX ?? 0;
    player.skillDirectionY = savedP.skillDirectionY ?? 0;
    player.rogueCritTimer = savedP.rogueCritTimer ?? 0;
    player.mageArcaneCharge = savedP.mageArcaneCharge ?? 0;
    player.knightGuardReady = savedP.knightGuardReady ?? player.characterId === "knight";
    player.micheleMarkedEnemyId = savedP.micheleMarkedEnemyId ?? -1;
    player.micheleMarkTimer = savedP.micheleMarkTimer ?? 0;
    player.micheleTurretX = savedP.micheleTurretX ?? player.x;
    player.micheleTurretY = savedP.micheleTurretY ?? player.y;
    player.micheleTurretFireCooldown = 0;
    player.micheleTurretActive = false;
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
    this.clearRoomScopedSkillEntities();
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
    savedP.skillActiveTimer = this.player.characterId === "michele" || this.player.characterId === "kanami" || this.player.characterId === "celestia"
      ? 0
      : this.player.skillActiveTimer;
    savedP.skillDirectionX = this.player.skillDirectionX;
    savedP.skillDirectionY = this.player.skillDirectionY;
    savedP.rogueCritTimer = this.player.rogueCritTimer;
    savedP.mageArcaneCharge = this.player.mageArcaneCharge;
    savedP.knightGuardReady = this.player.knightGuardReady;
    savedP.micheleMarkedEnemyId = -1;
    savedP.micheleMarkTimer = 0;
    savedP.micheleTurretX = 0;
    savedP.micheleTurretY = 0;
    savedP.micheleTurretFireCooldown = 0;
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
    this.moveToNearestPassable(enemy, enemy.radius, "enemy");
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
      if (this.chest) r.weaponChest = { ...this.chest };
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

  private createOrRestoreWeaponChest(room: Room, kind: WeaponChest["kind"]): WeaponChest {
    if (room.weaponChest && room.weaponChest.kind === kind) {
      const storedWeapon = WEAPONS[room.weaponChest.weaponId];
      if (storedWeapon && isWeaponAvailableForCharacter(storedWeapon, this.player.characterId)) {
        const restored = { ...room.weaponChest };
        this.moveToNearestPassable(restored, 6);
        room.weaponChest = { ...restored };
        return restored;
      }
      room.weaponChest = undefined;
    }

    const floor = this.engine.data.data.floor;
    const template = getRoomTemplate(room);
    const seedLabel = kind === "boss" ? "boss-weapon-chest" : "treasure-weapon";
    const random = createSeededRandom(hashSeed(room.encounterSeed ?? floor.seed, seedLabel));
    const excluded = this.player.weaponSlots.filter((id): id is string => typeof id === "string");
    const weapon = rollAvailableWeapon(
      floor.globalStageIndex,
      random,
      kind === "boss" ? "boss" : "treasure",
      excluded,
      this.player.characterId,
    );

    let x: number;
    let y: number;
    if (kind === "boss") {
      const portalPoint = template.portalSpawnPoint ?? { x: 10, y: 7.5 };
      x = portalPoint.x * 16 + 8 - 48;
      y = portalPoint.y * 16 + 8;
    } else {
      const point = template.pickupSpawnPoints[0] ?? { x: 10, y: 7.5 };
      x = point.x * 16 + 8;
      y = point.y * 16 + 8;
    }

    const chest: WeaponChest = { kind, x, y, weaponId: weapon.id, opened: false };
    this.moveToNearestPassable(chest, 6);
    room.weaponChest = { ...chest };
    return chest;
  }

  private clearRoomScopedSkillEntities(): void {
    if (this.player.characterId === "michele") {
      this.player.skillActiveTimer = 0;
      this.player.micheleTurretActive = false;
      this.player.micheleTurretHitsRemaining = 0;
      this.player.micheleTurretFireCooldown = 0;
      this.player.micheleTurretX = this.player.x;
      this.player.micheleTurretY = this.player.y;
      this.player.micheleMarkedEnemyId = -1;
      this.player.micheleMarkTimer = 0;
    }
    if (this.player.characterId === "kanami") {
      this.player.skillActiveTimer = 0;
      this.player.kanamiBeaconX = this.player.x;
      this.player.kanamiBeaconY = this.player.y;
      this.player.kanamiBeaconVx = 0;
      this.player.kanamiBeaconVy = 0;
      this.player.kanamiBeaconFlightTimer = 0;
      this.player.kanamiBeaconDeployed = false;
    }
  }

  private loadRoom() {
    this.clearRoomScopedSkillEntities();
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
    this.roomObjectCollision.clear();
    this.rebuildRoomObjectCollision(currentRoom);
    this.moveToNearestPassable(this.player, this.player.radius, "player");
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
      this.finalizeRoomObjects(currentRoom);
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
      this.finalizeRoomObjects(currentRoom);
      this.setPhase("exploration");
      return;
    }

    if (currentRoom.type === "treasure") {
      if (!currentRoom.interactionCompleted || currentRoom.weaponChest) {
        this.chest = this.createOrRestoreWeaponChest(currentRoom, "treasure");
      }
      this.finalizeRoomObjects(currentRoom);
      this.setPhase("exploration");
      return;
    }

    if (currentRoom.type === "shop") {
      currentRoom.shopStock = ShopSystem.reconcileStock(floor, currentRoom, this.player);
      for (const item of currentRoom.shopStock) {
        if (item.weaponId) this.engine.data.discoverWeapon(item.weaponId);
        if (item.buffId) this.engine.data.discoverBuff(item.buffId);
      }
      this.finalizeRoomObjects(currentRoom);
      this.setPhase("exploration");
      return;
    }

    if (
      currentRoom.type === "legacy_rpg" ||
      currentRoom.type === "legacy_tactics" ||
      currentRoom.type === "wish_fountain" ||
      currentRoom.type === "photo_booth"
    ) {
      this.finalizeRoomObjects(currentRoom);
      this.setPhase("exploration");
      return;
    }

    if (isCombatRoom(currentRoom)) {
      if (isCombatCleared(currentRoom)) {
        currentRoom.enemies = [];
        currentRoom.encounterState = undefined;

        if (currentRoom.rewardGenerated !== true) {
          this.finalizeRoomObjects(currentRoom);
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
          if (!currentRoom.interactionCompleted || currentRoom.weaponChest) {
            this.chest = this.createOrRestoreWeaponChest(currentRoom, "boss");
          }
        }

        this.finalizeRoomObjects(currentRoom);
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
          this.finalizeRoomObjects(currentRoom);
          this.setPhase("combat", { startEncounter: false });
          return;
        } catch (error) {
          console.warn(`[DungeonState] Invalid encounter state in room ${currentRoom.id}; using enemy fallback.`, error);
          currentRoom.encounterState = undefined;
          this.encounterCtrl = new EncounterController();
        }
      }

      this.finalizeRoomObjects(currentRoom);
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
      const floor = this.engine.data.data.floor;
      const room = floor.rooms.find(candidate =>
        candidate.x === floor.currentRoomX && candidate.y === floor.currentRoomY
      );
      this.phaseTimer = room?.type === "boss" ? 0.5 : 0.25;
    } else if (phase === "combat") {
      const activeFloor = this.engine.data.data.floor;
      const activeRoom = activeFloor.rooms.find(
        room => room.x === activeFloor.currentRoomX && room.y === activeFloor.currentRoomY,
      );
      if (activeRoom?.type === "boss") this.engine.data.startBossFight();
      if (options?.startEncounter === false) {
         return;
      }
      this.emitCombatLifecycleNotice("combat_started", activeRoom?.type === "boss");
      
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
      this.emitCombatLifecycleNotice("combat_cleared");
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

  private emitCombatLifecycleNotice(
    event: "combat_started" | "combat_cleared",
    boss = false,
  ): void {
    const language = this.engine.data.settings.language;
    if (event === "combat_started") {
      this.engine.worldNotices.showBottom(
        t(language, boss ? "notice.bossCombatStarted" : "notice.combatStarted"),
        boss ? "red" : "yellow",
      );
      return;
    }
    this.engine.worldNotices.showBottom(t(language, "notice.combatCleared"), "yellow");
  }
  
  private prepareBuffChoice(floor: typeof this.engine.data.data.floor, currentRoom: Room) {
    if (floor.buffChoiceCompleted || floor.buffChoiceOptions?.length) return;
    if (this.player.buffs.length >= BuffSystem.ACTIVE_REWARD_BUFF_LIMIT) {
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
    if (this.engine.input.wasUiPressed("secondary") && this.player.buffRerollsRemaining > 0) {
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
    const movePrevious = this.engine.input.wasUiPressed("left") || this.engine.input.wasUiPressed("up");
    const moveNext = this.engine.input.wasUiPressed("right") || this.engine.input.wasUiPressed("down");
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
      : this.engine.input.wasUiPressed("confirm")
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
    this.engine.input.suppressUntilReleased();
  }

  private updateShop(dt: number) {
    this.shopFailureTimer = Math.max(0, this.shopFailureTimer - dt);
    if (this.shopFailureTimer <= 0) this.shopFailure = undefined;

    if (this.engine.input.wasUiPressed("cancel")) {
      this.shopOpen = false;
      this.shopFailure = undefined;
      this.engine.input.suppressUntilReleased();
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
    const movePrevious = this.engine.input.wasUiPressed("left") || this.engine.input.wasUiPressed("up");
    const moveNext = this.engine.input.wasUiPressed("right") || this.engine.input.wasUiPressed("down");
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
      : this.engine.input.wasUiPressed("confirm")
        ? this.shopSelectionIndex
        : -1;
    if (selectedIndex < 0 || selectedIndex >= room.shopStock.length) return;

    const item = room.shopStock[selectedIndex];
    const coins = this.engine.data.data.player.coins;
    const result = ShopSystem.purchase(this.player, item, coins);
    if (!result.success) {
      this.shopFailure = result.reason;
      this.shopFailureTimer = 1.4;
      this.engine.worldNotices.showBottom(
        t(this.engine.data.settings.language, "notice.purchaseFailed"),
        "red",
      );
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
    this.engine.worldNotices.showBottom(
      t(this.engine.data.settings.language, "notice.interactionComplete"),
      "cyan",
    );
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
       this.chest = this.createOrRestoreWeaponChest(currentRoom, "boss");
       this.pickups.push(acquirePickup(216, 120, "hp", Math.round(20 * difficulty.rewardMultiplier)));
       this.pickups.push(acquirePickup(152, 120, "coin", Math.round(50 * difficulty.rewardMultiplier)));
    } else if (currentRoom.type === "combat") {
       this.pickups.push(acquirePickup(
         160,
         120,
         Math.random() > 0.5 ? "hp" : "mana",
         Math.round(8 * difficulty.rewardMultiplier),
       ));
       this.pickups.push(acquirePickup(150, 110, "coin", Math.round(20 * difficulty.rewardMultiplier)));
    } else if (currentRoom.type === "treasure") {
       this.chest = this.createOrRestoreWeaponChest(currentRoom, "treasure");
    }
    
    // Animate pickups (pop out)
    for (const p of this.pickups) {
      if ((p as any).bounceTimer === undefined) {
          (p as any).bounceTimer = 0.2;
          (p as any).baseY = p.y;
      }
    }
    currentRoom.rewardGenerated = true;
    this.finalizeRoomObjects(currentRoom);
    this.syncPlayerState();
    this.syncRoomState();
    this.engine.data.save();
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
    if (this.qaFrozen) {
      if (this.qaPresentationTime !== null) this.roomRenderer.setPresentationTime(this.qaPresentationTime);
      return;
    }
    this.syncMusicScene();
    this.roomRenderer.update(dt);
    this.fx.update(dt);
    this.occlusionController.update(
      dt,
      { x: this.player.x - 16, y: this.player.y - 31, width: 32, height: 35 },
      this.player.y,
      this.getDungeonOcclusionObjects(),
    );

    if (this.transitionState === "fade_in") {
      this.transitionAlpha -= dt * 2;
      if (this.transitionAlpha <= 0) {
        this.transitionAlpha = 0;
        this.transitionState = "none";
        if (this.roomPhase === "entering") {
          const floor = this.engine.data.data.floor;
          const room = floor.rooms.find(candidate =>
            candidate.x === floor.currentRoomX && candidate.y === floor.currentRoomY
          );
          this.setPhase(room?.type === "boss" ? "intro" : "locking");
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
    this.player.weaponRecoilVisual = Math.max(0, this.player.weaponRecoilVisual - dt * 18);
    if (this.player.hitFlash > 0) {
      this.player.hitFlash = Math.max(0, this.player.hitFlash - dt);
    }
    SkillController.update(this.player, dt);
    this.updateMicheleTurret(dt);
    this.updateKanamiBeacon(dt);
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
      this.engine.input.wasActionPressed("swapWeapon")
    ) {
      if (WeaponController.switchWeapon(this.player)) {
        this.player.muzzleFlash = 0;
        audio.playPickup();
      }
    }

    const canFireWeapon = ["combat", "cleared", "reward", "exiting", "exploration"].includes(this.roomPhase);
    const fireHeld = this.engine.input.isActionDown("fire");
    WeaponController.updateRuntime(this.player, dt, fireHeld);
    const activeWeapon = WEAPONS[this.player.currentWeaponId];
    const heldYoyo = activeWeapon?.attackMode === "yoyo"
      ? this.projectiles.find(projectile =>
          projectile.faction === "player" &&
          projectile.weaponId === activeWeapon.id &&
          projectile.style === "yoyo"
        )
      : undefined;
    this.player.activeYoyoWeaponId = heldYoyo?.weaponId ?? "";
    this.updateTerrarianYoyo(
      dt,
      Boolean(heldYoyo && fireHeld && canFireWeapon && this.transitionState === "none"),
    );
    if (activeWeapon?.attackMode === "channel" && fireHeld && canFireWeapon && this.transitionState === "none") {
      this.player.weaponChannelTime = Math.min(
        activeWeapon.channelTime ?? 3.2,
        this.player.weaponChannelTime + dt,
      );
    } else {
      this.player.weaponChannelTime = 0;
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
      fireHeld &&
      this.player.fireCooldown <= 0 &&
      canFireWeapon &&
      !heldYoyo
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
             const transition = this.engine.data.advanceStage();
             if (transition.chapterChanged) {
               const chapter = Math.max(1, Math.min(4, transition.current.chapterIndex));
               this.engine.worldNotices.showRegion(
                 t(this.engine.data.settings.language, `notice.chapter.${chapter}.title` as Parameters<typeof t>[1]),
                 t(this.engine.data.settings.language, `notice.chapter.${chapter}.name` as Parameters<typeof t>[1]),
                 3.6,
               );
             }
             this.player.x = 160;
             this.player.y = 120;
             this.engine.input.suppressUntilReleased();
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
    const floor = this.engine.data.data.floor;
    const currentRoom = floor.rooms.find(room =>
      room.x === floor.currentRoomX && room.y === floor.currentRoomY
    );
    const bossSlowPacing = currentRoom?.type === "boss"
      && (this.roomPhase === "intro" || this.roomPhase === "locking");

    let speedMult = 1.0;
    if (bossSlowPacing) speedMult = 0.2;
    if (this.portal?.state === "activating") speedMult = 0;
    
    if (this.player.hp > 0 && this.transitionState === "none") {
       const axis = this.engine.input.getAxis();
       const isDashing = SkillController.isRogueDashing(this.player);
       const statusMovement = StatusEffectSystem.getMovementMultiplier(this.player);
       const inputX = isDashing ? this.player.skillDirectionX : axis.x;
       const inputY = isDashing ? this.player.skillDirectionY : axis.y;
       const moveSpeed = (isDashing
         ? SkillController.ROGUE_DASH_SPEED * speedMult
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

       this.moveCircleEntity(
         this.player,
         velocityX * dt,
         velocityY * dt,
         this.player.radius,
         "player",
       );
       
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

  public qaSetScene(scene: DungeonQaScene, theme: ThemeId = "forest", time = 12.5): boolean {
    if (!this.engine.debugMode || !Number.isFinite(time)) return false;
    const floor = this.engine.data.data.floor;
    const room = floor.rooms.find(candidate =>
      candidate.x === floor.currentRoomX && candidate.y === floor.currentRoomY
    );
    if (!room) return false;

    floor.theme = theme;
    room.type = "start";
    room.templateId = "legacy_room";
    room.cleared = true;
    room.combatCleared = true;
    room.rewardGenerated = true;
    room.interactionCompleted = false;
    room.weaponChest = undefined;
    room.enemies = [];
    room.pickups = [];
    room.destroyedPropTiles = [];
    room.encounterState = undefined;
    room.doors = { up: true, down: true, left: true, right: true };

    if (scene === "treasure_closed" || scene === "treasure_open") {
      const opened = scene === "treasure_open";
      room.type = "treasure";
      room.weaponChest = {
        kind: "treasure",
        x: 160,
        y: 120,
        weaponId: "pistol",
        opened,
      };
      room.interactionCompleted = opened;
    } else if (scene === "wish_fountain" || scene === "special_wish") {
      room.type = "wish_fountain";
    } else if (
      scene === "portal_idle"
      || scene === "portal_hovered"
      || scene === "portal_activating"
      || scene === "special_exit"
    ) {
      room.type = "exit";
    } else if (!scene.startsWith("hud_")) {
      room.templateId = scene;
    }

    this.qaPresentationTime = Math.max(0, time);
    this.qaFrozen = true;
    this.qaCollisionDebug = false;
    this.qaWeaponHudOptions = {};
    this.player.characterId = "knight";
    this.player.x = 160;
    this.player.y = 198;
    this.player.hp = Math.max(1, this.player.maxHp);
    this.player.animState = "idle";
    this.player.animFrame = 0;
    this.player.animTimer = 0;
    this.player.facing = "right";
    this.player.facingLeft = false;
    this.tutorial.reset(true);
    this.loadRoom();

    if (this.portal) {
      if (scene === "portal_hovered") this.portal.state = "hovered";
      else if (scene === "portal_activating") {
        this.portal.state = "activating";
        this.portal.timer = 0.12;
      } else this.portal.state = "idle";
    }
    this.transitionState = "none";
    this.transitionAlpha = 0;
    this.pendingTransition = null;
    this.roomPhase = "exploration";
    this.phaseTimer = 0;

    if (scene.startsWith("hud_")) {
      this.engine.data.settings.language = scene === "hud_long_zh" ? "zh-CN" : "en";
      this.player.maxMana = 50;
      this.player.mana = scene === "hud_energy_0" ? 0 : 33;
      this.player.weaponHeat = 0;
      this.player.weaponHeatWeaponId = undefined;
      this.player.weaponOverheatTimer = 0;
      if (scene === "hud_sustain") {
        this.player.setWeaponLoadout(["terrarian"], 0);
      } else if (scene === "hud_heat") {
        this.player.setWeaponLoadout(["mg42"], 0);
        this.player.weaponHeatWeaponId = "mg42";
        this.player.weaponHeat = 72;
      } else if (scene === "hud_dual") {
        this.player.setWeaponLoadout(["na_45", "shotgun"], 0);
      } else if (scene === "hud_long_en") {
        this.player.setWeaponLoadout(["butterfly_emerald", "pistol"], 0);
        this.qaWeaponHudOptions.activeNameOverride = "BUTTERFLY KNIFE GAMMA DOPPLER EMERALD PROTOTYPE";
      } else if (scene === "hud_long_zh") {
        this.player.setWeaponLoadout(["butterfly_emerald", "pistol"], 0);
        this.qaWeaponHudOptions.activeNameOverride = "蝴蝶刀伽马多普勒翡翠实验型超长名称";
      } else {
        this.player.setWeaponLoadout(["na_45"], 0);
      }
      if (scene === "hud_notice") {
        this.engine.worldNotices.showBottom(t(this.engine.data.settings.language, "notice.combatCleared"), "yellow", 10);
      }
    }
    this.environmentTime = this.qaPresentationTime;
    this.roomRenderer.setPresentationTime(this.qaPresentationTime);
    this.player.x = 160;
    this.player.y = 198;
    this.moveToNearestPassable(this.player, this.player.radius, "player");
    this.rebuildRoomObjectCollision(room);
    return true;
  }

  public qaSetCollisionDebug(enabled: boolean): boolean {
    if (!this.engine.debugMode) return false;
    this.qaCollisionDebug = enabled;
    return true;
  }

  public getPlayer(): Player {
    return this.player;
  }

  private areRoomDoorsLocked(): boolean {
    return !["exploration", "exiting"].includes(this.roomPhase) || this.portal?.state === "activating";
  }

  private beginDoorTransition(orientation: DoorOrientation): void {
    const floor = this.engine.data.data.floor;
    const destinationDoor = getDoorGeometry(getOppositeDoor(orientation), this.player.radius);
    const roomDelta: Record<DoorOrientation, { x: number; y: number }> = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    };
    const delta = roomDelta[orientation];
    this.transitionState = "fade_out";
    this.pendingTransition = () => {
      this.syncRoomState();
      floor.currentRoomX += delta.x;
      floor.currentRoomY += delta.y;
      this.player.x = destinationDoor.entryPoint.x;
      this.player.y = destinationDoor.entryPoint.y;
      this.loadRoom();
    };
  }

  private handleDoorTransitions() {
    const floor = this.engine.data.data.floor;
    const currentRoom = floor.rooms.find((r: any) => r.x === floor.currentRoomX && r.y === floor.currentRoomY);
    const doorsLocked = this.areRoomDoorsLocked();

    if (currentRoom && !doorsLocked && this.transitionState === "none") {
      for (const orientation of DOOR_ORIENTATIONS) {
        if (!currentRoom.doors[orientation]) continue;
        const geometry = getDoorGeometry(orientation, this.player.radius);
        if (!isDoorTransitionTriggered(geometry, this.player.x, this.player.y)) continue;
        this.beginDoorTransition(orientation);
        return;
      }
    }

    this.player.x = Math.max(TILE_SIZE, Math.min(MAP_WIDTH * TILE_SIZE - TILE_SIZE, this.player.x));
    this.player.y = Math.max(TILE_SIZE, Math.min(MAP_HEIGHT * TILE_SIZE - TILE_SIZE, this.player.y));
  }

  private getShopPosition(room: Room): { x: number; y: number } {
    const template = getRoomTemplate(room);
    const point = template.pickupSpawnPoints[0] ?? { x: 10, y: 7.5 };
    return { x: point.x * 16 + 8, y: point.y * 16 + 8 };
  }

  private getBroadcastPosition(room: Room): { x: number; y: number } {
    // NPC-room carpet is authored around the exact world-space center.
    return { x: 160, y: 120 };
  }

  private getSpecialRoomPosition(_room: Room): { x: number; y: number } {
    return { x: 160, y: 120 };
  }

  private getLegacyPosition(room: Room): { x: number; y: number } {
    const point = getRoomTemplate(room).legacySpawnPoint ?? { x: 10, y: 7 };
    return { x: point.x * TILE_SIZE + TILE_SIZE / 2, y: point.y * TILE_SIZE + TILE_SIZE / 2 };
  }

  private rebuildRoomObjectCollision(room: Room): void {
    this.roomObjectCollision.rebuild({
      roomType: room.type,
      chest: this.chest ? { kind: this.chest.kind, x: this.chest.x, y: this.chest.y } : null,
      portal: this.portal ? { x: this.portal.x, y: this.portal.y } : null,
      shop: room.type === "shop" ? this.getShopPosition(room) : null,
      broadcast: room.type === "npc" ? this.getBroadcastPosition(room) : null,
      special: room.type === "wish_fountain" || room.type === "photo_booth"
        ? this.getSpecialRoomPosition(room)
        : null,
      legacy: room.type === "legacy_rpg" || room.type === "legacy_tactics"
        ? this.getLegacyPosition(room)
        : null,
    });
  }

  private finalizeRoomObjects(room: Room): void {
    this.rebuildRoomObjectCollision(room);
    this.moveToNearestPassable(this.player, this.player.radius, "player");
    for (const enemy of this.enemies) this.moveToNearestPassable(enemy, enemy.radius, "enemy");
    for (const pickup of this.pickups) this.moveToNearestPassable(pickup, 4, "player");
  }

  private canInteractWith(
    anchorX: number,
    anchorY: number,
    range: number,
    losX = anchorX,
    losY = anchorY,
  ): boolean {
    return Math.hypot(this.player.x - anchorX, this.player.y - anchorY) < range
      && this.hasLineOfSight(this.player.x, this.player.y, losX, losY);
  }

  private canInteractWithFootprint(
    colliderPrefix: string,
    range: number,
    requireSouth = false,
  ): { x: number; y: number } | null {
    const resolved = this.roomObjectCollision.resolveInteractionShell(
      this.player.x,
      this.player.y,
      colliderPrefix,
      range,
      requireSouth,
    );
    if (!resolved) return null;
    return this.hasLineOfSight(
      this.player.x,
      this.player.y,
      resolved.x,
      resolved.y,
      resolved.colliderIds,
    )
      ? { x: resolved.x, y: resolved.y }
      : null;
  }

  private notifyInteractionComplete(): void {
    this.engine.worldNotices.showBottom(
      t(this.engine.data.settings.language, "notice.interactionComplete"),
      "cyan",
    );
  }

  private handleInteract(target: any) {
    if (target.type === "portal" && this.portal) {
       this.portal.state = "activating";
       this.portal.timer = 0.4;
       audio.playPortal();
    } else if (target.type === "legacy_rpg" || target.type === "legacy_tactics") {
       this.engine.input.suppressUntilReleased();
       this.engine.switchState(target.type, { sourceRoomId: target.roomId });
    } else if (target.type === "wish_fountain" || target.type === "photo_booth") {
       const floor = this.engine.data.data.floor;
       const room = floor.rooms.find((candidate: Room) => candidate.id === target.roomId);
       if (!room || room.interactionCompleted) return;
       const random = createSeededRandom(hashSeed(room.encounterSeed ?? floor.seed, target.type));
       if (target.type === "wish_fountain") {
         const reward = Math.floor(random() * 4);
         if (reward === 0) this.player.hp = Math.min(this.player.maxHp, this.player.hp + 3);
         else if (reward === 1) this.player.mana = Math.min(this.player.maxMana, this.player.mana + 16);
         else if (reward === 2) this.pickups.push(acquirePickup(target.x, target.y + 18, "coin", 32));
         else this.player.buffRerollsRemaining += 1;
       } else {
         this.player.buffRerollsRemaining += 1;
         this.pickups.push(acquirePickup(target.x, target.y + 18, "coin", 18));
       }
       room.interactionCompleted = true;
       room.rewardGenerated = true;
       audio.playClearRoom();
       this.fx.emitRoomClear(target.x, target.y, this.engine.isPerformanceDegraded());
       this.syncRoomState();
       this.syncPlayerState();
       this.engine.data.save();
       this.notifyInteractionComplete();
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
         this.notifyInteractionComplete();
       }
    } else if (target.type === "treasure" && this.chest && !this.chest.opened) {
       this.chest.opened = true;
       audio.playPickup();
       const floor = this.engine.data.data.floor;
       const currentRoom = floor.rooms.find((r: any) => r.x === floor.currentRoomX && r.y === floor.currentRoomY);
       if (currentRoom) {
          currentRoom.interactionCompleted = true;
          currentRoom.rewardGenerated = true;
          currentRoom.weaponChest = { ...this.chest };
       }
       this.pickups.push(acquirePickup(this.chest.x, this.chest.y + 10, "weapon", 1, this.chest.weaponId));
       this.engine.data.discoverWeapon(this.chest.weaponId);
       this.syncPlayerState();
       this.syncRoomState();
       this.engine.data.save();
       this.notifyInteractionComplete();
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
      if (this.canInteractWithFootprint("broadcast_terminal", 28)) {
        return { type: "broadcast", x: broadcast.x, y: broadcast.y, roomId: currentRoom.id };
      }
    }

    if (
      currentRoom &&
      (currentRoom.type === "wish_fountain" || currentRoom.type === "photo_booth") &&
      !currentRoom.interactionCompleted
    ) {
      const special = this.getSpecialRoomPosition(currentRoom);
      const prefix = currentRoom.type === "wish_fountain" ? "wish_fountain:" : "photo_booth";
      if (this.canInteractWithFootprint(prefix, 30)) {
        return { type: currentRoom.type, x: special.x, y: special.y, roomId: currentRoom.id };
      }
    }

    if (currentRoom && (currentRoom.type === "legacy_rpg" || currentRoom.type === "legacy_tactics") && !currentRoom.interactionCompleted) {
      const legacy = this.getLegacyPosition(currentRoom);
      if (this.canInteractWithFootprint("legacy_device", 28)) {
         return { type: currentRoom.type, x: legacy.x, y: legacy.y, roomId: currentRoom.id };
      }
    }

    if (currentRoom?.type === "shop") {
      const shop = this.getShopPosition(currentRoom);
      if (this.canInteractWithFootprint("shop_counter", 30, true)) {
        return { type: "shop", x: shop.x, y: shop.y, roomId: currentRoom.id };
      }
    }

    if (this.portal && this.portal.state !== "spawning" && this.portal.state !== "activating") {
      if (this.canInteractWithFootprint("portal:", 30)) {
         return { type: "portal", x: this.portal.x, y: this.portal.y };
      }
    }
    
    if (this.chest && !this.chest.opened) {
      if (this.canInteractWithFootprint(this.chest.kind === "boss" ? "boss_chest" : "treasure_chest", 28)) {
         return { type: "treasure", x: this.chest.x, y: this.chest.y };
      }
    }

    return null;
  }

  private moveToNearestPassable(
    entity: { x: number; y: number },
    radius: number,
    channel: RoomObjectCollisionChannel = "player",
  ): void {
    if (!this.isCircleBlocked(entity.x, entity.y, radius, channel)) return;
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
          if (this.isCircleBlocked(x, y, radius, channel)) continue;
          entity.x = x;
          entity.y = y;
          return;
        }
      }
    }
    entity.x = 160;
    entity.y = 120;
  }

  private circleOverlapsTile(x: number, y: number, radius: number, tileX: number, tileY: number): boolean {
    const left = tileX * TILE_SIZE;
    const top = tileY * TILE_SIZE;
    const closestX = Math.max(left, Math.min(x, left + TILE_SIZE));
    const closestY = Math.max(top, Math.min(y, top + TILE_SIZE));
    const dx = x - closestX;
    const dy = y - closestY;
    return dx * dx + dy * dy < radius * radius;
  }

  private isCircleBlocked(
    x: number,
    y: number,
    radius: number,
    channel: RoomObjectCollisionChannel = "player",
  ): boolean {
    if (x - radius < 0 || x + radius > MAP_WIDTH * TILE_SIZE || y - radius < 0 || y + radius > MAP_HEIGHT * TILE_SIZE) {
      return true;
    }

    const minTileX = Math.max(0, Math.floor((x - radius) / TILE_SIZE));
    const maxTileX = Math.min(MAP_WIDTH - 1, Math.floor((x + radius) / TILE_SIZE));
    const minTileY = Math.max(0, Math.floor((y - radius) / TILE_SIZE));
    const maxTileY = Math.min(MAP_HEIGHT - 1, Math.floor((y + radius) / TILE_SIZE));

    // Check static tile architecture, then destructible breakables, then the
    // current room-object scene. Every caller selects a blocking channel.
    for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
        const tileId = this.currentMapData[tileY * MAP_WIDTH + tileX];
        if (tileId !== TILE_WALL && tileId !== TILE_STRUCTURE) continue;
        if (this.circleOverlapsTile(x, y, radius, tileX, tileY)) return true;
      }
    }
    for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
        if (this.currentMapData[tileY * MAP_WIDTH + tileX] !== TILE_BREAKABLE) continue;
        if (this.circleOverlapsTile(x, y, radius, tileX, tileY)) return true;
      }
    }
    if (this.areRoomDoorsLocked()) {
      const floor = this.engine.data?.data?.floor;
      const room = floor?.rooms.find(candidate =>
        candidate.x === floor.currentRoomX && candidate.y === floor.currentRoomY
      );
      if (room) {
        for (const orientation of DOOR_ORIENTATIONS) {
          if (!room.doors[orientation]) continue;
          const barrier = getDoorBarrierBounds(getDoorGeometry(orientation, radius));
          if (circleIntersectsRect(x, y, radius, barrier)) return true;
        }
      }
    }
    return this.roomObjectCollision.isCircleBlocked(x, y, radius, channel);
  }

  private moveCircleEntity(
    entity: { x: number; y: number },
    deltaX: number,
    deltaY: number,
    radius: number,
    channel: RoomObjectCollisionChannel,
  ): SweptCircleMoveResult {
    const moved = moveSweptCircle({
      x: entity.x,
      y: entity.y,
      radius,
      deltaX,
      deltaY,
      isBlocked: (candidateX, candidateY, candidateRadius) =>
        this.isCircleBlocked(candidateX, candidateY, candidateRadius, channel),
    });
    entity.x = moved.x;
    entity.y = moved.y;
    return moved;
  }

  private findBreakableTileAt(x: number, y: number, radius: number): number | null {
    const minTileX = Math.max(0, Math.floor((x - radius) / TILE_SIZE));
    const maxTileX = Math.min(MAP_WIDTH - 1, Math.floor((x + radius) / TILE_SIZE));
    const minTileY = Math.max(0, Math.floor((y - radius) / TILE_SIZE));
    const maxTileY = Math.min(MAP_HEIGHT - 1, Math.floor((y + radius) / TILE_SIZE));
    for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
        const index = tileY * MAP_WIDTH + tileX;
        if (this.currentMapData[index] !== TILE_BREAKABLE) continue;
        const closestX = Math.max(tileX * TILE_SIZE, Math.min(x, tileX * TILE_SIZE + TILE_SIZE));
        const closestY = Math.max(tileY * TILE_SIZE, Math.min(y, tileY * TILE_SIZE + TILE_SIZE));
        if (Math.hypot(x - closestX, y - closestY) <= radius + 1) return index;
      }
    }
    return null;
  }

  private destroyBreakableTileAt(x: number, y: number, radius: number): boolean {
    const index = this.findBreakableTileAt(x, y, radius);
    if (index === null) return false;
    this.currentMapData[index] = 0;
    const floor = this.engine.data.data.floor;
    const currentRoom = floor.rooms.find((room: Room) =>
      room.x === floor.currentRoomX && room.y === floor.currentRoomY
    );
    if (currentRoom) {
      currentRoom.destroyedPropTiles ??= [];
      if (!currentRoom.destroyedPropTiles.includes(index)) currentRoom.destroyedPropTiles.push(index);
    }
    this.engine.triggerScreenShake(0.6, 0.06);
    return true;
  }

  private hasLineOfSight(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    ignoredColliderIds: readonly string[] = [],
  ): boolean {
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(distance / 6));
    for (let step = 1; step < steps; step++) {
      const t = step / steps;
      const x = startX + dx * t;
      const y = startY + dy * t;
      const tileX = Math.floor(x / TILE_SIZE);
      const tileY = Math.floor(y / TILE_SIZE);
      const tileId = this.currentMapData[tileY * MAP_WIDTH + tileX];
      if (tileId === TILE_WALL || tileId === TILE_STRUCTURE || tileId === TILE_BREAKABLE) return false;
    }
    return this.roomObjectCollision.hasLineOfSight(
      startX,
      startY,
      endX,
      endY,
      "projectile",
      2,
      ignoredColliderIds,
    );
  }

  // TODO: Move to PlayerController
  private updatePlayerFacingAndAnimation(dt: number, moved: boolean) {
    this.player.facing = Math.cos(this.player.aimAngle) >= 0 ? "right" : "left";
    this.player.facingLeft = this.player.facing === "left";
    const hasExtendedPlayerAnimation = usesDetailedCharacterArt(this.player.characterId);

    if (moved) {
      this.player.animState = "walk";
      this.player.animTimer += dt;
      this.player.animFrame = Math.floor(this.player.animTimer * 8) % (hasExtendedPlayerAnimation ? 4 : 2);
    } else {
      this.player.animState = "idle";
      if (hasExtendedPlayerAnimation) {
        this.player.animTimer += dt;
        this.player.animFrame = Math.floor(this.player.animTimer * 1.8) % 2;
      } else {
        this.player.animFrame = 0;
      }
    }
  }

  // TODO: Move to PlayerController
  private updateTerrarianYoyo(dt: number, sustaining: boolean): void {
    const yoyo = this.projectiles.find(projectile =>
      projectile.faction === "player" &&
      projectile.weaponId === "terrarian" &&
      projectile.style === "yoyo"
    );
    if (!yoyo) {
      this.player.terrarianOrbCooldown = 0;
      return;
    }
    if (!sustaining) return;

    const weapon = WEAPONS.terrarian;
    const sustainCost = Math.max(0, weapon.sustainEnergyPerSecond ?? 0) * dt;
    if (this.player.mana + 1e-9 < sustainCost) return;
    this.player.mana = Math.max(0, this.player.mana - sustainCost);
    if (sustainCost > 0) this.player.manaRechargeTimer = this.player.manaRechargeDelay;
    yoyo.life = Math.max(yoyo.life, 0.3);

    this.player.terrarianOrbCooldown -= dt;
    if (this.player.terrarianOrbCooldown > 0 || this.enemies.length === 0) return;
    this.player.terrarianOrbCooldown = 0.38;

    let target: Enemy | undefined;
    let closest = 180;
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      const distance = Math.hypot(enemy.hitboxX - yoyo.x, enemy.hitboxY - yoyo.y);
      if (distance < closest) {
        closest = distance;
        target = enemy;
      }
    }
    const angle = target
      ? Math.atan2(target.hitboxY - yoyo.y, target.hitboxX - yoyo.x)
      : this.player.aimAngle;
    const orb = acquireProjectile(
      yoyo.x,
      yoyo.y,
      Math.cos(angle) * 165,
      Math.sin(angle) * 165,
      3,
      5,
      "player",
      1.7,
      "#64F58D",
      2,
      false,
      0,
      1,
    );
    orb.weaponId = "terrarian_orb";
    orb.style = "plasma";
    orb.trailLength = 12;
    orb.homingStrength = 9;
    orb.impactEffect = "plasma";
    this.projectiles.push(orb);
    this.fx.emitMuzzle(orb, this.engine.isPerformanceDegraded());
  }

  private fireWeapon() {
    const baseAngle = this.getPlayerAimAngle();
    const weaponId = this.player.currentWeaponId;
    const result = WeaponController.fire(this.player, baseAngle);
    if (!result.fired) return;
    this.player.weaponRecoilVisual = Math.min(6, 1.2 + result.recoil * 2.6);

    let effectProjectile = result.projectiles[0];
    if (weaponId === "stardust_dragon_staff") {
      const existingDragon = this.projectiles.find(projectile =>
        projectile.faction === "player" && projectile.weaponId === weaponId && projectile.style === "dragon"
      );
      if (existingDragon) {
        existingDragon.life = Math.max(existingDragon.life, 8);
        existingDragon.maxLife = Math.max(existingDragon.maxLife, 8);
        existingDragon.summonLevel = Math.min(6, existingDragon.summonLevel + 1);
        existingDragon.damage = Math.min(11, existingDragon.damage + 1);
        existingDragon.radius = Math.min(8, 4 + Math.ceil(existingDragon.summonLevel / 2));
        existingDragon.hitEnemyIds.clear();
        for (const projectile of result.projectiles) releaseProjectile(projectile);
        effectProjectile = existingDragon;
      } else {
        this.projectiles.push(...result.projectiles);
      }
    } else {
      this.projectiles.push(...result.projectiles);
    }
    if (WEAPONS[weaponId]?.attackMode === "yoyo") {
      this.player.activeYoyoWeaponId = weaponId;
    }

    if (effectProjectile) this.fx.emitMuzzle(effectProjectile, this.engine.isPerformanceDegraded());
    if (result.echoTriggered) {
      this.fx.emitImpact(this.player.x, this.player.y - 8, "#C792EA", false, this.engine.isPerformanceDegraded());
    }
    if (result.recoil >= 0.7) {
      this.engine.triggerScreenShake(Math.min(1.8, result.recoil), 0.055 + result.recoil * 0.015);
    }
    this.engine.data.recordWeaponUsed(weaponId);
    audio.playWeaponShot(effectProjectile?.style ?? "bullet", result.recoil);
  }

  // TODO: Move to PlayerController
  private getPlayerAimAngle(): number {
    const target = this.getClosestEnemy();
    if (target) {
      return Math.atan2(target.hitboxY - this.player.y, target.hitboxX - this.player.x);
    }
    const axis = this.engine.input.getAxis();
    if (axis.x !== 0 || axis.y !== 0) {
      return Math.atan2(axis.y, axis.x);
    }
    return this.player.aimAngle;
  }

  private markMicheleAttacker(enemyId: number): void {
    if (this.player.characterId !== "michele" || enemyId < 0) return;
    if (!this.enemies.some(enemy => enemy.id === enemyId && enemy.hp > 0)) return;
    this.player.micheleMarkedEnemyId = enemyId;
    this.player.micheleMarkTimer = SkillController.MICHELE_MARK_DURATION;
  }

  private updateMicheleTurret(_dt: number): void {
    if (this.player.characterId !== "michele" || !this.player.micheleTurretActive || this.player.skillActiveTimer <= 0) return;
    if (this.player.micheleTurretFireCooldown > 0) return;
    const range = SkillController.MICHELE_TURRET_RANGE;
    const marked = this.player.micheleMarkTimer > 0
      ? this.enemies.find(enemy => enemy.id === this.player.micheleMarkedEnemyId && enemy.hp > 0)
      : undefined;
    let target = marked && Math.hypot(marked.hitboxX - this.player.micheleTurretX, marked.hitboxY - this.player.micheleTurretY) <= range
      ? marked
      : undefined;
    if (!target) {
      let closestDistance = range;
      for (const enemy of this.enemies) {
        if (enemy.hp <= 0) continue;
        const distance = Math.hypot(enemy.hitboxX - this.player.micheleTurretX, enemy.hitboxY - this.player.micheleTurretY);
        if (distance <= closestDistance) {
          closestDistance = distance;
          target = enemy;
        }
      }
    }
    if (!target) return;
    const angle = Math.atan2(target.hitboxY - this.player.micheleTurretY, target.hitboxX - this.player.micheleTurretX);
    const profile = getProjectileProfile(WEAPONS.inspector);
    const projectile = acquireProjectile(
      this.player.micheleTurretX,
      this.player.micheleTurretY - 5,
      Math.cos(angle) * 245,
      Math.sin(angle) * 245,
      2,
      SkillController.MICHELE_TURRET_DAMAGE,
      "player",
      0.8,
      "#70D7FF",
      1,
      false,
      0,
      0,
      "slow",
      SkillController.MICHELE_TURRET_SLOW_DURATION,
      false,
      profile,
    );
    projectile.weaponId = "michele_turret";
    projectile.trailLength = 12;
    this.projectiles.push(projectile);
    this.player.micheleTurretFireCooldown = SkillController.MICHELE_TURRET_FIRE_INTERVAL;
    this.fx.emitMuzzle(projectile, this.engine.isPerformanceDegraded());
  }

  private updateKanamiBeacon(dt: number): void {
    if (this.player.characterId !== "kanami" || this.player.skillActiveTimer <= 0) return;
    if (this.player.kanamiBeaconDeployed) return;

    const nextX = this.player.kanamiBeaconX + this.player.kanamiBeaconVx * dt;
    const nextY = this.player.kanamiBeaconY + this.player.kanamiBeaconVy * dt;
    this.player.kanamiBeaconFlightTimer = Math.max(0, this.player.kanamiBeaconFlightTimer - dt);
    const collided = this.isCircleBlocked(nextX, nextY, 5, "projectile")
      || nextX < 12 || nextX > 308 || nextY < 12 || nextY > 228;
    if (!collided) {
      this.player.kanamiBeaconX = nextX;
      this.player.kanamiBeaconY = nextY;
    }
    if (collided || this.player.kanamiBeaconFlightTimer <= 0) {
      this.player.kanamiBeaconDeployed = true;
      this.player.kanamiBeaconVx = 0;
      this.player.kanamiBeaconVy = 0;
    }
  }

  private getKanamiBeaconTarget(enemy: Enemy): { x: number; y: number; distance: number } | null {
    if (
      this.player.characterId !== "kanami" ||
      this.player.skillActiveTimer <= 0 ||
      !this.player.kanamiBeaconDeployed
    ) return null;
    const dx = this.player.kanamiBeaconX - enemy.x;
    const dy = this.player.kanamiBeaconY - enemy.y;
    const distance = Math.hypot(dx, dy);
    if (distance > SkillController.KANAMI_BEACON_RANGE) return null;
    return { x: this.player.kanamiBeaconX, y: this.player.kanamiBeaconY, distance };
  }

  private getClosestEnemy(): Enemy | null {
    if (this.player.characterId === "michele" && this.player.micheleMarkTimer > 0) {
      const marked = this.enemies.find(enemy => enemy.id === this.player.micheleMarkedEnemyId && enemy.hp > 0);
      if (marked) return marked;
    }
    let closest = null;
    let minDist = Infinity;
    for (const e of this.enemies) {
      const d = Math.hypot(e.hitboxX - this.player.x, e.hitboxY - this.player.y);
      if (d < minDist) {
        minDist = d;
        closest = e;
      }
    }
    return closest;
  }

  private isMicheleTurretAvailable(): boolean {
    return this.player.characterId === "michele" &&
      this.player.micheleTurretActive &&
      this.player.skillActiveTimer > 0 &&
      this.player.micheleTurretHitsRemaining > 0;
  }

  private getEnemyCombatTarget(): {
    kind: "player" | "michele_turret";
    x: number;
    y: number;
    radius: number;
  } {
    if (this.isMicheleTurretAvailable()) {
      return {
        kind: "michele_turret",
        x: this.player.micheleTurretX,
        y: this.player.micheleTurretY,
        radius: 8,
      };
    }
    return { kind: "player", x: this.player.x, y: this.player.y, radius: this.player.radius };
  }

  private damageMicheleTurret(): boolean {
    if (!this.isMicheleTurretAvailable()) return false;
    this.player.micheleTurretHitsRemaining = Math.max(0, this.player.micheleTurretHitsRemaining - 1);
    this.fx.emitImpact(
      this.player.micheleTurretX,
      this.player.micheleTurretY - 5,
      "#70D7FF",
      false,
      this.engine.isPerformanceDegraded(),
    );
    audio.playHurt();
    if (this.player.micheleTurretHitsRemaining <= 0) {
      this.player.micheleTurretActive = false;
      this.player.skillActiveTimer = 0;
      this.player.micheleTurretFireCooldown = 0;
    }
    return true;
  }

  private updateEnemies(dt: number) {
    if (this.player.hp <= 0) return;
    const normalMode = this.engine.data.data.floor?.hardMode !== true;
    
    for (const e of this.enemies) {
      const previousX = e.x;
      const previousY = e.y;
      const combatTarget = this.getEnemyCombatTarget();
      const dist = Math.hypot(combatTarget.x - e.x, combatTarget.y - e.y);
      if (e.type === "boss") this.updateBossPhase(e);
      
      let nextX = e.x;
      let nextY = e.y;
      
      let currentSpeed = e.speed;
      currentSpeed *= StatusEffectSystem.getMovementMultiplier(e);
      if (e.hitFlash > 0) {
        e.hitFlash = Math.max(0, e.hitFlash - dt);
        currentSpeed *= 0.5;
      }

      const beaconTarget = this.getKanamiBeaconTarget(e);
      if (beaconTarget && e.type !== "boss") {
        e.attackState = "idle";
        e.attackTimer = 0;
        e.attackCooldown = Math.max(e.attackCooldown, 0.2);
        if (beaconTarget.distance > SkillController.KANAMI_BEACON_STOP_RADIUS) {
          const angle = Math.atan2(beaconTarget.y - e.y, beaconTarget.x - e.x);
          nextX += Math.cos(angle) * currentSpeed * dt;
          nextY += Math.sin(angle) * currentSpeed * dt;
        }
        this.moveCircleEntity(e, nextX - e.x, nextY - e.y, e.radius, "enemy");
        e.x = Math.max(16, Math.min(304, e.x));
        e.y = Math.max(16, Math.min(224, e.y));
        updateEnemyAnimation(e, { dt, previousX, previousY, targetX: beaconTarget.x });
        continue;
      }
      if (beaconTarget && e.type === "boss" && beaconTarget.distance > SkillController.KANAMI_BEACON_STOP_RADIUS) {
        const pullAngle = Math.atan2(beaconTarget.y - e.y, beaconTarget.x - e.x);
        nextX += Math.cos(pullAngle) * currentSpeed * SkillController.KANAMI_BEACON_BOSS_PULL * dt;
        nextY += Math.sin(pullAngle) * currentSpeed * SkillController.KANAMI_BEACON_BOSS_PULL * dt;
      }

      e.attackCooldown = Math.max(0, e.attackCooldown - dt);

      if (e.attackState === "windup") {
        e.attackTimer -= dt;
        if (e.attackTimer <= 0) {
          this.resolveEnemyAttack(e);
        }
        updateEnemyAnimation(e, { dt, previousX, previousY, targetX: combatTarget.x });
        continue;
      }

      if (e.attackState === "recover") {
        e.attackTimer -= dt;
        if (e.attackTimer <= 0) {
          e.attackState = "idle";
          e.attackTimer = 0;
        }
        updateEnemyAnimation(e, { dt, previousX, previousY, targetX: combatTarget.x });
        continue;
      }

      if (e.type === "melee" && e.behavior === "charge") {
        const chargeAttackRange = normalMode ? 92 : 110;
        if (dist <= chargeAttackRange && e.attackCooldown <= 0) {
          this.beginEnemyAttack(e, e.attackWindup);
          updateEnemyAnimation(e, { dt, previousX, previousY, targetX: combatTarget.x });
          continue;
        }

        if (dist > 28) {
          const angle = Math.atan2(combatTarget.y - e.y, combatTarget.x - e.x);
          nextX += Math.cos(angle) * currentSpeed * dt;
          nextY += Math.sin(angle) * currentSpeed * dt;
        }
      } else if (e.type === "melee") {
        const attackRange = e.radius + combatTarget.radius + 8;
        if (dist <= attackRange && e.attackCooldown <= 0) {
          this.beginEnemyAttack(e, e.attackWindup);
          updateEnemyAnimation(e, { dt, previousX, previousY, targetX: combatTarget.x });
          continue;
        }

        if (dist > attackRange - 2) {
          const angle = Math.atan2(combatTarget.y - e.y, combatTarget.x - e.x);
          nextX += Math.cos(angle) * currentSpeed * dt;
          nextY += Math.sin(angle) * currentSpeed * dt;
        }
      } else if (e.type === "ranged") {
        const hasAttackLine = !e.requiresLineOfSight || this.hasLineOfSight(e.x, e.y, combatTarget.x, combatTarget.y);
        const canAttack = (e.behavior !== "summon" || this.enemies.length < 7) && hasAttackLine;
        const normalRangeCap = e.behavior === "sniper" ? 176 : e.behavior === "lob" ? 148 : 128;
        const rangedAttackRange = normalMode ? Math.min(e.attackRange, normalRangeCap) : e.attackRange;
        if (canAttack && e.attackCooldown <= 0 && dist <= rangedAttackRange) {
          this.beginEnemyAttack(e, e.attackWindup);
          updateEnemyAnimation(e, { dt, previousX, previousY, targetX: combatTarget.x });
          continue;
        }

        if (e.behavior === "orbit" && hasAttackLine) {
          const desired = 94;
          const radialAngle = Math.atan2(combatTarget.y - e.y, combatTarget.x - e.x);
          const orbitSign = ((e.id + e.attackSequence) & 1) === 0 ? 1 : -1;
          const radialPull = Math.max(-0.65, Math.min(0.65, (dist - desired) / 48));
          nextX += (Math.cos(radialAngle) * radialPull + Math.cos(radialAngle + Math.PI / 2) * orbitSign) * currentSpeed * dt;
          nextY += (Math.sin(radialAngle) * radialPull + Math.sin(radialAngle + Math.PI / 2) * orbitSign) * currentSpeed * dt;
        } else if (e.behavior === "sniper") {
          if (dist < 122) {
            const angle = Math.atan2(e.y - combatTarget.y, e.x - combatTarget.x);
            nextX += Math.cos(angle) * currentSpeed * dt;
            nextY += Math.sin(angle) * currentSpeed * dt;
          } else if (dist > 160 || !hasAttackLine) {
            const angle = Math.atan2(combatTarget.y - e.y, combatTarget.x - e.x);
            nextX += Math.cos(angle) * currentSpeed * dt;
            nextY += Math.sin(angle) * currentSpeed * dt;
          }
        } else if (dist > 112 || !hasAttackLine) {
          const angle = Math.atan2(combatTarget.y - e.y, combatTarget.x - e.x);
          nextX += Math.cos(angle) * currentSpeed * dt;
          nextY += Math.sin(angle) * currentSpeed * dt;
        } else if (dist < 78) {
          const angle = Math.atan2(e.y - combatTarget.y, e.x - combatTarget.x);
          nextX += Math.cos(angle) * currentSpeed * dt;
          nextY += Math.sin(angle) * currentSpeed * dt;
        }
      } else if (e.type === "boss") {
        const bossAttackRange = normalMode ? 150 : 220;
        if (e.attackCooldown <= 0 && dist <= bossAttackRange) {
          const phaseWindup = e.attackWindup * (e.bossPhase === 1 ? 1 : e.bossPhase === 2 ? 0.88 : 0.76);
          this.beginEnemyAttack(e, phaseWindup);
          updateEnemyAnimation(e, { dt, previousX, previousY, targetX: combatTarget.x });
          continue;
        }

        if (dist > (e.bossPhase === 3 ? 48 : 60)) {
          const angle = Math.atan2(combatTarget.y - e.y, combatTarget.x - e.x);
          nextX += Math.cos(angle) * currentSpeed * dt;
          nextY += Math.sin(angle) * currentSpeed * dt;
        }
      }
      
      this.moveCircleEntity(e, nextX - e.x, nextY - e.y, e.radius, "enemy");
      
      e.x = Math.max(16, Math.min(320 - 16, e.x));
      e.y = Math.max(16, Math.min(240 - 16, e.y));
      updateEnemyAnimation(e, { dt, previousX, previousY, targetX: combatTarget.x });
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
    this.moveCircleEntity(enemy, dx, dy, enemy.radius, "enemy");
    enemy.x = Math.max(16, Math.min(320 - 16, enemy.x));
    enemy.y = Math.max(16, Math.min(240 - 16, enemy.y));
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
    const target = this.getEnemyCombatTarget();
    enemy.attackState = "windup";
    enemy.attackTimer = windup;
    enemy.attackAnimationDuration = windup;
    enemy.attackTargetKind = target.kind;
    enemy.attackAngle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
    enemy.attackTargetX = target.x;
    enemy.attackTargetY = target.y;
  }

  private resolveEnemyAttack(enemy: Enemy) {
    if (enemy.behavior === "melee") {
      const attackingTurret = enemy.attackTargetKind === "michele_turret" && this.isMicheleTurretAvailable();
      const targetX = attackingTurret ? this.player.micheleTurretX : this.player.x;
      const targetY = attackingTurret ? this.player.micheleTurretY : this.player.y;
      const targetRadius = attackingTurret ? 8 : this.player.radius;
      const dx = targetX - enemy.x;
      const dy = targetY - enemy.y;
      const distance = Math.hypot(dx, dy);
      const targetAngle = Math.atan2(dy, dx);
      const angleDelta = Math.atan2(
        Math.sin(targetAngle - enemy.attackAngle),
        Math.cos(targetAngle - enemy.attackAngle)
      );

      if (distance <= enemy.radius + targetRadius + 11 && Math.abs(angleDelta) <= Math.PI * 0.42) {
        if (attackingTurret) {
          this.damageMicheleTurret();
          enemy.attackCooldown = enemy.attackInterval;
          enemy.attackSequence++;
          enemy.attackState = "recover";
          enemy.attackTimer = 0.16;
          return;
        }
        const result = DamageSystem.damagePlayer(this.player, enemy.attackDamage);
        if (result.applied) {
          this.engine.data.recordPlayerDamage(
            result.armorDamage + result.hpDamage,
            enemy.type === "boss",
          );
          this.engine.triggerScreenShake(2.2, 0.12);
          this.fx.emitDamage(this.player.x, this.player.y, this.engine.isPerformanceDegraded());
          this.markMicheleAttacker(enemy.id);
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
    } else if (enemy.behavior === "sniper") {
      const shot = this.spawnEnemyProjectile(enemy, enemy.attackAngle, 1.5, 2.4);
      shot.vx = Math.cos(enemy.attackAngle) * enemy.projectileSpeed;
      shot.vy = Math.sin(enemy.attackAngle) * enemy.projectileSpeed;
      shot.weaponId = "enemy_needle";
      shot.trailLength = 10;
      shot.beamWidth = 1;
      enemy.attackCooldown = enemy.attackInterval;
    } else if (enemy.behavior === "lob") {
      const count = Math.max(2, enemy.projectileCount);
      for (let i = 0; i < count; i++) {
        const offset = (i - (count - 1) / 2) * enemy.projectileSpread;
        const shell = this.spawnEnemyProjectile(enemy, enemy.attackAngle + offset, 3.5, 3.2);
        shell.weaponId = "enemy_shell";
        shell.acceleration = 82;
        shell.drag = 0.14;
        shell.spinRate = 8;
      }
      enemy.attackCooldown = enemy.attackInterval;
    } else if (enemy.behavior === "orbit") {
      const count = Math.max(3, enemy.projectileCount);
      const rotatingBase = enemy.attackAngle + enemy.attackSequence * 0.47;
      for (let i = 0; i < count; i++) {
        const angle = rotatingBase + (Math.PI * 2 * i) / count;
        const orb = this.spawnEnemyProjectile(enemy, angle, 2, 3.4);
        orb.weaponId = "enemy_orbit";
        orb.spinRate = 10;
        orb.drag = 0.08;
      }
      enemy.attackCooldown = enemy.attackInterval;
    } else if (enemy.behavior === "support") {
      this.resolveSupportAttack(enemy);
      enemy.attackCooldown = enemy.attackInterval;
    } else if (enemy.behavior === "summon") {
      this.spawnSummonedEnemy(enemy);
      enemy.attackCooldown = enemy.attackInterval;
    } else if (enemy.behavior === "area") {
      if (enemy.attackTargetKind === "michele_turret" && this.isMicheleTurretAvailable()) {
        const turretDistance = Math.hypot(
          this.player.micheleTurretX - enemy.attackTargetX,
          this.player.micheleTurretY - enemy.attackTargetY,
        );
        if (turretDistance <= enemy.areaRadius + 8) this.damageMicheleTurret();
        enemy.attackCooldown = enemy.attackInterval;
        enemy.attackSequence++;
        enemy.attackState = "recover";
        enemy.attackTimer = 0.16;
        return;
      }
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
          this.markMicheleAttacker(enemy.id);
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

  private spawnEnemyProjectile(enemy: Enemy, angle: number, radius = 3, life = 3): Projectile {
    const projectileRadius = Math.max(enemy.type === "boss" ? 2.5 : 1.75, radius * (enemy.type === "boss" ? 0.72 : 0.68));
    const projectile = acquireProjectile(
      enemy.x,
      enemy.y,
      Math.cos(angle) * enemy.projectileSpeed,
      Math.sin(angle) * enemy.projectileSpeed,
      projectileRadius,
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
    );
    projectile.sourceEnemyId = enemy.id;
    projectile.targetsMicheleTurret = enemy.attackTargetKind === "michele_turret";
    if (enemy.projectileKind !== "standard") projectile.weaponId = `enemy_${enemy.projectileKind}`;
    this.projectiles.push(projectile);
    return projectile;
  }

  private resolveSupportAttack(enemy: Enemy): void {
    const allies = this.enemies
      .filter(candidate => candidate !== enemy && candidate.hp > 0 && Math.hypot(candidate.x - enemy.x, candidate.y - enemy.y) <= 92)
      .sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))
      .slice(0, 3);
    const healAmount = enemy.isElite ? 3 : 2;
    for (const ally of allies) {
      ally.hp = Math.min(ally.maxHp, ally.hp + healAmount);
      ally.hitFlash = Math.max(ally.hitFlash, 0.12);
    }
    const count = Math.max(4, enemy.projectileCount);
    const base = enemy.attackSequence * 0.38;
    for (let i = 0; i < count; i++) {
      const angle = base + (Math.PI * 2 * i) / count;
      const pulse = this.spawnEnemyProjectile(enemy, angle, 1.5, 2.4);
      pulse.weaponId = "enemy_support";
      pulse.vx *= 0.82;
      pulse.vy *= 0.82;
      pulse.damage = Math.max(1, enemy.attackDamage);
    }
  }

  private resolveChargeAttack(enemy: Enemy) {
    const startX = enemy.x;
    const startY = enemy.y;
    this.moveCircleEntity(
      enemy,
      Math.cos(enemy.attackAngle) * enemy.chargeDistance,
      Math.sin(enemy.attackAngle) * enemy.chargeDistance,
      enemy.radius,
      "enemy",
    );

    const attackingTurret = enemy.attackTargetKind === "michele_turret" && this.isMicheleTurretAvailable();
    const targetX = attackingTurret ? this.player.micheleTurretX : this.player.x;
    const targetY = attackingTurret ? this.player.micheleTurretY : this.player.y;
    const targetRadius = attackingTurret ? 8 : this.player.radius;
    const hit = segmentCircleHit(
      startX,
      startY,
      enemy.x,
      enemy.y,
      targetX,
      targetY,
      enemy.radius + targetRadius + 2,
    );
    if (hit) {
      if (attackingTurret) {
        this.damageMicheleTurret();
        return;
      }
      const result = DamageSystem.damagePlayer(this.player, enemy.attackDamage);
      if (result.applied) {
        this.engine.data.recordPlayerDamage(
          result.armorDamage + result.hpDamage,
          enemy.type === "boss",
        );
        this.engine.triggerScreenShake(2.2, 0.12);
        this.fx.emitDamage(this.player.x, this.player.y, this.engine.isPerformanceDegraded());
        this.markMicheleAttacker(enemy.id);
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
    if (this.isCircleBlocked(x, y, 8, "enemy")) return;
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
      p.anchorX = this.player.x;
      p.anchorY = this.player.y;
      if (p.stuck) {
        p.update(dt);
        if (p.life <= 0) {
          if (p.linkedShotMode === "primer" && !p.detonated) {
            p.explosionRadius = Math.max(8, p.linkedExplosionRadius || 42);
            p.explosionDamageMultiplier = Math.max(0.1, p.linkedExplosionDamageMultiplier || 1);
            p.color = "#FF7043";
            this.detonateProjectile(p);
          }
          this.projectiles.splice(i, 1);
          releaseProjectile(p);
        }
        continue;
      }
      this.updateProjectileHoming(p, dt);
      p.update(dt);
      if (p.linkedShotMode === "catalyst" && this.triggerLinkedPrimer(p)) {
        this.fx.emitProjectileImpact(p, false, this.engine.isPerformanceDegraded());
        this.projectiles.splice(i, 1);
        releaseProjectile(p);
        continue;
      }
      let environmentHitT = p.ignoreWalls ? null : this.getProjectileEnvironmentHitT(p);
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
            e.hitboxX, e.hitboxY, p.radius + e.hitboxRadius,
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
          const hitX = p.x;
          const hitY = p.y;
          const healthRatioBeforeHit = e.maxHp > 0 ? e.hp / e.maxHp : 0;
          let directDamage = p.highHealthDamageThreshold > 0 && healthRatioBeforeHit >= p.highHealthDamageThreshold
            ? p.damage * p.highHealthDamageMultiplier
            : p.damage;
          const travelDistance = Math.hypot(p.x - p.originX, p.y - p.originY);
          directDamage *= calculateCloseRangeDamageMultiplier(
            travelDistance,
            p.closeRangeDamageMultiplier,
            p.closeRangeFalloffDistance,
          );
          const weapon = WEAPONS[p.weaponId];
          if (
            this.player.characterId === "michele" &&
            weapon?.exclusiveCharacterId === "michele" &&
            this.player.micheleMarkTimer > 0 &&
            this.player.micheleMarkedEnemyId === e.id
          ) {
            directDamage *= Math.max(1, weapon.markedTargetDamageMultiplier ?? 1);
          }
          const result = DamageSystem.damageEnemy(e, directDamage);
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
          if (result.applied && p.critical && p.criticalExplosionRadius > 0) {
            const hadBaseExplosion = p.explosionRadius > 0;
            p.explosionRadius = Math.max(p.explosionRadius, p.criticalExplosionRadius);
            p.explosionDamageMultiplier = hadBaseExplosion
              ? Math.max(p.explosionDamageMultiplier, p.criticalExplosionDamageMultiplier)
              : p.criticalExplosionDamageMultiplier;
            entityHit = true;
          }
          if (p.linkedShotMode === "primer") {
            this.stickLinkedPrimer(p);
            continue;
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
        if (p.targetsMicheleTurret && this.isMicheleTurretAvailable()) {
          const turretHit = segmentCircleHit(
            p.previousX,
            p.previousY,
            p.x,
            p.y,
            this.player.micheleTurretX,
            this.player.micheleTurretY,
            p.radius + 8,
          );
          if (turretHit && (environmentHitT === null || turretHit.t <= environmentHitT)) {
            p.x = turretHit.x;
            p.y = turretHit.y;
            this.damageMicheleTurret();
            entityHit = true;
          }
        }
        const committedToTurret = p.targetsMicheleTurret && this.isMicheleTurretAvailable();
        if (!entityHit && !committedToTurret) {
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
              this.markMicheleAttacker(p.sourceEnemyId);
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
      }

      if (!entityHit && environmentHitT !== null) {
        const proposedX = p.x;
        const proposedY = p.y;
        const impactX = p.previousX + (proposedX - p.previousX) * environmentHitT;
        const impactY = p.previousY + (proposedY - p.previousY) * environmentHitT;
        p.x = impactX;
        p.y = impactY;
        const destroyedBreakable = p.faction === "player" && this.destroyBreakableTileAt(impactX, impactY, p.radius + 2);
        this.fx.emitProjectileImpact(p, p.critical, this.engine.isPerformanceDegraded());

        if (!destroyedBreakable && p.linkedShotMode === "primer") {
          this.stickLinkedPrimer(p);
          continue;
        }

        if (!destroyedBreakable && p.wallBouncesRemaining > 0) {
          const blockedX = proposedX < 0 || proposedX > 320 || this.isCircleBlocked(proposedX, p.previousY, p.radius, "projectile");
          const blockedY = proposedY < 0 || proposedY > 240 || this.isCircleBlocked(p.previousX, proposedY, p.radius, "projectile");
          if (blockedX || (!blockedX && !blockedY)) p.vx *= -1;
          if (blockedY || (!blockedX && !blockedY)) p.vy *= -1;
          p.x = p.previousX;
          p.y = p.previousY;
          p.wallBouncesRemaining--;
          environmentHitT = null;
        }
      }

      if (entityHit || environmentHitT !== null || p.life <= 0) {
        if (p.life <= 0 && p.linkedShotMode === "primer" && !p.detonated) {
          p.explosionRadius = Math.max(8, p.linkedExplosionRadius || 42);
          p.explosionDamageMultiplier = Math.max(0.1, p.linkedExplosionDamageMultiplier || 1);
          p.color = "#FF7043";
        }
        if (p.explosionRadius > 0 && !p.detonated) {
          this.detonateProjectile(p, directEnemyId);
        }
        this.projectiles.splice(i, 1);
        releaseProjectile(p);
      }
    }
  }

  private updateProjectileHoming(projectile: Projectile, dt: number) {
    if (projectile.faction !== "player") return;

    const playerDistance = Math.hypot(projectile.x - this.player.x, projectile.y - this.player.y);
    let targetX: number | null = null;
    let targetY: number | null = null;
    let turnStrength = projectile.homingStrength;

    if (projectile.style === "yoyo") {
      const tether = Math.max(48, projectile.tetherRange || 108);
      if (playerDistance >= tether * 0.92) {
        targetX = this.player.x;
        targetY = this.player.y;
        turnStrength = Math.max(turnStrength, projectile.returnStrength || 10);
      } else {
        let target: Enemy | null = null;
        let closestDistance = tether;
        for (const enemy of this.enemies) {
          if (enemy.hp <= 0) continue;
          const distance = Math.hypot(enemy.hitboxX - projectile.x, enemy.hitboxY - projectile.y);
          if (distance < closestDistance) {
            target = enemy;
            closestDistance = distance;
          }
        }
        if (target) {
          targetX = target.hitboxX;
          targetY = target.hitboxY;
        } else {
          targetX = this.player.x + Math.cos(this.player.aimAngle) * tether * 0.72;
          targetY = this.player.y + Math.sin(this.player.aimAngle) * tether * 0.72;
        }
      }
    } else if (projectile.style === "dragon") {
      const tether = Math.max(96, projectile.tetherRange || 150);
      if (playerDistance > tether) {
        targetX = this.player.x;
        targetY = this.player.y;
        turnStrength = Math.max(turnStrength, projectile.returnStrength || 7);
      } else {
        let target: Enemy | null = null;
        let closestDistance = 240;
        for (const enemy of this.enemies) {
          if (enemy.hp <= 0) continue;
          const distance = Math.hypot(enemy.hitboxX - projectile.x, enemy.hitboxY - projectile.y);
          if (distance < closestDistance) {
            target = enemy;
            closestDistance = distance;
          }
        }
        if (target) {
          targetX = target.hitboxX;
          targetY = target.hitboxY;
        } else {
          const orbitAngle = projectile.age * 2.2 + projectile.id * 0.73;
          targetX = this.player.x + Math.cos(orbitAngle) * 54;
          targetY = this.player.y + Math.sin(orbitAngle) * 36;
        }
      }
    } else if (
      projectile.style === "sword" &&
      projectile.weaponId === "zenith" &&
      projectile.age > projectile.maxLife * 0.52
    ) {
      targetX = this.player.x;
      targetY = this.player.y;
      turnStrength = Math.max(turnStrength, projectile.returnStrength || 3.4);
    } else if (projectile.homingStrength > 0 && this.enemies.length > 0) {
      let target: Enemy | null = null;
      let closestDistance = projectile.style === "sword" ? 220 : 150;
      for (const enemy of this.enemies) {
        if (enemy.hp <= 0 || projectile.hitEnemyIds.has(enemy.id)) continue;
        const distance = Math.hypot(enemy.hitboxX - projectile.x, enemy.hitboxY - projectile.y);
        if (distance < closestDistance) {
          target = enemy;
          closestDistance = distance;
        }
      }
      if (target) {
        targetX = target.hitboxX;
        targetY = target.hitboxY;
      }
    }

    if (targetX === null || targetY === null || turnStrength <= 0) return;
    const targetAngle = Math.atan2(targetY - projectile.y, targetX - projectile.x);
    const velocity = rotateVelocityToward(
      projectile.vx,
      projectile.vy,
      targetAngle,
      turnStrength * dt,
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
        const distance = Math.hypot(enemy.hitboxX - fromX, enemy.hitboxY - fromY);
        if (distance < closestDistance) {
          target = enemy;
          closestDistance = distance;
        }
      }
      if (!target) break;

      visited.add(target.id);
      projectile.hitEnemyIds.add(target.id);
      const targetX = target.hitboxX;
      const targetY = target.hitboxY;
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

  private stickLinkedPrimer(projectile: Projectile): void {
    projectile.stuck = true;
    projectile.vx = 0;
    projectile.vy = 0;
    projectile.previousX = projectile.x;
    projectile.previousY = projectile.y;
    const fuse = Math.max(0.1, projectile.linkedMarkerLife || 2);
    projectile.life = Math.max(0.1, Math.min(projectile.life, fuse));
    projectile.maxLife = fuse;
    projectile.hitEnemyIds.clear();
  }

  private triggerLinkedPrimer(catalyst: Projectile): boolean {
    if (catalyst.linkedShotMode !== "catalyst") return false;
    const triggerRange = Math.max(16, catalyst.linkedTriggerRange || 72);
    let primer: Projectile | undefined;
    let closestDistance = triggerRange;
    for (const candidate of this.projectiles) {
      if (candidate === catalyst || candidate.life <= 0 || candidate.detonated) continue;
      if (candidate.faction !== "player" || candidate.weaponId !== catalyst.weaponId) continue;
      if (candidate.linkedShotMode !== "primer" || !candidate.stuck) continue;
      const distance = Math.hypot(candidate.x - catalyst.x, candidate.y - catalyst.y);
      if (distance <= closestDistance) {
        primer = candidate;
        closestDistance = distance;
      }
    }
    if (!primer) return false;
    primer.explosionRadius = Math.max(8, primer.linkedExplosionRadius || catalyst.linkedExplosionRadius || 42);
    primer.explosionDamageMultiplier = Math.max(0.1, primer.linkedExplosionDamageMultiplier || catalyst.linkedExplosionDamageMultiplier || 1);
    primer.color = "#FF7043";
    this.detonateProjectile(primer);
    primer.life = 0;
    return true;
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
      const dx = enemy.hitboxX - projectile.x;
      const dy = enemy.hitboxY - projectile.y;
      const centerDistance = Math.hypot(dx, dy);
      const distance = Math.max(0, centerDistance - enemy.hitboxRadius);
      if (distance > radius) continue;
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
        if (enemy.type !== "boss" && centerDistance > 0) {
          const push = projectile.knockback * falloff;
          this.moveCircleEntity(
            enemy,
            dx / centerDistance * push,
            dy / centerDistance * push,
            enemy.radius,
            "enemy",
          );
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
    this.moveCircleEntity(enemy, pushX, pushY, enemy.radius, "enemy");
    enemy.x = Math.max(16, Math.min(304, enemy.x));
    enemy.y = Math.max(16, Math.min(224, enemy.y));
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
      if (x < 0 || x > 320 || y < 0 || y > 240 || this.isCircleBlocked(x, y, projectile.radius, "projectile")) {
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

  private dungeonOccluder(id: string, projection: WorldRect, sortY: number): WorldObjectDefinition {
    return {
      id,
      type: "decoration",
      x: projection.x,
      y: projection.y,
      width: projection.width,
      height: projection.height,
      sortY,
      occlusionProjection: projection,
      occlusionGroupId: id,
      fadeWhenOccluding: true,
      minimumAlpha: 0.42,
      properties: { rearAccessRule: "roof-occluder" },
    };
  }

  private getDungeonOcclusionObjects(): WorldObjectDefinition[] {
    const floor = this.engine.data.data.floor;
    const room = floor.rooms.find(candidate => candidate.x === floor.currentRoomX && candidate.y === floor.currentRoomY);
    const objects: WorldObjectDefinition[] = [];
    if (this.chest) {
      const width = this.chest.kind === "boss" ? 40 : 32;
      objects.push(this.dungeonOccluder(
        "depth:chest",
        { x: this.chest.x - width / 2, y: this.chest.y - 27, width, height: 40 },
        this.chest.y + 10,
      ));
    }
    if (this.portal) {
      objects.push(this.dungeonOccluder(
        "depth:portal-supports",
        { x: this.portal.x - 29, y: this.portal.y - 5, width: 58, height: 31 },
        this.portal.y + 23,
      ));
    }
    if (!room) return objects;
    const addFacility = (id: string, point: { x: number; y: number }, width: number, height: number, sortOffset: number) => {
      objects.push(this.dungeonOccluder(
        id,
        { x: point.x - width / 2, y: point.y - height + sortOffset, width, height },
        point.y + sortOffset,
      ));
    };
    if (room.type === "shop") addFacility("depth:shop", this.getShopPosition(room), 58, 58, 17);
    if (room.type === "npc") addFacility("depth:broadcast", this.getBroadcastPosition(room), 34, 42, 12);
    if (room.type === "photo_booth") addFacility("depth:photo", this.getSpecialRoomPosition(room), 40, 48, 16);
    if (room.type === "legacy_rpg" || room.type === "legacy_tactics") {
      addFacility("depth:legacy", this.getLegacyPosition(room), 36, 44, 13);
    }
    if (room.type === "wish_fountain") {
      const spring = this.getSpecialRoomPosition(room);
      const scale = DUNGEON_RITUAL_SPRING_SCALE;
      objects.push(this.dungeonOccluder(
        "depth:wish-crystal",
        { x: spring.x - 15 * scale, y: spring.y - 58 * scale, width: 30 * scale, height: 64 * scale },
        spring.y + 6 * scale,
      ));
      objects.push(this.dungeonOccluder(
        "depth:wish-front",
        { x: spring.x - 62 * scale, y: spring.y + 8 * scale, width: 124 * scale, height: 24 * scale },
        spring.y + 29 * scale,
      ));
    }
    return objects;
  }

  private drawWithOcclusion(ctx: CanvasRenderingContext2D, groupId: string, draw: () => void): void {
    ctx.save();
    ctx.globalAlpha *= this.occlusionController.getAlpha(groupId);
    draw();
    ctx.restore();
  }

  private drawRoomObjectCollisionDebug(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.lineWidth = 1;
    ctx.font = "5px monospace";
    ctx.textAlign = "left";
    for (const collider of this.roomObjectCollision.getColliders()) {
      ctx.fillStyle = "rgba(255,70,70,0.2)";
      ctx.strokeStyle = "#FF4646";
      if (collider.shape === "circle") {
        ctx.beginPath();
        ctx.arc(Math.round(collider.x), Math.round(collider.y), collider.radius ?? 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(collider.x, collider.y, collider.width ?? 0, collider.height ?? 0);
        ctx.strokeRect(collider.x, collider.y, collider.width ?? 0, collider.height ?? 0);
      }
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(collider.id, Math.round(collider.x) + 2, Math.round(collider.y) - 2);
    }
    const floor = this.engine.data.data.floor;
    const currentRoom = floor.rooms.find(room =>
      room.x === floor.currentRoomX && room.y === floor.currentRoomY
    );
    if (currentRoom) {
      for (const orientation of DOOR_ORIENTATIONS) {
        if (!currentRoom.doors[orientation]) continue;
        const geometry = getDoorGeometry(orientation, this.player.radius);
        ctx.strokeStyle = "#30F2F2";
        ctx.strokeRect(
          geometry.aperture.x,
          geometry.aperture.y,
          geometry.aperture.width,
          geometry.aperture.height,
        );
        ctx.strokeStyle = "#FFE45E";
        ctx.strokeRect(
          geometry.triggerBounds.x,
          geometry.triggerBounds.y,
          geometry.triggerBounds.width,
          geometry.triggerBounds.height,
        );
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(`door:${orientation}`, geometry.entryPoint.x + 2, geometry.entryPoint.y - 2);
      }
    }
    ctx.strokeStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(Math.round(this.player.x), Math.round(this.player.y), this.player.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  draw(ctx: CanvasRenderingContext2D) {
    const floor = this.engine.data.data.floor;
    const currentRoom = floor.rooms.find((r: any) => r.x === floor.currentRoomX && r.y === floor.currentRoomY);
    
    this.roomRenderer.drawBackground(ctx, currentRoom, floor.theme || "forest");
    const time = this.qaPresentationTime ?? Date.now() / 1000;
    EnvironmentSystem.draw(ctx, this.environmentHazards, this.environmentTime);
    const doorLocked = this.areRoomDoorsLocked();
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
    if (this.player.characterId === "michele" && this.player.micheleMarkTimer > 0) {
      const markedEnemy = this.enemies.find(enemy => enemy.id === this.player.micheleMarkedEnemyId);
      if (markedEnemy) EntityRenderer.drawMicheleMark(ctx, markedEnemy, time);
    }
    if (this.player.characterId === "michele" && this.player.micheleTurretActive && this.player.skillActiveTimer > 0) {
      EntityRenderer.drawMicheleTurret(
        ctx,
        this.player.micheleTurretX,
        this.player.micheleTurretY,
        time,
        this.player.micheleTurretHitsRemaining,
      );
    }
    if (this.player.characterId === "kanami" && this.player.skillActiveTimer > 0) {
      EntityRenderer.drawKanamiBeacon(
        ctx,
        this.player.kanamiBeaconX,
        this.player.kanamiBeaconY,
        this.player.kanamiBeaconDeployed,
        time,
      );
    }

    const depthRenderables: DepthRenderable[] = [];
    const upperFacilityDraws: Array<() => void> = [];
    const theme = floor.theme || "forest";

    if (currentRoom?.type === "wish_fountain") {
      const spring = this.getSpecialRoomPosition(currentRoom);
      const options = {
        x: spring.x,
        y: spring.y,
        scale: DUNGEON_RITUAL_SPRING_SCALE,
        time,
        theme,
        completed: currentRoom.interactionCompleted === true,
      } as const;
      drawRitualSpringPart(ctx, "court", options);
      depthRenderables.push({
        id: "wish:basin",
        sortY: spring.y + 14 * DUNGEON_RITUAL_SPRING_SCALE,
        draw: () => drawRitualSpringPart(ctx, "basin", options),
      });
      depthRenderables.push({
        id: "wish:crystal",
        sortY: spring.y + 6 * DUNGEON_RITUAL_SPRING_SCALE,
        draw: () => this.drawWithOcclusion(ctx, "depth:wish-crystal", () =>
          drawRitualSpringPart(ctx, "crystal", options)),
      });
      RITUAL_SPRING_GEOMETRY.lanterns.forEach((lantern, index) => {
        const lanternPart = (["lantern_0", "lantern_1", "lantern_2", "lantern_3"] as const)[index];
        depthRenderables.push({
          id: `wish:lantern:${index}`,
          sortY: spring.y + (lantern.y + 20) * DUNGEON_RITUAL_SPRING_SCALE,
          draw: () => drawRitualSpringPart(ctx, lanternPart, options),
        });
      });
      depthRenderables.push({
        id: "wish:front-rim",
        sortY: spring.y + 29 * DUNGEON_RITUAL_SPRING_SCALE,
        draw: () => this.drawWithOcclusion(ctx, "depth:wish-front", () =>
          drawRitualSpringPart(ctx, "front_rim", options)),
      });
    }

    if (this.chest) {
      depthRenderables.push({
        id: "chest",
        sortY: this.chest.y + (this.chest.kind === "boss" ? 13 : 11),
        draw: () => this.drawWithOcclusion(ctx, "depth:chest", () =>
          ChestRenderer.drawChest(ctx, this.chest!, time, theme)),
      });
    }
    if (currentRoom?.type === "shop") {
      const shop = this.getShopPosition(currentRoom);
      ShopRenderer.drawMerchantPart(ctx, shop.x, shop.y, time, theme, "back");
      depthRenderables.push({
        id: "shop:body",
        sortY: shop.y + 8,
        draw: () => this.drawWithOcclusion(ctx, "depth:shop", () =>
          ShopRenderer.drawMerchantPart(ctx, shop.x, shop.y, time, theme, "body")),
      });
      depthRenderables.push({
        id: "shop:front",
        sortY: shop.y + 17,
        draw: () => this.drawWithOcclusion(ctx, "depth:shop", () =>
          ShopRenderer.drawMerchantPart(ctx, shop.x, shop.y, time, theme, "front")),
      });
      upperFacilityDraws.push(() => ShopRenderer.drawMerchantPart(ctx, shop.x, shop.y, time, theme, "upper"));
    }
    if (currentRoom?.type === "npc") {
      const broadcast = this.getBroadcastPosition(currentRoom);
      const completed = currentRoom.interactionCompleted === true;
      SpecialRoomRenderer.drawBroadcastTerminalPart(ctx, broadcast.x, broadcast.y, time, theme, completed, "back");
      depthRenderables.push({
        id: "broadcast:body",
        sortY: broadcast.y + 6,
        draw: () => this.drawWithOcclusion(ctx, "depth:broadcast", () =>
          SpecialRoomRenderer.drawBroadcastTerminalPart(ctx, broadcast.x, broadcast.y, time, theme, completed, "body")),
      });
      depthRenderables.push({
        id: "broadcast:front",
        sortY: broadcast.y + 12,
        draw: () => this.drawWithOcclusion(ctx, "depth:broadcast", () =>
          SpecialRoomRenderer.drawBroadcastTerminalPart(ctx, broadcast.x, broadcast.y, time, theme, completed, "front")),
      });
      upperFacilityDraws.push(() => SpecialRoomRenderer.drawBroadcastTerminalPart(ctx, broadcast.x, broadcast.y, time, theme, completed, "upper"));
    }
    if (currentRoom?.type === "photo_booth") {
      const special = this.getSpecialRoomPosition(currentRoom);
      const completed = currentRoom.interactionCompleted === true;
      SpecialRoomRenderer.drawPhotoBoothPart(ctx, special.x, special.y, time, theme, completed, "back");
      depthRenderables.push({
        id: "photo:body",
        sortY: special.y + 8,
        draw: () => this.drawWithOcclusion(ctx, "depth:photo", () =>
          SpecialRoomRenderer.drawPhotoBoothPart(ctx, special.x, special.y, time, theme, completed, "body")),
      });
      depthRenderables.push({
        id: "photo:front",
        sortY: special.y + 16,
        draw: () => this.drawWithOcclusion(ctx, "depth:photo", () =>
          SpecialRoomRenderer.drawPhotoBoothPart(ctx, special.x, special.y, time, theme, completed, "front")),
      });
      upperFacilityDraws.push(() => SpecialRoomRenderer.drawPhotoBoothPart(ctx, special.x, special.y, time, theme, completed, "upper"));
    }
    if (currentRoom?.type === "legacy_rpg" || currentRoom?.type === "legacy_tactics") {
      const legacy = this.getLegacyPosition(currentRoom);
      const legacyType = currentRoom.type;
      const completed = currentRoom.interactionCompleted === true;
      SpecialRoomRenderer.drawLegacyDevicePart(ctx, legacy.x, legacy.y, time, legacyType, completed, "back");
      depthRenderables.push({
        id: "legacy:body",
        sortY: legacy.y + 7,
        draw: () => this.drawWithOcclusion(ctx, "depth:legacy", () =>
          SpecialRoomRenderer.drawLegacyDevicePart(ctx, legacy.x, legacy.y, time, legacyType, completed, "body")),
      });
      depthRenderables.push({
        id: "legacy:front",
        sortY: legacy.y + 13,
        draw: () => this.drawWithOcclusion(ctx, "depth:legacy", () =>
          SpecialRoomRenderer.drawLegacyDevicePart(ctx, legacy.x, legacy.y, time, legacyType, completed, "front")),
      });
      upperFacilityDraws.push(() => SpecialRoomRenderer.drawLegacyDevicePart(ctx, legacy.x, legacy.y, time, legacyType, completed, "upper"));
    }
    for (const pickup of this.pickups) {
      depthRenderables.push({ id: `pickup:${pickup.id}`, sortY: pickup.y, draw: () => EntityRenderer.drawPickup(ctx, pickup, time) });
    }
    for (const enemy of this.enemies) {
      depthRenderables.push({
        id: `enemy:${enemy.id}`,
        sortY: enemy.y + enemy.radius,
        draw: () => EntityRenderer.drawEnemy(ctx, enemy, time, theme, this.engine.data.settings.reducedFlashing),
      });
    }
    if (this.portal) {
      depthRenderables.push({
        id: "portal:energy",
        sortY: this.portal.y + 8,
        draw: () => PortalRenderer.drawPortalPart(ctx, this.portal!, time, theme, "energy"),
      });
      depthRenderables.push({
        id: "portal:supports",
        sortY: this.portal.y + 23,
        draw: () => this.drawWithOcclusion(ctx, "depth:portal-supports", () =>
          PortalRenderer.drawPortalPart(ctx, this.portal!, time, theme, "supports")),
      });
    }
    if (this.player.hp > 0) {
      depthRenderables.push({
        id: "player",
        sortY: this.player.y + this.player.radius,
        draw: () => EntityRenderer.drawPlayer(ctx, this.player, this.engine, theme),
      });
    }
    depthRenderables.sort((a, b) => a.sortY - b.sortY || a.id.localeCompare(b.id));
    for (const renderable of depthRenderables) renderable.draw();
    for (const drawUpper of upperFacilityDraws) drawUpper();

    if (currentRoom?.type === "wish_fountain") {
      const spring = this.getSpecialRoomPosition(currentRoom);
      drawRitualSpringPart(ctx, "soul_motes", {
        x: spring.x,
        y: spring.y,
        scale: DUNGEON_RITUAL_SPRING_SCALE,
        time,
        theme,
        completed: currentRoom.interactionCompleted === true,
      });
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
    if (this.qaCollisionDebug) this.drawRoomObjectCollisionDebug(ctx);
    
    UIRenderer.draw(ctx, this.player, this.engine, floor, this.roomPhase, this.qaWeaponHudOptions);
    this.tutorial.draw(ctx, this.engine.input, this.engine.data.settings.language);
    



    MinimapRenderer.draw(ctx, floor);
    PromptRenderer.draw(ctx, this.getInteractTarget(), time, this.engine.input.getPrompt("interact"), this.engine.data.settings.language);

    if (this.buffSelection) {
      BuffSelectionRenderer.draw(
        ctx,
        this.buffSelection,
        this.player.buffRerollsRemaining,
        this.buffSelectionIndex,
        this.engine.input.getConfirmPrompt(),
        this.engine.input.getNavigationPrompt("horizontal"),
        this.engine.input.getUiPrompt("secondary"),
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
        this.engine.input.getConfirmPrompt(),
        this.engine.input.getNavigationPrompt("horizontal"),
        this.engine.input.getCancelPrompt(),
        this.engine.data.settings.language,
      );
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
