export interface TouchViewportOffsets {
  verticalGutter: number;
  bottomOffset: number;
  topOffset: number;
}

const GAME_ASPECT_HEIGHT = 0.75;
const ACTION_CLUSTER_HEIGHT = 158;
const MENU_HEIGHT = 38;

export function calculateTouchViewportOffsets(width: number, height: number): TouchViewportOffsets {
  const safeWidth = Math.max(0, Number.isFinite(width) ? width : 0);
  const safeHeight = Math.max(0, Number.isFinite(height) ? height : 0);
  const renderedHeight = Math.min(safeHeight, safeWidth * GAME_ASPECT_HEIGHT);
  const verticalGutter = Math.max(0, (safeHeight - renderedHeight) / 2);
  return {
    verticalGutter,
    bottomOffset: Math.max(12, (verticalGutter - ACTION_CLUSTER_HEIGHT) / 2),
    topOffset: Math.max(8, (verticalGutter - MENU_HEIGHT) / 2),
  };
}
