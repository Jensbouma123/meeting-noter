import type { ReactNode } from "react";
import type { SelectOption } from "../Select/index.js";
/** A `SelectOption` plus an optional decorative leading adornment, rendered in the option row and in the trigger. */
export interface SearchableSelectOption extends SelectOption {
    icon?: ReactNode;
}
export interface SearchableSelectProps {
    id?: string;
    options: readonly SearchableSelectOption[];
    value: string | null;
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
    emptyMessage?: string;
    disabled?: boolean;
    clearable?: boolean;
    optionHeight?: number;
    maxListHeight?: number;
    filter?: (option: SearchableSelectOption, query: string) => boolean;
    className?: string;
}
