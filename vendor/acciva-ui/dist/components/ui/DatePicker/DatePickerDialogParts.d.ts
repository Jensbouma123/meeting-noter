import type { DatePickerPreset } from "./types.js";
import type { DatePickerSelectionModel } from "./useDatePickerSelection.js";
import type { DatePickerViewModel } from "./useDatePickerView.js";
export declare function DatePickerPresets({ presets, selectedDate, onSelect, }: {
    presets: readonly DatePickerPreset[];
    selectedDate: Date | null;
    onSelect: (date: Date) => void;
}): import("react").JSX.Element;
export declare function DatePickerViewHeader({ view }: {
    view: DatePickerViewModel;
}): import("react").JSX.Element;
export declare function DatePickerFooter({ view, selection, clearable, closeOnSelect, setIsOpen, }: {
    view: DatePickerViewModel;
    selection: DatePickerSelectionModel;
    clearable: boolean;
    closeOnSelect: boolean;
    setIsOpen: (open: boolean) => void;
}): import("react").JSX.Element;
