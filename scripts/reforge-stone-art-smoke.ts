import assert from "node:assert/strict";
import fs from "node:fs";
import { HubWorldRenderer, type ReforgeStoneRenderState } from "../src/game/hub/HubWorldRenderer";
import { HUB_MAP } from "../src/game/hub/HubMap";

interface FillCall {
  fillStyle: string;
  globalAlpha: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

function render(state: ReforgeStoneRenderState): FillCall[] {
  const calls: FillCall[] = [];
  const ctx = {
    fillStyle: "",
    globalAlpha: 1,
    save() {},
    restore() {},
    fillRect(x: number, y: number, width: number, height: number) {
      calls.push({ fillStyle: this.fillStyle, globalAlpha: this.globalAlpha, x, y, width, height });
    },
  } as unknown as CanvasRenderingContext2D;
  const object = HUB_MAP.objects.find(candidate => candidate.id === "reforge_stone");
  assert.ok(object, "reforge stone map object exists");
  new HubWorldRenderer().drawSortedObject(ctx, object, 1.25, 1, state);
  return calls;
}

const idle = render({ proximity: 0, phase: "idle", phaseTime: 0 });
const nearby = render({ proximity: 1, phase: "idle", phaseTime: 0 });
const confirm = render({ proximity: 1, phase: "confirm", phaseTime: 0.28 });
const cooldown = render({ proximity: 0, phase: "cooldown", phaseTime: 0.2 });
const reduced = render({ proximity: 1, phase: "confirm", phaseTime: 0.28, reducedMotion: true });

for (const color of ["#20262C", "#4B535C", "#8E9AA5", "#1E1713"]) {
  assert.ok(idle.some(call => call.fillStyle === color), `reforge palette includes ${color}`);
}
assert.ok(idle.some(call => call.width === 46 && call.height === 5), "wide anvil shoulder is present");
assert.ok(idle.some(call => call.width === 24 && call.height === 25), "pinched furnace body is present");
assert.ok(
  nearby.filter(call => call.fillStyle === "#D8B45C" && call.width === 2 && call.height === 2).length >= 4,
  "proximity sequentially lights all four belt studs",
);
assert.ok(confirm.some(call => call.fillStyle === "#FFF1B4"), "confirm phase reaches gold-white core");
assert.ok(cooldown.some(call => call.fillStyle === "#5A2C20"), "cooldown uses subdued ember-brown core");
const burstParticles = confirm.filter(call => call.globalAlpha < 1 && call.width <= 2 && call.height === 1);
const reducedBurst = reduced.filter(call => call.globalAlpha < 1 && call.width <= 2 && call.height === 1);
assert.ok(burstParticles.length >= reducedBurst.length + 8, "confirm phase emits eight bounded deterministic particles");
assert.ok(reducedBurst.length <= 2, "reduced motion retains only the two idle ember flecks");

const object = HUB_MAP.objects.find(candidate => candidate.id === "reforge_stone");
const collider = HUB_MAP.colliders?.find(candidate => candidate.id === "reforge_stone");
const hotspot = HUB_MAP.objects.find(candidate => candidate.id === "reforge_hotspot");
assert.deepEqual(object && { width: object.width, height: object.height }, { width: 64, height: 64 }, "64x64 footprint unchanged");
assert.ok(collider?.shape === "circle" && collider.radius === 14, "radius-14 collider unchanged");
assert.ok(hotspot?.interaction?.zone.shape === "circle" && hotspot.interaction.zone.radius === 38, "radius-38 hotspot unchanged");

const stateSource = fs.readFileSync("src/game/states/HubState.ts", "utf8");
assert.match(stateSource, /reforgePhase\s*=\s*"confirm"/);
assert.match(stateSource, /getReforgeStoneRenderState/);
assert.match(stateSource, /reducedMotion:\s*this\.engine\.data\.settings\.reducedFlashing/);

console.log(JSON.stringify({
  object: "reforge_stone",
  footprint: "64x64",
  colliderRadius: 14,
  interactionRadius: 38,
  states: ["idle", "nearby", "confirm", "cooldown", "reduced-motion"],
  confirmParticles: burstParticles.length,
}));
