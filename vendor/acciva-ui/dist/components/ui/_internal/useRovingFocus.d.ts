import { type KeyboardEvent, type RefObject } from "react";
import { type RovingOrientation } from "./rovingIndex.js";
interface RovingFocusOptions {
    containerRef: RefObject<HTMLElement | null>;
    /** Enabled items only, e.g. `[role="tab"]:not([disabled])`; also works for links. */
    itemSelector: string;
    orientation: RovingOrientation;
    /** Default true: arrows wrap past either end. */
    wrap?: boolean;
    /** Click the item after focusing it (selection follows focus: tabs, radios). */
    activate?: boolean;
    /** Match item text on printable keys; pass a label getter to enable. */
    typeahead?: (item: HTMLElement) => string;
    /** Keep exactly one item a tab stop: the one matching, else the first. */
    tabStop?: (item: HTMLElement) => boolean;
}
/**
 * Roving focus over DOM items (buttons, links, radios): arrows per `orientation`,
 * Home/End, wrap and optional typeahead. Returns the keydown handler for the container.
 */
export declare function useRovingFocus(options: RovingFocusOptions): (event: KeyboardEvent<HTMLElement>) => void;
export {};
