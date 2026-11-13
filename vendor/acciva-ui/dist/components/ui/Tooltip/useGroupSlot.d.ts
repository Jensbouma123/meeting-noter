import type { TooltipGroupApi, TooltipSlot } from "./types.js";
/**
 * Inside a TooltipGroup, an open Tooltip hands its bubble data to the group instead of mounting
 * its own bubble. Layout effects, so a hand-off is captured before the browser paints.
 */
export declare function useGroupSlot(group: TooltipGroupApi | null, open: boolean, slot: TooltipSlot): void;
