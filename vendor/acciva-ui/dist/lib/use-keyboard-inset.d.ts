import { type RefObject } from "react";
/** Set while the visual viewport is shorter than the layout viewport (on-screen keyboard). */
export declare const KEYBOARD_OPEN_ATTR = "data-keyboard-open";
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
export declare function useKeyboardInset(ref: RefObject<HTMLElement | null>, active: boolean): void;
