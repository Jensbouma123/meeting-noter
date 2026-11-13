import { type RefObject } from "react";
import type { TooltipPlacement } from "./placement.js";
import type { TooltipMorphFrom } from "./types.js";
export interface TooltipMorph {
    from: TooltipMorphFrom | null;
    /** Bumped on every hand-off; the morph runs once per value. */
    seq: number;
    onSettled: () => void;
}
/**
 * FLIP hand-off for a TooltipGroup's shared bubble. The DOM already shows the new anchor and text;
 * this pins the bubble to the old rect (`data-morph="from"`, no transitions), then releases it
 * (`data-morph="to"`) so CSS transitions `translate`, `width`, `height` and the arrow to the new
 * spot while the text layers cross-fade. A side change fades the bubble in at its new side instead
 * of sliding across the trigger; reduced motion switches instantly.
 */
export declare function useTooltipMorph(ref: RefObject<HTMLDivElement | null>, morph: TooltipMorph | undefined, sync: () => TooltipPlacement | null): void;
