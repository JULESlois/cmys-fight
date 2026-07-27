import assert from "node:assert/strict";
import { drawTrialAltarArt, TRIAL_ALTAR_ART } from "../src/game/hub/art/TrialAltarArt";

type RectCall = { color: string; x: number; y: number; width: number; height: number };
function render(part: string, state: string, time = 0.2): RectCall[] {
  const calls: RectCall[] = [];
  const ctx = { fillStyle: "", fillRect(x: number, y: number, width: number, height: number) { calls.push({ color: this.fillStyle, x, y, width, height }); } } as unknown as CanvasRenderingContext2D;
  drawTrialAltarArt(ctx, { id: `trial_${part}`, type: "decoration", x: 100, y: 100, width: 96, height: 104, properties: { artPart: part, artOriginX: 100, artOriginY: 100, trialVisualState: state, proximity: 1 } }, time);
  return calls;
}
assert.equal(TRIAL_ALTAR_ART.designBounds.width, 112);
assert.equal(TRIAL_ALTAR_ART.designBounds.height, 120);
assert.equal(TRIAL_ALTAR_ART.animationChannels?.find(channel => channel.id === "confirm-lock")?.period, 0.45);
assert.ok(render("altar_body", "idle").filter(call => call.color === "#151923" && call.height >= 33).length >= 3);
assert.ok(render("rune_court", "proximity").filter(call => call.color === "#D16CFF").length >= 5);
assert.equal(render("rule_stones", "idle", 0.7).filter(call => call.color === "#151923" && call.width === 11).length, 3);
assert.ok(render("rune_fx", "selected").some(call => call.color === "#8E3B46"));
assert.ok(render("rune_fx", "confirm", 0.4).filter(call => call.color === "#F2D2FF").length >= 3);
assert.ok(![...render("altar_body", "disabled"), ...render("rule_stones", "disabled"), ...render("rune_fx", "disabled")].some(call => call.color === "#D16CFF" || call.color === "#F2D2FF"));
console.log(JSON.stringify({ object: "trial_altar", silhouette: "three-spire-seal", states: ["idle", "proximity", "selected", "confirm", "disabled"], confirmLeadInSeconds: 0.45 }));
