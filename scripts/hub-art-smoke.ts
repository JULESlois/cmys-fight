import assert from "node:assert/strict";
import fs from "node:fs";
import { ARCHIVE_ART } from "../src/game/hub/art/ArchiveArt";
import { ARMORY_ART } from "../src/game/hub/art/ArmoryArt";
import { EXPEDITION_GATE_ART } from "../src/game/hub/art/ExpeditionGateArt";
import { OBSERVATORY_ART } from "../src/game/hub/art/ObservatoryArt";
import { REBIRTH_SPRING_ART } from "../src/game/hub/art/RebirthSpringArt";
import { TRIAL_ALTAR_ART } from "../src/game/hub/art/TrialAltarArt";
import { WORKSHOP_ART } from "../src/game/hub/art/WorkshopArt";
import { HUB_ART_METRICS } from "../src/game/hub/HubArtMetrics";
import { HUB_STRUCTURE_BY_ID } from "../src/game/hub/structures/HubStructures";

const definitions = [
  REBIRTH_SPRING_ART,
  EXPEDITION_GATE_ART,
  TRIAL_ALTAR_ART,
  WORKSHOP_ART,
  ARCHIVE_ART,
  OBSERVATORY_ART,
  ARMORY_ART,
];

for (const art of definitions) {
  assert.ok(art.designBounds.width > 0 && art.designBounds.height > 0, `${art.id} design bounds`);
  assert.ok(art.physicalFootprint.length > 0, `${art.id} physical footprint`);
  assert.ok(art.interactionShells.length > 0, `${art.id} interaction shells`);
  assert.ok(art.visualParts.length > 0, `${art.id} visual parts`);
  assert.ok(art.occlusionParts.length > 0, `${art.id} occlusion parts`);
  const structure = HUB_STRUCTURE_BY_ID.get(art.id);
  assert.ok(structure, `${art.id} remains backed by HubStructureDefinition local coordinates`);
  assert.deepEqual(art.promptAnchor, structure.interactions[0].promptAnchor, `${art.id} prompt anchor shares structure data`);
}

for (const art of [REBIRTH_SPRING_ART, EXPEDITION_GATE_ART, TRIAL_ALTAR_ART]) {
  const layers = new Set(art.visualParts.map(part => part.layer));
  for (const required of ["ground", "body", "front", "fx"] as const) {
    assert.ok(layers.has(required), `${art.id} first-priority redraw has ${required} layer`);
  }
  assert.ok(art.lightSources?.length, `${art.id} has authored lights`);
  assert.ok(art.animationChannels?.length, `${art.id} has animation channels`);
}

for (const key of [
  "characterHeight",
  "normalDoorWidth",
  "majorDoorWidth",
  "floorHeight",
  "stairDepth",
  "foundationDepth",
  "columnWidth",
  "windowSize",
  "outlineThickness",
  "shadowOffset",
  "interactionClearance",
] as const) {
  assert.ok(HUB_ART_METRICS[key] !== undefined, `HubArtMetrics.${key}`);
}

const mapSource = fs.readFileSync("src/game/hub/HubMap.ts", "utf8");
const rendererSource = fs.readFileSync("src/game/hub/HubArchitectureRenderer.ts", "utf8");
const worldRendererSource = fs.readFileSync("src/game/hub/HubWorldRenderer.ts", "utf8");
const engineSource = fs.readFileSync("src/game/Engine.ts", "utf8");
assert.doesNotMatch(mapSource, /decoration\("trial_altar_visual"/);
assert.doesNotMatch(mapSource, /rectCollider\("trial_altar_base"/);
assert.doesNotMatch(worldRendererSource, /drawTrialAltar\(/);
assert.match(rendererSource, /drawRebirthSpringArt/);
assert.match(rendererSource, /drawExpeditionGateArt/);
assert.match(rendererSource, /drawTrialAltarArt/);
assert.match(engineSource, /width:\s*320|320/);
assert.match(engineSource, /height:\s*240|240/);

console.log(JSON.stringify({
  artModules: definitions.map(definition => definition.id),
  metrics: HUB_ART_METRICS,
  firstPriorityRedrawn: ["rebirth_spring", "expedition_gate", "trial_altar_structure"],
  trialLegacyDuplicate: "removed",
  virtualCanvas: "320x240-preserved",
}));
