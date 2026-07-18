export interface HudRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HudLayoutDefinition {
  topLeftStatus: HudRect;
  topRightMinimap: HudRect;
  bottomRightWeapon: HudRect;
  hubBottomNotice: HudRect;
  dungeonBottomNotice: HudRect;
}

export const HUD_LAYOUT: HudLayoutDefinition = {
  topLeftStatus: { x: 5, y: 5, width: 80, height: 42 },
  topRightMinimap: { x: 248, y: 18, width: 67, height: 67 },
  bottomRightWeapon: { x: 219, y: 197, width: 96, height: 38 },
  hubBottomNotice: { x: 43, y: 207, width: 234, height: 23 },
  dungeonBottomNotice: { x: 43, y: 169, width: 234, height: 23 },
};

export type HudScene = "hub" | "dungeon";

export function getBottomNoticeBounds(scene: HudScene): HudRect {
  return scene === "dungeon" ? HUD_LAYOUT.dungeonBottomNotice : HUD_LAYOUT.hubBottomNotice;
}

export function rectsOverlap(a: HudRect, b: HudRect): boolean {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}

