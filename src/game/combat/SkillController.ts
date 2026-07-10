import { DamageSystem } from "./DamageSystem";
import type { Enemy } from "../entities/Enemy";
import type { Player } from "../entities/Player";

export type SkillId = "dual_fire" | "chain_lightning" | "shadow_dash";

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
    id: "chain_lightning",
    name: "CHAIN BOLT",
    cooldown: 7,
    duration: 0,
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

  static activate(
    player: Player,
    enemies: Enemy[],
    movementAxis: { x: number; y: number },
    aimAngle: number,
  ): SkillActivationResult {
    if (player.hp <= 0) return { ...EMPTY_RESULT, reason: "dead" };
    if (player.skillCooldown > 0) return { ...EMPTY_RESULT, reason: "cooldown" };

    const config = SkillController.getConfig(player.characterId);

    if (config.id === "dual_fire") {
      player.skillActiveTimer = config.duration;
      player.skillCooldown = config.cooldown;
      return { activated: true, killedEnemyIds: [], lightningArcs: [] };
    }

    if (config.id === "shadow_dash") {
      const hasMovement = Math.hypot(movementAxis.x, movementAxis.y) > 0.01;
      player.skillDirectionX = hasMovement ? movementAxis.x : Math.cos(aimAngle);
      player.skillDirectionY = hasMovement ? movementAxis.y : Math.sin(aimAngle);
      const length = Math.hypot(player.skillDirectionX, player.skillDirectionY) || 1;
      player.skillDirectionX /= length;
      player.skillDirectionY /= length;
      player.skillActiveTimer = config.duration;
      player.skillCooldown = config.cooldown;
      player.invulnerabilityTimer = Math.max(player.invulnerabilityTimer, config.duration + 0.08);
      return { activated: true, killedEnemyIds: [], lightningArcs: [] };
    }

    const firstTarget = SkillController.findClosestEnemy(player.x, player.y, enemies, new Set());
    if (!firstTarget) return { ...EMPTY_RESULT, reason: "no_target" };

    const killedEnemyIds: number[] = [];
    const lightningArcs: LightningArc[] = [];
    const visited = new Set<number>();
    let fromX = player.x;
    let fromY = player.y;
    let current: Enemy | null = firstTarget;
    const damages = [5, 4, 3];

    for (let i = 0; i < damages.length && current; i++) {
      visited.add(current.id);
      lightningArcs.push({
        x1: fromX,
        y1: fromY,
        x2: current.x,
        y2: current.y,
        life: 0.24,
        maxLife: 0.24,
      });
      const result = DamageSystem.damageEnemy(current, damages[i]);
      if (result.killed) killedEnemyIds.push(current.id);

      fromX = current.x;
      fromY = current.y;
      current = SkillController.findClosestEnemy(fromX, fromY, enemies, visited, 82);
    }

    player.skillCooldown = config.cooldown;
    return { activated: true, killedEnemyIds, lightningArcs };
  }

  private static findClosestEnemy(
    x: number,
    y: number,
    enemies: Enemy[],
    excluded: Set<number>,
    maxDistance = Infinity,
  ): Enemy | null {
    let closest: Enemy | null = null;
    let closestDistance = maxDistance;
    for (const enemy of enemies) {
      if (enemy.hp <= 0 || excluded.has(enemy.id)) continue;
      const distance = Math.hypot(enemy.x - x, enemy.y - y);
      if (distance < closestDistance) {
        closest = enemy;
        closestDistance = distance;
      }
    }
    return closest;
  }
}
