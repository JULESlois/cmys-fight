import assert from "node:assert/strict";
import fs from "node:fs";
import { HUB_MAP } from "../src/game/hub/HubMap";
import {
  HubWorldRenderer,
  TRAINING_MARKER_COLORS,
  type TrainingMarkerRenderState,
} from "../src/game/hub/HubWorldRenderer";

interface FillCall {
  x: number;
  y: number;
  width: number;
  height: number;
  fillStyle: string;
  alpha: number;
}

class RecordingContext {
  public fillStyle = "#000000";
  public globalAlpha = 1;
  public readonly fills: FillCall[] = [];
  private readonly stack: Array<{ fillStyle: string; globalAlpha: number }> = [];

  public save(): void {
    this.stack.push({ fillStyle: this.fillStyle, globalAlpha: this.globalAlpha });
  }

  public restore(): void {
    const value = this.stack.pop();
    if (!value) return;
    this.fillStyle = value.fillStyle;
    this.globalAlpha = value.globalAlpha;
  }

  public fillRect(x: number, y: number, width: number, height: number): void {
    this.fills.push({ x, y, width, height, fillStyle: this.fillStyle, alpha: this.globalAlpha });
  }
}

const marker = HUB_MAP.objects.find(object => object.id === "training_marker");
assert.ok(marker, "training marker remains present in the Hub map");
assert.equal(marker.width, 80, "training marker keeps its 80px width");
assert.equal(marker.height, 80, "training marker keeps its 80px height");
assert.equal(marker.sortY, marker.y + marker.height, "training marker keeps its authored sorting point");

const renderer = new HubWorldRenderer();
const privateRenderer = renderer as unknown as {
  drawTrainingMarker: (
    ctx: CanvasRenderingContext2D,
    object: typeof marker,
    time: number,
    state?: TrainingMarkerRenderState,
  ) => void;
};

function draw(time: number, state?: TrainingMarkerRenderState): FillCall[] {
  const context = new RecordingContext();
  privateRenderer.drawTrainingMarker(
    context as unknown as CanvasRenderingContext2D,
    marker,
    time,
    state,
  );
  return context.fills;
}

const idle = draw(0);
for (const color of [
  TRAINING_MARKER_COLORS.stoneDark,
  TRAINING_MARKER_COLORS.stone,
  TRAINING_MARKER_COLORS.woodDark,
  TRAINING_MARKER_COLORS.woodWear,
  TRAINING_MARKER_COLORS.target,
  TRAINING_MARKER_COLORS.gold,
  TRAINING_MARKER_COLORS.proximity,
  TRAINING_MARKER_COLORS.hit,
]) {
  assert.ok(idle.some(call => call.fillStyle === color), `idle marker uses ${color}`);
}

for (const call of idle) {
  assert.ok(call.x >= marker.x && call.x + call.width <= marker.x + marker.width, "idle art stays inside 80px width");
  assert.ok(call.y >= marker.y && call.y + call.height <= marker.y + marker.height, "idle art stays inside 80px height");
}

const laterIdle = draw(0.7);
const idleEmblem = idle.find(call => call.fillStyle === TRAINING_MARKER_COLORS.heavyHit && call.y < marker.y + 24);
const laterEmblem = laterIdle.find(call => call.fillStyle === TRAINING_MARKER_COLORS.heavyHit && call.y < marker.y + 24);
assert.ok(idleEmblem && laterEmblem, "CMYS crystal emblem is rendered");
assert.notEqual(idleEmblem.x, laterEmblem.x, "CMYS crystal emblem has a one-pixel low-frequency sway");

const nearby = draw(0, { proximity: 1 });
assert.ok(
  nearby.filter(call => call.fillStyle === TRAINING_MARKER_COLORS.proximity).length
    > idle.filter(call => call.fillStyle === TRAINING_MARKER_COLORS.proximity).length,
  "proximity adds a cyan target ring without replacing the red target",
);
assert.ok(nearby.some(call => call.fillStyle === TRAINING_MARKER_COLORS.target), "proximity preserves the red target face");

const normalHit = draw(0, {
  hitDirectionX: 1,
  hitDirectionY: 0,
  hitStrength: "normal",
  hitAgeSeconds: 0,
});
const heavyHit = draw(0, {
  hitDirectionX: 1,
  hitDirectionY: 0,
  hitStrength: "heavy",
  hitAgeSeconds: 0,
});
const idleTarget = idle.find(call => call.fillStyle === TRAINING_MARKER_COLORS.target);
const normalTarget = normalHit.find(call => call.fillStyle === TRAINING_MARKER_COLORS.target);
const heavyTarget = heavyHit.find(call => call.fillStyle === TRAINING_MARKER_COLORS.target);
assert.ok(idleTarget && normalTarget && heavyTarget, "target face exists in every state");
assert.equal(normalTarget.x - idleTarget.x, 2, "normal hit deflects the shield by two pixels");
assert.equal(heavyTarget.x - idleTarget.x, 3, "heavy hit deflects the shield by three pixels");

const targetCenterX = marker.x + marker.width / 2;
const impactFxCount = (calls: FillCall[]): number => calls.filter(call =>
  call.x >= targetCenterX + 10
  && (call.fillStyle === TRAINING_MARKER_COLORS.hit
    || call.fillStyle === TRAINING_MARKER_COLORS.proximity
    || call.fillStyle === TRAINING_MARKER_COLORS.heavyHit)
).length;
assert.ok(impactFxCount(normalHit) >= 4, "normal hit emits at least four short-lived sparks");
assert.ok(impactFxCount(heavyHit) > impactFxCount(normalHit), "heavy hit has a visibly larger particle and flash response");

const mapSource = fs.readFileSync("src/game/hub/HubMap.ts", "utf8");
const rendererSource = fs.readFileSync("src/game/hub/HubWorldRenderer.ts", "utf8");
const stateSource = fs.readFileSync("src/game/states/HubState.ts", "utf8");
const conceptSource = fs.readFileSync("docs/art-proposals/2026-07-27-training-marker-redesign.svg", "utf8");
assert.match(mapSource, /decoration\("training_marker",\s*60,\s*47,\s*5,\s*5/);
assert.match(mapSource, /rectCollider\("training_marker_base"/);
assert.match(rendererSource, /interface TrainingMarkerRenderState/);
assert.match(rendererSource, /hitAgeSeconds/);
assert.match(rendererSource, /drawTrainingMarkerBase/);
assert.match(rendererSource, /drawTrainingMarkerFrame/);
assert.match(rendererSource, /drawTrainingMarkerTarget/);
assert.match(rendererSource, /drawTrainingMarkerImpact/);
assert.match(stateSource, /getTrainingMarkerRenderState/);
assert.match(stateSource, /target\.object\.action !== "open_training"/);
assert.match(conceptSource, /<svg[^>]+width="1200"[^>]+height="800"[^>]+viewBox="0 0 1200 800"/);

console.log(JSON.stringify({
  object: marker.id,
  footprint: `${marker.width}x${marker.height}`,
  states: ["idle", "proximity", "normal-hit", "heavy-hit"],
  palette: TRAINING_MARKER_COLORS,
  normalHitFx: impactFxCount(normalHit),
  heavyHitFx: impactFxCount(heavyHit),
}));
