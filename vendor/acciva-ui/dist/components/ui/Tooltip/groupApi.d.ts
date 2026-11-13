import { type Dispatch, type SetStateAction } from "react";
import type { TooltipGroupApi, TooltipMorphFrom, TooltipSlot } from "./types.js";
export interface TooltipGroupState {
    slot: TooltipSlot | null;
    from: TooltipMorphFrom | null;
    seq: number;
}
/** The nearest TooltipGroup, or `null` when a Tooltip stands alone. */
export declare const TooltipGroupContext: import("react").Context<TooltipGroupApi | null>;
/**
 * The group's channel. A hand-off is a publish from another owner while the bubble is still
 * mounted: the old rect, arrow, side and text are captured here, before React swaps them. The rect
 * counts only while the bubble is still anchored to the old trigger (`anchoredRects`).
 */
export declare function createGroupApi(setState: Dispatch<SetStateAction<TooltipGroupState>>): {
    api: TooltipGroupApi;
    bubbleRef: {
        current: HTMLDivElement | null;
    };
    skipDelayRef: {
        current: number;
    };
};
