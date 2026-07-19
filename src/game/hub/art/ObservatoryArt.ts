import { OBSERVATORY_STRUCTURE, drawObservatoryStructure } from "../structures/ObservatoryStructure";
import { defineBuildingArtFromStructure } from "./HubBuildingArt";
export const OBSERVATORY_ART = defineBuildingArtFromStructure(OBSERVATORY_STRUCTURE);
export const drawObservatoryArt = drawObservatoryStructure;
