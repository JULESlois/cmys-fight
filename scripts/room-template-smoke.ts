import assert from "node:assert/strict";
import { getMapData, MAP_HEIGHT, MAP_WIDTH, validateRoomLayout } from "../src/game/MapData";
import { ALL_ROOM_TEMPLATE_IDS, ROOM_TEMPLATES } from "../src/game/data/roomTemplates";
import type { Room } from "../src/game/FloorGenerator";

assert.equal(MAP_WIDTH, 20);
assert.equal(MAP_HEIGHT, 15);
const authoredResults = ROOM_TEMPLATES.map(template => {
  assert.equal(template.tiles.length, 300, `${template.id} remains 20x15`);
  const result = validateRoomLayout(template, template.tiles);
  assert.equal(result.valid, true, `${template.id}: ${JSON.stringify(result)}`);
  assert.ok(result.largestInternalWallComponent <= 16);
  assert.ok(!(result.largestSolidRectangle.width > 3 && result.largestSolidRectangle.height > 3));
  assert.equal(result.centralWalkableTiles, 12 * 8);
  assert.equal(result.centerWallFree, true);
  assert.equal(result.doorsReachCenter, true);
  assert.equal(result.facilityClearance, true);
  return result;
});

const themes = ["forest", "dungeon", "snow", "lava"] as const;
let finalMapsChecked = 0;
for (const template of ROOM_TEMPLATES) {
  for (const roomType of template.allowedRoomTypes) {
    for (const theme of themes) {
      const mask = template.doorMask === "any"
        ? { up: true, down: true, left: true, right: true }
        : template.doorMask;
      const room: Room = {
        id: `${template.id}:${roomType}:${theme}`,
        x: 0,
        y: 0,
        type: roomType,
        cleared: false,
        templateId: template.id,
        doors: { ...mask },
        encounterSeed: 314159,
        enemies: [],
      };
      const data = getMapData(room, theme);
      const result = validateRoomLayout(template, data, roomType);
      assert.equal(result.valid, true, `${template.id}/${roomType}/${theme}: ${JSON.stringify(result)}`);
      finalMapsChecked++;
    }
  }
}

console.log(JSON.stringify({
  roomSize: "20x15",
  templates: [...ALL_ROOM_TEMPLATE_IDS],
  authoredValidations: authoredResults,
  finalMapsChecked,
}));
