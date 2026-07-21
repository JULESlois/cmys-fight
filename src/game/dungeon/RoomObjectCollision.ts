import type { RoomType } from "../data/roomTemplates";
import { getChestGeometry } from "./ChestGeometry";
import { RITUAL_SPRING_GEOMETRY } from "../render/RitualSpringRenderer";
import { closestPointOnFootprints } from "../world/SpatialSemantics";
import type { WorldSpatialShape } from "../world/WorldMap";

export type RoomObjectCollisionChannel = "player" | "enemy" | "projectile";

export interface RoomObjectCollider {
  id: string;
  shape: "rect" | "circle";
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  blocksPlayer: boolean;
  blocksEnemy: boolean;
  blocksProjectile: boolean;
}

export interface RoomObjectCollisionScene {
  roomType?: RoomType;
  chest?: { kind: "treasure" | "boss"; x: number; y: number; opened?: boolean } | null;
  portal?: { x: number; y: number } | null;
  shop?: { x: number; y: number } | null;
  broadcast?: { x: number; y: number } | null;
  special?: { x: number; y: number } | null;
  legacy?: { x: number; y: number } | null;
}

export interface RoomObjectInteractionPoint {
  x: number;
  y: number;
  colliderIds: string[];
}

const BLOCKS_ALL = {
  blocksPlayer: true,
  blocksEnemy: true,
  blocksProjectile: true,
} as const;

export const DUNGEON_RITUAL_SPRING_SCALE = 0.7;

// Portal energy is intentionally absent from collision. Only the two short
// supports and fragmented stone base are physical.
export const PORTAL_FRAME_COLLISION_GEOMETRY = {
  leftSupport: { x: -25, y: 4, width: 8, height: 17 },
  rightSupport: { x: 17, y: 4, width: 8, height: 17 },
  baseLeft: { x: -27, y: 17, width: 18, height: 6 },
  baseRight: { x: 9, y: 17, width: 18, height: 6 },
} as const;

function rect(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  channels: Partial<Pick<RoomObjectCollider, "blocksPlayer" | "blocksEnemy" | "blocksProjectile">> = BLOCKS_ALL,
): RoomObjectCollider {
  return {
    id,
    shape: "rect",
    x,
    y,
    width,
    height,
    blocksPlayer: channels.blocksPlayer ?? true,
    blocksEnemy: channels.blocksEnemy ?? true,
    blocksProjectile: channels.blocksProjectile ?? true,
  };
}

function circle(
  id: string,
  x: number,
  y: number,
  radius: number,
  channels: Partial<Pick<RoomObjectCollider, "blocksPlayer" | "blocksEnemy" | "blocksProjectile">> = BLOCKS_ALL,
): RoomObjectCollider {
  return {
    id,
    shape: "circle",
    x,
    y,
    radius,
    blocksPlayer: channels.blocksPlayer ?? true,
    blocksEnemy: channels.blocksEnemy ?? true,
    blocksProjectile: channels.blocksProjectile ?? true,
  };
}

function scaledRect(
  id: string,
  centerX: number,
  centerY: number,
  source: { x: number; y: number; width: number; height: number },
  scale: number,
): RoomObjectCollider {
  return rect(
    id,
    centerX + source.x * scale,
    centerY + source.y * scale,
    source.width * scale,
    source.height * scale,
  );
}

function createWishFountainColliders(centerX: number, centerY: number): RoomObjectCollider[] {
  const scale = DUNGEON_RITUAL_SPRING_SCALE;
  const geometry = RITUAL_SPRING_GEOMETRY;
  const colliders: RoomObjectCollider[] = [
    scaledRect("wish_fountain:water", centerX, centerY, geometry.water, scale),
    scaledRect("wish_fountain:rim_north", centerX, centerY, geometry.rimNorth, scale),
    scaledRect("wish_fountain:rim_west", centerX, centerY, geometry.rimWest, scale),
    scaledRect("wish_fountain:rim_east", centerX, centerY, geometry.rimEast, scale),
  ];

  // Keep a true 16px player corridor through the south rim. Scaling the Hub
  // gap verbatim would make it narrower than the player's 12px diameter.
  const rimOuter = 50 * scale;
  const stairHalfWidth = 8;
  const rimY = centerY + geometry.rimSouthLeft.y * scale;
  const rimHeight = geometry.rimSouthLeft.height * scale;
  colliders.push(
    rect("wish_fountain:rim_south_left", centerX - rimOuter, rimY, rimOuter - stairHalfWidth, rimHeight),
    rect("wish_fountain:rim_south_right", centerX + stairHalfWidth, rimY, rimOuter - stairHalfWidth, rimHeight),
  );

  for (const [index, corner] of geometry.corners.entries()) {
    colliders.push(circle(
      `wish_fountain:corner_${index}`,
      centerX + corner.x * scale,
      centerY + corner.y * scale,
      corner.radius * scale,
    ));
  }
  for (const [index, lantern] of geometry.lanterns.entries()) {
    colliders.push(circle(
      `wish_fountain:lantern_${index}`,
      centerX + lantern.x * scale,
      centerY + lantern.y * scale,
      Math.max(3, lantern.radius * scale),
    ));
  }
  return colliders;
}

function createPortalColliders(x: number, y: number): RoomObjectCollider[] {
  return Object.entries(PORTAL_FRAME_COLLISION_GEOMETRY).map(([id, local]) =>
    rect(`portal:${id}`, x + local.x, y + local.y, local.width, local.height)
  );
}

export function createRoomObjectColliders(scene: RoomObjectCollisionScene): RoomObjectCollider[] {
  const colliders: RoomObjectCollider[] = [];
  if (scene.chest && typeof scene.chest.x === "number" && typeof scene.chest.y === "number") {
    const { x, y, kind } = scene.chest;
    const footprint = getChestGeometry(kind).physicalFootprint;
    colliders.push(rect(
      kind === "boss" ? "boss_chest" : "treasure_chest",
      x + footprint.x,
      y + footprint.y,
      footprint.width,
      footprint.height,
    ));
  }
  if (scene.portal && typeof scene.portal.x === "number" && typeof scene.portal.y === "number") {
    colliders.push(...createPortalColliders(scene.portal.x, scene.portal.y));
  }
  if (scene.roomType === "combat" && scene.special && typeof scene.special.x === "number" && typeof scene.special.y === "number") {
    colliders.push(...createWishFountainColliders(scene.special.x, scene.special.y));
    colliders.push(rect("combat", scene.special.x - 16, scene.special.y + 5, 32, 11));
  }
  if (scene.roomType === "npc" && scene.broadcast && typeof scene.broadcast.x === "number" && typeof scene.broadcast.y === "number") {
    colliders.push(rect("broadcast_terminal", scene.broadcast.x - 13, scene.broadcast.y + 1, 26, 11));
  }
  if (scene.roomType === "combat" && scene.legacy && typeof scene.legacy.x === "number" && typeof scene.legacy.y === "number") {
    colliders.push(rect("legacy_device", scene.legacy.x - 14, scene.legacy.y + 1, 28, 11));
  }
  
  return colliders;
}

function blocksChannel(collider: RoomObjectCollider, channel: RoomObjectCollisionChannel): boolean {
  if (channel === "player") return collider.blocksPlayer;
  if (channel === "enemy") return collider.blocksEnemy;
  return collider.blocksProjectile;
}

function circleOverlapsRect(
  circleX: number,
  circleY: number,
  radius: number,
  rectX: number,
  rectY: number,
  width: number,
  height: number,
): boolean {
  const closestX = Math.max(rectX, Math.min(circleX, rectX + width));
  const closestY = Math.max(rectY, Math.min(circleY, rectY + height));
  const dx = circleX - closestX;
  const dy = circleY - closestY;
  return dx * dx + dy * dy < radius * radius;
}

function circleOverlapsCircle(
  x1: number,
  y1: number,
  radius1: number,
  x2: number,
  y2: number,
  radius2: number,
): boolean {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const radius = radius1 + radius2;
  return dx * dx + dy * dy < radius * radius;
}

export function circleHitsRoomObject(
  collider: RoomObjectCollider,
  x: number,
  y: number,
  radius: number,
  channel: RoomObjectCollisionChannel,
): boolean {
  if (!blocksChannel(collider, channel)) return false;
  if (collider.shape === "circle") {
    return circleOverlapsCircle(x, y, radius, collider.x, collider.y, collider.radius ?? 0);
  }
  return circleOverlapsRect(x, y, radius, collider.x, collider.y, collider.width ?? 0, collider.height ?? 0);
}

export class RoomObjectCollision {
  private colliders: RoomObjectCollider[] = [];

  public setColliders(colliders: readonly RoomObjectCollider[]): void {
    this.colliders = colliders.map(collider => ({ ...collider }));
  }

  public rebuild(scene: RoomObjectCollisionScene): void {
    this.setColliders(createRoomObjectColliders(scene));
  }

  public clear(): void {
    this.colliders = [];
  }

  public getColliders(): readonly RoomObjectCollider[] {
    return this.colliders;
  }

  public findBlockingCollider(
    x: number,
    y: number,
    radius: number,
    channel: RoomObjectCollisionChannel,
  ): RoomObjectCollider | null {
    return this.colliders.find(collider => circleHitsRoomObject(collider, x, y, radius, channel)) ?? null;
  }

  public isCircleBlocked(x: number, y: number, radius: number, channel: RoomObjectCollisionChannel): boolean {
    return this.findBlockingCollider(x, y, radius, channel) !== null;
  }

  public closestPoint(
    x: number,
    y: number,
    colliderIds: readonly string[],
  ): { x: number; y: number; distance: number } | null {
    const allowed = new Set(colliderIds);
    const shapes: WorldSpatialShape[] = this.colliders
      .filter(collider => allowed.has(collider.id))
      .map(collider => collider.shape === "circle"
        ? { shape: "circle", x: collider.x, y: collider.y, radius: collider.radius ?? 0 }
        : { shape: "rect", x: collider.x, y: collider.y, width: collider.width ?? 0, height: collider.height ?? 0 });
    return closestPointOnFootprints(shapes, x, y);
  }

  public idsMatching(prefix: string): string[] {
    return this.colliders.filter(collider => collider.id === prefix || collider.id.startsWith(prefix)).map(collider => collider.id);
  }

  public resolveInteractionShell(
    x: number,
    y: number,
    colliderPrefix: string,
    range: number,
    requireSouth = false,
  ): RoomObjectInteractionPoint | null {
    const colliderIds = this.idsMatching(colliderPrefix);
    const closest = this.closestPoint(x, y, colliderIds);
    if (!closest || closest.distance > range) return null;
    const linked = this.colliders.filter(collider => colliderIds.includes(collider.id));
    if (requireSouth) {
      const southEdge = Math.max(...linked.map(collider => collider.shape === "circle"
        ? collider.y + (collider.radius ?? 0)
        : collider.y + (collider.height ?? 0)));
      if (y < southEdge) return null;
    }
    if (!this.hasLineOfSight(x, y, closest.x, closest.y, "projectile", 2, colliderIds)) return null;
    return { x: closest.x, y: closest.y, colliderIds };
  }

  public hasLineOfSight(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    channel: RoomObjectCollisionChannel = "projectile",
    radius = 2,
    ignoredColliderIds: readonly string[] = [],
  ): boolean {
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(distance / 4));
    for (let step = 1; step < steps; step++) {
      const t = step / steps;
      const sampleX = startX + dx * t;
      const sampleY = startY + dy * t;
      if (this.colliders.some(collider =>
        !ignoredColliderIds.includes(collider.id)
        && circleHitsRoomObject(collider, sampleX, sampleY, radius, channel)
      )) return false;
    }
    return true;
  }
}
