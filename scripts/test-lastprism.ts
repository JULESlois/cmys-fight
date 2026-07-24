import { Player } from "../src/game/entities/Player";
import { WeaponController } from "../src/game/combat/WeaponController";

const player = new Player(160, 120);
player.setWeaponLoadout(["last_prism"], 0);
player.weaponLoadout.slots[player.weaponLoadout.activeSlot].fireCooldown = 0;
player.weaponLoadout.slots[player.weaponLoadout.activeSlot].customState.channelTime = 0;

const lastPrismInitialBattery = player.weaponLoadout.slots[player.weaponLoadout.activeSlot].resourceState.max;
player.weaponLoadout.slots[player.weaponLoadout.activeSlot].resourceState.value = lastPrismInitialBattery;

const energyCost = WeaponController.getEnergyCost(player, "last_prism");
console.log("energyCost:", energyCost);
console.log("Battery value:", player.weaponLoadout.slots[player.weaponLoadout.activeSlot].resourceState.value);

const prismOpen = WeaponController.fire(player, 0, () => 0.5);
console.log("Fired:", prismOpen.fired);
console.log("Reason:", prismOpen.reason);
