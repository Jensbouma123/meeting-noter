import { useEffect } from "react";

/** Matches the `lg` breakpoint where the drawer is hidden via `lg:hidden`. */
const DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * Closes the open mobile drawer once the viewport reaches `lg`. The drawer
 * is a modal `<dialog>` hidden by CSS at `lg`, so leaving it open would strand
 * an invisible modal layer (SC 2.1.2).
 */
export function useCloseAtDesktop(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open || typeof window === "undefined" || !window.matchMedia) return;
    const list = window.matchMedia(DESKTOP_QUERY);
    const closeIfDesktop = () => {
      if (list.matches) onClose();
    };
    closeIfDesktop();
    list.addEventListener("change", closeIfDesktop);
    return () => list.removeEventListener("change", closeIfDesktop);
  }, [open, onClose]);
}
