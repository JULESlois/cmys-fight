import type { WorldObjectDefinition } from "../world/WorldMap";
import { drawArchiveStructure } from "./structures/ArchiveStructure";
import { drawArmoryStructure } from "./structures/ArmoryStructure";
import { drawExpeditionGateStructure } from "./structures/ExpeditionGateStructure";
import { drawObservatoryStructure } from "./structures/ObservatoryStructure";
import { drawRebirthSpringStructure } from "./structures/RebirthSpringStructure";
import { drawWorkshopStructure } from "./structures/WorkshopStructure";

type StructureDraw = (ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number) => void;

const DRAWERS: Record<string, StructureDraw> = {
  archive: drawArchiveStructure,
  observatory: drawObservatoryStructure,
  workshop: drawWorkshopStructure,
  armory: drawArmoryStructure,
  rebirth_spring: drawRebirthSpringStructure,
  expedition_gate: drawExpeditionGateStructure,
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
