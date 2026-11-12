import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { pickInitialFocus } from "@/lib/initial-focus";
import { focusOnOpen, isKeyboardModality, keptFocus } from "@/lib/quiet-focus";
import { FOCUSABLE_SELECTOR } from "@/components/ui/Drawer/constants";

export function useDialogLifecycle(
  open: boolean,
  mounted: boolean,
  isPersistent: boolean,
  sheetRef: RefObject<HTMLDialogElement | null>,
): void {
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // The platform does what a portal, inert siblings, scroll lock, focus trap and Escape
  // handler used to: a modal drawer is `showModal()`ed (top layer, inert page, focus
  // containment, `cancel` on Escape/back gesture); a persistent one is a manual popover
  // (top layer, page stays interactive). Declared before the measuring layout effects
  // so the panel is displayed when they read it.
  useLayoutEffect(() => {
    const dialog = sheetRef.current;
    if (!open || !dialog) return;
    // A persistent drawer leaves focus where it is: the page stays interactive and the drawer may
    // be open from load (at peek), so moving focus would steal it. Tab reaches it (SC 2.4.3).
    if (isPersistent) {
      if (dialog.matches(":popover-open")) return;
      const before = document.activeElement;
      dialog.showPopover();
      // On a <dialog>, showPopover() runs the dialog focusing steps and focuses its first control
      // (the grabber); put focus back so the open stays quiet and takes nothing (SC 2.4.3, 2.4.7).
      const now = document.activeElement;
      if (now instanceof HTMLElement && now !== before && dialog.contains(now)) {
        if (before instanceof HTMLElement && before !== document.body) before.focus({ preventScroll: true });
        else now.blur();
      }
      return;
    }
    // Focus already inside (React `autoFocus` committed first) stays put: `showModal()` may move it.
    const kept = keptFocus(dialog);
    if (!dialog.contains(document.activeElement)) previouslyFocused.current = document.activeElement as HTMLElement | null;
    if (!dialog.open) dialog.showModal();
    // Off the keyboard the container itself takes focus unless an explicit autofocus target exists.
    const pointer = !isKeyboardModality();
    focusOnOpen(kept ?? pickInitialFocus(dialog, FOCUSABLE_SELECTOR, { pointer, exclude: "[data-drawer-grabber]" }) ?? dialog);
  }, [open, isPersistent, sheetRef]);

  // Focus returns once the panel leaves the DOM after its exit, when the page behind it
  // is no longer inert, and on a forced unmount (SC 2.4.3).
  useEffect(() => {
    if (!mounted) return;
    return () => previouslyFocused.current?.focus({ preventScroll: true });
  }, [mounted]);
}
