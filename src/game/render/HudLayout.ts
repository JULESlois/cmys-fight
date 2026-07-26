export interface HudRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HudLayoutDefinition {
  topLeftStatus: HudRect;
  topRightMinimap: HudRect;
  rightSubWeapon: HudRect;
  bottomRightWeapon: HudRect;
  hubBottomNotice: HudRect;
  dungeonBottomNotice: HudRect;
}

export const HUD_LAYOUT: HudLayoutDefinition = {
  topLeftStatus: { x: 5, y: 5, width: 80, height: 42 },
  // Worst-case footprint the minimap is allowed to occupy. MinimapRenderer
  // derives its cell size and right-aligns inside this box, so the reservation
  // and the drawing cannot drift apart.
  topRightMinimap: { x: 202, y: 18, width: 112, height: 78 },
  // Castlevania cluster (hearts + sub-weapon slot). It shares the weapon
  // panel's column but sits directly under the minimap reservation, because the
  // strip above the weapon panel belongs to the dungeon bottom notice. This is
  // the only right-rail slot that can never collide with either notice.
  rightSubWeapon: { x: 219, y: 99, width: 96, height: 26 },
  bottomRightWeapon: { x: 219, y: 197, width: 96, height: 38 },
  hubBottomNotice: { x: 43, y: 207, width: 234, height: 23 },
  dungeonBottomNotice: { x: 43, y: 169, width: 234, height: 23 },
};

/** Vertical flow anchored under the top-left status block. */
export const HUD_STATUS_FLOW = {
  x: HUD_LAYOUT.topLeftStatus.x,
  startY: HUD_LAYOUT.topLeftStatus.y + HUD_LAYOUT.topLeftStatus.height + 4,
  buffCell: { width: 12, height: 9, strideX: 15, strideY: 12, columns: 6 },
  rowGap: 4,
} as const;

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

