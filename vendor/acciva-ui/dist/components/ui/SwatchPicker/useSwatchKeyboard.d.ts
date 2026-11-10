import type { KeyboardEvent, KeyboardEventHandler, RefObject } from "react";
export declare function useSwatchKeyboard(count: number, activeIndex: number, disabled: boolean, optionRefs: RefObject<(HTMLButtonElement | null)[]>, select: (index: number) => void, onKeyDown: KeyboardEventHandler<HTMLDivElement> | undefined): (event: KeyboardEvent<HTMLDivElement>) => void;
