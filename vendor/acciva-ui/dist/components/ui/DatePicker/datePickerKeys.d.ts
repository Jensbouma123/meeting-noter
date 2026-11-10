import type { FocusEvent, KeyboardEvent } from "react";
import type { CalendarViewMode } from "./types.js";
import { type DayGridKeyContext } from "./dayGridKeys.js";
export interface DatePickerKeysContext extends DayGridKeyContext {
    disabled: boolean;
    readOnly: boolean;
    isOpen: boolean;
    viewMode: CalendarViewMode;
    setIsOpen: (open: boolean) => void;
    setViewMode: (mode: CalendarViewMode) => void;
}
export declare function createDatePickerKeys(ctx: DatePickerKeysContext): {
    handleDialogKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
    handleContainerBlur: (event: FocusEvent<HTMLDivElement>) => void;
    handleTriggerKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
    handleGridKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
};
export type DatePickerKeyHandlers = ReturnType<typeof createDatePickerKeys>;
