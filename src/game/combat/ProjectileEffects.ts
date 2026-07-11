export interface Velocity2D {
  vx: number;
  vy: number;
}

export function rotateVelocityToward(
  vx: number,
  vy: number,
  targetAngle: number,
  maxTurn: number,
): Velocity2D {
  const speed = Math.hypot(vx, vy);
  if (speed <= 0 || maxTurn <= 0) return { vx, vy };
  const currentAngle = Math.atan2(vy, vx);
  let delta = targetAngle - currentAngle;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  const nextAngle = currentAngle + Math.max(-maxTurn, Math.min(maxTurn, delta));
  return {
    vx: Math.cos(nextAngle) * speed,
    vy: Math.sin(nextAngle) * speed,
  };
}

export function calculateChainDamage(
  baseDamage: number,
  multiplier: number,
  chainIndex: number,
): number {
  return Math.max(1, Math.round(
    Math.max(0, baseDamage) * Math.pow(Math.max(0, multiplier), Math.max(0, chainIndex) + 1),
  ));
}

export function calculateExplosionDamage(
  baseDamage: number,
  multiplier: number,
  distance: number,
  radius: number,
): number {
  if (radius <= 0 || distance > radius) return 0;
  const falloff = Math.max(0.45, 1 - Math.max(0, distance) / radius * 0.55);
  return Math.max(1, Math.round(Math.max(0, baseDamage) * Math.max(0, multiplier) * falloff));
}

export function calculateExplosionFalloff(distance: number, radius: number): number {
  if (radius <= 0 || distance > radius) return 0;
  return Math.max(0.45, 1 - Math.max(0, distance) / radius * 0.55);
}
