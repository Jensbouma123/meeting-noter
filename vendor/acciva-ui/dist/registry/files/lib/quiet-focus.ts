import { getInputModality } from "@/lib/input-modality";

/** True only after a key press: before any input (page load) and after a pointer, focus stays quiet. */
export function isKeyboardModality(): boolean {
  return getInputModality() === "keyboard";
}

/**
 * Focus an overlay's initial target without scrolling. Off the keyboard path it passes
 * `focusVisible: false` too (WebKit otherwise matches :focus-visible on script focus); the global
 * `data-quiet-focus` rule in foundation.css hides any indicator anyway until the first key press
 * (input-modality.ts, SC 2.4.7, 2.4.11).
 */
export function focusOnOpen(target: HTMLElement): void {
  // `focusVisible` is not in lib.dom yet; engines that lack it ignore the key.
  target.focus(isKeyboardModality() ? { preventScroll: true } : ({ preventScroll: true, focusVisible: false } as FocusOptions));
}

/**
 * A control focused inside `container` before the open pass (React `autoFocus`, an `initialFocus`
 * effect), never the container or its close button; the open keeps it (SC 2.4.3). Read it before
 * `showModal()`, whose focusing steps may move focus to the dialog.
 */
export function keptFocus(container: HTMLElement): HTMLElement | null {
  const active = container.ownerDocument.activeElement;
  return active instanceof HTMLElement && active !== container && container.contains(active) && !active.hasAttribute("data-dialog-close")
    ? active
    : null;
}
