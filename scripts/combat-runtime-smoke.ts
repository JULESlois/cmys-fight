import * as assert from "assert";
import { normalizeWeaponLoadoutRuntime, createWeaponRuntimeState, cloneWeaponLoadoutRuntime } from "../src/game/combat/WeaponRuntimeState";

console.log("Running combat-runtime-smoke tests...");

// 1. magazine 状态序列化往返
const mag = createWeaponRuntimeState("pistol");
mag.resourceState.value = 2;
const magLoadout = { slots: [mag], activeSlot: 0, swapTimer: 0 };
const magClone = cloneWeaponLoadoutRuntime(magLoadout as any);
assert.equal(magClone.slots[0].resourceState.value, 2);

// 2. battery 状态序列化往返
const battery = createWeaponRuntimeState("laser");
battery.resourceState.value = 50;
const batteryLoadout = { slots: [battery], activeSlot: 0, swapTimer: 0 };
const batteryClone = cloneWeaponLoadoutRuntime(batteryLoadout as any);
assert.equal(batteryClone.slots[0].resourceState.value, 30);

// 3. heat 状态序列化往返
const heat = createWeaponRuntimeState("mask_sprayer");
heat.resourceState.value = 100;
const heatLoadout = { slots: [heat], activeSlot: 0, swapTimer: 0 };
const heatClone = cloneWeaponLoadoutRuntime(heatLoadout as any);
assert.equal(heatClone.slots[0].resourceState.value, 100);

// 4. charge 状态序列化往返
const charge = createWeaponRuntimeState("swab_lance");
charge.resourceState.value = 3;
const chargeLoadout = { slots: [charge], activeSlot: 0, swapTimer: 0 };
const chargeClone = cloneWeaponLoadoutRuntime(chargeLoadout as any);
assert.equal(chargeClone.slots[0].resourceState.value, 3);

// 5. timers and custom state keys
const customWep = createWeaponRuntimeState("shotgun");
customWep.fireCooldown = 1.5;
customWep.customState.reloadTimer = 0.5;
const cloneWep = cloneWeaponLoadoutRuntime({ slots: [customWep], activeSlot: 0, swapTimer: 1.2 } as any);
assert.equal(cloneWep.slots[0].fireCooldown, 1.5);
assert.equal(cloneWep.slots[0].customState.reloadTimer, 0.5);
assert.equal(cloneWep.swapTimer, 1.2);

// 6. NaN, Infinity, negative values
const badWep: any = {
  weaponId: "pistol",
  fireCooldown: -5,
  resourceState: { value: NaN, max: Infinity },
  customState: [] // invalid, should be {}
};
const fixedWep = normalizeWeaponLoadoutRuntime({ slots: [badWep], activeSlot: -1, swapTimer: NaN });
assert.equal(fixedWep.slots[0].fireCooldown, 0);
assert.ok(Number.isFinite(fixedWep.slots[0].resourceState.max));
assert.ok(Number.isFinite(fixedWep.slots[0].resourceState.value));
assert.equal(fixedWep.slots[0].resourceState.value, fixedWep.slots[0].resourceState.max);
assert.ok(!Array.isArray(fixedWep.slots[0].customState));
assert.equal(fixedWep.activeSlot, 0);
assert.equal(fixedWep.swapTimer, 0);

// 7. 双槽满时替换当前槽，另一槽保持原资源状态。 (This logic happens in WeaponController/equipWeapon, but we can just test the loadout consistency here)
const doubleLoadout = {
  slots: [
    { weaponId: "pistol", resourceState: { value: 1, max: 12 } },
    { weaponId: "shotgun", resourceState: { value: 2, max: 6 } }
  ],
  activeSlot: 1,
  swapTimer: 0
};
const doubleClone = normalizeWeaponLoadoutRuntime(doubleLoadout);
assert.equal(doubleClone.slots.length, 2);
assert.equal(doubleClone.slots[0].weaponId, "pistol");
assert.equal(doubleClone.slots[0].resourceState.value, 1);
assert.equal(doubleClone.slots[1].weaponId, "shotgun");
assert.equal(doubleClone.slots[1].resourceState.value, 2);
assert.equal(doubleClone.activeSlot, 1);

// Bad slot 1 recovery
const badSlot1Loadout = {
  slots: [
    { weaponId: "pistol", resourceState: { value: 1, max: 12 } },
    { weaponId: "invalid_weapon_id", resourceState: { value: 2, max: 6 } }
  ],
  activeSlot: 1,
  swapTimer: 0
};
const fixedSlot1 = normalizeWeaponLoadoutRuntime(badSlot1Loadout);
assert.equal(fixedSlot1.slots[0].weaponId, "pistol");
assert.equal(fixedSlot1.slots[0].resourceState.value, 1);
assert.equal(fixedSlot1.slots[1].weaponId, "pistol"); // falls back to pistol instead of resetting slot 0
assert.equal(fixedSlot1.slots[1].resourceState.value, fixedSlot1.slots[1].resourceState.max);
assert.equal(fixedSlot1.activeSlot, 1);

console.log("combat-runtime-smoke tests passed.");
