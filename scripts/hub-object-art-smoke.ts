import assert from "node:assert/strict";
import fs from "node:fs";
import { HUB_MAP } from "../src/game/hub/HubMap";
import { HubWorldRenderer, TRAINING_MARKER_COLORS, type HubObjectRenderState } from "../src/game/hub/HubWorldRenderer";
import type { WorldObjectDefinition } from "../src/game/world/WorldMap";

interface FillCall {
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  alpha: number;
}

function renderObject(object: WorldObjectDefinition, state?: HubObjectRenderState, time = 0.37): FillCall[] {
  const calls: FillCall[] = [];
  const alphaStack: number[] = [];
  const context = {
    fillStyle: "#000000",
    globalAlpha: 1,
    save(): void { alphaStack.push(this.globalAlpha); },
    restore(): void { this.globalAlpha = alphaStack.pop() ?? 1; },
    fillRect(x: number, y: number, width: number, height: number): void {
      calls.push({ color: String(this.fillStyle), x, y, width, height, alpha: this.globalAlpha });
    },
  } as unknown as CanvasRenderingContext2D;
  new HubWorldRenderer().drawSortedObject(context, object, time, 1, state);
  return calls;
}

function objectById(id: string): WorldObjectDefinition {
  const object = HUB_MAP.objects.find(candidate => candidate.id === id);
  assert.ok(object, `missing Hub object: ${id}`);
  return object;
}

const training = objectById("training_marker");
const trainingIdle = renderObject(training, { trainingMarker: { proximity: 0 } });
const trainingNearby = renderObject(training, { trainingMarker: { proximity: 1 } });
assert.ok(trainingIdle.length >= 40, "training marker should retain its full stone, timber, emblem, and target silhouette");
assert.equal(trainingNearby.length, trainingIdle.length + 4, "training proximity should add a four-sided focus ring");
assert.ok(trainingIdle.some(call => call.color === TRAINING_MARKER_COLORS.target), "training target uses its authored red face");
assert.ok(trainingNearby.some(call => call.color === TRAINING_MARKER_COLORS.proximity && call.alpha < 1), "training proximity ring is alpha stepped");

const reforge = objectById("reforge_stone");
const reforgeIdle = renderObject(reforge, { reforgeStone: { proximity: 0, phase: "idle" } });
const reforgeNearby = renderObject(reforge, { reforgeStone: { proximity: 1, phase: "idle" } });
const reforgeConfirm = renderObject(reforge, { reforgeStone: { phase: "confirm", phaseTime: 0.21 } });
const reforgeReduced = renderObject(reforge, { reforgeStone: { phase: "confirm", phaseTime: 0.21, reducedMotion: true } });
const reforgeCooldown = renderObject(reforge, { reforgeStone: { phase: "cooldown", phaseTime: 0.1 } });
assert.equal(reforgeNearby.length, reforgeIdle.length + 4, "reforge proximity should add two upper focus corners");
assert.equal(reforgeConfirm.length, reforgeReduced.length + 6, "reduced flashing should suppress only the six-particle confirm burst");
assert.ok(reforgeCooldown.some(call => call.color === "#B7FAF5"), "reforge cooldown should visibly cool the central glyph");

const gardenGate = objectById("garden_district_gate");
const gardenIdle = renderObject(gardenGate, { districtGate: { visualState: "idle" } });
const gardenNearby = renderObject(gardenGate, { districtGate: { visualState: "nearby" } });
assert.equal(gardenNearby.length, gardenIdle.length + 4, "garden proximity should grow four additional vine segments");
assert.ok(gardenIdle.some(call => call.color === "#28322F"), "garden gate should use its root-stone silhouette");
assert.ok(gardenNearby.some(call => call.color === "#FFE39A"), "garden lanterns should brighten nearby");

const northWaystone = objectById("north_waystone");
const southWaystone = objectById("south_waystone");
assert.equal(northWaystone.properties?.direction, "north");
assert.equal(southWaystone.properties?.direction, "south");
const waystoneTemplate = { ...northWaystone, x: 0, y: 0 };
const northCalls = renderObject({ ...waystoneTemplate, properties: { ...waystoneTemplate.properties, direction: "north" } });
const southCalls = renderObject({ ...waystoneTemplate, properties: { ...waystoneTemplate.properties, direction: "south" } });
assert.notDeepEqual(northCalls, southCalls, "paired waystones should render distinct cardinal cues");

assert.deepEqual(training.physicalFootprint, [{ shape: "rect", x: 991, y: 812, width: 18, height: 20 }]);
assert.deepEqual(reforge.physicalFootprint, [{ shape: "circle", x: 224, y: 576, radius: 14 }]);
assert.deepEqual(northWaystone.physicalFootprint, [{ shape: "circle", x: 648, y: 288, radius: 10 }]);
assert.deepEqual(southWaystone.physicalFootprint, [{ shape: "circle", x: 648, y: 752, radius: 10 }]);
assert.deepEqual(gardenGate.physicalFootprint, [
  { shape: "rect", x: 368, y: 806, width: 24, height: 26 },
  { shape: "rect", x: 424, y: 806, width: 24, height: 26 },
]);

for (const [hotspotId, action, radius] of [
  ["training_marker_hotspot", "open_training", 40],
  ["reforge_hotspot", "open_meta_refund", 38],
  ["north_waystone_hotspot", "inspect_waystone", 34],
  ["south_waystone_hotspot", "inspect_waystone", 34],
] as const) {
  const hotspot = objectById(hotspotId);
  assert.equal(hotspot.action, action);
  assert.equal(hotspot.interaction?.zone.shape, "circle");
  if (hotspot.interaction?.zone.shape === "circle") assert.equal(hotspot.interaction.zone.radius, radius);
}

const rendererSource = fs.readFileSync("src/game/hub/HubWorldRenderer.ts", "utf8");
const stateSource = fs.readFileSync("src/game/states/HubState.ts", "utf8");
assert.doesNotMatch(rendererSource, /TrainingMarkerHit|hitDirection|hitStrength|comboLevel/);
assert.match(rendererSource, /DistrictGateVisualState = "idle" \| "nearby"/);
assert.match(stateSource, /this\.reforgePhase = "confirm"/);
assert.match(stateSource, /reducedMotion: this\.engine\.data\.settings\.reducedFlashing/);
assert.match(stateSource, /this\.reforgePhase = "idle";\s*this\.reforgePhaseTime = 0;/);

console.log(JSON.stringify({
  trainingCalls: { idle: trainingIdle.length, nearby: trainingNearby.length },
  reforgeCalls: { idle: reforgeIdle.length, nearby: reforgeNearby.length, confirm: reforgeConfirm.length, reduced: reforgeReduced.length },
  gardenCalls: { idle: gardenIdle.length, nearby: gardenNearby.length },
  waystoneDirections: [northWaystone.properties?.direction, southWaystone.properties?.direction],
  geometry: "preserved",
}));
