import { useEffect } from "react";
/** Closes the grid while open when a mousedown lands outside `containerRef`. */
export function useIconPickerDismiss(containerRef, open, setOpen) {
    useEffect(() => {
        if (!open)
            return;
        const onPointerDown = (event) => {
            if (!containerRef.current?.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, [open, containerRef, setOpen]);
}
