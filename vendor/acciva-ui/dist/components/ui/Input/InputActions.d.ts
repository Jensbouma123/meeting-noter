import type { ReactNode } from "react";
import { type ResponsiveSize, type SizeTier } from "../../../lib/sizing-tokens/index.js";
interface InputActionsProps {
    size: ResponsiveSize<SizeTier>;
    label?: string;
    showClear: boolean;
    searchType?: boolean;
    showPasswordToggle: boolean;
    trailingIcon?: ReactNode;
    revealed: boolean;
    disabled?: boolean;
    onClear: () => void;
    onToggleReveal: () => void;
}
export declare function InputActions({ size, label, showClear, searchType, showPasswordToggle, trailingIcon, revealed, disabled, onClear, onToggleReveal, }: InputActionsProps): import("react").JSX.Element | null;
export {};
