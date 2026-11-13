import { type RefObject } from "react";
import { type TooltipPlacement } from "./placement.js";
import type { TooltipSide } from "./types.js";
/**
 * Manual popover lifecycle for a mounted (open) bubble: shows it in the top layer, tracks the
 * side it landed on, and dismisses on Escape, outside press, or scroll. Re-runs when the bubble is
 * handed to another anchor (`anchorName`, TooltipGroup). Returns the placed side and `sync`, which
 * re-measures it (skipped while a group morph owns the arrow, `data-morph`).
 */
export declare function useTooltipBubble(side: TooltipSide, anchorName: string, triggerRef: RefObject<HTMLElement | null>, tooltipRef: RefObject<HTMLDivElement | null>, hide: () => void, touchOpenRef: RefObject<boolean>): readonly ["top" | "bottom" | "left" | "right", () => TooltipPlacement | null];
