export interface TouchViewportOffsets {
  verticalGutter: number;
  horizontalGutter: number;
  bottomOffset: number;
  topOffset: number;
  sideOffset: number;
}

const GAME_ASPECT_HEIGHT = 0.75;
const MAX_TOUCH_SCALE = 1.15;
const ACTION_CLUSTER_HEIGHT = 116 * MAX_TOUCH_SCALE;
const ACTION_CLUSTER_WIDTH = 116 * MAX_TOUCH_SCALE;
const MENU_HEIGHT = 26 * MAX_TOUCH_SCALE;

export function calculateTouchViewportOffsets(width: number, height: number): TouchViewportOffsets {
  const safeWidth = Math.max(0, Number.isFinite(width) ? width : 0);
  const safeHeight = Math.max(0, Number.isFinite(height) ? height : 0);
  const renderedHeight = Math.min(safeHeight, safeWidth * GAME_ASPECT_HEIGHT);
  const renderedWidth = Math.min(safeWidth, safeHeight / GAME_ASPECT_HEIGHT);
  const verticalGutter = Math.max(0, (safeHeight - renderedHeight) / 2);
  const horizontalGutter = Math.max(0, (safeWidth - renderedWidth) / 2);
  return {
    verticalGutter,
    horizontalGutter,
    bottomOffset: Math.max(10, (verticalGutter - ACTION_CLUSTER_HEIGHT) / 2),
    topOffset: Math.max(7, (verticalGutter - MENU_HEIGHT) / 2),
    sideOffset: Math.max(10, (horizontalGutter - ACTION_CLUSTER_WIDTH) / 2),
  };
}
