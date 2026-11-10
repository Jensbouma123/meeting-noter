import type { KeyboardEvent, MouseEvent, ReactNode, Ref } from "react";
import { type ResponsiveSize, type SizeTier } from "../../../lib/sizing-tokens/index.js";
export interface DatePickerTriggerProps {
    ref: Ref<HTMLButtonElement>;
    id: string;
    name?: string;
    labelledBy?: string;
    describedBy?: string;
    dialogId: string;
    isOpen: boolean;
    disabled: boolean;
    readOnly: boolean;
    invalid: boolean;
    size: ResponsiveSize<SizeTier>;
    leadingIcon?: ReactNode;
    hasValue: boolean;
    text: string;
    showClear: boolean;
    onClick: () => void;
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}
export declare function DatePickerTrigger({ ref, id, name, labelledBy, describedBy, dialogId, isOpen, disabled, readOnly, invalid, size, leadingIcon, hasValue, text, showClear, onClick, onKeyDown, }: DatePickerTriggerProps): import("react").JSX.Element;
export declare function DatePickerClearButton({ size, onClear, }: {
    size: ResponsiveSize<SizeTier>;
    onClear: (event?: MouseEvent<HTMLButtonElement>) => void;
}): import("react").JSX.Element;
