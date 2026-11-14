import { useEffect, type Dispatch, type RefObject, type SetStateAction } from "react";

/** Closes the popup when a pointer goes down outside `containerRef` while it is open. */
export function useDismissOnPointerDown(
  open: boolean,
  containerRef: RefObject<HTMLDivElement | null>,
  setOpen: Dispatch<SetStateAction<boolean>>,
) {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, containerRef, setOpen]);
}
