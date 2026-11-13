import type { TooltipSide } from "./types.js";
export interface TooltipPlacement {
    /** Side the bubble landed on after any position-try flip; drives the arrow. */
    placed: TooltipSide;
    /** Arrow offset: trigger centre along the edge the arrow sits on, from the bubble's top/left. */
    arrow: string;
}
/** Reads where the bubble actually sits relative to its trigger; `null` before it has a size. */
export declare function measurePlacement(bubble: HTMLElement, trigger: HTMLElement): TooltipPlacement | null;
