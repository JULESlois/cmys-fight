import type { Enemy } from "../entities/Enemy";
import type { Player } from "../entities/Player";
import { BuffSystem } from "./BuffSystem";

export type SkillId = "dual_fire" | "arcane_overdrive" | "shadow_dash";

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

  static getConfig(characterId: string): SkillConfig {
    return SKILLS[characterId] ?? SKILLS.knight;
  }

  static update(player: Player, dt: number): void {
    player.skillCooldown = Math.max(0, player.skillCooldown - dt);
    player.rogueCritTimer = Math.max(0, player.rogueCritTimer - dt);

    if (player.skillActiveTimer <= 0) return;

    const wasActive = player.skillActiveTimer > 0;
    player.skillActiveTimer = Math.max(0, player.skillActiveTimer - dt);

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
