import { type KeyboardEvent, type RefObject } from "react";
/**
 * Roving tabindex for a radio group: exactly one radio is a tab stop (the checked one,
 * or the first enabled one when nothing is checked), and arrow/Home/End keys move
 * between enabled radios. Returns the keydown handler for the group element.
 */
export declare function useRovingFocus(groupRef: RefObject<HTMLDivElement | null>): (event: KeyboardEvent<HTMLDivElement>) => void;
