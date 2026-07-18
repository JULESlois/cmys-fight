import type { WorldObjectDefinition } from "../../world/WorldMap";
import type { HubStructureDefinition } from "../HubStructure";
import { artPartOf, originOf } from "./HubArtPrimitives";
import { drawRitualSpringPart, type RitualSpringPart } from "../../render/RitualSpringRenderer";

export const REBIRTH_SPRING_STRUCTURE: HubStructureDefinition = {
  id: "rebirth_spring",
  artModule: "rebirth_spring",
  origin: { x: 576, y: 432 },
  visualBounds: { x: -20, y: -18, width: 184, height: 132 },
  rearAccessRule: "roof-occluder",
  visualParts: [
    { id: "court", artPart: "court", bounds: { x: -20, y: 0, width: 184, height: 100 }, layer: "back" },
    { id: "basin", artPart: "basin", bounds: { x: 4, y: 14, width: 136, height: 84 }, layer: "sorted", sortY: 80, visiblePropId: "rebirth_spring_visual", collisionPolicy: "custom" },
    { id: "soul_motes", artPart: "soul_motes", bounds: { x: 34, y: -18, width: 76, height: 74 }, layer: "upper", collisionPolicy: "none" },
  ],
  occluders: [
    { id: "crystal", artPart: "crystal", bounds: { x: 46, y: 10, width: 52, height: 72 }, sortY: 78 },
    { id: "front_rim", artPart: "front_rim", bounds: { x: 12, y: 66, width: 120, height: 24 }, sortY: 82 },
    { id: "lantern_pylons", artPart: "lantern_pylons", bounds: { x: -12, y: 4, width: 168, height: 94 }, sortY: 96 },
  ],
  colliders: [
    { id: "water_surface", shape: "rect", x: 22, y: 38, width: 100, height: 26, visiblePropId: "rebirth_spring_visual" },
    { id: "rim_north", shape: "rect", x: 22, y: 30, width: 100, height: 8 },
    { id: "rim_west", shape: "rect", x: 12, y: 38, width: 10, height: 36 },
    { id: "rim_east", shape: "rect", x: 122, y: 38, width: 10, height: 36 },
    { id: "rim_south_west", shape: "rect", x: 22, y: 72, width: 42, height: 8 },
    { id: "rim_south_east", shape: "rect", x: 80, y: 72, width: 42, height: 8 },
    { id: "corner_nw", shape: "circle", x: 22, y: 38, radius: 8 },
    { id: "corner_ne", shape: "circle", x: 122, y: 38, radius: 8 },
    { id: "corner_sw", shape: "circle", x: 22, y: 72, radius: 8 },
    { id: "corner_se", shape: "circle", x: 122, y: 72, radius: 8 },
    { id: "lantern_nw", shape: "circle", x: 0, y: 26, radius: 6 },
    { id: "lantern_ne", shape: "circle", x: 144, y: 26, radius: 6 },
    { id: "lantern_sw", shape: "circle", x: -4, y: 76, radius: 6 },
    { id: "lantern_se", shape: "circle", x: 148, y: 76, radius: 6 },
  ],
  interactions: [
    {
      id: "rebirth_spring",
      type: "interactable",
      action: "open_rebirth_spring",
      promptKey: "hub.rebirthSpring",
      visiblePropId: "rebirth_spring_visual",
      interaction: {
        zone: { shape: "rect", x: 44, y: 80, width: 56, height: 44 },
        promptPoint: { x: 72, y: 84 },
        lineOfSightTarget: { x: 72, y: 82 },
        requireLineOfSight: true,
        side: "south",
      },
    },
  ],
  anchors: {
    rebirth_entry: { x: 72, y: 116 },
    rebirth_stair_top: { x: 72, y: 82 },
    rebirth_stair_mid: { x: 72, y: 86 },
    rebirth_stair_bottom: { x: 72, y: 90 },
  },
};

export function drawRebirthSpringStructure(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
  const { x, y } = originOf(object);
  const part = artPartOf(object) as RitualSpringPart;
  drawRitualSpringPart(ctx, part, {
    x: x + 72,
    y: y + 52,
    time,
    theme: "hub",
  });
}
