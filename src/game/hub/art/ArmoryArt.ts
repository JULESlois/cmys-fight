import { ARMORY_STRUCTURE, drawArmoryStructure } from "../structures/ArmoryStructure";
import { defineBuildingArtFromStructure } from "./HubBuildingArt";
export const ARMORY_ART = defineBuildingArtFromStructure(ARMORY_STRUCTURE);
export const drawArmoryArt = drawArmoryStructure;
