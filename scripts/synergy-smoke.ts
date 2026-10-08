import assert from "node:assert/strict";
import { Player } from "../src/game/entities/Player";
import { BuffSystem } from "../src/game/combat/BuffSystem";
import {
  ALL_SYNERGY_IDS,
  SYNERGIES,
  detectActiveSynergies,
  isSynergyActive,
} from "../src/game/combat/SynergySystem";
import { CombatEventDispatcher } from "../src/game/combat/CombatEvents";

// #79: production activation must reject experimental synergies even when both
// required buffs are present, and runtime handlers must stay inert for them.

const EXPERIMENTAL = ALL_SYNERGY_IDS.filter((id) => SYNERGIES[id].experimental);
const PRODUCTION = ALL_SYNERGY_IDS.filter((id) => !SYNERGIES[id].experimental);

assert.ok(EXPERIMENTAL.length > 0, "expected at least one experimental synergy in the catalog");
assert.ok(PRODUCTION.includes("cross_current"), "cross_current must remain the production synergy");

// 1) For every synergy, production isSynergyActive agrees with detectActiveSynergies.
for (const id of ALL_SYNERGY_IDS) {
  const player = new Player(0, 0);
  const [a, b] = SYNERGIES[id].requiredBuffs;
  BuffSystem.acquire(player, a);
  BuffSystem.acquire(player, b);
  const helperResult = isSynergyActive(player, id);
  const detected = detectActiveSynergies(player).includes(id);
  assert.equal(
    helperResult,
    detected,
    `isSynergyActive and detectActiveSynergies must agree for ${id}`,
  );
}

// 2) Every experimental synergy is rejected by default even with required buffs.
for (const id of EXPERIMENTAL) {
  const player = new Player(0, 0);
  const [a, b] = SYNERGIES[id].requiredBuffs;
  BuffSystem.acquire(player, a);
  BuffSystem.acquire(player, b);
  assert.equal(isSynergyActive(player, id), false, `${id} must be inactive in production`);
  assert.equal(
    isSynergyActive(player, id, { includeExperimental: true }),
    true,
    `${id} must be previewable only via explicit opt-in`,
  );
}

// 3) cross_current keeps its production behavior.
{
  const player = new Player(0, 0);
  BuffSystem.acquire(player, "cross_swap");
  BuffSystem.acquire(player, "alternating_current");
  assert.equal(isSynergyActive(player, "cross_current"), true);
  assert.deepEqual(detectActiveSynergies(player), ["cross_current"]);
  CombatEventDispatcher.emit("player_weapon_swapped", { player } as never);
  assert.equal(player.buffState["altCurrentStacks"], 2, "cross_current handler must fire");
}

// 4) phoenix_ember end-to-end: required buffs present, production helper must
// veto the runtime handler. No armor restore, no flame zone, no "used" flag.
{
  const player = new Player(0, 0);
  player.hp = 1;
  player.maxHp = 8;
  player.armor = 0;
  player.maxArmor = 5;
  BuffSystem.acquire(player, "emergency_barrier");
  BuffSystem.acquire(player, "elemental_rounds");
  assert.equal(isSynergyActive(player, "phoenix_ember"), false);
  CombatEventDispatcher.emit("player_damaged", { player } as never);
  assert.equal(player.armor, 0, "phoenix_ember must not restore armor in production");
  assert.equal(player.buffState["phoenixEmberZone"], undefined, "phoenix_ember must not spawn its zone");
  assert.equal(player.buffState["phoenixEmberUsed"], undefined, "phoenix_ember must not mark itself used");
}

// 5) Regression guard: a future experimental synergy must stay filtered even if
// someone forgets to gate its handler, because the shared helper rejects it.
{
  const future = new Player(0, 0);
  for (const id of ALL_SYNERGY_IDS) {
    const [a, b] = SYNERGIES[id].requiredBuffs;
    BuffSystem.acquire(future, a);
    BuffSystem.acquire(future, b);
  }
  const active = detectActiveSynergies(future);
  for (const id of active) assert.equal(SYNERGIES[id].experimental, undefined, `${id} leaked into production set`);
  assert.deepEqual(active.sort(), [...PRODUCTION].sort());
}

console.log("synergy-smoke: ok");
