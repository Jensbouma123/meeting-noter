import type { InputHTMLAttributes, ReactNode } from "react";
import type { ResponsiveSize, SizeTier } from "../../../lib/sizing-tokens/index.js";
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
    label?: string;
    hint?: string;
    error?: string;
    leadingIcon?: ReactNode;
    trailingIcon?: ReactNode;
    /**
     * A prefix segment attached to the outside of the field — text (`https://`, `$`) or a small
     * control (a native colour swatch). Unlike `leadingIcon`, which floats decoratively inside the
     * field, an addon occupies its own bordered box, keeps the caret clear of it, and is announced
     * with the field via `aria-describedby` (WCAG 2.2 AA SC 1.3.1, SC 3.3.2).
     */
    leadingAddon?: ReactNode;
    /** A suffix segment attached to the outside of the field (`.com`, `USD`). See `leadingAddon`. */
    trailingAddon?: ReactNode;
    size?: ResponsiveSize<SizeTier>;
    clearable?: boolean;
    onClear?: () => void;
    showCharCount?: boolean;
    validate?: (value: string) => string | undefined;
    /** `type="password"` only. Shows a show/hide reveal button; set `false` to opt out. */
    revealToggle?: boolean;
}
