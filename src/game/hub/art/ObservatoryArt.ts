import type { WorldObjectDefinition } from "../../world/WorldMap";
import { OBSERVATORY_STRUCTURE, drawObservatoryStructure } from "../structures/ObservatoryStructure";
import { artPartOf, originOf, rect } from "../structures/HubArtPrimitives";
import { defineBuildingArtFromStructure } from "./HubBuildingArt";

export const OBSERVATORY_ART = defineBuildingArtFromStructure(OBSERVATORY_STRUCTURE, {
  visualParts: [
    { id: "shadow", layer: "ground", bounds: { x: 4, y: 130, width: 216, height: 18 }, role: "ground-shadow" },
    { id: "facade", layer: "body", bounds: { x: 4, y: 40, width: 216, height: 108 }, sortY: 140, role: "star-chart-facade" },
    { id: "dome", layer: "roof", bounds: { x: 30, y: 0, width: 164, height: 82 }, sortY: 92, role: "tracking-telescope-dome" },
    { id: "door_pillars", layer: "front", bounds: { x: 80, y: 88, width: 64, height: 58 }, sortY: 144, role: "rune-capped-entry" },
    { id: "astral_console", layer: "sorted", bounds: { x: 76, y: 126, width: 72, height: 62 }, sortY: 188, role: "astral-console" },
    { id: "astral_fx", layer: "fx", bounds: { x: 52, y: -4, width: 122, height: 76 }, role: "orbit-twinkle-fx" },
  ],
  lightSources: [
    { id: "dome-aperture", position: { x: 112, y: 26 }, radius: 36, color: "#72E0E8", intensity: 0.6 },
    { id: "door-glow", position: { x: 112, y: 118 }, radius: 40, color: "#5CCBD7", intensity: 0.5 },
    { id: "console-holo", position: { x: 112, y: 122 }, radius: 30, color: "#B7FAF5", intensity: 0.65 },
  ],
  animationChannels: [
    { id: "telescope-track", period: 9, property: "telescope-barrel" },
    { id: "rune-ring", period: 18, property: "door-rune-ring" },
    { id: "rune-ring-inner", period: 26, phase: 0.5, property: "door-rune-ring-inner" },
    { id: "star-twinkle", period: 2, property: "star-chart-stars" },
    { id: "window-pulse", period: 2.5, phase: 0.3, property: "window-glow" },
    { id: "beacon-blink", period: 3.2, property: "dome-beacon" },
    { id: "console-orbit", period: 6, property: "console-orbit" },
    { id: "holo-scan", period: 2.9, property: "console-scanline" },
    { id: "satellite-drift", period: 14, property: "fx-satellite" },
  ],
});

export function drawObservatoryArt(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
  drawObservatoryStructure(ctx, object, time);
  const part = artPartOf(object);
  const { x, y } = originOf(object);
  const center = x + 112;
  if (part === "dome") {
    // Aperture light bleeding out of the observation slit.
    rect(ctx, "rgba(114,224,232,0.12)", center - 8, y + 10, 16, 6);
  } else if (part === "facade") {
    // Projector wash under each star-chart panel plus a lit step nosing.
    rect(ctx, "rgba(114,224,232,0.10)", center - 48, y + 75, 26, 3);
    rect(ctx, "rgba(114,224,232,0.10)", center + 22, y + 75, 26, 3);
    rect(ctx, "rgba(183,250,245,0.25)", center - 40, y + 137, 80, 1);
  } else if (part === "astral_console") {
    // Holo scanline sweeping the chart frame (2.9s loop).
    const bottom = y + 188;
    const scanY = bottom - 78 + ((time * 9) % 26);
    rect(ctx, "rgba(183,250,245,0.30)", center - 21, scanY, 42, 1);
  }
}
