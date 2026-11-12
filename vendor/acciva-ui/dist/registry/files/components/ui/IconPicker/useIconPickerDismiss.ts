import { useEffect, type Dispatch, type RefObject, type SetStateAction } from "react";

/** Closes the grid while open when a mousedown lands outside `containerRef`. */
export function useIconPickerDismiss(
  containerRef: RefObject<HTMLDivElement | null>,
  open: boolean,
  setOpen: Dispatch<SetStateAction<boolean>>,
) {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, containerRef, setOpen]);
}
