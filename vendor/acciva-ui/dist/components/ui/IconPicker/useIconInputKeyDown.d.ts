import type { Dispatch, KeyboardEvent, RefObject, SetStateAction } from "react";
/** Search-input keys: Escape closes the grid, ArrowDown opens it or moves focus into the options. */
export declare function useIconInputKeyDown(open: boolean, setOpen: Dispatch<SetStateAction<boolean>>, gridRef: RefObject<HTMLDivElement | null>, rovingIndex: number): (event: KeyboardEvent<HTMLInputElement>) => void;
