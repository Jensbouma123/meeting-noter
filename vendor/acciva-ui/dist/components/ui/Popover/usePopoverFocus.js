import { useEffect, useRef } from "react";
import { pickInitialFocus } from "../../../lib/initial-focus.js";
import { resolveOpener } from "../../../lib/opener.js";
import { focusOnOpen } from "../../../lib/quiet-focus.js";
import { FOCUSABLE_SELECTOR } from "./constants.js";
// Focus in on open, back to the trigger on close, and Tab release. Returns the card's keydown handler.
export function usePopoverFocus(open, triggerRef, popoverRef, handleClose) {
    const previouslyFocusedRef = useRef(null);
    // Initial focus is keyed on `open` alone (no "was closed" ref): StrictMode re-runs mount
    // effects and an initially-open popover never sees a closed→open edge, so a ref gate drops it.
    // The cleanup cancels a frame that a close pre-empts.
    useEffect(() => {
        if (!open)
            return;
        // WebKit leaves `<body>` focused after a click; resolveOpener falls back to the trigger (SC 2.4.3).
        previouslyFocusedRef.current = resolveOpener(triggerRef.current, popoverRef.current);
        const frameId = requestAnimationFrame(() => {
            const popoverEl = popoverRef.current;
            if (!popoverEl)
                return;
            // Quiet off the keyboard (focusVisible: false + global data-quiet-focus, SC 2.4.7).
            focusOnOpen(pickInitialFocus(popoverEl, FOCUSABLE_SELECTOR) ?? popoverEl);
        });
        return () => cancelAnimationFrame(frameId);
    }, [open, triggerRef, popoverRef]);
    // Restore focus on the open→closed edge only, so a mount that starts closed does not steal focus.
    const wasOpenRef = useRef(false);
    useEffect(() => {
        if (!open && wasOpenRef.current) {
            if (previouslyFocusedRef.current && typeof previouslyFocusedRef.current.focus === "function") {
                previouslyFocusedRef.current.focus({ preventScroll: true });
            }
            else if (triggerRef.current && typeof triggerRef.current.focus === "function") {
                triggerRef.current.focus({ preventScroll: true });
            }
        }
        wasOpenRef.current = open;
    }, [open, triggerRef]);
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
