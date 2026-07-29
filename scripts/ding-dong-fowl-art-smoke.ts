import assert from "node:assert/strict";
import fs from "node:fs";
import { getEnemyDefinition } from "../src/game/data/enemies";
import { Enemy, type EnemyAnimationState } from "../src/game/entities/Enemy";
import { MonsterModelRenderer } from "../src/game/render/MonsterModelRenderer";
import { PixelFxSystem } from "../src/game/render/PixelFxSystem";

interface DrawCall {
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function createRecordingContext(): { ctx: CanvasRenderingContext2D; calls: DrawCall[] } {
  const calls: DrawCall[] = [];
  let fillStyle = "#000000";
  const context = {
    globalAlpha: 1,
    get fillStyle() { return fillStyle; },
    set fillStyle(value: string | CanvasGradient | CanvasPattern) { fillStyle = String(value); },
    save() {},
    restore() {},
    scale() {},
    translate() {},
    fillRect(x: number, y: number, width: number, height: number) {
      calls.push({ color: fillStyle, x, y, width, height });
    },
  } as unknown as CanvasRenderingContext2D;
  return { ctx: context, calls };
}

function renderPose(state: EnemyAnimationState, frame: number): DrawCall[] {
  const enemy = new Enemy(0, 0, "ranged");
  enemy.enemyId = "dingdong_fowl";
  enemy.displayColor = "#F1C40F";
  enemy.behavior = "scatter";
  enemy.animState = state;
  enemy.animFrame = frame;
  enemy.facing = "right";
  const { ctx, calls } = createRecordingContext();
  MonsterModelRenderer.draw(ctx, enemy, 0, false, 1);
  return calls;
}

const definition = getEnemyDefinition("dingdong_fowl");
assert.equal(definition.maxHp, 6);
assert.equal(definition.speed, 34);
assert.equal(definition.radius, 7);
assert.equal(definition.hitboxRadius, 20);
assert.equal(definition.hitboxOffsetY, -18);
assert.equal(definition.shadowWidth, 19);
assert.equal(definition.attackInterval, 1.05);
assert.equal(definition.attackWindup, 0.34);
assert.equal(definition.projectileSpeed, 118);
assert.equal(definition.projectileCount, 4);
assert.equal(definition.projectileSpread, 0.2);

const idle = renderPose("idle", 0);
const bell = idle.find(call => call.color === "#F1C40F" && call.width >= 7 && call.height >= 7);
assert.ok(bell, "idle pose keeps an independent yellow bell block of at least 7x7 pixels");

const attackLift = renderPose("attack", 2);
const idleWingTop = Math.min(...idle.filter(call => call.color === "#C47A18" && call.width === 6).map(call => call.y));
const attackWingTop = Math.min(...attackLift.filter(call => call.color === "#C47A18" && call.width === 6).map(call => call.y));
assert.ok(attackWingTop <= idleWingTop - 6, "attack frame 3 raises both wings into a readable V pose");
assert.equal(
  attackLift.filter(call => call.color === "#FFF1A6" && (call.width === 5 || call.height === 5)).length,
  4,
  "attack frame 3 exposes four short bell axes",
);

const release = renderPose("attack", 3);
assert.equal(
  release.filter(call => call.color === "#FFF8E1" && call.width === 2 && call.height === 2).length,
  4,
  "release frame separates four projectile origin points",
);

const hurtA = renderPose("hurt", 0).find(call => call.color === "#F1C40F" && call.width === 8);
const hurtB = renderPose("hurt", 1).find(call => call.color === "#F1C40F" && call.width === 8);
assert.ok(hurtA && hurtB && Math.abs(hurtA.x - hurtB.x) >= 3, "hurt frames offset the bell independently from the body");

const fx = new PixelFxSystem();
fx.emitDingDongFowlDeath(10, 20, "right", false);
assert.equal(fx.getActiveCount(), 5, "death effect contains one pulse, one clapper and three feathers");
fx.update(0.45);
assert.equal(fx.getActiveCount(), 0, "themed death particles expire within 0.45 seconds");
const lowFx = new PixelFxSystem();
lowFx.emitDingDongFowlDeath(10, 20, "left", true);
assert.equal(lowFx.getActiveCount(), 4, "low FX mode keeps one clapper and no more than two feathers");

const rendererSource = fs.readFileSync("src/game/render/EntityRenderer.ts", "utf8");
assert.match(rendererSource, /drawDingDongFowlScatterAxes/);
assert.match(rendererSource, /distance = 7; distance <= 12; distance \+= 2/);
assert.match(rendererSource, /enemy\.enemyId === "dingdong_fowl"/);

const dungeonSource = fs.readFileSync("src/game/states/DungeonState.ts", "utf8");
assert.match(dungeonSource, /enemy\.enemyId === "dingdong_fowl" \? 6 : 0/);
assert.match(dungeonSource, /projectile\.trailLength = 4/);
assert.match(dungeonSource, /emitDingDongFowlDeath\(enemy\.x, enemy\.y, enemy\.facing/);

const fxSource = fs.readFileSync("src/game/render/PixelFxSystem.ts", "utf8");
const deathStart = fxSource.indexOf("emitDingDongFowlDeath");
const deathEnd = fxSource.indexOf("emitImpact", deathStart);
assert.ok(deathStart >= 0 && deathEnd > deathStart, "themed death effect remains independently inspectable");
assert.doesNotMatch(fxSource.slice(deathStart, deathEnd), /Math\.random/, "themed death particles are deterministic");

const concept = fs.readFileSync("docs/art-proposals/2026-07-28-dingdong-fowl-redesign.svg", "utf8");
assert.match(concept, /width="1200" height="800" viewBox="0 0 1200 800"/);
for (const color of ["#f4f1de", "#f1c40f", "#c47a18", "#b76a16", "#e53935", "#f9a825", "#263238", "#fff1a6"]) {
  assert.ok(concept.toLowerCase().includes(color), `concept palette contains ${color}`);
}

const packageSource = fs.readFileSync("package.json", "utf8");
assert.match(packageSource, /"test:ding-dong-fowl-art"/);
assert.match(packageSource, /test:monsters && npm run test:ding-dong-fowl-art/);

console.log(JSON.stringify({
  enemy: definition.id,
  footprint: {
    radius: definition.radius,
    hitboxRadius: definition.hitboxRadius,
    hitboxOffsetY: definition.hitboxOffsetY,
    shadowWidth: definition.shadowWidth,
  },
  attack: {
    windup: definition.attackWindup,
    projectileCount: definition.projectileCount,
    projectileSpeed: definition.projectileSpeed,
    projectileSpread: definition.projectileSpread,
    warningAxes: 4,
    originOffset: 6,
    initialTrail: 4,
  },
  deathFx: { clappers: 1, feathers: 3, maxLife: 0.44 },
}));
