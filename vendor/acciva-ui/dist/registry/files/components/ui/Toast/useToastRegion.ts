import { useEffect, useRef, type KeyboardEvent } from "react";
import { FOCUSABLE_SELECTOR } from "@/components/ui/Toast/constants";

export function useToastRegion(hotkey: string) {
  const rootRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Top layer: shown on mount so the live regions exist before any toast is inserted (SC 4.1.3).
  useEffect(() => {
    const root = rootRef.current;
    if (root?.showPopover && !root.matches(":popover-open")) root.showPopover();
    return () => {
      if (root?.hidePopover && root.matches(":popover-open")) root.hidePopover();
    };
  }, []);

  useEffect(() => {
    function handleHotkey(event: globalThis.KeyboardEvent) {
      if (event.key !== hotkey) return;
      const root = rootRef.current;
      if (!root) return;
      const focusable = root.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      if (!focusable) return;
      event.preventDefault();
      previouslyFocusedRef.current = document.activeElement as HTMLElement;
      focusable.focus({ preventScroll: true });
    }
    document.addEventListener("keydown", handleHotkey);
    return () => document.removeEventListener("keydown", handleHotkey);
  }, [hotkey]);

  const handleRegionKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    previouslyFocusedRef.current?.focus({ preventScroll: true });
    previouslyFocusedRef.current = null;
  };

  return { rootRef, handleRegionKeyDown };
}
