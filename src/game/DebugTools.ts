import type { GameData } from "./GameData";
import { createRunProgressFromGlobalStage, FINAL_GLOBAL_STAGE } from "./RunProgress";
import { generateStage } from "./FloorGenerator";
import { BUFFS, BuffSystem, type BuffId } from "./combat/BuffSystem";

export function isDebugMode(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return Boolean((import.meta as any).env?.DEV) || params.get("debug") === "1" || params.get("qa") === "1";
}

export function jumpToStage(data: GameData, globalStageIndex: number): void {
  const target = Math.max(1, Math.min(FINAL_GLOBAL_STAGE, Math.floor(globalStageIndex)));
  const current = data.data.run;
  data.data.run = createRunProgressFromGlobalStage(target, current.hardMode, current.challengeId, current.challengeKey);
  data.data.runStats.highestStage = Math.max(data.data.runStats.highestStage, target);
  data.data.player.x = 160;
  data.data.player.y = 120;
  data.data.floor = generateStage(data.data.run);
  data.save();
}

export function grantDebugLoadout(data: GameData): void {
  const player = data.data.player;
  player.hp = player.maxHp;
  player.armor = player.maxArmor;
  player.mana = player.maxMana;
  player.coins = 999;
  player.weaponSlots = ["void_rail", "dragon_breath"];
  player.activeWeaponSlot = 0;
  player.currentWeaponId = "void_rail";
  const buffIds: BuffId[] = [
    "overclock_core", "execution_matrix", "mana_well",
    "skill_loop", "aegis_foundry", "phoenix_protocol",
  ];
  player.buffs = BuffSystem.normalizeBuffs(buffIds);
  player.buffRerollsRemaining = Math.max(player.buffRerollsRemaining, 5);
  data.discoverPlayerBuild();
  data.save();
}
