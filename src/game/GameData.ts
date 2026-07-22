import { WeaponLoadoutRuntime, createWeaponRuntimeState } from "./combat/WeaponRuntimeState";
import { generateStage, type FloorData } from "./FloorGenerator";
import { CHARACTERS } from "./data/characters";
import { normalizeRoomState } from "./RoomState";
import {
  advanceRunProgress,
  createInitialRunProgress,
  createRunProgressFromGlobalStage,
  FINAL_GLOBAL_STAGE,
  isFinalStage,
  isBossStage,
  migrateLegacyGlobalStage,
  migrateLegacyRunProgress,
  normalizeRunProgress,
  type RunProgress,
} from "./RunProgress";
import {
  createStarterWeaponSlots,
  isWeaponAvailableForCharacter,
  isWeaponId,
  normalizeWeaponSlots,
  type WeaponSlots,
  WEAPONS,
} from "./data/weapons";
import { hashSeed, normalizeSeed } from "./Random";
import { BuffSystem, type BuffId } from "./combat/BuffSystem";
import { ShopSystem } from "./shop/ShopSystem";
import { StatusEffectSystem, type ActiveStatusEffect } from "./combat/StatusEffectSystem";
import {
  calculateRunReward,
  createRunStats,
  normalizeRunStats,
  type RunOutcome,
  type RunStats,
  type RunSummary,
} from "./RunStats";
import {
  applyMetaUnlocks,
  createDefaultMetaProgress,
  META_SAVE_VERSION,
  normalizeMetaProgress,
  type MetaProgress,
} from "./MetaProgress";
import type { Enemy } from "./entities/Enemy";
import { DEFAULT_MANA_RECHARGE_DELAY, DEFAULT_MANA_RECHARGE_RATE, MAX_PLAYER_MANA } from "./entities/Player";
import {
  createDefaultMetaUpgrades,
  getMetaBonuses,
  getUpgradeCost,
  getUpgradeInvestment,
  META_UPGRADES,
  type MetaUpgradeId,
} from "./MetaUpgrades";
import {
  evaluateAchievements,
  getAchievementReward,
  type AchievementId,
} from "./AchievementSystem";
import {
  evaluateChallenge,
  getChallengeDateKey,
  getChallengeReward,
  isChallengeId,
  type ChallengeId,
} from "./ChallengeSystem";
import { ENEMIES, isEnemyId } from "./data/enemies";
import {
  SETTINGS_SAVE_KEY,
  createDefaultSettings,
  normalizeSettings,
  type GameSettings,
} from "./Settings";
import { createSaveBundle, isJsonObject, parseSaveBundle } from "./SaveTransfer";

export const RUN_SAVE_KEY = "retro_rpg_save";
export const META_SAVE_KEY = "retro_rpg_meta";
export const RUN_BACKUP_KEY = "retro_rpg_save_backup";
export const META_BACKUP_KEY = "retro_rpg_meta_backup";
export const SETTINGS_BACKUP_KEY = "retro_rpg_settings_backup";
const CURRENT_SAVE_VERSION = 24;
const INITIAL_RUN = createInitialRunProgress();

export interface GameSave {
  player: {
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    armor: number;
    maxArmor: number;
    mana: number;
    maxMana: number;
    manaRechargeTimer: number;
    manaRechargeDelay: number;
    manaRechargeRate: number;
    weaponLoadout: WeaponLoadoutRuntime;
    
    /** Compatibility mirror for saves created before dual weapon slots. */
    currentWeaponId: string;
    level: number;
    exp: number;
    coins: number;
    characterId: string;
    speed: number;
    skillCooldown: number;
    skillActiveTimer: number;
    skillDirectionX: number;
    skillDirectionY: number;
    rogueCritTimer: number;
    mageArcaneCharge: number;
    knightGuardReady: boolean;
    micheleMarkedEnemyId: number;
    micheleMarkTimer: number;
    micheleTurretX: number;
    micheleTurretY: number;
    micheleTurretFireCooldown: number;
    buffs: BuffId[];
    emergencyBarrierReady: boolean;
    phoenixProtocolReady: boolean;
    statusEffects: ActiveStatusEffect[];
    buffRerollsRemaining: number;
    shopDiscount: number;
    supplyDropBonus: number;
  };
  /** @deprecated Preferences are stored separately in retro_rpg_settings. */
  settings?: Partial<GameSettings>;
  recentEvents: string[];
  run: RunProgress;
  runStats: RunStats;
  /** Compatibility name retained while the value now represents one Stage. */
  floor: FloorData;
  legacyData: {
    player: {
      x: number;
      y: number;
      hp: number;
      maxHp: number;
      level: number;
      exp: number;
    };
    clearedRooms: string[];
    legacyRewardsClaimed: string[];
  };
  saveVersion: number;
}

export const defaultSave: GameSave = {
  player: {
    x: 160,
    y: 120,
    hp: 6,
    maxHp: 6,
    armor: 5,
    maxArmor: 5,
    mana: CHARACTERS.knight.maxMana,
    maxMana: CHARACTERS.knight.maxMana,
    manaRechargeTimer: 0,
    manaRechargeDelay: CHARACTERS.knight.manaRechargeDelay,
    manaRechargeRate: CHARACTERS.knight.manaRechargeRate,
    weaponLoadout: { slots: [createWeaponRuntimeState("pistol")], activeSlot: 0, swapTimer: 0 },
    
    currentWeaponId: "pistol",
    level: 1,
    exp: 0,
    coins: 0,
    characterId: "knight",
    speed: 80,
    skillCooldown: 0,
    skillActiveTimer: 0,
    skillDirectionX: 0,
    skillDirectionY: 0,
    rogueCritTimer: 0,
    mageArcaneCharge: 0,
    knightGuardReady: true,
    micheleMarkedEnemyId: -1,
    micheleMarkTimer: 0,
    micheleTurretX: 0,
    micheleTurretY: 0,
    micheleTurretFireCooldown: 0,
    buffs: [],
    emergencyBarrierReady: false,
    phoenixProtocolReady: false,
    statusEffects: [],
    buffRerollsRemaining: 0,
    shopDiscount: 0,
    supplyDropBonus: 0,
  },
  recentEvents: ["Started the journey"],
  run: INITIAL_RUN,
  runStats: createRunStats(INITIAL_RUN),
  floor: generateStage(INITIAL_RUN),
  legacyData: {
    player: {
      x: 2,
      y: 2,
      hp: 20,
      maxHp: 20,
      level: 1,
      exp: 0,
    },
    clearedRooms: [],
    legacyRewardsClaimed: [],
  },
  saveVersion: CURRENT_SAVE_VERSION,
};

export class GameData {
  public data: GameSave;
  public meta: MetaProgress;
  public settings: GameSettings;
  public lastRecoveryMessage: string | null = null;

  constructor() {
    this.data = JSON.parse(JSON.stringify(defaultSave));
    this.data.run = createInitialRunProgress();
    this.data.runStats = createRunStats(this.data.run);
    this.meta = createDefaultMetaProgress();
    this.settings = createDefaultSettings();
  }

  save() {
    this.normalizePlayerWeapons();
    this.normalizePlayerSkills();
    this.normalizePlayerBuffs();
    BuffSystem.applyManaRuntimeStats(this.data.player);
    this.normalizePlayerStatuses();
    this.normalizeRunBonuses();
    this.data.run = normalizeRunProgress(this.data.run);
    this.data.runStats = normalizeRunStats(this.data.runStats, this.data.run);
    this.normalizeStageMetadata();
    for (const room of this.data.floor.rooms) {
      normalizeRoomState(room);
    }
    this.data.saveVersion = CURRENT_SAVE_VERSION;
    const payload = { ...this.data } as GameSave & { settings?: Partial<GameSettings> };
    delete payload.settings;
    this.writeWithBackup(RUN_SAVE_KEY, RUN_BACKUP_KEY, JSON.stringify(payload));
  }

  load(allowBackup = true): boolean {
    if (allowBackup) this.lastRecoveryMessage = null;
    this.loadMeta();
    this.loadSettings();
    const saved = localStorage.getItem(RUN_SAVE_KEY);
    if (!saved) return false;

    try {
      const parsed = JSON.parse(saved);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || !parsed.player || !parsed.floor) {
        throw new Error("Run save envelope is invalid.");
      }
      if (!localStorage.getItem(SETTINGS_SAVE_KEY) && parsed.settings) {
        this.settings = normalizeSettings(parsed.settings);
        this.saveSettings();
      }
      const loadedVersion = Number(parsed.saveVersion || 0);
      const needsMigration = loadedVersion < CURRENT_SAVE_VERSION;

      this.data = { ...defaultSave, ...parsed };
      this.data.player = { ...defaultSave.player, ...(parsed.player || {}) };
      
      if (!parsed.player?.weaponLoadout) {
        const { createWeaponRuntimeState } = require("./combat/WeaponRuntimeState");
        const legacyWeapon = isWeaponId(parsed.player?.currentWeaponId)
          ? parsed.player.currentWeaponId
          : "pistol";
        this.data.player.weaponLoadout = {
          slots: [createWeaponRuntimeState(legacyWeapon)],
          activeSlot: 0,
          swapTimer: 0
        };
      }

      this.normalizePlayerWeapons();
      this.migrateMicheleStarterLoadout(loadedVersion);
      if (typeof parsed.player?.knightGuardReady !== "boolean") {
        this.data.player.knightGuardReady = this.data.player.characterId === "knight";
      }
      this.normalizePlayerSkills();
      this.normalizePlayerBuffs();
      this.migrateCombatBalance(loadedVersion, parsed.player);
      BuffSystem.applyManaRuntimeStats(this.data.player);
      this.normalizePlayerStatuses();
      this.normalizeRunBonuses();
      this.data.legacyData = { ...defaultSave.legacyData, ...(parsed.legacyData || {}) };
      this.data.legacyData.player = { ...defaultSave.legacyData.player, ...(parsed.legacyData?.player || {}) };

      const legacyGlobalStage = Number(parsed.floor?.globalStageIndex ?? parsed.floor?.depth ?? 1);
      this.data.run = parsed.run
        ? loadedVersion < 24
          ? migrateLegacyRunProgress(parsed.run)
          : normalizeRunProgress(parsed.run)
        : createRunProgressFromGlobalStage(
          loadedVersion < 24 ? migrateLegacyGlobalStage(legacyGlobalStage) : legacyGlobalStage,
        );
      if (loadedVersion < 12 && this.data.run.globalStageIndex > FINAL_GLOBAL_STAGE) {
        this.data.run = createRunProgressFromGlobalStage(FINAL_GLOBAL_STAGE);
      }
      const runStatsSource = loadedVersion < 24 && parsed.runStats
        ? {
          ...parsed.runStats,
          highestStage: migrateLegacyGlobalStage(Number(parsed.runStats.highestStage) || legacyGlobalStage),
          stagesCleared: Math.max(0, this.data.run.globalStageIndex - 1),
        }
        : parsed.runStats;
      this.data.runStats = normalizeRunStats(runStatsSource, this.data.run);

      const stageCompatible = this.isStageCompatible(parsed.floor, this.data.run);
      if (loadedVersion < 6 || !stageCompatible) {
        this.data.floor = generateStage(this.data.run);
        this.data.player.x = 160;
        this.data.player.y = 120;
      } else {
        this.data.floor = parsed.floor;
        this.normalizeStageMetadata();
        for (const room of this.data.floor.rooms) normalizeRoomState(room);
      }

      if (needsMigration) {
        console.warn(`Migrating save from version ${loadedVersion} to ${CURRENT_SAVE_VERSION}`);
      }

      this.data.saveVersion = CURRENT_SAVE_VERSION;
      if (needsMigration || !stageCompatible) this.save();
      return true;
    } catch (error) {
      if (allowBackup && this.restoreBackup(RUN_SAVE_KEY, RUN_BACKUP_KEY, "RUN")) {
        console.warn("[SaveRecovery] Run data restored from backup.");
        return this.load(false);
      }
      console.error("Failed to load save:", error);
      return false;
    }
  }

  hasValidSave(): boolean {
    if (!localStorage.getItem(RUN_SAVE_KEY)) return false;
    if (this.data.player.hp <= 0) return false;
    if (this.data.runStats.settled || this.data.runStats.outcome !== "active") return false;
    return true;
  }

  startNewRun(characterId: string, starterWeaponId?: string, hardMode = this.meta.preferredHardMode) {
    const requested = CHARACTERS[characterId];
    const char = requested && this.isCharacterUnlocked(requested.id)
      ? requested
      : CHARACTERS.knight;
    const bonuses = getMetaBonuses(this.meta.upgrades);
    this.data.player.characterId = char.id;
    this.data.player.x = 160;
    this.data.player.y = 120;
    this.data.player.maxHp = char.maxHp + bonuses.maxHp;
    this.data.player.hp = this.data.player.maxHp;
    this.data.player.maxArmor = char.maxArmor + bonuses.maxArmor;
    this.data.player.armor = this.data.player.maxArmor;
    this.data.player.maxMana = char.maxMana;
    this.data.player.mana = char.maxMana;
    this.data.player.speed = char.speed;
    const requestedStarter = starterWeaponId && isWeaponId(starterWeaponId) ? WEAPONS[starterWeaponId] : undefined;
    const starterWeapon = requestedStarter &&
      this.isStarterWeaponUnlocked(requestedStarter.id) &&
      isWeaponAvailableForCharacter(requestedStarter, char.id)
      ? requestedStarter.id
      : this.getStarterWeaponForCharacter(char.id);
    this.setStarterWeapons(starterWeapon, char.id);
    this.resetSkillState(char.id);
    this.resetBuffState();
    this.data.player.statusEffects = [];
    this.data.player.coins = bonuses.startingCoins;
    this.data.player.buffRerollsRemaining = bonuses.buffRerolls;
    this.data.player.shopDiscount = bonuses.shopDiscount;
    this.data.player.supplyDropBonus = bonuses.supplyDropBonus;
    const useHardMode = this.meta.hardModeUnlocked && hardMode;
    this.data.run = createInitialRunProgress(
      useHardMode,
      useHardMode ? this.meta.preferredChallengeId : undefined,
      useHardMode && this.meta.preferredChallengeId
        ? getChallengeDateKey(this.meta.preferredChallengeId)
        : undefined,
    );
    this.data.runStats = createRunStats(this.data.run);
    this.data.floor = generateStage(this.data.run);
    this.data.legacyData.clearedRooms = [];
    this.data.legacyData.legacyRewardsClaimed = [];
    this.data.saveVersion = CURRENT_SAVE_VERSION;
    this.discoverPlayerBuild();
    this.save();
  }

  restartCurrentRun() {
    const char = CHARACTERS[this.data.player.characterId] || CHARACTERS.knight;
    const bonuses = getMetaBonuses(this.meta.upgrades);
    this.data.player.x = 160;
    this.data.player.y = 120;
    this.data.player.maxHp = char.maxHp + bonuses.maxHp;
    this.data.player.hp = this.data.player.maxHp;
    this.data.player.maxArmor = char.maxArmor + bonuses.maxArmor;
    this.data.player.armor = this.data.player.maxArmor;
    this.data.player.mana = char.maxMana;
    this.data.player.maxMana = char.maxMana;
    this.data.player.speed = char.speed;
    this.setStarterWeapons(this.getStarterWeaponForCharacter(char.id), char.id);
    this.resetSkillState(this.data.player.characterId);
    this.resetBuffState();
    this.data.player.statusEffects = [];
    this.data.player.coins = bonuses.startingCoins;
    this.data.player.buffRerollsRemaining = bonuses.buffRerolls;
    this.data.player.shopDiscount = bonuses.shopDiscount;
    this.data.player.supplyDropBonus = bonuses.supplyDropBonus;
    const useHardMode = this.meta.hardModeUnlocked && this.meta.preferredHardMode;
    this.data.run = createInitialRunProgress(
      useHardMode,
      useHardMode ? this.meta.preferredChallengeId : undefined,
      useHardMode && this.meta.preferredChallengeId
        ? getChallengeDateKey(this.meta.preferredChallengeId)
        : undefined,
    );
    this.data.runStats = createRunStats(this.data.run);
    this.data.floor = generateStage(this.data.run);
    this.data.legacyData.clearedRooms = [];
    this.data.legacyData.legacyRewardsClaimed = [];
    this.data.saveVersion = CURRENT_SAVE_VERSION;
    this.discoverPlayerBuild();
    this.save();
  }

  advanceStage(): { previous: RunProgress; current: RunProgress; chapterChanged: boolean } {
    const previous = { ...this.data.run };
    this.data.run = advanceRunProgress(this.data.run);
    this.data.runStats.stagesCleared = Math.max(
      this.data.runStats.stagesCleared,
      this.data.run.stagesCleared,
    );
    this.data.runStats.highestStage = Math.max(
      this.data.runStats.highestStage,
      this.data.run.globalStageIndex,
    );
    this.data.player.x = 160;
    this.data.player.y = 120;
    this.data.floor = generateStage(this.data.run);
    this.data.saveVersion = CURRENT_SAVE_VERSION;
    this.save();
    const current = { ...this.data.run };
    return {
      previous,
      current,
      chapterChanged: previous.routeDepth !== current.routeDepth,
    };
  }

  advanceToNode(worldNodeId: string): { previous: RunProgress; current: RunProgress; chapterChanged: boolean } {
    const previous = { ...this.data.run };
    const next = { ...this.data.run };
    next.routeHistory.push(next.worldNodeId);
    next.worldNodeId = worldNodeId;
    next.routeDepth += 1;
    next.stageWithinNode = 1;
    this.data.run = next;
    this.data.runStats.stagesCleared = Math.max(
      this.data.runStats.stagesCleared,
      this.data.run.stagesCleared,
    );
    this.data.runStats.highestStage = Math.max(
      this.data.runStats.highestStage,
      this.data.run.globalStageIndex,
    );
    this.data.player.x = 160;
    this.data.player.y = 120;
    this.data.floor = generateStage(this.data.run);
    this.data.saveVersion = CURRENT_SAVE_VERSION;
    this.save();
    const current = { ...this.data.run };
    return {
      previous,
      current,
      chapterChanged: previous.routeDepth !== current.routeDepth,
    };
  }

  resetRun() {
    this.restartCurrentRun();
  }

  abandonRun(): void {
    localStorage.removeItem(RUN_SAVE_KEY);
    localStorage.removeItem(RUN_BACKUP_KEY);
    this.data = JSON.parse(JSON.stringify(defaultSave));
    this.data.run = createInitialRunProgress();
    this.data.runStats = createRunStats(this.data.run);
    this.data.floor = generateStage(this.data.run);
  }

  resetAll() {
    localStorage.removeItem(RUN_SAVE_KEY);
    localStorage.removeItem(META_SAVE_KEY);
    localStorage.removeItem(RUN_BACKUP_KEY);
    localStorage.removeItem(META_BACKUP_KEY);
    this.meta = createDefaultMetaProgress();
    this.data = JSON.parse(JSON.stringify(defaultSave));
    this.data.run = createInitialRunProgress();
    this.data.runStats = createRunStats(this.data.run);
    this.data.floor = generateStage(this.data.run);
    this.data.saveVersion = CURRENT_SAVE_VERSION;
    this.save();
  }

  private setStarterWeapons(starterWeapon: string, characterId = this.data.player.characterId) {
    const slots = createStarterWeaponSlots(starterWeapon, characterId);

    this.data.player.weaponLoadout.slots = [createWeaponRuntimeState(slots[0])];
    if (slots[1]) this.data.player.weaponLoadout.slots.push(createWeaponRuntimeState(slots[1]));
    this.data.player.weaponLoadout.activeSlot = 0;
    this.data.player.currentWeaponId = slots[0];

  }

  public isCharacterUnlocked(characterId: string): boolean {
    return this.meta.unlockedCharacters.includes(characterId);
  }

  public isStarterWeaponUnlocked(weaponId: string): boolean {
    return this.meta.unlockedStarterWeapons.includes(weaponId);
  }

  public getStarterWeaponForCharacter(characterId: string): string {
    const character = CHARACTERS[characterId] || CHARACTERS.knight;
    return this.isStarterWeaponUnlocked(character.starterWeapon)
      ? character.starterWeapon
      : "pistol";
  }

  public setHubLoadout(characterId: string, starterWeaponId?: string): void {
    const character = CHARACTERS[characterId];
    const selectedCharacter = character && this.isCharacterUnlocked(character.id)
      ? character
      : CHARACTERS.knight;
    const requestedWeapon = starterWeaponId && isWeaponId(starterWeaponId)
      ? WEAPONS[starterWeaponId]
      : undefined;
    const selectedWeapon = requestedWeapon
      && this.isStarterWeaponUnlocked(requestedWeapon.id)
      && isWeaponAvailableForCharacter(requestedWeapon, selectedCharacter.id)
      ? requestedWeapon.id
      : this.getStarterWeaponForCharacter(selectedCharacter.id);
    this.meta.hubProgress.selectedCharacterId = selectedCharacter.id;
    this.meta.hubProgress.selectedStarterWeaponId = selectedWeapon;
    this.saveMeta();
  }

  public getHubLoadout(): { characterId: string; starterWeaponId: string } {
    const progress = this.meta.hubProgress;
    const character = CHARACTERS[progress.selectedCharacterId];
    const characterId = character && this.isCharacterUnlocked(character.id) ? character.id : "knight";
    const requestedWeapon = isWeaponId(progress.selectedStarterWeaponId)
      ? WEAPONS[progress.selectedStarterWeaponId]
      : undefined;
    const starterWeaponId = requestedWeapon
      && this.isStarterWeaponUnlocked(requestedWeapon.id)
      && isWeaponAvailableForCharacter(requestedWeapon, characterId)
      ? requestedWeapon.id
      : this.getStarterWeaponForCharacter(characterId);
    return { characterId, starterWeaponId };
  }

  public purchaseMetaUpgrade(id: MetaUpgradeId): { success: boolean; cost: number; reason?: "max" | "currency" } {
    const definition = META_UPGRADES[id];
    const level = this.meta.upgrades[id];
    const cost = getUpgradeCost(id, level);
    if (cost === null || level >= definition.maxLevel) {
      return { success: false, cost: 0, reason: "max" };
    }
    if (this.meta.currency < cost) {
      return { success: false, cost, reason: "currency" };
    }
    this.meta.currency -= cost;
    this.meta.upgrades[id]++;
    this.saveMeta();
    return { success: true, cost };
  }

  public refundMetaUpgrades(): number {
    const refunded = getUpgradeInvestment(this.meta.upgrades);
    if (refunded <= 0) return 0;
    this.meta.currency += refunded;
    this.meta.upgrades = createDefaultMetaUpgrades();
    this.saveMeta();
    return refunded;
  }

  public setPreferredHardMode(enabled: boolean): boolean {
    if (!this.meta.hardModeUnlocked) {
      this.meta.preferredHardMode = false;
      return false;
    }
    this.meta.preferredHardMode = enabled;
    if (!enabled) this.meta.preferredChallengeId = undefined;
    this.saveMeta();
    return true;
  }

  public setPreferredChallenge(challengeId?: ChallengeId): boolean {
    if (!this.meta.hardModeUnlocked || !this.meta.preferredHardMode) {
      this.meta.preferredChallengeId = undefined;
      this.saveMeta();
      return false;
    }
    this.meta.preferredChallengeId = isChallengeId(challengeId) ? challengeId : undefined;
    this.saveMeta();
    return true;
  }

  public discoverEnemy(enemyId: string): void {
    if (!isEnemyId(enemyId)) return;
    const collection = ENEMIES[enemyId].role === "boss"
      ? this.meta.codex.bosses
      : this.meta.codex.enemies;
    if (collection.includes(enemyId)) return;
    collection.push(enemyId);
    this.saveMeta();
  }

  public discoverWeapon(weaponId: string): void {
    if (!isWeaponId(weaponId) || this.meta.codex.weapons.includes(weaponId)) return;
    this.meta.codex.weapons.push(weaponId);
    this.saveMeta();
  }

  public discoverBuff(buffId: BuffId): void {
    if (this.meta.codex.buffs.includes(buffId)) return;
    this.meta.codex.buffs.push(buffId);
    this.saveMeta();
  }

  public discoverPlayerBuild(): void {
    
    for (const slot of this.data.player.weaponLoadout.slots) {
      const weaponId = slot?.weaponId;
      if (!weaponId) continue;

      if (weaponId) this.discoverWeapon(weaponId);
    }
    for (const buffId of this.data.player.buffs) this.discoverBuff(buffId);
  }

  public recordRunTime(dt: number): void {
    if (this.data.runStats.settled || this.data.runStats.outcome !== "active") return;
    if (!Number.isFinite(dt) || dt <= 0) return;
    this.data.runStats.elapsedSeconds += dt;
  }

  public recordWeaponUsed(weaponId: string): void {
    if (this.data.runStats.settled || this.data.runStats.outcome !== "active") return;
    if (!this.data.runStats.weaponsUsed.includes(weaponId)) {
      this.data.runStats.weaponsUsed.push(weaponId);
    }
    this.discoverWeapon(weaponId);
  }

  public startBossFight(): void {
    if (this.data.runStats.bossFightActive) return;
    this.data.runStats.bossFightActive = true;
    this.data.runStats.currentBossDamageTaken = 0;
  }

  public recordPlayerDamage(amount: number, bossSource: boolean): void {
    if (!bossSource || !this.data.runStats.bossFightActive) return;
    this.data.runStats.currentBossDamageTaken += Math.max(0, amount);
  }

  public recordEnemyKill(
    enemy: Pick<Enemy, "type" | "isElite"> & Partial<Pick<Enemy, "enemyId">>,
  ): void {
    if (this.data.runStats.settled || this.data.runStats.outcome !== "active") return;
    this.data.runStats.kills++;
    if (enemy.isElite) this.data.runStats.eliteKills++;
    if (enemy.enemyId) this.discoverEnemy(enemy.enemyId);
    if (enemy.type === "boss") {
      this.data.runStats.bossKills++;
      if (this.data.runStats.bossFightActive && this.data.runStats.currentBossDamageTaken <= 0) {
        this.data.runStats.noHitBossKills++;
      }
      this.data.runStats.bossFightActive = false;
      this.data.runStats.currentBossDamageTaken = 0;
    }
  }

  public finalizeRun(outcome: Exclude<RunOutcome, "active">): RunSummary {
    const stats = normalizeRunStats(this.data.runStats, this.data.run);
    const alreadyClaimed =
      (stats.settled && stats.outcome !== "active") ||
      this.meta.claimedRunIds.includes(stats.runId);
    const resolvedOutcome = (stats.settled || alreadyClaimed) && stats.outcome !== "active"
      ? stats.outcome
      : outcome;
    stats.highestStage = Math.max(stats.highestStage, this.data.run.globalStageIndex);
    stats.stagesCleared = Math.max(
      stats.stagesCleared,
      this.data.run.stagesCleared + (resolvedOutcome === "victory" && isFinalStage(this.data.run) ? 1 : 0),
    );
    stats.outcome = resolvedOutcome;
    stats.settled = true;

    let baseReward = 0;
    let challengeReward = 0;
    let achievementReward = 0;
    let rewardEarned = 0;
    let newUnlocks: string[] = [];
    let newAchievements: AchievementId[] = [];
    if (!alreadyClaimed) {
      baseReward = Math.round(
        calculateRunReward(stats, resolvedOutcome) * (this.data.run.hardMode ? 1.5 : 1),
      );
      stats.challengeCompleted = evaluateChallenge(this.data.run.challengeId, stats, resolvedOutcome);
      const challengeAlreadyClaimed = Boolean(
        this.data.run.challengeKey && this.meta.claimedChallengeKeys.includes(this.data.run.challengeKey),
      );
      challengeReward = stats.challengeCompleted && !challengeAlreadyClaimed
        ? getChallengeReward(this.data.run.challengeId)
        : 0;

      this.meta.lifetimeKills += stats.kills;
      this.meta.lifetimeEliteKills += stats.eliteKills;
      this.meta.lifetimeBossKills += stats.bossKills;
      if (stats.challengeCompleted && !challengeAlreadyClaimed) {
        this.meta.completedChallenges++;
        if (this.data.run.challengeKey) {
          this.meta.claimedChallengeKeys.push(this.data.run.challengeKey);
          this.meta.claimedChallengeKeys = this.meta.claimedChallengeKeys.slice(-100);
        }
      }

      newAchievements = evaluateAchievements(this.meta, stats, resolvedOutcome, this.data.run.hardMode);
      const unclaimedAchievements = newAchievements.filter(
        id => !this.meta.claimedAchievementRewards.includes(id),
      );
      achievementReward = getAchievementReward(unclaimedAchievements);
      this.meta.unlockedAchievements.push(...newAchievements);
      this.meta.claimedAchievementRewards.push(...unclaimedAchievements);

      rewardEarned = baseReward + challengeReward + achievementReward;
      this.meta.currency += rewardEarned;
      this.meta.highestStage = Math.max(this.meta.highestStage, stats.highestStage);
      this.meta.totalRuns++;
      if (resolvedOutcome === "victory") {
        this.meta.victories++;
        this.meta.bestVictoryTime = this.meta.bestVictoryTime === null
          ? stats.elapsedSeconds
          : Math.min(this.meta.bestVictoryTime, stats.elapsedSeconds);
      }
      this.meta.claimedRunIds.push(stats.runId);
      this.meta.claimedRunIds = this.meta.claimedRunIds.slice(-100);
      newUnlocks = applyMetaUnlocks(this.meta);
      this.saveMeta();
    }

    this.data.runStats = stats;
    this.save();
    return {
      ...stats,
      baseReward,
      challengeReward,
      achievementReward,
      newAchievements,
      rewardEarned,
      totalCurrency: this.meta.currency,
      newUnlocks,
      alreadyClaimed,
    };
  }

  public saveSettings(): void {
    this.settings = normalizeSettings(this.settings);
    this.writeWithBackup(SETTINGS_SAVE_KEY, SETTINGS_BACKUP_KEY, JSON.stringify(this.settings));
  }

  public loadSettings(allowBackup = true): boolean {
    const saved = localStorage.getItem(SETTINGS_SAVE_KEY);
    if (!saved) {
      this.settings = createDefaultSettings();
      return false;
    }
    try {
      const parsed = JSON.parse(saved);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Settings envelope is invalid.");
      this.settings = normalizeSettings(parsed);
      this.saveSettings();
      return true;
    } catch (error) {
      if (allowBackup && this.restoreBackup(SETTINGS_SAVE_KEY, SETTINGS_BACKUP_KEY, "SETTINGS")) {
        console.warn("[SaveRecovery] Settings restored from backup.");
        return this.loadSettings(false);
      }
      console.error("Failed to load settings:", error);
      this.settings = createDefaultSettings();
      return false;
    }
  }

  public resetSettings(): void {
    this.settings = createDefaultSettings();
    this.saveSettings();
  }

  public saveMeta(): void {
    this.meta = normalizeMetaProgress(this.meta);
    this.writeWithBackup(META_SAVE_KEY, META_BACKUP_KEY, JSON.stringify(this.meta));
  }

  public loadMeta(allowBackup = true): boolean {
    const saved = localStorage.getItem(META_SAVE_KEY);
    if (!saved) {
      this.meta = createDefaultMetaProgress();
      return false;
    }
    try {
      const parsed = JSON.parse(saved);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Meta envelope is invalid.");
      const migrated = Number(parsed?.version || 0) < META_SAVE_VERSION;
      this.meta = normalizeMetaProgress(parsed);
      if (migrated) this.saveMeta();
      return true;
    } catch (error) {
      if (allowBackup && this.restoreBackup(META_SAVE_KEY, META_BACKUP_KEY, "META")) {
        console.warn("[SaveRecovery] Meta progress restored from backup.");
        return this.loadMeta(false);
      }
      console.error("Failed to load meta progress:", error);
      this.meta = createDefaultMetaProgress();
      return false;
    }
  }

  public exportBundle(): string {
    this.save();
    this.saveMeta();
    this.saveSettings();
    const bundle = createSaveBundle({
      run: this.data,
      meta: this.meta,
      settings: this.settings,
    });
    return JSON.stringify(bundle, null, 2);
  }

  public importBundle(raw: string): { success: boolean; message: string } {
    const originals = {
      run: localStorage.getItem(RUN_SAVE_KEY),
      meta: localStorage.getItem(META_SAVE_KEY),
      settings: localStorage.getItem(SETTINGS_SAVE_KEY),
    };
    try {
      const payload = parseSaveBundle(raw);
      this.backupCurrentStorage();
      localStorage.setItem(RUN_SAVE_KEY, JSON.stringify(payload.run));
      localStorage.setItem(META_SAVE_KEY, JSON.stringify(payload.meta));
      localStorage.setItem(SETTINGS_SAVE_KEY, JSON.stringify(payload.settings));
      this.lastRecoveryMessage = null;
      if (!this.load(false)) throw new Error("Imported Run data could not be loaded.");
      if (!this.loadMeta(false)) throw new Error("Imported Meta data could not be loaded.");
      if (!this.loadSettings(false)) throw new Error("Imported Settings could not be loaded.");
      this.save();
      this.saveMeta();
      this.saveSettings();
      if (isJsonObject(originals.run)) localStorage.setItem(RUN_BACKUP_KEY, originals.run!);
      if (isJsonObject(originals.meta)) localStorage.setItem(META_BACKUP_KEY, originals.meta!);
      if (isJsonObject(originals.settings)) localStorage.setItem(SETTINGS_BACKUP_KEY, originals.settings!);
      return { success: true, message: "SAVE DATA IMPORTED" };
    } catch (error) {
      this.restoreOriginalStorage(RUN_SAVE_KEY, originals.run);
      this.restoreOriginalStorage(META_SAVE_KEY, originals.meta);
      this.restoreOriginalStorage(SETTINGS_SAVE_KEY, originals.settings);
      this.load(false);
      const message = error instanceof Error ? error.message : "Import failed.";
      return { success: false, message: message.toUpperCase() };
    }
  }

  private writeWithBackup(primaryKey: string, backupKey: string, value: string): void {
    const current = localStorage.getItem(primaryKey);
    if (isJsonObject(current) && current !== value) localStorage.setItem(backupKey, current);
    localStorage.setItem(primaryKey, value);
  }

  private backupCurrentStorage(): void {
    const pairs = [
      [RUN_SAVE_KEY, RUN_BACKUP_KEY],
      [META_SAVE_KEY, META_BACKUP_KEY],
      [SETTINGS_SAVE_KEY, SETTINGS_BACKUP_KEY],
    ] as const;
    for (const [primary, backup] of pairs) {
      const current = localStorage.getItem(primary);
      if (isJsonObject(current)) localStorage.setItem(backup, current);
    }
  }

  private restoreBackup(primaryKey: string, backupKey: string, label: string): boolean {
    const backup = localStorage.getItem(backupKey);
    if (!isJsonObject(backup)) return false;
    localStorage.setItem(primaryKey, backup!);
    this.lastRecoveryMessage = `${label} DATA RESTORED FROM BACKUP`;
    return true;
  }

  private restoreOriginalStorage(key: string, value: string | null): void {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  }

  private normalizePlayerWeapons() {
    const player = this.data.player;
    const fallback = isWeaponId(player.currentWeaponId) ? player.currentWeaponId : "pistol";
    
    if (!player.weaponLoadout) {
      const { createWeaponRuntimeState } = require("./combat/WeaponRuntimeState");
      const w1 = Array.isArray((player as any).weaponSlots) ? (player as any).weaponSlots[0] : fallback;
      const w2 = Array.isArray((player as any).weaponSlots) ? (player as any).weaponSlots[1] : undefined;
      player.weaponLoadout = {
        slots: [createWeaponRuntimeState(w1)],
        activeSlot: (player as any).activeWeaponSlot || 0,
        swapTimer: 0
      };
      if (w2) player.weaponLoadout.slots[1] = createWeaponRuntimeState(w2);
    }

    
    const eligibleSlots = player.weaponLoadout.slots.filter(s => s && isWeaponAvailableForCharacter(WEAPONS[s.weaponId], player.characterId));
    const characterStarter = CHARACTERS[player.characterId]?.starterWeapon ?? "pistol";
    if (eligibleSlots.length === 0) { player.weaponLoadout.slots = [createWeaponRuntimeState(characterStarter)]; } else { player.weaponLoadout.slots = eligibleSlots as any; }
    
    player.weaponLoadout.activeSlot = player.weaponLoadout.activeSlot === 1 && player.weaponLoadout.slots[1] ? 1 : 0;

    
    player.currentWeaponId = player.weaponLoadout.slots[player.weaponLoadout.activeSlot]?.weaponId ?? player.weaponLoadout.slots[0].weaponId;

  }

  private resetSkillState(characterId: string) {
    const player = this.data.player;
    player.skillCooldown = 0;
    player.skillActiveTimer = 0;
    player.skillDirectionX = 0;
    player.skillDirectionY = 0;
    player.rogueCritTimer = 0;
    player.mageArcaneCharge = 0;
    player.knightGuardReady = characterId === "knight";
    player.micheleMarkedEnemyId = -1;
    player.micheleMarkTimer = 0;
    player.micheleTurretX = 0;
    player.micheleTurretY = 0;
    player.micheleTurretFireCooldown = 0;
    player.manaRechargeTimer = 0;
    const character = CHARACTERS[characterId] ?? CHARACTERS.knight;
    player.manaRechargeDelay = character.manaRechargeDelay;
    player.manaRechargeRate = character.manaRechargeRate;
  }

  private normalizePlayerSkills() {
    const player = this.data.player;
    const finiteNonNegative = (value: unknown) => {
      const number = Number(value);
      return Number.isFinite(number) ? Math.max(0, number) : 0;
    };
    player.skillCooldown = finiteNonNegative(player.skillCooldown);
    player.skillActiveTimer = player.characterId === "michele" || player.characterId === "kanami" || player.characterId === "celestia"
      ? 0
      : finiteNonNegative(player.skillActiveTimer);
    player.skillDirectionX = Number.isFinite(Number(player.skillDirectionX)) ? Number(player.skillDirectionX) : 0;
    player.skillDirectionY = Number.isFinite(Number(player.skillDirectionY)) ? Number(player.skillDirectionY) : 0;
    player.rogueCritTimer = finiteNonNegative(player.rogueCritTimer);
    player.mageArcaneCharge = player.characterId === "mage"
      ? finiteNonNegative(player.mageArcaneCharge)
      : 0;
    const character = CHARACTERS[player.characterId] ?? CHARACTERS.knight;
    player.maxMana = Math.max(1, Math.min(MAX_PLAYER_MANA, Number(player.maxMana) || character.maxMana));
    player.mana = Math.max(0, Math.min(player.maxMana, Number(player.mana) || 0));
    player.manaRechargeTimer = finiteNonNegative(player.manaRechargeTimer);
    player.manaRechargeDelay = Math.max(0.2, Number(player.manaRechargeDelay) || DEFAULT_MANA_RECHARGE_DELAY);
    player.manaRechargeRate = Math.max(0, Number(player.manaRechargeRate) || DEFAULT_MANA_RECHARGE_RATE);
    player.knightGuardReady = player.characterId === "knight" && player.knightGuardReady === true;
    player.micheleMarkedEnemyId = -1;
    player.micheleMarkTimer = 0;
    player.micheleTurretX = 0;
    player.micheleTurretY = 0;
    player.micheleTurretFireCooldown = 0;
  }

  private migrateMicheleStarterLoadout(loadedVersion: number): void {
    if (loadedVersion >= 21) return;
    const player = this.data.player;
    if (
      player.characterId === "michele" &&
      player.weaponLoadout.slots[0]?.weaponId === "inspector" &&
      player.weaponLoadout.slots[1]?.weaponId === "pistol"
    ) {
      player.weaponLoadout.slots = [createWeaponRuntimeState("inspector")];
      player.weaponLoadout.activeSlot = 0;
      player.currentWeaponId = "inspector";
    }
  }

  private resetBuffState() {
    this.data.player.buffs = [];
    this.data.player.emergencyBarrierReady = false;
    this.data.player.phoenixProtocolReady = false;
  }

  private normalizePlayerBuffs() {
    const player = this.data.player;
    player.buffs = BuffSystem.normalizeBuffs(player.buffs);
    player.emergencyBarrierReady =
      player.buffs.includes("emergency_barrier") && player.emergencyBarrierReady === true;
    player.phoenixProtocolReady =
      player.buffs.includes("phoenix_protocol") && player.phoenixProtocolReady === true;
  }

  private migrateCombatBalance(loadedVersion: number, rawPlayer?: Partial<GameSave["player"]>) {
    if (loadedVersion >= 18) return;
    const oldMaxMana = Number(rawPlayer?.maxMana);
    const oldMana = Number(rawPlayer?.mana);
    const manaRatio = Number.isFinite(oldMaxMana) && oldMaxMana > 0
      ? Math.max(0, Math.min(1, (Number.isFinite(oldMana) ? oldMana : oldMaxMana) / oldMaxMana))
      : 1;
    BuffSystem.applyManaRuntimeStats(this.data.player);
    this.data.player.mana = this.data.player.maxMana * manaRatio;
  }

  private normalizePlayerStatuses() {
    this.data.player.statusEffects = StatusEffectSystem.normalize(this.data.player.statusEffects);
  }

  private normalizeRunBonuses() {
    const player = this.data.player;
    player.buffRerollsRemaining = Math.max(0, Math.floor(Number(player.buffRerollsRemaining) || 0));
    player.shopDiscount = Math.max(0, Math.min(0.5, Number(player.shopDiscount) || 0));
    player.supplyDropBonus = Math.max(0, Math.min(0.5, Number(player.supplyDropBonus) || 0));
  }

  private normalizeStageMetadata() {
    const run = normalizeRunProgress(this.data.run);
    this.data.run = run;
    const stage = this.data.floor;
    if (!stage || !Array.isArray(stage.rooms)) {
      this.data.floor = generateStage(run);
      return;
    }
    stage.depth = run.globalStageIndex;
    stage.routeDepth = run.routeDepth;
    stage.stageWithinNode = run.stageWithinNode;
    stage.globalStageIndex = run.globalStageIndex;
    stage.isBossStage = isBossStage(run);
    stage.hardMode = run.hardMode;
    stage.challengeId = run.challengeId;
    stage.challengeKey = run.challengeKey;
    stage.buffChoiceRerollCount = Math.max(0, Math.floor(Number(stage.buffChoiceRerollCount) || 0));
    for (const room of stage.rooms) {
      if (false) {
        room.type = "combat";
        room.templateId = "legacy_room";
        room.interactionCompleted = false;
        room.rewardGenerated = false;
      } else if (false) {
        room.type = "combat";
        room.templateId = "legacy_room";
        room.interactionCompleted = false;
        room.rewardGenerated = false;
      }
    }
    const roomSignature = stage.rooms
      .map(room => `${room.id}:${room.type}`)
      .sort()
      .join("|");
    stage.seed = normalizeSeed(
      Number(stage.seed) || hashSeed(0xC0FFEE, `${run.globalStageIndex}:${roomSignature}`),
    );

    if (false) {
      const preparation = stage.rooms.find(room => room.type === "treasure");
      if (preparation) {
        
        preparation.templateId = "horizontal_corridor";
        preparation.interactionCompleted = false;
        preparation.rewardGenerated = false;
        preparation.pickups = [];
        preparation.shopStock = undefined;
      }
    }

    for (const room of stage.rooms) {
      room.encounterSeed = normalizeSeed(
        Number(room.encounterSeed) || hashSeed(stage.seed, room.id),
      );
      for (const enemy of room.enemies ?? []) {
        enemy.statusEffects = StatusEffectSystem.normalize(enemy.statusEffects);
      }
          }
  }

  private isStageCompatible(stage: any, run: RunProgress): boolean {
    if (!stage || !Array.isArray(stage.rooms) || stage.rooms.length === 0) return false;
    if (stage.routeDepth !== run.routeDepth || stage.stageWithinNode !== run.stageWithinNode) return false;
    if (stage.globalStageIndex !== run.globalStageIndex) return false;
    if ((stage.hardMode === true) !== run.hardMode) return false;
    if (stage.challengeId !== run.challengeId) return false;
    if (stage.challengeKey !== run.challengeKey) return false;

    const bossRooms = stage.rooms.filter((room: any) => room.type === "boss").length;
    const exitRooms = stage.rooms.filter((room: any) => room.type === "exit").length;
    return isBossStage(run)
      ? stage.isBossStage === true && bossRooms === 1 && exitRooms === 0
      : stage.isBossStage === false && bossRooms === 0 && exitRooms === 1;
  }

  logEvent(event: string) {
    this.data.recentEvents.push(event);
    if (this.data.recentEvents.length > 5) {
      this.data.recentEvents.shift();
    }
  }
}
