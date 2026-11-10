import { type ReactNode } from "react";
import { type ResponsiveSize, type SizeTier } from "../../lib/sizing-tokens.js";
export type CalendarViewMode = "day" | "month" | "year" | "decade";
export interface DatePickerPreset {
    label: string;
    value: Date;
}
export interface DatePickerProps {
    value?: Date | string | null;
    defaultValue?: Date | string | null;
    onChange?: (date: Date | null) => void;
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
    presets?: readonly DatePickerPreset[];
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
export declare const DatePicker: import("react").ForwardRefExoticComponent<DatePickerProps & import("react").RefAttributes<HTMLButtonElement>>;
