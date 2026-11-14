import { type Dispatch, type KeyboardEvent, type SetStateAction } from "react";
import type { ComboboxItem } from "./types.js";
/** Keyboard model of the combobox input: arrows move the highlight, Enter commits, Escape and Tab dismiss. */
export declare function useComboboxKeyDown<T extends ComboboxItem>(disabled: boolean, open: boolean, setOpen: Dispatch<SetStateAction<boolean>>, filteredOptions: readonly T[], activeIndex: number, setActiveIndex: Dispatch<SetStateAction<number>>, moveActive: (delta: number) => void, commit: (index: number) => void, close: () => void): (event: KeyboardEvent<HTMLInputElement>) => void;
