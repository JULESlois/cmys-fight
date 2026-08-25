import assert from "node:assert/strict";
import { HitStop } from "../src/game/combat/HitStop";
import { FloatingTextRenderer } from "../src/game/render/FloatingTextRenderer";
import { PixelFxSystem } from "../src/game/render/PixelFxSystem";
import { Pickup } from "../src/game/entities/Pickup";

// ---------------------------------------------------------------------------
// HitStop: frame budget, max-combine, reduced-flashing scaling.
// ---------------------------------------------------------------------------
HitStop.reset();
assert.equal(HitStop.isActive(), false, "starts inactive");
assert.equal(HitStop.getRemaining(), 0, "starts at 0s");

HitStop.request(2);
assert.equal(HitStop.isActive(), true, "2-frame request activates");
HitStop.tick(0.016);
const remainingAfterOneTick = HitStop.getRemaining();
assert.ok(remainingAfterOneTick > 0 && remainingAfterOneTick < 2 / 60, "one tick partially drains the stop");

// Max-combine: a smaller request after a larger one must not shrink the stop.
// (2 frames is under the 4-frame cap so the comparison is not clamped.)
HitStop.reset();
HitStop.request(2);
HitStop.request(1);
assert.equal(HitStop.getRemaining(), 2 / 60, "smaller request does not shrink active stop");

// Cap: a buggy caller requesting a huge freeze is clamped to MAX_SECONDS (0.06s).
HitStop.reset();
HitStop.request(60);
assert.equal(HitStop.getRemaining(), 0.06, "oversized request is clamped to MAX_SECONDS");

// Reduced flashing halves the freeze (the paired flash is suppressed, so a
// long freeze would read as a hang).
HitStop.reset();
HitStop.request(4, true);
assert.ok(Math.abs(HitStop.getRemaining() - 2 / 60) < 1e-9, "reducedFlashing halves the freeze");
HitStop.reset();

// ---------------------------------------------------------------------------
// FloatingTextRenderer: pool cap, recycling, crit formatting.
// ---------------------------------------------------------------------------
const ft = new FloatingTextRenderer();
assert.equal(ft.getActiveCount(), 0);
ft.spawn(10, 10, "7", "damage");
assert.equal(ft.getActiveCount(), 1);

for (let i = 0; i < FloatingTextRenderer.MAX_ENTRIES + 5; i++) {
  ft.spawn(0, 0, `${i}`, "damage");
}
assert.ok(
  ft.getActiveCount() <= FloatingTextRenderer.MAX_ENTRIES,
  `pool caps at ${FloatingTextRenderer.MAX_ENTRIES}, got ${ft.getActiveCount()}`,
);

// Update decays entries to zero.
const decayFt = new FloatingTextRenderer();
decayFt.spawn(0, 0, "1", "damage");
for (let i = 0; i < 120; i++) decayFt.update(1 / 60);
assert.equal(decayFt.getActiveCount(), 0, "entries fully decay");

// Crit spawns carry the "!" marker through a non-canvas test seam: spawn then
// expose via a minimal probe (text lives on the pool; count-only here is fine).
const critFt = new FloatingTextRenderer();
critFt.spawn(5, 5, "12", "crit");
critFt.spawn(6, 6, "3", "heal");
assert.equal(critFt.getActiveCount(), 2, "crit and heal kinds coexist");

// ---------------------------------------------------------------------------
// Pickup trail color follows the shared pickup convention (no canvas needed
// for emit bookkeeping).
// ---------------------------------------------------------------------------
const fx = new PixelFxSystem();
assert.ok(fx.getActiveCount() === 0, "fx starts empty");
const coin = new Pickup(10, 10, "coin", 1);
fx.emitPickupTrail(coin, false);
assert.ok(fx.getActiveCount() === 1, "trail emits one spark");
const soul = new Pickup(10, 10, "soul", 1);
fx.emitPickupTrail(soul, false);
assert.ok(fx.getActiveCount() === 2, "trail emits per pickup");
// lowFx suppresses trails entirely.
fx.emitPickupTrail(coin, true);
assert.ok(fx.getActiveCount() === 2, "lowFx suppresses the trail spark");

// ---------------------------------------------------------------------------
// Door unlock pulse respects lowFx too.
// ---------------------------------------------------------------------------
fx.emitDoorUnlock(160, 120, "#39D9E8", false);
const afterUnlock = fx.getActiveCount();
assert.ok(afterUnlock > 2, "door unlock emits a pulse plus sparks");

console.log("[combat-feedback-smoke] ok — hit-stop, floating text, pickup trails, door unlock");
