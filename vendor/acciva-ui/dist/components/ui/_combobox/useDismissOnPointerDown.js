import { useEffect } from "react";
/** Closes the popup when a pointer goes down outside `containerRef` while it is open. */
export function useDismissOnPointerDown(open, containerRef, setOpen) {
    useEffect(() => {
        if (!open)
            return;
        const onPointerDown = (event) => {
            if (!containerRef.current?.contains(event.target))
                setOpen(false);
        };
        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, [open, containerRef, setOpen]);
}
