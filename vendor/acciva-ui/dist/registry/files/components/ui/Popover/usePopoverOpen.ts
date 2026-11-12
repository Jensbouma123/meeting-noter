import { useCallback, useEffect, useState, type RefObject } from "react";

// Open state (controlled or not), exit-animation unmount, and Escape. Returns [open, mounted, handleClose, setOpenState].
export function usePopoverOpen(
  controlledOpen: boolean | undefined,
  defaultOpen: boolean,
  onOpenChange: ((open: boolean) => void) | undefined,
  onClose: (() => void) | undefined,
  animated: boolean,
  popoverRef: RefObject<HTMLDivElement | null>,
) {
  const isControlled = controlledOpen !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const [mountedState, setMounted] = useState(open);

  // Without animation, presence tracks `open` directly; no exit to wait for.
  const mounted = animated ? mountedState : open;

  // Self-guarded like Drawer: an update raised only inside a transition guard is dropped by the
  // dev double-render, stranding `mounted=false` while open.
  if (open && !mountedState) setMounted(true);

  const handleClose = useCallback(() => {
    if (!isControlled) {
      setUncontrolledOpen(false);
    }
    onOpenChange?.(false);
    onClose?.();
  }, [isControlled, onOpenChange, onClose]);

  const setOpenState = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen === open) return;
      if (!nextOpen) {
        handleClose();
      } else {
        if (!isControlled) {
          setUncontrolledOpen(true);
        }
        onOpenChange?.(true);
      }
    },
    [open, isControlled, onOpenChange, handleClose],
  );

  // Top layer + light dismiss come from the Popover API; the exit waits for the CSS transition
  // (data-state="closed") before `hidePopover()`, so the card stays in the top layer while it animates.
  useEffect(() => {
    const card = popoverRef.current;
    if (!card || !mounted) return;
    if (open) {
      if (card.showPopover && !card.matches(":popover-open")) card.showPopover();
      return;
    }
    let cancelled = false;
    const exits = card.getAnimations?.() ?? [];
    void Promise.allSettled(exits.map((animation) => animation.finished)).then(() => {
      if (cancelled) return;
      if (card.matches(":popover-open")) card.hidePopover();
      setMounted(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, mounted, popoverRef]);

  // Escape closes through React (a `manual` popover has no native Escape); on an `auto` one the
  // native close that follows finds `open` already false, so `onClose` fires once.
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleClose]);

  return [open, mounted, handleClose, setOpenState] as const;
}
