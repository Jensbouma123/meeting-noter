/** True only after a key press: before any input (page load) and after a pointer, focus stays quiet. */
export declare function isKeyboardModality(): boolean;
/**
 * Focus an overlay's initial target without scrolling. Off the keyboard path it passes
 * `focusVisible: false` too (WebKit otherwise matches :focus-visible on script focus); the global
 * `data-quiet-focus` rule in foundation.css hides any indicator anyway until the first key press
 * (input-modality.ts, SC 2.4.7, 2.4.11).
 */
export declare function focusOnOpen(target: HTMLElement): void;
/**
 * A control focused inside `container` before the open pass (React `autoFocus`, an `initialFocus`
 * effect), never the container or its close button; the open keeps it (SC 2.4.3). Read it before
 * `showModal()`, whose focusing steps may move focus to the dialog.
 */
export declare function keptFocus(container: HTMLElement): HTMLElement | null;
