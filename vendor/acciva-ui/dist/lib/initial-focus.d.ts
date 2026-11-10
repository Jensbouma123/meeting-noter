/**
 * Initial focus for an overlay: focus already inside the container (a child's `autoFocus` that ran
 * before the open pass; never the container or the close button), else `[data-autofocus]` /
 * `[autofocus]`, else the first focusable control that is not the close button (`[data-dialog-close]`),
 * else the close button. Never the container for keyboard/unknown input (SC 2.4.3, 2.4.7).
 * `exclude` (a selector, e.g. the Drawer grabber) is never picked as the fallback control. After a
 * pointer open (`pointer`) only explicit targets win; otherwise null, so the caller focuses the
 * container, which iOS Safari would otherwise ring on a script-focused control (SC 2.4.7, 2.4.11).
 */
export declare function pickInitialFocus(container: HTMLElement | null | undefined, focusableSelector: string, opts?: {
    pointer?: boolean;
    exclude?: string;
}): HTMLElement | null;
