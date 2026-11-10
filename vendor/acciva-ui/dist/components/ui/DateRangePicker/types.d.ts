import type { ReactNode } from "react";
import type { ResponsiveSize, SizeTier } from "../../../lib/sizing-tokens/index.js";
import type { useArrowHint } from "../../../lib/use-arrow-hint.js";
import type { useDateRangeCalendar } from "./useDateRangeCalendar.js";
import type { useDateRangeKeys } from "./useDateRangeKeys.js";
import type { useDateRangeValue } from "./useDateRangeValue.js";
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
    /** First-keyboard-focus caption for the date grid; `false` disables it. */
    arrowHint?: string | false;
}
export type DateRangeGridHint = ReturnType<typeof useArrowHint>;
/** Value and calendar state shared by the hooks and parts. */
export type DateRangeState = ReturnType<typeof useDateRangeValue> & ReturnType<typeof useDateRangeCalendar>;
/** State plus the event handlers, as handed to the parts. */
export type DateRangeUi = DateRangeState & ReturnType<typeof useDateRangeKeys>;
