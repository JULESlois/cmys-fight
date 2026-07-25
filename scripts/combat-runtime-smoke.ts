import * as assert from "assert";
import { normalizeWeaponLoadoutRuntime, normalizeWeaponRuntimeState, createWeaponRuntimeState, cloneWeaponLoadoutRuntime, WeaponLoadoutRuntime } from "../src/game/combat/WeaponRuntimeState";
import { WeaponController } from "../src/game/combat/WeaponController";
import { Player } from "../src/game/entities/Player";
import { GameData } from "../src/game/GameData";

console.log("Running combat-runtime-smoke tests...");

// 1. magazine, battery, heat, charge 正常值序列化往返
const testRoundtrip = (weaponId: string, type: "magazine" | "battery" | "heat" | "charge", validValue: number) => {
  const state = createWeaponRuntimeState(weaponId);
  assert.equal(state.resourceType, type);
  state.resourceState.value = validValue;
  const clone = normalizeWeaponRuntimeState(JSON.parse(JSON.stringify(state)));
  assert.equal(clone.resourceState.value, validValue, `${type} value should match`);
  assert.equal(clone.resourceState.max, state.resourceState.max, `${type} max should match definition`);
};

testRoundtrip("pistol", "magazine", 5);
testRoundtrip("laser", "battery", 15);
testRoundtrip("mask_sprayer", "heat", 50);
testRoundtrip("swab_lance", "charge", 2);

// 2. 单独测试超出上限时的 clamp，不得称为往返测试
const clampTest = createWeaponRuntimeState("pistol");
clampTest.resourceState.value = 9999;
const clamped = normalizeWeaponRuntimeState(JSON.parse(JSON.stringify(clampTest)));
assert.ok(clamped.resourceState.value <= clamped.resourceState.max, "Exceeding value should be clamped");

// 3. fireCooldown, reloadTimer, channelTime, linkedShotStep, burstIndex, swapTimer 往返
const complexWep = createWeaponRuntimeState("shotgun");
complexWep.fireCooldown = 1.5;
complexWep.customState.reloadTimer = 0.5;
complexWep.customState.channelTime = 2.1;
complexWep.customState.linkedShotStep = 3;
complexWep.customState.burstIndex = 1;
const loadout: WeaponLoadoutRuntime = { slots: [complexWep], activeSlot: 0, swapTimer: 1.2 };
const cloneLoadout = cloneWeaponLoadoutRuntime(loadout);
const cloneWep = cloneLoadout.slots[0];
assert.equal(cloneWep.fireCooldown, 1.5);
assert.equal(cloneWep.customState.reloadTimer, 0.5);
assert.equal(cloneWep.customState.channelTime, 2.1);
assert.equal(cloneWep.customState.linkedShotStep, 3);
assert.equal(cloneWep.customState.burstIndex, 1);
assert.equal(cloneLoadout.swapTimer, 1.2);

// 4. 真实调用 WeaponController.equipWeapon：
const player = new Player(0, 0);
player.weaponLoadout = {
  slots: [
    createWeaponRuntimeState("pistol"),
    createWeaponRuntimeState("shotgun")
  ],
  activeSlot: 1,
  swapTimer: 0
};
player.weaponLoadout.slots[0].resourceState.value = 3;
player.weaponLoadout.slots[0].customState.testMarker = "hello";
player.weaponLoadout.slots[1]!.resourceState.value = 1;

const dropped = WeaponController.equipWeapon(player, "laser");
assert.equal(dropped.droppedWeaponId, "shotgun", "Should drop the active weapon");
assert.equal(player.weaponLoadout.activeSlot, 1, "Active slot remains the same");
assert.equal(player.weaponLoadout.slots[1]!.weaponId, "laser", "Active slot replaced");
assert.equal(player.weaponLoadout.slots[0].weaponId, "pistol", "Inactive slot unchanged");
assert.equal(player.weaponLoadout.slots[0].resourceState.value, 3, "Inactive slot resource unchanged");
assert.equal(player.weaponLoadout.slots[0].customState.testMarker, "hello", "Inactive slot customState unchanged");

// 6. 非法第二槽不得静默生成重复 pistol。采用明确策略：删除非法第二槽并把 activeSlot 调回 0
const badSlot1Loadout = {
  slots: [
    { weaponId: "pistol", resourceState: { value: 1, max: 12 } },
    { weaponId: "invalid_weapon_id", resourceState: { value: 2, max: 6 } }
  ],
  activeSlot: 1,
  swapTimer: 0
};
const fixedSlot1 = normalizeWeaponLoadoutRuntime(badSlot1Loadout);
assert.equal(fixedSlot1.slots.length, 1, "Invalid second slot should be removed");
assert.equal(fixedSlot1.slots[0].weaponId, "pistol", "First slot remains");
assert.equal(fixedSlot1.activeSlot, 0, "Active slot defaults back to 0");

// 7. max 不得接受任意超大存档值。
const oldSaveWep = {
  weaponId: "pistol",
  resourceState: { value: 9999, max: 99999 }
};
const normalizedOld = normalizeWeaponRuntimeState(oldSaveWep);
assert.ok(normalizedOld.resourceState.max < 99999, "Max should not use old large save value");
assert.equal(normalizedOld.resourceState.value, normalizedOld.resourceState.max, "Value should be clamped to current max");

// 5. 真实模拟 GameData 保存数据后，通过 DungeonState 使用的恢复函数创建 Player，验证完整 loadout 不被重建。
const dummyData = new GameData();
dummyData.data.player.weaponLoadout = cloneLoadout;
const loadedPlayer = new Player(0, 0);
loadedPlayer.setWeaponLoadoutRuntime(cloneWeaponLoadoutRuntime(dummyData.data.player.weaponLoadout));
assert.equal(loadedPlayer.weaponLoadout.slots[0].weaponId, "shotgun");
assert.equal(loadedPlayer.weaponLoadout.slots[0].customState.linkedShotStep, 3, "Custom state survives from game data");

console.log("combat-runtime-smoke tests passed.");
