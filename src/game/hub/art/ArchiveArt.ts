import type { WorldObjectDefinition } from "../../world/WorldMap";
import { ARCHIVE_STRUCTURE, drawArchiveStructure } from "../structures/ArchiveStructure";
import { artPartOf, originOf, rect } from "../structures/HubArtPrimitives";
import { defineBuildingArtFromStructure } from "./HubBuildingArt";

export const ARCHIVE_ART = defineBuildingArtFromStructure(ARCHIVE_STRUCTURE, {
  visualParts: [
    { id: "shadow", layer: "ground", bounds: { x: -4, y: 126, width: 248, height: 18 }, role: "ground-shadow" },
    { id: "facade", layer: "body", bounds: { x: 0, y: 24, width: 240, height: 120 }, sortY: 140, role: "shelf-lined-facade" },
    { id: "roof", layer: "roof", bounds: { x: -8, y: -10, width: 256, height: 112 }, sortY: 100, role: "spired-roofline" },
    { id: "door_pillars", layer: "front", bounds: { x: 88, y: 86, width: 64, height: 58 }, sortY: 142, role: "candlelit-entry-pillars" },
    { id: "archive_monument", layer: "sorted", bounds: { x: 92, y: 128, width: 56, height: 60 }, sortY: 188, role: "records-monument" },
    { id: "codex_lectern", layer: "sorted", bounds: { x: 56, y: 136, width: 40, height: 52 }, sortY: 188, role: "glowing-codex-lectern" },
    { id: "honor_wall", layer: "sorted", bounds: { x: 148, y: 132, width: 48, height: 56 }, sortY: 188, role: "honor-wall" },
    { id: "study_fx", layer: "fx", bounds: { x: 92, y: 44, width: 56, height: 102 }, role: "light-shaft-dust-motes" },
  ],
  lightSources: [
    { id: "codex-glow", position: { x: 76, y: 138 }, radius: 30, color: "#C9A6FF", intensity: 0.7 },
    { id: "door-candles", position: { x: 120, y: 112 }, radius: 40, color: "#FFD36B", intensity: 0.55 },
    { id: "rose-window", position: { x: 120, y: 56 }, radius: 34, color: "#9B74D5", intensity: 0.45 },
  ],
  animationChannels: [
    { id: "candle-flicker", period: 0.5, property: "candle-flame" },
    { id: "codex-rune", period: 1.6, phase: 0.25, property: "lectern-rune-bob" },
    { id: "sigil-pulse", period: 2, property: "door-sigil" },
    { id: "window-ink", period: 2.5, phase: 0.4, property: "window-glow" },
    { id: "shaft-breathe", period: 7, property: "light-shaft" },
    { id: "dust-fall", period: 17.6, property: "dust-motes" },
  ],
});

export function drawArchiveArt(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
  drawArchiveStructure(ctx, object, time);
  const part = artPartOf(object);
  const { x, y } = originOf(object);
  const center = x + 120;
  if (part === "facade") {
    // Warm candle spill from the doorway onto the entry steps, flickering with the flames.
    const spill = Math.floor(time * 6) % 3 === 0 ? 0.1 : 0.07;
    rect(ctx, `rgba(255,211,107,${spill})`, center - 15, y + 118, 30, 26);
    rect(ctx, "rgba(255,232,170,0.45)", center - 10, y + 141, 20, 1);
  } else if (part === "codex_lectern") {
    // Violet study-glow pooled around the lectern base.
    rect(ctx, "rgba(155,116,213,0.12)", x + 64, y + 148, 24, 26);
  } else if (part === "study_fx") {
    // Twin sparkles catching the shaft near the rose window.
    for (let sparkle = 0; sparkle < 2; sparkle++) {
      if (Math.floor(time * 0.9 + sparkle * 1.6) % 4 !== 0) continue;
      const sparkX = center + (sparkle === 0 ? -13 : 11);
      const sparkY = y + 52 + sparkle * 9;
      rect(ctx, "rgba(233,222,255,0.8)", sparkX, sparkY, 1, 1);
      rect(ctx, "rgba(214,198,246,0.4)", sparkX - 1, sparkY, 3, 1);
      rect(ctx, "rgba(214,198,246,0.4)", sparkX, sparkY - 1, 1, 3);
    }
  }
}
