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
  normalizeRunProgress,
  type RunProgress,
} from "./RunProgress";
import {
  createStarterWeaponSlots,
  isWeaponId,
  normalizeWeaponSlots,
  type WeaponSlots,
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
  normalizeMetaProgress,
  type MetaProgress,
} from "./MetaProgress";
import type { Enemy } from "./entities/Enemy";
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

export const RUN_SAVE_KEY = "retro_rpg_save";
export const META_SAVE_KEY = "retro_rpg_meta";
const CURRENT_SAVE_VERSION = 15;
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
    weaponSlots: WeaponSlots;
    activeWeaponSlot: 0 | 1;
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
    knightGuardReady: boolean;
    buffs: BuffId[];
    emergencyBarrierReady: boolean;
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
    mana: 100,
    maxMana: 100,
    weaponSlots: ["pistol"],
    activeWeaponSlot: 0,
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
    knightGuardReady: true,
    buffs: [],
    emergencyBarrierReady: false,
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
    localStorage.setItem(RUN_SAVE_KEY, JSON.stringify(payload));
  }

  load() {
    this.loadMeta();
    this.loadSettings();
    const saved = localStorage.getItem(RUN_SAVE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      if (!localStorage.getItem(SETTINGS_SAVE_KEY) && parsed.settings) {
        this.settings = normalizeSettings(parsed.settings);
        this.saveSettings();
      }
      const loadedVersion = Number(parsed.saveVersion || 0);
      const needsMigration = loadedVersion < CURRENT_SAVE_VERSION;

      this.data = { ...defaultSave, ...parsed };
      this.data.player = { ...defaultSave.player, ...(parsed.player || {}) };
      if (!Array.isArray(parsed.player?.weaponSlots)) {
        const legacyWeapon = isWeaponId(parsed.player?.currentWeaponId)
          ? parsed.player.currentWeaponId
          : "pistol";
        this.data.player.weaponSlots = [legacyWeapon];
        this.data.player.activeWeaponSlot = 0;
      }
      this.normalizePlayerWeapons();
      if (typeof parsed.player?.knightGuardReady !== "boolean") {
        this.data.player.knightGuardReady = this.data.player.characterId === "knight";
      }
      this.normalizePlayerSkills();
      this.normalizePlayerBuffs();
      this.normalizePlayerStatuses();
      this.normalizeRunBonuses();
      this.data.legacyData = { ...defaultSave.legacyData, ...(parsed.legacyData || {}) };
      this.data.legacyData.player = { ...defaultSave.legacyData.player, ...(parsed.legacyData?.player || {}) };

      const legacyGlobalStage = Number(parsed.floor?.globalStageIndex ?? parsed.floor?.depth ?? 1);
      this.data.run = parsed.run
        ? normalizeRunProgress(parsed.run)
        : createRunProgressFromGlobalStage(legacyGlobalStage);
      if (loadedVersion < 12 && this.data.run.globalStageIndex > FINAL_GLOBAL_STAGE) {
        this.data.run = createRunProgressFromGlobalStage(FINAL_GLOBAL_STAGE);
      }
      this.data.runStats = normalizeRunStats(parsed.runStats, this.data.run);

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
    } catch (error) {
      console.error("Failed to load save:", error);
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
    const starterWeapon = starterWeaponId && this.isStarterWeaponUnlocked(starterWeaponId)
      ? starterWeaponId
      : this.getStarterWeaponForCharacter(char.id);
    this.setStarterWeapons(starterWeapon);
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
    this.setStarterWeapons(this.getStarterWeaponForCharacter(char.id));
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

  advanceStage() {
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
  }

  resetRun() {
    this.restartCurrentRun();
  }

  resetAll() {
    localStorage.removeItem(RUN_SAVE_KEY);
    localStorage.removeItem(META_SAVE_KEY);
    this.meta = createDefaultMetaProgress();
    this.data = JSON.parse(JSON.stringify(defaultSave));
    this.data.run = createInitialRunProgress();
    this.data.runStats = createRunStats(this.data.run);
    this.data.floor = generateStage(this.data.run);
    this.data.saveVersion = CURRENT_SAVE_VERSION;
    this.save();
  }

  private setStarterWeapons(starterWeapon: string) {
    const slots = createStarterWeaponSlots(starterWeapon);
    this.data.player.weaponSlots = slots[1] ? [slots[0], slots[1]] : [slots[0]];
    this.data.player.activeWeaponSlot = 0;
    this.data.player.currentWeaponId = this.data.player.weaponSlots[0];
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
    for (const weaponId of this.data.player.weaponSlots) {
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
    localStorage.setItem(SETTINGS_SAVE_KEY, JSON.stringify(this.settings));
  }

  public loadSettings(): void {
    const saved = localStorage.getItem(SETTINGS_SAVE_KEY);
    if (!saved) {
      this.settings = createDefaultSettings();
      return;
    }
    try {
      this.settings = normalizeSettings(JSON.parse(saved));
      this.saveSettings();
    } catch (error) {
      console.error("Failed to load settings:", error);
      this.settings = createDefaultSettings();
    }
  }

  public resetSettings(): void {
    this.settings = createDefaultSettings();
    this.saveSettings();
  }

  public saveMeta(): void {
    this.meta = normalizeMetaProgress(this.meta);
    localStorage.setItem(META_SAVE_KEY, JSON.stringify(this.meta));
  }

  public loadMeta(): void {
    const saved = localStorage.getItem(META_SAVE_KEY);
    if (!saved) {
      this.meta = createDefaultMetaProgress();
      return;
    }
    try {
      const parsed = JSON.parse(saved);
      const migrated = Number(parsed?.version || 0) < 3;
      this.meta = normalizeMetaProgress(parsed);
      if (migrated) this.saveMeta();
    } catch (error) {
      console.error("Failed to load meta progress:", error);
      this.meta = createDefaultMetaProgress();
    }
  }

  private normalizePlayerWeapons() {
    const player = this.data.player;
    const fallback = isWeaponId(player.currentWeaponId) ? player.currentWeaponId : "pistol";
    player.weaponSlots = normalizeWeaponSlots(player.weaponSlots, fallback);
    player.activeWeaponSlot = player.activeWeaponSlot === 1 && player.weaponSlots[1] ? 1 : 0;
    player.currentWeaponId = player.weaponSlots[player.activeWeaponSlot] ?? player.weaponSlots[0];
  }

  private resetSkillState(characterId: string) {
    const player = this.data.player;
    player.skillCooldown = 0;
    player.skillActiveTimer = 0;
    player.skillDirectionX = 0;
    player.skillDirectionY = 0;
    player.rogueCritTimer = 0;
    player.knightGuardReady = characterId === "knight";
  }

  private normalizePlayerSkills() {
    const player = this.data.player;
    const finiteNonNegative = (value: unknown) => {
      const number = Number(value);
      return Number.isFinite(number) ? Math.max(0, number) : 0;
    };
    player.skillCooldown = finiteNonNegative(player.skillCooldown);
    player.skillActiveTimer = finiteNonNegative(player.skillActiveTimer);
    player.skillDirectionX = Number.isFinite(Number(player.skillDirectionX)) ? Number(player.skillDirectionX) : 0;
    player.skillDirectionY = Number.isFinite(Number(player.skillDirectionY)) ? Number(player.skillDirectionY) : 0;
    player.rogueCritTimer = finiteNonNegative(player.rogueCritTimer);
    player.knightGuardReady = player.characterId === "knight" && player.knightGuardReady === true;
  }

  private resetBuffState() {
    this.data.player.buffs = [];
    this.data.player.emergencyBarrierReady = false;
  }

  private normalizePlayerBuffs() {
    const player = this.data.player;
    player.buffs = BuffSystem.normalizeBuffs(player.buffs);
    player.emergencyBarrierReady =
      player.buffs.includes("emergency_barrier") && player.emergencyBarrierReady === true;
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
    stage.chapterIndex = run.chapterIndex;
    stage.stageIndex = run.stageIndex;
    stage.globalStageIndex = run.globalStageIndex;
    stage.isBossStage = isBossStage(run);
    stage.hardMode = run.hardMode;
    stage.challengeId = run.challengeId;
    stage.challengeKey = run.challengeKey;
    stage.buffChoiceRerollCount = Math.max(0, Math.floor(Number(stage.buffChoiceRerollCount) || 0));
    const roomSignature = stage.rooms
      .map(room => `${room.id}:${room.type}`)
      .sort()
      .join("|");
    stage.seed = normalizeSeed(
      Number(stage.seed) || hashSeed(0xC0FFEE, `${run.globalStageIndex}:${roomSignature}`),
    );

    if (stage.isBossStage && !stage.rooms.some(room => room.type === "shop")) {
      const preparation = stage.rooms.find(room => room.type === "treasure");
      if (preparation) {
        preparation.type = "shop";
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
      if (room.type === "shop") {
        room.shopSeed = ShopSystem.getSeed(stage, room);
        room.shopStock = ShopSystem.normalizeStock(room.shopStock);
      }
    }
  }

  private isStageCompatible(stage: any, run: RunProgress): boolean {
    if (!stage || !Array.isArray(stage.rooms) || stage.rooms.length === 0) return false;
    if (stage.chapterIndex !== run.chapterIndex || stage.stageIndex !== run.stageIndex) return false;
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
