import { useEffect, useRef } from "react";
import { pickInitialFocus } from "../../../lib/initial-focus.js";
import { focusOnOpen } from "../../../lib/quiet-focus.js";
import { FOCUSABLE_SELECTOR } from "./constants.js";
// Focus in on open, back to the trigger on close, and Tab release. Returns the card's keydown handler.
export function usePopoverFocus(open, triggerRef, popoverRef, handleClose) {
    const previouslyFocusedRef = useRef(null);
    const prevOpenRef = useRef(open);
    useEffect(() => {
        if (open && !prevOpenRef.current) {
            previouslyFocusedRef.current = document.activeElement ?? triggerRef.current;
            // Marked synchronously: a close before the frame fires cancels it, and the close
            // branch must still run to hand focus back to the trigger.
            prevOpenRef.current = true;
            const frameId = requestAnimationFrame(() => {
                const popoverEl = popoverRef.current;
                if (!popoverEl)
                    return;
                // Quiet off the keyboard (focusVisible: false + global data-quiet-focus, SC 2.4.7).
                focusOnOpen(pickInitialFocus(popoverEl, FOCUSABLE_SELECTOR) ?? popoverEl);
            });
            return () => cancelAnimationFrame(frameId);
        }
        else if (!open && prevOpenRef.current) {
            if (previouslyFocusedRef.current && typeof previouslyFocusedRef.current.focus === "function") {
                previouslyFocusedRef.current.focus({ preventScroll: true });
            }
            else if (triggerRef.current && typeof triggerRef.current.focus === "function") {
                triggerRef.current.focus({ preventScroll: true });
            }
        }
        prevOpenRef.current = open;
    }, [open, triggerRef, popoverRef]);
    return (e) => {
        if (e.key === "Tab") {
            // aria-modal="false": no trap (SC 2.1.2). Tab past either end closes and hands focus to the
            // trigger so Tab continues from it.
            const popoverEl = popoverRef.current;
            if (!popoverEl)
                return;
            const focusable = popoverEl.querySelectorAll(FOCUSABLE_SELECTOR);
            const edge = e.shiftKey ? focusable[0] : focusable[focusable.length - 1];
            const active = document.activeElement;
            if (!edge || active === edge || (e.shiftKey && active === popoverEl)) {
                handleClose();
                triggerRef.current?.focus({ preventScroll: true });
            }
        }
    };
}
