import type { WorldObjectDefinition } from "../../world/WorldMap";
import { TRIAL_ALTAR_STRUCTURE } from "../structures/TrialAltarStructure";
import { artPartOf, originOf, rect } from "../structures/HubArtPrimitives";
import { defineBuildingArtFromStructure } from "./HubBuildingArt";

export const TRIAL_ALTAR_ART = defineBuildingArtFromStructure(TRIAL_ALTAR_STRUCTURE, {
  visualParts: [
    { id: "rune_court", layer: "ground", bounds: { x: -8, y: 46, width: 112, height: 58 }, role: "hard-mode-rune-court" },
    { id: "altar_body", layer: "body", bounds: { x: 15, y: 20, width: 66, height: 76 }, sortY: 92, role: "central-altar" },
    { id: "rule_stones", layer: "sorted", bounds: { x: -4, y: 20, width: 104, height: 76 }, sortY: 96, role: "rule-stelae" },
    { id: "altar_front", layer: "front", bounds: { x: 8, y: 65, width: 80, height: 32 }, sortY: 96, role: "altar-front" },
    { id: "rune_fx", layer: "fx", bounds: { x: 8, y: -20, width: 80, height: 92 }, role: "challenge-runes" },
  ],
  lightSources: [
    { id: "hard-mode-core", position: { x: 48, y: 44 }, radius: 42, color: "#E6534C", intensity: 0.72 },
    { id: "challenge-runes", position: { x: 48, y: 72 }, radius: 58, color: "#B77AE8", intensity: 0.45 },
  ],
  animationChannels: [
    { id: "hard-pulse", period: 1.4, property: "core-pulse" },
    { id: "challenge-cycle", period: 2.8, phase: 0.5, property: "rune-ring" },
  ],
});

export function drawTrialAltarArt(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
  const { x, y } = originOf(object);
  const part = artPartOf(object);
  const cx = x + 48;
  const phase = Math.floor(time * 6) % 4;

  if (part === "rune_court") {
    rect(ctx, "rgba(10,8,18,0.46)", x - 8, y + 66, 112, 24);
    rect(ctx, "#352A43", x, y + 58, 96, 32);
    rect(ctx, "#594267", x + 5, y + 63, 86, 22);
    for (let index = 0; index < 8; index++) {
      const angle = index * Math.PI / 4;
      const runeX = Math.round(cx + Math.cos(angle) * 35);
      const runeY = Math.round(y + 74 + Math.sin(angle) * 12);
      rect(ctx, index % 2 === 0 ? "#B276DB" : "#C64D50", runeX - 2, runeY - 1, 5, 2);
      rect(ctx, "#E9B6FF", runeX, runeY - 3, 1, 6);
    }
    return;
  }
  if (part === "altar_body") {
    rect(ctx, "#17131D", cx - 30, y + 42, 60, 42);
    rect(ctx, "#40354A", cx - 26, y + 38, 52, 42);
    rect(ctx, "#6A5574", cx - 22, y + 34, 44, 12);
    rect(ctx, "#92769D", cx - 18, y + 36, 36, 3);
    rect(ctx, "#2B202E", cx - 15, y + 46, 30, 25);
    rect(ctx, "#A83D42", cx - 10, y + 48, 20, 20);
    rect(ctx, phase < 2 ? "#FF7A4A" : "#E94D58", cx - 5, y + 52, 10, 12);
    rect(ctx, "#FFD37A", cx - 1, y + 54 - (phase % 2), 2, 8);
    return;
  }
  if (part === "rule_stones") {
    for (const side of [-1, 1] as const) {
      const stoneX = cx + side * 38;
      rect(ctx, "rgba(0,0,0,0.3)", stoneX - 10, y + 72, 20, 12);
      rect(ctx, "#25212B", stoneX - 8, y + 33, 16, 45);
      rect(ctx, "#514959", stoneX - 6, y + 29, 12, 46);
      rect(ctx, "#807489", stoneX - 4, y + 32, 8, 3);
      rect(ctx, side < 0 ? "#DD635B" : "#B77AE8", stoneX - 1, y + 41, 3, 22);
      rect(ctx, "#D7C9DF", stoneX - 4, y + 49, 8, 2);
    }
    return;
  }
  if (part === "altar_front") {
    rect(ctx, "#1B1720", cx - 40, y + 72, 80, 24);
    rect(ctx, "#4A3E51", cx - 36, y + 70, 72, 20);
    rect(ctx, "#76627D", cx - 30, y + 72, 60, 3);
    rect(ctx, "#2A222F", cx - 22, y + 83, 44, 5);
    return;
  }
  if (part === "rune_fx") {
    rect(ctx, "rgba(229,95,90,0.75)", cx - 1, y + 19 - phase, 3, 9);
    rect(ctx, "rgba(196,128,238,0.7)", cx - 14 - phase, y + 27, 4, 4);
    rect(ctx, "rgba(196,128,238,0.7)", cx + 11 + phase, y + 22, 4, 4);
  }
}
