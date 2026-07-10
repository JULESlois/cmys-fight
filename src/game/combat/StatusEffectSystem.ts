import type { Enemy } from "../entities/Enemy";
import type { Player } from "../entities/Player";
import { BuffSystem } from "./BuffSystem";
import { DamageSystem } from "./DamageSystem";

export type StatusEffectId = "poison" | "burn" | "slow" | "root";

export interface ActiveStatusEffect {
  id: StatusEffectId;
  duration: number;
  tickTimer: number;
  stacks: number;
}

const STATUS_IDS: StatusEffectId[] = ["poison", "burn", "slow", "root"];

function tickInterval(id: StatusEffectId): number {
  if (id === "burn") return 0.65;
  if (id === "poison") return 0.9;
  return 1;
}

function normalizeOne(value: unknown): ActiveStatusEffect | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<ActiveStatusEffect>;
  if (!STATUS_IDS.includes(raw.id as StatusEffectId)) return null;
  const id = raw.id as StatusEffectId;
  const duration = Math.max(0, Number(raw.duration) || 0);
  if (duration <= 0) return null;
  const rawTickTimer = Number(raw.tickTimer);
  return {
    id,
    duration,
    tickTimer: Number.isFinite(rawTickTimer) ? Math.max(0, rawTickTimer) : tickInterval(id),
    stacks: Math.max(1, Math.min(3, Math.floor(Number(raw.stacks) || 1))),
  };
}

export class StatusEffectSystem {
  static normalize(value: unknown): ActiveStatusEffect[] {
    if (!Array.isArray(value)) return [];
    const result: ActiveStatusEffect[] = [];
    for (const entry of value) {
      const status = normalizeOne(entry);
      if (!status) continue;
      const existing = result.find(candidate => candidate.id === status.id);
      if (existing) {
        existing.duration = Math.max(existing.duration, status.duration);
        existing.stacks = Math.max(existing.stacks, status.stacks);
        existing.tickTimer = Math.min(existing.tickTimer, status.tickTimer);
      } else {
        result.push(status);
      }
    }
    return result;
  }

  static applyPlayer(player: Player, id: StatusEffectId, duration: number): void {
    const adjusted = Math.max(0, duration * BuffSystem.getStatusDurationMultiplier(player));
    StatusEffectSystem.apply(player.statusEffects, id, adjusted);
  }

  static applyEnemy(enemy: Enemy, id: StatusEffectId, duration: number): void {
    StatusEffectSystem.apply(enemy.statusEffects, id, duration);
  }

  private static apply(list: ActiveStatusEffect[], id: StatusEffectId, duration: number): void {
    if (duration <= 0) return;
    const existing = list.find(status => status.id === id);
    if (existing) {
      existing.duration = Math.max(existing.duration, duration);
      if (id === "poison" || id === "burn") {
        existing.stacks = Math.min(3, existing.stacks + 1);
      }
      return;
    }
    list.push({ id, duration, tickTimer: tickInterval(id), stacks: 1 });
  }

  static updatePlayer(player: Player, dt: number): void {
    StatusEffectSystem.updateDurations(player.statusEffects, dt, status => {
      if (status.id !== "poison" && status.id !== "burn") return;
      DamageSystem.damagePlayer(player, status.stacks, 0.12);
    });
  }

  static updateEnemy(enemy: Enemy, dt: number): boolean {
    StatusEffectSystem.updateDurations(enemy.statusEffects, dt, status => {
      if (status.id !== "poison" && status.id !== "burn") return;
      DamageSystem.damageEnemy(enemy, status.stacks);
    });
    return enemy.hp <= 0;
  }

  private static updateDurations(
    statuses: ActiveStatusEffect[],
    dt: number,
    onTick: (status: ActiveStatusEffect) => void,
  ): void {
    for (let index = statuses.length - 1; index >= 0; index--) {
      const status = statuses[index];
      status.duration = Math.max(0, status.duration - dt);
      if (status.id === "poison" || status.id === "burn") {
        status.tickTimer -= dt;
        const interval = tickInterval(status.id);
        while (status.tickTimer <= 0 && status.duration > 0) {
          onTick(status);
          status.tickTimer += interval;
        }
      }
      if (status.duration <= 0) statuses.splice(index, 1);
    }
  }

  static getMovementMultiplier(target: Pick<Player | Enemy, "statusEffects">): number {
    if (target.statusEffects.some(status => status.id === "root")) return 0;
    return target.statusEffects.some(status => status.id === "slow") ? 0.6 : 1;
  }

  static has(target: Pick<Player | Enemy, "statusEffects">, id: StatusEffectId): boolean {
    return target.statusEffects.some(status => status.id === id);
  }
}
