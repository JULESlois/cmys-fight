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
      const now = getState(payload.player, "entropyLastReset", 0);
      const count = getState(payload.player, "entropyCountThisSecond", 0);
      if (count < 4) {
        restoreMana(payload.player, restore);
        setState(payload.player, "entropyCountThisSecond", count + 1);
      }
    }
    // execution_window: kill marked enemy restores 1 energy
    if (BuffSystem.has(payload.player, "execution_window")) {
      restoreMana(payload.player, 1);
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
    const lastWeapon = getState(payload.player, "altCurrentLastWeapon", "");
    const currentWeapon = payload.player.currentWeaponId;
    const syncStacks = getState(payload.player, "altCurrentStacks", 0);
    const lastHitTime = getState(payload.player, "altCurrentLastHitTime", 0);

    if (lastWeapon !== "" && lastWeapon !== currentWeapon) {
      const newStacks = syncStacks + 1;
      if (newStacks >= 4) {
        setState(payload.player, "altCurrentStacks", 0);
        setState(payload.player, "altCurrentArcReady", true);
      } else {
        setState(payload.player, "altCurrentStacks", newStacks);
      }
    } else if (lastWeapon === currentWeapon) {
      setState(payload.player, "altCurrentStacks", 0);
    }
    setState(payload.player, "altCurrentLastWeapon", currentWeapon);
  });

  // graze_relay: near-miss dodges accumulate
  CombatEventDispatcher.on("player_perfect_dodge", (payload) => {
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
  CombatEventDispatcher.on("player_hit_enemy", (payload) => {
    // Reset entropy counter each second
    const now = getState(payload.player, "entropyLastReset", 0);
    setState(payload.player, "entropyLastReset", now + 1);
    if (getState(payload.player, "entropyLastReset", 0) > 60) {
      setState(payload.player, "entropyLastReset", 0);
      setState(payload.player, "entropyCountThisSecond", 0);
    }
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
