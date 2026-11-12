import type { useLongPress } from "../../../lib/use-long-press.js";
import type { TooltipChildProps } from "./types.js";
type Touch = ReturnType<typeof useLongPress>;
/**
 * Chains the trigger's own handlers in front of the tooltip's: hover/focus reveal it, and any
 * interaction that moves attention away (click, key, pointer down) hides it.
 */
export declare function useTriggerHandlers(childProps: TooltipChildProps, show: () => void, hide: () => void, leave: () => void, touch: Touch): {
    onClick: (e: React.MouseEvent) => void;
};
export {};
