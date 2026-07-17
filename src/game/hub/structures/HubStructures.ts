import { materializeHubStructure, type HubStructureDefinition, type MaterializedHubStructure } from "../HubStructure";
import { ARCHIVE_STRUCTURE } from "./ArchiveStructure";
import { ARMORY_STRUCTURE } from "./ArmoryStructure";
import { EXPEDITION_GATE_STRUCTURE } from "./ExpeditionGateStructure";
import { OBSERVATORY_STRUCTURE } from "./ObservatoryStructure";
import { REBIRTH_SPRING_STRUCTURE } from "./RebirthSpringStructure";
import { WORKSHOP_STRUCTURE } from "./WorkshopStructure";

export const HUB_STRUCTURE_DEFINITIONS: readonly HubStructureDefinition[] = [
  REBIRTH_SPRING_STRUCTURE,
  ARCHIVE_STRUCTURE,
  OBSERVATORY_STRUCTURE,
  WORKSHOP_STRUCTURE,
  ARMORY_STRUCTURE,
  EXPEDITION_GATE_STRUCTURE,
] as const;

export const HUB_STRUCTURES: readonly MaterializedHubStructure[] = HUB_STRUCTURE_DEFINITIONS.map(materializeHubStructure);

export const HUB_STRUCTURE_BY_ID = new Map(HUB_STRUCTURE_DEFINITIONS.map(definition => [definition.id, definition]));
export const HUB_MATERIALIZED_STRUCTURE_BY_ID = new Map(HUB_STRUCTURES.map(structure => [structure.definition.id, structure]));
