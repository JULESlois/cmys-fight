import assert from "node:assert/strict";
import fs from "node:fs";
import {
  DUNGEON_RITUAL_SPRING_SCALE,
  PORTAL_FRAME_COLLISION_GEOMETRY,
  RoomObjectCollision,
  createRoomObjectColliders,
  type RoomObjectCollider,
} from "../src/game/dungeon/RoomObjectCollision";
import { RITUAL_SPRING_GEOMETRY, RITUAL_SPRING_WATER } from "../src/game/render/RitualSpringRenderer";
import { getPortalPointIndex, PORTAL_INNER_RING_POINTS, PORTAL_OUTER_RING_POINTS } from "../src/game/render/PortalRenderer";

function sceneCollision(scene: Parameters<typeof createRoomObjectColliders>[0]): RoomObjectCollision {
  const collision = new RoomObjectCollision();
  collision.rebuild(scene);
  return collision;
}

for (const opened of [false, true]) {
  const treasure = sceneCollision({ chest: { kind: "treasure", x: 160, y: 120, opened } });
  for (const channel of ["player", "enemy", "projectile"] as const) {
    assert.equal(treasure.isCircleBlocked(160, 124, 6, channel), true, `treasure ${opened ? "open" : "closed"} blocks ${channel}`);
  }
  const boss = sceneCollision({ chest: { kind: "boss", x: 160, y: 120, opened } });
  assert.equal(boss.isCircleBlocked(160, 124, 6, "player"), true, `boss chest ${opened ? "open" : "closed"} blocks player`);
}

const wish = sceneCollision({ roomType: "wish_fountain", special: { x: 160, y: 120 } });
assert.equal(wish.isCircleBlocked(160, 120, 6, "player"), true, "wish water blocks player");
assert.equal(wish.isCircleBlocked(160, 120, 2, "projectile"), true, "wish water blocks projectiles");
for (const y of [141, 145, 149]) {
  assert.equal(wish.isCircleBlocked(160, y, 6, "player"), false, `wish south stair y=${y} stays open`);
}
const northWestLantern = RITUAL_SPRING_GEOMETRY.lanterns[0];
assert.equal(
  wish.isCircleBlocked(
    160 + northWestLantern.x * DUNGEON_RITUAL_SPRING_SCALE,
    120 + northWestLantern.y * DUNGEON_RITUAL_SPRING_SCALE,
    3,
    "player",
  ),
  true,
  "wish rune lantern has a small footprint",
);

const broadcast = sceneCollision({ roomType: "npc", broadcast: { x: 160, y: 120 } });
assert.equal(broadcast.isCircleBlocked(160, 127, 6, "player"), true);
const photo = sceneCollision({ roomType: "photo_booth", special: { x: 160, y: 120 } });
assert.equal(photo.isCircleBlocked(160, 132, 6, "player"), true);
const legacy = sceneCollision({ roomType: "legacy_rpg", legacy: { x: 160, y: 120 } });
assert.equal(legacy.isCircleBlocked(160, 127, 6, "player"), true);
const shop = sceneCollision({ roomType: "shop", shop: { x: 160, y: 120 } });
assert.equal(shop.isCircleBlocked(160, 132, 6, "player"), true);

const portal = sceneCollision({ roomType: "exit", portal: { x: 160, y: 120 } });
assert.equal(portal.isCircleBlocked(160, 120, 6, "player"), false, "portal energy center is non-physical");
assert.equal(portal.isCircleBlocked(160, 148, 6, "player"), false, "portal front approach remains open");
assert.equal(portal.isCircleBlocked(160 + PORTAL_FRAME_COLLISION_GEOMETRY.leftSupport.x + 4, 132, 4, "player"), true);
assert.equal(portal.isCircleBlocked(160 + PORTAL_FRAME_COLLISION_GEOMETRY.rightSupport.x + 4, 132, 4, "player"), true);
assert.equal(portal.hasLineOfSight(160, 151, 160, 120, "projectile"), true, "portal center can be approached and targeted");

const channelCollision = new RoomObjectCollision();
const playerOnly: RoomObjectCollider = {
  id: "player-only",
  shape: "rect",
  x: 100,
  y: 100,
  width: 20,
  height: 20,
  blocksPlayer: true,
  blocksEnemy: false,
  blocksProjectile: false,
};
channelCollision.setColliders([playerOnly]);
assert.equal(channelCollision.isCircleBlocked(110, 110, 3, "player"), true);
assert.equal(channelCollision.isCircleBlocked(110, 110, 3, "enemy"), false);
assert.equal(channelCollision.isCircleBlocked(110, 110, 3, "projectile"), false);

const losCollision = new RoomObjectCollision();
losCollision.setColliders([{
  id: "facility-wall",
  shape: "rect",
  x: 146,
  y: 139,
  width: 28,
  height: 5,
  blocksPlayer: true,
  blocksEnemy: true,
  blocksProjectile: true,
}]);
assert.equal(losCollision.hasLineOfSight(160, 160, 160, 134), false, "wall behind facility blocks interaction LOS");
losCollision.clear();
assert.equal(losCollision.hasLineOfSight(160, 160, 160, 134), true, "facility-facing target does not self-block LOS");

assert.equal(PORTAL_OUTER_RING_POINTS.length, 16);
assert.equal(PORTAL_INNER_RING_POINTS.length, 12);
assert.equal(getPortalPointIndex(0, 125, -1, 12), 7, "counter-clockwise portal index uses positive modulo");
assert.deepEqual(Object.keys(RITUAL_SPRING_WATER).sort(), ["dungeon", "forest", "hub", "lava", "snow"]);
assert.notEqual(RITUAL_SPRING_WATER.forest.body, RITUAL_SPRING_WATER.dungeon.body);
assert.notEqual(RITUAL_SPRING_WATER.snow.body, RITUAL_SPRING_WATER.lava.body);

const dungeonState = fs.readFileSync("src/game/states/DungeonState.ts", "utf8");
const portalRenderer = fs.readFileSync("src/game/render/PortalRenderer.ts", "utf8");
const specialRenderer = fs.readFileSync("src/game/render/SpecialRoomRenderer.ts", "utf8");
assert.match(dungeonState, /isCircleBlocked\([\s\S]*RoomObjectCollisionChannel/);
assert.match(dungeonState, /this\.roomObjectCollision\.isCircleBlocked/);
assert.match(dungeonState, /"player"/);
assert.match(dungeonState, /"enemy"/);
assert.match(dungeonState, /"projectile"/);
assert.match(dungeonState, /canInteractWith[\s\S]*hasLineOfSight/);
assert.doesNotMatch(portalRenderer, /drawThemeFrame|scan bands|aperture/);
assert.match(portalRenderer, /PORTAL_OUTER_RING_POINTS/);
assert.match(portalRenderer, /PORTAL_INNER_RING_POINTS/);
assert.doesNotMatch(specialRenderer, /drawChapterStage|drawForestStage|drawDungeonStage|drawSnowStage|drawLavaStage/);

console.log(JSON.stringify({
  roomObjectColliders: createRoomObjectColliders({
    roomType: "wish_fountain",
    chest: { kind: "treasure", x: 96, y: 120, opened: true },
    portal: { x: 224, y: 120 },
    special: { x: 160, y: 120 },
  }).map(collider => collider.id),
  chestCollision: "closed-and-open-player-enemy-projectile",
  wishFountain: "water-blocked-south-stairs-open-lanterns-solid",
  facilities: "broadcast-photo-legacy-shop-solid",
  portal: "16-cw-12-ccw-center-open-supports-solid",
  lineOfSight: "wall-blocked-self-collider-clear",
  waterThemes: {
    forest: RITUAL_SPRING_WATER.forest.body,
    dungeon: RITUAL_SPRING_WATER.dungeon.body,
    snow: RITUAL_SPRING_WATER.snow.body,
    lava: RITUAL_SPRING_WATER.lava.body,
  },
}));
