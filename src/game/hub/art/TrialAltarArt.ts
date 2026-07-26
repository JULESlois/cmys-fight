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
    { id: "hard-mode-core", position: { x: 48, y: 56 }, radius: 44, color: "#E6534C", intensity: 0.72 },
    { id: "challenge-runes", position: { x: 48, y: 74 }, radius: 58, color: "#B77AE8", intensity: 0.45 },
    { id: "candle-west", position: { x: 23, y: 72 }, radius: 14, color: "#FFD36B", intensity: 0.3 },
    { id: "candle-east", position: { x: 73, y: 72 }, radius: 14, color: "#FFD36B", intensity: 0.3 },
  ],
  animationChannels: [
    { id: "hard-pulse", period: 1.4, property: "ember-core-and-crack-glow" },
    { id: "challenge-cycle", period: 2.8, phase: 0.5, property: "rune-ring-chase-and-stele-glow" },
    { id: "candle-flicker", period: 0.375, property: "stele-candle-flames" },
    { id: "gold-glint", period: 3.2, property: "slab-trim" },
    { id: "mote-rise", period: 2.8, property: "rising-rune-motes" },
  ],
});

const TAU = Math.PI * 2;
const CARVE = "rgba(23,19,29,0.5)";
const SEAM = "rgba(20,15,30,0.4)";
const CRACK = "rgba(15,12,20,0.6)";

function fract(value: number): number {
  return value - Math.floor(value);
}

function drawCandle(ctx: CanvasRenderingContext2D, candleX: number, baseY: number, time: number, seed: number): void {
  const frame = Math.floor(time * 8 + seed * 2 + 2) % 3;
  const lean = frame === 2 ? 1 : frame === 1 ? -1 : 0;
  const tall = frame === 1 ? 1 : 0;
  rect(ctx, "rgba(255,211,107,0.15)", candleX - 4, baseY - 13, 10, 11);
  rect(ctx, "#D8CDBE", candleX - 1, baseY - 6, 4, 6);
  rect(ctx, "#B8AC9C", candleX + 2, baseY - 6, 1, 6);
  rect(ctx, "#E8DECE", candleX - 2, baseY - 4, 1, 4);
  rect(ctx, "#E58945", candleX + lean, baseY - 10 - tall, 2, 4 + tall);
  rect(ctx, "#FFD36B", candleX + lean, baseY - 9 - tall, 2, 3);
  rect(ctx, "#FFF3C4", candleX + lean, baseY - 8 - tall, 1, 1);
}

export function drawTrialAltarArt(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
  const { x, y } = originOf(object);
  const part = artPartOf(object);
  const cx = x + 48;
  const pulse = 0.5 + 0.5 * Math.sin(TAU * time / 1.4);

  if (part === "rune_court") {
    rect(ctx, "#2A2138", x - 8, y + 58, 112, 44);
    rect(ctx, "#3B2F4C", x - 6, y + 60, 108, 41);
    rect(ctx, "#54416B", x - 2, y + 63, 100, 36);
    rect(ctx, "#6F5680", x - 2, y + 63, 100, 1);
    rect(ctx, "#2E2440", x - 2, y + 98, 100, 1);
    for (let seam = 8; seam <= 88; seam += 16) rect(ctx, SEAM, x + seam, y + 64, 1, 34);
    rect(ctx, "rgba(20,15,30,0.35)", x - 2, y + 80, 100, 1);
    rect(ctx, "rgba(20,15,30,0.35)", x - 2, y + 90, 100, 1);
    rect(ctx, CRACK, x - 1, y + 86, 5, 1);
    rect(ctx, CRACK, x + 3, y + 87, 4, 1);
    rect(ctx, CRACK, x + 91, y + 70, 5, 1);
    rect(ctx, CRACK, x + 89, y + 69, 3, 1);
    rect(ctx, CRACK, x + 38, y + 100, 7, 1);
    rect(ctx, "rgba(129,116,145,0.14)", x + 2, y + 74, 7, 6);
    rect(ctx, "rgba(129,116,145,0.14)", x + 88, y + 84, 8, 6);
    rect(ctx, "rgba(10,8,18,0.4)", x + 2, y + 66, 92, 26);
    rect(ctx, `rgba(230,83,76,${(0.05 + 0.07 * pulse).toFixed(3)})`, x + 8, y + 92, 80, 10);
    const RUNE_SPOTS: Array<[number, number]> = [
      [-3, 70], [-4, 84], [12, 100], [33, 101], [63, 101], [84, 100], [100, 84], [99, 70],
    ];
    const active = Math.floor(time / 0.35) % 8;
    for (let index = 0; index < 8; index++) {
      const runeX = x + RUNE_SPOTS[index][0];
      const runeY = y + RUNE_SPOTS[index][1];
      rect(ctx, index % 2 === 0 ? "#B276DB" : "#C64D50", runeX - 2, runeY - 1, 5, 2);
      rect(ctx, "#E9B6FF", runeX, runeY - 3, 1, 6);
      const distance = (index - active + 8) % 8;
      if (distance === 0) {
        rect(ctx, "#FFF1FF", runeX - 1, runeY - 1, 3, 2);
        rect(ctx, "rgba(233,182,255,0.3)", runeX - 4, runeY - 5, 9, 9);
      } else if (distance === 1) {
        rect(ctx, "rgba(233,182,255,0.16)", runeX - 3, runeY - 4, 7, 7);
      }
    }
    return;
  }
  if (part === "altar_body") {
    rect(ctx, `rgba(233,77,88,${(0.05 + 0.06 * pulse).toFixed(3)})`, cx - 28, y + 40, 56, 40);
    rect(ctx, "#17131D", cx - 30, y + 42, 60, 42);
    rect(ctx, "#40354A", cx - 26, y + 38, 52, 42);
    for (let flute = -20; flute <= 20; flute += 8) rect(ctx, CARVE, cx + flute, y + 50, 1, 24);
    rect(ctx, "#8E7F9C", cx - 26, y + 40, 1, 8);
    rect(ctx, "#2C2434", cx + 25, y + 40, 1, 38);
    rect(ctx, "#6A5574", cx - 22, y + 34, 44, 12);
    rect(ctx, "#92769D", cx - 18, y + 36, 36, 3);
    rect(ctx, "#4E3F58", cx - 22, y + 44, 44, 2);
    rect(ctx, "#D8B45C", cx - 22, y + 34, 44, 1);
    const glint = fract(time / 3.2);
    if (glint < 0.5) rect(ctx, "#F7EAC0", cx - 22 + Math.round((glint / 0.5) * 41), y + 34, 3, 1);
    rect(ctx, "#92769D", cx - 23, y + 51, 2, 6);
    rect(ctx, "#92769D", cx - 24, y + 53, 4, 2);
    rect(ctx, "#92769D", cx + 21, y + 51, 2, 6);
    rect(ctx, "#92769D", cx + 20, y + 53, 4, 2);
    rect(ctx, "#17131D", cx - 16, y + 45, 32, 27);
    rect(ctx, "#2B202E", cx - 15, y + 46, 30, 25);
    const grow = pulse > 0.6 ? 1 : 0;
    rect(ctx, "#7E2F35", cx - 11, y + 48, 22, 21);
    rect(ctx, "#A83D42", cx - 9 - grow, y + 50 - grow, 18 + grow * 2, 18 + grow);
    rect(ctx, "#E94D58", cx - 6 - grow, y + 52 - grow, 12 + grow * 2, 13 + grow);
    rect(ctx, "#FF7A4A", cx - 4, y + 54, 8, 10);
    const lick = Math.floor(time * 7) % 2;
    rect(ctx, "#FFD37A", cx - 1 - lick, y + 54 - lick, 2 + lick, 8 + lick);
    rect(ctx, "#FFF3C4", cx - 1, y + 60, 2, 3);
    rect(ctx, `rgba(255,122,74,${(0.1 + 0.1 * pulse).toFixed(3)})`, cx - 13, y + 47, 26, 23);
    const crackGlow = `rgba(233,77,88,${(0.25 + 0.3 * pulse).toFixed(3)})`;
    rect(ctx, crackGlow, cx - 20, y + 58, 4, 1);
    rect(ctx, crackGlow, cx - 22, y + 59, 3, 1);
    rect(ctx, crackGlow, cx + 17, y + 62, 4, 1);
    rect(ctx, crackGlow, cx + 19, y + 55, 3, 1);
    return;
  }
  if (part === "rule_stones") {
    const cycle = Math.sin(TAU * time / 2.8);
    for (const side of [-1, 1] as const) {
      const stoneX = cx + side * 38;
      const lit = side < 0 ? cycle > 0 : cycle <= 0;
      rect(ctx, "rgba(0,0,0,0.3)", stoneX - 10, y + 72, 20, 12);
      rect(ctx, "#25212B", stoneX - 8, y + 33, 16, 45);
      rect(ctx, "#514959", stoneX - 6, y + 29, 12, 46);
      rect(ctx, "#807489", stoneX - 4, y + 32, 8, 3);
      rect(ctx, "#6B6175", stoneX - 6, y + 29, 1, 44);
      rect(ctx, "#3A3442", stoneX + 5, y + 30, 1, 44);
      rect(ctx, CARVE, stoneX - 4, y + 37, 8, 1);
      rect(ctx, CARVE, stoneX - 3, y + 66, 6, 1);
      rect(ctx, CRACK, stoneX + (side < 0 ? -5 : 3), y + 55, 1, 6);
      const runeColor = side < 0 ? "#DD635B" : "#B77AE8";
      for (let glyph = 0; glyph < 3; glyph++) {
        const glyphY = y + 40 + glyph * 9;
        rect(ctx, runeColor, stoneX - 1, glyphY, 3, 5);
        rect(ctx, runeColor, glyph % 2 === 0 ? stoneX - 3 : stoneX + 1, glyphY + 2, 2, 1);
      }
      rect(ctx, "#D7C9DF", stoneX - 4, y + 49, 8, 1);
      if (lit) {
        const amount = Math.abs(cycle);
        const glow = side < 0
          ? `rgba(221,99,91,${(0.1 + 0.2 * amount).toFixed(3)})`
          : `rgba(183,122,232,${(0.1 + 0.2 * amount).toFixed(3)})`;
        rect(ctx, glow, stoneX - 7, y + 36, 14, 34);
        if (amount > 0.6) rect(ctx, side < 0 ? "#FFC9C4" : "#E9D3FA", stoneX - 1, y + 49, 3, 5);
      }
      drawCandle(ctx, stoneX - side * 13, y + 76, time, side);
    }
    return;
  }
  if (part === "altar_front") {
    rect(ctx, "#1B1720", cx - 40, y + 72, 80, 24);
    rect(ctx, "#4A3E51", cx - 36, y + 70, 72, 20);
    rect(ctx, "#76627D", cx - 30, y + 72, 60, 3);
    for (const panelX of [-26, 8]) {
      rect(ctx, "#332B3B", cx + panelX, y + 77, 18, 8);
      rect(ctx, CRACK, cx + panelX, y + 77, 18, 1);
      rect(ctx, "#D8B45C", cx + panelX + 8, y + 80, 2, 2);
    }
    rect(ctx, "#2A222F", cx - 22, y + 83, 44, 5);
    rect(ctx, "#584A5F", cx - 22, y + 83, 44, 1);
    rect(ctx, CRACK, cx - 31, y + 76, 1, 8);
    rect(ctx, CRACK, cx + 29, y + 78, 1, 7);
    rect(ctx, `rgba(233,77,88,${(0.05 + 0.07 * pulse).toFixed(3)})`, cx - 20, y + 70, 40, 16);
    return;
  }
  if (part === "rune_fx") {
    const bob = Math.round(Math.sin(TAU * time / 2.8));
    const wide = Math.floor(time / 1.4) % 2 === 0;
    const apexY = y + 4 + bob;
    rect(ctx, "rgba(183,122,232,0.16)", cx - 6, apexY - 2, 13, 13);
    rect(ctx, "rgba(233,182,255,0.25)", cx - 4, apexY, 9, 9);
    if (wide) {
      rect(ctx, "#B77AE8", cx - 4, apexY + 3, 9, 3);
      rect(ctx, "#E9B6FF", cx - 1, apexY + 2, 3, 5);
      rect(ctx, "#FFF1FF", cx, apexY + 4, 1, 1);
    } else {
      rect(ctx, "#B77AE8", cx - 1, apexY, 3, 9);
      rect(ctx, "#E9B6FF", cx - 1, apexY + 3, 3, 3);
      rect(ctx, "#FFF1FF", cx, apexY + 4, 1, 1);
    }
    for (let mote = 0; mote < 3; mote++) {
      const phase = fract(time / 2.8 + mote / 3);
      const moteY = Math.round(y + 60 - phase * 50);
      const fade = phase < 0.15 ? phase / 0.15 : phase > 0.75 ? (1 - phase) / 0.25 : 1;
      const moteX = cx + Math.round(Math.sin(TAU * phase * 1.5 + mote * 2.1) * (7 + mote * 5));
      rect(
        ctx,
        mote % 2 === 0
          ? `rgba(229,95,90,${(0.75 * fade).toFixed(3)})`
          : `rgba(196,128,238,${(0.7 * fade).toFixed(3)})`,
        moteX - 1,
        moteY - 1,
        3,
        3,
      );
      rect(
        ctx,
        mote % 2 === 0
          ? `rgba(255,211,122,${(0.8 * fade).toFixed(3)})`
          : `rgba(233,182,255,${(0.8 * fade).toFixed(3)})`,
        moteX,
        moteY,
        1,
        1,
      );
    }
  }
}
