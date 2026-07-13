import type { Enemy } from "../entities/Enemy";
import type { Player } from "../entities/Player";
import { BuffSystem } from "./BuffSystem";

export type SkillId = "dual_fire" | "arcane_overdrive" | "shadow_dash" | "pawtector" | "beacon_lure" | "guardian_star";

export interface SkillConfig {
  id: SkillId;
  name: string;
  cooldown: number;
  duration: number;
}

export interface LightningArc {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  maxLife: number;
}

export interface SkillActivationResult {
  activated: boolean;
  reason?: "cooldown" | "dead" | "no_target";
  killedEnemyIds: number[];
  lightningArcs: LightningArc[];
}

const SKILLS: Record<string, SkillConfig> = {
  knight: {
    id: "dual_fire",
    name: "DUAL FIRE",
    cooldown: 10,
    duration: 3,
  },
  mage: {
    id: "arcane_overdrive",
    name: "ARCANE OVERDRIVE",
    cooldown: 12,
    duration: 4,
  },
  rogue: {
    id: "shadow_dash",
    name: "SHADOW DASH",
    cooldown: 4,
    duration: 0.22,
  },
  michele: {
    id: "pawtector",
    name: "PAWTECTOR",
    cooldown: 12,
    duration: 8,
  },
  kanami: {
    id: "beacon_lure",
    name: "BEACON LURE",
    cooldown: 13,
    duration: 7,
  },
  celestia: {
    id: "guardian_star",
    name: "GUARDIAN STAR",
    cooldown: 12,
    duration: 1.2,
  },
};

const EMPTY_RESULT: SkillActivationResult = {
  activated: false,
  killedEnemyIds: [],
  lightningArcs: [],
};

export class SkillController {
  static readonly ROGUE_DASH_SPEED = 360;
  static readonly ROGUE_CRIT_DURATION = 2;
  static readonly ROGUE_CRIT_BONUS = 0.25;
  static readonly MAGE_ECHO_THRESHOLD = 12;
  static readonly MAGE_ECHO_DAMAGE_MULTIPLIER = 0.5;
  static readonly MAGE_OVERDRIVE_PROJECTILE_SPEED = 1.2;
  static readonly MAGE_OVERDRIVE_PIERCE = 1;
  static readonly MICHELE_MARK_DURATION = 2;
  static readonly MICHELE_TURRET_RANGE = 88;
  static readonly MICHELE_TURRET_FIRE_INTERVAL = 0.35;
  static readonly MICHELE_TURRET_DAMAGE = 2;
  static readonly MICHELE_TURRET_SLOW_DURATION = 1.2;
  static readonly KANAMI_BEACON_SPEED = 260;
  static readonly KANAMI_BEACON_FLIGHT_TIME = 0.45;
  static readonly KANAMI_BEACON_RANGE = 108;
  static readonly KANAMI_BEACON_STOP_RADIUS = 16;
  static readonly KANAMI_BEACON_BOSS_PULL = 0.35;
  static readonly CELESTIA_TEMPORARY_ARMOR = 4;
  static readonly CELESTIA_TEMPORARY_ARMOR_DURATION = 10;

  static getConfig(characterId: string): SkillConfig {
    return SKILLS[characterId] ?? SKILLS.knight;
  }

  static update(player: Player, dt: number): void {
    player.skillCooldown = Math.max(0, player.skillCooldown - dt);
    player.rogueCritTimer = Math.max(0, player.rogueCritTimer - dt);
    player.micheleMarkTimer = Math.max(0, player.micheleMarkTimer - dt);
    player.micheleTurretFireCooldown = Math.max(0, player.micheleTurretFireCooldown - dt);
    player.celestiaTemporaryArmorTimer = Math.max(0, player.celestiaTemporaryArmorTimer - dt);
    if (player.celestiaTemporaryArmorTimer <= 0 || player.celestiaTemporaryArmor <= 0) {
      player.celestiaTemporaryArmorTimer = 0;
      player.celestiaTemporaryArmor = 0;
    }
    if (player.micheleMarkTimer <= 0) player.micheleMarkedEnemyId = -1;

    if (player.skillActiveTimer <= 0) {
      if (player.characterId === "michele") {
        player.micheleTurretActive = false;
        player.micheleTurretHitsRemaining = 0;
      }
      if (player.characterId === "kanami") {
        player.kanamiBeaconDeployed = false;
        player.kanamiBeaconFlightTimer = 0;
        player.kanamiBeaconVx = 0;
        player.kanamiBeaconVy = 0;
      }
      return;
    }

    const wasActive = player.skillActiveTimer > 0;
    player.skillActiveTimer = Math.max(0, player.skillActiveTimer - dt);
    if (player.skillActiveTimer <= 0) {
      if (player.characterId === "michele") {
        player.micheleTurretActive = false;
        player.micheleTurretHitsRemaining = 0;
      }
      if (player.characterId === "kanami") {
        player.kanamiBeaconDeployed = false;
        player.kanamiBeaconFlightTimer = 0;
        player.kanamiBeaconVx = 0;
        player.kanamiBeaconVy = 0;
      }
    }

    if (player.characterId === "rogue") {
      player.invulnerabilityTimer = Math.max(player.invulnerabilityTimer, 0.08);
      if (wasActive && player.skillActiveTimer <= 0) {
        player.rogueCritTimer = SkillController.ROGUE_CRIT_DURATION;
      }
    }
  }

  static isRogueDashing(player: Player): boolean {
    return player.characterId === "rogue" && player.skillActiveTimer > 0;
  }

  static isMageOverdriveActive(player: Player): boolean {
    return player.characterId === "mage" && player.skillActiveTimer > 0;
  }

  static activate(
    player: Player,
    _enemies: Enemy[],
    movementAxis: { x: number; y: number },
    aimAngle: number,
  ): SkillActivationResult {
    if (player.hp <= 0) return { ...EMPTY_RESULT, reason: "dead" };
    if (player.skillCooldown > 0) return { ...EMPTY_RESULT, reason: "cooldown" };

    const config = SkillController.getConfig(player.characterId);
    const cooldown = config.cooldown * BuffSystem.getSkillCooldownMultiplier(player);
    const restoreEnergy = () => {
      player.mana = Math.min(player.maxMana, player.mana + BuffSystem.getSkillEnergyRestore(player));
    };

    if (config.id === "dual_fire") {
      player.skillActiveTimer = config.duration;
      player.skillCooldown = cooldown;
      restoreEnergy();
      return { activated: true, killedEnemyIds: [], lightningArcs: [] };
    }

    if (config.id === "pawtector") {
      player.skillActiveTimer = config.duration;
      player.skillCooldown = cooldown;
      player.micheleTurretX = player.x;
      player.micheleTurretY = player.y;
      player.micheleTurretFireCooldown = 0;
      player.micheleTurretActive = true;
      player.micheleTurretHitsRemaining = 6;
      restoreEnergy();
      return { activated: true, killedEnemyIds: [], lightningArcs: [] };
    }

    if (config.id === "beacon_lure") {
      player.skillActiveTimer = config.duration;
      player.skillCooldown = cooldown;
      player.kanamiBeaconX = player.x;
      player.kanamiBeaconY = player.y - 4;
      player.kanamiBeaconVx = Math.cos(aimAngle) * SkillController.KANAMI_BEACON_SPEED;
      player.kanamiBeaconVy = Math.sin(aimAngle) * SkillController.KANAMI_BEACON_SPEED;
      player.kanamiBeaconFlightTimer = SkillController.KANAMI_BEACON_FLIGHT_TIME;
      player.kanamiBeaconDeployed = false;
      restoreEnergy();
      return { activated: true, killedEnemyIds: [], lightningArcs: [] };
    }

    if (config.id === "guardian_star") {
      player.skillActiveTimer = config.duration;
      player.skillCooldown = cooldown;
      player.celestiaTemporaryArmor = Math.max(
        player.celestiaTemporaryArmor,
        SkillController.CELESTIA_TEMPORARY_ARMOR,
      );
      player.celestiaTemporaryArmorTimer = SkillController.CELESTIA_TEMPORARY_ARMOR_DURATION;
      restoreEnergy();
      return { activated: true, killedEnemyIds: [], lightningArcs: [] };
    }

    if (config.id === "arcane_overdrive") {
      player.skillActiveTimer = config.duration;
      player.skillCooldown = cooldown;
      player.invulnerabilityTimer = Math.max(player.invulnerabilityTimer, 0.35);
      player.manaRechargeTimer = Math.max(player.manaRechargeTimer, config.duration);
      restoreEnergy();
      return { activated: true, killedEnemyIds: [], lightningArcs: [] };
    }

    const hasMovement = Math.hypot(movementAxis.x, movementAxis.y) > 0.01;
    player.skillDirectionX = hasMovement ? movementAxis.x : Math.cos(aimAngle);
    player.skillDirectionY = hasMovement ? movementAxis.y : Math.sin(aimAngle);
    const length = Math.hypot(player.skillDirectionX, player.skillDirectionY) || 1;
    player.skillDirectionX /= length;
    player.skillDirectionY /= length;
    player.skillActiveTimer = config.duration;
    player.skillCooldown = cooldown;
    player.invulnerabilityTimer = Math.max(player.invulnerabilityTimer, config.duration + 0.08);
    restoreEnergy();
    return { activated: true, killedEnemyIds: [], lightningArcs: [] };
  }
}
