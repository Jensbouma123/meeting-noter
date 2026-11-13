import type { ResponsiveSize, SizeTier } from "../../../lib/sizing-tokens/index.js";
export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
    /** Nesting level (0 = top). Indents the listbox row and sets `aria-level`; labels stay plain. */
    depth?: number;
}
export interface SelectProps {
    id?: string;
    options: SelectOption[];
    value: string | null;
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    /** Trigger size, same tiers as `Input`. */
    size?: ResponsiveSize<SizeTier>;
    /** Merged onto the trigger button (web only). */
    className?: string;
    "aria-label"?: string;
    "aria-labelledby"?: string;
}
