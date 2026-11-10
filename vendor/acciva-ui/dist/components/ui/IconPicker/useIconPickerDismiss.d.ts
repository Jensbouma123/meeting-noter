import { type Dispatch, type RefObject, type SetStateAction } from "react";
/** Closes the grid while open when a mousedown lands outside `containerRef`. */
export declare function useIconPickerDismiss(containerRef: RefObject<HTMLDivElement | null>, open: boolean, setOpen: Dispatch<SetStateAction<boolean>>): void;
