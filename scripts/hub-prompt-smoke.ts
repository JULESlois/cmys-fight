import assert from "node:assert/strict";
import fs from "node:fs";
import { HUB_MAP } from "../src/game/hub/HubMap";
import {
  HUB_PROMPT_SCREEN_BOUNDS,
  clampHubPromptPosition,
  isHubPromptAnchorNearViewport,
} from "../src/game/hub/HubPromptLayout";
import { closestPointOnFootprints } from "../src/game/world/SpatialSemantics";
import { WorldInteraction } from "../src/game/world/WorldInteraction";
import type { WorldInteractionZone, WorldObjectDefinition, WorldPoint } from "../src/game/world/WorldMap";

const requiredPromptIds = [
  "rebirth_spring",
  "expedition_gate",
  "blacksmith_forge",
  "enchanting_table",
  "reforge_hotspot",
  "archive_monument",
  "codex_lectern",
  "honor_wall",
  "astral_console",
  "armory_rack",
  "trial_altar",
  "north_waystone_hotspot",
  "south_waystone_hotspot",
  "training_marker_hotspot",
] as const;

const directions = [
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
  { x: Math.SQRT1_2, y: -Math.SQRT1_2 },
  { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
  { x: Math.SQRT1_2, y: Math.SQRT1_2 },
] as const;

function zoneCenter(zone: WorldInteractionZone): WorldPoint {
  return zone.shape === "circle"
    ? { x: zone.x, y: zone.y }
    : { x: zone.x + zone.width / 2, y: zone.y + zone.height / 2 };
}

function zoneProbe(zone: WorldInteractionZone, direction: WorldPoint): WorldPoint {
  if (zone.shape === "circle") {
    const radius = Math.max(1, zone.radius - 4);
    return { x: zone.x + direction.x * radius, y: zone.y + direction.y * radius };
  }
  const center = zoneCenter(zone);
  return {
    x: center.x + direction.x * Math.max(1, zone.width / 2 - 3),
    y: center.y + direction.y * Math.max(1, zone.height / 2 - 3),
  };
}

let directionalChecks = 0;
const anchors: Record<string, WorldPoint> = {};
for (const id of requiredPromptIds) {
  const object = HUB_MAP.objects.find(candidate => candidate.id === id);
  assert.ok(object?.interaction, `${id} has an interaction definition`);
  const prompt = object.interaction.promptPoint;
  assert.ok(prompt, `${id} has authored promptAnchor/promptPoint`);
  assert.equal(object.properties?.promptAnchorX, prompt.x, `${id} materialized promptAnchorX`);
  assert.equal(object.properties?.promptAnchorY, prompt.y, `${id} materialized promptAnchorY`);
  anchors[id] = { ...prompt };

  const isolated: WorldObjectDefinition = {
    ...object,
    interaction: {
      ...object.interaction,
      side: undefined,
      facing: undefined,
      requireLineOfSight: false,
    },
  };

  for (const direction of directions) {
    let probe: WorldPoint;
    if (isolated.interactionShell && isolated.physicalFootprint?.length) {
      const edge = closestPointOnFootprints(
        isolated.physicalFootprint,
        prompt.x + direction.x * 240,
        prompt.y + direction.y * 240,
      );
      assert.ok(edge, `${id} footprint edge exists`);
      probe = { x: edge.x + direction.x * 18, y: edge.y + direction.y * 18 };
    } else {
      probe = zoneProbe(isolated.interaction!.zone, direction);
    }
    const target = new WorldInteraction().findNearest(probe.x, probe.y, [isolated], 80);
    assert.equal(target?.object.id, id, `${id} resolves from ${direction.x},${direction.y}`);
    assert.deepEqual(
      target && { x: target.x, y: target.y },
      prompt,
      `${id} prompt remains fixed from ${direction.x},${direction.y}`,
    );
    directionalChecks++;
  }
}

assert.deepEqual(clampHubPromptPosition({ x: -300, y: -200 }), {
  x: HUB_PROMPT_SCREEN_BOUNDS.left,
  y: HUB_PROMPT_SCREEN_BOUNDS.top,
});
assert.deepEqual(clampHubPromptPosition({ x: 700, y: 500 }), {
  x: HUB_PROMPT_SCREEN_BOUNDS.right,
  y: HUB_PROMPT_SCREEN_BOUNDS.bottom,
});
assert.deepEqual(clampHubPromptPosition({ x: 160, y: 120 }), { x: 160, y: 120 });
assert.equal(isHubPromptAnchorNearViewport({ x: -48, y: 120 }), true);
assert.equal(isHubPromptAnchorNearViewport({ x: -49, y: 120 }), false);
assert.equal(isHubPromptAnchorNearViewport({ x: 368, y: 120 }), true);
assert.equal(isHubPromptAnchorNearViewport({ x: 369, y: 120 }), false);

const worldInteractionSource = fs.readFileSync("src/game/world/WorldInteraction.ts", "utf8");
const hubStateSource = fs.readFileSync("src/game/states/HubState.ts", "utf8");
assert.match(worldInteractionSource, /const prompt = interaction\.promptPoint \?\? zoneCenter/);
assert.doesNotMatch(worldInteractionSource, /const prompt = shellPoint \?\?/);
assert.match(hubStateSource, /clampHubPromptPosition/);
assert.match(hubStateSource, /isHubPromptAnchorNearViewport/);
assert.match(hubStateSource, /if \(this\.mode === "world"\) this\.drawWorldOverlay/);

console.log(JSON.stringify({
  promptAnchors: anchors,
  directionalChecks,
  screenClamp: HUB_PROMPT_SCREEN_BOUNDS,
  detectionVsDisplay: "nearest-footprint-detection-authored-anchor-rendering",
}));
