import type { ReactNode } from "react";
import { type ResponsiveSize, type SizeTier } from "../../../lib/sizing-tokens/index.js";
interface InputLabelProps {
    id: string;
    label: string;
    required?: boolean;
    size: ResponsiveSize<SizeTier>;
}
export declare function InputLabel({ id, label, required, size }: InputLabelProps): import("react").JSX.Element;
interface InputAddonProps {
    id?: string;
    side: "leading" | "trailing";
    size: ResponsiveSize<SizeTier>;
    disabled?: boolean;
    children: ReactNode;
}
export declare function InputAddon({ id, side, size, disabled, children }: InputAddonProps): import("react").JSX.Element;
export declare function InputLeadingIcon({ size, children }: {
    size: ResponsiveSize<SizeTier>;
    children: ReactNode;
}): import("react").JSX.Element;
interface InputMessagesProps {
    hint?: string;
    error?: string;
    hintId?: string;
    errorId?: string;
    /** Set only while the character counter is shown. */
    charCountId?: string;
    count: number;
    maxLength?: number;
}
export declare function InputMessages({ hint, error, hintId, errorId, charCountId, count, maxLength }: InputMessagesProps): import("react").JSX.Element;
export {};
