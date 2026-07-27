import type { WorldObjectDefinition } from "../../world/WorldMap";
import { TRIAL_ALTAR_STRUCTURE } from "../structures/TrialAltarStructure";
import { artPartOf, originOf, rect } from "../structures/HubArtPrimitives";
import { defineBuildingArtFromStructure } from "./HubBuildingArt";

export const TRIAL_ALTAR_ART = defineBuildingArtFromStructure(TRIAL_ALTAR_STRUCTURE, {
  visualParts: [
    { id: "rune_court", layer: "ground", bounds: { x: -8, y: 46, width: 112, height: 58 }, role: "broken-seal-court" },
    { id: "altar_body", layer: "body", bounds: { x: 15, y: 20, width: 66, height: 76 }, sortY: 92, role: "three-spire-seal" },
    { id: "rule_stones", layer: "sorted", bounds: { x: -4, y: 20, width: 104, height: 76 }, sortY: 96, role: "seal-nodes" },
    { id: "altar_front", layer: "front", bounds: { x: 8, y: 65, width: 80, height: 32 }, sortY: 96, role: "broken-ring-front" },
    { id: "rune_fx", layer: "fx", bounds: { x: 8, y: -20, width: 80, height: 92 }, role: "judgement-core" },
  ],
  lightSources: [
    { id: "judgement-core", position: { x: 48, y: 51 }, radius: 38, color: "#D16CFF", intensity: 0.58 },
    { id: "seal-nodes", position: { x: 48, y: 73 }, radius: 52, color: "#6D2DB2", intensity: 0.35 },
  ],
  animationChannels: [
    { id: "core-pulse", period: 2.4, property: "judgement-core-scale" },
    { id: "node-sequence", period: 2.7, phase: 0.4, property: "three-seal-node-breath" },
    { id: "broken-ring", period: 12, property: "discrete-incomplete-ring-rotation" },
    { id: "confirm-lock", period: 0.45, property: "seal-node-lock-and-core-compress" },
  ],
});

export type TrialAltarVisualState = "idle" | "proximity" | "selected" | "confirm" | "disabled";
const TAU = Math.PI * 2;
const PALETTE = { stoneDark: "#151923", metal: "#353B4A", seal: "#6D2DB2", crystal: "#D16CFF", highlight: "#F2D2FF", danger: "#8E3B46" } as const;
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

function visualStateOf(object: WorldObjectDefinition): TrialAltarVisualState {
  const state = object.properties?.trialVisualState;
  return state === "proximity" || state === "selected" || state === "confirm" || state === "disabled" ? state : "idle";
}

function drawSealNode(ctx: CanvasRenderingContext2D, x: number, y: number, strength: number, state: TrialAltarVisualState): void {
  const disabled = state === "disabled";
  rect(ctx, PALETTE.stoneDark, x - 5, y - 5, 11, 11);
  rect(ctx, PALETTE.metal, x - 3, y - 3, 7, 7);
  rect(ctx, disabled ? "#514B5C" : PALETTE.seal, x - 2, y - 2, 5, 5);
  if (!disabled && strength > 0.45) rect(ctx, PALETTE.crystal, x - 1, y - 1, 3, 3);
  if (!disabled && strength > 0.78) rect(ctx, PALETTE.highlight, x, y, 1, 1);
}

function drawBrokenRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number, state: TrialAltarVisualState): void {
  const step = Math.floor((time % 12) / 3) % 4;
  const segments = [[-28,-1,14,3],[14,-1,14,3],[-20,-9,12,3],[8,-9,12,3],[-20,7,12,3],[8,7,12,3]] as const;
  for (let index = 0; index < segments.length; index++) {
    if ((index + step) % 7 === 0) continue;
    const [ox, oy, width, height] = segments[index];
    rect(ctx, state === "disabled" ? "#262A34" : PALETTE.metal, cx + ox, cy + oy, width, height);
    if (state !== "disabled" && state !== "idle" && (index + step) % 3 === 0) rect(ctx, PALETTE.seal, cx + ox + 2, cy + oy + 1, Math.max(2, width - 4), 1);
  }
}

export function drawTrialAltarArt(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
  const { x, y } = originOf(object);
  const part = artPartOf(object);
  const cx = x + 48;
  const state = visualStateOf(object);
  const disabled = state === "disabled";
  const proximity = clamp01(Number(object.properties?.proximity ?? (state === "proximity" ? 1 : 0)));
  const pulse = 0.5 + 0.5 * Math.sin(TAU * time / 2.4);
  const stateBoost = state === "selected" ? 0.2 : state === "confirm" ? 0.38 : proximity * 0.18;

  if (part === "rune_court") {
    rect(ctx, "rgba(5,7,12,0.45)", x - 6, y + 66, 108, 34);
    rect(ctx, PALETTE.stoneDark, x - 8, y + 61, 112, 38);
    rect(ctx, "#242A36", x - 4, y + 64, 104, 32);
    rect(ctx, PALETTE.metal, x + 2, y + 68, 92, 1);
    drawBrokenRing(ctx, cx, y + 82, time, state);
    if (!disabled && state !== "idle") {
      rect(ctx, `rgba(109,45,178,${(0.12 + stateBoost).toFixed(3)})`, x + 10, y + 72, 76, 18);
      for (let rune = 0; rune < 5; rune++) rect(ctx, rune / 4 <= proximity || state !== "proximity" ? PALETTE.crystal : "#4A3B59", x + 18 + rune * 15, y + 79, 5, 2);
    }
    return;
  }

  if (part === "altar_body") {
    rect(ctx, "rgba(0,0,0,0.35)", cx - 30, y + 73, 60, 13);
    rect(ctx, PALETTE.stoneDark, cx - 30, y + 48, 60, 37);
    rect(ctx, PALETTE.metal, cx - 25, y + 51, 50, 30);
    rect(ctx, "#202531", cx - 21, y + 54, 42, 23);
    for (const [offset, height] of [[-22,33],[0,42],[22,33]] as const) {
      rect(ctx, PALETTE.stoneDark, cx + offset - 5, y + 48 - height, 11, height + 8);
      rect(ctx, PALETTE.metal, cx + offset - 3, y + 52 - height, 7, height + 2);
      rect(ctx, disabled ? "#4D505A" : PALETTE.seal, cx + offset - 1, y + 55 - height, 3, Math.max(8, height - 9));
      rect(ctx, PALETTE.stoneDark, cx + offset - 2, y + 43 - height, 5, 6);
      rect(ctx, PALETTE.metal, cx + offset, y + 40 - height, 1, 5);
    }
    if (state === "selected" || state === "confirm") rect(ctx, state === "confirm" ? PALETTE.danger : PALETTE.crystal, cx - 18, y + 58, 36, 2);
    return;
  }

  if (part === "rule_stones") {
    const lock = state === "confirm" ? clamp01((time % 0.45) / 0.45) : 0;
    const nodes = [{ x: cx - 34 + Math.round(lock * 10), y: y + 69, phase: 0 }, { x: cx, y: y + 78 - Math.round(lock * 7), phase: 0.33 }, { x: cx + 34 - Math.round(lock * 10), y: y + 69, phase: 0.66 }];
    for (const node of nodes) drawSealNode(ctx, node.x, node.y, disabled ? 0 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(TAU * (time / 2.7 + node.phase))) + stateBoost, state);
    return;
  }

  if (part === "altar_front") {
    rect(ctx, PALETTE.stoneDark, cx - 40, y + 75, 80, 21);
    rect(ctx, PALETTE.metal, cx - 35, y + 76, 70, 16);
    rect(ctx, "#242A36", cx - 30, y + 79, 60, 11);
    rect(ctx, "#10141C", cx - 10, y + 83, 20, 7);
    rect(ctx, disabled ? "#514B5C" : PALETTE.seal, cx - 7, y + 85, 14, 3);
    return;
  }

  if (part === "rune_fx") {
    if (disabled) return;
    const progress = state === "confirm" ? clamp01((time % 0.45) / 0.45) : 0;
    const compression = Math.round(progress * 4);
    const coreY = y + 36 + (state === "confirm" ? 0 : Math.round(Math.sin(TAU * time / 2.4))) + compression;
    const width = state === "confirm" ? Math.max(5, 13 - compression * 2) : 11 + (pulse > 0.72 ? 2 : 0);
    const coreX = Math.round(cx - width / 2);
    rect(ctx, `rgba(209,108,255,${(0.12 + pulse * 0.12 + stateBoost).toFixed(3)})`, coreX - 4, coreY - 4, width + 8, 17 - compression);
    rect(ctx, PALETTE.seal, coreX, coreY, width, 9 - Math.min(4, compression));
    rect(ctx, PALETTE.crystal, coreX + 2, coreY + 2, Math.max(3, width - 4), 5 - Math.min(2, compression));
    rect(ctx, PALETTE.highlight, cx - 1, coreY + 3, 3, 2);
    if (state === "selected") { rect(ctx, PALETTE.danger, cx - 15, y + 50, 6, 1); rect(ctx, PALETTE.danger, cx + 10, y + 50, 6, 1); }
    if (state === "confirm" && progress > 0.72) { rect(ctx, PALETTE.highlight, cx - 18, coreY + 3, 37, 2); rect(ctx, PALETTE.highlight, cx, coreY - 8, 2, 19); }
  }
}
