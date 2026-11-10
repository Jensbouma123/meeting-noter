import { useEffect, useState } from "react";
import { computeArrow } from "./computeArrow.js";
// Anchor positioning follows the trigger on scroll/resize; JS only reads back which side the card
// landed on and where the trigger centre falls on it, for the arrow. Safari resolves the anchored
// position a frame after showPopover(), so it is read again on the next two frames. Returns the placed side.
export function usePopoverPlacement(open, targetPlacement, triggerRef, anchorName, popoverRef) {
    const [placed, setPlaced] = useState(targetPlacement);
    useEffect(() => {
        if (!open)
            return;
        const syncPlaced = () => {
            const card = popoverRef.current;
            const trigger = triggerRef.current;
            if (!card || !trigger)
                return;
            const arrow = computeArrow(card.getBoundingClientRect(), trigger.getBoundingClientRect());
            setPlaced(arrow?.side ?? targetPlacement);
            if (arrow)
                card.style.setProperty("--popover-arrow", `${arrow.offset}px`);
        };
        syncPlaced();
        let frame = requestAnimationFrame(() => {
            syncPlaced();
            frame = requestAnimationFrame(syncPlaced);
        });
        window.addEventListener("scroll", syncPlaced, { capture: true, passive: true });
        window.addEventListener("resize", syncPlaced);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("scroll", syncPlaced, true);
            window.removeEventListener("resize", syncPlaced);
        };
    }, [open, targetPlacement, triggerRef, popoverRef]);
    useEffect(() => {
        const trigger = triggerRef.current;
        if (!open || !trigger)
            return;
        trigger.style.setProperty("anchor-name", anchorName);
        return () => {
            trigger.style.removeProperty("anchor-name");
        };
    }, [open, anchorName, triggerRef]);
    return placed;
}
