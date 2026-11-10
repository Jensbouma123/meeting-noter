export declare const PEEK_VAR = "--bottom-nav-drawer-peek";
/**
 * Measures the handle + peek row and publishes it as `--bottom-nav-drawer-peek` on the root
 * element: the panel's collapsed translate reads it, and so does the page's `pb-safe-nav-drawer`
 * padding (SC 2.4.11). A drawer hidden at `hideAt` measures 0, so the padding drops with it.
 * Removed on unmount, so a page without a drawer reserves nothing.
 */
export declare function usePeekHeight(): import("react").RefObject<HTMLDivElement | null>;
