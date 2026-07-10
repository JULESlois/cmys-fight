export interface SegmentHit {
  t: number;
  x: number;
  y: number;
}

/** Return the first point where segment AB enters the circle, or null. */
export function segmentCircleHit(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  radius: number,
): SegmentHit | null {
  const dx = bx - ax;
  const dy = by - ay;
  const fx = ax - cx;
  const fy = ay - cy;
  const a = dx * dx + dy * dy;

  if (a <= Number.EPSILON) {
    if (fx * fx + fy * fy <= radius * radius) {
      return { t: 0, x: ax, y: ay };
    }
    return null;
  }

  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - radius * radius;
  if (c <= 0) {
    return { t: 0, x: ax, y: ay };
  }
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;

  const sqrt = Math.sqrt(discriminant);
  const t1 = (-b - sqrt) / (2 * a);
  const t2 = (-b + sqrt) / (2 * a);
  const t = t1 >= 0 && t1 <= 1 ? t1 : (t2 >= 0 && t2 <= 1 ? t2 : null);
  if (t === null) return null;

  return {
    t,
    x: ax + dx * t,
    y: ay + dy * t,
  };
}
