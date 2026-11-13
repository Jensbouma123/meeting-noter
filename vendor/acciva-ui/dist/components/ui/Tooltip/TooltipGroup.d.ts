import type { TooltipGroupProps } from "./types.js";
/**
 * Lets a row of Tooltips share one bubble: while it is open (or closed less than `skipDelay` ms
 * ago) another trigger opens with no delay, and a hand-off glides the bubble to the new anchor.
 */
export declare function TooltipGroup({ children, skipDelay }: TooltipGroupProps): import("react").JSX.Element;
