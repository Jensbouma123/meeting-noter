import { useEffect } from "react";
/**
 * Closes the grid while open when a pointerdown lands outside `containerRef`, or when focus
 * moves from inside it to an element outside it (Tab past the last control).
 */
export function useIconPickerDismiss(containerRef, open, setOpen) {
    useEffect(() => {
        const container = containerRef.current;
        if (!open || !container)
            return;
        const onPointerDown = (event) => {
            if (!container.contains(event.target))
                setOpen(false);
        };
        const onFocusOut = (event) => {
            const next = event.relatedTarget;
            if (next && !container.contains(next))
                setOpen(false);
        };
        document.addEventListener("pointerdown", onPointerDown);
        container.addEventListener("focusout", onFocusOut);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            container.removeEventListener("focusout", onFocusOut);
        };
    }, [open, containerRef, setOpen]);
}
