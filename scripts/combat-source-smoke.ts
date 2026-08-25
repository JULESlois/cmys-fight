import * as assert from "assert";
import { Player } from "../src/game/entities/Player";
import { Enemy } from "../src/game/entities/Enemy";
import { DamageSystem } from "../src/game/combat/DamageSystem";
import { CombatEventDispatcher, canSourceTriggerBuffs } from "../src/game/combat/CombatEvents";
import { BuffSystem } from "../src/game/combat/BuffSystem";

console.log("Running combat-source-smoke tests...");

// test duplicate initializations
let callCount = 0;
const originalOn = CombatEventDispatcher.on.bind(CombatEventDispatcher);
CombatEventDispatcher.on = (event, listener) => {
  callCount++;
  return originalOn(event, listener);
};
BuffSystem.init();
const initialCallCount = callCount;
BuffSystem.init();
assert.equal(callCount, initialCallCount, "BuffSystem.init() should not re-register events");

// reset for tests
CombatEventDispatcher.on = originalOn;

const player = new Player(0, 0);
player.buffs = [];
player.buffState = {};

// Test Alternating Current
BuffSystem.acquire(player, "alternating_current");

// Weapon A fires, switch to B, hit registers as A
DamageSystem.damageEnemy(new Enemy(0, 0, "melee"), 10, player, false, {
  kind: "primary",
  weaponId: "weapon_A",
  attackId: "atk_1",
  canTriggerBuffs: true,
  canTriggerSynergies: true,
});
assert.equal(player.buffState["altCurrentLastWeapon"], "weapon_A");

// Same attackId shotgun pellets count once
DamageSystem.damageEnemy(new Enemy(0, 0, "melee"), 10, player, false, {
  kind: "primary",
  weaponId: "weapon_B",
  attackId: "atk_2",
  canTriggerBuffs: true,
  canTriggerSynergies: true,
});
DamageSystem.damageEnemy(new Enemy(0, 0, "melee"), 10, player, false, {
  kind: "primary",
  weaponId: "weapon_B",
  attackId: "atk_2",
  canTriggerBuffs: true,
  canTriggerSynergies: true,
});
assert.equal(player.buffState["altCurrentStacks"], 1, "Should count as 1 stack for same attackId");

// Same weapon consecutive hits reset
DamageSystem.damageEnemy(new Enemy(0, 0, "melee"), 10, player, false, {
  kind: "primary",
  weaponId: "weapon_B",
  attackId: "atk_3",
  canTriggerBuffs: true,
  canTriggerSynergies: true,
});
assert.equal(player.buffState["altCurrentStacks"], 0, "Same weapon resets stacks");

// Chain/Explosion do not participate
DamageSystem.damageEnemy(new Enemy(0, 0, "melee"), 10, player, false, {
  kind: "chain",
  weaponId: "weapon_A",
  attackId: "atk_4",
  canTriggerBuffs: false,
  canTriggerSynergies: false,
});
assert.equal(player.buffState["altCurrentStacks"], 0, "Chain should not increase stacks");

// Entropy Engine
BuffSystem.acquire(player, "entropy_engine");
player.mana = 0;
player.buffState["entropyQuota"] = 4;
// Chain kill shouldn't trigger entropy
DamageSystem.damageEnemy(new Enemy(0, 0, "melee"), 9999, player, false, {
  kind: "explosion",
  canTriggerBuffs: false,
  canTriggerSynergies: false,
});
assert.equal(player.mana, 0, "Explosion kill should not trigger entropy");

// Primary kill triggers
DamageSystem.damageEnemy(new Enemy(0, 0, "melee"), 9999, player, false, {
  kind: "primary",
  weaponId: "weapon_A",
  canTriggerBuffs: true,
  canTriggerSynergies: true,
});
assert.equal(player.mana, 2, "Primary kill should trigger entropy");

// Test Timer update
player.buffState["altCurrentTimer"] = 2.0;
player.buffState["altCurrentStacks"] = 3;
player.buffState["altCurrentLastWeapon"] = "weapon_B";

BuffSystem.update(player, 1.0);
assert.equal(player.buffState["altCurrentTimer"], 1.0);
assert.equal(player.buffState["altCurrentStacks"], 3);

BuffSystem.update(player, 1.1); // expires
assert.ok(player.buffState["altCurrentTimer"] <= 0); // could be negative or 0
assert.equal(player.buffState["altCurrentStacks"], 0);
assert.equal(player.buffState["altCurrentLastWeapon"], "", "Last weapon should be cleared");

// Test StatusEffect Source Attribution
import { StatusEffectSystem } from "../src/game/combat/StatusEffectSystem";
const testEnemy = new Enemy(0, 0, "melee");
const sourceObj = { kind: "primary" as const, weaponId: "weapon_X", canTriggerBuffs: true, canTriggerSynergies: false };
StatusEffectSystem.applyEnemy(testEnemy, "burn", 5.0, sourceObj);

let capturedSource: any = null;
CombatEventDispatcher.on("player_hit_enemy", (payload) => {
  if (payload.enemy === testEnemy && payload.damage > 0) {
    capturedSource = payload.source;
  }
});

StatusEffectSystem.updateEnemy(testEnemy, 1.0, player); // burn tick
assert.ok(capturedSource !== null, "Status damage should emit player_hit_enemy with source");
assert.equal(capturedSource.weaponId, "weapon_X");
assert.equal(capturedSource.kind, "primary");

// Test Player StatusEffect Source Attribution
let playerDamagedSource: any = null;
CombatEventDispatcher.on("player_damaged", (payload) => {
  if (payload.player === player && payload.damage > 0) {
    playerDamagedSource = payload.source;
  }
});

const enemySourceObj = { kind: "status" as const, canTriggerBuffs: false, canTriggerSynergies: false };
StatusEffectSystem.applyPlayer(player, "poison", 5.0, enemySourceObj);
StatusEffectSystem.updatePlayer(player, 1.0); // poison tick
assert.ok(playerDamagedSource !== null, "Status damage to player should emit player_damaged with source");
assert.equal(playerDamagedSource.kind, "status");

console.log("combat-source-smoke tests passed.");
