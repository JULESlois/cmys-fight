export interface SweptCircleMoveInput {
  x: number;
  y: number;
  radius: number;
  deltaX: number;
  deltaY: number;
  isBlocked: (x: number, y: number, radius: number) => boolean;
}

export interface SweptCircleMoveResult {
  x: number;
  y: number;
  movedX: number;
  movedY: number;
  steps: number;
  blocked: boolean;
}

/**
 * Shared movement for every circular ground footprint.
 *
 * Each substep is at most 3px and never exceeds half the entity radius. The
 * complete vector is attempted first. When that is blocked, the two axis-only
 * candidates are evaluated from the same origin and the candidate that makes
 * the most progress is selected. Equal-distance ties alternate deterministically
 * instead of permanently preferring X or Y.
 */
export function moveSweptCircle(input: SweptCircleMoveInput): SweptCircleMoveResult {
  const { x, y, radius, deltaX, deltaY, isBlocked } = input;
  const distance = Math.hypot(deltaX, deltaY);
  const maxStep = Math.min(3, 1, radius > 0 ? radius * 0.5 : 0.01);
  const steps = Math.max(1, Math.ceil(distance / maxStep));
  const stepX = deltaX / steps;
  const stepY = deltaY / steps;
  let nextX = x;
  let nextY = y;
  let blocked = false;

  for (let step = 0; step < steps; step++) {
    const fullX = nextX + stepX;
    const fullY = nextY + stepY;
    if (!isBlocked(fullX, fullY, radius)) {
      nextX = fullX;
      nextY = fullY;
      continue;
    }

    blocked = true;
    const canX = Math.abs(stepX) > Number.EPSILON && !isBlocked(fullX, nextY, radius);
    const canY = Math.abs(stepY) > Number.EPSILON && !isBlocked(nextX, fullY, radius);
    if (!canX && !canY) continue;
    if (canX && !canY) {
      nextX = fullX;
      continue;
    }
    if (canY && !canX) {
      nextY = fullY;
      continue;
    }

    const xProgress = Math.abs(stepX);
    const yProgress = Math.abs(stepY);
    if (xProgress > yProgress) {
      nextX = fullX;
    } else if (yProgress > xProgress) {
      nextY = fullY;
    } else if (step % 2 === 0) {
      nextX = fullX;
    } else {
      nextY = fullY;
    }
  }

  return {
    x: nextX,
    y: nextY,
    movedX: nextX - x,
    movedY: nextY - y,
    steps,
    blocked,
  };
}
