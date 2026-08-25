import assert from "node:assert/strict";
import { PALETTES } from "../src/game/data/palettes";
import { storyCharWeight } from "../src/game/story/StoryOverlay";
import { PixelFxSystem } from "../src/game/render/PixelFxSystem";
import { Pickup } from "../src/game/entities/Pickup";

// ---------------------------------------------------------------------------
// Story typewriter cadence: punctuation costs more than plain letters.
// ---------------------------------------------------------------------------
assert.equal(storyCharWeight("a"), 1, "letters cost one tick");
assert.equal(storyCharWeight(" "), 1, "spaces cost one tick");
assert.equal(storyCharWeight("。"), 1.6, "full stop pauses");
assert.equal(storyCharWeight("!"), 1.6, "exclamation pauses");
assert.equal(storyCharWeight("？"), 1.6, "question mark pauses");
assert.equal(storyCharWeight("，"), 1.6, "comma pauses");
assert.equal(storyCharWeight("."), 1.6, "ASCII period pauses");
assert.equal(storyCharWeight("…"), 1.6, "ellipsis pauses");
assert.equal(storyCharWeight("—"), 1, "dash does not pause");

// ---------------------------------------------------------------------------
// Transition colors cover every destination state, deriving from the portal
// palette for dungeon destinations.
// ---------------------------------------------------------------------------
// Every base and deep theme has a portal accent (used by Engine.transitionColor).
for (const theme of Object.keys(PALETTES)) {
  const portal = PALETTES[theme]?.portal;
  assert.ok(typeof portal === "string" && portal.startsWith("#"), `${theme} portal accent for transitions`);
}

// ---------------------------------------------------------------------------
// PixelFxSystem.draw must not set shadowBlur on the degraded path. We probe
// the private glow flag by rendering into a stub that records shadowBlur.
// ---------------------------------------------------------------------------
const glowRecord: number[] = [];
const stubCtx = {
  save() {},
  restore() {},
  globalAlpha: 1,
  shadowColor: "",
  shadowBlur: 0,
  fillStyle: "",
  fillRect() {},
  translate() {},
  rotate() {},
} as unknown as CanvasRenderingContext2D;

const fx = new PixelFxSystem();
const coin = new Pickup(5, 5, "coin", 1);
fx.emitPickup(coin, false); // glow: true particle
fx.draw(stubCtx, false, false);
assert.equal(stubCtx.shadowBlur, 6, "normal path uses shadowBlur for glow");
glowRecord.push(stubCtx.shadowBlur);

stubCtx.shadowBlur = 0;
fx.draw(stubCtx, false, true);
assert.equal(stubCtx.shadowBlur, 0, "lowFx path skips shadowBlur");

stubCtx.shadowBlur = 0;
fx.draw(stubCtx, true, false);
assert.equal(stubCtx.shadowBlur, 0, "reducedFlashing also skips shadowBlur");

console.log("[transition-theme-smoke] ok — story cadence, portal accents, shadow gating");
