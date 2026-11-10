import { type ReactNode } from "react";
import { type ResponsiveSize, type SizeTier } from "../../lib/sizing-tokens.js";
export type DateRangeTuple = [Date | null, Date | null];
export interface DateRangePreset {
    label: string;
    value: DateRangeTuple;
}
export interface DateRangePickerProps {
    value?: DateRangeTuple | null;
    defaultValue?: DateRangeTuple | null;
    onChange?: (range: DateRangeTuple) => void;
    placeholder?: string;
    label?: string;
    hint?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    readOnly?: boolean;
    clearable?: boolean;
    minDate?: Date | string;
    maxDate?: Date | string;
    disabledDates?: ((date: Date) => boolean) | Date[];
    presets?: readonly DateRangePreset[];
    showPresets?: boolean;
    formatDate?: (date: Date) => string;
    size?: ResponsiveSize<SizeTier>;
    className?: string;
    id?: string;
    name?: string;
    closeOnSelect?: boolean;
    leadingIcon?: ReactNode;
    "aria-describedby"?: string;
}
export declare const DateRangePicker: import("react").ForwardRefExoticComponent<DateRangePickerProps & import("react").RefAttributes<HTMLButtonElement>>;
