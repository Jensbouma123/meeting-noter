import { useEffect, useRef, useState } from "react";
import { pickInitialFocus } from "../../../lib/initial-focus.js";
import { focusOnOpen, isKeyboardModality, keptFocus } from "../../../lib/quiet-focus.js";
const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
/**
 * Owns the dialog's mount state and its native open/close lifecycle. Returns whether
 * the dialog is mounted; the caller renders nothing while it is not.
 */
export function useModalLifecycle(open, dialogRef) {
    const opener = useRef(null);
    const [mounted, setMounted] = useState(open);
    // Self-guarded like Drawer: raised only inside the guard below, the update is
    // dropped by the dev double-render and the dialog never mounts.
    if (open && !mounted)
        setMounted(true);
    // The native modal supplies the top layer, inert page, focus containment and
    // Escape; this effect only opens/closes it and picks the initial focus. Closing
    // waits for the CSS exit transition (data-open="false") before `close()`, so the
    // dialog stays in the top layer while it animates in every browser (under
    // prefers-reduced-motion the durations are 0ms, so nothing is awaited).
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog || !mounted)
            return;
        if (open) {
            // Focus already inside (React `autoFocus` committed first) stays put: `showModal()` may move it.
            const kept = keptFocus(dialog);
            if (!dialog.open) {
                if (!kept)
                    opener.current = document.activeElement;
                dialog.showModal();
            }
            // `preventScroll` on every programmatic focus: WebKit otherwise scrolls the
            // document to the target (e.g. a trigger in a sticky sidebar on return).
            // Keyboard: first real control, else the close button (SC 2.4.3). Pointer or no input yet:
            // the container itself, so no ring lands on a script-focused control (SC 2.4.7).
            focusOnOpen(kept ?? pickInitialFocus(dialog, FOCUSABLE_SELECTOR, { pointer: !isKeyboardModality() }) ?? dialog);
            return;
        }
        let cancelled = false;
        const exits = dialog.getAnimations?.({ subtree: true }) ?? [];
        void Promise.allSettled(exits.map((animation) => animation.finished)).then(() => {
            if (cancelled)
                return;
            dialog.close();
            opener.current?.focus({ preventScroll: true });
            setMounted(false);
        });
        return () => {
            cancelled = true;
        };
    }, [open, mounted, dialogRef]);
    // Forced unmount while open (parent drops the Modal): still return focus (SC 2.4.3).
    useEffect(() => () => opener.current?.focus({ preventScroll: true }), []);
    return mounted;
}
