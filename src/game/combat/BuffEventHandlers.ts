import type { Player } from "../entities/Player";
import { CombatEventDispatcher } from "./CombatEvents";
import { BuffSystem } from "./BuffSystem";

function restoreMana(player: Player, amount: number): void {
  player.mana = Math.min(player.maxMana, player.mana + amount);
}

function getState(player: Player, key: string, fallback: any = 0): any {
  return player.buffState[key] ?? fallback;
}

function setState(player: Player, key: string, value: any): void {
  player.buffState[key] = value;
}

export function initBuffEventHandlers(): void {
  // === Existing handlers ===

  // entropy_engine: kills restore 2 energy (max 8/s)
  CombatEventDispatcher.on("player_kill_enemy", (payload) => {
    const restore = BuffSystem.getKillEnergyRestore(payload.player);
    if (restore > 0) {
      const remainingQuota = getState(payload.player, "entropyQuota", 4);
      if (remainingQuota > 0) {
        restoreMana(payload.player, restore);
        setState(payload.player, "entropyQuota", remainingQuota - 1);
        if (getState(payload.player, "entropyTimer", 0) <= 0) {
          setState(payload.player, "entropyTimer", 1.0);
        }
      }
    }
  });

  // execution_window: kill marked enemy restores 1 energy
  CombatEventDispatcher.on("player_hit_enemy", (payload) => {
    if (BuffSystem.has(payload.player, "execution_window") && payload.damage > 0) {
      const threshold = payload.enemy.type === "boss" ? 0.15 : 0.25;
      const hpBefore = payload.enemy.hp + payload.damage;
      const wasMarked = hpBefore <= payload.enemy.maxHp * threshold;
      if (wasMarked && payload.enemy.hp <= 0) {
        restoreMana(payload.player, 1);
      }
    }
  });

  // energy_feedback: skill use restores 5 energy
  CombatEventDispatcher.on("skill_activated", (payload) => {
    const restore = BuffSystem.getSkillEnergyRestore(payload.player);
    if (restore > 0) restoreMana(payload.player, restore);

    // chain_directive: mark next attack for chain
    if (BuffSystem.has(payload.player, "chain_directive")) {
      setState(payload.player, "chainDirectiveReady", true);
      setState(payload.player, "chainDirectiveTimeout", 3.0);
    }
  });

  // === Echo protocol handlers ===

  // cross_swap: weapon swap grants attack speed + energy refund
  CombatEventDispatcher.on("player_weapon_swapped", (payload) => {
    if (!BuffSystem.has(payload.player, "cross_swap")) return;
    const cooldown = getState(payload.player, "crossSwapCooldown", 0);
    if (cooldown > 0) return;
    setState(payload.player, "crossSwapActive", 1.2);
    setState(payload.player, "crossSwapCooldown", 3.0);
    restoreMana(payload.player, 2);
  });

  // alternating_current: track alternating weapon hits
  CombatEventDispatcher.on("player_hit_enemy", (payload) => {
    if (!BuffSystem.has(payload.player, "alternating_current")) return;
    const source = payload.source;
    if (source.kind !== "primary" || !source.weaponId) return;

    const lastWeapon = getState(payload.player, "altCurrentLastWeapon", "");
    const currentWeapon = source.weaponId;
    const lastAttackId = getState(payload.player, "altCurrentLastAttackId", "");

    // 1 attackId = 1 count max
    if (source.attackId && lastAttackId === source.attackId) return;
    setState(payload.player, "altCurrentLastAttackId", source.attackId || "");

    if (lastWeapon !== "" && lastWeapon !== currentWeapon) {
      const newStacks = getState(payload.player, "altCurrentStacks", 0) + 1;
      if (newStacks >= 4) {
        setState(payload.player, "altCurrentStacks", 0);
        setState(payload.player, "altCurrentArcReady", true);
      } else {
        setState(payload.player, "altCurrentStacks", newStacks);
      }
      setState(payload.player, "altCurrentTimer", 2.0);
    } else if (lastWeapon === currentWeapon) {
      // 连续命中同一把武器则重置
      setState(payload.player, "altCurrentStacks", 0);
      setState(payload.player, "altCurrentTimer", 0);
    }
    setState(payload.player, "altCurrentLastWeapon", currentWeapon);
  });

  // graze_relay: near-miss dodges accumulate
  CombatEventDispatcher.on("player_graze_projectile", (payload) => {
    if (!BuffSystem.has(payload.player, "graze_relay")) return;
    const grazes = getState(payload.player, "grazeCount", 0) + 1;
    if (grazes >= 5) {
      setState(payload.player, "grazeCount", 0);
      restoreMana(payload.player, 8);
      payload.player.dodgeCooldown = Math.max(0, payload.player.dodgeCooldown - 0.5);
    } else {
      setState(payload.player, "grazeCount", grazes);
    }
  });

  // === Phoenix protocol handlers ===

  // reactive_armor: armor break triggers damage reduction + knockback
  // (handled in DamageSystem via buffState flag)

  // blood_pact_engine: perfect room clear restores 1 HP
  CombatEventDispatcher.on("player_room_cleared", (payload) => {
    if (payload.noDamageTaken && BuffSystem.has(payload.player, "blood_pact_engine")) {
      payload.player.hp = Math.min(payload.player.maxHp, payload.player.hp + 1);
    }
    // hollow_armor: room clear restores 1 armor
    if (BuffSystem.has(payload.player, "hollow_armor")) {
      payload.player.armor = Math.min(payload.player.maxArmor, payload.player.armor + 1);
    }
  });

  // === Salvage protocol handlers ===

  // battlefield_salvage: every 5 props destroyed spawns supply
  CombatEventDispatcher.on("prop_destroyed", (payload) => {
    if (!BuffSystem.has(payload.player, "battlefield_salvage")) return;
    const roomCount = getState(payload.player, "salvageRoomCount", 0);
    if (roomCount >= 2) return; // Max 2/room

    const propsDestroyed = getState(payload.player, "salvagePropsDestroyed", 0) + 1;
    if (propsDestroyed >= 5) {
      setState(payload.player, "salvagePropsDestroyed", 0);
      setState(payload.player, "salvageRoomCount", roomCount + 1);
      payload.player.pendingPickups.push({ x: payload.x, y: payload.y, type: Math.random() < 0.5 ? "energy" : "coin" });
    } else {
      setState(payload.player, "salvagePropsDestroyed", propsDestroyed);
    }
  });

  // reset salvage room count on room enter
  CombatEventDispatcher.on("player_room_entered", (payload) => {
    setState(payload.player, "salvageRoomCount", 0);
  });

  // === Survey protocol handlers ===

  // secret_sense: room entered flag for DungeonState to check
  CombatEventDispatcher.on("player_room_entered", (payload) => {
    if (BuffSystem.has(payload.player, "secret_sense")) {
      setState(payload.player, "secretSenseActive", true);
    }
  });

  // perfect_survey: perfect clear reveals hidden info
  CombatEventDispatcher.on("player_room_cleared", (payload) => {
    if (payload.noDamageTaken && BuffSystem.has(payload.player, "perfect_survey")) {
      setState(payload.player, "perfectSurveyTriggered", true);
    }
  });
}
