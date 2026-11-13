import type { TooltipSide } from "@/components/ui/Tooltip/types";

export interface TooltipPlacement {
  /** Side the bubble landed on after any position-try flip; drives the arrow. */
  placed: TooltipSide;
  /** Arrow offset: trigger centre along the edge the arrow sits on, from the bubble's top/left. */
  arrow: string;
}

/** Reads where the bubble actually sits relative to its trigger; `null` before it has a size. */
export function measurePlacement(bubble: HTMLElement, trigger: HTMLElement): TooltipPlacement | null {
  const b = bubble.getBoundingClientRect();
  if (!b.width) return null;
  const t = trigger.getBoundingClientRect();
  const above = b.bottom <= t.top;
  const below = b.top >= t.bottom;
  const placed = above ? "top" : below ? "bottom" : b.right <= t.left ? "left" : "right";
  const arrow = `${above || below ? t.x + t.width / 2 - b.x : t.y + t.height / 2 - b.y}px`;
  return { placed, arrow };
}
