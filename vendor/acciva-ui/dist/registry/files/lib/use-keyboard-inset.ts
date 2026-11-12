"use client";

import { useEffect, type RefObject } from "react";

/** Set while the visual viewport is shorter than the layout viewport (on-screen keyboard). */
export const KEYBOARD_OPEN_ATTR = "data-keyboard-open";

interface VirtualKeyboardLike {
  overlaysContent?: boolean;
}

/**
 * Publishes the on-screen keyboard's footprint on `ref`'s element while `active`:
 * `--keyboard-inset` (layout viewport height minus the visual viewport's bottom edge,
 * floored at 0) and `--visual-height` (the visual viewport height), both in px.
 * iOS never resizes the layout viewport for its keyboard; it shrinks and pans the
 * visual one, so a fixed bottom-anchored panel sits behind the keyboard and the focus
 * scroll shoves it off the top. CSS re-anchors the panel on these values.
 * No-op without `visualViewport` (SSR, old browsers) and when the page opted into
 * `navigator.virtualKeyboard.overlaysContent`, where `env(keyboard-inset-height)` wins.
 */
export function useKeyboardInset(ref: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    const el = ref.current;
    const vv = typeof window === "undefined" ? undefined : window.visualViewport;
    if (!active || !el || !vv) return;
    const vk = (navigator as Navigator & { virtualKeyboard?: VirtualKeyboardLike }).virtualKeyboard;
    if (vk?.overlaysContent) return;

    let frame = 0;
    const apply = () => {
      frame = 0;
      const layoutHeight = document.documentElement.clientHeight;
      const inset = Math.max(0, Math.round(layoutHeight - vv.height - vv.offsetTop));
      el.style.setProperty("--keyboard-inset", `${inset}px`);
      el.style.setProperty("--visual-height", `${Math.round(vv.height)}px`);
      el.toggleAttribute(KEYBOARD_OPEN_ATTR, inset > 0);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    apply();
    vv.addEventListener("resize", schedule, { passive: true });
    vv.addEventListener("scroll", schedule, { passive: true });
    return () => {
      vv.removeEventListener("resize", schedule);
      vv.removeEventListener("scroll", schedule);
      if (frame) cancelAnimationFrame(frame);
      el.style.removeProperty("--keyboard-inset");
      el.style.removeProperty("--visual-height");
      el.removeAttribute(KEYBOARD_OPEN_ATTR);
    };
  }, [ref, active]);
}
