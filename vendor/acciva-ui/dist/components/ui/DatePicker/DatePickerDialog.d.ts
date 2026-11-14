import type { RefObject } from "react";
import type { DatePickerGridHint, DatePickerPreset } from "./types.js";
import type { DatePickerKeyHandlers } from "./datePickerKeys.js";
import type { DatePickerSelectionModel } from "./useDatePickerSelection.js";
import type { DatePickerViewModel } from "./useDatePickerView.js";
export interface DatePickerDialogProps {
    dialogId: string;
    gridRef: RefObject<HTMLDivElement | null>;
    gridHint: DatePickerGridHint;
    view: DatePickerViewModel;
    selection: DatePickerSelectionModel;
    keys: DatePickerKeyHandlers;
    presets: readonly DatePickerPreset[];
    showPresets: boolean;
    clearable: boolean;
    closeOnSelect: boolean;
    close: () => void;
}
export declare function DatePickerDialog({ dialogId, gridRef, gridHint, view, selection, keys, presets, showPresets, clearable, closeOnSelect, close, }: DatePickerDialogProps): import("react").JSX.Element;
