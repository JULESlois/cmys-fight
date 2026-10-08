import assert from "node:assert/strict";
import { GameData, RUN_SAVE_KEY, sanitizeBuffRuntimeState } from "../src/game/GameData";
import { BuffSystem } from "../src/game/combat/BuffSystem";
import { Player } from "../src/game/entities/Player";

// #75: buff runtime counters/cooldowns must survive save/load and state
// rebuild, but only whitelisted scalar gameplay state — never presentation data.

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
}
const storage = new MemoryStorage();
Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });

// 1) sanitize keeps whitelisted scalars, drops junk.
{
  const clean = sanitizeBuffRuntimeState({
    crossSwapCooldown: 2.5,
    crossSwapActive: 1.0,
    grazeCount: 3,
    altCurrentLastWeapon: "pistol",
    secretSenseActive: true,
    entropyQuota: 4,
  });
  assert.equal(clean.crossSwapCooldown, 2.5);
  assert.equal(clean.grazeCount, 3);
  assert.equal(clean.altCurrentLastWeapon, "pistol");
  assert.equal(clean.secretSenseActive, true);
  assert.equal(clean.entropyQuota, 4);

  const hostile = sanitizeBuffRuntimeState({
    crossSwapCooldown: NaN,            // non-finite number dropped
    grazeCount: { nested: true },       // object dropped
    altCurrentLastWeapon: () => 0,      // function dropped
    madeUpKey: 123,                     // non-whitelisted key dropped
    phoenixEmberZone: { x: 1, y: 2 },   // experimental object dropped
  });
  assert.equal(Object.keys(hostile).length, 0, "hostile state must be fully dropped");
  assert.deepEqual(sanitizeBuffRuntimeState(null), {});
  assert.deepEqual(sanitizeBuffRuntimeState([]), {});
  assert.deepEqual(sanitizeBuffRuntimeState("nope"), {});
  assert.deepEqual(sanitizeBuffRuntimeState(undefined), {});
}

// 2) Acceptance: cross_swap cooldown survives a full save/load round trip.
{
  const data = new GameData();
  data.startNewRun("knight", "pistol", false);
  const player = new Player(0, 0);
  player.characterId = "knight";
  BuffSystem.acquire(player, "cross_swap");
  // Simulate a recent swap: active window + cooldown set by the event handler.
  player.buffState["crossSwapActive"] = 0.8;
  player.buffState["crossSwapCooldown"] = 3.0;

  data.data.player.buffs = [...player.buffs];
  data.data.player.buffState = sanitizeBuffRuntimeState(player.buffState);
  data.save();

  // Rebuild from the persisted bytes (fresh store reading the same key).
  const restored = new GameData();
  const ok = restored.load();
  assert.equal(ok, true, "load should succeed from the just-written save");
  assert.equal(restored.data.player.buffState.crossSwapCooldown, 3.0, "cross_swap cooldown must not be reset to 0");
  assert.equal(restored.data.player.buffState.crossSwapActive, 0.8, "cross_swap active window must persist");
}

// 3) Acceptance: graze_relay partial count (1–4) survives.
{
  const data = new GameData();
  data.startNewRun("knight", "pistol", false);
  data.data.player.buffs = ["graze_relay"];
  data.data.player.buffState = sanitizeBuffRuntimeState({ grazeCount: 3 });
  data.save();

  const restored = new GameData();
  restored.load();
  assert.equal(restored.data.player.buffState.grazeCount, 3, "graze count must persist across load");
}

// 4) Legacy save without buffState field falls back to {} safely.
{
  const legacy = new GameData();
  legacy.startNewRun("knight", "pistol", false);
  const snapshot = JSON.parse(JSON.stringify(legacy.data));
  delete snapshot.player.buffState; // simulate a pre-#75 save
  storage.setItem(RUN_SAVE_KEY, JSON.stringify(snapshot));

  const restored = new GameData();
  const ok = restored.load();
  assert.equal(ok, true);
  assert.deepEqual(restored.data.player.buffState, {}, "missing buffState must default to {}");
}

// 5) startNewRun / restart path clears stale runtime state (no cross-run leak).
{
  const data = new GameData();
  data.startNewRun("knight", "pistol", false);
  data.data.player.buffState = sanitizeBuffRuntimeState({ grazeCount: 5, crossSwapCooldown: 3 });
  assert.ok(Object.keys(data.data.player.buffState).length > 0);
  data.restartCurrentRun();
  assert.deepEqual(data.data.player.buffState, {}, "restart must clear buff runtime state");
}

console.log("buff-state-persistence-smoke: ok");
