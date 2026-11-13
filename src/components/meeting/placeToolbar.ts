import type { Box, ToolbarPlacement } from './FixWordAction.types';

const GAP = 8;
const EDGE = 4;

export function placeToolbar(rect: Box, bounds: Box, size: { width: number; height: number }): ToolbarPlacement {
  const side = rect.top - GAP - size.height >= bounds.top ? 'above' : 'below';
  const top = side === 'above' ? rect.top - GAP - size.height : rect.bottom + GAP;
  const centre = (rect.left + rect.right) / 2;
  const min = bounds.left + EDGE;
  const max = Math.max(min, bounds.right - EDGE - size.width);
  const left = Math.min(Math.max(centre - size.width / 2, min), max);
  return { top, left, side, arrowX: Math.min(Math.max(centre - left, 12), Math.max(12, size.width - 12)) };
}
