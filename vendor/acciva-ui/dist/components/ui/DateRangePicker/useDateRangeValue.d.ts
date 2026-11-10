import type { DateRangePickerProps, DateRangeTuple } from "./types.js";
type ValueOptions = Pick<DateRangePickerProps, "value" | "defaultValue" | "onChange" | "minDate" | "maxDate" | "disabledDates">;
export declare function useDateRangeValue({ value, defaultValue, onChange, minDate, maxDate, disabledDates }: ValueOptions): {
    startDate: Date | null;
    endDate: Date | null;
    hasSelection: boolean;
    isDateDisabled: (targetDate: Date) => boolean;
    rangeSummary: string | null;
    commitRange: (nextRange: DateRangeTuple) => void;
};
export {};
