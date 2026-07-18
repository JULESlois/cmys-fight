import assert from "node:assert/strict";
import fs from "node:fs";
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

for (const orientation of DOOR_ORIENTATIONS) {
  const geometry = getDoorGeometry(orientation, 6);
  assert.equal(geometry.orientation, orientation);
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
    circleIntersectsRect(
      barrier.x + barrier.width / 2,
      barrier.y + barrier.height / 2,
      6,
      barrier,
    ),
    true,
  );

  for (const theme of themes) {
    for (const locked of [false, true]) {
      const { ctx, fills } = createCanvasRecorder();
      DoorRenderer.draw(ctx, geometry, theme, locked);
      assert.ok(fills.length > 0, `${orientation}/${theme}/${locked ? "locked" : "open"} renders`);
      assert.ok(
        fills.every(fill => rectContains(geometry.frameBounds, fill)),
        `${orientation}/${theme}/${locked ? "locked" : "open"} stays in frame bounds`,
      );
      if (locked) {
        assert.ok(
          fills.some(fill => fill.x >= geometry.aperture.x && fill.y >= geometry.aperture.y),
          `${orientation}/${theme} locked state draws inside aperture`,
        );
      }
      renderChecks++;
    }
  }

  const room = {
    id: `door-${orientation}`,
    x: 0,
    y: 0,
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

assert.equal(getDoorGeometry("right").aperture.x + getDoorGeometry("right").aperture.width, DUNGEON_ROOM_WIDTH);
assert.equal(getDoorGeometry("down").aperture.y + getDoorGeometry("down").aperture.height, DUNGEON_ROOM_HEIGHT);

const dungeonSource = fs.readFileSync("src/game/states/DungeonState.ts", "utf8");
const roomRendererSource = fs.readFileSync("src/game/render/RoomRenderer.ts", "utf8");
const mapSource = fs.readFileSync("src/game/MapData.ts", "utf8");
assert.doesNotMatch(dungeonSource, /upDoorXMin|upDoorXMax|downDoorXMin|leftDoorYMin|rightDoorYMin|DOOR_ENTRY_POINTS/);
assert.match(dungeonSource, /getDoorGeometry/);
assert.match(dungeonSource, /getDoorBarrierBounds/);
assert.match(mapSource, /getDoorCarveTileBounds/);
assert.match(roomRendererSource, /DoorRenderer\.draw/);
assert.doesNotMatch(roomRendererSource, /theme === "forest" && currentRoom\?\.type === "start"/);
assert.doesNotMatch(roomRendererSource, /theme === "dungeon" && currentRoom\?\.type === "start"/);
assert.doesNotMatch(roomRendererSource, /theme === "snow" && currentRoom\?\.type === "start"/);
assert.doesNotMatch(roomRendererSource, /theme === "lava" && currentRoom\?\.type === "start"/);

console.log(JSON.stringify({
  orientations: DOOR_ORIENTATIONS,
  themes,
  states: ["open", "locked"],
  renderChecks,
  mapChecks,
  sharedConsumers: ["MapData", "RoomRenderer", "DungeonState", "QA"],
  startRoomDuplicateGate: "removed",
}));

