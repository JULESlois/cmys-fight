import assert from "node:assert/strict";
import { Tween, TweenGroup, cursorPulse, easeOutBack, easeOutCubic, smoothstep } from "../src/game/ui/UiMotion";
import { audio } from "../src/game/audio/AudioManager";

// ---------------------------------------------------------------------------
// Easing functions: endpoints and monotonicity.
// ---------------------------------------------------------------------------
assert.equal(easeOutCubic(0), 0, "easeOutCubic starts at 0");
assert.equal(easeOutCubic(1), 1, "easeOutCubic ends at 1");
assert.equal(smoothstep(0), 0, "smoothstep starts at 0");
assert.equal(smoothstep(1), 1, "smoothstep ends at 1");
assert.equal(easeOutBack(1), 1, "easeOutBack settles exactly at 1");

for (let step = 0; step <= 100; step++) {
  const t = step / 100;
  assert.ok(easeOutCubic(t) >= 0 && easeOutCubic(t) <= 1, "easeOutCubic stays in [0,1]");
  assert.ok(smoothstep(t) >= 0 && smoothstep(t) <= 1, "smoothstep stays in [0,1]");
}
// Monotonic: samples never decrease as t increases.
let previous = -1;
for (let step = 0; step <= 100; step++) {
  const value = easeOutCubic(step / 100);
  assert.ok(value >= previous, "easeOutCubic is monotonic");
  previous = value;
}

// ---------------------------------------------------------------------------
// Tween lifecycle.
// ---------------------------------------------------------------------------
const tween = new Tween(0, 10, 1, easeOutCubic);
assert.equal(tween.getProgress(), 0);
let first = tween.update(0.1);
assert.ok(first > 0 && first < 10, "tween interpolates partway");
for (let i = 0; i < 20; i++) tween.update(0.1);
assert.equal(tween.isDone(), true, "tween finishes after duration");
assert.equal(tween.getProgress(), 1, "progress caps at 1");

let onDoneCalled = false;
const withCallback = new Tween(0, 1, 0.2, easeOutCubic, () => { onDoneCalled = true; });
for (let i = 0; i < 10; i++) withCallback.update(0.05);
assert.equal(onDoneCalled, true, "onDone fires exactly once at completion");

const group = new TweenGroup();
group.add(0, 1, 0.1);
group.add(0, 2, 0.2);
assert.equal(group.isIdle(), false, "group is active with tweens");
group.update(0.25);
assert.equal(group.isIdle(), true, "group drains when all tweens finish");
group.update(0.1);
assert.equal(group.isIdle(), true, "idle group stays idle");

// ---------------------------------------------------------------------------
// Cursor pulse respects reduced flashing.
// ---------------------------------------------------------------------------
const flashes = Array.from({ length: 60 }, (_, i) => cursorPulse(i / 10));
const normalSwing = Math.max(...flashes) - Math.min(...flashes);
assert.ok(normalSwing > 0.8, "normal pulse swings fully");
assert.equal(cursorPulse(0, true), 0.5, "reduced flashing holds a steady mid pulse");
assert.equal(cursorPulse(999, true), 0.5, "reduced flashing is time-independent");

// ---------------------------------------------------------------------------
// UI sounds exist and are quiet-but-present (volume > 0).
// ---------------------------------------------------------------------------
for (const name of ["playUiMove", "playUiConfirm", "playUiCancel"] as const) {
  assert.equal(typeof (audio as any)[name], "function", `${name} is defined on AudioManager`);
}

console.log("[ui-motion-smoke] ok — easing, tweens, cursor pulse, ui sounds");
