import assert from "node:assert/strict";
import { MAP_HEIGHT, MAP_WIDTH, validateOpenRoomTemplate } from "../src/game/MapData";
import { OPEN_LAYOUT_TEMPLATE_IDS, ROOM_TEMPLATES } from "../src/game/data/roomTemplates";

assert.equal(MAP_WIDTH, 20);
assert.equal(MAP_HEIGHT, 15);
const results = OPEN_LAYOUT_TEMPLATE_IDS.map(id => {
  const template = ROOM_TEMPLATES.find(candidate => candidate.id === id);
  assert.ok(template, `missing template ${id}`);
  assert.equal(template.tiles.length, 300, `${id} remains 20x15`);
  const result = validateOpenRoomTemplate(template);
  assert.equal(result.valid, true, `${id}: ${JSON.stringify(result)}`);
  assert.ok(result.largestInternalWallComponent <= 24);
  assert.ok(!(result.largestSolidRectangle.width > 4 && result.largestSolidRectangle.height > 3));
  assert.equal(result.centralWalkableTiles, 12 * 8);
  assert.equal(result.centerWallFree, true);
  assert.equal(result.doorsReachCenter, true);
  assert.equal(result.facilityClearance, true);
  return result;
});

console.log(JSON.stringify({
  roomSize: "20x15",
  rewrittenTemplates: [...OPEN_LAYOUT_TEMPLATE_IDS],
  validations: results,
}));
