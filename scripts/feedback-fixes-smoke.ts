import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { generateStage } from "../src/game/FloorGenerator";
import { createRunProgressFromGlobalStage, FINAL_GLOBAL_STAGE } from "../src/game/RunProgress";
import { getMapData, isSolid, MAP_HEIGHT, MAP_WIDTH } from "../src/game/MapData";
import type { Room } from "../src/game/FloorGenerator";

const directions = {
  left: { dx: -1, dy: 0, start: { x: 1, y: 7 } },
  right: { dx: 1, dy: 0, start: { x: 18, y: 7 } },
  up: { dx: 0, dy: -1, start: { x: 9, y: 1 } },
  down: { dx: 0, dy: 1, start: { x: 9, y: 13 } },
} as const;

function reachableToCenter(room: Room, theme: string, direction: keyof typeof directions): boolean {
  const map = getMapData(room, theme);
  const start = directions[direction].start;
  const targets = new Set(["9,7", "10,7", "9,8", "10,8"]);
  const queue: Array<{ x: number; y: number }> = [{ x: start.x, y: start.y }];
  const seen = new Set([`${start.x},${start.y}`]);
  while (queue.length) {
    const current = queue.shift()!;
    if (targets.has(`${current.x},${current.y}`)) return true;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]] as const) {
      const x = current.x + dx;
      const y = current.y + dy;
      const key = `${x},${y}`;
      if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT || seen.has(key)) continue;
      if (isSolid(map[y * MAP_WIDTH + x])) continue;
      seen.add(key);
      queue.push({ x, y });
    }
  }
  return false;
}

let checkedRooms = 0;
let checkedDoors = 0;
const originalLog = console.log;
console.log = () => {};
for (let seed = 1; seed <= 80; seed++) {
  for (let stageIndex = 1; stageIndex <= FINAL_GLOBAL_STAGE; stageIndex++) {
    const random = (() => {
      let state = (seed * 2654435761 + stageIndex * 1013904223) >>> 0;
      return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 0x100000000;
      };
    })();
    const stage = generateStage(createRunProgressFromGlobalStage(stageIndex), random);
    const roomById = new Map(stage.rooms.map(room => [room.id, room]));
    for (const room of stage.rooms) {
      checkedRooms++;
      for (const [direction, spec] of Object.entries(directions) as Array<[keyof typeof directions, typeof directions[keyof typeof directions]]>) {
        if (!room.doors[direction]) continue;
        checkedDoors++;
        const neighbor = roomById.get(`${room.x + spec.dx},${room.y + spec.dy}`);
        assert.ok(neighbor, `${stage.chapterIndex}-${stage.stageIndex} ${room.id} missing ${direction} neighbor`);
        const opposite = direction === "left" ? "right" : direction === "right" ? "left" : direction === "up" ? "down" : "up";
        assert.equal(neighbor!.doors[opposite], true, `${room.id} ${direction} is not reciprocal`);
        assert.equal(reachableToCenter(room, stage.theme, direction), true,
          `${stage.chapterIndex}-${stage.stageIndex} ${room.id}/${room.templateId} ${direction} door blocked from center`);
      }
    }
  }
}

console.log = originalLog;

const engine = readFileSync("src/game/Engine.ts", "utf8");
const dungeon = readFileSync("src/game/states/DungeonState.ts", "utf8");
const pause = readFileSync("src/game/render/PauseOverlayRenderer.ts", "utf8");
const hud = readFileSync("src/game/render/UIRenderer.ts", "utf8");
const css = readFileSync("src/index.css", "utf8");
const canvas = readFileSync("src/components/GameCanvas.tsx", "utf8");

assert.match(engine, /private showDebugOverlay = false/);
assert.match(engine, /wasPressed\("f6"\)/);
assert.match(dungeon, /isDebugOverlayVisible\(\)/);
assert.doesNotMatch(dungeon, /import\.meta\.env\?\.DEV/);
assert.match(pause, /pause\.skill/);
assert.match(pause, /pause\.loadout/);
assert.doesNotMatch(pause, /TO SWAP/);
assert.doesNotMatch(hud, /Top center: character skill/);
assert.doesNotMatch(hud, /getPrompt\("swapWeapon"\)/);
assert.match(css, /-webkit-touch-callout:\s*none/);
assert.match(css, /user-select:\s*none/);
assert.match(canvas, /onContextMenu=\{event => event\.preventDefault\(\)\}/);
assert.match(canvas, /onLostPointerCapture/);

console.log(JSON.stringify({
  debugHudToggle: "ok",
  pauseDetails: "ok",
  touchSelectionGuard: "ok",
  roomsChecked: checkedRooms,
  doorsChecked: checkedDoors,
  doorConnectivity: "ok",
}));
