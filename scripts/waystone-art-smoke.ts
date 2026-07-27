import assert from "node:assert/strict";
import fs from "node:fs";

const mapSource = fs.readFileSync("src/game/hub/HubMap.ts", "utf8");
const rendererSource = fs.readFileSync("src/game/hub/HubWorldRenderer.ts", "utf8");

assert.match(mapSource, /north_waystone[\s\S]*direction:\s*"north"/);
assert.match(mapSource, /south_waystone[\s\S]*direction:\s*"south"/);
assert.match(rendererSource, /interactionState/);
assert.match(rendererSource, /state === "proximity"/);
assert.match(rendererSource, /state === "confirm"/);
assert.match(rendererSource, /state === "disabled"/);
assert.match(rendererSource, /ringExpansion = 1 \+ proximity \* 0\.25/);
assert.match(rendererSource, /directionSign = direction === "north" \? -1 : 1/);
assert.match(rendererSource, /Math\.sin\(time \* 4\.1/);
assert.doesNotMatch(rendererSource, /drawWaystone[\s\S]*Math\.random\(/);
assert.match(mapSource, /north_waystone_hotspot[\s\S]*radius:\s*34/);
assert.match(mapSource, /south_waystone_hotspot[\s\S]*radius:\s*34/);

console.log(JSON.stringify({
  object: "waystone",
  footprint: "48x64",
  directions: ["north", "south"],
  states: ["idle", "proximity", "confirm", "disabled"],
  deterministicAnimation: true,
  interactionRadius: 34,
}));
