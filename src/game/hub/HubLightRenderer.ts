import type { WorldMapDefinition } from "../world/WorldMap";
import type { HubBuildingLightSource } from "./art/HubBuildingArt";
import { ARMORY_ART } from "./art/ArmoryArt";
import { ARCHIVE_ART } from "./art/ArchiveArt";
import { EXPEDITION_GATE_ART } from "./art/ExpeditionGateArt";
import { OBSERVATORY_ART } from "./art/ObservatoryArt";
import { REBIRTH_SPRING_ART } from "./art/RebirthSpringArt";
import { TRIAL_ALTAR_ART } from "./art/TrialAltarArt";
import { WORKSHOP_ART } from "./art/WorkshopArt";

/** World-space light with a deterministic flicker phase. */
export interface WorldLight {
  x: number;
  y: number;
  radius: number;
  color: string;
  intensity: number;
  phase: number;
}

/**
 * Each building art module already declares lightSources in local coordinates
 * (relative to the structure origin). This registry is the single place that
 * maps an artModule id to its light list so the world pass can consume them.
 */
const ART_LIGHTS: Record<string, HubBuildingLightSource[]> = {
  archive: ARCHIVE_ART.lightSources ?? [],
  observatory: OBSERVATORY_ART.lightSources ?? [],
  workshop: WORKSHOP_ART.lightSources ?? [],
  armory: ARMORY_ART.lightSources ?? [],
  rebirth_spring: REBIRTH_SPRING_ART.lightSources ?? [],
  expedition_gate: EXPEDITION_GATE_ART.lightSources ?? [],
  trial_altar: TRIAL_ALTAR_ART.lightSources ?? [],
};

function hashPhase(x: number, y: number, id: string): number {
  let value = 0;
  for (let i = 0; i < id.length; i++) value = (value * 31 + id.charCodeAt(i)) >>> 0;
  value = (value ^ (Math.round(x) * 73856093)) ^ (Math.round(y) * 19349663);
  return (value % 628) / 100; // 0..6.28
}

/**
 * Collects the world-space lights for every building in the map. Deduplicates
 * by structure id so a multi-part building registers its lights once.
 */
export function collectBuildingLights(map: WorldMapDefinition): WorldLight[] {
  const lights: WorldLight[] = [];
  const seen = new Set<string>();
  for (const object of map?.objects ?? []) {
    const properties = object?.properties;
    if (!properties || properties.kind !== "hub_structure_part") continue;
    const structureId = properties.structureId;
    const artModule = properties.artModule;
    const originX = properties.originX;
    const originY = properties.originY;
    if (typeof structureId !== "string" || typeof artModule !== "string") continue;
    if (typeof originX !== "number" || typeof originY !== "number") continue;
    if (seen.has(structureId)) continue;
    seen.add(structureId);
    const sources = ART_LIGHTS[artModule];
    if (!sources) continue;
    for (const source of sources) {
      lights.push({
        x: originX + source.position.x,
        y: originY + source.position.y,
        radius: source.radius,
        color: source.color,
        intensity: source.intensity ?? 0.5,
        phase: hashPhase(originX, originY, source.id),
      });
    }
  }
  return lights;
}

/**
 * Renders building lights as stacked translucent squares (no shadowBlur, so it
 * stays pixel-crisp and cheap). Draw in a camera-transformed world pass.
 */
export function drawHubLights(
  ctx: CanvasRenderingContext2D,
  lights: WorldLight[],
  time: number,
  lowFx = false,
  reducedFlashing = false,
): void {
  if (lights.length === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const light of lights) {
    const flicker = lowFx ? 1 : 0.88 + 0.12 * Math.sin(time * 2.6 + light.phase);
    const base = light.intensity * flicker;
    if (base < 0.04) continue;
    const layers: Array<[number, number]> = lowFx
      ? [[0.28, 0.4]]
      : reducedFlashing
        ? [[1, 0.14], [0.6, 0.22]]
        : [[1, 0.12], [0.6, 0.2], [0.32, 0.34]];
    for (const [scale, alpha] of layers) {
      const size = Math.round(light.radius * scale);
      if (size < 1) continue;
      ctx.globalAlpha = Math.min(0.6, base * alpha);
      ctx.fillStyle = light.color;
      ctx.fillRect(Math.round(light.x - size / 2), Math.round(light.y - size / 2), size, size);
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** Test hook: how many ART modules declared lights. */
export function getRegisteredLightCount(): number {
  return Object.keys(ART_LIGHTS).length;
}
