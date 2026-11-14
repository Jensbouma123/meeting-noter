/**
 * The focused element when there is one; otherwise `trigger`, else the last pressed focusable
 * element (WebKit click). WebKit focuses the nearest click-focusable ancestor instead of the
 * button (e.g. `<main tabIndex={-1}>`), so a focused container holding either candidate yields
 * to it. `exclude` drops candidates inside the overlay itself.
 */
export declare function resolveOpener(trigger?: HTMLElement | null, exclude?: Element | null): HTMLElement | null;
