/**
 * Castlevania integration smoke: verifies the orphaned systems (sub-weapons,
 * souls, equipment, ability gates) are actually wired into DungeonState's
 * runtime — heart economy on throw, projectile bridging, drop/collect flow
 * into MetaProgress, resolved loadout effects on damage/speed, and gated
 * doors. Headless constructions and seeded rng, modelled on
 * combat-runtime-smoke / notice-smoke.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { GameData } from "../src/game/GameData";
import { DungeonState } from "../src/game/states/DungeonState";
import { Player } from "../src/game/entities/Player";
import { Enemy } from "../src/game/entities/Enemy";
import { DamageSystem } from "../src/game/combat/DamageSystem";
import { SubWeaponSystem } from "../src/game/combat/SubWeaponSystem";
import {
  HEART_PICKUP_LARGE,
  HEART_PICKUP_SMALL,
  MAX_HEARTS,
  SUB_WEAPONS,
} from "../src/game/data/subweapons";
import { SoulSystem } from "../src/game/combat/SoulSystem";
import { EquipmentSystem, createDefaultEquipmentProgress } from "../src/game/combat/EquipmentSystem";
import { SOULS } from "../src/game/data/souls";
import { THEME_GATES } from "../src/game/world/AbilityGates";
import { generateStage, type Room } from "../src/game/FloorGenerator";
import { createRunProgressFromGlobalStage } from "../src/game/RunProgress";
import { createSeededRandom } from "../src/game/Random";
import { getDoorGeometry, isDoorTransitionTriggered } from "../src/game/dungeon/DoorGeometry";
import { acquirePickup } from "../src/game/EntityPools";
import { StoryOverlay } from "../src/game/story/StoryOverlay";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
}
Object.defineProperty(globalThis, "localStorage", { value: new MemoryStorage(), configurable: true });

console.log("Running castlevania-integration-smoke tests...");

// ---------------------------------------------------------------- harness ----

const noticeEvents: Array<{ id?: string; text: string; tone?: string }> = [];
const stateSwitches: string[] = [];
const data = new GameData();
data.startNewRun("knight", "pistol", false);

const engine = {
  data,
  worldNotices: {
    showBottom(request: any, tone?: string) {
      if (typeof request === "string") noticeEvents.push({ text: request, tone });
      else noticeEvents.push({ id: request.id, text: request.text, tone: request.tone });
      return true;
    },
    showRegion() {},
    clear() { noticeEvents.length = 0; },
  },
  triggerScreenShake() {},
  isPerformanceDegraded() { return true; },
  switchState(name: string) { stateSwitches.push(name); },
  input: {
    wasActionPressed: () => false,
    isActionDown: () => false,
    getAxis: () => ({ x: 0, y: 0 }),
  },
} as any;

const dungeon = new DungeonState(engine) as any;
const player: Player = dungeon.getPlayer();

// ------------------------------------------------- 1. sub-weapon throwing ----

SubWeaponSystem.equip(player, "dagger");
assert.equal(SubWeaponSystem.addHearts(player, 5), 5);
dungeon.activateSubWeapon(false);
assert.equal(player.hearts, 5 - SUB_WEAPONS.dagger.heartCost, "throw spends the heart cost");
assert.equal(player.subWeaponCooldown, SUB_WEAPONS.dagger.cooldown, "throw arms the cooldown");
assert.equal(dungeon.projectiles.length, 1, "throw bridges into the live projectile list");
const dagger = dungeon.projectiles[0];
assert.equal(dagger.weaponId, "subweapon:dagger");
assert.equal(dagger.faction, "player");
assert.equal(dagger.damage, SUB_WEAPONS.dagger.damage, "base loadout keeps authored damage");
assert.ok(dagger.life > 0, "the projectile is live");
assert.ok(Math.hypot(dagger.vx, dagger.vy) > 0, "the projectile is moving");

// Cooldown really gates the next throw.
dungeon.activateSubWeapon(false);
assert.equal(dungeon.projectiles.length, 1, "cooldown blocks a second throw");
assert.equal(player.hearts, 5 - SUB_WEAPONS.dagger.heartCost, "blocked throw spends nothing");
SubWeaponSystem.update(player, 999);
assert.equal(player.subWeaponCooldown, 0);

// No hearts, no throw.
player.hearts = 0;
dungeon.activateSubWeapon(false);
assert.equal(dungeon.projectiles.length, 1, "throwing without hearts is refused");

// A sub-weapon projectile kills through the shared DamageSystem path.
const victim = new Enemy(0, 0, "melee");
victim.hp = 1;
const subWeaponKill = DamageSystem.damageEnemy(victim, dagger.damage, player, false, dagger.source);
assert.equal(subWeaponKill.killed, true, "sub-weapon damage flows through DamageSystem");

// Arc motion gains gravity through the bridge; straight throws do not.
dungeon.projectiles.length = 0;
SubWeaponSystem.equip(player, "axe");
SubWeaponSystem.addHearts(player, SUB_WEAPONS.axe.heartCost);
dungeon.activateSubWeapon(false);
const axe = dungeon.projectiles[0];
assert.ok(axe.vy < 0, "the axe launches upward");
const axeVyBefore = axe.vy;
dungeon.applySubWeaponMotion(axe, 0.5);
assert.ok(axe.vy > axeVyBefore, "arc motion accelerates downward");
dungeon.applySubWeaponMotion(dagger, 0.5);
assert.equal(dagger.vy, 0, "straight throws ignore gravity");

// --------------------------------------------------------- 2. item crush ----

dungeon.projectiles.length = 0;
SubWeaponSystem.equip(player, "dagger");
player.hearts = MAX_HEARTS;
dungeon.activateSubWeapon(true);
assert.equal(dungeon.projectiles.length, 8, "crush produces the 8-projectile ring");
assert.equal(player.hearts, MAX_HEARTS - SUB_WEAPONS.dagger.crushHeartCost, "crush spends the crush cost");
assert.ok(player.subWeaponCooldown > 0, "crush arms the cooldown");
for (const spawned of dungeon.projectiles) {
  assert.equal(spawned.weaponId, "subweapon:dagger");
  assert.equal(spawned.damage, SUB_WEAPONS.dagger.crushDamage);
}

// The stopwatch crush/throw freezes instead of spawning projectiles.
dungeon.projectiles.length = 0;
SubWeaponSystem.equip(player, "stopwatch");
player.hearts = MAX_HEARTS;
dungeon.activateSubWeapon(false);
assert.equal(dungeon.projectiles.length, 0, "the stopwatch spawns no projectile");
assert.equal(dungeon.stopwatchFieldTimer, SUB_WEAPONS.stopwatch.lifetime, "the stopwatch raises the field timer");

// Enemies inside the field are frozen by updateEnemies.
const frozen = new Enemy(player.x + 30, player.y, "melee");
frozen.hp = 10;
dungeon.enemies = [frozen];
const frozenX = frozen.x;
const frozenY = frozen.y;
dungeon.updateEnemies(0.25);
assert.equal(frozen.x, frozenX, "frozen enemies do not move");
assert.equal(frozen.y, frozenY);
dungeon.stopwatchFieldTimer = 0;
dungeon.enemies = [];

// --------------------------------- 3. soul drop, collection, meta growth ----

const guardian = new Enemy(120, 120, "melee");
guardian.enemyId = "forest_guardian"; // boss soul: guaranteed drop
dungeon.pickups = [];
dungeon.spawnCastlevaniaDrops(guardian);
const soulPickup = dungeon.pickups.find((p: any) => p.type === "soul");
assert.ok(soulPickup, "a guaranteed soul drops at the corpse");
assert.equal(soulPickup.soulId, "soul_forest_guardian");

noticeEvents.length = 0;
const ownedBefore = data.meta.souls.owned.length;
dungeon.collectSoulPickup(soulPickup.soulId);
assert.equal(data.meta.souls.owned.length, ownedBefore + 1, "collection grows meta.souls");
assert.ok(data.meta.souls.owned.includes("soul_forest_guardian"));
assert.equal(data.meta.souls.equipped.guardian, "soul_forest_guardian", "first soul of a type self-equips");
const obtainedNotice = noticeEvents.find(n => n.id === "soul-obtained:soul_forest_guardian");
assert.ok(obtainedNotice, "soul.obtained notice queued");
assert.ok(obtainedNotice!.text.includes(SOULS.soul_forest_guardian.name), "notice names the soul");

// Duplicate: rejected by the collection, echo notice instead.
noticeEvents.length = 0;
dungeon.collectSoulPickup("soul_forest_guardian");
assert.equal(data.meta.souls.owned.length, ownedBefore + 1, "duplicates do not grow the collection");
assert.ok(noticeEvents.some(n => n.id === "soul-duplicate"), "soul.duplicate notice queued");

// An ability soul grants its traversal power to the run player.
SoulSystem.collect(data.meta.souls, "soul_petal_moth");
SoulSystem.equip(data.meta.souls, "soul_petal_moth");
dungeon.applyMetaLoadout();
assert.ok(player.abilities.includes("double_jump"), "equipped ability soul reaches player.abilities");

// Chance-drop souls stay seeded: same stage seed + counter, same outcome.
const brute = new Enemy(60, 60, "melee");
brute.enemyId = "moss_brute";
dungeon.pickups = [];
dungeon.soulDropCounter = 0;
dungeon.spawnCastlevaniaDrops(brute);
const firstRollDropped = dungeon.pickups.some((p: any) => p.type === "soul");
dungeon.pickups = [];
dungeon.soulDropCounter = 0;
dungeon.spawnCastlevaniaDrops(brute);
assert.equal(
  dungeon.pickups.some((p: any) => p.type === "soul"),
  firstRollDropped,
  "soul rolls are reproducible for the same stage seed and counter",
);

// -------------------------------------------------- 4. heart pickup flow ----

player.hearts = player.maxHearts - 1;
player.x = 160; player.y = 120;
dungeon.pickups = [acquirePickup(player.x, player.y, "heart", HEART_PICKUP_LARGE)];
dungeon.updatePickups(0.016);
assert.equal(dungeon.pickups.length, 0, "heart pickup is consumed");
assert.equal(player.hearts, player.maxHearts, "hearts cap at maxHearts");

// A full bar leaves hearts on the floor, like full mana.
dungeon.pickups = [acquirePickup(player.x, player.y, "heart", HEART_PICKUP_SMALL)];
dungeon.updatePickups(0.016);
assert.equal(dungeon.pickups.length, 1, "full heart bar leaves the pickup");
assert.equal(player.hearts, player.maxHearts);
dungeon.pickups = [];

// Hearts and sub-weapon survive the save round-trip.
SubWeaponSystem.equip(player, "cross");
player.hearts = 7;
dungeon.syncPlayerState();
assert.equal((data.data.player as any).hearts, 7);
assert.equal((data.data.player as any).subWeaponId, "cross");
const restored: Player = dungeon.createPlayerFromSave();
assert.equal(restored.hearts, 7, "hearts restore from the save");
assert.equal(restored.subWeaponId, "cross", "sub-weapon restores from the save");

// ------------------------------------ 5. loadout effects reach the combat ----

// Neutral baseline: a fresh player deals and takes authored damage.
const neutralPlayer = new Player(0, 0);
const neutralTarget = new Enemy(0, 0, "melee");
neutralTarget.hp = 1000; neutralTarget.maxHp = 1000;
const neutralHit = DamageSystem.damageEnemy(neutralTarget, 10, neutralPlayer, true);
assert.equal(neutralHit.hpDamage, 10, "base stats are the neutral point");

// Equip the Belmont Relic: STR jumps, so dealt damage rises.
const gear = createDefaultEquipmentProgress();
assert.equal(EquipmentSystem.acquire(gear, "belmont_relic"), true);
assert.equal(EquipmentSystem.equip(gear, "belmont_relic"), true);
data.meta.equipment = gear;
dungeon.applyMetaLoadout();
assert.ok(player.derivedStats.damageMultiplier > 1.2, "relic raises the damage multiplier");
const target = new Enemy(0, 0, "melee");
target.hp = 1000; target.maxHp = 1000;
const boostedHit = DamageSystem.damageEnemy(target, 10, player, true, {
  kind: "primary", canTriggerBuffs: false, canTriggerSynergies: false,
});
assert.ok(boostedHit.hpDamage > neutralHit.hpDamage, "equipment measurably raises dealt damage");
assert.ok(
  Math.abs(boostedHit.hpDamage - Math.round(10 * player.derivedStats.damageMultiplier * 100) / 100) < 1e-6,
  "dealt damage uses exactly the derived multiplier",
);

// CON-derived damage reduction shrinks incoming damage.
assert.ok(player.derivedStats.damageReduction > 0);
player.hp = player.maxHp;
player.armor = 0;
player.invulnerabilityTimer = 0;
player.knightGuardReady = false;
const taken = DamageSystem.damagePlayer(player, 2, 0);
assert.ok(taken.hpDamage < 2 && taken.hpDamage > 0, "damage reduction shrinks incoming damage");
assert.ok(
  Math.abs(taken.hpDamage - Math.round(2 * (1 - player.derivedStats.damageReduction) * 100) / 100) < 1e-6,
  "incoming damage uses exactly the derived reduction",
);

// Sub-weapon damage scales with the dedicated sub-weapon multiplier.
dungeon.projectiles.length = 0;
SubWeaponSystem.equip(player, "dagger");
player.hearts = 5;
player.subWeaponCooldown = 0;
dungeon.activateSubWeapon(false);
assert.equal(
  dungeon.projectiles[0].damage,
  Math.max(1, Math.round(SUB_WEAPONS.dagger.damage * player.derivedStats.subWeaponMultiplier)),
  "sub-weapon damage uses the STR sub-weapon multiplier",
);
dungeon.projectiles.length = 0;

// A move-speed soul reaches the player's resolved effects.
SoulSystem.collect(data.meta.souls, "soul_boar_charger");
SoulSystem.equip(data.meta.souls, "soul_boar_charger");
dungeon.applyMetaLoadout();
assert.equal(player.soulEffects.moveSpeedMultiplier, 1 + SOULS.soul_boar_charger.power, "BOAR RUSH scales walk speed");

// A heart-capacity soul widens the heart bar.
SoulSystem.collect(data.meta.souls, "soul_heat_smith_drone");
SoulSystem.equip(data.meta.souls, "soul_heat_smith_drone");
dungeon.applyMetaLoadout();
assert.equal(player.maxHearts, MAX_HEARTS + SOULS.soul_heat_smith_drone.power, "heart capacity soul widens the bar");

// ---------------------------------------------------- 6. ability gates ----

// Generator: deeper routes gate their hidden rooms with a theme-legal gate;
// chapter 1 leaves them open.
let gatedSeen = 0;
for (let attempt = 0; attempt < 60; attempt++) {
  const deepStage = generateStage(createRunProgressFromGlobalStage(6), createSeededRandom(9000 + attempt));
  const hidden = deepStage.rooms.find(room => room.type === "hidden");
  if (!hidden) continue;
  gatedSeen++;
  assert.ok(hidden.gate, "deep-route hidden rooms are gated");
  assert.ok(THEME_GATES[deepStage.theme].includes(hidden.gate!), "gate kind is legal for the theme");
}
assert.ok(gatedSeen > 0, "at least one deep hidden room generated");
for (let attempt = 0; attempt < 60; attempt++) {
  const shallowStage = generateStage(createRunProgressFromGlobalStage(1), createSeededRandom(400 + attempt));
  const hidden = shallowStage.rooms.find(room => room.type === "hidden");
  if (hidden) assert.equal(hidden.gate, undefined, "chapter-1 hidden rooms stay open");
}

// Runtime: a gated door refuses without the ability and opens with it. Gate an
// actual generated neighbor of the current room so the lookup is honest.
const floor = data.data.floor;
const startRoom: Room = floor.rooms.find((room: Room) => room.x === floor.currentRoomX && room.y === floor.currentRoomY)!;
const orientationDeltas = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
} as const;
type Orientation = keyof typeof orientationDeltas;
let gateOrientation: Orientation | null = null;
let gateRoom: Room | null = null;
for (const orientation of Object.keys(orientationDeltas) as Orientation[]) {
  if (!startRoom.doors[orientation]) continue;
  const delta = orientationDeltas[orientation];
  const neighbor = floor.rooms.find((room: Room) => room.x === startRoom.x + delta.x && room.y === startRoom.y + delta.y);
  if (neighbor) {
    gateOrientation = orientation;
    gateRoom = neighbor;
    break;
  }
}
assert.ok(gateRoom && gateOrientation, "the start room has a generated neighbor to gate");
gateRoom!.gate = "grate";
gateRoom!.gateOpened = undefined;
dungeon.roomPhase = "exploration";
dungeon.transitionState = "none";

const doorGeometry = getDoorGeometry(gateOrientation!, player.radius);
const standInDoor = () => {
  if (gateOrientation === "up") {
    player.x = doorGeometry.aperture.x + doorGeometry.aperture.width / 2;
    player.y = 8;
  } else if (gateOrientation === "down") {
    player.x = doorGeometry.aperture.x + doorGeometry.aperture.width / 2;
    player.y = 232;
  } else if (gateOrientation === "left") {
    player.x = 8;
    player.y = doorGeometry.aperture.y + doorGeometry.aperture.height / 2;
  } else {
    player.x = 312;
    player.y = doorGeometry.aperture.y + doorGeometry.aperture.height / 2;
  }
};
standInDoor();
assert.ok(isDoorTransitionTriggered(doorGeometry, player.x, player.y), "test stands in the door trigger");

noticeEvents.length = 0;
player.abilities = [];
dungeon.handleDoorTransitions();
assert.equal(dungeon.transitionState, "none", "locked gate blocks the transition");
assert.equal(gateRoom!.gateOpened, undefined);
assert.ok(noticeEvents.some(n => n.id === `gate-locked:${gateRoom!.id}`), "gate.<kind>.locked notice shown");

noticeEvents.length = 0;
player.abilities = ["mist"];
standInDoor();
dungeon.handleDoorTransitions();
assert.equal(gateRoom!.gateOpened, true, "the mist ability opens the grate");
assert.equal(dungeon.transitionState, "fade_out", "opened gate lets the transition begin");
assert.ok(noticeEvents.some(n => n.id === `gate-opened:${gateRoom!.id}`), "gate.opened notice shown");
dungeon.transitionState = "none";
dungeon.pendingTransition = null;

// ---------------------------------------------- 7. chest sub-weapon grant ----

noticeEvents.length = 0;
player.subWeaponId = undefined;
dungeon.chest = { kind: "boss", x: 0, y: 0, weaponId: "pistol", opened: true };
dungeon.maybeGrantChestSubWeapon(startRoom);
assert.ok(player.subWeaponId, "a boss chest always grants a sub-weapon");
assert.ok(
  noticeEvents.some(n => n.id === `subweapon:${player.subWeaponId}`),
  "subweapon pickup/replaced notice shown",
);
const firstGrant = player.subWeaponId;
dungeon.maybeGrantChestSubWeapon(startRoom);
assert.equal(player.subWeaponId, firstGrant, "the grant is seeded per room, so it is stable");
dungeon.chest = null;

// -------------------------------------------------------- 8. story hooks ----

const dungeonSource = fs.readFileSync("src/game/states/DungeonState.ts", "utf8");
assert.match(dungeonSource, /StoryOverlay\.maybeTrigger/);
assert.match(dungeonSource, /kind: "chapter_start"/);
assert.match(dungeonSource, /StoryOverlay\.update\(dt, this\.engine\.input\)/);
assert.match(dungeonSource, /StoryOverlay\.consumeCompleted\(\)/);
assert.match(dungeonSource, /StoryOverlay\.draw\(ctx, this\.engine\.data\.settings\.language\)/);

// Behavioural: defeat holds the result screen while the overlay plays.
assert.equal(data.data.runStats.settled, false);
dungeon.finishRun("defeat");
if (StoryOverlay.isActive()) {
  assert.equal(dungeon.pendingRunOutcome, "defeat", "outcome is held while the overlay is active");
  assert.equal(stateSwitches.length, 0, "run_result is not entered under the overlay");
} else {
  assert.deepEqual(stateSwitches, ["run_result"], "without an overlay the run settles immediately");
}

console.log(JSON.stringify({
  throwEconomy: "hearts+cooldown+projectile",
  crush: "8-ring",
  stopwatch: "freeze-field",
  soulFlow: "drop->pickup->meta+notice",
  heartPickup: "capped",
  savedExtras: "hearts+subWeaponId",
  loadoutEffects: "damage-dealt/taken+speed+heart-capacity",
  gates: "generator+door-runtime",
  chestSubWeapons: "seeded-grant",
  storyHooks: "chapter_start+outcome-gating",
}));
console.log("castlevania-integration-smoke tests passed.");
