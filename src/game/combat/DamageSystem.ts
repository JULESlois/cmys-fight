import type { Enemy } from "../entities/Enemy";
import type { Player } from "../entities/Player";

export interface DamageResult {
  applied: boolean;
  armorDamage: number;
  hpDamage: number;
  killed: boolean;
}

const NO_DAMAGE: DamageResult = {
  applied: false,
  armorDamage: 0,
  hpDamage: 0,
  killed: false,
};

export class DamageSystem {
  static updatePlayer(player: Player, dt: number): void {
    player.invulnerabilityTimer = Math.max(0, player.invulnerabilityTimer - dt);
  }

  static damagePlayer(player: Player, amount: number, invulnerabilityDuration = 0.55): DamageResult {
    const damage = Math.max(0, amount);
    if (damage <= 0 || player.hp <= 0 || player.invulnerabilityTimer > 0) {
      return { ...NO_DAMAGE, killed: player.hp <= 0 };
    }

    const armorDamage = Math.min(player.armor, damage);
    const hpDamage = damage - armorDamage;

    player.armor = Math.max(0, player.armor - armorDamage);
    player.hp = Math.max(0, player.hp - hpDamage);
    player.invulnerabilityTimer = invulnerabilityDuration;
    player.hitFlash = hpDamage > 0 ? 0.2 : 0.1;

    return {
      applied: true,
      armorDamage,
      hpDamage,
      killed: player.hp <= 0,
    };
  }

  static damageEnemy(enemy: Enemy, amount: number): DamageResult {
    const damage = Math.max(0, amount);
    if (damage <= 0 || enemy.hp <= 0) {
      return { ...NO_DAMAGE, killed: enemy.hp <= 0 };
    }

    const hpBefore = enemy.hp;
    enemy.hp = Math.max(0, enemy.hp - damage);
    enemy.hitFlash = 0.1;

    return {
      applied: true,
      armorDamage: 0,
      hpDamage: hpBefore - enemy.hp,
      killed: enemy.hp <= 0,
    };
  }
}
