import { DINGDONG_SKILL } from "../data/dingdong";
import type { Enemy } from "../entities/Enemy";
import type { Player } from "../entities/Player";
import type { CombatSource } from "./CombatEvents";
import { DamageSystem } from "./DamageSystem";
import { StatusEffectSystem } from "./StatusEffectSystem";

/** Damage and status use the same release event. DungeonState owns drops,
 * statistics and pool cleanup, just as it does for weapon kills. */
export function applyDingdongPulse(player: Player, enemies: readonly Enemy[], origin: { x: number; y: number }): number[] {
  if (player.hp <= 0) return [];
  const killedEnemyIds: number[] = [];
  const source: CombatSource = { attackId: "dingdong_pulse", kind: "explosion", canTriggerBuffs: false, canTriggerSynergies: false };
  for (const enemy of enemies) {
    if (enemy.hp <= 0 || Math.hypot(enemy.hitboxX - origin.x, enemy.hitboxY - origin.y) - enemy.hitboxRadius > DINGDONG_SKILL.radius) continue;
    const result = DamageSystem.damageEnemy(enemy, DINGDONG_SKILL.damage, player, false, source);
    if (result.killed) killedEnemyIds.push(enemy.id);
    else if (result.applied) StatusEffectSystem.applyEnemy(enemy, "slow", DINGDONG_SKILL.slowDuration, source);
  }
  return killedEnemyIds;
}
