import type {
  WorldColliderDefinition,
  WorldPoint,
  WorldRect,
  WorldSpatialShape,
} from "./WorldMap";

export interface ClosestSpatialPoint extends WorldPoint {
  distance: number;
  shapeIndex: number;
}

export function colliderToSpatialShape(collider: WorldColliderDefinition): WorldSpatialShape {
  if (collider.shape === "rect") {
    return { shape: "rect", x: collider.x, y: collider.y, width: collider.width, height: collider.height };
  }
  if (collider.shape === "circle") {
    return { shape: "circle", x: collider.x, y: collider.y, radius: collider.radius };
  }
  return { shape: "polygon", points: collider.points.map(point => ({ ...point })) };
}

function closestPointOnSegment(point: WorldPoint, start: WorldPoint, end: WorldPoint): WorldPoint {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= Number.EPSILON) return { ...start };
  const ratio = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return { x: start.x + dx * ratio, y: start.y + dy * ratio };
}

function closestPointOnShape(shape: WorldSpatialShape, point: WorldPoint): WorldPoint {
  if (shape.shape === "rect") {
    return {
      x: Math.max(shape.x, Math.min(point.x, shape.x + shape.width)),
      y: Math.max(shape.y, Math.min(point.y, shape.y + shape.height)),
    };
  }
  if (shape.shape === "circle") {
    const dx = point.x - shape.x;
    const dy = point.y - shape.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= Number.EPSILON) return { x: shape.x + shape.radius, y: shape.y };
    return {
      x: shape.x + dx / distance * shape.radius,
      y: shape.y + dy / distance * shape.radius,
    };
  }
  let closest = shape.points[0] ?? point;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < shape.points.length; index++) {
    const start = shape.points[index];
    const end = shape.points[(index + 1) % shape.points.length];
    const candidate = closestPointOnSegment(point, start, end);
    const distance = Math.hypot(candidate.x - point.x, candidate.y - point.y);
    if (distance < closestDistance) {
      closest = candidate;
      closestDistance = distance;
    }
  }
  return closest;
}

export function closestPointOnFootprints(
  footprints: readonly WorldSpatialShape[],
  x: number,
  y: number,
): ClosestSpatialPoint | null {
  let closest: ClosestSpatialPoint | null = null;
  footprints.forEach((shape, shapeIndex) => {
    const point = closestPointOnShape(shape, { x, y });
    const distance = Math.hypot(point.x - x, point.y - y);
    if (!closest || distance < closest.distance) closest = { ...point, distance, shapeIndex };
  });
  return closest;
}

export function rectsIntersect(a: WorldRect, b: WorldRect): boolean {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}
