import assert from "node:assert/strict";
import fs from "node:fs";
import { ENEMIES } from "../src/game/data/enemies";
import {
  MONSTER_ANIMATION_FRAMES,
  MONSTER_MODEL_IDS,
  getMonsterAnimationPose,
  hasMonsterModel,
} from "../src/game/render/MonsterModelRenderer";
import { Enemy } from "../src/game/entities/Enemy";
import { updateEnemyAnimation } from "../src/game/EnemyAnimation";

const enemyIds = Object.keys(ENEMIES).sort();
const modelIds = [...MONSTER_MODEL_IDS].sort();
assert.deepEqual(modelIds, enemyIds, "every enemy must have a dedicated model");
assert.equal(new Set(modelIds).size, enemyIds.length);
for (const id of enemyIds) assert.equal(hasMonsterModel(id), true, id);


assert.deepEqual(MONSTER_ANIMATION_FRAMES, { idle: 2, walk: 4, attack: 4, hurt: 2 });
for (const [state, count] of Object.entries(MONSTER_ANIMATION_FRAMES)) {
  const poses = new Set(Array.from({ length: count }, (_, frame) => JSON.stringify(getMonsterAnimationPose(state as keyof typeof MONSTER_ANIMATION_FRAMES, frame))));
  assert.equal(poses.size, count, `${state} frames should be visually distinct`);
}

const animated = new Enemy(100, 100, "melee");
animated.x = 90;
updateEnemyAnimation(animated, { dt: 0.1, previousX: 100, previousY: 100, targetX: 20 });
assert.equal(animated.facing, "left");
assert.equal(animated.animState, "walk");
assert.equal(animated.animFrame, 0);
animated.x = 80;
updateEnemyAnimation(animated, { dt: 0.11, previousX: 90, previousY: 100, targetX: 20 });
assert.equal(animated.animFrame, 1);

animated.y = 90;
updateEnemyAnimation(animated, { dt: 0.1, previousX: 80, previousY: 100, targetX: 80 });
assert.equal(animated.facing, "left", "vertical movement should retain the last horizontal facing");

animated.attackState = "windup";
animated.attackAngle = Math.PI;
animated.attackAnimationDuration = 1;
animated.attackTimer = 1;
updateEnemyAnimation(animated, { dt: 0.05, previousX: 80, previousY: 90, targetX: 140 });
assert.equal(animated.animState, "attack");
assert.equal(animated.facing, "left");
assert.equal(animated.animFrame, 0);
animated.attackTimer = 0.5;
updateEnemyAnimation(animated, { dt: 0.05, previousX: 80, previousY: 90, targetX: 140 });
assert.equal(animated.animFrame, 1);
animated.attackTimer = 0.01;
updateEnemyAnimation(animated, { dt: 0.05, previousX: 80, previousY: 90, targetX: 140 });
assert.equal(animated.animFrame, 2);
animated.attackState = "recover";
updateEnemyAnimation(animated, { dt: 0.05, previousX: 80, previousY: 90, targetX: 140 });
assert.equal(animated.animFrame, 3);
animated.hitFlash = 0.2;
updateEnemyAnimation(animated, { dt: 0.05, previousX: 80, previousY: 90, targetX: 140 });
assert.equal(animated.animState, "hurt", "hurt animation should override attack animation");
animated.reset(0, 0, "melee");
assert.equal(animated.facing, "right");
assert.equal(animated.animState, "idle");
assert.equal(animated.animFrame, 0);

const source = fs.readFileSync("src/game/render/MonsterModelRenderer.ts", "utf8");
for (const id of enemyIds) {
  assert.match(source, new RegExp(`\\n  ${id.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\(`), `${id} model definition`);
}
assert.doesNotMatch(source, /ctx\.arc\(|ctx\.ellipse\(/, "monster models must use pixel geometry");
assert.match(source, /facing === "left" \? -scale : scale/, "left-facing models should mirror the complete model");
assert.match(source, /previewStates[\s\S]*"idle"[\s\S]*"walk"[\s\S]*"attack"/, "codex preview should cycle animation states");
assert.match(source, /dingdong_fowl[\s\S]*#E53935[\s\S]*#F9A825/, "ding-dong fowl comb and beak");
assert.match(source, /bark_hound[\s\S]*#E57373/, "bark hound open mouth/tongue");
assert.match(source, /white_sampler[\s\S]*#90CAF9[\s\S]*#1E88E5/, "white sampler face shield and suit stripes");
assert.match(source, /code_horse[\s\S]*#2ECC71/, "code horse code panel");
assert.match(source, /broadcast_rooster[\s\S]*#F1C40F/, "broadcast rooster speaker/bell accents");
assert.match(source, /white_director[\s\S]*#EF5350/, "white director megaphone");
assert.match(source, /vat_horse_prime[\s\S]*#455A64/, "vat-horse mechanical tank");

const renderer = fs.readFileSync("src/game/render/EntityRenderer.ts", "utf8");
assert.match(renderer, /MonsterModelRenderer\.draw/);
assert.doesNotMatch(renderer, /drawEnemyAccent/);
assert.doesNotMatch(renderer, /enemy_\$\{enemy\.type\}_idle/);

const themes = ["forest", "dungeon", "snow", "lava"] as const;
for (const theme of themes) {
  const themed = enemyIds.filter(id => ENEMIES[id].theme === theme);
  assert.equal(themed.length, 7, `${theme} should have five regular models and two bosses`);
}

console.log(JSON.stringify({
  dedicatedModels: modelIds.length,
  forestModels: enemyIds.filter(id => ENEMIES[id].theme === "forest").length,
  dungeonModels: enemyIds.filter(id => ENEMIES[id].theme === "dungeon").length,
  snowModels: enemyIds.filter(id => ENEMIES[id].theme === "snow").length,
  lavaModels: enemyIds.filter(id => ENEMIES[id].theme === "lava").length,
  pixelGeometry: "ok",
  memeSilhouettes: "ok",
  directionalFacing: "ok",
  animationStates: "ok",
}));
