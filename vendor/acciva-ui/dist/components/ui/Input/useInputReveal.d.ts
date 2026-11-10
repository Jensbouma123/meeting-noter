import { type RefObject } from "react";
/** Returns `[revealed, handleToggleReveal]`. */
export declare function useInputReveal(inputRef: RefObject<HTMLInputElement | null>): readonly [boolean, () => void];
