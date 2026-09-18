import assert from "node:assert/strict";
import { StatusEffectSystem, type StatusEffectId } from "../src/game/combat/StatusEffectSystem";
import type { EnemyBehavior } from "../src/game/data/enemies";
import { Enemy } from "../src/game/entities/Enemy";
import { Player } from "../src/game/entities/Player";
import { EntityRenderer } from "../src/game/render/EntityRenderer";
import { deriveVisibleStatuses } from "../src/game/render/StatusChipLayout";

interface DrawOp {
  op: "fill" | "stroke";
  color: string;
  alpha: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

function recordingContext() {
  const ops: DrawOp[] = [];
  const stack: Array<[string, string, number]> = [];
  const context = {
    fillStyle: "", strokeStyle: "", globalAlpha: 1, lineWidth: 1,
    save() { stack.push([this.fillStyle, this.strokeStyle, this.globalAlpha]); },
    restore() {
      const saved = stack.pop();
      if (saved) [this.fillStyle, this.strokeStyle, this.globalAlpha] = saved;
    },
    translate() {}, rotate() {}, scale() {}, fillText() {},
    fillRect(x: number, y: number, width: number, height: number) {
      ops.push({ op: "fill", color: this.fillStyle, alpha: this.globalAlpha, x, y, width, height });
    },
    strokeRect(x: number, y: number, width: number, height: number) {
      ops.push({ op: "stroke", color: this.strokeStyle, alpha: this.globalAlpha, x, y, width, height });
    },
  };
  return { ctx: context as unknown as CanvasRenderingContext2D, ops };
}

const cases: StatusEffectId[][] = [
  [], ["root"], ["poison", "root"], ["poison", "burn", "root"],
  ["poison", "burn", "slow", "root"], ["root", "poison", "burn", "slow"],
  ["slow", "root", "burn", "poison"], ["poison", "burn", "slow"],
];
for (const ids of cases) {
  const statuses = ids.map(id => ({ id, stacks: 1 }));
  const original = structuredClone(statuses);
  const visible = deriveVisibleStatuses(statuses);
  assert.ok(visible.length <= 3, "never draws more than three complete chips");
  assert.equal(visible.length, Math.min(3, ids.length), "preserves the chip budget");
  assert.equal(visible.some(status => status.id === "root"), ids.includes("root"), "Root cannot be hidden");
  if (ids.length <= 3) assert.deepEqual(visible, statuses, "short rows retain application order");
  assert.deepEqual(statuses, original, "selection cannot mutate gameplay status data");
}

const player = new Player(160, 120);
const enemy = new Enemy(220, 120, "melee");
for (const id of ["poison", "burn", "slow", "root"] as const) {
  StatusEffectSystem.applyPlayer(player, id, 1);
  StatusEffectSystem.applyEnemy(enemy, id, 1);
}
const visibleIds = () => deriveVisibleStatuses(player.statusEffects).map(status => status.id);
assert.deepEqual(visibleIds(), ["poison", "burn", "root"], "only the last slot is replaced for Root");
const previousOrder = visibleIds();
player.statusEffects[3].duration = 0.2;
StatusEffectSystem.applyPlayer(player, "root", 0.65);
assert.deepEqual(visibleIds(), previousOrder, "refreshing Root never moves other chips");
assert.equal(StatusEffectSystem.getMovementMultiplier(player), 0, "Root still blocks movement");
assert.equal(player.statusEffects.length - deriveVisibleStatuses(player.statusEffects).length, 1, "only one effect is hidden");
assert.deepEqual(deriveVisibleStatuses(player.statusEffects, 0), []);
assert.equal(deriveVisibleStatuses(player.statusEffects, 1)[0].id, "root");

// Exercise both public render paths, identifying chips by size and position.
const playerRecording = recordingContext();
EntityRenderer.drawPlayer(playerRecording.ctx, player, { data: { settings: { reducedFlashing: true } } }, "forest", 0);
const enemyRecording = recordingContext();
EntityRenderer.drawEnemy(enemyRecording.ctx, enemy, 0, "forest", true);
const chipColors = (ops: DrawOp[], y: number) => ops
  .filter(op => op.op === "fill" && op.width === 4 && op.height === 4 && op.y === y - 2)
  .map(op => op.color);
assert.deepEqual(chipColors(playerRecording.ops, -24), ["#8BC34A", "#FF7043", "#A1887F"]);
assert.deepEqual(chipColors(enemyRecording.ops, enemy.hitboxOffsetY - enemy.hitboxRadius - 5), ["#8BC34A", "#FF7043", "#A1887F"]);

function warning(behavior: EnemyBehavior, time: number, reduced: boolean): DrawOp[] {
  const target = new Enemy(100, 100, behavior === "boss" ? "boss" : "ranged");
  target.behavior = behavior;
  target.attackState = "windup";
  target.attackAngle = 0.4;
  target.attackTargetX = 154;
  target.attackTargetY = 114;
  const before = JSON.stringify(target);
  const { ctx, ops } = recordingContext();
  EntityRenderer.drawEnemy(ctx, target, time, "forest", reduced);
  assert.equal(JSON.stringify(target), before, "rendering leaves attack timing, targeting and combat data untouched");
  return ops.filter(op => op.color.startsWith("rgba(231,76,60,"));
}

const behaviors: EnemyBehavior[] = ["area", "lob", "charge", "shoot", "scatter", "sniper", "boss", "support", "summon", "melee", "orbit"];
for (const behavior of behaviors) {
  const bright = warning(behavior, 0, false);
  const dim = warning(behavior, 1 / 16, false);
  assert.ok(bright.length > 0 && dim.length > 0, `${behavior}: normal warnings remain visible`);
  for (const time of [0, 1 / 16, 2 / 16, 3 / 16]) {
    const reduced = warning(behavior, time, true);
    assert.deepEqual(reduced, bright, `${behavior}: reduced mode holds the readable bright geometry and opacity`);
  }
  if (["area", "lob", "sniper", "boss", "support", "summon", "orbit"].includes(behavior)) {
    assert.notDeepEqual(dim, bright, `${behavior}: normal mode retains its original alternation`);
  }
  if (behavior === "area" || behavior === "lob") {
    assert.ok(bright.some(op => op.op === "fill" && op.color === "rgba(231,76,60,0.28)"), "area fill stays readable");
    assert.deepEqual(
      dim.filter(op => op.op === "stroke"),
      bright.filter(op => op.op === "stroke"),
      "area boundary is unchanged in either phase",
    );
  }
}

console.log("[combat-readability-smoke] ok: Root visibility, shared status chips and steady reduced-flashing telegraphs");
