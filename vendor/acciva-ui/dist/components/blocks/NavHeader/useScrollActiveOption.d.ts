import { type RefObject } from "react";
/** Keeps the `aria-activedescendant` option of a scrolling listbox in view (SC 2.4.11): focus stays
 * on the input, so the browser never scrolls the list itself. `index` is the option's child index. */
export declare function useScrollActiveOption(listRef: RefObject<HTMLElement | null>, open: boolean, index: number): void;
