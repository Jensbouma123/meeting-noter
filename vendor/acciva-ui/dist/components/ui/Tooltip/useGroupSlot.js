import { useLayoutEffect } from "react";
/**
 * Inside a TooltipGroup, an open Tooltip hands its bubble data to the group instead of mounting
 * its own bubble. Layout effects, so a hand-off is captured before the browser paints.
 */
export function useGroupSlot(group, open, slot) {
    useLayoutEffect(() => {
        if (group && open)
            group.publish(slot);
        // Re-publish only what the bubble shows; the rest of the slot is stable per instance.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [group, open, slot.content, slot.side, slot.maxWidth]);
    useLayoutEffect(() => {
        if (!group || !open)
            return;
        return () => group.clear(slot.owner);
    }, [group, open, slot.owner]);
}
