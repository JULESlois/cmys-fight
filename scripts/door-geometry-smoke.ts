import assert from "node:assert/strict";
import {
  DOOR_ORIENTATIONS,
  DUNGEON_ROOM_HEIGHT,
  DUNGEON_ROOM_WIDTH,
  circleIntersectsRect,
  getDoorApertureTileBounds,
  getDoorBarrierBounds,
  getDoorGeometry,
  getOppositeDoor,
  isDoorTransitionTriggered,
  type DoorRect,
} from "../src/game/dungeon/DoorGeometry";
import { getMapData, isSolid, MAP_WIDTH } from "../src/game/MapData";
import { DoorRenderer } from "../src/game/render/DoorRenderer";

interface FillCall extends DoorRect { color: string }

function createCanvasRecorder(): { ctx: CanvasRenderingContext2D; fills: FillCall[] } {
  const fills: FillCall[] = [];
  let fillStyle = "";
  const target: Record<string, unknown> = {
    save() {},
    restore() {},
    beginPath() {},
    rect() {},
    clip() {},
    fillRect(x: number, y: number, width: number, height: number) {
      fills.push({ x, y, width, height, color: String(fillStyle) });
    },
  };
  Object.defineProperty(target, "fillStyle", {
    get: () => fillStyle,
    set: value => { fillStyle = String(value); },
  });
  return { ctx: target as unknown as CanvasRenderingContext2D, fills };
}

function rectContains(outer: DoorRect, inner: DoorRect): boolean {
  return inner.x >= outer.x
    && inner.y >= outer.y
    && inner.x + inner.width <= outer.x + outer.width
    && inner.y + inner.height <= outer.y + outer.height;
}

const themes = ["forest", "dungeon", "snow", "lava"] as const;
let renderChecks = 0;
let mapChecks = 0;
let roomCombinationChecks = 0;

for (const orientation of DOOR_ORIENTATIONS) {
  const geometry = getDoorGeometry(orientation, 6);

  // --- Physics semantics unchanged ---
  assert.equal(geometry.direction, orientation);
  assert.equal(geometry.orientation, orientation);
  assert.equal(geometry.wallDepth, 32);
  assert.ok(rectContains(geometry.frameBounds, geometry.aperture), `${orientation} frame contains aperture`);
  assert.ok(rectContains(geometry.aperture, geometry.triggerBounds), `${orientation} trigger stays inside aperture`);
  assert.deepEqual(getOppositeDoor(getOppositeDoor(orientation)), orientation);

  const inwardProbeX = geometry.entryPoint.x - geometry.inwardDirection.x * 28;
  const inwardProbeY = geometry.entryPoint.y - geometry.inwardDirection.y * 28;
  assert.equal(
    isDoorTransitionTriggered(geometry, inwardProbeX, inwardProbeY),
    true,
    `${orientation} transition trigger follows aperture`,
  );
  const barrier = getDoorBarrierBounds(geometry);
  assert.ok(rectContains(geometry.aperture, barrier), `${orientation} locked barrier stays inside aperture`);
  assert.equal(
    circleIntersectsRect(barrier.x + barrier.width / 2, barrier.y + barrier.height / 2, 6, barrier),
    true,
  );

  // --- Directional visualBounds constraints ---
  const vb = geometry.visualBounds;
  if (orientation === "down") {
    assert.ok(vb.y >= 224, `down visualBounds.y >= 224 (got ${vb.y})`);
    assert.ok(vb.y + vb.height <= 240, `down visualBounds y+h <= 240 (got ${vb.y + vb.height})`);
  }
  if (orientation === "left") {
    assert.ok(vb.x >= 0, `left visualBounds.x >= 0`);
    assert.ok(vb.x + vb.width <= 16, `left visualBounds x+w <= 16 (got ${vb.x + vb.width})`);
  }
  if (orientation === "right") {
    assert.ok(vb.x >= 304, `right visualBounds.x >= 304 (got ${vb.x})`);
    assert.ok(vb.x + vb.width <= 320, `right visualBounds x+w <= 320 (got ${vb.x + vb.width})`);
  }
  if (orientation === "up") {
    assert.ok(vb.y >= 0, `up visualBounds.y >= 0`);
    assert.ok(vb.y + vb.height <= 240, `up visualBounds stays on canvas`);
  }

  // --- Render checks: each theme x state produces distinct layered output ---
  for (const theme of themes) {
    const openRecorder = createCanvasRecorder();
    DoorRenderer.draw(openRecorder.ctx, geometry, theme, false);
    const lockedRecorder = createCanvasRecorder();
    DoorRenderer.draw(lockedRecorder.ctx, geometry, theme, true);

    const openFills = openRecorder.fills;
    const lockedFills = lockedRecorder.fills;

    assert.ok(openFills.length >= 8, `${orientation}/${theme}/open has layered model (${openFills.length} fills)`);
    assert.ok(lockedFills.length >= 10, `${orientation}/${theme}/locked has layered model (${lockedFills.length} fills)`);

    // --- Directional bounds enforcement on rendered fills ---
    for (const f of [...openFills, ...lockedFills]) {
      if (orientation === "down") {
        assert.ok(f.y >= 224, `down fill y >= 224 (got ${f.y}) [${theme}]`);
        assert.ok(f.y + f.height <= 240, `down fill y+h <= 240 (got ${f.y + f.height}) [${theme}]`);
      }
      if (orientation === "left") {
        assert.ok(f.x >= 0, `left fill x >= 0 (got ${f.x}) [${theme}]`);
        assert.ok(f.x + f.width <= 16, `left fill x+w <= 16 (got ${f.x + f.width}) [${theme}]`);
      }
      if (orientation === "right") {
        assert.ok(f.x >= 304, `right fill x >= 304 (got ${f.x}) [${theme}]`);
        assert.ok(f.x + f.width <= 320, `right fill x+w <= 320 (got ${f.x + f.width}) [${theme}]`);
      }
      if (orientation === "up") {
        assert.ok(f.y >= 0, `up fill y >= 0 (got ${f.y}) [${theme}]`);
        assert.ok(f.y + f.height <= 240, `up fill y+h <= 240 (got ${f.y + f.height}) [${theme}]`);
        assert.ok(f.x >= 0, `up fill x >= 0 (got ${f.x}) [${theme}]`);
        assert.ok(f.x + f.width <= 320, `up fill x+w <= 320 (got ${f.x + f.width}) [${theme}]`);
      }
    }

    // Material depth: at least 4 distinct colors
    assert.ok(new Set(openFills.map(f => f.color)).size >= 4, `${orientation}/${theme}/open has material depth`);
    assert.ok(new Set(lockedFills.map(f => f.color)).size >= 4, `${orientation}/${theme}/locked has material depth`);

    // Open and Locked differ
    const openSig = openFills.map(f => `${f.color}:${f.x}:${f.y}:${f.width}:${f.height}`).join("|");
    const lockedSig = lockedFills.map(f => `${f.color}:${f.x}:${f.y}:${f.width}:${f.height}`).join("|");
    assert.notEqual(openSig, lockedSig, `${orientation}/${theme} open and locked are visually distinct`);

    renderChecks++;
  }

  // --- Four themes produce structurally different frames ---
  const themeSigs: string[] = [];
  for (const theme of themes) {
    const { ctx, fills } = createCanvasRecorder();
    DoorRenderer.draw(ctx, geometry, theme, true);
    themeSigs.push(fills.map(f => f.color).join(","));
  }
  for (let i = 0; i < themes.length; i++) {
    for (let j = i + 1; j < themes.length; j++) {
      assert.notEqual(themeSigs[i], themeSigs[j], `${orientation} ${themes[i]} vs ${themes[j]} have different structure`);
    }
  }

  // --- Map alignment ---
  const room = {
    id: `door-${orientation}`,
    x: 0, y: 0,
    type: "combat",
    templateId: "cross_room",
    encounterSeed: 11,
    doors: {
      up: orientation === "up",
      down: orientation === "down",
      left: orientation === "left",
      right: orientation === "right",
    },
  } as any;
  for (const theme of themes) {
    const map = getMapData(room, theme);
    const apertureTiles = getDoorApertureTileBounds(orientation);
    for (let y = apertureTiles.yMin; y <= apertureTiles.yMax; y++) {
      for (let x = apertureTiles.xMin; x <= apertureTiles.xMax; x++) {
        assert.equal(isSolid(map[y * MAP_WIDTH + x]), false, `${orientation}/${theme} aperture ${x},${y} open`);
      }
    }
    const entryTileX = Math.floor(geometry.entryPoint.x / 16);
    const entryTileY = Math.floor(geometry.entryPoint.y / 16);
    assert.equal(isSolid(map[entryTileY * MAP_WIDTH + entryTileX]), false, `${orientation}/${theme} entry point passable`);
    mapChecks++;
  }
}

// --- Verify three distinct model types (not horizontal/boolean) ---
const upFills = createCanvasRecorder();
DoorRenderer.draw(upFills.ctx, getDoorGeometry("up"), "dungeon", true);
const downFills = createCanvasRecorder();
DoorRenderer.draw(downFills.ctx, getDoorGeometry("down"), "dungeon", true);
const leftFills = createCanvasRecorder();
DoorRenderer.draw(leftFills.ctx, getDoorGeometry("left"), "dungeon", true);

const upSig = upFills.fills.map(f => `${f.x}:${f.y}:${f.width}:${f.height}`).join("|");
const downSig = downFills.fills.map(f => `${f.x}:${f.y}:${f.width}:${f.height}`).join("|");
const leftSig = leftFills.fills.map(f => `${f.x}:${f.y}:${f.width}:${f.height}`).join("|");
assert.notEqual(upSig, downSig, "up and down doors are NOT the same model flipped");
assert.notEqual(upSig, leftSig, "up and left doors are NOT the same model rotated");
assert.notEqual(downSig, leftSig, "down and left doors are distinct models");

// --- Room combination checks ---
const roomTypes = ["start", "combat", "treasure", "exit", "boss"] as const;
const doorSets = [
  { up: true, down: false, left: false, right: false },
  { up: true, down: true, left: false, right: false },
  { up: true, down: true, left: true, right: false },
  { up: true, down: true, left: true, right: true },
] as const;
for (const type of roomTypes) {
  for (const doors of doorSets) {
    const room = {
      id: `${type}-${Object.values(doors).filter(Boolean).length}`,
      x: 0, y: 0,
      type,
      templateId: type === "boss" ? "boss_arena" : "cross_room",
      encounterSeed: 17,
      doors,
    } as any;
    const map = getMapData(room, "forest");
    for (const orientation of DOOR_ORIENTATIONS) {
      if (!doors[orientation]) continue;
      const geometry = getDoorGeometry(orientation);
      const entryTileX = Math.floor(geometry.entryPoint.x / 16);
      const entryTileY = Math.floor(geometry.entryPoint.y / 16);
      assert.equal(isSolid(map[entryTileY * MAP_WIDTH + entryTileX]), false, `${type}/${orientation} entry passable`);
    }
    roomCombinationChecks++;
  }
}

// --- Boundary alignment ---
assert.equal(getDoorGeometry("right").aperture.x + getDoorGeometry("right").aperture.width, DUNGEON_ROOM_WIDTH);
assert.equal(getDoorGeometry("down").aperture.y + getDoorGeometry("down").aperture.height, DUNGEON_ROOM_HEIGHT);

console.log(JSON.stringify({
  orientations: DOOR_ORIENTATIONS,
  themes,
  states: ["open", "locked"],
  renderChecks,
  mapChecks,
  roomCombinationChecks,
  threeModelTypes: ["top-facade", "bottom-wall-embedded", "side-narrow"],
  physicsUnchanged: ["aperture", "triggerBounds", "entryPoint", "barrier", "wallDepth"],
  directionalBounds: { down: "y>=224,y+h<=240", left: "x>=0,x+w<=16", right: "x>=304,x+w<=320" },
  startRoomDuplicateGate: "removed",
}));
