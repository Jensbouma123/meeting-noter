import { type RefObject } from "react";
import type { TooltipSide } from "./types.js";
/**
 * Manual popover lifecycle: opens the bubble in the top layer, tracks the side it landed on,
 * and dismisses on Escape, outside press, or scroll.
 */
export declare function useTooltipBubble(open: boolean, side: TooltipSide, triggerRef: RefObject<HTMLElement | null>, tooltipRef: RefObject<HTMLDivElement | null>, hide: () => void, touchOpenRef: RefObject<boolean>): "top" | "bottom" | "left" | "right";
