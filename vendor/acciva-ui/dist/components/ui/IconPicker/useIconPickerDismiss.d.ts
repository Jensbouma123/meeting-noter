import { type Dispatch, type RefObject, type SetStateAction } from "react";
/**
 * Closes the grid while open when a pointerdown lands outside `containerRef`, or when focus
 * moves from inside it to an element outside it (Tab past the last control).
 */
export declare function useIconPickerDismiss(containerRef: RefObject<HTMLDivElement | null>, open: boolean, setOpen: Dispatch<SetStateAction<boolean>>): void;
