export interface BellRepeaterArtState {
  time: number;
  resourceRatio: number;
  reloadProgress: number;
  shotCount: number;
  muzzleFlash: number;
  reducedFlashing?: boolean;
}

export interface BellRepeaterArtMetrics {
  clapperOffset: number;
  lowAmmo: boolean;
  accentShot: boolean;
  heatLevel: number;
  reloadStage: 0 | 1 | 2 | 3;
}

export function getBellRepeaterArtMetrics(state: BellRepeaterArtState): BellRepeaterArtMetrics {
  const ratio = Math.max(0, Math.min(1, state.resourceRatio));
  const reload = Math.max(0, Math.min(1, state.reloadProgress));
  const accentShot = state.shotCount > 0 && state.shotCount % 3 === 0 && state.muzzleFlash > 0;
  const idleSwing = Math.sin(state.time * Math.PI * 2 / 1.2);
  const recoilSwing = state.muzzleFlash > 0 ? -Math.sign(idleSwing || 1) : 0;
  const clapperOffset = Math.max(-2, Math.min(2, Math.round(idleSwing * 1.4 + recoilSwing)));
  const heatLevel = Math.max(0, Math.min(1, (1 - ratio) * 1.25));
  const reloadStage: BellRepeaterArtMetrics["reloadStage"] = reload <= 0
    ? 0
    : reload < 0.34
      ? 1
      : reload < 0.72
        ? 2
        : 3;
  return { clapperOffset, lowAmmo: ratio <= 0.2, accentShot, heatLevel, reloadStage };
}

export function drawBellRepeaterArtFx(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  state: BellRepeaterArtState,
): BellRepeaterArtMetrics {
  const metrics = getBellRepeaterArtMetrics(state);
  const bellX = Math.round(originX - 1);
  const bellY = Math.round(originY - 1);

  ctx.fillStyle = metrics.lowAmmo ? "#9C6A20" : "#FFF3B0";
  ctx.fillRect(bellX + metrics.clapperOffset, bellY, 2, 3);

  if (metrics.heatLevel > 0.35 && state.muzzleFlash > 0) {
    ctx.globalAlpha *= 0.45 + metrics.heatLevel * 0.35;
    ctx.fillStyle = "#E5A33A";
    ctx.fillRect(bellX - 4, bellY - 4, 2, 1);
    ctx.fillRect(bellX + 4, bellY - 3, 1, 3);
  }

  if (metrics.accentShot) {
    ctx.globalAlpha *= state.reducedFlashing ? 0.45 : 0.7;
    ctx.fillStyle = "#F1C40F";
    ctx.fillRect(bellX - 5, bellY - 6, 3, 1);
    ctx.fillRect(bellX + 3, bellY - 6, 3, 1);
    ctx.fillRect(bellX - 6, bellY - 5, 1, 2);
    ctx.fillRect(bellX + 6, bellY - 5, 1, 2);
  }

  if (metrics.reloadStage > 0) {
    const progress = Math.max(0, Math.min(1, state.reloadProgress));
    if (metrics.reloadStage === 1) {
      ctx.fillStyle = "#9C6A20";
      ctx.fillRect(originX + 2, originY + 5 + Math.round(progress * 6), 4, 4);
    } else if (metrics.reloadStage === 2) {
      ctx.fillStyle = "#4E5966";
      ctx.fillRect(bellX - 4, bellY - 3, 7, 1);
      ctx.fillRect(bellX - 3, bellY - 4, 1, 2);
    } else {
      ctx.fillStyle = "#D4A438";
      ctx.fillRect(originX + 2, originY + 8 - Math.round((progress - 0.72) * 11), 4, 4);
      if (progress > 0.92) {
        ctx.fillStyle = "#FFF3B0";
        ctx.fillRect(bellX - 5, bellY, 11, 1);
      }
    }
  }

  return metrics;
}
