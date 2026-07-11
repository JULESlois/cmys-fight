import type { Enemy, EnemyAnimationState } from "./entities/Enemy";

const FRAME_COUNTS: Readonly<Record<Exclude<EnemyAnimationState, "attack">, number>> = Object.freeze({
  idle: 2,
  walk: 4,
  hurt: 2,
});

const FRAME_RATES: Readonly<Record<Exclude<EnemyAnimationState, "attack">, number>> = Object.freeze({
  idle: 2.5,
  walk: 10,
  hurt: 14,
});

export interface EnemyAnimationUpdate {
  dt: number;
  previousX: number;
  previousY: number;
  targetX: number;
}

export function updateEnemyAnimation(enemy: Enemy, update: EnemyAnimationUpdate): void {
  const { dt, previousX, previousY, targetX } = update;
  const dx = enemy.x - previousX;
  const dy = enemy.y - previousY;
  const moved = Math.hypot(dx, dy) > 0.04;

  if (Math.abs(dx) > 0.02) {
    enemy.facing = dx < 0 ? "left" : "right";
  } else if (enemy.attackState !== "idle" && Math.abs(Math.cos(enemy.attackAngle)) > 0.08) {
    enemy.facing = Math.cos(enemy.attackAngle) < 0 ? "left" : "right";
  } else if (Math.abs(targetX - enemy.x) > 1) {
    enemy.facing = targetX < enemy.x ? "left" : "right";
  }

  const nextState: EnemyAnimationState = enemy.hitFlash > 0
    ? "hurt"
    : enemy.attackState !== "idle"
      ? "attack"
      : moved
        ? "walk"
        : "idle";

  if (enemy.animState !== nextState) {
    enemy.animState = nextState;
    enemy.animTimer = 0;
    enemy.animFrame = 0;
  } else {
    enemy.animTimer += dt;
  }

  if (nextState === "attack") {
    if (enemy.attackState === "windup") {
      const duration = Math.max(0.001, enemy.attackAnimationDuration);
      const progress = Math.max(0, Math.min(0.999, 1 - enemy.attackTimer / duration));
      enemy.animFrame = Math.min(2, Math.floor(progress * 3));
    } else {
      enemy.animFrame = 3;
    }
    return;
  }

  enemy.animFrame = Math.floor(enemy.animTimer * FRAME_RATES[nextState]) % FRAME_COUNTS[nextState];
}
