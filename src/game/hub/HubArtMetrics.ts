export const HUB_ART_METRICS = {
  normalDoorWidth: 28,
  majorDoorWidth: 44,
  normalDoorHeight: 38,
  majorDoorHeight: 48,
  floorHeight: 46,
  foundationDepth: 14,
  propScale: 1,
  majorLandmarkScale: 1.08,
  roofOverhang: 8,
  wallCourseHeight: 12,
} as const;

export interface HubBuildingMetrics {
  width: number;
  height: number;
  floors: number;
  doorWidth: number;
  doorHeight: number;
  foundationDepth: number;
  landmarkScale: number;
}

export const HUB_BUILDING_METRICS: Record<string, HubBuildingMetrics> = {
  archive_keep: {
    width: 240,
    height: 144,
    floors: 2,
    doorWidth: HUB_ART_METRICS.majorDoorWidth,
    doorHeight: HUB_ART_METRICS.majorDoorHeight,
    foundationDepth: HUB_ART_METRICS.foundationDepth,
    landmarkScale: 1.08,
  },
  observatory_keep: {
    width: 224,
    height: 144,
    floors: 2,
    doorWidth: HUB_ART_METRICS.majorDoorWidth,
    doorHeight: HUB_ART_METRICS.majorDoorHeight,
    foundationDepth: HUB_ART_METRICS.foundationDepth,
    landmarkScale: 1.04,
  },
  workshop_keep: {
    width: 256,
    height: 160,
    floors: 2,
    doorWidth: HUB_ART_METRICS.normalDoorWidth,
    doorHeight: HUB_ART_METRICS.normalDoorHeight,
    foundationDepth: HUB_ART_METRICS.foundationDepth,
    landmarkScale: 1,
  },
  armory_keep: {
    width: 240,
    height: 160,
    floors: 2,
    doorWidth: HUB_ART_METRICS.majorDoorWidth,
    doorHeight: HUB_ART_METRICS.majorDoorHeight,
    foundationDepth: HUB_ART_METRICS.foundationDepth,
    landmarkScale: 1.02,
  },
  rebirth_spring: {
    width: 144,
    height: 112,
    floors: 1,
    doorWidth: 40,
    doorHeight: 0,
    foundationDepth: 10,
    landmarkScale: 1,
  },
  expedition_structure: {
    width: 208,
    height: 128,
    floors: 2,
    doorWidth: 76,
    doorHeight: 68,
    foundationDepth: HUB_ART_METRICS.foundationDepth,
    landmarkScale: 1.06,
  },
};
