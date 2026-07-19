import assert from "node:assert/strict";
import fs from "node:fs";
import {
  chestWorldPoint,
  getChestGeometry,
  getChestLootSlotOffsets,
  resolveChestLootPositions,
  type ChestKind,
} from "../src/game/dungeon/ChestGeometry";
import { RoomObjectCollision } from "../src/game/dungeon/RoomObjectCollision";
import { ChestRenderer } from "../src/game/render/ChestRenderer";

interface FillRecord {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

function createCanvasRecorder(): { ctx: CanvasRenderingContext2D; fills: FillRecord[] } {
  const fills: FillRecord[] = [];
  const stack: Array<{ x: number; y: number }> = [];
  let tx = 0;
  let ty = 0;
  let fillStyle = "";
  const target: Record<string, unknown> = {
    save() { stack.push({ x: tx, y: ty }); },
    restore() {
      const state = stack.pop();
      if (state) { tx = state.x; ty = state.y; }
    },
    translate(x: number, y: number) { tx += x; ty += y; },
    fillRect(x: number, y: number, width: number, height: number) {
      fills.push({ x: tx + x, y: ty + y, width, height, color: String(fillStyle) });
    },
  };
  Object.defineProperty(target, "fillStyle", {
    get: () => fillStyle,
    set: value => { fillStyle = String(value); },
  });
  return { ctx: target as unknown as CanvasRenderingContext2D, fills };
}

function bounds(fills: FillRecord[]) {
  return {
    left: Math.min(...fills.map(fill => fill.x)),
    top: Math.min(...fills.map(fill => fill.y)),
    right: Math.max(...fills.map(fill => fill.x + fill.width)),
    bottom: Math.max(...fills.map(fill => fill.y + fill.height)),
  };
}

const chestPosition = { x: 160, y: 120 };
const expectedLootY: Record<ChestKind, number> = { treasure: 143, boss: 148 };
const renderStates: string[] = [];

for (const kind of ["treasure", "boss"] as const) {
  const geometry = getChestGeometry(kind);
  assert.deepEqual(geometry.bodyAnchor, { x: 0, y: 0 });
  assert.equal(geometry.openedLidAnchor.x, 0, `${kind} opened lid remains horizontally centered`);
  assert.ok(geometry.openedLidAnchor.y <= geometry.closedLidAnchor.y - 10, `${kind} lid moves back/up`);
  const loot = chestWorldPoint(chestPosition, geometry.lootDropAnchor);
  assert.equal(loot.x, chestPosition.x);
  assert.equal(loot.y, expectedLootY[kind]);
  assert.ok(loot.y > chestPosition.y + geometry.physicalFootprint.y + geometry.physicalFootprint.height + 8);

  for (const opened of [false, true]) {
    const bodyRecorder = createCanvasRecorder();
    ChestRenderer.drawPart(bodyRecorder.ctx, { ...chestPosition, kind, opened }, 12.5, "dungeon", "body");
    const lidRecorder = createCanvasRecorder();
    ChestRenderer.drawPart(lidRecorder.ctx, { ...chestPosition, kind, opened }, 12.5, "dungeon", "lid");
    assert.ok(bodyRecorder.fills.length >= 8, `${kind}/${opened} body has layered modeling`);
    assert.ok(lidRecorder.fills.length >= 6, `${kind}/${opened} lid has layered modeling`);
    if (opened) {
      const bodyBounds = bounds(bodyRecorder.fills);
      const lidBounds = bounds(lidRecorder.fills);
      assert.ok(lidBounds.bottom < bodyBounds.top + 2, `${kind} opened lid clears front body/loot area`);
    }
    renderStates.push(`${kind}:${opened ? "open" : "closed"}`);
  }

  const collision = new RoomObjectCollision();
  for (const opened of [false, true]) {
    collision.rebuild({ chest: { kind, ...chestPosition, opened } });
    assert.equal(collision.isCircleBlocked(chestPosition.x, chestPosition.y + 4, 6, "player"), true);
    assert.equal(collision.isCircleBlocked(chestPosition.x, chestPosition.y + 4, 4, "projectile"), true);
    const loot = chestWorldPoint(chestPosition, geometry.lootDropAnchor);
    assert.equal(collision.isCircleBlocked(loot.x, loot.y, 5, "player"), false, `${kind} loot anchor is outside body`);
  }
}

assert.deepEqual(getChestLootSlotOffsets(1), [{ x: 0, y: 0 }]);
assert.deepEqual(getChestLootSlotOffsets(2), [{ x: -10, y: 0 }, { x: 10, y: 0 }]);
assert.deepEqual(getChestLootSlotOffsets(3), [{ x: -14, y: 0 }, { x: 0, y: 4 }, { x: 14, y: 0 }]);

const treasurePositions = resolveChestLootPositions({
  kind: "treasure",
  chestX: 160,
  chestY: 120,
  count: 1,
  isBlocked: () => false,
});
assert.deepEqual(treasurePositions, [{ x: 160, y: 143 }]);

const bossPositions = resolveChestLootPositions({
  kind: "boss",
  chestX: 160,
  chestY: 120,
  count: 3,
  isBlocked: () => false,
});
assert.deepEqual(bossPositions, [
  { x: 146, y: 148 },
  { x: 160, y: 152 },
  { x: 174, y: 148 },
]);
for (let i = 0; i < bossPositions.length; i++) {
  for (let j = i + 1; j < bossPositions.length; j++) {
    assert.ok(Math.hypot(bossPositions[i].x - bossPositions[j].x, bossPositions[i].y - bossPositions[j].y) >= 11);
  }
}

const pushedForward = resolveChestLootPositions({
  kind: "treasure",
  chestX: 160,
  chestY: 120,
  count: 2,
  isBlocked: (_x, y) => y < 151,
});
assert.ok(pushedForward.every(point => point.y >= 151), "blocked anchors search forward first");
assert.ok(pushedForward.every(point => point.y > 120), "fallback never returns inside/behind chest");

const dungeonSource = fs.readFileSync("src/game/states/DungeonState.ts", "utf8");
const rendererSource = fs.readFileSync("src/game/render/ChestRenderer.ts", "utf8");
assert.match(dungeonSource, /resolveChestLootPositions/);
assert.match(dungeonSource, /typeof \(p as any\)\.baseY === "number"/);
assert.match(dungeonSource, /ChestRenderer\.drawPart\(ctx, this\.chest, time, theme, "shadow"\)/);
assert.match(dungeonSource, /id: "chest:lid"/);
assert.match(dungeonSource, /id: "chest:body"/);
assert.doesNotMatch(dungeonSource, /this\.chest\.x, this\.chest\.y \+ 10/);
assert.doesNotMatch(dungeonSource, /acquirePickup\(216, 120|acquirePickup\(152, 120/);
assert.match(rendererSource, /openedLidAnchor/);
assert.match(rendererSource, /ChestRenderPart/);

console.log(JSON.stringify({
  geometries: ["treasure", "boss"],
  renderStates,
  treasureLoot: treasurePositions,
  bossLoot: bossPositions,
  blockedSearch: pushedForward,
  persistence: "baseY-serialized-and-restored-with-room-pickups",
  collision: "closed-and-open-body-blocking-loot-anchor-clear",
}));
