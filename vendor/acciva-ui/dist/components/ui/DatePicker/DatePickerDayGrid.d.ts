import type { DatePickerGridHint } from "./types.js";
import type { DatePickerSelectionModel } from "./useDatePickerSelection.js";
import type { DatePickerViewModel } from "./useDatePickerView.js";
export declare function DatePickerDayGrid({ view, selection, gridHint, }: {
    view: DatePickerViewModel;
    selection: DatePickerSelectionModel;
    gridHint: DatePickerGridHint;
}): import("react").JSX.Element;
