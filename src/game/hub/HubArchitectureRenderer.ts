import type { WorldObjectDefinition } from "../world/WorldMap";
import { drawArchiveArt } from "./art/ArchiveArt";
import { drawArmoryArt } from "./art/ArmoryArt";
import { drawExpeditionGateArt } from "./art/ExpeditionGateArt";
import { drawObservatoryArt } from "./art/ObservatoryArt";
import { drawRebirthSpringArt } from "./art/RebirthSpringArt";
import { drawTrialAltarArt } from "./art/TrialAltarArt";
import { drawWorkshopArt } from "./art/WorkshopArt";

type StructureDraw = (ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number) => void;

const DRAWERS: Record<string, StructureDraw> = {
  archive: drawArchiveArt,
  observatory: drawObservatoryArt,
  workshop: drawWorkshopArt,
  armory: drawArmoryArt,
  rebirth_spring: drawRebirthSpringArt,
  expedition_gate: drawExpeditionGateArt,
  trial_altar: drawTrialAltarArt,
};

export class HubArchitectureRenderer {
  public static draw(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): boolean {
    if (object.properties?.kind !== "hub_structure_part") return false;
    const artModule = object.properties?.artModule;
    if (typeof artModule !== "string") return false;
    const draw = DRAWERS[artModule];
    if (!draw) return false;
    draw(ctx, object, time);
    return true;
  }
}
