import assert from "node:assert/strict";
import fs from "node:fs";
import { BuffSystem } from "../src/game/combat/BuffSystem";
import { DamageSystem } from "../src/game/combat/DamageSystem";
import { CombatEventDispatcher } from "../src/game/combat/CombatEvents";
import { Player } from "../src/game/entities/Player";
import { Enemy } from "../src/game/entities/Enemy";

// #76: player_room_cleared.noDamageTaken must reflect real effective damage.

let clearedNoDamageTaken: boolean | null = null;
CombatEventDispatcher.on("player_room_cleared", (payload) => {
  clearedNoDamageTaken = payload.noDamageTaken;
});

function freshPlayer(characterId = "mage") {
  const player = new Player(0, 0);
  player.characterId = characterId;
  player.maxHp = 8;
  player.hp = 7;
  player.maxArmor = 0;
  player.armor = 0;
  return player;
}

// 1) Effective HP damage emits player_damaged — this is what breaks a Perfect.
{
  const player = freshPlayer();
  let damaged = 0;
  const off = CombatEventDispatcher.on("player_damaged", () => damaged++);
  DamageSystem.damagePlayer(player, 3);
  off();
  assert.equal(damaged, 1, "effective HP damage must emit player_damaged");
  assert.equal(player.hp, 4);
}

// 2) Armor-only damage also emits player_damaged (breaks Perfect, restores no HP).
{
  const player = freshPlayer();
  player.maxArmor = 5;
  player.armor = 5;
  let damaged = 0;
  const off = CombatEventDispatcher.on("player_damaged", () => damaged++);
  DamageSystem.damagePlayer(player, 3);
  off();
  assert.equal(damaged, 1, "armor-only hit must emit player_damaged");
  assert.equal(player.hp, 7, "armor absorbed all HP damage");
  assert.equal(player.armor, 2);
}

// 3) Invulnerability does NOT emit player_damaged — a no-op hit keeps the Perfect.
{
  const player = freshPlayer();
  player.invulnerabilityTimer = 1;
  let damaged = 0;
  const off = CombatEventDispatcher.on("player_damaged", () => damaged++);
  DamageSystem.damagePlayer(player, 3);
  off();
  assert.equal(damaged, 0, "invulnerability-blocked hit must not emit player_damaged");
  assert.equal(player.hp, 7, "no hp lost while invulnerable");
}

// 4) Knight guard: a fully absorbed hit emits nothing; an overflowing hit does.
{
  const guarded = freshPlayer("knight");
  guarded.knightGuardReady = true;
  let emitted = 0;
  const off = CombatEventDispatcher.on("player_damaged", () => emitted++);
  DamageSystem.damagePlayer(guarded, 1); // guard absorbs the only point of damage
  off();
  assert.equal(emitted, 0, "a fully guard-absorbed hit must not emit player_damaged");
  assert.equal(guarded.hp, 7, "guard absorbed the only point of damage");

  const overflowing = freshPlayer("knight");
  overflowing.knightGuardReady = true;
  let emitted2 = 0;
  const off2 = CombatEventDispatcher.on("player_damaged", () => emitted2++);
  DamageSystem.damagePlayer(overflowing, 2); // guard absorbs 1, 1 overflows to hp
  off2();
  assert.equal(emitted2, 1, "damage overflowing the guard must emit player_damaged");
}

// 5) blood_pact_engine restores 1 HP only on a real perfect clear.
// (Set stats before acquiring because the buff's own side-effect lowers maxHp.)
{
  const player = freshPlayer();
  player.buffs = ["blood_pact_engine"]; // avoid acquire()'s real maxHp-2 side-effect
  player.maxHp = 6; player.hp = 4;
  CombatEventDispatcher.emit("player_room_cleared", { player, noDamageTaken: true });
  assert.equal(player.hp, 5, "perfect clear must restore 1 hp via blood_pact_engine");
  assert.equal(clearedNoDamageTaken, true);

  const hurt = freshPlayer();
  hurt.buffs = ["blood_pact_engine"];
  hurt.hp = 3;
  CombatEventDispatcher.emit("player_room_cleared", { player: hurt, noDamageTaken: false });
  assert.equal(hurt.hp, 3, "damaged clear must not restore hp");
}

// 6) perfect_survey only flags on a perfect clear. (BuffSystem.has() only reads
//    the buff list, so grant it directly to avoid triggering handler re-init.)
{
  const player = freshPlayer();
  player.buffs = ["perfect_survey"];
  CombatEventDispatcher.emit("player_room_cleared", { player, noDamageTaken: true });
  assert.equal(player.buffState["perfectSurveyTriggered"], true, "perfect clear must flag perfect survey");

  const hurt = freshPlayer();
  hurt.buffs = ["perfect_survey"];
  CombatEventDispatcher.emit("player_room_cleared", { player: hurt, noDamageTaken: false });
  assert.equal(hurt.buffState["perfectSurveyTriggered"], undefined, "damaged clear must not flag perfect survey");
}

// 7) Source anchors: the clear now derives noDamageTaken from tracked damage,
//    and the whitelist persists the room-scoped record across reload.
const dungeonSrc = fs.readFileSync("src/game/states/DungeonState.ts", "utf8");
assert.match(dungeonSrc, /noDamageTaken: !this\.roomDamageTaken/, "clear must emit the tracked flag");
assert.match(dungeonSrc, /markRoomDamageTaken/, "must subscribe room-damage tracking");
assert.match(dungeonSrc, /initRoomDamageTracking/, "must reset/persist tracking per room load");
const gamedataSrc = fs.readFileSync("src/game/GameData.ts", "utf8");
assert.ok(gamedataSrc.includes('"roomDamageTaken"') && gamedataSrc.includes('"roomDamageRoomId"'), "room damage record must be whitelisted for persistence");

console.log("perfect-clear-smoke: ok");
