import { useEffect, useRef, useState } from "react";
import { useLongPress } from "../../../lib/use-long-press.js";
/** Open state and its timers: hover/focus reveal after `delay`, press-and-hold for touch, and hide. */
export function useTooltipOpen(delay, longPress, triggerRef) {
    const [open, setOpen] = useState(false);
    const timeoutRef = useRef(null);
    const dismissRef = useRef(null);
    const touchOpenRef = useRef(false);
    useEffect(() => {
        return () => {
            if (timeoutRef.current)
                clearTimeout(timeoutRef.current);
            if (dismissRef.current)
                clearTimeout(dismissRef.current);
        };
    }, []);
    const show = () => {
        const reveal = () => {
            // A trigger whose menu/popup is open (or just closing and returning focus) keeps the tooltip hidden
            // until hover/focus is renewed, so it never sits over the popup (SC 1.4.13).
            if (triggerRef.current?.getAttribute("aria-expanded") === "true")
                return;
            if (triggerRef.current && document.body.contains(triggerRef.current)) {
                setOpen(true);
            }
        };
        if (delay <= 0) {
            reveal();
            return;
        }
        timeoutRef.current = setTimeout(reveal, delay);
    };
    const hide = () => {
        if (timeoutRef.current)
            clearTimeout(timeoutRef.current);
        if (dismissRef.current)
            clearTimeout(dismissRef.current);
        touchOpenRef.current = false;
        setOpen(false);
    };
    const touch = useLongPress(longPress, () => {
        touchOpenRef.current = true;
        setOpen(true);
    }, 
    // Auto-dismiss after release so the label stays readable but never lingers (SC 1.4.13).
    () => {
        dismissRef.current = setTimeout(hide, 1500);
    });
    return [open, show, hide, touch, touchOpenRef];
}
