import { type RefObject } from "react";
import type { TooltipSlot } from "./types.js";
import { type TooltipMorph } from "./useTooltipMorph.js";
type TooltipBubbleProps = TooltipSlot & {
    bubbleRef?: RefObject<HTMLDivElement | null>;
    /** Set by TooltipGroup: the text sits in cross-fading layers and hand-offs morph the bubble. */
    morph?: TooltipMorph;
};
/** The open bubble: mounted only while shown, so `role="tooltip"` is in the DOM only when visible. */
export declare function TooltipBubble({ bubbleRef, morph, ...slot }: TooltipBubbleProps): import("react").JSX.Element;
export {};
