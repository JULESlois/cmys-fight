import assert from "node:assert/strict";
import { ENEMIES } from "../src/game/data/enemies";
import {
  SOULS,
  SOUL_IDS,
  findSoulCoverageGaps,
  getAbilitySouls,
  getSoulForEnemy,
  getSoulsByType,
} from "../src/game/data/souls";
import {
  MAX_HEARTS,
  SUB_WEAPONS,
  SUB_WEAPON_IDS,
  isOffensiveSubWeapon,
} from "../src/game/data/subweapons";
import {
  BASE_STATS,
  DEFAULT_EQUIPMENT,
  EQUIPMENT,
  deriveStats,
  getEquipmentBySlot,
} from "../src/game/data/equipment";
import {
  SoulSystem,
  createDefaultSoulCollection,
  normalizeSoulCollection,
} from "../src/game/combat/SoulSystem";
import {
  EquipmentSystem,
  createDefaultEquipmentProgress,
  normalizeEquipmentProgress,
} from "../src/game/combat/EquipmentSystem";
import { SubWeaponSystem } from "../src/game/combat/SubWeaponSystem";
import {
  GATES,
  GATE_KINDS,
  THEME_GATES,
  canOpenGate,
  createAbilitySet,
  formatCompletion,
  pickGateKind,
  summariseExploration,
} from "../src/game/world/AbilityGates";
import { Player } from "../src/game/entities/Player";
import { createDefaultMetaProgress, normalizeMetaProgress, META_SAVE_VERSION } from "../src/game/MetaProgress";

// ---------------------------------------------------------------- souls ----

const gaps = findSoulCoverageGaps();
assert.deepEqual(gaps.missing, [], "every enemy must drop a soul");
assert.deepEqual(gaps.orphaned, [], "every soul must belong to a real enemy");
assert.equal(SOUL_IDS.length, Object.keys(ENEMIES).length, "souls are one-to-one with enemies");

// Every boss soul is a guaranteed drop; no regular enemy is.
for (const soul of Object.values(SOULS)) {
  const enemy = ENEMIES[soul.enemyId];
  assert.ok(enemy, `${soul.id} points at a real enemy`);
  if (enemy.role === "boss") {
    assert.equal(soul.dropRate, 1, `${soul.id} is a boss soul and must be guaranteed`);
  } else {
    assert.ok(soul.dropRate > 0 && soul.dropRate < 1, `${soul.id} must be a chance drop`);
  }
  if (soul.type === "ability") assert.ok(soul.ability, `${soul.id} is an ability soul and needs an ability`);
  else assert.equal(soul.ability, undefined, `${soul.id} must not declare an ability`);
}

// All four slots are fillable.
for (const type of ["bullet", "guardian", "enchant", "ability"] as const) {
  assert.ok(getSoulsByType(type).length > 0, `${type} souls exist`);
}

// Every authored ability has at least one gate that it opens, or the soul is
// a dead pickup.
const abilities = getAbilitySouls().map(soul => soul.ability!);
for (const ability of abilities) {
  const opens = GATE_KINDS.filter(kind => GATES[kind].opensWith.includes(ability));
  assert.ok(opens.length > 0, `ability "${ability}" must open at least one gate`);
}
// And every gate must be openable by some ability that actually drops.
const droppable = new Set(abilities);
for (const kind of GATE_KINDS) {
  assert.ok(
    GATES[kind].opensWith.some(ability => droppable.has(ability)),
    `gate "${kind}" must be openable by a soul that exists`,
  );
}

// Drop rolls are deterministic and respect the multiplier without ever making
// a chance drop guaranteed.
const chanceSoul = getSoulForEnemy("moss_brute")!;
assert.ok(SoulSystem.rollDrop("moss_brute", chanceSoul.dropRate - 0.001));
assert.equal(SoulSystem.rollDrop("moss_brute", chanceSoul.dropRate + 0.001), undefined);
assert.equal(SoulSystem.rollDrop("moss_brute", 0.96, 1000), undefined, "multiplier cannot guarantee a chance drop");
assert.ok(SoulSystem.rollDrop("forest_guardian", 0.999), "boss souls are always guaranteed");
assert.equal(SoulSystem.rollDrop("not_an_enemy", 0), undefined);

// Collection de-duplicates and equips by type.
const collection = createDefaultSoulCollection();
assert.equal(SoulSystem.collect(collection, "soul_ember_knight"), true);
assert.equal(SoulSystem.collect(collection, "soul_ember_knight"), false, "duplicates are rejected");
assert.equal(SoulSystem.equip(collection, "soul_ember_knight"), true);
assert.equal(SoulSystem.equip(collection, "soul_moss_brute"), false, "cannot equip an unowned soul");
assert.equal(collection.equipped.enchant, "soul_ember_knight");

// A corrupt save cannot leave an equip pointing at an unowned or mistyped soul.
const rescued = normalizeSoulCollection({
  owned: ["soul_ember_knight", "bogus"],
  equipped: { enchant: "soul_moss_brute", bullet: "soul_ember_knight", ability: 42 },
});
assert.deepEqual(rescued.owned, ["soul_ember_knight"]);
assert.equal(rescued.equipped.enchant, undefined, "unowned equip is dropped");
assert.equal(rescued.equipped.bullet, undefined, "type mismatch is dropped");
assert.equal(rescued.equipped.ability, undefined);

// Passive folding stays inside its caps.
const capped = createDefaultSoulCollection();
SoulSystem.collect(capped, "soul_bone_guard");
SoulSystem.equip(capped, "soul_bone_guard");
const effects = SoulSystem.computeEffects(capped);
assert.ok(effects.damageReduction > 0 && effects.damageReduction <= 0.4);
assert.ok(effects.critChance <= 0.5);
assert.ok(effects.moveSpeedMultiplier <= 1.5);

// ---------------------------------------------------------- sub-weapons ----

assert.equal(SUB_WEAPON_IDS.length, 6);
for (const id of SUB_WEAPON_IDS) {
  const weapon = SUB_WEAPONS[id];
  assert.ok(weapon.heartCost >= 1, `${id} must cost at least one heart`);
  assert.ok(weapon.crushHeartCost > weapon.heartCost, `${id} crush must cost more than a throw`);
  assert.ok(weapon.cooldown > 0, `${id} needs a cooldown`);
  assert.ok(weapon.lifetime > 0, `${id} needs a lifetime`);
}
// The stopwatch is the one non-damaging sub-weapon; everything else hits.
assert.equal(isOffensiveSubWeapon("stopwatch"), false);
assert.equal(SUB_WEAPON_IDS.filter(id => !isOffensiveSubWeapon(id)).length, 1);

const player = new Player(160, 120);
assert.equal(player.hearts, 0);
assert.equal(player.subWeaponId, undefined);
assert.equal(SubWeaponSystem.canThrow(player), false, "no sub-weapon means no throw");
assert.deepEqual(SubWeaponSystem.throw(player, 0), { ok: false, reason: "none_equipped" });

SubWeaponSystem.equip(player, "axe");
assert.equal(SubWeaponSystem.throw(player, 0).ok, false, "throwing with zero hearts fails");

assert.equal(SubWeaponSystem.addHearts(player, 5), 5);
const thrown = SubWeaponSystem.throw(player, 0);
assert.equal(thrown.ok, true);
if (thrown.ok) {
  assert.equal(thrown.heartsSpent, SUB_WEAPONS.axe.heartCost);
  assert.equal(player.hearts, 5 - SUB_WEAPONS.axe.heartCost);
  assert.equal(thrown.spawns.length, 1);
  assert.equal(thrown.spawns[0].motion, "arc");
  assert.ok(thrown.spawns[0].vy < 0, "the axe launches upward into its arc");
}
// The cooldown actually gates the next throw.
assert.equal(SubWeaponSystem.throw(player, 0).ok, false);
SubWeaponSystem.update(player, 999);
assert.equal(player.subWeaponCooldown, 0);

// Hearts clamp to capacity rather than overflowing, and the return value is
// the amount actually banked so callers can show a "wasted" cue.
player.maxHearts = MAX_HEARTS;
const heartsBefore = player.hearts;
assert.equal(SubWeaponSystem.addHearts(player, 9999), MAX_HEARTS - heartsBefore);
assert.equal(player.hearts, MAX_HEARTS);
assert.equal(SubWeaponSystem.addHearts(player, 10), 0, "no hearts are taken when already full");
assert.equal(SubWeaponSystem.addHearts(player, -5), 0, "negative gains are ignored");

// Item Crush costs the bar and produces a ring.
const crushed = SubWeaponSystem.crush(player);
assert.equal(crushed.ok, true);
if (crushed.ok) {
  assert.equal(crushed.spawns.length, 8);
  assert.ok(crushed.spawns.every(spawn => spawn.crush));
  assert.equal(crushed.heartsSpent, SUB_WEAPONS.axe.crushHeartCost);
}
// The stopwatch crush is a field, not a ring.
const timeStopper = new Player(0, 0);
SubWeaponSystem.equip(timeStopper, "stopwatch");
SubWeaponSystem.addHearts(timeStopper, MAX_HEARTS);
const timeCrush = SubWeaponSystem.crush(timeStopper);
assert.equal(timeCrush.ok, true);
if (timeCrush.ok) assert.equal(timeCrush.spawns.length, 1, "a zero-damage crush emits one field");

// Arc integration applies gravity; a straight throw does not curve.
const arc = { ...SUB_WEAPONS.axe, motion: "arc" as const };
const arcSpawn = { subWeaponId: "axe" as const, x: 0, y: 0, vx: 10, vy: 0, damage: 1, lifetime: 1, radius: 1, maxHits: 1, motion: arc.motion, color: "#000", crush: false };
SubWeaponSystem.integrate(arcSpawn, 0.5);
assert.ok(arcSpawn.vy > 0, "arc gains downward velocity");
const flatSpawn = { ...arcSpawn, vy: 0, motion: "throw" as const };
SubWeaponSystem.integrate(flatSpawn, 0.5);
assert.equal(flatSpawn.vy, 0, "a straight throw is unaffected by gravity");

// ------------------------------------------------------------ equipment ----

for (const slot of ["hand", "armor", "accessory"] as const) {
  assert.ok(getEquipmentBySlot(slot).length >= 3, `${slot} needs real choices`);
  assert.equal(EQUIPMENT[DEFAULT_EQUIPMENT[slot]].slot, slot, "default item matches its slot");
  assert.equal(EQUIPMENT[DEFAULT_EQUIPMENT[slot]].cost, 0, "starting gear is free");
}

const gear = createDefaultEquipmentProgress();
const baseline = EquipmentSystem.resolve(gear);
assert.equal(EquipmentSystem.acquire(gear, "belmont_relic"), true);
assert.equal(EquipmentSystem.acquire(gear, "belmont_relic"), false, "duplicates are rejected");
assert.equal(EquipmentSystem.equip(gear, "belmont_relic"), true);
const upgraded = EquipmentSystem.resolve(gear);
assert.ok(upgraded.stats.strength > baseline.stats.strength, "gear raises the stat block");
assert.ok(upgraded.derived.damageMultiplier > baseline.derived.damageMultiplier);
assert.ok(upgraded.crushCostMultiplier < 1, "the relic's modifier reaches the resolved loadout");

// Equipping into the wrong slot is impossible, and a corrupt save is repaired.
const repaired = normalizeEquipmentProgress({ owned: ["chain_vest", "nonsense"], equipped: { hand: "chain_vest", armor: "chain_vest", accessory: "nope" } });
assert.equal(repaired.equipped.hand, DEFAULT_EQUIPMENT.hand, "slot mismatch falls back to the default");
assert.equal(repaired.equipped.armor, "chain_vest");
assert.equal(repaired.equipped.accessory, DEFAULT_EQUIPMENT.accessory);
for (const id of Object.values(DEFAULT_EQUIPMENT)) {
  assert.ok(repaired.owned.includes(id), "starting gear is always owned");
}

// Derived stats are monotonic and capped.
const weak = deriveStats(BASE_STATS);
assert.equal(weak.damageMultiplier, 1, "base stats are the neutral point");
assert.equal(weak.damageReduction, 0);
const tanky = deriveStats({ ...BASE_STATS, constitution: 10000 });
assert.ok(tanky.damageReduction <= 0.6, "damage reduction is capped short of immunity");
const lucky = deriveStats({ ...BASE_STATS, luck: 10000 });
assert.ok(lucky.critChance <= 0.5, "crit chance is capped");

// Souls and gear stack without breaching the combined caps.
const stacked = EquipmentSystem.resolve(gear, SoulSystem.computeEffects(capped));
assert.ok(stacked.derived.damageReduction <= 0.7);
assert.ok(stacked.derived.critChance <= 0.75);

// ---------------------------------------------------------------- gates ----

for (const [theme, kinds] of Object.entries(THEME_GATES)) {
  assert.ok(kinds.length > 0, `${theme} needs at least one gate kind`);
  for (const kind of kinds) assert.ok(GATE_KINDS.includes(kind), `${theme} references real gate "${kind}"`);
}
// Gate selection is deterministic and stays in the theme's pool.
for (const theme of Object.keys(THEME_GATES)) {
  for (const roll of [0, 0.25, 0.5, 0.99]) {
    const picked = pickGateKind(theme, roll);
    assert.ok(THEME_GATES[theme].includes(picked), `${theme} roll ${roll} stays in pool`);
    assert.equal(picked, pickGateKind(theme, roll), "gate selection is deterministic");
  }
}
assert.ok(THEME_GATES.dungeon.includes(pickGateKind("unknown_theme", 0.5)), "unknown themes fall back to dungeon");

const noAbilities = createAbilitySet();
const withSlide = createAbilitySet(["slide"]);
assert.equal(canOpenGate("crawlspace", noAbilities), false);
assert.equal(canOpenGate("crawlspace", withSlide), true);
assert.equal(canOpenGate("chasm", createAbilitySet(["grapple"])), true, "either listed ability opens a chasm");
assert.equal(canOpenGate("chasm", createAbilitySet(["double_jump"])), true);

const rooms = [
  { x: 0, y: 0, visited: true },
  { x: 1, y: 0, visited: true, gate: "crawlspace" as const },
  { x: 2, y: 0, visited: false, gate: "grate" as const },
  { x: 3, y: 0, visited: false },
];
const locked = summariseExploration(rooms, noAbilities);
assert.equal(locked.total, 4);
assert.equal(locked.visited, 2);
assert.equal(locked.reachable, 2, "both gated rooms are unreachable without abilities");
assert.deepEqual(locked.blockedBy, { crawlspace: 1, grate: 1 });
assert.equal(locked.completion, 0.5);

const opened = summariseExploration(rooms, createAbilitySet(["slide", "mist"]));
assert.equal(opened.reachable, 4, "holding both abilities reaches everything");
assert.deepEqual(opened.blockedBy, {});
assert.equal(opened.completion, 0.5, "completion tracks visits, not reachability");

assert.equal(summariseExploration([], noAbilities).completion, 0, "an empty floor does not divide by zero");
assert.equal(formatCompletion(0.8421), "84.2%");
assert.equal(formatCompletion(2), "100.0%", "completion is clamped");
assert.equal(formatCompletion(-1), "0.0%");

// ----------------------------------------------------------------- save ----

assert.equal(META_SAVE_VERSION, 9);
const meta = createDefaultMetaProgress();
assert.deepEqual(meta.souls, createDefaultSoulCollection());
assert.deepEqual(meta.equipment.equipped, DEFAULT_EQUIPMENT);
assert.deepEqual(meta.story, { flags: [], seenNodes: [] });

// A version-8 save with no Castlevania layer must load rather than throw.
const legacy = normalizeMetaProgress({ version: 8, currency: 120, victories: 2 });
assert.equal(legacy.version, META_SAVE_VERSION);
assert.equal(legacy.currency, 120);
assert.deepEqual(legacy.souls.owned, [], "a pre-9 save starts with no souls");
assert.deepEqual(legacy.equipment.equipped, DEFAULT_EQUIPMENT, "a pre-9 save gets starting gear");
assert.deepEqual(legacy.story.flags, []);

console.log(JSON.stringify({
  souls: SOUL_IDS.length,
  abilities: abilities.length,
  subWeapons: SUB_WEAPON_IDS.length,
  equipment: Object.keys(EQUIPMENT).length,
  gates: GATE_KINDS.length,
  metaVersion: META_SAVE_VERSION,
  soulCoverage: "one-to-one",
  capsEnforced: true,
}));
