import type { Player } from "../entities/Player";
import { CombatEventDispatcher } from "./CombatEvents";
import { BuffSystem } from "./BuffSystem";

function restoreMana(player: Player, amount: number): void {
  player.mana = Math.min(player.maxMana, player.mana + amount);
}

export function initBuffEventHandlers(): void {
  CombatEventDispatcher.on("player_kill_enemy", (payload) => {
    const restore = BuffSystem.getKillEnergyRestore(payload.player);
    if (restore > 0) restoreMana(payload.player, restore);
  });

  CombatEventDispatcher.on("skill_activated", (payload) => {
    const restore = BuffSystem.getSkillEnergyRestore(payload.player);
    if (restore > 0) restoreMana(payload.player, restore);
  });
}
