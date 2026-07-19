export interface HubPromptScreenPoint {
  x: number;
  y: number;
}

export const HUB_PROMPT_SCREEN_BOUNDS = {
  left: 8,
  right: 312,
  top: 12,
  bottom: 220,
  visibilityPadding: 48,
} as const;

export function isHubPromptAnchorNearViewport(point: HubPromptScreenPoint): boolean {
  const padding = HUB_PROMPT_SCREEN_BOUNDS.visibilityPadding;
  return point.x >= -padding
    && point.x <= 320 + padding
    && point.y >= -padding
    && point.y <= 240 + padding / 2;
}

export function clampHubPromptPosition(point: HubPromptScreenPoint): HubPromptScreenPoint {
  return {
    x: Math.max(HUB_PROMPT_SCREEN_BOUNDS.left, Math.min(HUB_PROMPT_SCREEN_BOUNDS.right, point.x)),
    y: Math.max(HUB_PROMPT_SCREEN_BOUNDS.top, Math.min(HUB_PROMPT_SCREEN_BOUNDS.bottom, point.y)),
  };
}

