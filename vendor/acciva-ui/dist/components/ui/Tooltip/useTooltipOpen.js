import { useEffect, useRef, useState } from "react";
import { useLongPress } from "../../../lib/use-long-press.js";
import { claimOpen, releaseOpen } from "./openRegistry.js";
/**
 * Open state and its timers: hover/focus reveal after `delay` (skipped while `warm()` is true, i.e.
 * a `TooltipGroup` hand-off), press-and-hold for touch, and hide. Opening closes any other tooltip.
 */
export function useTooltipOpen(delay, longPress, triggerRef, warm) {
    const [open, setOpen] = useState(false);
    const timeoutRef = useRef(null);
    const dismissRef = useRef(null);
    const leaveRef = useRef(null);
    const touchOpenRef = useRef(false);
    // Stable identity for the single-open registry and the group's bubble.
    const [owner] = useState(() => ({}));
    useEffect(() => {
        return () => {
            if (timeoutRef.current)
                clearTimeout(timeoutRef.current);
            if (dismissRef.current)
                clearTimeout(dismissRef.current);
            if (leaveRef.current)
                clearTimeout(leaveRef.current);
            releaseOpen(owner);
        };
    }, [owner]);
    const hide = () => {
        if (timeoutRef.current)
            clearTimeout(timeoutRef.current);
        if (dismissRef.current)
            clearTimeout(dismissRef.current);
        if (leaveRef.current)
            clearTimeout(leaveRef.current);
        touchOpenRef.current = false;
        releaseOpen(owner);
        setOpen(false);
    };
    const openNow = () => {
        claimOpen(owner, hide);
        setOpen(true);
    };
    const show = () => {
        if (leaveRef.current)
            clearTimeout(leaveRef.current);
        const reveal = () => {
            // A trigger whose menu/popup is open (or just closing and returning focus) keeps the tooltip hidden
            // until hover/focus is renewed, so it never sits over the popup (SC 1.4.13).
            if (triggerRef.current?.getAttribute("aria-expanded") === "true")
                return;
            if (triggerRef.current && document.body.contains(triggerRef.current))
                openNow();
        };
        if (delay <= 0 || warm?.()) {
            reveal();
            return;
        }
        timeoutRef.current = setTimeout(reveal, delay);
    };
    // Hover-out closes after a short grace so a brief slip off the trigger doesn't flicker (SC 1.4.13).
    const leave = () => {
        if (timeoutRef.current)
            clearTimeout(timeoutRef.current);
        leaveRef.current = setTimeout(hide, 100);
    };
    const touch = useLongPress(longPress, () => {
        touchOpenRef.current = true;
        openNow();
    }, 
    // Auto-dismiss after release so the label stays readable but never lingers (SC 1.4.13).
    () => {
        dismissRef.current = setTimeout(hide, 1500);
    });
    return [open, show, hide, leave, touch, touchOpenRef, owner];
}
