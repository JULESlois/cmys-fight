import { ARCHIVE_STRUCTURE, drawArchiveStructure } from "../structures/ArchiveStructure";
import { defineBuildingArtFromStructure } from "./HubBuildingArt";
export const ARCHIVE_ART = defineBuildingArtFromStructure(ARCHIVE_STRUCTURE);
export const drawArchiveArt = drawArchiveStructure;
