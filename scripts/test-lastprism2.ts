import { Player } from "../src/game/entities/Player";
import { WeaponController } from "../src/game/combat/WeaponController";
import { WEAPONS } from "../src/game/data/weapons";
import { ResourceStrategies } from "../src/game/combat/WeaponResourceStrategies";

const player = new Player(160, 120);
player.setWeaponLoadout(["last_prism"], 0);
player.weaponLoadout.slots[player.weaponLoadout.activeSlot].fireCooldown = 0;
player.weaponLoadout.slots[player.weaponLoadout.activeSlot].customState.channelTime = 0;

const lastPrismInitialBattery = player.weaponLoadout.slots[player.weaponLoadout.activeSlot].resourceState.max;
player.weaponLoadout.slots[player.weaponLoadout.activeSlot].resourceState.value = lastPrismInitialBattery;

const energyCost = WeaponController.getEnergyCost(player, "last_prism");
console.log("energyCost:", energyCost);
console.log("Battery value:", player.weaponLoadout.slots[player.weaponLoadout.activeSlot].resourceState.value);

console.log("canFire:", ResourceStrategies["battery"].canFire(
  player.weaponLoadout.slots[player.weaponLoadout.activeSlot],
  WEAPONS["last_prism"],
  player,
  energyCost
));
