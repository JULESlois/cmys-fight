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
import { moveSweptCircle } from "../src/game/physics/SweptCircleMovement";

function sceneCollision(scene: Parameters<typeof createRoomObjectColliders>[0]): RoomObjectCollision {
  const collision = new RoomObjectCollision();
  collision.rebuild(scene);
  return collision;
}

const directions = [
  [0, -1], [0, 1], [-1, 0], [1, 0],
  [-Math.SQRT1_2, -Math.SQRT1_2], [Math.SQRT1_2, -Math.SQRT1_2],
  [-Math.SQRT1_2, Math.SQRT1_2], [Math.SQRT1_2, Math.SQRT1_2],
] as const;
const dts = [1 / 60, 1 / 30, 0.1] as const;
let directionalTrajectoryChecks = 0;

function testColliderTrajectories(collider: RoomObjectCollider): void {
  const isolated = new RoomObjectCollision();
  isolated.setColliders([collider]);
  const center = collider.shape === "circle"
    ? { x: collider.x, y: collider.y }
    : { x: collider.x + (collider.width ?? 0) / 2, y: collider.y + (collider.height ?? 0) / 2 };
  const extent = collider.shape === "circle"
    ? (collider.radius ?? 0) * 2
    : Math.max(collider.width ?? 0, collider.height ?? 0);
  for (const dt of dts) {
    for (const [directionX, directionY] of directions) {
      let actor = { x: center.x + directionX * (extent + 42), y: center.y + directionY * (extent + 42) };
      for (let step = 0; step < 200; step++) {
        const dx = center.x - actor.x;
        const dy = center.y - actor.y;
        const distance = Math.hypot(dx, dy) || 1;
        const moved = moveSweptCircle({
          ...actor,
          radius: 6,
          deltaX: dx / distance * 100 * dt,
          deltaY: dy / distance * 100 * dt,
          isBlocked: (x, y, radius) => isolated.isCircleBlocked(x, y, radius, "player"),
        });
        actor = { x: moved.x, y: moved.y };
      }
      assert.equal(isolated.isCircleBlocked(actor.x, actor.y, 6, "player"), false, `${collider.id} entered footprint`);
      const closest = isolated.closestPoint(actor.x, actor.y, [collider.id]);
      assert.ok(closest && Math.abs(closest.distance - 6) <= 1.01, `${collider.id} stop distance at dt=${dt}`);
      directionalTrajectoryChecks++;
    }
  }

  const dashStart = { x: center.x - extent - 48, y: center.y };
  const dash = moveSweptCircle({
    ...dashStart,
    radius: 6,
    deltaX: extent * 2 + 96,
    deltaY: 0,
    isBlocked: (x, y, radius) => isolated.isCircleBlocked(x, y, radius, "player"),
  });
  assert.equal(isolated.isCircleBlocked(dash.x, dash.y, 6, "player"), false, `${collider.id} dash cannot tunnel`);
  assert.ok(dash.x < center.x, `${collider.id} dash stops before footprint`);
}

const closedChest = sceneCollision({ chest: { kind: "treasure", x: 160, y: 120, opened: false } });
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

const trajectoryScenes = [
  sceneCollision({ chest: { kind: "treasure", x: 160, y: 120, opened: false } }),
  sceneCollision({ chest: { kind: "treasure", x: 160, y: 120, opened: true } }),
  sceneCollision({ chest: { kind: "boss", x: 160, y: 120, opened: true } }),
  wish,
  broadcast,
  photo,
  legacy,
  shop,
  portal,
];
for (const scene of trajectoryScenes) {
  for (const collider of scene.getColliders()) testColliderTrajectories(collider);
}

function assertInteractionFromAllDirections(
  collision: RoomObjectCollision,
  prefix: string,
  center: { x: number; y: number },
  range = 30,
): void {
  const ids = collision.idsMatching(prefix);
  assert.ok(ids.length > 0, `${prefix} interaction colliders`);
  for (const [dx, dy] of directions) {
    const edge = collision.closestPoint(center.x + dx * 200, center.y + dy * 200, ids);
    assert.ok(edge, `${prefix} closest edge`);
    const playerX = edge.x + dx * 18;
    const playerY = edge.y + dy * 18;
    assert.ok(
      collision.resolveInteractionShell(playerX, playerY, prefix, range),
      `${prefix} interaction from direction ${dx},${dy}`,
    );
  }
}

assertInteractionFromAllDirections(closedChest, "treasure_chest", { x: 160, y: 120 }, 28);
assertInteractionFromAllDirections(wish, "wish_fountain:", { x: 160, y: 120 });
assertInteractionFromAllDirections(broadcast, "broadcast_terminal", { x: 160, y: 120 }, 28);
assertInteractionFromAllDirections(photo, "photo_booth", { x: 160, y: 120 }, 28);
assertInteractionFromAllDirections(legacy, "legacy_device", { x: 160, y: 120 }, 28);
assertInteractionFromAllDirections(portal, "portal:", { x: 160, y: 120 });

assert.equal(shop.resolveInteractionShell(160, 90, "shop_counter", 30, true), null, "shop remains south-facing");
assert.ok(shop.resolveInteractionShell(160, 165, "shop_counter", 30, true), "shop interacts from the customer side");

const wallSeparated = new RoomObjectCollision();
wallSeparated.setColliders([
  ...broadcast.getColliders(),
  {
    id: "external_wall",
    shape: "rect",
    x: 130,
    y: 150,
    width: 60,
    height: 5,
    blocksPlayer: true,
    blocksEnemy: true,
    blocksProjectile: true,
  },
]);
assert.equal(
  wallSeparated.resolveInteractionShell(160, 170, "broadcast_terminal", 40),
  null,
  "external wall prevents facility interaction",
);

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
losCollision.setColliders([{
  id: "facility-self",
  shape: "rect",
  x: 146,
  y: 130,
  width: 28,
  height: 11,
  blocksPlayer: true,
  blocksEnemy: true,
  blocksProjectile: true,
}]);
assert.equal(
  losCollision.hasLineOfSight(160, 160, 160, 134, "projectile", 2, ["facility-self"]),
  true,
  "facility own collider is ignored by proximity interaction LOS",
);

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
assert.match(dungeonState, /canInteractWithFootprint/);
assert.match(dungeonState, /interface DepthRenderable/);
assert.match(dungeonState, /depthRenderables\.sort/);
assert.match(dungeonState, /drawRitualSpringPart/);
assert.match(dungeonState, /drawPortalPart/);
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
  directionalTrajectoryChecks,
  movement: "normal-and-dash-swept-eight-direction",
  interactionShells: "all-direction-self-ignore-external-wall-blocked-shop-south",
  depthSorting: "player-enemy-pickup-facility-contact-y",
  waterThemes: {
    forest: RITUAL_SPRING_WATER.forest.body,
    dungeon: RITUAL_SPRING_WATER.dungeon.body,
    snow: RITUAL_SPRING_WATER.snow.body,
    lava: RITUAL_SPRING_WATER.lava.body,
  },
}));
