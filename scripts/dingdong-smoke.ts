import assert from "node:assert/strict";
import { CHARACTERS, CHARACTER_COLLECTIONS, usesDetailedCharacterArt } from "../src/game/data/characters";
import { DINGDONG_SKILL, getDingdongSkillFrame } from "../src/game/data/dingdong";
import { DINGDONG_CHARACTER_SPRITES } from "../src/game/data/dingdongCharacterArt";
import { SPRITES, SPRITE_PALETTES } from "../src/game/data/sprites";
import { SkillController } from "../src/game/combat/SkillController";
import { applyDingdongPulse } from "../src/game/combat/DingdongPulse";
import { BuffSystem } from "../src/game/combat/BuffSystem";
import { Player } from "../src/game/entities/Player";
import { Enemy } from "../src/game/entities/Enemy";
import { GameData } from "../src/game/GameData";
import { normalizeMetaProgress } from "../src/game/MetaProgress";
import { getCharacterText, t } from "../src/game/i18n";
import { EntityRenderer } from "../src/game/render/EntityRenderer";
import { HubPlayerRenderer } from "../src/game/hub/HubPlayerRenderer";
import { SpriteRenderer } from "../src/game/render/SpriteRenderer";
import { getDingdongSpriteName } from "../src/game/render/DingdongRenderer";
import { RebirthLoadoutState } from "../src/game/states/RebirthLoadoutState";
import { DungeonState } from "../src/game/states/DungeonState";

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

assert.ok(usesDetailedCharacterArt("dingdong"));
assert.ok(CHARACTER_COLLECTIONS.memes.characterIds.includes("dingdong"));
const migrated = normalizeMetaProgress({ version: 9, unlockedCharacters: ["knight"], unlockedStarterWeapons: ["pistol"] });
assert.ok(migrated.unlockedCharacters.includes("dingdong"));
assert.ok(migrated.unlockedStarterWeapons.includes("bell_repeater"));
assert.equal(getCharacterText("dingdong", CHARACTERS.dingdong, "zh-CN").title, "大白·叮咚鸡");
assert.equal(t("zh-CN", "character.collection.memes"), "梗角色");

// Every frame must resolve through the game's real sprite/palette registry.
assert.equal(Object.keys(DINGDONG_CHARACTER_SPRITES).length, 12);
for (const name of Object.keys(DINGDONG_CHARACTER_SPRITES)) {
  const frame = SPRITES[name];
  assert.equal(frame.length, 32, name);
  assert.ok(frame.every(row => row.length === 32), name);
  assert.ok([...frame.join("")].every(pixel => pixel === "." || SPRITE_PALETTES[name][pixel]), `${name}: palette coverage`);
  assert.ok(frame.slice(30).every(row => row === ".".repeat(32)), `${name}: feet fit the shared anchor`);
}
assert.equal(new Set(Object.values(DINGDONG_CHARACTER_SPRITES).map(frame => frame.join(""))).size, 12);
assert.deepEqual(SPRITES.player_dingdong_side_idle.slice(27), SPRITES.player_dingdong_side_idle_1.slice(27), "breathing does not move planted boots");

function freshPlayer(): Player {
  const player = new Player(100, 100);
  player.characterId = "dingdong";
  player.derivedStats.critChance = 0;
  player.derivedStats.damageMultiplier = 1;
  player.setWeaponLoadout(["bell_repeater"], 0);
  return player;
}

const player = freshPlayer();
BuffSystem.applyRuntimeStats(player);
assert.equal(player.radius, 6, "the wider artwork must not change collision");
assert.equal(player.armorRechargeDelay, 2.25);
player.animState = "walk";
player.animFrame = 3;
assert.equal(SkillController.activate(player, [], { x: 0, y: 0 }, 0).activated, true);
assert.equal(player.skillCooldown, 8);
assert.equal(getDingdongSpriteName(player), "player_dingdong_side_skill_0", "skill overrides locomotion");
assert.equal(SkillController.activate(player, [], { x: 0, y: 0 }, 0).activated, false);
assert.equal(SkillController.update(player, 0.1), undefined, "wind-up cannot hit");
assert.equal(getDingdongSkillFrame(player.skillActiveTimer), 1);
player.x = 110;
const release = SkillController.update(player, 0.1);
assert.deepEqual(release?.dingdongPulse, { x: 110, y: 100 });
assert.equal(getDingdongSkillFrame(player.skillActiveTimer), 2, "damage and release pose coincide");
player.x = 120;
assert.equal(player.dingdongPulseX, 110, "recovery movement does not drag the released effect");
assert.equal(SkillController.update(player, 0.15), undefined, "no repeat pulse during recovery");
assert.equal(SkillController.update(player, 0.3), undefined);
assert.equal(getDingdongSpriteName(player), "player_dingdong_side_walk_3", "locomotion resumes after recovery");
assert.ok(Math.abs(DINGDONG_SKILL.frameDurations.reduce((a, b) => a + b, 0) - DINGDONG_SKILL.duration) < 1e-9);

for (const steps of [[0.6], [0.19, 0.03, 0.4], Array<number>(60).fill(0.01)]) {
  const p = freshPlayer();
  SkillController.activate(p, [], { x: 0, y: 0 }, 0);
  const pulses = steps.map(dt => SkillController.update(p, dt)).filter(result => result?.dingdongPulse);
  assert.equal(pulses.length, 1, "the release must survive irregular update intervals without repeating");
}
const dead = freshPlayer();
SkillController.activate(dead, [], { x: 0, y: 0 }, 0);
dead.hp = 0;
assert.equal(SkillController.update(dead, 0.3), undefined, "dying during wind-up cancels damage");

function target(x: number, hp: number): Enemy {
  const enemy = new Enemy(x, 109, "melee");
  enemy.hp = hp;
  return enemy;
}
const attacker = freshPlayer();
const near = target(100, 20);
const edge = target(100 + DINGDONG_SKILL.radius + 13, 20);
const outside = target(100 + DINGDONG_SKILL.radius + 13.01, 20);
const lethal = target(110, 2);
const kills = applyDingdongPulse(attacker, [near, edge, outside, lethal], { x: 100, y: 100 });
assert.equal(near.hp, 16);
assert.equal(edge.hp, 16, "range includes the edge of the enemy hurtbox");
assert.equal(outside.hp, 20);
assert.ok(near.statusEffects.some(effect => effect.id === "slow"));
assert.equal(outside.statusEffects.length, 0);
assert.deepEqual(kills, [lethal.id]);

// Exercise the room boundary directly: no cast may damage the next room.
const room = Object.create(DungeonState.prototype) as any;
room.player = freshPlayer();
SkillController.activate(room.player, [], { x: 0, y: 0 }, 0);
room.clearRoomScopedSkillEntities();
assert.equal(SkillController.update(room.player, 0.3), undefined);

// Navigate to the fourth collection through real UI actions, then confirm it.
const data = new GameData();
const pressed = new Set<string>();
let switchedTo = "";
const engine = {
  data,
  input: {
    wasUiPressed: (key: string) => pressed.has(key),
    getNavigationPrompt: () => "arrows", getConfirmPrompt: () => "Enter", getCancelPrompt: () => "Esc",
  },
  switchState: (name: string) => { switchedTo = name; },
} as any;
const selection = new RebirthLoadoutState(engine);
selection.enter();
function press(key: string) { pressed.add(key); selection.update(0); pressed.clear(); }
press("cancel");
press("left");
const polygons: number[][][] = [];
let currentPath: number[][] = [];
const ctx = new Proxy({ globalAlpha: 1, measureText: (value: string) => ({ width: value.length * 4 }),
  beginPath: () => { currentPath = []; },
  moveTo: (x: number, y: number) => currentPath.push([x, y]),
  lineTo: (x: number, y: number) => currentPath.push([x, y]),
  fill: () => { if (currentPath.length) polygons.push([...currentPath]); },
}, { get: (object, key) => key in object ? (object as any)[key] : () => {} }) as unknown as CanvasRenderingContext2D;
selection.draw(ctx);
const cards = polygons.map(points => {
  const xs = points.map(([x]) => x), ys = points.map(([, y]) => y);
  return { x: Math.min(...xs), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}).filter(bounds => bounds.width === 92 && bounds.height === 136);
assert.equal(cards.length, 3, "three readable cards are rendered when the fourth collection is selected");
assert.ok(cards.every(({ x }) => x >= 0 && x + 92 <= 320), "collection cards stay on screen");
press("confirm");
press("confirm");
assert.equal(switchedTo, "hub");
assert.equal(data.getHubLoadout().characterId, "dingdong");
assert.equal(data.getHubLoadout().starterWeaponId, "bell_repeater");

// Save/reload keeps the selection and cooldown but never replays a pulse.
data.startNewRun("dingdong");
data.data.player.skillActiveTimer = 0.5;
data.data.player.skillCooldown = 7.9;
data.save();
const restored = new GameData();
assert.equal(restored.load(), true);
assert.equal(restored.data.player.characterId, "dingdong");
assert.equal(restored.data.player.skillActiveTimer, 0);
assert.equal(restored.data.player.skillCooldown, 7.9);

// Verify real renderer routing, including a separately rendered weapon.
const calls: string[] = [];
const originalDraw = SpriteRenderer.drawPixelSprite;
SpriteRenderer.drawPixelSprite = (_ctx, name) => { calls.push(name); };
try {
  const p = freshPlayer();
  p.animState = "walk";
  p.animFrame = 2;
  HubPlayerRenderer.draw(ctx, p, false);
  assert.equal(calls.pop(), "player_dingdong_side_walk_2");
  p.skillActiveTimer = 0.4;
  EntityRenderer.drawPlayer(ctx, p, engine, "forest");
  assert.deepEqual(calls, ["player_dingdong_side_skill_2", "weapon_bell_repeater"]);
} finally {
  SpriteRenderer.drawPixelSprite = originalDraw;
}

console.log("dingdong-smoke: art, selection, renderer routing, release timing, AoE, room cleanup and save migration passed");
