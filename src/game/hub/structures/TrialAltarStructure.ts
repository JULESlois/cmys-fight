import type { HubStructureDefinition } from "../HubStructure";

export const TRIAL_ALTAR_STRUCTURE: HubStructureDefinition = {
  id: "trial_altar_structure",
  artModule: "trial_altar",
  origin: { x: 1040, y: 736 },
  visualBounds: { x: -8, y: -20, width: 112, height: 120 },
  rearAccessRule: "map-layout",
  visualParts: [
    { id: "rune_court", artPart: "rune_court", bounds: { x: -8, y: 46, width: 112, height: 58 }, layer: "back" },
    { id: "altar_body", artPart: "altar_body", bounds: { x: 15, y: 20, width: 66, height: 76 }, layer: "sorted", sortY: 92, visiblePropId: "trial_altar_visual", collisionPolicy: "custom" },
    { id: "rule_stones", artPart: "rule_stones", bounds: { x: -4, y: 20, width: 104, height: 76 }, layer: "sorted", sortY: 96 },
    { id: "rune_fx", artPart: "rune_fx", bounds: { x: 8, y: -20, width: 80, height: 92 }, layer: "upper", collisionPolicy: "none" },
  ],
  occluders: [
    { id: "altar_front", artPart: "altar_front", bounds: { x: 8, y: 65, width: 80, height: 32 }, sortY: 96 },
  ],
  colliders: [
    { id: "altar_base", shape: "rect", x: 4, y: 72, width: 88, height: 24, visiblePropId: "trial_altar_visual" },
  ],
  interactions: [
    {
      id: "trial_altar",
      type: "interactable",
      action: "open_challenge",
      promptKey: "hub.trialAltar",
      promptAnchor: { x: 48, y: -8 },
      visiblePropId: "trial_altar_visual",
      interaction: {
        zone: { shape: "circle", x: 56, y: 104, radius: 42 },
        lineOfSightTarget: { x: 48, y: 72 },
        requireLineOfSight: true,
      },
    },
  ],
  anchors: {
    trial_entry: { x: 56, y: 120 },
    trial_prompt: { x: 48, y: -8 },
  },
};
