import { WORKSHOP_STRUCTURE, drawWorkshopStructure } from "../structures/WorkshopStructure";
import { defineBuildingArtFromStructure } from "./HubBuildingArt";
export const WORKSHOP_ART = defineBuildingArtFromStructure(WORKSHOP_STRUCTURE);
export const drawWorkshopArt = drawWorkshopStructure;
