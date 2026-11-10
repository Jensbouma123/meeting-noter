import type { KeyboardEvent, ReactNode, RefObject } from "react";
import type { SearchableSelectOption } from "./types.js";
export declare function OptionAdornment({ icon }: {
    icon: ReactNode;
}): import("react").JSX.Element | null;
interface SearchableSelectTriggerProps {
    inputId: string;
    inputRef: RefObject<HTMLInputElement | null>;
    labelId: string | undefined;
    listboxId: string;
    statusId: string;
    activeId: string | undefined;
    disabled: boolean;
    open: boolean;
    query: string;
    placeholder: string;
    selected: SearchableSelectOption | null;
    clearable: boolean;
    onInputChange: (value: string) => void;
    onFocus: () => void;
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
    onToggle: () => void;
    onClear: () => void;
}
export declare function SearchableSelectTrigger({ inputId, inputRef, labelId, listboxId, statusId, activeId, disabled, open, query, placeholder, selected, clearable, onInputChange, onFocus, onKeyDown, onToggle, onClear, }: SearchableSelectTriggerProps): import("react").JSX.Element;
export {};
