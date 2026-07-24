import { Player } from "../src/game/entities/Player";
import { WeaponController } from "../src/game/combat/WeaponController";

const na45Player = new Player(160, 120);
na45Player.maxMana = 80;
na45Player.mana = 80;
na45Player.setWeaponLoadout(["na_45"], 0);

const slot = na45Player.weaponLoadout.slots[0];
if (slot) {
  console.log("Initial Battery:", slot.resourceState.value);

  const shot1 = WeaponController.fire(na45Player, 0, () => 0.5);
  console.log("After Shot 1 Battery:", slot.resourceState.value);
  console.log("linkedShotWeaponId:", slot.customState.linkedShotWeaponId);
  console.log("linkedShotStep:", slot.customState.linkedShotStep);
  console.log("getEnergyCost for shot 2:", WeaponController.getEnergyCost(na45Player, "na_45"));

  slot.fireCooldown = 0;
  const shot2 = WeaponController.fire(na45Player, 0, () => 0.5);
  console.log("After Shot 2 Battery:", slot.resourceState.value);
}
