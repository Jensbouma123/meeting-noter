import { type FocusEvent, type KeyboardEvent, type MouseEvent } from "react";
import type { DateRangePreset, DateRangeState } from "./types.js";
interface KeysOptions {
    disabled: boolean;
    readOnly: boolean;
    closeOnSelect: boolean;
}
export declare function useDateRangeKeys(state: DateRangeState, { disabled, readOnly, closeOnSelect }: KeysOptions): {
    handleSelectDate: (targetDate: Date) => void;
    handleClear: (event?: MouseEvent) => void;
    handleFooterClear: () => void;
    handlePresetSelect: (preset: DateRangePreset) => void;
    handleDialogKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
    handleContainerBlur: (event: FocusEvent<HTMLDivElement>) => void;
    handleTriggerClick: () => void;
    handleTriggerKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
    handleGridKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
};
export {};
