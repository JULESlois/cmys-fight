import assert from "node:assert/strict";
import fs from "node:fs";
import { BuffSystem } from "../src/game/combat/BuffSystem";
import { CombatEventDispatcher } from "../src/game/combat/CombatEvents";
import { DungeonState } from "../src/game/states/DungeonState";
import { Player } from "../src/game/entities/Player";

// #78: AFTERIMAGE CAPTURE must produce a real 1.5s projectile decoy on a 6s
// cooldown, retarget at least standard enemy projectiles, never take damage,
// and clean up on expiry / room change.

// --- Combat layer: cooldown gating and the pending-spawn contract ---
function freshPlayer() {
  const p = new Player(0, 0);
  p.characterId = "mage";
  p.buffs = ["afterimage_capture"];
  p.buffState = {};
  return p;
}

// 1) A perfect dodge with the buff sets the pending intent + 6s cooldown.
{
  const p = freshPlayer();
  CombatEventDispatcher.emit("player_perfect_dodge", { player: p } as never);
  assert.equal(p.buffState["afterimagePending"], true, "perfect dodge must queue a decoy");
  assert.equal(p.buffState["afterimageCooldown"], 6.0, "perfect dodge must start the 6s cooldown");
}

// 2) Without the buff, nothing happens.
{
  const p = new Player(0, 0);
  CombatEventDispatcher.emit("player_perfect_dodge", { player: p } as never);
  assert.equal(p.buffState["afterimagePending"], undefined);
  assert.equal(p.buffState["afterimageCooldown"], undefined);
}

// 3) Within the 6s window, a second perfect dodge does NOT re-queue.
{
  const p = freshPlayer();
  CombatEventDispatcher.emit("player_perfect_dodge", { player: p } as never);
  p.buffState["afterimagePending"] = false; // simulate DungeonState consuming the first
  CombatEventDispatcher.emit("player_perfect_dodge", { player: p } as never);
  assert.equal(p.buffState["afterimagePending"], false, "cooldown must block a re-queue");
  assert.equal(p.buffState["afterimageCooldown"], 6.0, "cooldown must not be reset early");
}

// 4) BuffSystem.update decays the cooldown; after it elapses, a perfect dodge re-queues.
{
  const p = freshPlayer();
  CombatEventDispatcher.emit("player_perfect_dodge", { player: p } as never);
  p.buffState["afterimagePending"] = false;
  BuffSystem.update(p, 6.1); // decay past the window
  assert.ok(p.buffState["afterimageCooldown"] <= 0, "cooldown must decay to <= 0");
  CombatEventDispatcher.emit("player_perfect_dodge", { player: p } as never);
  assert.equal(p.buffState["afterimagePending"], true, "post-cooldown perfect dodge must re-queue");
  assert.equal(p.buffState["afterimageCooldown"], 6.0, "cooldown must restart after expiry");
}

// 5) afterimageCooldown is whitelisted for persistence (#75) but the volatile
//    pending-flag/entity are not.
{
  const gd = fs.readFileSync("src/game/GameData.ts", "utf8");
  assert.ok(gd.includes('"afterimageCooldown"'), "cooldown must be whitelisted for persistence");
  assert.ok(!gd.includes('"afterimagePending"'), "the volatile pending flag must NOT be persisted");
}

// --- DungeonState runtime wiring (source-anchored; the class needs a DOM canvas
// --- to construct, so the behaviour is locked to its contract textually) ---
const src = fs.readFileSync("src/game/states/DungeonState.ts", "utf8");

// spawn consumes the pending flag and creates a 1.5s decoy.
assert.match(src, /afterimagePending"\] === true[\s\S]*?spawnAfterimage/, "updateAfterimage must consume pending");
assert.match(src, /timer: 1\.5/, "decoy lifetime must be 1.5s");

// expiry clears the decoy.
assert.match(src, /this\.afterimage\.timer -= dt[\s\S]*?timer <= 0\) this\.afterimage = null/, "decoy must expire by lifetime");

// room change clears the decoy (room-scoped runtime).
assert.match(src, /clearRoomScopedSkillEntities[\s\S]*?this\.afterimage = null/, "room change must clear the decoy");

// a live decoy outranks every other combat target so enemy projectiles aim at it.
assert.match(src, /getEnemyCombatTarget[\s\S]*?getProjectileAimTarget\(\)[\s\S]*?if \(decoy\) return decoy/, "decoy must win targeting");

// the decoy never routes to damagePlayer (it is an aim point only, not a hurtbox).
const targetBlock = src.slice(src.indexOf("private getEnemyCombatTarget"), src.indexOf("private damageMicheleTurret"));
assert.ok(!/damagePlayer/.test(targetBlock), "decoy must never damage the player");

console.log("afterimage-smoke: ok");
