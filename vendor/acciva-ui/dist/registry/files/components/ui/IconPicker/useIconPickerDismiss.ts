import { useEffect, type Dispatch, type RefObject, type SetStateAction } from "react";

/**
 * Closes the grid while open when a pointerdown lands outside `containerRef`, or when focus
 * moves from inside it to an element outside it (Tab past the last control).
 */
export function useIconPickerDismiss(
  containerRef: RefObject<HTMLDivElement | null>,
  open: boolean,
  setOpen: Dispatch<SetStateAction<boolean>>,
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!open || !container) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!container.contains(event.target as Node)) setOpen(false);
    };
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget as Node | null;
      if (next && !container.contains(next)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("focusout", onFocusOut);
    };
  }, [open, containerRef, setOpen]);
}
