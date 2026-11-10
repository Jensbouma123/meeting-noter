import { type MouseEvent as ReactMouseEvent } from "react";
import type { DatePickerProps } from "./types.js";
export interface DatePickerSelectionOptions extends Pick<DatePickerProps, "value" | "defaultValue" | "onChange" | "minDate" | "maxDate" | "disabledDates"> {
    disabled: boolean;
    readOnly: boolean;
    clearable: boolean;
    closeOnSelect: boolean;
}
export declare function useDatePickerSelection(options: DatePickerSelectionOptions, onPicked: () => void): {
    selectedDate: Date | null;
    isDateDisabled: (targetDate: Date) => boolean;
    handleSelectDate: (targetDate: Date) => void;
    handleClear: (event?: ReactMouseEvent) => void;
    showClear: boolean;
};
export type DatePickerSelectionModel = ReturnType<typeof useDatePickerSelection>;
