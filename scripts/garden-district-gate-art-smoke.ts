import assert from "node:assert/strict";
import fs from "node:fs";
import { HUB_MAP } from "../src/game/hub/HubMap";
import { HubWorldRenderer, type DistrictGateRenderState } from "../src/game/hub/HubWorldRenderer";

type RectCall = { color: string; x: number; y: number; width: number; height: number };

function render(state: DistrictGateRenderState): RectCall[] {
  const calls: RectCall[] = [];
  const ctx = {
    fillStyle: "#000000",
    globalAlpha: 1,
    fillRect(x: number, y: number, width: number, height: number) {
      calls.push({ color: String(this.fillStyle), x, y, width, height });
    },
  } as unknown as CanvasRenderingContext2D;
  const object = HUB_MAP.objects.find(candidate => candidate.id === "garden_district_gate");
  assert.ok(object, "garden district gate exists");
  const renderer = new HubWorldRenderer() as unknown as {
    drawGardenDistrictGate(
      context: CanvasRenderingContext2D,
      target: typeof object,
      time: number,
      renderState: DistrictGateRenderState,
    ): void;
  };
  renderer.drawGardenDistrictGate(ctx, object, 1.25, state);
  return calls;
}

const object = HUB_MAP.objects.find(candidate => candidate.id === "garden_district_gate");
assert.ok(object, "garden district gate map object");
assert.equal(object.width, 80, "garden gate width remains 80 px");
assert.equal(object.height, 64, "garden gate height remains 64 px");

const left = HUB_MAP.colliders?.find(collider => collider.id === "garden_district_gate_pillar_left");
const right = HUB_MAP.colliders?.find(collider => collider.id === "garden_district_gate_pillar_right");
assert.ok(left?.shape === "rect" && right?.shape === "rect", "garden gate retains two pillar colliders");
assert.equal(left.width, 24, "left collider width unchanged");
assert.equal(right.width, 24, "right collider width unchanged");
assert.equal(right.x - (left.x + left.width), 32, "existing central collision lane remains open");

const idle = render({ visualState: "idle" });
const nearby = render({ visualState: "nearby" });
const confirm = render({ visualState: "confirm", progress: 0.58 });
const disabled = render({ visualState: "disabled" });

const count = (calls: RectCall[], color: string) => calls.filter(call => call.color === color).length;
assert.ok(count(nearby, "#7ECF8A") > count(idle, "#7ECF8A"), "nearby state fills vine segments inward");
assert.ok(count(confirm, "#B7FAF5") > count(idle, "#B7FAF5"), "confirm state adds cyan-white sweep feedback");
assert.equal(count(disabled, "#A8D98D"), 0, "disabled state removes leaf motes");

const source = fs.readFileSync("src/game/hub/HubWorldRenderer.ts", "utf8");
const start = source.indexOf("private drawGardenDistrictGate");
const end = source.indexOf("private drawWaystone", start);
const gardenSource = source.slice(start, end);
assert.ok(start >= 0 && end > start, "garden gate uses a dedicated render path");
assert.doesNotMatch(gardenSource, /Math\.random/, "garden animation remains deterministic");
assert.match(gardenSource, /mote < 2/, "idle leaf particle count is capped at two");
assert.match(gardenSource, /Math\.PI \* 2 \* 1\.2/, "seed core uses the authored 1.2 Hz pulse");

console.log(JSON.stringify({
  object: "garden_district_gate",
  footprint: `${object.width}x${object.height}`,
  colliderLane: 32,
  states: ["idle", "nearby", "confirm", "disabled"],
  deterministicLeafMotes: 2,
  palette: ["#28322F", "#60705F", "#7ECF8A", "#456A49", "#B7FAF5", "#D8B45C", "#FFD36B"],
}));
